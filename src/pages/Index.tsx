import React from 'react';
import { Navbar } from '@/components/ui/navbar';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { DownloadApp } from '@/components/ui/download-app';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      {/* شريط التنقل */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        username={user?.username || "مستخدم"}
        balance={user?.balance || 0}
        userRole={user?.role || "user"}
      />

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoggedIn ? (
          <>
            {/* بطاقات الإحصائيات */}
            <StatsCards 
              balance={user?.balance || 0}
              wins={0} // سيتم تحديثه لاحقاً
              notifications={3}
            />

            {/* الإجراءات السريعة */}
            <QuickActions />

            {/* زر تحميل التطبيق */}
            <DownloadApp />

            {/* تغذية النشاطات */}
            <ActivityFeed />
          </>
        ) : (
          /* صفحة الترحيب للزوار غير المسجلين */
          <div className="text-center py-20">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                مرحباً بك في العقل المصري
              </h1>
              <p className="text-2xl text-muted-foreground mb-8 leading-relaxed">
                منصة الألعاب الذكية الأولى في مصر
                <br />
                اربح مالاً حقيقياً من خلال ذكائك واستراتيجيتك
              </p>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="p-6 rounded-lg bg-card border border-border/50">
                  <h3 className="text-xl font-bold mb-3 text-primary">ألعاب ذكية</h3>
                  <p className="text-muted-foreground">
                    شطرنج، داما، والعديد من الألعاب التي تعتمد على الذكاء
                  </p>
                </div>
                <div className="p-6 rounded-lg bg-card border border-border/50">
                  <h3 className="text-xl font-bold mb-3 text-success">مكافآت حقيقية</h3>
                  <p className="text-muted-foreground">
                    اربح أموالاً حقيقية بالجنيه المصري من خلال انتصاراتك
                  </p>
                </div>
                <div className="p-6 rounded-lg bg-card border border-border/50">
                  <h3 className="text-xl font-bold mb-3 text-warning">آمن ومضمون</h3>
                  <p className="text-muted-foreground">
                    منصة آمنة مع نظام دفع وسحب موثوق
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
