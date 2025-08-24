-- حذف الدالة الموجودة وإنشاء النظام الجديد
DROP FUNCTION IF EXISTS public.get_public_username(uuid);

-- إنشاء نظام ماتشينق متطور لربط اللاعبين
-- إنشاء جدول قائمة انتظار اللاعبين
CREATE TABLE IF NOT EXISTS public.player_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID NOT NULL,
  bet_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  matched_at TIMESTAMP WITH TIME ZONE,
  match_session_id UUID,
  
  -- فهرس فريد لمنع اللاعب من الدخول لنفس اللعبة والمستوى مرتين
  UNIQUE(user_id, game_id, bet_amount, status) DEFERRABLE INITIALLY DEFERRED
);

-- تمكين RLS
ALTER TABLE public.player_queue ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Players can view their own queue entries" 
ON public.player_queue 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Players can create their own queue entries" 
ON public.player_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own queue entries" 
ON public.player_queue 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can update queue entries" 
ON public.player_queue 
FOR UPDATE 
USING (true);

-- فهارس لتحسين الأداء
CREATE INDEX idx_player_queue_waiting ON public.player_queue (game_id, bet_amount, status, created_at) WHERE status = 'waiting';
CREATE INDEX idx_player_queue_user_status ON public.player_queue (user_id, status);

-- دالة للبحث عن خصم وإنشاء مباراة
CREATE OR REPLACE FUNCTION public.find_match_and_create_session(
  p_user_id UUID,
  p_game_id UUID,
  p_bet_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_opponent_queue_entry RECORD;
  v_new_session_id UUID;
  v_result JSON;
BEGIN
  -- التحقق من رصيد اللاعب
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND balance >= p_bet_amount
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'message', 'رصيد غير كافي'
    );
  END IF;

  -- البحث عن خصم في الانتظار (استبعاد نفس اللاعب)
  SELECT * INTO v_opponent_queue_entry
  FROM player_queue 
  WHERE game_id = p_game_id 
    AND bet_amount = p_bet_amount 
    AND status = 'waiting'
    AND user_id != p_user_id  -- تجنب ربط اللاعب مع نفسه
  ORDER BY created_at ASC 
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_queue_entry.id IS NULL THEN
    -- لا يوجد خصم متاح، إضافة اللاعب لقائمة الانتظار
    INSERT INTO player_queue (user_id, game_id, bet_amount)
    VALUES (p_user_id, p_game_id, p_bet_amount)
    ON CONFLICT (user_id, game_id, bet_amount, status) 
    DO UPDATE SET 
      created_at = now(),
      updated_at = now()
    WHERE player_queue.status = 'waiting';

    RETURN json_build_object(
      'success', true,
      'action', 'queued',
      'message', 'تم إضافتك لقائمة الانتظار'
    );
  ELSE
    -- تم العثور على خصم، إنشاء مباراة جديدة
    
    -- خصم الرصيد من كلا اللاعبين
    UPDATE profiles 
    SET balance = balance - p_bet_amount 
    WHERE id IN (p_user_id, v_opponent_queue_entry.user_id)
      AND balance >= p_bet_amount;
    
    -- التحقق من نجاح خصم الرصيد
    IF (SELECT COUNT(*) FROM profiles 
        WHERE id IN (p_user_id, v_opponent_queue_entry.user_id) 
          AND balance >= 0) != 2 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'balance_update_failed',
        'message', 'فشل في خصم الرصيد'
      );
    END IF;

    -- إنشاء جلسة اللعب
    INSERT INTO game_sessions (
      game_id,
      player1_id,
      player2_id,
      bet_amount,
      status,
      started_at,
      prize_amount,
      platform_fee_percentage
    ) VALUES (
      p_game_id,
      v_opponent_queue_entry.user_id,  -- اللاعب الأول هو من كان في الانتظار
      p_user_id,                       -- اللاعب الثاني هو الجديد
      p_bet_amount,
      'in_progress',
      now(),
      p_bet_amount * 2,
      10
    ) RETURNING id INTO v_new_session_id;

    -- تحديث حالة اللاعبين في قائمة الانتظار
    UPDATE player_queue 
    SET status = 'matched', 
        matched_at = now(),
        match_session_id = v_new_session_id,
        updated_at = now()
    WHERE id = v_opponent_queue_entry.id;

    -- إضافة اللاعب الجديد كمطابق أيضاً
    INSERT INTO player_queue (
      user_id, game_id, bet_amount, status, matched_at, match_session_id
    ) VALUES (
      p_user_id, p_game_id, p_bet_amount, 'matched', now(), v_new_session_id
    );

    -- إنشاء سجل مباراة XO
    IF p_game_id = (SELECT id FROM games WHERE name = 'XO' LIMIT 1) THEN
      INSERT INTO xo_matches (
        game_session_id,
        current_turn_player_id,
        match_status
      ) VALUES (
        v_new_session_id,
        v_opponent_queue_entry.user_id,  -- البدء بالدور الأول (من كان في الانتظار)
        'waiting_for_question_answer'
      );
    END IF;

    RETURN json_build_object(
      'success', true,
      'action', 'matched',
      'session_id', v_new_session_id,
      'opponent_id', v_opponent_queue_entry.user_id,
      'message', 'تم العثور على خصم!'
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'system_error',
    'message', 'خطأ في النظام: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإلغاء البحث عن مباراة
CREATE OR REPLACE FUNCTION public.cancel_matchmaking(
  p_user_id UUID,
  p_game_id UUID,
  p_bet_amount NUMERIC
)
RETURNS JSON AS $$
BEGIN
  -- إلغاء من قائمة الانتظار
  UPDATE player_queue 
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = p_user_id 
    AND game_id = p_game_id 
    AND bet_amount = p_bet_amount 
    AND status = 'waiting';

  RETURN json_build_object(
    'success', true,
    'message', 'تم إلغاء البحث بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على إحصائيات قائمة الانتظار
CREATE OR REPLACE FUNCTION public.get_queue_stats(p_game_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_total_waiting INTEGER;
  v_by_game JSON;
BEGIN
  -- إجمالي المنتظرين
  SELECT COUNT(*) INTO v_total_waiting
  FROM player_queue 
  WHERE status = 'waiting'
    AND (p_game_id IS NULL OR game_id = p_game_id);

  -- الإحصائيات حسب اللعبة ومستوى الرهان
  SELECT json_agg(
    json_build_object(
      'game_id', game_id,
      'bet_amount', bet_amount,
      'waiting_count', count
    )
  ) INTO v_by_game
  FROM (
    SELECT 
      game_id,
      bet_amount,
      COUNT(*) as count
    FROM player_queue 
    WHERE status = 'waiting'
      AND (p_game_id IS NULL OR game_id = p_game_id)
    GROUP BY game_id, bet_amount
    ORDER BY game_id, bet_amount
  ) stats;

  RETURN json_build_object(
    'total_waiting', v_total_waiting,
    'by_game_and_level', COALESCE(v_by_game, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على المعلومات العامة للخصم (مبسطة)
CREATE OR REPLACE FUNCTION public.get_public_username(user_id_input UUID)
RETURNS TABLE(username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(profiles.username, 'لاعب مجهول') as username
  FROM profiles
  WHERE profiles.id = user_id_input
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ترايقر لتنظيف القوائم القديمة (أكبر من ساعة)
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_entries()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM player_queue 
  WHERE status = 'waiting' 
    AND created_at < now() - INTERVAL '1 hour';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- تشغيل التنظيف عند إدراج جديد
CREATE OR REPLACE TRIGGER cleanup_queue_trigger
  AFTER INSERT ON player_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_queue_entries();