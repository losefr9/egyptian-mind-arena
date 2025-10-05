import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GameTimerProps {
  totalTime: number;
  isActive: boolean;
  onTimeUp?: () => void;
  showProgress?: boolean;
}

export const GameTimer: React.FC<GameTimerProps> = ({
  totalTime,
  isActive,
  onTimeUp,
  showProgress = true
}) => {
  const [timeLeft, setTimeLeft] = useState(totalTime);

  useEffect(() => {
    setTimeLeft(totalTime);
  }, [totalTime]);

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isActive, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (timeLeft / totalTime) * 100;
  const isLow = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <Card className={`
      ${isCritical ? 'border-destructive animate-pulse' : isLow ? 'border-warning' : 'border-border'}
      transition-all duration-300
    `}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${isCritical ? 'text-destructive' : isLow ? 'text-warning' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">الوقت المتبقي</span>
            </div>
            <span className={`
              font-mono font-bold text-lg
              ${isCritical ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'}
            `}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          {showProgress && (
            <Progress 
              value={percentage} 
              className={`h-2 ${isCritical ? 'bg-destructive/20' : isLow ? 'bg-warning/20' : ''}`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};