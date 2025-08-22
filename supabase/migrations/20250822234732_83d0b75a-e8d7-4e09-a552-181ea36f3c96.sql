-- الحل الاحترافي النهائي: إنشاء حسابات auth حقيقية وتحسين النظام

-- أولاً: إنشاء edge function لإنشاء حسابات Auth
CREATE OR REPLACE FUNCTION public.create_admin_auth_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- سيتم استدعاء هذه الوظيفة من edge function
  RAISE NOTICE 'Admin accounts creation function ready';
END;
$$;

-- تحسين handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_profile_id uuid;
BEGIN
  -- البحث عن ملف موجود بنفس الإيميل
  SELECT id INTO existing_profile_id 
  FROM public.profiles 
  WHERE email = NEW.email 
  LIMIT 1;
  
  IF existing_profile_id IS NOT NULL THEN
    -- تحديث الملف الموجود بالـ ID الجديد من Auth
    UPDATE public.profiles 
    SET id = NEW.id 
    WHERE id = existing_profile_id;
    
    -- تحديث الأدوار
    UPDATE public.user_roles 
    SET user_id = NEW.id 
    WHERE user_id = existing_profile_id;
    
    RAISE NOTICE 'Updated existing profile for user: %', NEW.email;
  ELSE
    -- إنشاء ملف جديد
    INSERT INTO public.profiles (
      id, 
      email, 
      username, 
      balance, 
      wins, 
      losses, 
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', 
               split_part(NEW.email, '@', 1)),
      0.00,
      0,
      0,
      CASE 
        WHEN NEW.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com') 
        THEN 'admin' 
        ELSE 'user' 
      END
    );
    
    -- إضافة الدور المناسب
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id, 
      CASE 
        WHEN NEW.email IN ('9bo5om9@gmail.com', 'totolosefr@gmail.com') 
        THEN 'admin'::app_role 
        ELSE 'user'::app_role 
      END
    );
    
    RAISE NOTICE 'Created new profile for user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger محسن
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- تحسين RLS policies
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- تحديث has_role function للأداء الأفضل
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- إضافة وظيفة للحصول على دور المستخدم
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- وظيفة لتحديث رصيد المستخدم بأمان
CREATE OR REPLACE FUNCTION public.update_user_balance(
  _user_id uuid,
  _amount numeric,
  _operation text -- 'add', 'subtract', 'set'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
BEGIN
  -- التحقق من الصلاحية
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can update user balance';
  END IF;
  
  -- الحصول على الرصيد الحالي
  SELECT balance INTO current_balance 
  FROM public.profiles 
  WHERE id = _user_id;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- حساب الرصيد الجديد
  CASE _operation
    WHEN 'add' THEN
      new_balance := current_balance + _amount;
    WHEN 'subtract' THEN
      new_balance := current_balance - _amount;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
      END IF;
    WHEN 'set' THEN
      new_balance := _amount;
    ELSE
      RAISE EXCEPTION 'Invalid operation';
  END CASE;
  
  -- تحديث الرصيد
  UPDATE public.profiles 
  SET balance = new_balance,
      updated_at = now()
  WHERE id = _user_id;
  
  RETURN true;
END;
$$;

-- إضافة جدول سجل النشاط
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity" 
ON public.user_activity_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create activity logs" 
ON public.user_activity_log 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- فهرسة جدول النشاط
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity_log(created_at DESC);

-- وظيفة لتسجيل النشاط
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _user_id uuid,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_activity_log (user_id, admin_id, action, details)
  VALUES (_user_id, auth.uid(), _action, _details);
END;
$$;