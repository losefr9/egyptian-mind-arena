import React from 'react';
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

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'win',
    description: 'فوز في لعبة الشطرنج',
    amount: 150.00,
    timestamp: '2024-01-15 14:30',
    game: 'الشطرنج'
  },
  {
    id: '2',
    type: 'deposit',
    description: 'إيداع في الحساب',
    amount: 500.00,
    timestamp: '2024-01-15 12:15'
  },
  {
    id: '3',
    type: 'loss',
    description: 'خسارة في لعبة الداما',
    amount: 75.00,
    timestamp: '2024-01-15 11:45',
    game: 'الداما'
  },
  {
    id: '4',
    type: 'win',
    description: 'فوز في لعبة الذكاء السريع',
    amount: 200.00,
    timestamp: '2024-01-15 10:20',
    game: 'الذكاء السريع'
  },
  {
    id: '5',
    type: 'withdrawal',
    description: 'سحب من الحساب',
    amount: 300.00,
    timestamp: '2024-01-14 18:30'
  },
  {
    id: '6',
    type: 'game',
    description: 'انضمام إلى لعبة جديدة',
    timestamp: '2024-01-14 16:45',
    game: 'بلوت الذكي'
  }
];

export const ActivityFeed = ({ activities = mockActivities }: ActivityFeedProps) => {
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
        <div className="space-y-4">
          {activities.map((activity) => (
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
      </CardContent>
    </Card>
  );
};