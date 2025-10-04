-- إصلاح مشكلة إمكانية الغش في الأسئلة الرياضية

-- 1. إضافة سياسة صريحة تمنع اللاعبين من رؤية الإجابات
CREATE POLICY "Players cannot view answers directly"
ON public.math_questions
FOR SELECT
TO authenticated
USING (false);

-- 2. إنشاء view آمن للأسئلة بدون الإجابات (للقراءة فقط)
CREATE OR REPLACE VIEW public.math_questions_safe AS
SELECT 
  id,
  question,
  difficulty_level,
  created_at
FROM public.math_questions;

-- 3. منح صلاحية القراءة على View الآمن لجميع المستخدمين
GRANT SELECT ON public.math_questions_safe TO authenticated;
GRANT SELECT ON public.math_questions_safe TO anon;

-- 4. تحديث الدوال الموجودة للتأكد من أنها آمنة
-- دالة get_random_math_question بالفعل لا ترجع الإجابة (آمنة)

-- 5. التأكد من أن دالة التحقق من الإجابة آمنة
-- validate_generated_math_answer تقوم بالحساب داخل الدالة (آمنة)
-- validate_math_answer ترجع الإجابة فقط بعد التحقق (آمنة)

-- 6. إضافة تعليق توضيحي
COMMENT ON POLICY "Players cannot view answers directly" ON public.math_questions IS 
'يمنع اللاعبين من الاستعلام المباشر عن جدول math_questions لمنع الغش. يجب استخدام الدوال الآمنة فقط';

COMMENT ON VIEW public.math_questions_safe IS 
'عرض آمن لجدول math_questions بدون عمود الإجابة - يمكن للاعبين استخدامه';