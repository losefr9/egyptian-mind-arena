import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [opponentSolving, setOpponentSolving] = useState<number | null>(null);
  const [gameEndNotified, setGameEndNotified] = useState(false);
  const [lockedCells, setLockedCells] = useState<Set<number>>(new Set());
  const [pendingMove, setPendingMove] = useState<{cellIndex: number, symbol: string} | null>(null);
  const [savingMove, setSavingMove] = useState<boolean>(false);
  const subscriptionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);

  const playerSymbol = gameSession.player1_id === user?.id ? 'X' : 'O';
  const prizeAmount = gameSession.bet_amount * 2;
  const platformFee = prizeAmount * 0.1;
  const winnerEarnings = prizeAmount - platformFee;

  const checkWinner = (board: string[]) => {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
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
    if (result && gameStatus === 'playing' && !gameEndNotified) {
      console.log('🏆 نتيجة المباراة:', result);
      setGameEndNotified(true);
      
      if (result === 'draw') {
        setGameStatus('draw');
        handleGameEnd('draw');
        toast.info('🤝 تعادل! رصيدكم سيتم إرجاعه');
      } else {
        setGameStatus('won');
        const winnerId = result === 'X' ? gameSession.player1_id : gameSession.player2_id;
        const winnerName = result === 'X' ? player1Username : player2Username;
        const isCurrentUserWinner = winnerId === user?.id;
        
        setWinner(winnerId);
        setShowVictoryAnimation(true);
        handleGameEnd('win', winnerId);
        
        if (isCurrentUserWinner) {
          toast.success(`🎉 تهانينا! لقد فزت بالمباراة وحصلت على ${winnerEarnings.toFixed(2)} ريال! 💰`);
        } else {
          toast.error(`😔 فاز ${winnerName} بالمباراة. حظ أوفر المرة القادمة!`);
        }
      }
    }
  }, [gameStatus, gameEndNotified, gameSession.player1_id, gameSession.player2_id, player1Username, player2Username, user?.id, winnerEarnings]);

  const lockCell = useCallback((cellIndex: number) => {
    setLockedCells(prev => new Set([...prev, cellIndex]));
    setTimeout(() => {
      setLockedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellIndex);
        return newSet;
      });
    }, 30000);
  }, []);

  const initializeGame = useCallback(async () => {
    try {
      console.log('🎮 تهيئة اللعبة...');
      
      const { data, error } = await supabase
        .from('xo_matches')
        .select('board_state')
        .eq('game_session_id', gameSession.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('خطأ في تحميل حالة اللوحة:', error);
        return;
      }
      
      if (data?.board_state) {
        let boardState = data.board_state;
        if (typeof boardState === 'string') {
          try {
            boardState = JSON.parse(boardState);
          } catch {
            console.log('Board state is already parsed or not JSON');
          }
        }
        
        if (Array.isArray(boardState)) {
          console.log('✅ تم تحميل حالة اللوحة:', boardState);
          setBoard(boardState as string[]);
        } else {
          console.log('📝 إنشاء لوحة جديدة');
          const emptyBoard = Array(9).fill('');
          setBoard(emptyBoard);
          await createNewMatch();
        }
      } else {
        console.log('📝 إنشاء لوحة جديدة - لا توجد بيانات');
        const emptyBoard = Array(9).fill('');
        setBoard(emptyBoard);
        await createNewMatch();
      }

      setupRealTimeSubscription();
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة اللعبة:', error);
      setBoard(Array(9).fill(''));
    }
  }, [gameSession.id]);

  const createNewMatch = async () => {
    try {
      await supabase.rpc('create_new_xo_match', {
        session_id: gameSession.id
      });
      console.log('✅ تم إنشاء مباراة جديدة');
    } catch (error) {
      console.error('❌ خطأ في إنشاء مباراة جديدة:', error);
    }
  };

  const fetchUsernames = useCallback(async () => {
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
      console.error('خطأ في تحميل أسماء المستخدمين:', error);
      setPlayer1Username('لاعب 1');
      setPlayer2Username('لاعب 2');
    }
  }, [gameSession.player1_id, gameSession.player2_id]);

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
      console.error('خطأ في تحميل السؤال:', error);
      toast.error('خطأ في تحميل السؤال');
    }
  };

  // Setup realtime subscription with new events
  const setupRealTimeSubscription = useCallback(() => {
    console.log('📡 إعداد الاشتراك في التحديثات الفورية للعبة:', gameSession.id);
    
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    setConnectionStatus('connecting');

    subscriptionRef.current = supabase
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
          console.log('🔔 تحديث فوري للوحة:', payload);
          const newData = payload.new as any;
          
          if (newData.board_state) {
            let boardState: string[];
            
            if (Array.isArray(newData.board_state)) {
              boardState = newData.board_state;
            } else if (typeof newData.board_state === 'string') {
              try {
                boardState = JSON.parse(newData.board_state);
              } catch {
                console.warn('فشل في تحليل board_state');
                boardState = newData.board_state;
              }
            } else {
              boardState = newData.board_state;
            }
            
            console.log('✅ تحديث اللوحة من قاعدة البيانات:', boardState);
            setBoard(boardState);
            setSavingMove(false);
            setPendingMove(null);
            
            if (selectedCell !== null && boardState[selectedCell] !== '') {
              console.log('🚫 تم حجز المربع المختار');
              setShowQuestion(false);
              setSelectedCell(null);
              setOpponentSolving(null);
              
              setLockedCells(prev => {
                const newSet = new Set(prev);
                newSet.delete(selectedCell);
                return newSet;
              });
              toast.warning('⚡ اللاعب الآخر أسرع منك! اختر مربعاً آخر');
            }
          }
        }
      )
      .on('broadcast', { event: 'cell_reserved' }, ({ payload }) => {
        if (payload.playerId !== user?.id) {
          console.log('🔒 الخصم حجز المربع:', payload.cellIndex);
          setOpponentSolving(payload.cellIndex);
        }
      })
      .on('broadcast', { event: 'reservation_cancelled' }, ({ payload }) => {
        if (payload.playerId !== user?.id) {
          console.log('🔄 الخصم ألغى حجز المربع:', payload.cellIndex);
          setOpponentSolving(null);
        }
      })
      .on('broadcast', { event: 'move_committed' }, ({ payload }) => {
        if (payload.playerId !== user?.id) {
          console.log('✅ الخصم أكد الحركة:', payload);
          setOpponentSolving(null);
        }
      })
      .subscribe((status) => {
        console.log('📡 حالة الاشتراك:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ الاشتراك نشط');
          setConnectionStatus('connected');
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ خطأ في الاشتراك');
          setConnectionStatus('disconnected');
          retryTimeoutRef.current = setTimeout(() => {
            console.log('🔄 محاولة إعادة الاتصال...');
            setupRealTimeSubscription();
          }, 3000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });
  }, [gameSession.id, user?.id, selectedCell, player1Username, player2Username]);

  // معالجة النقر على الخلية مع حجز ذري
  const handleCellClick = async (index: number) => {
    console.log('🎯 محاولة اختيار المربع:', index);
    
    if (
      board[index] ||
      gameStatus !== 'playing' ||
      lockedCells.has(index) ||
      pendingMove !== null ||
      opponentSolving === index ||
      showQuestion
    ) {
      if (board[index]) {
        toast.warning('هذا المربع محلول بالفعل!');
      } else if (opponentSolving === index) {
        toast.warning('🏃‍♂️ اللاعب الآخر يحل هذا المربع حالياً!');
      }
      return;
    }
    
    try {
      console.log('🔒 محاولة حجز المربع في قاعدة البيانات...');
      const { data, error } = await supabase.rpc('reserve_cell', {
        p_game_session_id: gameSession.id,
        p_player_id: user?.id,
        p_cell_index: index,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message: string };
      
      if (!result.success) {
        console.log('❌ فشل الحجز:', result.message);
        toast.error(result.message);
        return;
      }

      console.log('✅ تم حجز المربع بنجاح');
      
      setSelectedCell(index);
      lockCell(index);

      if (subscriptionRef.current) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'cell_reserved',
          payload: { cellIndex: index, playerId: user?.id }
        });
      }

      await loadNewQuestion();
    } catch (error) {
      console.error('❌ خطأ في حجز المربع:', error);
      toast.error('فشل في حجز المربع، حاول مرة أخرى');
    }
  };

  // معالجة الإجابة على السؤال مع commit_move
  const handleMathAnswer = async (answer: number, isCorrect: boolean) => {
    if (selectedCell === null || !mathQuestion || !raceMode) return;

    const cellIndex = selectedCell;
    const currentPlayer = gameSession.player1_id === user?.id ? 'X' : 'O';

    if (!isCorrect) {
      toast.error('💫 إجابة خاطئة! حاول مرة أخرى');
      
      try {
        await supabase.rpc('cancel_reservation', {
          p_game_session_id: gameSession.id,
          p_player_id: user?.id,
          p_cell_index: cellIndex,
        });
      } catch (error) {
        console.error('خطأ في إلغاء الحجز:', error);
      }
      
      setSelectedCell(null);
      setShowQuestion(false);
      setTimeLeft(15);
      setRaceMode(false);
      
      setTimeout(() => {
        setLockedCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellIndex);
          return newSet;
        });
      }, 500);

      if (subscriptionRef.current) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'reservation_cancelled',
          payload: { cellIndex, playerId: user?.id }
        });
      }

      return;
    }

    // الإجابة صحيحة، تأكيد الحركة ذرياً
    setPendingMove({cellIndex, symbol: currentPlayer});
    setSavingMove(true);

    try {
      console.log('📝 تأكيد الحركة في قاعدة البيانات');

      const { data, error } = await supabase.rpc('commit_move', {
        p_game_session_id: gameSession.id,
        p_player_id: user?.id,
        p_cell_index: cellIndex,
        p_symbol: currentPlayer,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message: string; board_state?: string[] };

      if (!result.success) {
        console.error('❌ فشل في تأكيد الحركة:', result);
        toast.error(result.message);
        
        setPendingMove(null);
        setSavingMove(false);
        setSelectedCell(null);
        setShowQuestion(false);
        setTimeLeft(15);
        setRaceMode(false);
        
        setTimeout(() => {
          setLockedCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellIndex);
            return newSet;
          });
        }, 500);
        
        return;
      }

      console.log('✅ تم تأكيد الحركة بنجاح');
      toast.success('🎯 إجابة صحيحة!');
      
      if (subscriptionRef.current) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'move_committed',
          payload: {
            cellIndex,
            playerId: user?.id,
            symbol: currentPlayer,
            boardState: result.board_state,
          },
        });
      }

      await logActivity('correct_answer', {
        cell_index: cellIndex,
        answer_given: answer,
      });

      setSelectedCell(null);
      setShowQuestion(false);
      setTimeLeft(15);
      setRaceMode(false);
      setPendingMove(null);

    } catch (error) {
      console.error('❌ خطأ في تأكيد الحركة:', error);
      toast.error('فشل في حفظ الحركة');
      
      setPendingMove(null);
      setSavingMove(false);
      setSelectedCell(null);
      setShowQuestion(false);
      setTimeLeft(15);
      setRaceMode(false);
      
      setTimeout(() => {
        setLockedCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellIndex);
          return newSet;
        });
      }, 500);
    }
  };

  // معالجة انتهاء الوقت
  const handleTimeUp = async () => {
    if (selectedCell === null) return;

    const cellIndex = selectedCell;

    toast.error('⏰ انتهى الوقت!');

    try {
      await supabase.rpc('cancel_reservation', {
        p_game_session_id: gameSession.id,
        p_player_id: user?.id,
        p_cell_index: cellIndex,
      });
    } catch (error) {
      console.error('خطأ في إلغاء الحجز:', error);
    }

    setSelectedCell(null);
    setShowQuestion(false);
    setTimeLeft(15);
    setRaceMode(false);

    setTimeout(() => {
      setLockedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellIndex);
        return newSet;
      });
    }, 500);

    if (subscriptionRef.current) {
      subscriptionRef.current.send({
        type: 'broadcast',
        event: 'reservation_cancelled',
        payload: { cellIndex, playerId: user?.id }
      });
    }
  };

  const handleGameEnd = async (result: 'win' | 'draw', winnerId?: string) => {
    try {
      if (result === 'draw') {
        await supabase.rpc('handle_draw_match', { session_id: gameSession.id });
      } else if (winnerId) {
        await supabase.rpc('calculate_match_earnings', { 
          session_id: gameSession.id,
          winner_user_id: winnerId 
        });
      }
    } catch (error) {
      console.error('خطأ في معالجة نهاية اللعبة:', error);
    }
  };

  const logActivity = async (activityType: string, details: any) => {
    try {
      await supabase.from('player_match_activities').insert({
        user_id: user?.id,
        game_session_id: gameSession.id,
        activity_type: activityType,
        activity_details: details
      });
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
    }
  };

  useEffect(() => {
    initializeGame();
    fetchUsernames();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (board.some(cell => cell !== '')) {
      checkWinnerFromBoard(board);
    }
  }, [board, checkWinnerFromBoard]);

  useEffect(() => {
    if (showQuestion && timeLeft > 0 && raceMode) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && showQuestion && raceMode) {
      handleTimeUp();
    }
  }, [timeLeft, showQuestion, raceMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-4 shadow-lg border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="hover:bg-accent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                خروج
              </Button>
              
          <div className="flex items-center gap-2">
                <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                  {connectionStatus === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
                </Badge>
                {savingMove && (
                  <Badge variant="secondary" className="animate-pulse">
                    💾 جاري الحفظ...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">الجائزة</p>
                  <p className="text-lg font-bold">{winnerEarnings.toFixed(2)} ر.س</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10">
                <Users className="w-5 h-5 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">اللاعبون</p>
                  <p className="text-sm font-medium">{player1Username} vs {player2Username}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">رمزك</p>
                  <p className="text-2xl font-bold">{playerSymbol}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {showQuestion && mathQuestion && (
          <div className="mb-4">
            <MathQuestion
              questionId={mathQuestion.id}
              question={mathQuestion.question}
              timeLeft={timeLeft}
              onAnswer={handleMathAnswer}
              onTimeUp={handleTimeUp}
            />
          </div>
        )}

        {(gameStatus === 'won' || gameStatus === 'draw') && (
          <Card className="mb-4 border-2 border-primary shadow-lg">
            <CardContent className="p-6 text-center">
              {gameStatus === 'won' && (
                <>
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-primary animate-bounce" />
                  <h2 className="text-2xl font-bold mb-2">
                    {winner === user?.id ? 'تهانينا! لقد فزت! 🎉' : 'انتهت اللعبة'}
                  </h2>
                  <p className="text-muted-foreground">
                    {winner === user?.id 
                      ? `حصلت على ${winnerEarnings.toFixed(2)} ر.س`
                      : 'حظ أوفر في المرة القادمة'}
                  </p>
                </>
              )}
              {gameStatus === 'draw' && (
                <>
                  <h2 className="text-2xl font-bold mb-2">تعادل! 🤝</h2>
                  <p className="text-muted-foreground">تم إرجاع الرصيد لكلا اللاعبين</p>
                </>
              )}
              <Button onClick={onExit} className="mt-4">
                العودة للألعاب
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col items-center">
          <XOBoard
            board={board}
            onCellClick={handleCellClick}
            currentPlayer={playerSymbol}
            disabled={gameStatus !== 'playing' || showQuestion}
            playerSymbol={playerSymbol}
            pendingMove={pendingMove}
            savingMove={savingMove}
            opponentSolving={opponentSolving}
            connectionStatus={connectionStatus}
          />

          {!showQuestion && gameStatus === 'playing' && (
            <p className="text-center text-muted-foreground mt-4">
              اختر مربعاً لبدء السؤال
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
