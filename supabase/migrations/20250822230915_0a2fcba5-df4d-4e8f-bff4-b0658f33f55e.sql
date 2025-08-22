-- Update admin accounts with correct credentials

-- First, let's update the profiles for both admin accounts
UPDATE auth.users 
SET 
  email = '9bo5om9@gmail.com',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{username}', 
    '"admin1"'
  ),
  email_confirmed_at = now(),
  confirmed_at = now()
WHERE email = '9bo5om9@gmail.com' OR raw_user_meta_data->>'username' = 'admin1';

UPDATE auth.users 
SET 
  email = 'totolosefr@gmail.com',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{username}', 
    '"admin2"'
  ),
  email_confirmed_at = now(),
  confirmed_at = now()
WHERE email = 'totolosefr@gmail.com' OR raw_user_meta_data->>'username' = 'admin2';

-- Update profiles table to match
UPDATE public.profiles 
SET 
  email = '9bo5om9@gmail.com',
  username = 'admin1'
WHERE username = 'admin1' OR email = '9bo5om9@gmail.com';

UPDATE public.profiles 
SET 
  email = 'totolosefr@gmail.com', 
  username = 'admin2'
WHERE username = 'admin2' OR email = 'totolosefr@gmail.com';

-- Ensure both accounts have admin roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Reset passwords for both accounts (they will need to be set manually in Supabase dashboard)
-- Note: Password hashes cannot be set directly via SQL for security reasons