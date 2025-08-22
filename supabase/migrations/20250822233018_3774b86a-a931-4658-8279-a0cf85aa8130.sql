-- تنظيف قاعدة البيانات بشكل كامل
TRUNCATE public.user_roles RESTART IDENTITY CASCADE;
TRUNCATE public.profiles RESTART IDENTITY CASCADE;

-- حذف المستخدمين من auth.users مع معرف محدد
DELETE FROM auth.users WHERE email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');

-- إعادة إنشاء السياسات لجدول profiles
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- إنشاء سياسات RLS محدثة ومرتبة
CREATE POLICY "Public username lookup for login" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own profile" 
ON public.profiles 
FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- إنشاء مستخدمي admin1 و admin2
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
  updated_at
) VALUES 
-- admin1
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  '9bo5om9@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin1"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
),
-- admin2
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'totolosefr@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin2"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- إنشاء ملفات المستخدمين مع الرصيد المطلوب
INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
VALUES 
('10000000-0000-0000-0000-000000000001', '9bo5om9@gmail.com', 'admin1', 10000.00, 0, 0, 'admin'),
('10000000-0000-0000-0000-000000000002', 'totolosefr@gmail.com', 'admin2', 10000.00, 0, 0, 'admin');

-- إنشاء أدوار المستخدمين
INSERT INTO public.user_roles (user_id, role)
VALUES 
('10000000-0000-0000-0000-000000000001', 'admin'::app_role),
('10000000-0000-0000-0000-000000000002', 'admin'::app_role);

-- إضافة الألعاب
INSERT INTO public.games (name, description, image_url, is_active)
VALUES 
('لعبة الحظ', 'لعبة الحظ السريعة للفوز بجوائز كبيرة', '/placeholder.svg', true),
('روليت الأرقام', 'اختر رقمك المحظوظ واربح', '/placeholder.svg', true),
('ورق اللعب', 'تحدي الحظ في لعبة الورق الكلاسيكية', '/placeholder.svg', true);

-- إضافة طلبات إيداع تجريبية
INSERT INTO public.deposit_requests (
  user_id, 
  amount, 
  payment_method, 
  sender_number,
  payment_details, 
  status,
  admin_notes
)
VALUES 
('10000000-0000-0000-0000-000000000001', 500.00, 'bank_transfer', '+966501234567', '{"bank_name": "البنك الأهلي", "account_number": "123456789"}'::jsonb, 'pending', 'طلب إيداع تجريبي');

-- إضافة طلبات سحب تجريبية
INSERT INTO public.withdrawal_requests (
  user_id,
  amount,
  withdrawal_method,
  withdrawal_details,
  status,
  admin_notes
)
VALUES 
('10000000-0000-0000-0000-000000000001', 200.00, 'bank_transfer', '{"bank_name": "بنك الراجحي", "account_number": "987654321", "account_holder": "admin1"}'::jsonb, 'pending', 'طلب سحب تجريبي');