import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { WithdrawRequests } from '@/components/admin/withdraw-requests';

const AdminWithdrawalsContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">طلبات السحب</h1>
          <p className="text-muted-foreground">مراجعة وموافقة طلبات السحب</p>
        </div>
        
        <WithdrawRequests />
      </div>
    </AdminLayout>
  );
};

const AdminWithdrawals = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminWithdrawalsContent />
    </ProtectedRoute>
  );
};

export default AdminWithdrawals;