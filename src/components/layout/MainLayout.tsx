import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/ui/navbar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, isLoading, isLoggedIn } = useAuth();

  // إزالة شاشة التحميل لتسريع التطبيق - سيظهر الموقع فوراً

  return (
    <div className="min-h-screen" dir="rtl">
      {/* شريط التنقل العلوي دائماً ظاهر */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        username={user?.username || "مستخدم"}
        balance={user?.balance || 0}
        userRole={user?.role || "user"}
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