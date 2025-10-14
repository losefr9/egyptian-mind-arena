import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users,
  Trophy,
  BarChart3
} from 'lucide-react';

interface EarningsData {
  daily: number;
  weekly: number;
  monthly: number;
  totalGames: number;
  activeUsers: number;
}

export const PlatformEarnings: React.FC = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData>({
    daily: 0,
    weekly: 0,
    monthly: 0,
    totalGames: 0,
    activeUsers: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEarningsData();
      fetchRecentTransactions();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // الأرباح اليومية
      const { data: dailyData } = await supabase
        .from('platform_earnings')
        .select('earning_amount')
        .eq('earning_date', new Date().toISOString().split('T')[0]);

      // الأرباح الأسبوعية
      const { data: weeklyData } = await supabase
        .from('platform_earnings')
        .select('earning_amount')
        .gte('earning_date', startOfWeek.toISOString().split('T')[0]);

      // الأرباح الشهرية
      const { data: monthlyData } = await supabase
        .from('platform_earnings')
        .select('earning_amount')
        .gte('earning_date', startOfMonth.toISOString().split('T')[0]);

      // إجمالي الألعاب المكتملة
      const { count: gamesCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // عدد المستخدمين النشطين (الذين لعبوا في آخر 30 يوم)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData } = await supabase
        .from('player_match_activities')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueUsers = new Set(activeUsersData?.map(activity => activity.user_id) || []);

      setEarnings({
        daily: dailyData?.reduce((sum, item) => sum + parseFloat(item.earning_amount.toString()), 0) || 0,
        weekly: weeklyData?.reduce((sum, item) => sum + parseFloat(item.earning_amount.toString()), 0) || 0,
        monthly: monthlyData?.reduce((sum, item) => sum + parseFloat(item.earning_amount.toString()), 0) || 0,
        totalGames: gamesCount || 0,
        activeUsers: uniqueUsers.size
      });
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data } = await supabase
        .from('platform_earnings')
        .select(`
          *,
          game_sessions (
            id,
            bet_amount,
            player1_id,
            player2_id,
            winner_id,
            profiles:player1_id (username),
            profiles_player2:player2_id (username)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">الأرباح اليومية</p>
                <p className="text-2xl font-bold text-green-800">
                  {earnings.daily.toFixed(2)} ج.م
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">الأرباح الأسبوعية</p>
                <p className="text-2xl font-bold text-blue-800">
                  {earnings.weekly.toFixed(2)} ج.م
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">الأرباح الشهرية</p>
                <p className="text-2xl font-bold text-purple-800">
                  {earnings.monthly.toFixed(2)} ج.م
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">إجمالي الألعاب</p>
                <p className="text-2xl font-bold text-orange-800">
                  {earnings.totalGames.toLocaleString()}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600">المستخدمون النشطون</p>
                <p className="text-2xl font-bold text-indigo-800">
                  {earnings.activeUsers.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التفاصيل */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">المعاملات الأخيرة</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                المعاملات الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">
                            مباراة #{transaction.game_session_id.slice(-8)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString('ar')}
                          </span>
                        </div>
                        <p className="text-sm">
                          مبلغ الرهان: {transaction.total_bet_amount} ج.م
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          +{parseFloat(transaction.earning_amount).toFixed(2)} ج.م
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.earning_percentage}% عمولة
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد معاملات حتى الآن
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات مفصلة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">معدل الأرباح</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>متوسط الربح اليومي:</span>
                      <span className="font-medium">
                        {(earnings.monthly / 30).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط الربح الأسبوعي:</span>
                      <span className="font-medium">
                        {(earnings.monthly / 4).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">معلومات إضافية</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>متوسط الربح لكل لعبة:</span>
                      <span className="font-medium">
                        {earnings.totalGames > 0 
                          ? (earnings.monthly / earnings.totalGames).toFixed(2) 
                          : '0.00'
                        } ج.م
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط الألعاب يومياً:</span>
                      <span className="font-medium">
                        {(earnings.totalGames / 30).toFixed(1)} لعبة
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};