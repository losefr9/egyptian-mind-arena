import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import UsersManagement from '@/components/admin/users-management';

const AdminUsersContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">تتبع وإدارة حسابات المستخدمين</p>
        </div>
        
        <UsersManagement />
      </div>
    </AdminLayout>
  );
};

const AdminUsers = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminUsersContent />
    </ProtectedRoute>
  );
};

export default AdminUsers;