-- First, create both admin accounts directly in the database
-- Clear any existing data first
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Insert admin accounts directly (simulating what signup would do)
-- Admin 1
INSERT INTO auth.users (
  id,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  '9bo5om9@gmail.com',
  crypt('Hms1hmss2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin1", "email": "9bo5om9@gmail.com"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Admin 2  
INSERT INTO auth.users (
  id,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'totolosefr@gmail.com',
  crypt('Hms1hms2hms3', gen_salt('bf')),
  now(),
  '{"username": "admin2", "email": "totolosefr@gmail.com"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Insert profiles
INSERT INTO public.profiles (id, email, username, balance) VALUES
('a1111111-1111-1111-1111-111111111111'::uuid, '9bo5om9@gmail.com', 'admin1', 1000.00),
('a2222222-2222-2222-2222-222222222222'::uuid, 'totolosefr@gmail.com', 'admin2', 1000.00);

-- Insert admin roles
INSERT INTO public.user_roles (user_id, role) VALUES
('a1111111-1111-1111-1111-111111111111'::uuid, 'admin'),
('a2222222-2222-2222-2222-222222222222'::uuid, 'admin');

-- Fix RLS policies completely
-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create comprehensive RLS policies
-- Allow anyone to read profiles for login lookup (this is safe because we only expose email and username)
CREATE POLICY "Allow public profile lookup" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));