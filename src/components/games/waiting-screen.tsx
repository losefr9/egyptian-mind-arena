import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Trophy, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WaitingScreenProps {
  betAmount: number;
  gameName: string;
  gameSessionId?: string;
  onCancel: () => void;
  onMatchFound: (gameSession: any) => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({ 
  betAmount, 
  gameName, 
  gameSessionId,
  onCancel,
  onMatchFound
}) => {
  const { user } = useAuth();
  const [waitTime, setWaitTime] = useState(0);
  const [status, setStatus] = useState<'searching' | 'found' | 'timeout'>('searching');

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gameSessionId || !user) return;

    // إعداد الاشتراك في الوقت الحقيقي
    const channel = supabase
      .channel('game-session-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameSessionId}`
        },
        (payload) => {
          console.log('Game session updated:', payload);
          const updatedSession = payload.new;
          
          if (updatedSession.status === 'in_progress' && updatedSession.player2_id) {
            setStatus('found');
            setTimeout(() => {
              onMatchFound(updatedSession);
            }, 2000);
          }
        }
      )
      .subscribe();

    // فحص حالة الجلسة مرة واحدة عند التحميل
    const checkInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameSessionId)
          .maybeSingle();

        if (error) throw error;

        if (data && data.status === 'in_progress' && data.player2_id) {
          setStatus('found');
          setTimeout(() => {
            onMatchFound(data);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking initial session status:', error);
      }
    };

    checkInitialStatus();
    
    // انتهاء صلاحية البحث بعد 5 دقائق
    const timeoutTimer = setTimeout(() => {
      setStatus('timeout');
    }, 300000); // 5 دقائق

    return () => {
      channel.unsubscribe();
      clearTimeout(timeoutTimer);
    };
  }, [gameSessionId, onMatchFound, user]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelSearch = async () => {
    if (gameSessionId) {
      try {
        // حذف الجلسة وإرجاع الرصيد
        await supabase
          .from('game_sessions')
          .delete()
          .eq('id', gameSessionId);

        // إرجاع الرصيد
        if (user) {
          await supabase
            .from('profiles')
            .update({ balance: user.balance + betAmount })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error canceling search:', error);
      }
    }
    onCancel();
  };

  const getStatusContent = () => {
    switch (status) {
      case 'found':
        return {
          icon: <Trophy className="h-8 w-8 text-green-500" />,
          title: 'تم العثور على خصم!',
          message: 'جاري تحضير المباراة...',
          color: 'from-green-50 to-green-100 border-green-200'
        };
      case 'timeout':
        return {
          icon: <AlertCircle className="h-8 w-8 text-yellow-500" />,
          title: 'انتهت مهلة البحث',
          message: 'لم يتم العثور على خصم. حاول مرة أخرى.',
          color: 'from-yellow-50 to-yellow-100 border-yellow-200'
        };
      default:
        return {
          icon: <Loader2 className="h-8 w-8 text-primary animate-spin" />,
          title: 'البحث عن خصم',
          message: 'جاري البحث عن لاعب في نفس المستوى...',
          color: 'from-primary/10 to-accent/10 border-primary/20'
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className={`w-full max-w-md bg-gradient-to-br ${statusContent.color}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-md">
            {statusContent.icon}
          </div>
          <CardTitle className="text-2xl">{statusContent.title}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-background/60 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-lg font-semibold">{gameName}</div>
              <div className="text-2xl font-bold text-primary">{betAmount} ريال</div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>وقت الانتظار: {formatTime(waitTime)}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span>{statusContent.message}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-warning" />
                <span>جائزة الفائز: {(betAmount * 2 * 0.9).toFixed(2)} ريال</span>
              </div>
            </div>
            
            {status === 'searching' && (
              <div className="bg-background/40 rounded-lg p-3 text-xs text-muted-foreground backdrop-blur-sm">
                سيتم ربطك تلقائياً بلاعب آخر في نفس المستوى. يرجى الانتظار...
              </div>
            )}

            {status === 'timeout' && (
              <div className="bg-background/40 rounded-lg p-3 text-xs text-muted-foreground backdrop-blur-sm">
                تم إرجاع مبلغ الرهان إلى رصيدك. يمكنك المحاولة مرة أخرى.
              </div>
            )}
          </div>
          
          <Button 
            variant={status === 'found' ? 'secondary' : 'outline'}
            className="w-full" 
            onClick={handleCancelSearch}
            disabled={status === 'found'}
          >
            {status === 'found' ? 'جاري التحضير...' : 'إلغاء البحث'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};