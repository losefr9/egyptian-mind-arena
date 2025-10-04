import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ChessTimerProps {
  timeInSeconds: number;
  isActive: boolean;
  onTimeUpdate: (newTime: number) => void;
}

export const ChessTimer: React.FC<ChessTimerProps> = ({
  timeInSeconds,
  isActive,
  onTimeUpdate
}) => {
  const [localTime, setLocalTime] = useState(timeInSeconds);

  useEffect(() => {
    setLocalTime(timeInSeconds);
  }, [timeInSeconds]);

  useEffect(() => {
    if (!isActive || localTime <= 0) return;

    const interval = setInterval(() => {
      setLocalTime(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime !== prev) {
          onTimeUpdate(newTime);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, localTime, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = () => {
    if (localTime <= 30) return 'text-destructive';
    if (localTime <= 60) return 'text-orange-500';
    return 'text-foreground';
  };

  return (
    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${getColorClass()}`}>
      <Clock className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
      <span>{formatTime(localTime)}</span>
    </div>
  );
};
