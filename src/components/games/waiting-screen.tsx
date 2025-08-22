import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Trophy, Clock } from 'lucide-react';

interface WaitingScreenProps {
  betAmount: number;
  gameName: string;
  onCancel: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({ 
  betAmount, 
  gameName, 
  onCancel 
}) => {
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl">البحث عن خصم</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
              <div className="text-lg font-semibold">{gameName}</div>
              <div className="text-2xl font-bold text-primary">{betAmount} ج.م</div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>وقت الانتظار: {formatTime(waitTime)}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span>جاري البحث عن لاعب في نفس المستوى...</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-warning" />
                <span>الجائزة المتوقعة: {betAmount * 1.8} ج.م</span>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              سيتم ربطك تلقائياً بلاعب آخر في نفس المستوى. يرجى الانتظار...
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onCancel}
          >
            إلغاء البحث
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};