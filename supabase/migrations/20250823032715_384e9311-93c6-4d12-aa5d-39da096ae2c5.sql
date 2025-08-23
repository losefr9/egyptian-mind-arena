-- حذف الألعاب الوهمية وإنشاء لعبة XO حقيقية
DELETE FROM games WHERE name != 'XO Game';

-- إدراج لعبة XO إذا لم تكن موجودة
INSERT INTO games (name, description, is_active) 
VALUES ('XO Game', 'لعبة إكس أو مع أسئلة رياضية - اجب على السؤال الرياضي لوضع علامتك!', true)
ON CONFLICT (name) DO NOTHING;

-- جدول الأسئلة الرياضية
CREATE TABLE IF NOT EXISTS math_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer INTEGER NOT NULL,
  difficulty_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تفاصيل مباريات XO
CREATE TABLE IF NOT EXISTS xo_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  board_state JSONB DEFAULT '["","","","","","","","",""]',
  current_turn_player_id UUID,
  current_question_id UUID REFERENCES math_questions(id),
  question_start_time TIMESTAMPTZ,
  move_deadline TIMESTAMPTZ,
  match_status TEXT DEFAULT 'waiting_for_question_answer',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول أرباح المنصة
CREATE TABLE IF NOT EXISTS platform_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id),
  earning_amount NUMERIC(10,2) NOT NULL,
  earning_percentage NUMERIC(5,2) DEFAULT 10.00,
  total_bet_amount NUMERIC(10,2) NOT NULL,
  earning_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تفاصيل نشاط اللاعبين المحسن
CREATE TABLE IF NOT EXISTS player_match_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'game_joined', 'question_answered', 'move_made', 'game_won', 'game_lost', 'game_draw'
  activity_details JSONB DEFAULT '{}',
  earning_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إدراج أسئلة رياضية عشوائية
INSERT INTO math_questions (question, answer, difficulty_level) VALUES
('15 + 28', 43, 1),
('23 + 42 + 12', 77, 2),
('67 - 29', 38, 1),
('14 × 6', 84, 2),
('96 ÷ 8', 12, 2),
('45 + 33 - 18', 60, 2),
('7 × 9 + 12', 75, 2),
('100 - 47 + 23', 76, 2),
('8 × 7 - 15', 41, 2),
('144 ÷ 12 + 9', 21, 2),
('25 + 17', 42, 1),
('83 - 35', 48, 1),
('9 × 8', 72, 1),
('72 ÷ 9', 8, 1),
('56 + 29 - 14', 71, 2);

-- تحديث جدول game_sessions لإضافة معلومات الجائزة
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC(5,2) DEFAULT 10.00;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS winner_earnings NUMERIC(10,2) DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS platform_earnings NUMERIC(10,2) DEFAULT 0;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_platform_earnings_date ON platform_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_player_activities_user_date ON player_match_activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_xo_matches_session ON xo_matches(game_session_id);

-- تمكين RLS للجداول الجديدة
ALTER TABLE math_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xo_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_activities ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للأسئلة الرياضية
CREATE POLICY "Everyone can view math questions" ON math_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage math questions" ON math_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS لمباريات XO
CREATE POLICY "Players can view their XO matches" ON xo_matches 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs 
    WHERE gs.id = xo_matches.game_session_id 
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can update their XO matches" ON xo_matches 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs 
    WHERE gs.id = xo_matches.game_session_id 
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can create XO matches" ON xo_matches 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_sessions gs 
    WHERE gs.id = xo_matches.game_session_id 
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

-- سياسات RLS لأرباح المنصة
CREATE POLICY "Admins can view platform earnings" ON platform_earnings FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can create platform earnings" ON platform_earnings FOR INSERT WITH CHECK (true);

-- سياسات RLS لأنشطة اللاعبين
CREATE POLICY "Players can view their own activities" ON player_match_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all activities" ON player_match_activities FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can create activities" ON player_match_activities FOR INSERT WITH CHECK (true);

-- دالة لحساب الأرباح عند انتهاء المباراة
CREATE OR REPLACE FUNCTION calculate_match_earnings(session_id UUID, winner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_bet_amount NUMERIC(10,2);
  platform_fee_pct NUMERIC(5,2);
  platform_earning NUMERIC(10,2);
  winner_earning NUMERIC(10,2);
BEGIN
  -- الحصول على تفاصيل المباراة
  SELECT (gs.bet_amount * 2), gs.platform_fee_percentage 
  INTO total_bet_amount, platform_fee_pct
  FROM game_sessions gs 
  WHERE gs.id = session_id;

  -- حساب الأرباح
  platform_earning := total_bet_amount * (platform_fee_pct / 100);
  winner_earning := total_bet_amount - platform_earning;

  -- تحديث جدول game_sessions
  UPDATE game_sessions 
  SET winner_earnings = winner_earning,
      platform_earnings = platform_earning,
      prize_amount = total_bet_amount
  WHERE id = session_id;

  -- إضافة أرباح المنصة
  INSERT INTO platform_earnings (game_session_id, earning_amount, earning_percentage, total_bet_amount)
  VALUES (session_id, platform_earning, platform_fee_pct, total_bet_amount);

  -- تحديث رصيد الفائز
  UPDATE profiles 
  SET balance = balance + winner_earning,
      wins = wins + 1
  WHERE id = winner_user_id;

  -- تحديث خسائر الخاسر
  UPDATE profiles 
  SET losses = losses + 1
  WHERE id IN (
    SELECT CASE 
      WHEN player1_id = winner_user_id THEN player2_id 
      ELSE player1_id 
    END
    FROM game_sessions 
    WHERE id = session_id
  );

  -- تسجيل نشاط الفوز
  INSERT INTO player_match_activities (user_id, game_session_id, activity_type, earning_amount, activity_details)
  VALUES (winner_user_id, session_id, 'game_won', winner_earning, jsonb_build_object('prize_amount', total_bet_amount, 'platform_fee', platform_earning));

  -- تسجيل نشاط الخسارة
  INSERT INTO player_match_activities (user_id, game_session_id, activity_type, earning_amount, activity_details)
  SELECT 
    CASE WHEN player1_id = winner_user_id THEN player2_id ELSE player1_id END,
    session_id,
    'game_lost',
    0,
    jsonb_build_object('prize_amount', total_bet_amount, 'platform_fee', platform_earning)
  FROM game_sessions 
  WHERE id = session_id;

  RETURN TRUE;
END;
$$;

-- دالة لمعالجة التعادل
CREATE OR REPLACE FUNCTION handle_draw_match(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إعادة الرصيد للاعبين
  UPDATE profiles 
  SET balance = balance + (
    SELECT bet_amount FROM game_sessions WHERE id = session_id
  )
  WHERE id IN (
    SELECT player1_id FROM game_sessions WHERE id = session_id
    UNION
    SELECT player2_id FROM game_sessions WHERE id = session_id
  );

  -- تسجيل نشاط التعادل
  INSERT INTO player_match_activities (user_id, game_session_id, activity_type, activity_details)
  SELECT player1_id, session_id, 'game_draw', jsonb_build_object('refunded_amount', bet_amount)
  FROM game_sessions WHERE id = session_id
  UNION
  SELECT player2_id, session_id, 'game_draw', jsonb_build_object('refunded_amount', bet_amount)
  FROM game_sessions WHERE id = session_id;

  RETURN TRUE;
END;
$$;