-- تنظيف قاعدة البيانات بالكامل 
DELETE FROM public.deposit_requests;
DELETE FROM public.withdrawal_requests; 
DELETE FROM public.game_sessions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- إعادة تعيين التسلسلات
ALTER SEQUENCE IF EXISTS public.user_roles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.profiles_id_seq RESTART WITH 1;

-- إعادة إنشاء السياسات لجدول profiles بشكل نظيف
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- إنشاء سياسات RLS جديدة ومنظمة
CREATE POLICY "Allow public username lookup" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage own profile" 
ON public.profiles 
FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));