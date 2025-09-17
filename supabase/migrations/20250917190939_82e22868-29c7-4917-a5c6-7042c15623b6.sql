-- تفعيل realtime updates للجدول xo_matches
ALTER TABLE xo_matches REPLICA IDENTITY FULL;

-- إضافة الجدول لـ publication realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- تحديث دالة لتحديث اللوحة
CREATE OR REPLACE FUNCTION public.update_xo_board(
  p_game_session_id uuid,
  p_new_board jsonb,
  p_player_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من أن اللاعب في هذه الجلسة
  IF NOT EXISTS (
    SELECT 1 FROM game_sessions 
    WHERE id = p_game_session_id 
    AND (player1_id = p_player_id OR player2_id = p_player_id)
  ) THEN
    RETURN false;
  END IF;

  -- تحديث اللوحة
  UPDATE xo_matches 
  SET board_state = p_new_board,
      updated_at = now()
  WHERE game_session_id = p_game_session_id;

  RETURN true;
END;
$$;