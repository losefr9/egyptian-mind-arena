import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GAME_IDS, GAME_NAMES } from '@/constants/games';

interface GameSessionValidatorProps {
  gameSessionId: string;
  currentGameId: string | null;
  onValidated: (gameData: any) => void;
  onError: () => void;
}

export const GameSessionValidator: React.FC<GameSessionValidatorProps> = ({
  gameSessionId,
  currentGameId,
  onValidated,
  onError
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const validateGameSession = async () => {
      try {
        console.log('🔍 [VALIDATOR] التحقق من جلسة اللعبة:', gameSessionId);
        
        // جلب بيانات الجلسة
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameSessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('لم يتم العثور على جلسة اللعبة');

        console.log('📊 [VALIDATOR] بيانات الجلسة:', sessionData);
        console.log('🎮 [VALIDATOR] معرف اللعبة من الجلسة:', sessionData.game_id);
        console.log('🎯 [VALIDATOR] معرف اللعبة الحالي:', currentGameId);
        
        // ✅ CRITICAL: التحقق من تطابق game_id
        if (currentGameId && currentGameId !== sessionData.game_id) {
          console.error('❌ [VALIDATOR] عدم تطابق معرفات الألعاب!');
          console.error('المتوقع:', sessionData.game_id, GAME_NAMES[sessionData.game_id as keyof typeof GAME_IDS]);
          console.error('الحالي:', currentGameId);
          throw new Error('عدم تطابق معرفات الألعاب - جلسة غير صحيحة');
        }

        // جلب بيانات اللعبة الصحيحة
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', sessionData.game_id)
          .single();

        if (gameError) throw gameError;
        if (!gameData) throw new Error('لم يتم العثور على بيانات اللعبة');

        // التحقق من أن اللاعب ينتمي للجلسة
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('المستخدم غير مصرح');
        
        if (sessionData.player1_id !== user.id && sessionData.player2_id !== user.id) {
          console.error('❌ [VALIDATOR] اللاعب غير مخول للجلسة');
          throw new Error('غير مخول للوصول لهذه المباراة');
        }

        // التحقق من حالة الجلسة
        if (sessionData.status === 'completed') {
          console.warn('⚠️ [VALIDATOR] الجلسة مكتملة بالفعل');
          throw new Error('المباراة انتهت بالفعل');
        }

        console.log('✅ [VALIDATOR] تم التحقق بنجاح - اللعبة:', gameData.name);
        console.log('✅ [VALIDATOR] اللاعبون:', sessionData.player1_id, 'vs', sessionData.player2_id);
        console.log('✅ [VALIDATOR] الرهان:', sessionData.bet_amount, 'ج.م');
        
        onValidated(gameData);

      } catch (err: any) {
        console.error('❌ [VALIDATOR] خطأ في التحقق:', err);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 [VALIDATOR] إعادة المحاولة ${retryCount + 1}/${MAX_RETRIES}`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * (retryCount + 1));
        } else {
          setError(err.message || 'فشل التحقق من بيانات اللعبة');
          setTimeout(onError, 3000);
        }
      }
    };

    validateGameSession();
  }, [gameSessionId, retryCount]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="text-lg font-semibold">خطأ في تحميل اللعبة</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">سيتم الرجوع للقائمة الرئيسية...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <h3 className="text-lg font-semibold">جاري التحقق من بيانات المباراة</h3>
          <p className="text-sm text-muted-foreground">يرجى الانتظار...</p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">محاولة {retryCount + 1}/{MAX_RETRIES + 1}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
