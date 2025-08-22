-- حذف جميع البيانات أولاً
DELETE FROM public.withdrawal_requests;
DELETE FROM public.deposit_requests;
DELETE FROM public.game_sessions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- حذف قيد الـ foreign key مؤقتاً لإنشاء البيانات الأساسية
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- إنشاء ملفات admin1 و admin2 مباشرة في profiles
INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
VALUES 
('c0000000-0000-0000-0000-000000000001', '9bo5om9@gmail.com', 'admin1', 10000.00, 0, 0, 'admin'),
('c0000000-0000-0000-0000-000000000002', 'totolosefr@gmail.com', 'admin2', 10000.00, 0, 0, 'admin');

-- إنشاء أدوار الإدمن
INSERT INTO public.user_roles (user_id, role)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'admin'::app_role),
('c0000000-0000-0000-0000-000000000002', 'admin'::app_role);

-- إضافة قيد الـ foreign key مرة أخرى ولكن مع ON DELETE CASCADE لمنع المشاكل المستقبلية
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- تحديث handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من وجود ملف مستخدم موجود
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- إذا كان موجود، قم بتحديث الـ ID فقط
    UPDATE public.profiles 
    SET id = NEW.id 
    WHERE email = NEW.email;
    
    -- تحديث user_roles أيضاً
    UPDATE public.user_roles 
    SET user_id = NEW.id 
    WHERE user_id = (SELECT id FROM public.profiles WHERE email = NEW.email LIMIT 1);
  ELSE
    -- إذا لم يكن موجود، قم بإنشاء ملف جديد
    INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
      0.00,
      0,
      0,
      'user'
    );
    
    -- إضافة دور مستخدم عادي
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  -- إذا كان المستخدم في قائمة الإدمن، تأكد من أن له دور admin
  IF NEW.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com') THEN
    -- تحديث الدور إلى admin إذا لم يكن كذلك
    UPDATE public.user_roles 
    SET role = 'admin'::app_role 
    WHERE user_id = NEW.id;
    
    -- تحديث role في profiles أيضاً
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة الألعاب
DELETE FROM public.games;
INSERT INTO public.games (name, description, image_url, is_active)
VALUES 
('لعبة الحظ', 'لعبة الحظ السريعة للفوز بجوائز كبيرة', '/placeholder.svg', true),
('روليت الأرقام', 'اختر رقمك المحظوظ واربح', '/placeholder.svg', true),
('ورق اللعب', 'تحدي الحظ في لعبة الورق الكلاسيكية', '/placeholder.svg', true);