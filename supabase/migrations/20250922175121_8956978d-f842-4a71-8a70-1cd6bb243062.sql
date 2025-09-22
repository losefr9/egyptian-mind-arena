-- حذف الدالة الخاطئة التي تسبب التضارب
DROP FUNCTION IF EXISTS public.update_xo_board(p_game_session_id uuid, p_new_board jsonb, p_player_id uuid);

-- الاحتفاظ بالدالة الصحيحة فقط التي تستقبل text
-- تم تحديثها مسبقاً في الهجرة السابقة

-- إضافة realtime للجدول
ALTER PUBLICATION supabase_realtime ADD TABLE xo_matches;
ALTER TABLE xo_matches REPLICA IDENTITY FULL;