-- إنشاء حسابات الإدمن الجديدة
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
(
  'b0000000-0000-0000-0000-000000000001',
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
(
  'b0000000-0000-0000-0000-000000000002',
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

-- إنشاء ملفات المستخدمين مع الرصيد
INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
VALUES 
('b0000000-0000-0000-0000-000000000001', '9bo5om9@gmail.com', 'admin1', 10000.00, 0, 0, 'admin'),
('b0000000-0000-0000-0000-000000000002', 'totolosefr@gmail.com', 'admin2', 10000.00, 0, 0, 'admin');

-- إنشاء أدوار المستخدمين
INSERT INTO public.user_roles (user_id, role)
VALUES 
('b0000000-0000-0000-0000-000000000001', 'admin'::app_role),
('b0000000-0000-0000-0000-000000000002', 'admin'::app_role);

-- إضافة طلبات تجريبية
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
('b0000000-0000-0000-0000-000000000001', 500.00, 'bank_transfer', '+966501234567', '{"bank_name": "البنك الأهلي", "account_number": "123456789"}'::jsonb, 'pending', 'طلب إيداع تجريبي');

INSERT INTO public.withdrawal_requests (
  user_id,
  amount,
  withdrawal_method,
  withdrawal_details,
  status,
  admin_notes
)
VALUES 
('b0000000-0000-0000-0000-000000000001', 200.00, 'bank_transfer', '{"bank_name": "بنك الراجحي", "account_number": "987654321", "account_holder": "admin1"}'::jsonb, 'pending', 'طلب سحب تجريبي');