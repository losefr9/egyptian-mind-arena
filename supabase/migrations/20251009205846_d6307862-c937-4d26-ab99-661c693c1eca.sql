-- ✅ الأولوية 1: إصلاح RLS policies للإشعارات
-- المشكلة: لا يمكن للأدمن إدراج سجلات في notification_delivery

-- إضافة policy للأدمن لإنشاء سجلات التوصيل
CREATE POLICY "Admins can create delivery records"
ON notification_delivery
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- إضافة policy للنظام لتحديث سجلات التوصيل
CREATE POLICY "System can update delivery records"
ON notification_delivery
FOR UPDATE
TO authenticated
USING (true);

-- إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user_id 
ON notification_delivery(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification_id 
ON notification_delivery(notification_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status 
ON notifications(status);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);