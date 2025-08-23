import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Trophy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BETTING_LEVELS = [
  { amount: 10 },
  { amount: 20 },
  { amount: 50 },
  { amount: 100 },
  { amount: 200 },
  { amount: 500 }
];

interface BettingLevelsProps {
  gameName: string;
  gameId: string;
  onLevelSelect: (amount: number) => void;
  onBack: () => void;
}

export const BettingLevels: React.FC<BettingLevelsProps> = ({ 
  gameName, 
  gameId,
  onLevelSelect,
  onBack 
}) => {
  const [waitingPlayers, setWaitingPlayers] = useState<{[key: number]: number}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitingPlayers();
    
    // تحديث البيانات كل 3 ثوان
    const interval = setInterval(fetchWaitingPlayers, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchWaitingPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('bet_amount')
        .eq('game_id', gameId)
        .eq('status', 'waiting')
        .is('player2_id', null);

      if (error) throw error;

      // حساب عدد اللاعبين المنتظرين لكل مستوى
      const playerCounts: {[key: number]: number} = {};
      BETTING_LEVELS.forEach(level => {
        playerCounts[level.amount] = data?.filter(session => session.bet_amount === level.amount).length || 0;
      });

      setWaitingPlayers(playerCounts);
    } catch (error) {
      console.error('Error fetching waiting players:', error);
      // في حالة الخطأ، اعرض صفر لجميع المستويات
      const emptyPlayerCounts: {[key: number]: number} = {};
      BETTING_LEVELS.forEach(level => {
        emptyPlayerCounts[level.amount] = 0;
      });
      setWaitingPlayers(emptyPlayerCounts);
    } finally {
      setLoading(false);
    }
  };

  const getEstimatedWaitTime = (playerCount: number) => {
    if (playerCount === 0) return 'فوري';
    if (playerCount <= 2) return '< دقيقة';
    if (playerCount <= 5) return '1-2 دقيقة';
    return '2-5 دقائق';
  };

  const getStatusColor = (playerCount: number) => {
    if (playerCount === 0) return 'destructive';
    if (playerCount <= 2) return 'secondary';
    return 'default';
  };

  const getStatusText = (playerCount: number) => {
    if (playerCount === 0) return 'لا يوجد لاعبين منتظرين';
    if (playerCount === 1) return 'لاعب واحد منتظر';
    return `${playerCount} لاعبين منتظرين`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 rotate-180 ml-2" />
          العودة
        </Button>
        <h2 className="text-2xl font-bold">{gameName}</h2>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            اختر مستوى الرهان
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            اختر مبلغ الرهان الذي تريد المشاركة به في هذه اللعبة. ستربط تلقائياً مع لاعب آخر في نفس المستوى.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BETTING_LEVELS.map((level) => {
            const playerCount = waitingPlayers[level.amount] || 0;
            const winAmount = (level.amount * 2 * 0.9); // 90% بعد خصم عمولة المنصة
            
            return (
              <Card 
                key={level.amount}
                className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-golden transition-all duration-300 cursor-pointer group relative"
                onClick={() => onLevelSelect(level.amount)}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="text-3xl font-bold text-primary">
                      {level.amount} ريال
                    </div>
                    
                    <div className="space-y-2">
                      <Badge 
                        variant={getStatusColor(playerCount)} 
                        className="flex items-center gap-1 w-fit mx-auto"
                      >
                        <Users className="h-3 w-3" />
                        <span>{getStatusText(playerCount)}</span>
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground">
                        زمن الانتظار المتوقع: {getEstimatedWaitTime(playerCount)}
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="text-sm font-medium">
                        جائزة الفائز: {winAmount.toFixed(2)} ريال
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (بعد خصم 10% عمولة المنصة)
                      </div>
                    </div>
                    
                    <Button 
                      variant="golden" 
                      className="w-full group-hover:shadow-glow"
                      disabled={loading}
                    >
                      {playerCount > 0 ? 'انضم للمطابقة' : 'أنشئ مباراة جديدة'}
                    </Button>
                  </div>
                </CardContent>
                
                {playerCount > 0 && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};