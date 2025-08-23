-- إزالة السياسة الحالية التي تسمح للجميع برؤية الأسئلة والأجوبة
DROP POLICY IF EXISTS "Everyone can view math questions" ON public.math_questions;

-- إنشاء سياسة جديدة تسمح فقط للمشرفين برؤية كامل البيانات
CREATE POLICY "Admins can view all math questions data" 
ON public.math_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- إنشاء دالة آمنة للحصول على سؤال عشوائي بدون الإجابة
CREATE OR REPLACE FUNCTION public.get_random_math_question()
RETURNS TABLE(id uuid, question text, difficulty_level integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT mq.id, mq.question, mq.difficulty_level
  FROM public.math_questions mq
  WHERE mq.difficulty_level <= 2  -- استخدام الأسئلة السهلة والمتوسطة فقط
  ORDER BY RANDOM()
  LIMIT 1;
$function$;

-- إنشاء دالة آمنة للتحقق من صحة الإجابة
CREATE OR REPLACE FUNCTION public.validate_math_answer(question_id uuid, user_answer integer)
RETURNS TABLE(is_correct boolean, correct_answer integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    (mq.answer = user_answer) as is_correct,
    mq.answer as correct_answer
  FROM public.math_questions mq
  WHERE mq.id = question_id;
$function$;

-- إنشاء دالة للحصول على سؤال محدد بدون الإجابة (للاستخدام في الألعاب)
CREATE OR REPLACE FUNCTION public.get_math_question_by_id(question_id uuid)
RETURNS TABLE(id uuid, question text, difficulty_level integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT mq.id, mq.question, mq.difficulty_level
  FROM public.math_questions mq
  WHERE mq.id = question_id;
$function$;