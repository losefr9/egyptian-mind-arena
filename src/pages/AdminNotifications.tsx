import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Notifications } from '@/components/admin/notifications';

const AdminNotificationsContent = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground">إرسال الرسائل والإعلانات للمستخدمين</p>
        </div>
        
        <Notifications />
      </div>
    </AdminLayout>
  );
};

const AdminNotifications = () => {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminNotificationsContent />
    </ProtectedRoute>
  );
};

export default AdminNotifications;