import React, { useState, useEffect } from 'react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { DownloadApp } from '@/components/ui/download-app';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, isLoggedIn } = useAuth();
  const [userStats, setUserStats] = useState({
    wins: 0,
    losses: 0,
    notifications: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchUserStats();
    }
  }, [user?.id]);

  const fetchUserStats = async () => {
    try {
      // جلب إحصائيات المستخدم الحقيقية
      const { data: profile } = await supabase
        .from('profiles')
        .select('wins, losses')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setUserStats({
          wins: profile.wins || 0,
          losses: profile.losses || 0,
          notifications: 0 // سيتم تحديثه لاحقاً عند إضافة نظام الإشعارات
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isLoggedIn ? (
        <>
          {/* بطاقات الإحصائيات */}
          <StatsCards 
            balance={user?.balance || 0}
            wins={userStats.wins}
            notifications={userStats.notifications}
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
              مرحباً بك في EFAR
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
    </div>
  );
};

export default Index;
