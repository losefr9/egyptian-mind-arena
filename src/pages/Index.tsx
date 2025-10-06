import React, { useState, useEffect } from 'react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { DownloadApp } from '@/components/ui/download-app';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Gift } from 'lucide-react';
import { toast } from 'sonner';

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
      // جلب اإحصائيات المستخدم الحقيقية
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

  const [referralData, setReferralData] = useState<{
    code: string;
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
  } | null>(null);

  useEffect(() => {
    if (user?.id && isLoggedIn) {
      fetchReferralData();
    }
  }, [user?.id, isLoggedIn]);

  const fetchReferralData = async () => {
    try {
      // جلب كود الإحالة
      const { data: profileData } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user?.id)
        .single();

      // جلب الإحالات
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("id, has_deposited, total_earnings")
        .eq("referrer_id", user?.id);

      if (profileData && referralsData) {
        const totalReferrals = referralsData.length;
        const activeReferrals = referralsData.filter((r) => r.has_deposited).length;
        const totalEarnings = referralsData.reduce(
          (sum, r) => sum + (Number(r.total_earnings) || 0),
          0
        );

        setReferralData({
          code: profileData.referral_code,
          totalReferrals,
          activeReferrals,
          totalEarnings,
        });
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ بنجاح!");
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

          {/* نظام الإحالة */}
          {referralData && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    نظام الإحالة - احصل على 10% من أرباح المنصة
                  </CardTitle>
                  <CardDescription>
                    شارك رابطك مع أصدقائك واربح من كل لعبة يلعبونها
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* إحصائيات سريعة */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {referralData.totalReferrals}
                      </div>
                      <div className="text-xs text-muted-foreground">إجمالي الإحالات</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-success">
                        {referralData.activeReferrals}
                      </div>
                      <div className="text-xs text-muted-foreground">نشط</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-warning">
                        {referralData.totalEarnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">أرباحك (جنيه)</div>
                    </div>
                  </div>

                  {/* كود ورابط الإحالة */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">كود الإحالة الخاص بك</label>
                    <div className="flex gap-2">
                      <Input 
                        value={referralData.code} 
                        readOnly 
                        className="font-mono text-lg font-bold"
                      />
                      <Button
                        onClick={() => copyToClipboard(referralData.code)}
                        variant="outline"
                        size="icon"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">رابط الإحالة</label>
                    <div className="flex gap-2">
                      <Input 
                        value={`${window.location.origin}/signup?ref=${referralData.code}`}
                        readOnly 
                        className="text-sm"
                      />
                      <Button
                        onClick={() => copyToClipboard(`${window.location.origin}/signup?ref=${referralData.code}`)}
                        variant="outline"
                        size="icon"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* زر عرض التفاصيل */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/referral'}
                  >
                    عرض تفاصيل الإحالات
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

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
