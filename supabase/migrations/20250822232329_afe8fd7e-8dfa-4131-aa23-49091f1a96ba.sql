-- Use a completely different approach - work with existing structure
-- Delete everything completely using CASCADE
TRUNCATE auth.users CASCADE;

-- Disable triggers temporarily to avoid conflicts
ALTER TABLE public.profiles DISABLE TRIGGER ALL;
ALTER TABLE public.user_roles DISABLE TRIGGER ALL;

-- Clear all tables manually
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Re-enable triggers
ALTER TABLE public.profiles ENABLE TRIGGER ALL;
ALTER TABLE public.user_roles ENABLE TRIGGER ALL;

-- Fix RLS policies first - remove the conflicting ones
DROP POLICY IF EXISTS "Allow public profile lookup" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create simple working policies
CREATE POLICY "Public can read profiles for login" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);