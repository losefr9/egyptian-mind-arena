import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Trophy } from 'lucide-react';

const BETTING_LEVELS = [
  { amount: 10, players: 15 },
  { amount: 20, players: 23 },
  { amount: 50, players: 18 },
  { amount: 100, players: 12 },
  { amount: 200, players: 8 },
  { amount: 500, players: 4 }
];

interface BettingLevelsProps {
  gameName: string;
  onLevelSelect: (amount: number) => void;
  onBack: () => void;
}

export const BettingLevels: React.FC<BettingLevelsProps> = ({ 
  gameName, 
  onLevelSelect,
  onBack 
}) => {
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
            اختر مبلغ الرهان الذي تريد المشاركة به في هذه اللعبة
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BETTING_LEVELS.map((level) => (
          <Card 
            key={level.amount}
            className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-golden transition-all duration-300 cursor-pointer group"
            onClick={() => onLevelSelect(level.amount)}
          >
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="text-3xl font-bold text-primary">
                  {level.amount} ج.م
                </div>
                
                <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                  <Users className="h-3 w-3" />
                  <span>{level.players} لاعب نشط</span>
                </Badge>
                
                <div className="text-sm text-muted-foreground">
                  الربح المتوقع: {level.amount * 1.8} ج.م
                </div>
                
                <Button 
                  variant="golden" 
                  className="w-full group-hover:shadow-glow"
                >
                  انضم الآن
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};