-- تعديل أرصدة الأدمن لتكون فارغة (لأن الأدمن لن يلعب)
UPDATE public.profiles 
SET balance = 0.00 
WHERE role = 'admin';