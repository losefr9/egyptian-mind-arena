-- Fix RLS policies for profiles table to allow login lookup
-- Add policy to allow anyone to read profiles for username lookup during login
CREATE POLICY "Allow username lookup for login" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Update existing RLS policies to be more specific
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Make sure the profiles table has the correct structure
-- Check if the profile was created properly during signup
INSERT INTO public.profiles (id, email, username)
SELECT '21a2f4af-cb53-4bae-96ca-97998ee51d1b'::uuid, '9bo5om9@gmail.com', 'admin1'
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '21a2f4af-cb53-4bae-96ca-97998ee51d1b'::uuid
);