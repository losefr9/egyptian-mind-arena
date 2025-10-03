-- ============================================
-- إصلاح ثغرات الأمان الحرجة في RLS
-- ============================================

-- 1. حماية جدول profiles من الوصول العام
DROP POLICY IF EXISTS "Public can read profiles for login" ON profiles;

-- السماح للمستخدمين برؤية ملفاتهم الشخصية فقط
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- السماح للمستخدمين بتحديث ملفاتهم الشخصية فقط
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. التأكد من حماية deposit_requests
-- حذف أي سياسة قد تسمح بالوصول العام
DROP POLICY IF EXISTS "Anyone can view deposits" ON deposit_requests;
DROP POLICY IF EXISTS "Public can view deposits" ON deposit_requests;

-- السماح فقط للمستخدم برؤية طلبات الإيداع الخاصة به
CREATE POLICY "Users view own deposits only"
ON deposit_requests FOR SELECT
USING (auth.uid() = user_id);

-- 3. التأكد من حماية withdrawal_requests
DROP POLICY IF EXISTS "Anyone can view withdrawals" ON withdrawal_requests;
DROP POLICY IF EXISTS "Public can view withdrawals" ON withdrawal_requests;

CREATE POLICY "Users view own withdrawals only"
ON withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

-- 4. حماية user_activity_log من الوصول العام
DROP POLICY IF EXISTS "Anyone can view activity" ON user_activity_log;
DROP POLICY IF EXISTS "Public can view activity" ON user_activity_log;

-- فقط الأدمن يمكنهم رؤية السجل الكامل
CREATE POLICY "Only admins view full activity log"
ON user_activity_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- المستخدمون يمكنهم رؤية أنشطتهم الخاصة فقط
CREATE POLICY "Users view own activity"
ON user_activity_log FOR SELECT
USING (auth.uid() = user_id);

-- 5. تحديث صورة لعبة XO
UPDATE games 
SET image_url = '/src/assets/xo-game-image.jpg'
WHERE name = 'XO' OR name = 'xo' OR LOWER(name) = 'xo';

-- 6. إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);