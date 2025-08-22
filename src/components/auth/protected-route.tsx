import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "يجب تسجيل الدخول",
          description: "يرجى تسجيل الدخول للوصول إلى هذه الصفحة",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      if (requireAdmin) {
        // Check admin role
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (error) throw error;

        const hasAdminRole = userRoles?.some((role: any) => role.role === 'admin');
        
        if (!hasAdminRole) {
          toast({
            title: "غير مصرح",
            description: "ليس لديك صلاحيات للوصول إلى هذه الصفحة",
            variant: "destructive"
          });
          navigate('/');
          return;
        }
      }

      setIsAuthorized(true);
    } catch (error: any) {
      console.error('Auth check error:', error);
      toast({
        title: "خطأ في التحقق",
        description: "حدث خطأ أثناء التحقق من الصلاحيات",
        variant: "destructive"
      });
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="جاري التحقق من الصلاحيات..." />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};