-- تفعيل REPLICA IDENTITY FULL لضمان استلام كامل البيانات في Real-time Updates
ALTER TABLE xo_matches REPLICA IDENTITY FULL;