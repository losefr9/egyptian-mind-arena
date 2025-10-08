-- إنشاء جدول بوابات الدفع
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- vodafone_cash, etisalat_cash, orange_money, bank_transfer
  account_details JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  min_amount NUMERIC(10,2) DEFAULT 50.00,
  max_amount NUMERIC(10,2) DEFAULT 50000.00,
  fees_percentage NUMERIC(5,2) DEFAULT 0.00,
  processing_time TEXT DEFAULT '5-15 دقيقة',
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول إحصائيات بوابات الدفع
CREATE TABLE IF NOT EXISTS public.payment_gateway_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0.00,
  total_fees NUMERIC(10,2) DEFAULT 0.00,
  avg_processing_time_minutes INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- announcement, offer, update, warning
  target_type TEXT NOT NULL, -- all, specific_users, game_players
  target_filters JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'draft', -- draft, scheduled, sent, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول تتبع الإشعارات
CREATE TABLE IF NOT EXISTS public.notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT false
);

-- إنشاء جدول قوالب رسائل الدفع
CREATE TABLE IF NOT EXISTS public.payment_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- deposit_approved, deposit_rejected, withdrawal_approved, withdrawal_rejected, payment_instructions
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_message_templates ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لبوابات الدفع
CREATE POLICY "Admins can manage payment gateways"
  ON public.payment_gateways
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active payment gateways"
  ON public.payment_gateways
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- سياسات RLS لإحصائيات البوابات
CREATE POLICY "Admins can view gateway stats"
  ON public.payment_gateway_stats
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS للإشعارات
CREATE POLICY "Admins can manage notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their notifications"
  ON public.notification_delivery
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات RLS لقوالب الرسائل
CREATE POLICY "Admins can manage message templates"
  ON public.payment_message_templates
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- إدراج بيانات افتراضية لبوابات الدفع
INSERT INTO public.payment_gateways (name, type, account_details, min_amount, max_amount, instructions) VALUES
  ('فودافون كاش', 'vodafone_cash', '{"phone": "01XXXXXXXXX", "name": "اسم الحساب"}', 50, 50000, 'قم بتحويل المبلغ إلى الرقم المذكور وأرسل صورة الإيصال'),
  ('اتصالات كاش', 'etisalat_cash', '{"phone": "01XXXXXXXXX", "name": "اسم الحساب"}', 50, 50000, 'قم بتحويل المبلغ إلى الرقم المذكور وأرسل صورة الإيصال'),
  ('أورانج موني', 'orange_money', '{"phone": "01XXXXXXXXX", "name": "اسم الحساب"}', 50, 50000, 'قم بتحويل المبلغ إلى الرقم المذكور وأرسل صورة الإيصال'),
  ('تحويل بنكي', 'bank_transfer', '{"bank_name": "اسم البنك", "account_number": "XXXXXXXXXX", "account_name": "اسم الحساب"}', 100, 100000, 'قم بتحويل المبلغ إلى الحساب البنكي المذكور وأرسل صورة الإيصال');

-- إدراج قوالب رسائل افتراضية
INSERT INTO public.payment_message_templates (type, title, content) VALUES
  ('deposit_approved', 'تم قبول طلب الإيداع', 'تم قبول طلب إيداع بقيمة {amount} جنيه. تم إضافة المبلغ إلى رصيدك.'),
  ('deposit_rejected', 'تم رفض طلب الإيداع', 'تم رفض طلب إيداع بقيمة {amount} جنيه. السبب: {reason}'),
  ('withdrawal_approved', 'تم قبول طلب السحب', 'تم قبول طلب سحب بقيمة {amount} جنيه. سيتم التحويل خلال 24 ساعة.'),
  ('withdrawal_rejected', 'تم رفض طلب السحب', 'تم رفض طلب سحب بقيمة {amount} جنيه. السبب: {reason}'),
  ('payment_instructions', 'تعليمات الدفع', 'لإتمام عملية الإيداع، يرجى اتباع التعليمات التالية: {instructions}');

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.payment_message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();