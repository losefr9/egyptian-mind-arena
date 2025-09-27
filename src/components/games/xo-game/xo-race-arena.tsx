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
  const [lastBoardUpdate, setLastBoardUpdate] = useState<string>('');
  const subscriptionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);
  const boardSyncRef = useRef<string[]>(Array(9).fill(''));

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

  // قفل مؤقت للخلايا لمنع التضارب
  const lockCell = useCallback((cellIndex: number) => {
    setLockedCells(prev => new Set([...prev, cellIndex]));
    // فك القفل تلقائياً بعد 20 ثانية
    setTimeout(() => {
      setLockedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellIndex);
        return newSet;
      });
    }, 20000);
  }, []);

  // تحميل اللوحة الحالية والإعداد الأولي
  const initializeGame = useCallback(async () => {
    try {
      console.log('🎮 تهيئة اللعبة...');
      
      // تحميل حالة اللوحة الحالية
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

      // إعداد الاشتراك في الوقت الفعلي
      setupRealTimeSubscription();
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة اللعبة:', error);
      setBoard(Array(9).fill(''));
    }
  }, [gameSession.id]);

  // إنشاء مباراة جديدة
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

  // إعداد الاشتراك في الوقت الفعلي مع retry mechanism
  const setupRealTimeSubscription = useCallback(() => {
    console.log('📡 إعداد الاشتراك في التحديثات الفورية للعبة:', gameSession.id);
    
    // إزالة الاشتراك السابق إن وجد
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
            
            // التعامل مع board_state سواء كان string أو array
            if (Array.isArray(newData.board_state)) {
              boardState = newData.board_state;
            } else if (typeof newData.board_state === 'string') {
              try {
                boardState = JSON.parse(newData.board_state);
              } catch {
                console.warn('فشل في تحليل board_state، استخدام القيمة كما هي');
                boardState = newData.board_state;
              }
            } else {
              boardState = newData.board_state;
            }
            
            console.log('✅ تحديث اللوحة من التحديث الفوري:', boardState);
            
            // التحديث الذكي مع منع التضارب
            const boardKey = JSON.stringify(boardState);
            if (lastBoardUpdate !== boardKey) {
              setLastBoardUpdate(boardKey);
              boardSyncRef.current = boardState;
              
              setBoard(prevBoard => {
                if (JSON.stringify(prevBoard) !== JSON.stringify(boardState)) {
                  console.log('🔄 تحديث الحالة من:', prevBoard, 'إلى:', boardState);
                  
                  // تحديث قائمة الخلايا المقفلة
                  const newLockedCells = new Set<number>();
                  boardState.forEach((cell, index) => {
                    if (cell !== '' && prevBoard[index] === '') {
                      newLockedCells.add(index);
                    }
                  });
                  
                  // إخفاء السؤال إذا كان اللاعب يحاول الإجابة على مربع محجوز
                  if (selectedCell !== null && boardState[selectedCell] !== '' && prevBoard[selectedCell] === '') {
                    console.log('🚫 تم حجز المربع المختار من قبل لاعب آخر');
                    setShowQuestion(false);
                    setSelectedCell(null);
                    setOpponentSolving(null);
                    setPendingMove(null);
                    // فك قفل الخلية
                    setLockedCells(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(selectedCell);
                      return newSet;
                    });
                    toast.warning('⚡ اللاعب الآخر أسرع منك! اختر مربعاً آخر');
                  }
                  
                  // إشعار عن تحرك اللاعب الآخر مع تأثيرات بصرية
                  const newMoves = boardState.filter((cell, index) => cell !== '' && prevBoard[index] === '');
                  if (newMoves.length > 0) {
                    const moveIndex = boardState.findIndex((cell, index) => cell !== '' && prevBoard[index] === '');
                    if (moveIndex !== -1) {
                      const symbol = boardState[moveIndex];
                      const isOwnMove = (symbol === 'X' && user?.id === gameSession.player1_id) || 
                                      (symbol === 'O' && user?.id === gameSession.player2_id);
                      
                      if (!isOwnMove) {
                        const otherPlayerName = symbol === 'X' ? player1Username : player2Username;
                        toast.success(`🎯 ${otherPlayerName} حل المربع ${moveIndex + 1}!`, {
                          duration: 2000,
                          style: { background: 'var(--accent)', color: 'var(--accent-foreground)' }
                        });
                        setOpponentSolving(null);
                      } else {
                        // تأكيد الحركة الخاصة
                        toast.success('✅ تم تأكيد حركتك بنجاح!', {
                          duration: 1500,
                          style: { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                        });
                        setPendingMove(null);
                      }
                      
                      // فك قفل الخلية
                      setLockedCells(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(moveIndex);
                        return newSet;
                      });
                    }
                  }
                  
                  return boardState;
                }
                return prevBoard;
              });
            }
          }
        }
      )
      .on('broadcast', { event: 'opponent_solving' }, (payload) => {
        const { cellIndex, playerId } = payload.payload;
        if (playerId !== user?.id) {
          setOpponentSolving(cellIndex);
          console.log('👁️ اللاعب الآخر يحل مربع:', cellIndex);
        }
      })
      .on('broadcast', { event: 'stop_solving' }, (payload) => {
        const { playerId } = payload.payload;
        if (playerId !== user?.id) {
          setOpponentSolving(null);
          console.log('✋ اللاعب الآخر توقف عن الحل');
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xo_matches',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        (payload) => {
          console.log('📝 مباراة جديدة تم إنشاؤها:', payload);
          const newData = payload.new as any;
          if (newData.board_state && Array.isArray(newData.board_state)) {
            console.log('🎯 تعيين حالة اللوحة الأولية:', newData.board_state);
            setBoard(newData.board_state as string[]);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 حالة الاشتراك:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ الاشتراك نشط للعبة:', gameSession.id);
          setConnectionStatus('connected');
          // إلغاء أي محاولة إعادة اتصال معلقة
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ خطأ في الاشتراك للعبة:', gameSession.id);
          setConnectionStatus('disconnected');
          // محاولة إعادة الاتصال بعد 3 ثوانٍ
          retryTimeoutRef.current = setTimeout(() => {
            console.log('🔄 محاولة إعادة الاتصال...');
            setupRealTimeSubscription();
          }, 3000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });
  }, [gameSession.id, user?.id, selectedCell, player1Username, player2Username]);

  // تحميل أسماء المستخدمين
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

  // تحميل سؤال جديد
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

  // معالجة النقر على الخلية
  const handleCellClick = (index: number) => {
    console.log('🎯 محاولة اختيار المربع:', index, 'حالة المربع:', board[index]);
    
    // التحقق الشامل للخلية
    const currentBoard = boardSyncRef.current;
    const isCellEmpty = currentBoard[index] === '' && board[index] === '';
    const isCellLocked = lockedCells.has(index);
    const isGameActive = gameStatus === 'playing';
    const isAlreadySolving = showQuestion && selectedCell !== null;
    
    console.log('🔍 فحص الخلية:', {
      index,
      isCellEmpty,
      isCellLocked,
      isGameActive,
      isAlreadySolving,
      currentBoard: currentBoard[index],
      localBoard: board[index]
    });
    
    // التحقق من صحة الحركة
    if (!isCellEmpty || !isGameActive || isCellLocked || isAlreadySolving) {
      console.log('❌ المربع محجوز أو اللعبة متوقفة');
      if (board[index] !== '') {
        toast.warning('هذا المربع محلول بالفعل! اختر مربع آخر');
      }
      return;
    }

    // التحقق من أن اللاعب الآخر لا يحل نفس المربع
    if (opponentSolving === index) {
      toast.warning('🏃‍♂️ اللاعب الآخر يحل هذا المربع حالياً! اختر مربعاً آخر');
      return;
    }
    
    console.log('✅ المربع متاح، بدء السؤال...');
    setSelectedCell(index);
    
    // إشعار اللاعب الآخر أن هذا المربع قيد الحل
    if (subscriptionRef.current) {
      subscriptionRef.current.send({
        type: 'broadcast',
        event: 'opponent_solving',
        payload: { cellIndex: index, playerId: user?.id }
      });
    }
    
    loadNewQuestion();
  };

  // معالجة الإجابة على السؤال
  const handleMathAnswer = async (answer: number, isCorrect: boolean) => {
    if (selectedCell === null || !mathQuestion || !raceMode) return;

    const responseTime = Date.now() - questionStartTime;
    
    try {
      // التحقق من صحة الإجابة
      const { data: validationData, error: validationError } = await supabase.rpc('validate_generated_math_answer', {
        question_text: mathQuestion.question,
        user_answer: answer
      });

      if (validationError) throw validationError;

      const actualIsCorrect = validationData?.[0]?.is_correct || false;

      if (actualIsCorrect) {
        console.log('✅ إجابة صحيحة! تحديث اللوحة...');
        
        // تحضير اللوحة الجديدة
        const newBoard = [...board];
        newBoard[selectedCell] = playerSymbol;
        
        console.log('📊 تحديث اللوحة:', {
          من: board,
          إلى: newBoard,
          الخلية: selectedCell,
          الرمز: playerSymbol,
          معرف_الجلسة: gameSession.id
        });
        
        try {
          // تحديث قاعدة البيانات أولاً مع فحص الحالة
          const { data: currentMatch, error: fetchError } = await supabase
            .from('xo_matches')
            .select('board_state')
            .eq('game_session_id', gameSession.id)
            .maybeSingle();

          if (fetchError) {
            console.error('❌ خطأ في قراءة حالة اللوحة:', fetchError);
            toast.error('خطأ في قراءة حالة اللوحة');
            return;
          }

          // إنشاء مباراة جديدة إذا لم تكن موجودة
          if (!currentMatch) {
            console.log('📝 إنشاء سجل مباراة جديد...');
            
            // محاولة إنشاء المباراة باستخدام RPC
            const { error: rpcError } = await supabase.rpc('create_new_xo_match', { 
              session_id: gameSession.id 
            });
            
            if (rpcError) {
              console.error('❌ خطأ في RPC إنشاء المباراة:', rpcError);
              // محاولة إنشاء مباشر إذا فشل RPC
              const { error: insertError } = await supabase
                .from('xo_matches')
                .insert({
                  game_session_id: gameSession.id,
                  board_state: ['', '', '', '', '', '', '', '', ''],
                  match_status: 'playing',
                  current_turn_player_id: user?.id
                });
                
              if (insertError) {
                console.error('❌ خطأ في إنشاء المباراة مباشرة:', insertError);
                toast.error('خطأ في إنشاء المباراة');
                return;
              }
            }
            
            // إعادة قراءة البيانات مع retry
            let retries = 3;
            let newMatch = null;
            
            while (retries > 0 && !newMatch) {
              const { data: matchData, error: newFetchError } = await supabase
                .from('xo_matches')
                .select('board_state')
                .eq('game_session_id', gameSession.id)
                .maybeSingle();
                
              if (newFetchError) {
                console.error('❌ خطأ في قراءة المباراة الجديدة:', newFetchError);
                retries--;
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 500)); // انتظار نصف ثانية
                }
                continue;
              }
              
              newMatch = matchData;
              break;
            }
              
            if (!newMatch) {
              console.error('❌ فشل في إنشاء أو قراءة المباراة بعد عدة محاولات');
              toast.error('فشل في إنشاء المباراة، يرجى المحاولة مرة أخرى');
              return;
            }
            
            const currentBoard = Array.isArray(newMatch.board_state) 
              ? newMatch.board_state 
              : JSON.parse(newMatch.board_state as string);
              
            if (currentBoard[selectedCell] !== '') {
              toast.warning('هذا المربع محلول بالفعل! اختر مربع آخر');
              return;
            }
          } else {
            // فحص ما إذا كان المربع لا يزال فارغاً
            const currentBoard = Array.isArray(currentMatch.board_state) 
              ? currentMatch.board_state 
              : JSON.parse(currentMatch.board_state as string);

            if (currentBoard[selectedCell] !== '') {
              console.log('❌ المربع محجوز بالفعل من قبل لاعب آخر:', currentBoard[selectedCell]);
              toast.warning('تم حجز هذا المربع من قبل اللاعب الآخر!');
              setShowQuestion(false);
              setSelectedCell(null);
              return;
            }
          }

          // إنشاء نسخة جديدة من اللوحة مع تحديث optimistic
          const newBoard = [...board];
          newBoard[selectedCell] = playerSymbol;
          
          // تعيين الحركة المعلقة للمتابعة
          setPendingMove({ cellIndex: selectedCell, symbol: playerSymbol });

          // تحديث قاعدة البيانات مع آلية retry
          let updateSuccess = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!updateSuccess && retryCount < maxRetries) {
            try {
              const { error: updateError } = await supabase
                .from('xo_matches')
                .update({ 
                  board_state: newBoard,
                  updated_at: new Date().toISOString()
                })
                .eq('game_session_id', gameSession.id);

              if (!updateError) {
                updateSuccess = true;
                console.log('✅ تم تحديث اللوحة بنجاح في قاعدة البيانات');
                
                // تحديث المرجع المحلي
                boardSyncRef.current = newBoard;
                
                // التحديث optimistic للوحة المحلية
                setBoard(newBoard);
                
              } else {
                console.error(`❌ خطأ في تحديث اللوحة (محاولة ${retryCount + 1}):`, updateError);
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
                }
              }
            } catch (error) {
              console.error(`❌ خطأ في الاتصال (محاولة ${retryCount + 1}):`, error);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
              }
            }
          }
          
          if (!updateSuccess) {
            toast.error('❌ فشل في تحديث اللوحة، يرجى المحاولة مرة أخرى');
            setPendingMove(null);
            // فك قفل الخلية
            setLockedCells(prev => {
              const newSet = new Set(prev);
              newSet.delete(selectedCell);
              return newSet;
            });
            return;
          }
          
          // تسجيل النشاط
          try {
            await logActivity('race_move_made', {
              cell: selectedCell,
              symbol: playerSymbol,
              question: mathQuestion?.question || '',
              answer: answer,
              response_time: responseTime,
              board: newBoard
            });
          } catch (logError) {
            console.error('خطأ في تسجيل النشاط:', logError);
          }

          toast.success(`🎯 إجابة صحيحة! وقت الاستجابة: ${responseTime}ms`, {
            duration: 2000,
            style: { background: 'var(--primary)', color: 'var(--primary-foreground)' }
          });
          
        } catch (error) {
          console.error('❌ خطأ في تحديث قاعدة البيانات:', error);
          toast.error('خطأ في تحديث اللوحة');
        }
      } else {
        console.log('❌ إجابة خاطئة');
        toast.error('💫 إجابة خاطئة! حاول مرة أخرى', {
          duration: 1500,
          style: { background: 'var(--destructive)', color: 'var(--destructive-foreground)' }
        });
        
        // فك قفل الخلية عند الإجابة الخاطئة
        setLockedCells(prev => {
          const newSet = new Set(prev);
          if (selectedCell !== null) newSet.delete(selectedCell);
          return newSet;
        });
      }
    } catch (error) {
      console.error('خطأ في التحقق من الإجابة:', error);
      toast.error('خطأ في التحقق من الإجابة');
    }

    // إنهاء السباق وتنظيف الحالة
    setSelectedCell(null);
    setMathQuestion(null);
    setShowQuestion(false);
    setRaceMode(false);
    setPendingMove(null);
    
    // إشعار الخصم أن الحل انتهى
    if (subscriptionRef.current) {
      subscriptionRef.current.send({
        type: 'broadcast',
        event: 'stop_solving',
        payload: { playerId: user?.id }
      });
    }
  };

  // معالجة انتهاء الوقت
  const handleTimeUp = () => {
    console.log('⏰ انتهى الوقت للسؤال');
    
    // فك قفل الخلية
    if (selectedCell !== null) {
      setLockedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedCell);
        return newSet;
      });
    }
    
    // إشعار اللاعب الآخر أن الحل توقف
    if (subscriptionRef.current && selectedCell !== null) {
      subscriptionRef.current.send({
        type: 'broadcast',
        event: 'stop_solving',
        payload: { playerId: user?.id }
      });
    }
    
    setSelectedCell(null);
    setMathQuestion(null);
    setShowQuestion(false);
    setRaceMode(false);
    setPendingMove(null);
    toast.error('⏰ انتهى الوقت! اختر مربعاً آخر بسرعة', {
      duration: 2000,
      style: { background: 'var(--destructive)', color: 'var(--destructive-foreground)' }
    });
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
      console.error('خطأ في معالجة نهاية اللعبة:', error);
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
      console.error('خطأ في تسجيل النشاط:', error);
    }
  };

  // التهيئة الأولية
  useEffect(() => {
    initializeGame();
    fetchUsernames();

    // تنظيف الاشتراك عند إلغاء التحميل
    return () => {
      console.log('🧹 تنظيف اشتراكات الوقت الفعلي');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initializeGame, fetchUsernames]);

  // فحص الفائز عند تغيير اللوحة
  useEffect(() => {
    if (board.some(cell => cell !== '')) {
      checkWinnerFromBoard(board);
    }
  }, [board, checkWinnerFromBoard]);

  // مؤقت العد التنازلي
  useEffect(() => {
    if (showQuestion && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (showQuestion && timeLeft === 0) {
      handleTimeUp();
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
                  <span className="text-xs font-bold text-red-600">❌</span>
                  <span className="text-xs text-red-700">{player1Username}</span>
                </div>
                <span className="text-xs text-muted-foreground">VS</span>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 border border-blue-300">
                  <span className="text-xs font-bold text-blue-600">⭕</span>
                  <span className="text-xs text-blue-700">{player2Username}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* مؤشر حالة الاتصال */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-primary/20">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-spin' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'متصل' : 
               connectionStatus === 'connecting' ? 'جاري الاتصال...' : 'منقطع'}
            </span>
            {opponentSolving !== null && (
              <div className="ml-4 flex items-center gap-1 text-xs text-orange-600 animate-pulse">
                <span>🏃‍♂️</span>
                <span>اللاعب الآخر يحل المربع {opponentSolving + 1}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* السؤال الرياضي */}
      {showQuestion && mathQuestion && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-xl animate-in slide-in-from-top-5 duration-500">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-orange-600">
              <Timer className="h-5 w-5 animate-spin" />
              سباق السرعة!
              <Timer className="h-5 w-5 animate-spin" />
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="font-bold text-red-500">{timeLeft} ثانية</span>
            </div>
          </CardHeader>
          <CardContent>
            <MathQuestion
              question={mathQuestion.question}
              questionId={mathQuestion.id}
              timeLeft={timeLeft}
              onAnswer={handleMathAnswer}
              onTimeUp={handleTimeUp}
            />
          </CardContent>
        </Card>
      )}

      {/* حالة اللعبة */}
      {gameStatus !== 'playing' && (
        <Card className={`text-center shadow-2xl border-4 ${
          gameStatus === 'won' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
        } animate-in zoom-in-95 duration-1000`}>
          <CardContent className="py-8">
            <div className="space-y-4">
              {gameStatus === 'won' && winner && (
                <div className="space-y-3">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-green-600">
                    {winner === user?.id ? 'تهانينا! 🏆' : 'انتهت المباراة 😔'}
                  </h2>
                  <p className="text-lg text-green-700">
                    الفائز: {winner === gameSession.player1_id ? player1Username : player2Username}
                  </p>
                  {winner === user?.id && (
                    <p className="text-xl font-bold text-green-800">
                      ربحت {winnerEarnings.toFixed(2)} جنيه! 💰
                    </p>
                  )}
                </div>
              )}
              
              {gameStatus === 'draw' && (
                <div className="space-y-3">
                  <div className="text-6xl animate-pulse">🤝</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-yellow-600">تعادل!</h2>
                  <p className="text-lg text-yellow-700">تم إرجاع مبلغ الرهان لكلا اللاعبين</p>
                </div>
              )}
              
              <Button onClick={onExit} size="lg" className="mt-6 hover:scale-105 transition-all duration-300">
                العودة للألعاب
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* لوحة اللعب */}
      {gameStatus === 'playing' && (
        <div className="flex justify-center">
          <XOBoard
            board={board}
            onCellClick={handleCellClick}
            currentPlayer="X"
            disabled={showQuestion}
            playerSymbol={playerSymbol}
            opponentSolving={opponentSolving}
            lockedCells={lockedCells}
            pendingMove={pendingMove}
            connectionStatus={connectionStatus}
          />
        </div>
      )}

      {/* رسالة انتظار */}
      {gameStatus === 'playing' && !showQuestion && selectedCell === null && (
        <Card className="text-center bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-xl">
          <CardContent className="py-6">
            <div className="space-y-3">
              <div className="text-4xl animate-pulse">🎯</div>
              <h3 className="text-lg font-bold text-blue-600">اختر مربعاً لبدء السباق!</h3>
              <p className="text-sm text-blue-700">
                اضغط على أي مربع فارغ لتظهر لك مسألة رياضية
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                <span>رمزك:</span>
                <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                  <span className="font-bold text-primary">
                    {playerSymbol === 'X' ? '❌' : '⭕'} {playerSymbol}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};