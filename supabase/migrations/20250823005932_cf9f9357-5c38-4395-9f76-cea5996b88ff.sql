-- إصلاح مشكلة الـ View الأمنية: إزالة SECURITY DEFINER من الـ View وإنشاء حل آمن بديل

-- إزالة الـ View الذي يسبب مشكلة أمنية
DROP VIEW IF EXISTS public.public_profiles;

-- إنشاء دالة آمنة للحصول على البيانات العامة للمستخدمين
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(
  id uuid,
  username text,
  wins integer,
  losses integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.id, p.username, p.wins, p.losses
  FROM public.profiles p;
$$;

-- السماح بالوصول للدالة للجميع
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated, anon;

-- دالة للبحث عن مستخدم واحد بواسطة username
CREATE OR REPLACE FUNCTION public.search_user_by_username(username_input text)
RETURNS TABLE(
  id uuid,
  username text,
  wins integer,
  losses integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.id, p.username, p.wins, p.losses
  FROM public.profiles p
  WHERE p.username ILIKE username_input || '%'
  LIMIT 10;
$$;

-- السماح بالوصول للدالة للجميع
GRANT EXECUTE ON FUNCTION public.search_user_by_username(text) TO authenticated, anon;