-- إنشاء جدول الإحالات
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  has_deposited BOOLEAN DEFAULT FALSE,
  first_deposit_at TIMESTAMP WITH TIME ZONE,
  total_earnings NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id),
  UNIQUE(referred_id)
);

-- إضافة عمود كود الإحالة في جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- جدول أرباح الإحالات
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES public.game_sessions(id),
  earning_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  platform_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  referral_percentage NUMERIC(5,2) DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- دالة لتوليد كود إحالة فريد
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- توليد كود من 8 أحرف وأرقام
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- التحقق من عدم وجود الكود
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_code;
    
    EXIT WHEN NOT exists_code;
  END LOOP;
  
  RETURN code;
END;
$$;

-- دالة لتوليد كود إحالة تلقائياً للمستخدمين الجدد
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger لتوليد كود الإحالة تلقائياً
DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON public.profiles;
CREATE TRIGGER ensure_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_referral_code();

-- تحديث المستخدمين الحاليين بكود إحالة
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- دالة للتسجيل عبر رابط الإحالة
CREATE OR REPLACE FUNCTION public.register_with_referral(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- البحث عن المُحيل
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
  
  -- التحقق من عدم إحالة نفسه
  IF v_referrer_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'self_referral',
      'message', 'لا يمكنك استخدام كود الإحالة الخاص بك'
    );
  END IF;
  
  -- تحديث ملف المستخدم
  UPDATE public.profiles
  SET referred_by = v_referrer_id
  WHERE id = p_user_id;
  
  -- إنشاء سجل الإحالة
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_user_id, p_referral_code)
  ON CONFLICT (referred_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التسجيل بنجاح عبر رابط الإحالة'
  );
END;
$$;

-- دالة لتحديث حالة الإيداع الأول
CREATE OR REPLACE FUNCTION public.mark_first_deposit(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- تحديث دالة حساب أرباح المباراة لتشمل أرباح الإحالة
CREATE OR REPLACE FUNCTION public.calculate_match_earnings_with_referral(
  session_id UUID,
  winner_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_bet_amount NUMERIC(10,2);
  platform_fee_pct NUMERIC(5,2);
  platform_earning NUMERIC(10,2);
  winner_earning NUMERIC(10,2);
  referral_earning NUMERIC(10,2);
  referrer_user_id UUID;
  has_made_deposit BOOLEAN;
  referral_record_id UUID;
BEGIN
  -- الحصول على تفاصيل المباراة
  SELECT (gs.bet_amount * 2), gs.platform_fee_percentage 
  INTO total_bet_amount, platform_fee_pct
  FROM game_sessions gs 
  WHERE gs.id = session_id;

  -- حساب الأرباح
  platform_earning := total_bet_amount * (platform_fee_pct / 100);
  winner_earning := total_bet_amount - platform_earning;

  -- التحقق من وجود إحالة للفائز
  SELECT r.id, r.referrer_id, r.has_deposited
  INTO referral_record_id, referrer_user_id, has_made_deposit
  FROM public.referrals r
  WHERE r.referred_id = winner_user_id
    AND r.has_deposited = TRUE
  LIMIT 1;

  -- إذا كان هناك مُحيل والمُحال قد أودع
  IF referrer_user_id IS NOT NULL AND has_made_deposit THEN
    -- حساب ربح الإحالة (10% من أرباح المنصة)
    referral_earning := platform_earning * 0.10;
    
    -- إضافة الربح لحساب المُحيل
    UPDATE public.profiles
    SET balance = balance + referral_earning,
        updated_at = NOW()
    WHERE id = referrer_user_id;
    
    -- تسجيل أرباح الإحالة
    INSERT INTO public.referral_earnings (
      referral_id,
      referrer_id,
      game_session_id,
      earning_amount,
      platform_fee_amount,
      referral_percentage
    ) VALUES (
      referral_record_id,
      referrer_user_id,
      session_id,
      referral_earning,
      platform_earning,
      10.00
    );
    
    -- تحديث إجمالي أرباح الإحالة
    UPDATE public.referrals
    SET total_earnings = total_earnings + referral_earning,
        updated_at = NOW()
    WHERE id = referral_record_id;
  END IF;

  -- تحديث جدول game_sessions
  UPDATE game_sessions 
  SET winner_earnings = winner_earning,
      platform_earnings = platform_earning,
      prize_amount = total_bet_amount,
      winner_id = winner_user_id,
      status = 'completed',
      completed_at = NOW()
  WHERE id = session_id;

  -- إضافة أرباح المنصة
  INSERT INTO platform_earnings (game_session_id, earning_amount, earning_percentage, total_bet_amount)
  VALUES (session_id, platform_earning, platform_fee_pct, total_bet_amount);

  -- تحديث رصيد الفائز
  UPDATE profiles 
  SET balance = balance + winner_earning,
      wins = wins + 1
  WHERE id = winner_user_id;

  -- تحديث خسائر الخاسر
  UPDATE profiles 
  SET losses = losses + 1
  WHERE id IN (
    SELECT CASE 
      WHEN player1_id = winner_user_id THEN player2_id 
      ELSE player1_id 
    END
    FROM game_sessions 
    WHERE id = session_id
  );

  RETURN TRUE;
END;
$$;

-- سياسات الأمان (RLS)
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم رؤية إحالاتهم الخاصة
CREATE POLICY "Users can view their referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id);

-- المستخدمون يمكنهم رؤية من أحالهم
CREATE POLICY "Users can view who referred them"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referred_id);

-- النظام يمكنه إنشاء سجلات الإحالة
CREATE POLICY "System can create referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (true);

-- المستخدمون يمكنهم رؤية أرباح إحالاتهم
CREATE POLICY "Users can view their referral earnings"
ON public.referral_earnings FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id);

-- الأدمن يمكنه رؤية كل شيء
CREATE POLICY "Admins can view all referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all referral earnings"
ON public.referral_earnings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));