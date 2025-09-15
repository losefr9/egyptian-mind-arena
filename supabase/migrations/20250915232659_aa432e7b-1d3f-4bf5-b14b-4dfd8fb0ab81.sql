-- تحسين دالة الماتشينق لتكون أسرع وأكثر فعالية
CREATE OR REPLACE FUNCTION public.find_match_and_create_session_v3(p_user_id uuid, p_game_id uuid, p_bet_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_opponent_queue_entry RECORD;
  v_new_session_id UUID;
  v_existing_queue_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- التحقق من رصيد اللاعب أولاً
  SELECT balance INTO v_current_balance
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_bet_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'message', 'رصيد غير كافي'
    );
  END IF;

  -- البحث عن خصم مباشرة (استبعاد نفس اللاعب تماماً)
  SELECT * INTO v_opponent_queue_entry
  FROM player_queue 
  WHERE game_id = p_game_id 
    AND bet_amount = p_bet_amount 
    AND status = 'waiting'
    AND user_id != p_user_id  -- تجنب ربط اللاعب مع نفسه
    AND created_at >= now() - INTERVAL '10 minutes'  -- فقط المدخلات الحديثة
  ORDER BY created_at ASC 
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_queue_entry.id IS NOT NULL THEN
    -- تم العثور على خصم، إنشاء مباراة فوراً
    
    -- خصم الرصيد من كلا اللاعبين بشكل atomic
    UPDATE profiles 
    SET balance = balance - p_bet_amount,
        updated_at = now()
    WHERE id IN (p_user_id, v_opponent_queue_entry.user_id)
      AND balance >= p_bet_amount;
    
    -- التحقق من نجاح العملية
    IF (SELECT COUNT(*) FROM profiles 
        WHERE id IN (p_user_id, v_opponent_queue_entry.user_id) 
          AND balance >= 0) != 2 THEN
      ROLLBACK;
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
      v_opponent_queue_entry.user_id,  -- اللاعب الأول
      p_user_id,                       -- اللاعب الثاني
      p_bet_amount,
      'in_progress',
      now(),
      p_bet_amount * 2,
      10
    ) RETURNING id INTO v_new_session_id;

    -- تحديث حالة قائمة الانتظار
    UPDATE player_queue 
    SET status = 'matched', 
        matched_at = now(),
        match_session_id = v_new_session_id,
        updated_at = now()
    WHERE id = v_opponent_queue_entry.id;

    -- إضافة اللاعب الجديد كمطابق
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
        v_opponent_queue_entry.user_id,  -- البدء بالدور الأول
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
  ELSE
    -- لا يوجد خصم متاح، إضافة اللاعب لقائمة الانتظار
    
    -- حذف المدخلات القديمة للاعب
    DELETE FROM player_queue 
    WHERE user_id = p_user_id 
      AND game_id = p_game_id 
      AND bet_amount = p_bet_amount 
      AND status = 'waiting';

    -- إضافة مدخلة جديدة
    INSERT INTO player_queue (user_id, game_id, bet_amount, status)
    VALUES (p_user_id, p_game_id, p_bet_amount, 'waiting');

    RETURN json_build_object(
      'success', true,
      'action', 'queued',
      'message', 'تم إضافتك لقائمة الانتظار'
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

-- تحسين التنظيف التلقائي للقائمة
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_entries()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- حذف المدخلات القديمة (أكثر من 30 دقيقة)
  DELETE FROM player_queue 
  WHERE status = 'waiting' 
    AND created_at < now() - INTERVAL '30 minutes';
  
  -- حذف المدخلات المطابقة القديمة (أكثر من يوم)
  DELETE FROM player_queue 
  WHERE status = 'matched' 
    AND matched_at < now() - INTERVAL '1 day';
END;
$function$;