-- إعادة تعيين وتنظيف قاعدة البيانات
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- إعادة إنشاء السياسات لجدول profiles
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

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

-- إدراج المستخدمين الإداريين مباشرة في auth.users
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
  gen_random_uuid(),
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
  gen_random_uuid(),
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

-- إدراج ملفات المستخدمين مع الرصيد المطلوب
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

-- إدراج أدوار المستخدمين
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'admin'::app_role
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');

-- إضافة بعض الألعاب للاختبار
INSERT INTO public.games (name, description, image_url, is_active)
VALUES 
('لعبة الحظ', 'لعبة الحظ السريعة للفوز بجوائز كبيرة', '/placeholder.svg', true),
('روليت الأرقام', 'اختر رقمك المحظوظ واربح', '/placeholder.svg', true),
('ورق اللعب', 'تحدي الحظ في لعبة الورق الكلاسيكية', '/placeholder.svg', true);

-- إضافة بعض طلبات الإيداع للاختبار
INSERT INTO public.deposit_requests (
  user_id, 
  amount, 
  payment_method, 
  sender_number,
  payment_details, 
  status,
  admin_notes
)
SELECT 
  u.id,
  500.00,
  'bank_transfer',
  '+966501234567',
  '{"bank_name": "البنك الأهلي", "account_number": "123456789"}'::jsonb,
  'pending',
  'طلب إيداع تجريبي'
FROM auth.users u
WHERE u.email = '9bo5om9@gmail.com'
LIMIT 1;

-- إضافة بعض طلبات السحب للاختبار
INSERT INTO public.withdrawal_requests (
  user_id,
  amount,
  withdrawal_method,
  withdrawal_details,
  status,
  admin_notes
)
SELECT 
  u.id,
  200.00,
  'bank_transfer',
  '{"bank_name": "بنك الراجحي", "account_number": "987654321", "account_holder": "admin1"}'::jsonb,
  'pending',
  'طلب سحب تجريبي'
FROM auth.users u
WHERE u.email = '9bo5om9@gmail.com'
LIMIT 1;