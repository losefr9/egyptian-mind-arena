/*
  # نظام تتبع حضور اللاعبين في الوقت الفعلي

  ## الجداول الجديدة
  
  ### 1. `user_presence`
  يتتبع حضور المستخدمين المتصلين حالياً
  - `user_id` (uuid, FK to profiles) - معرف المستخدم
  - `status` (text) - الحالة: 'online', 'away', 'offline'
  - `current_page` (text) - الصفحة الحالية: 'games', 'playing', 'betting'
  - `current_game_id` (uuid, FK to games) - اللعبة الحالية إن وجدت
  - `current_bet_amount` (decimal) - مبلغ الرهان المختار
  - `last_seen` (timestamptz) - آخر نشاط
  - `session_start` (timestamptz) - وقت بدء الجلسة
  
  ### 2. `active_game_sessions_view`
  VIEW للحصول على المباريات الجارية بسرعة
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات للقراءة والكتابة المناسبة
*/

-- جدول تتبع حضور المستخدمين
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  current_page text,
  current_game_id uuid,
  current_bet_amount decimal(10,2),
  last_seen timestamptz DEFAULT now(),
  session_start timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- فهرس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_game ON user_presence(current_game_id) WHERE current_game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- تفعيل RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- سياسة: الجميع يمكنهم قراءة الحضور (للعداد)
CREATE POLICY "Anyone can view online presence"
  ON user_presence
  FOR SELECT
  USING (true);

-- سياسة: المستخدمون يمكنهم تحديث حضورهم الخاص
CREATE POLICY "Users can update own presence"
  ON user_presence
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسة: المستخدمون يمكنهم إدراج حضورهم
CREATE POLICY "Users can insert own presence"
  ON user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسة: المستخدمون يمكنهم حذف حضورهم
CREATE POLICY "Users can delete own presence"
  ON user_presence
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- دالة لتحديث last_seen تلقائياً
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث التوقيت تلقائياً
DROP TRIGGER IF EXISTS update_user_presence_timestamp_trigger ON user_presence;
CREATE TRIGGER update_user_presence_timestamp_trigger
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_timestamp();

-- دالة لتنظيف الحضور القديم (المستخدمين غير النشطين منذ أكثر من 5 دقائق)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline'
  WHERE status = 'online'
    AND last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VIEW للحصول على عدد اللاعبين المتصلين
CREATE OR REPLACE VIEW online_players_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'online' AND last_seen > now() - interval '5 minutes') as total_online,
  COUNT(*) FILTER (WHERE status = 'online' AND current_page = 'games') as browsing_games,
  COUNT(*) FILTER (WHERE status = 'online' AND current_page = 'betting') as selecting_bet,
  COUNT(*) FILTER (WHERE status = 'online' AND current_page = 'playing') as currently_playing
FROM user_presence;

-- VIEW لعدد اللاعبين حسب اللعبة
CREATE OR REPLACE VIEW players_per_game AS
SELECT 
  current_game_id,
  COUNT(*) as player_count
FROM user_presence
WHERE status = 'online' 
  AND current_game_id IS NOT NULL
  AND last_seen > now() - interval '5 minutes'
GROUP BY current_game_id;

-- VIEW لعدد اللاعبين حسب مستوى الرهان لكل لعبة
CREATE OR REPLACE VIEW players_per_bet_level AS
SELECT 
  current_game_id,
  current_bet_amount,
  COUNT(*) as player_count
FROM user_presence
WHERE status = 'online' 
  AND current_game_id IS NOT NULL
  AND current_bet_amount IS NOT NULL
  AND last_seen > now() - interval '5 minutes'
GROUP BY current_game_id, current_bet_amount;
