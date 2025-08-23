-- إضافة realtime للجداول المطلوبة
ALTER TABLE game_sessions REPLICA IDENTITY FULL;
ALTER TABLE xo_matches REPLICA IDENTITY FULL;

-- إضافة الجداول إلى الـ realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE xo_matches;