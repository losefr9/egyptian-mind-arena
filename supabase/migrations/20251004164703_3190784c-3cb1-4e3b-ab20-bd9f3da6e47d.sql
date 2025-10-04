-- 1. إزالة السياسة المكررة
DROP POLICY IF EXISTS "Users view own deposits only" ON public.deposit_requests;

-- 2. إضافة دالة للتحقق من صحة البيانات
CREATE OR REPLACE FUNCTION public.validate_deposit_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- التحقق من صحة رقم الهاتف (11 رقم يبدأ بـ 01)
  IF NEW.sender_number !~ '^01[0-9]{9}$' THEN
    RAISE EXCEPTION 'رقم الهاتف غير صحيح - يجب أن يبدأ بـ 01 ويحتوي على 11 رقم';
  END IF;
  
  -- التحقق من أن المبلغ ضمن حدود معقولة
  IF NEW.amount < 50 OR NEW.amount > 50000 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون بين 50 و 50000 جنيه';
  END IF;
  
  -- التحقق من أن payment_details ليس فارغاً
  IF NEW.payment_details IS NULL OR NEW.payment_details = '{}'::jsonb THEN
    RAISE EXCEPTION 'تفاصيل الدفع مطلوبة';
  END IF;
  
  -- تسجيل عملية الإنشاء/التحديث
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_log (user_id, action, details)
    VALUES (
      NEW.user_id,
      'deposit_request_created',
      jsonb_build_object(
        'amount', NEW.amount,
        'payment_method', NEW.payment_method,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. تطبيق Trigger للتحقق
DROP TRIGGER IF EXISTS validate_deposit_data ON public.deposit_requests;
CREATE TRIGGER validate_deposit_data
BEFORE INSERT OR UPDATE ON public.deposit_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_deposit_request();

-- 4. إضافة Index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_status 
ON public.deposit_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_created 
ON public.deposit_requests(created_at DESC);

-- 5. سياسة لمنع تعديل الطلبات المعالجة
DROP POLICY IF EXISTS "Prevent modification of processed requests" ON public.deposit_requests;
CREATE POLICY "Prevent modification of processed requests"
ON public.deposit_requests
FOR UPDATE
USING (
  status = 'pending' AND 
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);

-- 6. دالة آمنة لتسجيل الوصول من قبل الأدمن
CREATE OR REPLACE FUNCTION public.log_admin_deposit_access(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- التحقق من أن المستخدم أدمن
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  
  -- تسجيل الوصول
  INSERT INTO public.user_activity_log (
    admin_id,
    action,
    details
  ) VALUES (
    auth.uid(),
    'viewed_sensitive_deposit_data',
    jsonb_build_object(
      'request_id', request_id,
      'accessed_at', NOW()
    )
  );
END;
$$;