-- إصلاح مشاكل الـ Storage مع التعامل مع السياسات الموجودة

-- إزالة جميع السياسات الموجودة على storage.objects لـ payment-receipts
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON storage.objects';
    END LOOP;
END $$;

-- تحديث bucket ليكون public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-receipts';

-- إنشاء سياسات جديدة مبسطة
CREATE POLICY "payment_receipts_insert" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "payment_receipts_select" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'payment-receipts');

-- إضافة سياسة للحذف
CREATE POLICY "payment_receipts_delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'payment-receipts' AND ((auth.uid())::text = (storage.foldername(name))[1]));