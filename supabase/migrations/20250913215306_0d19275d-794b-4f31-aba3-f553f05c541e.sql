-- إصلاح مشكلة ON CONFLICT في جدول player_queue
-- حذف القيد المؤجل إذا كان موجوداً
ALTER TABLE public.player_queue DROP CONSTRAINT IF EXISTS player_queue_user_id_game_id_bet_amount_status_key;

-- إضافة قيد فريد بسيط غير مؤجل
CREATE UNIQUE INDEX IF NOT EXISTS player_queue_unique_waiting 
ON public.player_queue (user_id, game_id, bet_amount) 
WHERE status = 'waiting';

-- تحديث دالة find_match_and_create_session لتجنب مشكلة ON CONFLICT
CREATE OR REPLACE FUNCTION public.find_match_and_create_session(p_user_id uuid, p_game_id uuid, p_bet_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_opponent_queue_entry RECORD;
  v_new_session_id UUID;
  v_existing_queue_id UUID;
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

  -- التحقق من وجود اللاعب في قائمة الانتظار مسبقاً
  SELECT id INTO v_existing_queue_id
  FROM player_queue 
  WHERE user_id = p_user_id 
    AND game_id = p_game_id 
    AND bet_amount = p_bet_amount 
    AND status = 'waiting';

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
    IF v_existing_queue_id IS NULL THEN
      INSERT INTO player_queue (user_id, game_id, bet_amount)
      VALUES (p_user_id, p_game_id, p_bet_amount);
    ELSE
      -- تحديث الوقت إذا كان موجوداً مسبقاً
      UPDATE player_queue 
      SET created_at = now(), updated_at = now()
      WHERE id = v_existing_queue_id;
    END IF;

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

    -- حذف أو تحديث دخلة اللاعب الحالي إذا كانت موجودة
    IF v_existing_queue_id IS NOT NULL THEN
      UPDATE player_queue 
      SET status = 'matched', 
          matched_at = now(),
          match_session_id = v_new_session_id,
          updated_at = now()
      WHERE id = v_existing_queue_id;
    ELSE
      -- إضافة اللاعب الجديد كمطابق
      INSERT INTO player_queue (
        user_id, game_id, bet_amount, status, matched_at, match_session_id
      ) VALUES (
        p_user_id, p_game_id, p_bet_amount, 'matched', now(), v_new_session_id
      );
    END IF;

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
$function$;