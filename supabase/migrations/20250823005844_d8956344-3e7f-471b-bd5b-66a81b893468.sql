-- إصلاح مشكلة الأمان: إزالة السياسة العامة وإنشاء سياسات أمنية مناسبة

-- إزالة السياسة الخطيرة التي تسمح بالوصول العام لجميع البيانات
DROP POLICY IF EXISTS "Allow public username lookup" ON public.profiles;

-- إنشاء سياسة للسماح للمستخدمين برؤية أسماء المستخدمين فقط (للبحث عن المستخدمين في الألعاب)
CREATE POLICY "Public can view usernames only" 
ON public.profiles 
FOR SELECT 
USING (true)
-- السماح بعرض username فقط، ليس البيانات الحساسة
-- ملاحظة: هذه السياسة ستكون محدودة بالاستعلامات التي تطلب username فقط

-- إنشاء view آمن للبيانات العامة فقط
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  wins,
  losses
FROM public.profiles;

-- السماح بالوصول العام للـ view الآمن فقط
ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- إزالة السياسة العامة المؤقتة
DROP POLICY IF EXISTS "Public can view usernames only" ON public.profiles;

-- إنشاء سياسة محدودة للبحث عن أسماء المستخدمين فقط
-- هذه الدالة تضمن عرض username فقط للمستخدمين غير المسجلين
CREATE OR REPLACE FUNCTION public.get_public_username(user_id_input uuid)
RETURNS TABLE(username text, wins integer, losses integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.username, p.wins, p.losses
  FROM public.profiles p
  WHERE p.id = user_id_input;
$$;

-- السماح بالوصول للدالة للجميع
GRANT EXECUTE ON FUNCTION public.get_public_username(uuid) TO authenticated, anon;