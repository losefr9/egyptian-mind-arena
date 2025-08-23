-- إصلاح مشاكل الأمان في الدوال
CREATE OR REPLACE FUNCTION public.generate_random_math_question()
RETURNS TABLE(id uuid, question text, answer integer, difficulty_level integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  num1 INTEGER;
  num2 INTEGER;
  operation TEXT;
  calculated_answer INTEGER;
  question_text TEXT;
  difficulty INTEGER;
  question_id uuid;
BEGIN
  -- تحديد مستوى الصعوبة عشوائياً
  difficulty := (RANDOM() * 2)::INTEGER + 1; -- مستوى 1 أو 2
  
  -- اختيار العملية عشوائياً (جمع أو ضرب)
  IF RANDOM() < 0.5 THEN
    operation := '+';
  ELSE
    operation := '×';
  END IF;
  
  -- توليد الأرقام حسب المستوى
  IF difficulty = 1 THEN
    -- سهل
    IF operation = '+' THEN
      num1 := (RANDOM() * 20)::INTEGER + 1; -- 1-20
      num2 := (RANDOM() * 20)::INTEGER + 1; -- 1-20
      calculated_answer := num1 + num2;
    ELSE
      num1 := (RANDOM() * 5)::INTEGER + 1;  -- 1-5
      num2 := (RANDOM() * 5)::INTEGER + 1;  -- 1-5
      calculated_answer := num1 * num2;
    END IF;
  ELSE
    -- متوسط
    IF operation = '+' THEN
      num1 := (RANDOM() * 50)::INTEGER + 20; -- 20-70
      num2 := (RANDOM() * 50)::INTEGER + 20; -- 20-70
      calculated_answer := num1 + num2;
    ELSE
      num1 := (RANDOM() * 7)::INTEGER + 3;   -- 3-10
      num2 := (RANDOM() * 7)::INTEGER + 3;   -- 3-10
      calculated_answer := num1 * num2;
    END IF;
  END IF;
  
  -- تكوين نص السؤال
  question_text := num1::TEXT || ' ' || operation || ' ' || num2::TEXT || ' = ؟';
  
  -- إنشاء معرف فريد للسؤال
  question_id := gen_random_uuid();
  
  -- إرجاع البيانات
  RETURN QUERY SELECT 
    question_id,
    question_text,
    calculated_answer,
    difficulty;
END;
$function$;

-- تحديث دالة الحصول على سؤال عشوائي
CREATE OR REPLACE FUNCTION public.get_random_math_question()
RETURNS TABLE(id uuid, question text, difficulty_level integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT rmq.id, rmq.question, rmq.difficulty_level
  FROM public.generate_random_math_question() rmq;
$function$;

-- تحديث دالة التحقق من الإجابة
CREATE OR REPLACE FUNCTION public.validate_generated_math_answer(question_text text, user_answer integer)
RETURNS TABLE(is_correct boolean, correct_answer integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  parts TEXT[];
  num1 INTEGER;
  num2 INTEGER;
  operation TEXT;
  calculated_answer INTEGER;
BEGIN
  -- تحليل نص السؤال
  parts := string_to_array(replace(question_text, ' = ؟', ''), ' ');
  
  IF array_length(parts, 1) >= 3 THEN
    num1 := parts[1]::INTEGER;
    operation := parts[2];
    num2 := parts[3]::INTEGER;
    
    -- حساب الإجابة الصحيحة
    IF operation = '+' THEN
      calculated_answer := num1 + num2;
    ELSIF operation = '×' THEN
      calculated_answer := num1 * num2;
    ELSE
      calculated_answer := 0; -- خطأ في العملية
    END IF;
    
    RETURN QUERY SELECT 
      (user_answer = calculated_answer) as is_correct,
      calculated_answer as correct_answer;
  ELSE
    -- خطأ في تحليل السؤال
    RETURN QUERY SELECT false as is_correct, 0 as correct_answer;
  END IF;
END;
$function$;