-- Clear existing data completely and create fresh admin accounts
-- Delete from child tables first to avoid foreign key constraints
DELETE FROM public.user_roles;
DELETE FROM public.profiles; 
DELETE FROM auth.users;

-- Create the admin accounts with correct structure
-- Admin 1: 9bo5om9@gmail.com / admin1 / Hms1hmss2hms3
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '9bo5om9@gmail.com',
  crypt('Hms1hmss2hms3', gen_salt('bf')),
  now(),
  jsonb_build_object('username', 'admin1', 'email', '9bo5om9@gmail.com'),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Admin 2: totolosefr@gmail.com / admin2 / Hms1hms2hms3  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'totolosefr@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  jsonb_build_object('username', 'admin2', 'email', 'totolosefr@gmail.com'),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create profiles for both admins
INSERT INTO public.profiles (id, email, username, balance)
SELECT u.id, u.email, u.raw_user_meta_data->>'username', 1000.00
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');

-- Assign admin roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com');