import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  CreditCard, 
  Users, 
  Building, 
  BarChart3, 
  MessageSquare,
  Shield,
  LogOut
} from 'lucide-react';

// Import admin components
import { DepositsRequests } from '@/components/admin/deposits-requests';
import { WithdrawRequests } from '@/components/admin/withdraw-requests';
import { UsersManagement } from '@/components/admin/users-management';
import { PaymentGateways } from '@/components/admin/payment-gateways';
import { Statistics } from '@/components/admin/statistics';
import { Notifications } from '@/components/admin/notifications';

type AdminSection = 'deposits' | 'withdrawals' | 'users' | 'gateways' | 'statistics' | 'notifications';

const Admin = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('deposits');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const adminSections = [
    {
      id: 'deposits' as AdminSection,
      title: 'طلبات الإيداع',
      icon: Wallet,
      color: 'text-primary',
      description: 'مراجعة وموافقة طلبات الإيداع'
    },
    {
      id: 'withdrawals' as AdminSection,
      title: 'طلبات السحب',
      icon: CreditCard,
      color: 'text-success',
      description: 'مراجعة وموافقة طلبات السحب'
    },
    {
      id: 'users' as AdminSection,
      title: 'المستخدمين',
      icon: Users,
      color: 'text-warning',
      description: 'إدارة حسابات المستخدمين'
    },
    {
      id: 'gateways' as AdminSection,
      title: 'بوابات الدفع',
      icon: Building,
      color: 'text-accent',
      description: 'إدارة وسائل الدفع والسحب'
    },
    {
      id: 'statistics' as AdminSection,
      title: 'الإحصائيات',
      icon: BarChart3,
      color: 'text-destructive',
      description: 'إحصائيات المنصة والأرباح'
    },
    {
      id: 'notifications' as AdminSection,
      title: 'الإشعارات',
      icon: MessageSquare,
      color: 'text-muted-foreground',
      description: 'إرسال الرسائل والإعلانات'
    }
  ];

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "غير مصرح",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Check if user has admin role
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      const hasAdminRole = userRoles?.some((role: any) => role.role === 'admin');
      
      if (!hasAdminRole) {
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحيات للوصول إلى لوحة الإدارة",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Get profile separately
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setAdminProfile(profile);
      setIsAdmin(true);
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      toast({
        title: "خطأ",
        description: "فشل في التحقق من صلاحيات الإدارة",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الخروج",
        variant: "destructive"
      });
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'deposits':
        return <DepositsRequests />;
      case 'withdrawals':
        return <WithdrawRequests />;
      case 'users':
        return <UsersManagement />;
      case 'gateways':
        return <PaymentGateways />;
      case 'statistics':
        return <Statistics />;
      case 'notifications':
        return <Notifications />;
      default:
        return <DepositsRequests />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const activeTab = adminSections.find(section => section.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-muted/30" dir="rtl">
      {/* Admin Header */}
      <header className="bg-card border-b border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">لوحة الإدارة</h1>
                <p className="text-sm text-muted-foreground">E-FAR Admin Panel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{adminProfile?.username || 'الأدمن'}</p>
                <Badge variant="secondary" className="text-xs">مدير النظام</Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 ml-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-card/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-reverse space-x-1 overflow-x-auto py-4">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 whitespace-nowrap ${
                    isActive ? 'shadow-md' : 'hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : section.color}`} />
                  {section.title}
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Active Section Header */}
      {activeTab && (
        <div className="bg-gradient-to-r from-card/80 to-card/60 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center`}>
                <activeTab.icon className={`h-6 w-6 ${activeTab.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{activeTab.title}</h2>
                <p className="text-muted-foreground">{activeTab.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveSection()}
      </main>
    </div>
  );
};

export default Admin;