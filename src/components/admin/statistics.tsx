import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, DollarSign, Activity, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  totalUsers: number;
  totalEarnings: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  successRate: number;
  avgTransactionValue: number;
}

interface GameStats {
  name: string;
  matches: number;
  earnings: number;
}

export const Statistics = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEarnings: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    successRate: 0,
    avgTransactionValue: 0,
  });
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // إحصائيات المستخدمين
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // إحصائيات الأرباح
      const { data: earnings } = await supabase
        .from('platform_earnings')
        .select('earning_amount');
      const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.earning_amount), 0) || 0;

      // طلبات الإيداع المعلقة
      const { count: pendingDeposits } = await supabase
        .from('deposit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // طلبات السحب المعلقة
      const { count: pendingWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // معدل النجاح
      const { count: totalRequests } = await supabase
        .from('deposit_requests')
        .select('*', { count: 'exact', head: true });
      const { count: approvedRequests } = await supabase
        .from('deposit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      const successRate = totalRequests ? ((approvedRequests || 0) / totalRequests) * 100 : 0;

      // متوسط قيمة المعاملة
      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('amount');
      const avgTransactionValue = deposits?.length 
        ? deposits.reduce((sum, d) => sum + Number(d.amount), 0) / deposits.length 
        : 0;

      // إحصائيات الألعاب
      const { data: games } = await supabase
        .from('games')
        .select('id, name');
      
      const gameStatsData: GameStats[] = [];
      for (const game of games || []) {
        const { count: matches } = await supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', game.id);

        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('platform_earnings')
          .eq('game_id', game.id);
        const earnings = sessions?.reduce((sum, s) => sum + Number(s.platform_earnings), 0) || 0;

        gameStatsData.push({
          name: game.name,
          matches: matches || 0,
          earnings,
        });
      }

      // بيانات الأرباح الشهرية (آخر 6 أشهر)
      const earningsMonthly = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('ar-EG', { month: 'short' });
        
        const { data: monthEarnings } = await supabase
          .from('platform_earnings')
          .select('earning_amount')
          .gte('earning_date', new Date(date.getFullYear(), date.getMonth(), 1).toISOString())
          .lt('earning_date', new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString());
        
        const total = monthEarnings?.reduce((sum, e) => sum + Number(e.earning_amount), 0) || 0;
        earningsMonthly.push({ month: monthName, earnings: total });
      }

      setStats({
        totalUsers: totalUsers || 0,
        totalEarnings,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        successRate,
        avgTransactionValue,
      });
      setGameStats(gameStatsData);
      setEarningsData(earningsMonthly);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* مؤشرات الأداء الرئيسية */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">مستخدم نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)} جنيه</div>
            <p className="text-xs text-muted-foreground">أرباح المنصة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeposits + stats.pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingDeposits} إيداع، {stats.pendingWithdrawals} سحب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">نسبة الموافقة على الطلبات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط المعاملة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTransactionValue.toFixed(2)} جنيه</div>
            <p className="text-xs text-muted-foreground">متوسط قيمة الإيداع</p>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* رسم بياني للأرباح الشهرية */}
        <Card>
          <CardHeader>
            <CardTitle>الأرباح الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" name="الأرباح" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* رسم دائري لتوزيع الألعاب */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع المباريات حسب اللعبة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gameStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.matches}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="matches"
                >
                  {gameStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* جدول أداء الألعاب */}
      <Card>
        <CardHeader>
          <CardTitle>أداء الألعاب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th className="px-6 py-3">اللعبة</th>
                  <th className="px-6 py-3">عدد المباريات</th>
                  <th className="px-6 py-3">الأرباح</th>
                  <th className="px-6 py-3">متوسط الربح</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((game, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{game.name}</td>
                    <td className="px-6 py-4">{game.matches}</td>
                    <td className="px-6 py-4">{game.earnings.toFixed(2)} جنيه</td>
                    <td className="px-6 py-4">
                      {game.matches > 0 ? (game.earnings / game.matches).toFixed(2) : 0} جنيه
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};