import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XOBoard } from './xo-board';
import { MathQuestion } from './math-question';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Trophy, Users, DollarSign, Clock, ArrowLeft, Zap, Timer } from 'lucide-react';

interface XORaceArenaProps {
  gameSession: any;
  onExit: () => void;
}

interface MathQuestion {
  id: string;
  question: string;
  answer: number;
}

export const XORaceArena: React.FC<XORaceArenaProps> = ({ gameSession, onExit }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [mathQuestion, setMathQuestion] = useState<MathQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<string | null>(null);
  const [player1Username, setPlayer1Username] = useState<string>('');
  const [player2Username, setPlayer2Username] = useState<string>('');
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [raceMode, setRaceMode] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const playerSymbol = gameSession.player1_id === user?.id ? 'X' : 'O';
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

  const checkWinnerFromBoard = useCallback((newBoard: string[]) => {
    const result = checkWinner(newBoard);
    if (result && gameStatus === 'playing') {
      if (result === 'draw') {
        setGameStatus('draw');
        handleGameEnd('draw');
      } else {
        setGameStatus('won');
        const winnerId = result === 'X' ? gameSession.player1_id : gameSession.player2_id;
        setWinner(winnerId);
        setShowVictoryAnimation(true);
        handleGameEnd('win', winnerId);
      }
    }
  }, [gameStatus, gameSession.player1_id, gameSession.player2_id]);

  // تحميل اللوحة الحالية عند البداية
  useEffect(() => {
    const loadCurrentBoard = async () => {
      try {
        const { data, error } = await supabase
          .from('xo_matches')
          .select('board_state')
          .eq('game_session_id', gameSession.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading board state:', error);
          return;
        }
        
        if (data?.board_state && Array.isArray(data.board_state)) {
          console.log('Board loaded from database:', data.board_state);
          setBoard(data.board_state as string[]);
        } else {
          // إنشاء لوحة جديدة إذا لم تكن موجودة
          console.log('Creating new board for session:', gameSession.id);
          try {
            await supabase.rpc('create_new_xo_match', {
              session_id: gameSession.id
            });
            setBoard(Array(9).fill(''));
            console.log('New match created successfully');
          } catch (createError) {
            console.error('Error creating new match:', createError);
            setBoard(Array(9).fill(''));
          }
        }
      } catch (error) {
        console.error('Error in loadCurrentBoard:', error);
        setBoard(Array(9).fill(''));
      }
    };

    loadCurrentBoard();
  }, [gameSession.id]);

  // Real-time updates للوحة مع تحسينات للتحديث الفوري
  useEffect(() => {
    console.log('Setting up real-time subscription for game session:', gameSession.id);
    
    const channel = supabase
      .channel(`xo-race-${gameSession.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'xo_matches',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        (payload) => {
          console.log('Real-time board update received:', payload);
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (newData.board_state) {
            let boardState: string[];
            
            // التعامل مع board_state سواء كان string أو array
            if (Array.isArray(newData.board_state)) {
              boardState = newData.board_state;
            } else if (typeof newData.board_state === 'string') {
              try {
                boardState = JSON.parse(newData.board_state);
              } catch {
                boardState = newData.board_state;
              }
            } else {
              boardState = newData.board_state;
            }
            
            console.log('Updating board from real-time:', oldData?.board_state, 'to:', boardState);
            
            // التحديث الفوري مع المحافظة على العلامات الموجودة
            setBoard(prevBoard => {
              // التأكد من أن الحالة الجديدة مختلفة
              if (JSON.stringify(prevBoard) !== JSON.stringify(boardState)) {
                return boardState;
              }
              return prevBoard;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xo_matches',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        (payload) => {
          console.log('New match created via real-time:', payload);
          const newData = payload.new as any;
          if (newData.board_state && Array.isArray(newData.board_state)) {
            console.log('Setting initial board state:', newData.board_state);
            setBoard(newData.board_state as string[]);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for game:', gameSession.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error for game:', gameSession.id);
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [gameSession.id, user?.id]);

  // فحص الفائز عند تغيير اللوحة
  useEffect(() => {
    if (board.some(cell => cell !== '')) {
      checkWinnerFromBoard(board);
    }
  }, [board, checkWinnerFromBoard]);

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

        setPlayer1Username(player1Data?.[0]?.username || 'لاعب 1');
        setPlayer2Username(player2Data?.[0]?.username || 'لاعب 2');
      } catch (error) {
        console.error('Error fetching usernames:', error);
        setPlayer1Username('لاعب 1');
        setPlayer2Username('لاعب 2');
      }
    };

    fetchUsernames();
  }, [gameSession.player1_id, gameSession.player2_id]);

  // تحميل سؤال جديد لجميع اللاعبين
  const loadNewQuestion = async () => {
    try {
      const { data, error } = await supabase.rpc('get_random_math_question');

      if (error) throw error;

      if (data && data.length > 0) {
        const questionData = data[0];
        setMathQuestion({
          id: questionData.id,
          question: questionData.question,
          answer: 0
        });
        setTimeLeft(15);
        setShowQuestion(true);
        setRaceMode(true);
        setQuestionStartTime(Date.now());
      }
    } catch (error) {
      console.error('Error loading question:', error);
      toast.error('خطأ في تحميل السؤال');
    }
  };

  // معالجة النقر على الخلية - بداية السباق
  const handleCellClick = (index: number) => {
    if (board[index] || gameStatus !== 'playing') return;
    
    setSelectedCell(index);
    loadNewQuestion();
  };

  // معالجة الإجابة على السؤال - سباق السرعة
  const handleMathAnswer = async (answer: number, isCorrect: boolean) => {
    if (selectedCell === null || !mathQuestion || !raceMode) return;

    const responseTime = Date.now() - questionStartTime;
    
    try {
      const { data: validationData, error: validationError } = await supabase.rpc('validate_generated_math_answer', {
        question_text: mathQuestion.question,
        user_answer: answer
      });

      if (validationError) throw validationError;

      const actualIsCorrect = validationData?.[0]?.is_correct || false;

      if (actualIsCorrect) {
        // تحضير اللوحة الجديدة
        const newBoard = [...board];
        newBoard[selectedCell] = playerSymbol;
        
        console.log('Player answered correctly, updating board:', {
          from: board,
          to: newBoard,
          cell: selectedCell,
          symbol: playerSymbol,
          sessionId: gameSession.id
        });
        
        try {
          // تحديث قاعدة البيانات أولاً - تحويل المصفوفة إلى JSON أولاً
          const { data: updateResult, error: updateError } = await supabase.rpc('update_xo_board', {
            p_game_session_id: gameSession.id,
            p_new_board: JSON.stringify(newBoard), // تحويل إلى JSON string ليتم التعامل معه كـ jsonb
            p_player_id: user?.id
          });

          console.log('Database update result:', { updateResult, updateError });

          if (updateError) {
            console.error('Error updating board:', updateError);
            toast.error('خطأ في تحديث اللوحة');
            return;
          }

          const result = updateResult as any;
          if (result?.success) {
            console.log('Board updated successfully in database');
            
            // تحديث الحالة المحلية بعد نجاح قاعدة البيانات
            setBoard(newBoard);
            
            // تسجيل النشاط
            try {
              await logActivity('race_move_made', {
                cell: selectedCell,
                symbol: playerSymbol,
                question: mathQuestion?.question,
                answer: answer,
                response_time: responseTime,
                board: newBoard
              });
            } catch (logError) {
              console.error('Error logging activity:', logError);
            }

            toast.success(`🎯 إجابة صحيحة! وقت الاستجابة: ${responseTime}ms`);
          } else {
            console.error('Database update failed:', updateResult);
            toast.error('فشل في تحديث اللوحة');
          }
        } catch (dbError) {
          console.error('Error in database update:', dbError);
          toast.error('خطأ في تحديث اللوحة');
        }
      } else {
        toast.error('💫 إجابة خاطئة! حاول مرة أخرى');
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      toast.error('خطأ في التحقق من الإجابة');
    }

    // إنهاء السباق
    setSelectedCell(null);
    setMathQuestion(null);
    setShowQuestion(false);
    setRaceMode(false);
  };

  // معالجة انتهاء الوقت
  const handleTimeUp = () => {
    setSelectedCell(null);
    setMathQuestion(null);
    setShowQuestion(false);
    setRaceMode(false);
    toast.warning('⏰ انتهى الوقت! حاول مرة أخرى');
  };

  // معالجة انتهاء اللعبة
  const handleGameEnd = async (result: 'win' | 'draw', winnerId?: string) => {
    try {
      if (result === 'draw') {
        await supabase.rpc('handle_draw_match', { session_id: gameSession.id });
        toast.info('🤝 تعادل! تم إرجاع مبلغ الرهان');
      } else if (winnerId) {
        await supabase.rpc('calculate_match_earnings', { 
          session_id: gameSession.id, 
          winner_user_id: winnerId 
        });
        
        const isWinner = winnerId === user?.id;
        if (isWinner) {
          toast.success(`🎉 تهانينا! ربحت ${winnerEarnings.toFixed(2)} جنيه`);
        } else {
          toast.error('😔 للأسف خسرت المباراة');
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
    if (showQuestion && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showQuestion, timeLeft]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10 p-2 sm:p-4 space-y-4 sm:space-y-6">
      {/* معلومات اللعبة */}
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-primary/30 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse"></div>
        <CardHeader className="pb-2 sm:pb-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-primary">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
              <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ⚡ سباق XO الذكي ⚡
              </span>
            </CardTitle>
            <Button variant="outline" onClick={onExit} size="sm" className="hover:scale-105 transition-all duration-300">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              خروج
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 relative z-10">
          <div className="flex flex-col space-y-3 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-4 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <DollarSign className="h-4 w-4 text-green-500 animate-bounce" />
              <span className="text-xs sm:text-sm font-medium">الجائزة:</span>
              <Badge variant="secondary" className="text-xs sm:text-sm bg-green-100 text-green-800 animate-pulse">{prizeAmount.toFixed(2)} جنيه 💰</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Trophy className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs sm:text-sm font-medium">صافي الربح:</span>
              <Badge variant="secondary" className="text-xs sm:text-sm bg-yellow-100 text-yellow-800 animate-pulse">{winnerEarnings.toFixed(2)} جنيه 🏆</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <Users className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-medium">المتسابقون:</span>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 border border-red-300">
                  <span className="text-lg">❌</span>
                  <Badge variant={gameSession.player1_id === user?.id ? 'default' : 'secondary'} className="text-xs">
                    {player1Username}
                  </Badge>
                </div>
                
                <span className="text-muted-foreground text-xs font-bold px-2">⚡</span>
                
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 border border-blue-300">
                  <span className="text-lg">⭕</span>
                  <Badge variant={gameSession.player2_id === user?.id ? 'default' : 'secondary'} className="text-xs">
                    {player2Username}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حالة اللعبة */}
      {gameStatus === 'playing' ? (
        <Card className="bg-gradient-to-r from-orange/10 via-accent/5 to-orange/10 border-orange/20 shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              {raceMode ? (
                <Badge variant="default" className="text-lg px-8 py-3 animate-pulse bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                  <Timer className="h-5 w-5 ml-2 animate-spin" />
                  <span className="font-bold">🏃‍♂️ سباق السرعة! من يجيب أولاً يفوز!</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-lg px-8 py-3 bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse">
                  <Zap className="h-5 w-5 ml-2 animate-bounce" />
                  <span>⚡ اختر مربعاً لبدء السباق!</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : gameStatus === 'won' ? (
        <Card className={`${showVictoryAnimation ? 'animate-scale-in' : ''} bg-gradient-to-r from-green-100 via-green-50 to-emerald-100 border-green-300 shadow-2xl relative overflow-hidden`}>
          <CardContent className="pt-8 text-center relative">
            {showVictoryAnimation && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(25)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-2xl animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${1 + Math.random() * 2}s`
                    }}
                  >
                    {['💰', '🎉', '🏆', '⭐', '🎊'][Math.floor(Math.random() * 5)]}
                  </div>
                ))}
              </div>
            )}
            <div className="relative z-10">
              <Trophy className="h-16 w-16 text-green-600 mx-auto mb-6 animate-pulse drop-shadow-lg" />
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                {winner === user?.id ? '🏆 فوز في السباق! 🏆' : '🎮 انتهى السباق'}
              </h3>
              <div className={`text-xl font-semibold p-4 rounded-lg ${winner === user?.id ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                {winner === user?.id 
                  ? `⚡ ربحت ${winnerEarnings.toFixed(2)} جنيه في السباق! ⚡` 
                  : '😔 خسرت السباق هذه المرة'
                }
              </div>
              {winner === user?.id && (
                <div className="mt-4 space-y-2">
                  <p className="text-green-600 font-medium animate-fade-in">
                    🚀 سرعة رائعة! استمر في السباق!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-100 border-yellow-300 shadow-xl">
          <CardContent className="pt-8 text-center">
            <Users className="h-16 w-16 text-yellow-600 mx-auto mb-6 animate-pulse drop-shadow-lg" />
            <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4">
              🤝 تعادل في السباق!
            </h3>
            <div className="text-xl font-semibold p-4 bg-yellow-200 text-yellow-800 rounded-lg mb-4">
              💰 تم إرجاع مبلغ الرهان لكلا المتسابقين
            </div>
            <p className="text-yellow-600 font-medium animate-pulse">🏃‍♂️ سباق متقارب! جرب مرة أخرى!</p>
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
            disabled={gameStatus !== 'playing'}
            playerSymbol={playerSymbol}
          />
        </div>

        {/* السؤال الرياضي */}
        <div className="flex justify-center order-2 lg:order-2">
          {showQuestion && mathQuestion ? (
            <MathQuestion
              question={mathQuestion.question}
              questionId={mathQuestion.id}
              onAnswer={handleMathAnswer}
              timeLeft={timeLeft}
              onTimeUp={handleTimeUp}
            />
          ) : (
            <Card className="w-full max-w-md bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-2 border-dashed border-primary/30 shadow-lg">
              <CardContent className="pt-8 text-center">
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <Zap className="h-16 w-16 mx-auto text-primary/60 mb-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    🎯 جاهز للسباق؟
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    اختر أي مربع لبدء سباق سريع! 🏃‍♂️<br />
                    أول من يجيب بشكل صحيح يضع علامته
                  </p>
                  <div className="pt-4">
                    <Badge variant="outline" className="animate-pulse">
                      <Clock className="h-4 w-4 ml-1" />
                      في انتظار الاختيار...
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};