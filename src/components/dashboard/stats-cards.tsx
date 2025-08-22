import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Trophy, Crown, Bell } from 'lucide-react';

interface StatsCardsProps {
  balance: number;
  wins: number;
  notifications: number;
}

export const StatsCards = ({ balance = 1250.50, wins = 47, notifications = 3 }: StatsCardsProps) => {
  const getPlayerRank = (wins: number) => {
    if (wins < 10) return { rank: 'مبتدئ', color: 'secondary' };
    if (wins < 30) return { rank: 'متمكن', color: 'warning' };
    if (wins < 70) return { rank: 'متقدم', color: 'success' };
    return { rank: 'مخضرم', color: 'golden' };
  };

  const playerRank = getPlayerRank(wins);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* الرصيد الحالي */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-golden transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-primary">{balance.toFixed(2)} ج.م</p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* عدد الانتصارات */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-card transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">الانتصارات</p>
              <p className="text-2xl font-bold text-success">{wins}</p>
            </div>
            <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* لقب اللاعب */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-card transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">اللقب</p>
              <Badge variant={playerRank.color as any} className="text-sm font-semibold">
                {playerRank.rank}
              </Badge>
            </div>
            <div className="h-12 w-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Crown className="h-6 w-6 text-warning" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإشعارات */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-card transition-all duration-300 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">الإشعارات</p>
              <p className="text-2xl font-bold text-foreground">{notifications}</p>
            </div>
            <div className="relative h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Bell className="h-6 w-6 text-accent" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};