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
  const [timeLeft, setTimeLeft] = useState(20); // تقليل الوقت إلى 20 ثانية
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<string | null>(null);
  const [player1Username, setPlayer1Username] = useState<string>('');
  const [player2Username, setPlayer2Username] = useState<string>('');
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);

  const isMyTurn = currentTurn === user?.id;
  const playerSymbol = gameSession.player1_id === user?.id ? 'X' : 'O';
  const opponentSymbol = playerSymbol === 'X' ? 'O' : 'X';
  const prizeAmount = gameSession.bet_amount * 2;
  const platformFee = prizeAmount * 0.1;
  const winnerEarnings = prizeAmount - platformFee;

  // تحميل أسماء المستخدمين
  useEffect(() => {
    const fetchUsernames = async () => {
      try {
        const { data: player1Data } = await supabase.rpc('get_public_username', { 
          user_id_input: gameSession.player1_id 
        });
        const { data: player2Data } = await supabase.rpc('get_public_username', { 
          user_id_input: gameSession.player2_id 
        });

        if (player1Data && player1Data.length > 0) {
          setPlayer1Username(player1Data[0].username || 'لاعب 1');
        }
        if (player2Data && player2Data.length > 0) {
          setPlayer2Username(player2Data[0].username || 'لاعب 2');
        }
      } catch (error) {
        console.error('Error fetching usernames:', error);
        setPlayer1Username('لاعب 1');
        setPlayer2Username('لاعب 2');
      }
    };

    fetchUsernames();
  }, [gameSession.player1_id, gameSession.player2_id]);

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

  // تحميل سؤال رياضي جديد باستخدام الدالة الآمنة
  const loadNewQuestion = async () => {
    try {
      const { data, error } = await supabase.rpc('get_random_math_question');

      if (error) throw error;

      if (data && data.length > 0) {
        const questionData = data[0];
        setMathQuestion({
          id: questionData.id,
          question: questionData.question,
          answer: 0 // لا نحصل على الإجابة من العميل
        });
        setTimeLeft(20); // تقليل الوقت إلى 20 ثانية
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
    if (selectedCell === null || !mathQuestion) return;

    setWaitingForAnswer(false);

    // التحقق من صحة الإجابة باستخدام الدالة الآمنة للأسئلة المولدة عشوائياً
    try {
      const { data: validationData, error: validationError } = await supabase.rpc('validate_generated_math_answer', {
        question_text: mathQuestion.question,
        user_answer: answer
      });

      if (validationError) throw validationError;

      const actualIsCorrect = validationData?.[0]?.is_correct || false;

      if (actualIsCorrect) {
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
          const winnerId = result === playerSymbol ? user?.id : getOpponentId();
          setWinner(winnerId);
          setShowVictoryAnimation(true);
          await handleGameEnd('win', winnerId);
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
    } catch (error) {
      console.error('Error validating answer:', error);
      toast.error('خطأ في التحقق من الإجابة');
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
          toast.success(`تهانينا! ربحت ${winnerEarnings.toFixed(2)} جنيه`);
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
    <div className="min-h-screen p-2 sm:p-4 space-y-4 sm:space-y-6">
      {/* معلومات اللعبة */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-2 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span>مباراة XO</span>
            </CardTitle>
            <Button variant="outline" onClick={onExit} size="sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              خروج
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-3 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-4 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs sm:text-sm">الجائزة:</span>
              <Badge variant="secondary" className="text-xs sm:text-sm">{prizeAmount.toFixed(2)} جنيه</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm">صافي الربح:</span>
              <Badge variant="golden" className="text-xs sm:text-sm">{winnerEarnings.toFixed(2)} جنيه</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs sm:text-sm">اللاعبون:</span>
              <div className="flex flex-wrap gap-1 items-center">
                <Badge variant={gameSession.player1_id === user?.id ? 'default' : 'secondary'} className="text-xs">
                  {player1Username} (X)
                </Badge>
                <span className="text-muted-foreground text-xs">vs</span>
                <Badge variant={gameSession.player2_id === user?.id ? 'default' : 'secondary'} className="text-xs">
                  {player2Username} (O)
                </Badge>
              </div>
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
                <Badge variant="default" className="text-lg px-6 py-2 animate-pulse">
                  <Clock className="h-4 w-4 ml-2" />
                  🔥 دورك الآن! اختر مربعاً
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-lg px-6 py-2">
                  <Clock className="h-4 w-4 ml-2" />
                  ⏳ دور {currentTurn === gameSession.player1_id ? player1Username : player2Username}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : gameStatus === 'won' ? (
        <Card className={`${showVictoryAnimation ? 'animate-scale-in' : ''} bg-gradient-to-r from-green-50 to-green-100 border-green-200 relative overflow-hidden`}>
          <CardContent className="pt-6 text-center relative">
            {showVictoryAnimation && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`
                    }}
                  >
                    💰
                  </div>
                ))}
              </div>
            )}
            <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold text-green-800 mb-2">
              {winner === user?.id ? '🎉 تهانينا! ربحت المباراة 🎉' : 'انتهت المباراة'}
            </h3>
            <p className="text-green-700 text-lg font-semibold">
              {winner === user?.id 
                ? `ربحت ${winnerEarnings.toFixed(2)} جنيه! 💸` 
                : 'للأسف خسرت المباراة 😔'
              }
            </p>
            {winner === user?.id && (
              <p className="text-green-600 mt-2 animate-fade-in">
                🚀 العب مرة أخرى واربح أكثر!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-yellow-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold text-yellow-800 mb-2">🤝 تعادل!</h3>
            <p className="text-yellow-700">تم إرجاع مبلغ الرهان لكلا اللاعبين 💰</p>
            <p className="text-yellow-600 mt-2">جرب مرة أخرى! 🎮</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* لوحة اللعب */}
        <div className="flex justify-center order-1 lg:order-1">
          <XOBoard
            board={board}
            onCellClick={handleCellClick}
            currentPlayer={playerSymbol}
            disabled={!isMyTurn || waitingForAnswer || gameStatus !== 'playing'}
            playerSymbol={playerSymbol}
          />
        </div>

        {/* السؤال الرياضي */}
        <div className="flex justify-center order-2 lg:order-2">
          {waitingForAnswer && mathQuestion ? (
            <MathQuestion
              question={mathQuestion.question}
              questionId={mathQuestion.id}
              timeLeft={timeLeft}
              onAnswer={handleMathAnswer}
              onTimeUp={handleTimeUp}
            />
          ) : (
              <Card className="w-full max-w-md bg-muted/50">
                <CardContent className="pt-4 sm:pt-6 text-center">
                  <div className="text-muted-foreground text-sm sm:text-base">
                    {isMyTurn && gameStatus === 'playing' 
                      ? '🎯 اختر مربعاً لإظهار السؤال الرياضي' 
                      : gameStatus === 'playing' 
                      ? `⏳ انتظر دور ${currentTurn === gameSession.player1_id ? player1Username : player2Username}...` 
                      : '🎮 انتهت المباراة'
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