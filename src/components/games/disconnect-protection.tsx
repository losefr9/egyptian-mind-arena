import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Wifi, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DisconnectProtectionProps {
  isActive: boolean;
  onTimeout: () => void;
  onReconnect: () => void;
  timeoutSeconds?: number;
}

export const DisconnectProtection: React.FC<DisconnectProtectionProps> = ({
  isActive,
  onTimeout,
  onReconnect,
  timeoutSeconds = 15
}) => {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isActive) {
        onReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isActive, onReconnect]);

  useEffect(() => {
    if (!isActive) {
      setSecondsLeft(timeoutSeconds);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeoutSeconds, onTimeout]);

  if (!isActive) return null;

  const progress = (secondsLeft / timeoutSeconds) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl border-destructive/50 shadow-2xl animate-in zoom-in-95 duration-300">
        <CardContent className="p-8 text-center space-y-6">
          <div className="relative">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
              {isOnline ? (
                <Wifi className="h-10 w-10 text-yellow-500" />
              ) : (
                <WifiOff className="h-10 w-10 text-destructive" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              {isOnline ? 'انقطاع اتصال مؤقت' : 'لا يوجد اتصال بالإنترنت'}
            </h3>
            <p className="text-muted-foreground">
              {isOnline
                ? 'تم فقدان الاتصال بالخادم. يرجى الانتظار...'
                : 'تحقق من اتصالك بالإنترنت'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-6 w-6 text-destructive" />
              <span className="text-4xl font-bold tabular-nums text-destructive">
                {secondsLeft}
              </span>
              <span className="text-muted-foreground">ثانية</span>
            </div>

            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-destructive transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-foreground/90 flex items-center gap-2 justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>إذا لم تعد خلال {secondsLeft} ثانية سيتم احتسابك منسحباً</span>
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              جاري محاولة إعادة الاتصال تلقائياً...
            </p>
          </div>

          {isOnline && (
            <Button
              onClick={onReconnect}
              variant="outline"
              className="w-full"
            >
              محاولة الاتصال يدوياً
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
