import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  CreditCard, 
  Users, 
  Building, 
  BarChart3, 
  MessageSquare
} from 'lucide-react';

// Import admin components
import { DepositsRequests } from '@/components/admin/deposits-requests';
import { WithdrawRequests } from '@/components/admin/withdraw-requests';
import UsersManagement from '@/components/admin/users-management';
import { PaymentGateways } from '@/components/admin/payment-gateways';
import { Statistics } from '@/components/admin/statistics';
import { Notifications } from '@/components/admin/notifications';

type AdminSection = 'deposits' | 'withdrawals' | 'users' | 'gateways' | 'statistics' | 'notifications';

const AdminContent = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('statistics');

  const adminSections = [
    {
      id: 'statistics' as AdminSection,
      title: 'الإحصائيات',
      icon: BarChart3,
      color: 'text-primary',
      description: 'إحصائيات المنصة والأرباح'
    },
    {
      id: 'deposits' as AdminSection,
      title: 'طلبات الإيداع',
      icon: Wallet,
      color: 'text-success',
      description: 'مراجعة وموافقة طلبات الإيداع'
    },
    {
      id: 'withdrawals' as AdminSection,
      title: 'طلبات السحب',
      icon: CreditCard,
      color: 'text-warning',
      description: 'مراجعة وموافقة طلبات السحب'
    },
    {
      id: 'users' as AdminSection,
      title: 'المستخدمين',
      icon: Users,
      color: 'text-accent',
      description: 'إدارة حسابات المستخدمين'
    },
    {
      id: 'gateways' as AdminSection,
      title: 'بوابات الدفع',
      icon: Building,
      color: 'text-muted-foreground',
      description: 'إدارة وسائل الدفع والسحب'
    },
    {
      id: 'notifications' as AdminSection,
      title: 'الإشعارات',
      icon: MessageSquare,
      color: 'text-destructive',
      description: 'إرسال الرسائل والإعلانات'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'statistics':
        return <Statistics />;
      case 'deposits':
        return <DepositsRequests />;
      case 'withdrawals':
        return <WithdrawRequests />;
      case 'users':
        return <UsersManagement />;
      case 'gateways':
        return <PaymentGateways />;
      case 'notifications':
        return <Notifications />;
      default:
        return <Statistics />;
    }
  };

  const activeTab = adminSections.find(section => section.id === activeSection);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* شريط التنقل العلوي للأقسام */}
        <nav className="bg-card/50 border border-border rounded-lg p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 ${
                    isActive ? 'shadow-md' : 'hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : section.color}`} />
                  {section.title}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* عنوان القسم النشط */}
        {activeTab && (
          <div className="bg-gradient-to-r from-card/80 to-card/60 border border-border rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                <activeTab.icon className={`h-6 w-6 ${activeTab.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{activeTab.title}</h2>
                <p className="text-muted-foreground">{activeTab.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* محتوى القسم النشط */}
        <div className="bg-card rounded-lg border border-border p-6">
          {renderActiveSection()}
        </div>
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