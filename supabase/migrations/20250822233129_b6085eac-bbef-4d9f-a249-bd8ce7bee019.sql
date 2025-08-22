-- حذف شامل للبيانات الموجودة
DELETE FROM public.withdrawal_requests;
DELETE FROM public.deposit_requests;
DELETE FROM public.game_sessions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- حذف من auth.users أولاً
DELETE FROM auth.users;

-- إعادة ضبط التسلسلات
ALTER SEQUENCE auth.users_seq RESTART WITH 1;

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- إنشاء سياسات جديدة
CREATE POLICY "Public can read profiles for login" 
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

-- الآن إنشاء المستخدمين الجدد
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  email_confirmed_at
) VALUES 
-- admin1
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '9bo5om9@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin1"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  now()
),
-- admin2
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'totolosefr@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin2"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  now()
);

-- إنشاء ملفات المستخدمين
INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'username',
  10000.00,
  0,
  0,
  'admin'
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');

-- إنشاء أدوار المستخدمين
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'admin'::app_role
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');

-- إضافة الألعاب التجريبية
DELETE FROM public.games;
INSERT INTO public.games (name, description, image_url, is_active)
VALUES 
('لعبة الحظ', 'لعبة الحظ السريعة للفوز بجوائز كبيرة', '/placeholder.svg', true),
('روليت الأرقام', 'اختر رقمك المحظوظ واربح', '/placeholder.svg', true),
('ورق اللعب', 'تحدي الحظ في لعبة الورق الكلاسيكية', '/placeholder.svg', true);