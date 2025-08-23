import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XOBoard } from './xo-board';
import { MathQuestion } from './math-question';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Trophy, Users, DollarSign, Clock, ArrowLeft } from 'lucide-react';

interface XOGameArenaProps {
  gameSession: any;
  onExit: () => void;
}

interface MathQuestion {
  id: string;
  question: string;
  answer: number;
}

export const XOGameArena: React.FC<XOGameArenaProps> = ({ gameSession, onExit }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [currentTurn, setCurrentTurn] = useState<string>(gameSession.player1_id);
  const [mathQuestion, setMathQuestion] = useState<MathQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<string | null>(null);

  const isMyTurn = currentTurn === user?.id;
  const playerSymbol = gameSession.player1_id === user?.id ? 'X' : 'O';
  const opponentSymbol = playerSymbol === 'X' ? 'O' : 'X';
  const prizeAmount = gameSession.bet_amount * 2;
  const platformFee = prizeAmount * 0.1;
  const winnerEarnings = prizeAmount - platformFee;

  // التحقق من الفوز
  const checkWinner = (board: string[]) => {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
      [0, 4, 8], [2, 4, 6] // قطران
    ];

    for (const combo of winningCombinations) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    return board.every(cell => cell !== '') ? 'draw' : null;
  };

  // تحميل سؤال رياضي جديد
  const loadNewQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('math_questions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomQuestion = data[Math.floor(Math.random() * data.length)];
        setMathQuestion(randomQuestion);
        setTimeLeft(30);
        setWaitingForAnswer(true);
      }
    } catch (error) {
      console.error('Error loading question:', error);
      toast.error('خطأ في تحميل السؤال');
    }
  };

  // معالجة النقر على الخلية
  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] || gameStatus !== 'playing') return;
    
    setSelectedCell(index);
    loadNewQuestion();
  };

  // معالجة الإجابة على السؤال
  const handleMathAnswer = async (answer: number, isCorrect: boolean) => {
    if (selectedCell === null) return;

    setWaitingForAnswer(false);

    if (isCorrect) {
      // وضع العلامة على اللوحة
      const newBoard = [...board];
      newBoard[selectedCell] = playerSymbol;
      setBoard(newBoard);

      // التحقق من الفوز
      const result = checkWinner(newBoard);
      if (result) {
        if (result === 'draw') {
          setGameStatus('draw');
          await handleGameEnd('draw');
        } else {
          setGameStatus('won');
          setWinner(result === playerSymbol ? user?.id : getOpponentId());
          await handleGameEnd('win', result === playerSymbol ? user?.id : getOpponentId());
        }
      } else {
        // تغيير الدور
        setCurrentTurn(currentTurn === gameSession.player1_id ? gameSession.player2_id : gameSession.player1_id);
      }

      // تسجيل النشاط
      await logActivity('move_made', {
        cell: selectedCell,
        symbol: playerSymbol,
        question: mathQuestion?.question,
        answer: answer,
        board: newBoard
      });
    } else {
      toast.error('إجابة خاطئة! تم تجديد السؤال');
    }

    setSelectedCell(null);
    setMathQuestion(null);
  };

  // معالجة انتهاء الوقت
  const handleTimeUp = () => {
    setWaitingForAnswer(false);
    setSelectedCell(null);
    setMathQuestion(null);
    toast.warning('انتهى الوقت! تم تجديد السؤال');
  };

  // الحصول على معرف الخصم
  const getOpponentId = () => {
    return gameSession.player1_id === user?.id ? gameSession.player2_id : gameSession.player1_id;
  };

  // معالجة انتهاء اللعبة
  const handleGameEnd = async (result: 'win' | 'draw', winnerId?: string) => {
    try {
      if (result === 'draw') {
        await supabase.rpc('handle_draw_match', { session_id: gameSession.id });
        toast.info('تعادل! تم إرجاع مبلغ الرهان');
      } else if (winnerId) {
        await supabase.rpc('calculate_match_earnings', { 
          session_id: gameSession.id, 
          winner_user_id: winnerId 
        });
        
        const isWinner = winnerId === user?.id;
        if (isWinner) {
          toast.success(`تهانينا! ربحت ${winnerEarnings.toFixed(2)} ريال`);
        } else {
          toast.error('للأسف خسرت المباراة');
        }
      }
    } catch (error) {
      console.error('Error handling game end:', error);
      toast.error('خطأ في معالجة نتيجة المباراة');
    }
  };

  // تسجيل النشاط
  const logActivity = async (activityType: string, details: any) => {
    try {
      await supabase
        .from('player_match_activities')
        .insert({
          user_id: user?.id,
          game_session_id: gameSession.id,
          activity_type: activityType,
          activity_details: details
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // مؤقت العد التنازلي
  useEffect(() => {
    if (waitingForAnswer && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [waitingForAnswer, timeLeft]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* معلومات اللعبة */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span>مباراة XO</span>
            </CardTitle>
            <Button variant="outline" onClick={onExit}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              خروج
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm">الجائزة الكلية:</span>
              <Badge variant="secondary">{prizeAmount.toFixed(2)} ريال</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm">صافي الربح:</span>
              <Badge variant="golden">{winnerEarnings.toFixed(2)} ريال</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm">أنت:</span>
              <Badge variant={playerSymbol === 'X' ? 'destructive' : 'default'}>
                {playerSymbol}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حالة اللعبة */}
      {gameStatus === 'playing' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              {isMyTurn ? (
                <Badge variant="default" className="text-lg px-6 py-2">
                  <Clock className="h-4 w-4 ml-2" />
                  دورك الآن
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-lg px-6 py-2">
                  <Clock className="h-4 w-4 ml-2" />
                  دور الخصم
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : gameStatus === 'won' ? (
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-800 mb-2">
              {winner === user?.id ? 'تهانينا! ربحت المباراة' : 'انتهت المباراة'}
            </h3>
            <p className="text-green-700">
              {winner === user?.id 
                ? `ربحت ${winnerEarnings.toFixed(2)} ريال` 
                : 'للأسف خسرت المباراة'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-yellow-800 mb-2">تعادل!</h3>
            <p className="text-yellow-700">تم إرجاع مبلغ الرهان لكلا اللاعبين</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* لوحة اللعب */}
        <div className="flex justify-center">
          <XOBoard
            board={board}
            onCellClick={handleCellClick}
            currentPlayer={playerSymbol}
            disabled={!isMyTurn || waitingForAnswer || gameStatus !== 'playing'}
            playerSymbol={playerSymbol}
          />
        </div>

        {/* السؤال الرياضي */}
        <div className="flex justify-center">
          {waitingForAnswer && mathQuestion ? (
            <MathQuestion
              question={mathQuestion.question}
              correctAnswer={mathQuestion.answer}
              timeLeft={timeLeft}
              onAnswer={handleMathAnswer}
              onTimeUp={handleTimeUp}
            />
          ) : (
            <Card className="w-full max-w-md bg-muted/50">
              <CardContent className="pt-6 text-center">
                <div className="text-muted-foreground">
                  {isMyTurn && gameStatus === 'playing' 
                    ? 'اختر مربعاً لإظهار السؤال الرياضي' 
                    : gameStatus === 'playing' 
                    ? 'انتظر دور الخصم...' 
                    : 'انتهت المباراة'
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};