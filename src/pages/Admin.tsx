import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Statistics } from '@/components/admin/statistics';

const AdminContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">مرحباً بك في لوحة التحكم</h1>
          <p className="text-muted-foreground">إدارة وتتبع أداء منصة العقل المصري</p>
        </div>
        
        {/* عرض الإحصائيات كصفحة رئيسية */}
        <Statistics />
      </div>
    </AdminLayout>
  );
};

const Admin = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminContent />
    </ProtectedRoute>
  );
};

export default Admin;