-- حذف الدالة الخاطئة التي تسبب التضارب
DROP FUNCTION IF EXISTS public.update_xo_board(p_game_session_id uuid, p_new_board jsonb, p_player_id uuid);

-- تأكد من وجود REPLICA IDENTITY للجدول فقط  
ALTER TABLE xo_matches REPLICA IDENTITY FULL;