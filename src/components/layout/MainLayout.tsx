import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/ui/navbar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, isLoading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // توجيه الأدمن إلى لوحة التحكم مباشرة بعد تسجيل الدخول
  useEffect(() => {
    if (!isLoading && isLoggedIn && user?.role === 'admin') {
      // إذا كان أدمن وليس في صفحة الأدمن، توجيهه إلى لوحة التحكم
      if (!location.pathname.startsWith('/admin')) {
        console.log('Admin user detected, redirecting to admin panel');
        navigate('/admin', { replace: true });
      }
    }
  }, [isLoggedIn, user?.role, isLoading, location.pathname, navigate]);

  // إذا كان أدمن، لا نظهر له الـ layout العادي
  if (isLoggedIn && user?.role === 'admin') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" dir="rtl">
      {/* شريط التنقل العلوي للمستخدمين العاديين فقط */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        username={user?.username || "مستخدم"}
        balance={user?.balance || 0}
        userRole={user?.role}
      />
      
      {/* شريط التنقل السفلي للهواتف */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center p-2 text-xs" onClick={() => window.location.href = '/'}>
            <div className="w-6 h-6 mb-1">🏠</div>
            الرئيسية
          </button>
          <button className="flex flex-col items-center p-2 text-xs" onClick={() => window.location.href = '/games'}>
            <div className="w-6 h-6 mb-1">🎮</div>
            الألعاب
          </button>
          <button className="flex flex-col items-center p-2 text-xs" onClick={() => window.location.href = '/deposit'}>
            <div className="w-6 h-6 mb-1">💰</div>
            إيداع
          </button>
          <button className="flex flex-col items-center p-2 text-xs" onClick={() => window.location.href = '/withdraw'}>
            <div className="w-6 h-6 mb-1">💳</div>
            سحب
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
};