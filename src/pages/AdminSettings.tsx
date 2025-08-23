import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PaymentGateways } from '@/components/admin/payment-gateways';

const AdminSettingsContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة بوابات الدفع وإعدادات النظام</p>
        </div>
        
        <PaymentGateways />
      </div>
    </AdminLayout>
  );
};

const AdminSettings = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminSettingsContent />
    </ProtectedRoute>
  );
};

export default AdminSettings;