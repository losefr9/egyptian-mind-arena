-- دالة لحساب الأرباح عند انتهاء المباراة
CREATE OR REPLACE FUNCTION calculate_match_earnings(session_id UUID, winner_user_id UUID)
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
      prize_amount = total_bet_amount,
      winner_id = winner_user_id,
      status = 'completed',
      completed_at = now()
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
SET search_path TO 'public'
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

  -- تحديث حالة الجلسة
  UPDATE game_sessions 
  SET status = 'draw',
      completed_at = now()
  WHERE id = session_id;

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