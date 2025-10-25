/*
  # دالة معالجة انسحاب اللاعب من المباراة

  ## الوصف
  تعالج هذه الدالة حالة انسحاب اللاعب من المباراة وتمنح الفوز للاعب الآخر تلقائياً
  
  ## الوظائف:
  1. تحديث حالة المباراة إلى "resigned"
  2. تحديد الفائز (اللاعب الآخر)
  3. حساب أرباح الفائز بشكل صحيح
  4. تحديث رصيد الفائز
  5. تسجيل النشاط في سجل الأنشطة
  
  ## المعاملات:
  - p_session_id: معرف جلسة اللعبة
  - p_resigning_player_id: معرف اللاعب المنسحب
  
  ## الإرجاع:
  - success: true/false
  - message: رسالة توضيحية
  - winner_id: معرف الفائز
  - winner_earnings: أرباح الفائز
*/

-- حذف الدالة القديمة إن وجدت
DROP FUNCTION IF EXISTS handle_player_resignation(UUID, UUID);

-- إنشاء الدالة الجديدة
CREATE OR REPLACE FUNCTION handle_player_resignation(
  p_session_id UUID,
  p_resigning_player_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_winner_id UUID;
  v_bet_amount DECIMAL(10,2);
  v_platform_fee DECIMAL(10,2);
  v_winner_earnings DECIMAL(10,2);
  v_result JSON;
BEGIN
  -- الحصول على معلومات الجلسة
  SELECT 
    gs.*,
    (SELECT platform_fee_percentage FROM platform_settings ORDER BY created_at DESC LIMIT 1) as fee_percentage
  INTO v_session
  FROM game_sessions gs
  WHERE gs.id = p_session_id
  AND gs.status IN ('waiting', 'active', 'playing')
  FOR UPDATE;

  -- التحقق من وجود الجلسة
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الجلسة غير موجودة أو انتهت بالفعل'
    );
  END IF;

  -- التحقق من أن اللاعب جزء من الجلسة
  IF v_session.player1_id != p_resigning_player_id AND v_session.player2_id != p_resigning_player_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'اللاعب ليس جزءاً من هذه الجلسة'
    );
  END IF;

  -- تحديد الفائز (اللاعب الآخر)
  IF v_session.player1_id = p_resigning_player_id THEN
    v_winner_id := v_session.player2_id;
  ELSE
    v_winner_id := v_session.player1_id;
  END IF;

  -- حساب الأرباح
  v_bet_amount := v_session.bet_amount;
  v_platform_fee := (v_bet_amount * 2 * COALESCE(v_session.fee_percentage, 10)) / 100;
  v_winner_earnings := (v_bet_amount * 2) - v_platform_fee;

  -- تحديث حالة الجلسة
  UPDATE game_sessions
  SET 
    status = 'completed',
    winner_id = v_winner_id,
    winner_earnings = v_winner_earnings,
    end_reason = 'resignation',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  -- تحديث رصيد الفائز
  UPDATE user_wallets
  SET 
    balance = balance + v_winner_earnings,
    updated_at = NOW()
  WHERE user_id = v_winner_id;

  -- تسجيل النشاط للاعب المنسحب
  INSERT INTO player_match_activities (
    user_id,
    game_session_id,
    activity_type,
    activity_details
  ) VALUES (
    p_resigning_player_id,
    p_session_id,
    'resignation',
    json_build_object(
      'message', 'انسحب من المباراة',
      'winner_id', v_winner_id,
      'timestamp', NOW()
    )
  );

  -- تسجيل النشاط للفائز
  INSERT INTO player_match_activities (
    user_id,
    game_session_id,
    activity_type,
    activity_details
  ) VALUES (
    v_winner_id,
    p_session_id,
    'win_by_resignation',
    json_build_object(
      'message', 'فاز بسبب انسحاب الخصم',
      'earnings', v_winner_earnings,
      'resigned_player_id', p_resigning_player_id,
      'timestamp', NOW()
    )
  );

  -- تحديث جداول المباريات الخاصة بكل لعبة إلى حالة منتهية
  -- Chess
  UPDATE chess_matches
  SET 
    match_status = 'resigned',
    updated_at = NOW()
  WHERE game_session_id = p_session_id 
  AND match_status NOT IN ('checkmate', 'timeout', 'resigned');

  -- XO
  UPDATE xo_matches
  SET 
    match_status = 'resigned',
    updated_at = NOW()
  WHERE game_session_id = p_session_id 
  AND match_status != 'resigned';

  -- Domino
  UPDATE domino_matches
  SET 
    match_status = 'resigned',
    updated_at = NOW()
  WHERE game_session_id = p_session_id 
  AND match_status != 'resigned';

  -- Ludo
  UPDATE ludo_matches
  SET 
    match_status = 'resigned',
    updated_at = NOW()
  WHERE game_session_id = p_session_id 
  AND match_status != 'resigned';

  -- بناء النتيجة
  v_result := json_build_object(
    'success', true,
    'message', 'تم معالجة الانسحاب بنجاح',
    'winner_id', v_winner_id,
    'winner_earnings', v_winner_earnings,
    'platform_fee', v_platform_fee
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء معالجة الانسحاب: ' || SQLERRM
    );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION handle_player_resignation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_player_resignation TO anon;
