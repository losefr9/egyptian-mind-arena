import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface ChessTimerProps {
  player1Time: number; // بالثواني
  player2Time: number;
  isPlayer1Turn: boolean;
  isPlayer1: boolean;
  onTimeOut: (player: 'player1' | 'player2') => void;
}

export const ChessTimer: React.FC<ChessTimerProps> = ({
  player1Time,
  player2Time,
  isPlayer1Turn,
  isPlayer1,
  onTimeOut
}) => {
  const [currentPlayer1Time, setCurrentPlayer1Time] = useState(player1Time);
  const [currentPlayer2Time, setCurrentPlayer2Time] = useState(player2Time);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlayer1Turn) {
        setCurrentPlayer1Time((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeOut('player1');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setCurrentPlayer2Time((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeOut('player2');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlayer1Turn, onTimeOut]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (time: number, isTurn: boolean): string => {
    if (!isTurn) return 'text-muted-foreground';
    if (time <= 30) return 'text-destructive animate-pulse';
    if (time <= 60) return 'text-warning';
    return 'text-primary';
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Player 2 Timer (top) */}
      <Card className={`${!isPlayer1Turn ? 'border-primary shadow-golden' : 'border-border'} transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">
                {isPlayer1 ? 'الخصم' : 'أنت'}
              </span>
            </div>
            <div className={`text-3xl font-bold ${getTimerColor(currentPlayer2Time, !isPlayer1Turn)}`}>
              {formatTime(currentPlayer2Time)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player 1 Timer (bottom) */}
      <Card className={`${isPlayer1Turn ? 'border-primary shadow-golden' : 'border-border'} transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">
                {isPlayer1 ? 'أنت' : 'الخصم'}
              </span>
            </div>
            <div className={`text-3xl font-bold ${getTimerColor(currentPlayer1Time, isPlayer1Turn)}`}>
              {formatTime(currentPlayer1Time)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
