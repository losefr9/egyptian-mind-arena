import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Swords, Timer, DollarSign } from 'lucide-react';

interface MatchPreparationScreenProps {
  player1Name: string;
  player2Name: string;
  betAmount: number;
  gameName: string;
  onComplete: () => void;
}

export const MatchPreparationScreen: React.FC<MatchPreparationScreenProps> = ({
  player1Name,
  player2Name,
  betAmount,
  gameName,
  onComplete
}) => {
  const [countdown, setCountdown] = useState(6);
  const prizeAmount = (betAmount * 2 * 0.9).toFixed(2);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <Card className="w-full max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl">
        <CardContent className="p-8 space-y-8">
          {/* عنوان */}
          <div className="text-center space-y-2">
            <div className="animate-in fade-in duration-500">
              <Badge variant="golden" className="text-lg px-6 py-2 mb-4">
                <Swords className="h-5 w-5 ml-2" />
                مباراة جديدة
              </Badge>
            </div>
            <h2 className="text-3xl font-bold">{gameName}</h2>
          </div>

          {/* اللاعبون */}
          <div className="flex items-center justify-between gap-4">
            {/* اللاعب الأول */}
            <div className="flex-1 flex flex-col items-center space-y-3 animate-in slide-in-from-left duration-600">
              <Avatar className="h-20 w-20 border-4 border-primary shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {player1Name[0]?.toUpperCase() || 'X'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-bold text-lg">{player1Name}</p>
                <Badge variant="outline" className="mt-1">
                  X
                </Badge>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
              <div className="relative">
                <Swords className="h-12 w-12 text-primary animate-pulse" />
                <div className="absolute -top-2 -right-2">
                  <div className="h-6 w-6 bg-primary rounded-full animate-ping opacity-75" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">VS</p>
            </div>

            {/* اللاعب الثاني */}
            <div className="flex-1 flex flex-col items-center space-y-3 animate-in slide-in-from-right duration-600">
              <Avatar className="h-20 w-20 border-4 border-accent shadow-lg">
                <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
                  {player2Name[0]?.toUpperCase() || 'O'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-bold text-lg">{player2Name}</p>
                <Badge variant="outline" className="mt-1">
                  O
                </Badge>
              </div>
            </div>
          </div>

          {/* معلومات المباراة */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-3 animate-in fade-in duration-700">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">قيمة الرهان:</span>
              </div>
              <Badge variant="default" className="text-lg">
                {betAmount} جنيه
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                <span className="font-semibold">جائزة الفائز:</span>
              </div>
              <Badge variant="golden" className="text-lg">
                {prizeAmount} جنيه
              </Badge>
            </div>
          </div>

          {/* العد التنازلي */}
          <div className="text-center space-y-4 animate-in fade-in duration-800">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Timer className="h-5 w-5" />
              <span>المباراة تبدأ خلال</span>
            </div>
            <div key={countdown} className="text-7xl font-bold text-primary animate-in zoom-in duration-200">
              {countdown}
            </div>
            <p className="text-sm text-muted-foreground">
              تأكد من اتصالك بالإنترنت - جاري تحميل البيانات...
            </p>
          </div>

          {/* شريط التقدم */}
          <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-[6000ms] ease-linear" 
                 style={{ width: `${((6 - countdown) / 6) * 100}%` }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};