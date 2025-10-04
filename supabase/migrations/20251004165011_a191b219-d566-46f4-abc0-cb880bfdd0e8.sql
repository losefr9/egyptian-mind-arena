-- إصلاح تحذير Security Definer View
-- إعادة إنشاء View بدون SECURITY DEFINER

DROP VIEW IF EXISTS public.math_questions_safe;

CREATE VIEW public.math_questions_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  question,
  difficulty_level,
  created_at
FROM public.math_questions;

-- منح الصلاحيات
GRANT SELECT ON public.math_questions_safe TO authenticated;
GRANT SELECT ON public.math_questions_safe TO anon;

-- إضافة تعليق
COMMENT ON VIEW public.math_questions_safe IS 
'عرض آمن لجدول math_questions بدون عمود الإجابة - يستخدم security_invoker لضمان الأمان';