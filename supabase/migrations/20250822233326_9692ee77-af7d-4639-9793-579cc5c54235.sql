-- حذف جميع البيانات أولاً
DELETE FROM public.withdrawal_requests;
DELETE FROM public.deposit_requests;
DELETE FROM public.game_sessions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- إنشاء ملفات admin1 و admin2 مباشرة في profiles (سيتم ربطها بحسابات عند إنشائها)
INSERT INTO public.profiles (id, email, username, balance, wins, losses, role)
VALUES 
('c0000000-0000-0000-0000-000000000001', '9bo5om9@gmail.com', 'admin1', 10000.00, 0, 0, 'admin'),
('c0000000-0000-0000-0000-000000000002', 'totolosefr@gmail.com', 'admin2', 10000.00, 0, 0, 'admin');

-- إنشاء أدوار الإدمن
INSERT INTO public.user_roles (user_id, role)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'admin'::app_role),
('c0000000-0000-0000-0000-000000000002', 'admin'::app_role);

-- تحديث handler الـ trigger ليتعامل مع البيانات الموجودة
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
  END IF;
  
  -- التحقق من وجود دور للمستخدم
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    -- إضافة دور المستخدم إذا لم يكن موجود
    IF NEW.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com') THEN
      -- إذا كان في قائمة الإدمن، تحديث الدور إلى admin
      UPDATE public.user_roles 
      SET user_id = NEW.id 
      WHERE user_id IN ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002')
      AND role = 'admin';
    ELSE
      -- إضافة دور مستخدم عادي
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'user');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة بعض الألعاب
DELETE FROM public.games;
INSERT INTO public.games (name, description, image_url, is_active)
VALUES 
('لعبة الحظ', 'لعبة الحظ السريعة للفوز بجوائز كبيرة', '/placeholder.svg', true),
('روليت الأرقام', 'اختر رقمك المحظوظ واربح', '/placeholder.svg', true),
('ورق اللعب', 'تحدي الحظ في لعبة الورق الكلاسيكية', '/placeholder.svg', true);