-- إضافة Real-time support لجدول player_queue
ALTER TABLE public.player_queue REPLICA IDENTITY FULL;

-- إضافة الجدول للنشر في الوقت الحقيقي
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_queue;