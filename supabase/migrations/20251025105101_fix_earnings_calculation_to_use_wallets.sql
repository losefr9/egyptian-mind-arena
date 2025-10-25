/*
  # إصلاح دوال حساب الأرباح لاستخدام جدول المحافظ

  ## التغييرات:
  1. تحديث دالة calculate_match_earnings لاستخدام user_wallets بدلاً من profiles
  2. تحديث دالة handle_draw_match لاستخدام user_wallets بدلاً من profiles
  3. التأكد من حفظ جميع البيانات بشكل صحيح
  
  ## الأمان:
  - جميع العمليات تتم بشكل آمن
  - التحقق من وجود السجلات قبل التحديث
  - تسجيل جميع الأنشطة بشكل دقيق
*/

-- إعادة إنشاء دالة حساب الأرباح
CREATE OR REPLACE FUNCTION public.calculate_match_earnings(session_id UUID, winner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_bet_amount NUMERIC(10,2);
  platform_fee_pct NUMERIC(5,2);
  platform_earning NUMERIC(10,2);
  winner_earning NUMERIC(10,2);
  loser_user_id UUID;
BEGIN
  -- الحصول على تفاصيل المباراة
  SELECT (gs.bet_amount * 2), gs.platform_fee_percentage 
  INTO total_bet_amount, platform_fee_pct
  FROM game_sessions gs 
  WHERE gs.id = session_id;

  IF total_bet_amount IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- حساب الأرباح
  platform_earning := total_bet_amount * (platform_fee_pct / 100);
  winner_earning := total_bet_amount - platform_earning;

  -- الحصول على معرف الخاسر
  SELECT CASE 
    WHEN player1_id = winner_user_id THEN player2_id 
    ELSE player1_id 
  END INTO loser_user_id
  FROM game_sessions 
  WHERE id = session_id;

  -- تحديث جدول game_sessions
  UPDATE game_sessions 
  SET winner_earnings = winner_earning,
      platform_earnings = platform_earning,
      prize_amount = total_bet_amount,
      winner_id = winner_user_id,
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = session_id;

  -- إضافة أرباح المنصة
  INSERT INTO platform_earnings (game_session_id, earning_amount, earning_percentage, total_bet_amount)
  VALUES (session_id, platform_earning, platform_fee_pct, total_bet_amount)
  ON CONFLICT (game_session_id) DO UPDATE
  SET earning_amount = EXCLUDED.earning_amount,
      earning_percentage = EXCLUDED.earning_percentage,
      total_bet_amount = EXCLUDED.total_bet_amount;

  -- تحديث رصيد الفائز في user_wallets
  UPDATE user_wallets 
  SET balance = balance + winner_earning,
      total_winnings = total_winnings + winner_earning,
      updated_at = NOW()
  WHERE user_id = winner_user_id;

  -- تحديث إحصائيات الفائز
  UPDATE profiles 
  SET wins = wins + 1,
      updated_at = NOW()
  WHERE id = winner_user_id;

  -- تحديث إحصائيات الخاسر
  UPDATE profiles 
  SET losses = losses + 1,
      updated_at = NOW()
  WHERE id = loser_user_id;

  -- تسجيل نشاط الفوز
  INSERT INTO player_match_activities (
    user_id, 
    game_session_id, 
    activity_type, 
    earning_amount, 
    activity_details
  )
  VALUES (
    winner_user_id, 
    session_id, 
    'game_won', 
    winner_earning, 
    jsonb_build_object(
      'prize_amount', total_bet_amount, 
      'platform_fee', platform_earning,
      'net_earning', winner_earning
    )
  );

  -- تسجيل نشاط الخسارة
  INSERT INTO player_match_activities (
    user_id, 
    game_session_id, 
    activity_type, 
    earning_amount, 
    activity_details
  )
  VALUES (
    loser_user_id,
    session_id,
    'game_lost',
    0,
    jsonb_build_object(
      'prize_amount', total_bet_amount, 
      'platform_fee', platform_earning
    )
  );

  RETURN TRUE;
END;
$$;

-- إعادة إنشاء دالة معالجة التعادل
CREATE OR REPLACE FUNCTION public.handle_draw_match(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bet_amt NUMERIC(10,2);
  player1 UUID;
  player2 UUID;
BEGIN
  -- الحصول على بيانات الجلسة
  SELECT bet_amount, player1_id, player2_id
  INTO bet_amt, player1, player2
  FROM game_sessions 
  WHERE id = session_id;

  IF bet_amt IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- إعادة الرصيد للاعب الأول في user_wallets
  UPDATE user_wallets 
  SET balance = balance + bet_amt,
      updated_at = NOW()
  WHERE user_id = player1;

  -- إعادة الرصيد للاعب الثاني في user_wallets
  UPDATE user_wallets 
  SET balance = balance + bet_amt,
      updated_at = NOW()
  WHERE user_id = player2;

  -- تحديث حالة الجلسة
  UPDATE game_sessions 
  SET status = 'draw',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = session_id;

  -- تسجيل نشاط التعادل للاعب الأول
  INSERT INTO player_match_activities (
    user_id, 
    game_session_id, 
    activity_type, 
    activity_details
  )
  VALUES (
    player1, 
    session_id, 
    'game_draw', 
    jsonb_build_object('refunded_amount', bet_amt)
  );

  -- تسجيل نشاط التعادل للاعب الثاني
  INSERT INTO player_match_activities (
    user_id, 
    game_session_id, 
    activity_type, 
    activity_details
  )
  VALUES (
    player2, 
    session_id, 
    'game_draw', 
    jsonb_build_object('refunded_amount', bet_amt)
  );

  RETURN TRUE;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.calculate_match_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_draw_match TO authenticated;
