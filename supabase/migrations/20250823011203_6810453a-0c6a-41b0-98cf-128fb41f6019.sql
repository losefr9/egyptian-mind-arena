-- إضافة Foreign Keys للعلاقات بين الجداول

-- إضافة foreign key لجدول deposit_requests
ALTER TABLE public.deposit_requests 
ADD CONSTRAINT deposit_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- إضافة foreign key لجدول withdrawal_requests
ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- إضافة foreign key لجدول game_sessions
ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_player1_id_fkey 
FOREIGN KEY (player1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_player2_id_fkey 
FOREIGN KEY (player2_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_winner_id_fkey 
FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- إضافة foreign key لجدول user_activity_log
ALTER TABLE public.user_activity_log 
ADD CONSTRAINT user_activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_activity_log 
ADD CONSTRAINT user_activity_log_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;