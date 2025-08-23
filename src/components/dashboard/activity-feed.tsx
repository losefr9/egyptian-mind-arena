import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Wallet, 
  CreditCard, 
  Gamepad2, 
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  type: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'game';
  description: string;
  amount?: number;
  timestamp: string;
  game?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserActivities();
  }, []);

  const fetchUserActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserActivities([]);
        setLoading(false);
        return;
      }

      // جلب نشاطات اللعب من جلسات الألعاب
      const { data: gameSessions } = await supabase
        .from('game_sessions')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      // جلب طلبات الإيداع المؤكدة
      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);

      // جلب طلبات السحب المؤكدة
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: Activity[] = [];

      // إضافة أنشطة الألعاب
      if (gameSessions) {
        gameSessions.forEach(session => {
          if (session.status === 'completed' && session.winner_id) {
            const isWinner = session.winner_id === user.id;
            activities.push({
              id: session.id,
              type: isWinner ? 'win' : 'loss',
              description: isWinner ? 'فوز في اللعبة' : 'خسارة في اللعبة',
              amount: session.bet_amount,
              timestamp: new Date(session.completed_at || session.created_at).toLocaleString('ar-EG'),
              game: 'لعبة ذكية'
            });
          }
        });
      }

      // إضافة أنشطة الإيداع
      if (deposits) {
        deposits.forEach(deposit => {
          activities.push({
            id: deposit.id,
            type: 'deposit',
            description: 'إيداع في الحساب',
            amount: deposit.amount,
            timestamp: new Date(deposit.created_at).toLocaleString('ar-EG')
          });
        });
      }

      // إضافة أنشطة السحب
      if (withdrawals) {
        withdrawals.forEach(withdrawal => {
          activities.push({
            id: withdrawal.id,
            type: 'withdrawal',
            description: 'سحب من الحساب',
            amount: withdrawal.amount,
            timestamp: new Date(withdrawal.created_at).toLocaleString('ar-EG')
          });
        });
      }

      // ترتيب الأنشطة حسب التاريخ
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setUserActivities(activities.slice(0, 6)); // أحدث 6 أنشطة
    } catch (error) {
      console.error('Error fetching activities:', error);
      setUserActivities([]);
    }
    setLoading(false);
  };

  const displayActivities = activities || userActivities;
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'win':
        return <Trophy className="h-4 w-4 text-success" />;
      case 'loss':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'deposit':
        return <Wallet className="h-4 w-4 text-primary" />;
      case 'withdrawal':
        return <CreditCard className="h-4 w-4 text-warning" />;
      case 'game':
        return <Gamepad2 className="h-4 w-4 text-accent" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'win':
        return <Badge variant="success">فوز</Badge>;
      case 'loss':
        return <Badge variant="destructive">خسارة</Badge>;
      case 'deposit':
        return <Badge variant="golden">إيداع</Badge>;
      case 'withdrawal':
        return <Badge variant="outline">سحب</Badge>;
      case 'game':
        return <Badge variant="secondary">لعبة</Badge>;
      default:
        return <Badge variant="outline">نشاط</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5 text-primary" />
          نشاطات الحساب
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد أنشطة حتى الآن
          </div>
        ) : (
          <div className="space-y-4">
            {displayActivities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-card">
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getActivityBadge(activity.type)}
                    {activity.game && (
                      <Badge variant="outline" className="text-xs">
                        {activity.game}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-left">
                {activity.amount && (
                  <p className={`font-bold text-sm ${
                    activity.type === 'win' || activity.type === 'deposit' 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {activity.type === 'win' || activity.type === 'deposit' ? '+' : '-'}
                    {activity.amount.toFixed(2)} ج.م
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};