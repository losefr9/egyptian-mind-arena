import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DepositsRequests } from '@/components/admin/deposits-requests';

const AdminDepositsContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">طلبات الإيداع</h1>
          <p className="text-muted-foreground">مراجعة وموافقة طلبات الإيداع</p>
        </div>
        
        <DepositsRequests />
      </div>
    </AdminLayout>
  );
};

const AdminDeposits = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminDepositsContent />
    </ProtectedRoute>
  );
};

export default AdminDeposits;