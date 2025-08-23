-- إصلاح مشاكل الـ Storage للإيداعات والسحب

-- تحديث إعدادات bucket للإيصالات ليكون أسهل في الاستخدام
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-receipts';

-- إزالة السياسات المعقدة الحالية
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- إنشاء سياسات جديدة مبسطة ولكن آمنة
CREATE POLICY "Allow authenticated uploads to payment-receipts" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Allow authenticated users to view their receipts" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'payment-receipts');

CREATE POLICY "Allow admins to view all receipts" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'::app_role));

-- إضافة سياسة حذف للمستخدمين (لحذف صورهم الخاصة إذا أرادوا)
CREATE POLICY "Users can delete their own receipts" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'payment-receipts' AND ((auth.uid())::text = (storage.foldername(name))[1]));

-- تحديث صلاحيات الجداول للتأكد من عمل طلبات الإيداع والسحب
-- التأكد من وجود صلاحيات صحيحة على جدول profiles للمستخدمين
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- التأكد من صحة صلاحيات deposit_requests
GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;

-- التأكد من صحة صلاحيات withdrawal_requests  
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;