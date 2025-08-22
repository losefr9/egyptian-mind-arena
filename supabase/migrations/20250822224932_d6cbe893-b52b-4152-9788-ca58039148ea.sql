-- Update admin accounts with proper usernames and admin roles

-- Update first admin account (9bo5om9@gmail.com)
UPDATE profiles 
SET username = 'admin1'
WHERE email = '9bo5om9@gmail.com';

-- Update second admin account (totolosefr@gmail.com)  
UPDATE profiles
SET username = 'admin2'
WHERE email = 'totolosefr@gmail.com';

-- Add admin role for first account
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles 
WHERE email = '9bo5om9@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add admin role for second account
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles 
WHERE email = 'totolosefr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;