-- إصلاح تحذيرات الأمان للدوال الجديدة

-- تحديث دالة توليد كود الإحالة
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_code;
    EXIT WHEN NOT exists_code;
  END LOOP;
  RETURN code;
END;
$$;

-- تحديث دالة التسجيل عبر رابط الإحالة
CREATE OR REPLACE FUNCTION public.register_with_referral(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'كود الإحالة غير صحيح'
    );
  END IF;
  
  IF v_referrer_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'self_referral',
      'message', 'لا يمكنك استخدام كود الإحالة الخاص بك'
    );
  END IF;
  
  UPDATE public.profiles
  SET referred_by = v_referrer_id
  WHERE id = p_user_id;
  
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_user_id, p_referral_code)
  ON CONFLICT (referred_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التسجيل بنجاح عبر رابط الإحالة'
  );
END;
$$;

-- تحديث دالة تحديد الإيداع الأول
CREATE OR REPLACE FUNCTION public.mark_first_deposit(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referrals
  SET has_deposited = TRUE,
      first_deposit_at = NOW(),
      updated_at = NOW()
  WHERE referred_id = p_user_id
    AND has_deposited = FALSE;
END;
$$;