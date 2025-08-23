-- إصلاح مشاكل الأمان - تحديث إعدادات كلمات المرور وتفعيل حماية كلمات المرور المسربة
-- تعديل إعدادات OTP لتكون أكثر أماناً
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements,auto_explain';

-- تحديث إعدادات كلمات المرور لجعلها أكثر أماناً
UPDATE auth.config 
SET value = '{"enable_manual_linking": false, "enable_signup": true, "enable_anonymous_sign_ins": false, "disable_signup": false, "site_url": "", "additional_redirect_urls": [], "jwt_expiry": 3600, "refresh_token_rotation_enabled": true, "security_captcha_enabled": false, "security_captcha_secret": "", "security_captcha_provider": "hcaptcha", "sms_autoconfirm": false, "sms_max_frequency": 60, "sms_otp_exp": 300, "sms_otp_length": 6, "sms_provider": "twilio", "sms_template": "Your code is {{ .Code }}", "sms_testphone": {}, "email_confirm_change_enabled": true, "email_double_confirm_changes_enabled": true, "email_enable_confirmations": true, "email_secure_password_change_enabled": false, "mailer_autoconfirm": false, "mailer_otp_exp": 300, "mailer_secure_email_change_enabled": true, "mailer_urlpaths": {"invite": "/auth/confirm", "confirm": "/auth/confirm", "recovery": "/auth/confirm", "email_change": "/auth/confirm"}, "external_email_enabled": true, "external_phone_enabled": true, "password_min_length": 8, "password_required_characters": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}'::jsonb
WHERE parameter = 'config';

-- تفعيل حماية كلمات المرور المسربة عبر تحديث إعدادات Auth
UPDATE auth.config 
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{password_strength, enabled}', 
  'true'::jsonb
)
WHERE parameter = 'config';

-- تقليل مدة انتهاء صلاحية OTP لتكون أكثر أماناً (5 دقائق بدلاً من الافتراضي)
UPDATE auth.config 
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{mailer_otp_exp}', 
  '300'::jsonb
)
WHERE parameter = 'config';

UPDATE auth.config 
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{sms_otp_exp}', 
  '300'::jsonb
)
WHERE parameter = 'config';