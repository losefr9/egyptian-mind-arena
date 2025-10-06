import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, TrendingUp, DollarSign } from "lucide-react";

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  has_deposited: boolean;
  first_deposit_at: string | null;
  total_earnings: number;
  created_at: string;
  referrer?: {
    username: string;
  };
  referred?: {
    username: string;
  };
}

export const ReferralsManagement = () => {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);

      // جلب جميع الإحالات
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // جلب أسماء المستخدمين
      if (data && data.length > 0) {
        const referrerIds = [...new Set(data.map(r => r.referrer_id))];
        const referredIds = [...new Set(data.map(r => r.referred_id))];
        const allUserIds = [...new Set([...referrerIds, ...referredIds])];

        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", allUserIds);

        const enhancedData = data.map(r => ({
          ...r,
          referrer: usersData?.find(u => u.id === r.referrer_id),
          referred: usersData?.find(u => u.id === r.referred_id),
        }));

        setReferrals(enhancedData);

        // حساب الإحصائيات
        const total = enhancedData.length;
        const active = enhancedData.filter(r => r.has_deposited).length;
        const totalEarnings = enhancedData.reduce(
          (sum, r) => sum + (Number(r.total_earnings) || 0),
          0
        );

        setStats({ total, active, totalEarnings });
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الإحالات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">إدارة الإحالات</h2>
        <p className="text-muted-foreground">
          متابعة وإدارة نظام الإحالات والأرباح
        </p>
      </div>

      {/* الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإحالات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إحالات نشطة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">قاموا بالإيداع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي أرباح الإحالات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)} ج</div>
          </CardContent>
        </Card>
      </div>

      {/* جدول الإحالات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الإحالات</CardTitle>
          <CardDescription>جميع الإحالات المسجلة في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إحالات بعد</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المُحيل</TableHead>
                    <TableHead>المُحال</TableHead>
                    <TableHead>كود الإحالة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الإيداع الأول</TableHead>
                    <TableHead className="text-right">الأرباح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {referral.referrer?.username || "مستخدم"}
                      </TableCell>
                      <TableCell>
                        {referral.referred?.username || "مستخدم"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {referral.referral_code}
                      </TableCell>
                      <TableCell>
                        {referral.has_deposited ? (
                          <Badge className="bg-green-600">نشط</Badge>
                        ) : (
                          <Badge variant="secondary">في الانتظار</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.first_deposit_at
                          ? new Date(referral.first_deposit_at).toLocaleDateString("ar-EG")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(referral.total_earnings).toFixed(2)} ج
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
