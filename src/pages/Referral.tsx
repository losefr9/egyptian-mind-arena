import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Users, TrendingUp, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  pending_earnings: number;
}

interface Referral {
  id: string;
  referred_id: string;
  referral_code: string;
  has_deposited: boolean;
  first_deposit_at: string | null;
  total_earnings: number;
  created_at: string;
  profiles?: {
    username: string;
  };
}

export default function Referral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      // جلب كود الإحالة الخاص بالمستخدم
      const { data: profileData } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user?.id)
        .single();

      if (profileData) {
        setReferralCode(profileData.referral_code);
      }

      // جلب الإحالات
      const { data: referralsData } = await supabase
        .from("referrals")
        .select(`
          id,
          referred_id,
          referral_code,
          has_deposited,
          first_deposit_at,
          total_earnings,
          created_at
        `)
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });
      
      // جلب أسماء المستخدمين بشكل منفصل
      let enhancedReferrals: Referral[] = [];
      if (referralsData && referralsData.length > 0) {
        const userIds = referralsData.map(r => r.referred_id);
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);
        
        enhancedReferrals = referralsData.map(r => ({
          ...r,
          profiles: usersData?.find(u => u.id === r.referred_id) || { username: "مستخدم" }
        }));
      }

      if (enhancedReferrals) {
        setReferrals(enhancedReferrals);

        // حساب الإحصائيات
        const totalReferrals = enhancedReferrals.length;
        const activeReferrals = enhancedReferrals.filter((r) => r.has_deposited).length;
        const totalEarnings = enhancedReferrals.reduce(
          (sum, r) => sum + (Number(r.total_earnings) || 0),
          0
        );

        setStats({
          total_referrals: totalReferrals,
          active_referrals: activeReferrals,
          total_earnings: totalEarnings,
          pending_earnings: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الإحالة");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ بنجاح!");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">نظام الإحالة</h1>
        <p className="text-muted-foreground">
          احصل على 10% من أرباح المنصة من المستخدمين الذين قاموا بالتسجيل عبر رابطك
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإحالات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_referrals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إحالات نشطة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">قاموا بالإيداع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_earnings.toFixed(2) || "0.00"} جنيه
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الربح</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">10%</div>
            <p className="text-xs text-muted-foreground">من أرباح المنصة</p>
          </CardContent>
        </Card>
      </div>

      {/* رابط الإحالة */}
      <Card>
        <CardHeader>
          <CardTitle>رابط الإحالة الخاص بك</CardTitle>
          <CardDescription>
            شارك هذا الرابط مع أصدقائك للحصول على أرباح من كل عملية لعب يقومون بها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralCode} readOnly className="font-mono" />
            <Button
              onClick={() => copyToClipboard(referralCode)}
              variant="outline"
              size="icon"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="text-sm" />
            <Button
              onClick={() => copyToClipboard(referralLink)}
              variant="outline"
              size="icon"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">كيف يعمل نظام الإحالة؟</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>شارك رابط الإحالة مع أصدقائك</li>
              <li>عندما يسجلون ويودعون لأول مرة، يصبحون إحالة نشطة</li>
              <li>تحصل على 10% من أرباح المنصة (1% من إجمالي الرهانات) من كل لعبة يلعبونها</li>
              <li>الأرباح تضاف تلقائياً إلى رصيدك</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الإحالات */}
      <Card>
        <CardHeader>
          <CardTitle>إحالاتك ({referrals.length})</CardTitle>
          <CardDescription>قائمة بجميع المستخدمين الذين قاموا بالتسجيل عبر رابطك</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إحالات بعد</p>
              <p className="text-sm">شارك رابط الإحالة الخاص بك لتبدأ في الربح</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {referral.profiles?.username || "مستخدم"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-medium">
                      {Number(referral.total_earnings).toFixed(2)} جنيه
                    </div>
                    <div className="text-xs">
                      {referral.has_deposited ? (
                        <span className="text-green-600">✓ نشط</span>
                      ) : (
                        <span className="text-yellow-600">⏳ في الانتظار</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
