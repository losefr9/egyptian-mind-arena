-- إصلاح الثغرات الأمنية في جدول profiles
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- إنشاء سياسات جديدة محمية بشكل صريح
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- منع الوصول الكامل للمستخدمين غير المصادقين
CREATE POLICY "Deny all access to anonymous users on profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- إصلاح الثغرات الأمنية في جدول deposit_requests
DROP POLICY IF EXISTS "Users can create their own deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Users can view their own deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can view all deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can update deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Prevent modification of processed requests" ON public.deposit_requests;

CREATE POLICY "Authenticated users can create own deposit requests"
ON public.deposit_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own deposit requests"
ON public.deposit_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all deposit requests"
ON public.deposit_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated admins can update deposit requests"
ON public.deposit_requests
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- منع الوصول الكامل للمستخدمين غير المصادقين
CREATE POLICY "Deny all access to anonymous users on deposit requests"
ON public.deposit_requests
FOR ALL
TO anon
USING (false);

-- إصلاح جدول platform_earnings (من التحذيرات أيضاً)
DROP POLICY IF EXISTS "Admins can view platform earnings" ON public.platform_earnings;
DROP POLICY IF EXISTS "System can create platform earnings" ON public.platform_earnings;

CREATE POLICY "Authenticated admins can view platform earnings"
ON public.platform_earnings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated system can create platform earnings"
ON public.platform_earnings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Deny all access to anonymous users on platform earnings"
ON public.platform_earnings
FOR ALL
TO anon
USING (false);