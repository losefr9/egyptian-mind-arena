import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { ChessTimer } from './ChessTimer';
import { MoveHistory } from './MoveHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Confetti from 'react-confetti';

interface ChessArenaProps {
  gameSession: {
    id: string;
    player1_id: string;
    player2_id: string;
    bet_amount: number;
    prize_amount: number;
  };
  onExit: () => void;
}

export const ChessArena: React.FC<ChessArenaProps> = ({ gameSession, onExit }) => {
  const { user } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [player1Time, setPlayer1Time] = useState(600);
  const [player2Time, setPlayer2Time] = useState(600);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>(gameSession.player1_id);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const isPlayer1 = user?.id === gameSession.player1_id;
  const isMyTurn = currentTurnPlayerId === user?.id;
  const playerColor = isPlayer1 ? 'white' : 'black';

  useEffect(() => {
    initializeGame();
    setupRealtimeSubscription();
  }, []);

  const initializeGame = async () => {
    try {
      const { data: matchData, error } = await supabase
        .from('chess_matches')
        .select('*')
        .eq('game_session_id', gameSession.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // إنشاء مباراة جديدة
        const { error: insertError } = await supabase
          .from('chess_matches')
          .insert({
            game_session_id: gameSession.id,
            current_turn_player_id: gameSession.player1_id,
            board_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          });

        if (insertError) throw insertError;
      } else if (matchData) {
        setFen(matchData.board_state);
        setPlayer1Time(matchData.player1_time_remaining);
        setPlayer2Time(matchData.player2_time_remaining);
        setCurrentTurnPlayerId(matchData.current_turn_player_id);
        const history = Array.isArray(matchData.move_history) ? matchData.move_history : [];
        setMoveHistory(history);
        
        const chessInstance = new Chess(matchData.board_state);
        setGame(chessInstance);
      }
    } catch (error) {
      console.error('Error initializing chess game:', error);
      toast.error('خطأ في تحميل اللعبة');
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chess-${gameSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chess_matches',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        (payload) => {
          const data = payload.new as any;
          setFen(data.board_state);
          setPlayer1Time(data.player1_time_remaining);
          setPlayer2Time(data.player2_time_remaining);
          setCurrentTurnPlayerId(data.current_turn_player_id);
          const history = Array.isArray(data.move_history) ? data.move_history : [];
          setMoveHistory(history);
          
          const chessInstance = new Chess(data.board_state);
          setGame(chessInstance);

          // التحقق من انتهاء اللعبة
          if (data.match_status !== 'playing') {
            handleGameEnd(data.match_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleMove = async (sourceSquare: string, targetSquare: string) => {
    if (!isMyTurn) {
      toast.error('ليس دورك الآن!');
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // دائماً ترقية إلى ملكة
      });

      if (move === null) return false;

      const newFen = gameCopy.fen();
      const moveData = {
        from: sourceSquare,
        to: targetSquare,
        piece: move.piece,
        captured: move.captured || null,
        timestamp: new Date().toISOString()
      };

      // إرسال الحركة إلى الخادم
      const { data, error } = await supabase.rpc('make_chess_move', {
        p_game_session_id: gameSession.id,
        p_player_id: user?.id,
        p_from: sourceSquare,
        p_to: targetSquare,
        p_board_state: newFen,
        p_move_data: moveData
      });

      if (error) throw error;

      const result = data as any;
      if (!result || !result.success) {
        toast.error(result?.message || 'خطأ في الحركة');
        return false;
      }

      // التحقق من حالة اللعبة
      if (gameCopy.isCheckmate()) {
        await handleGameEnd('checkmate');
      } else if (gameCopy.isStalemate()) {
        await handleGameEnd('stalemate');
      } else if (gameCopy.isDraw()) {
        await handleGameEnd('draw');
      }

      setGame(gameCopy);
      setFen(newFen);
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      toast.error('خطأ في تنفيذ الحركة');
      return false;
    }
  };

  const handleTimeOut = async (player: 'player1' | 'player2') => {
    try {
      const { data, error } = await supabase.rpc('update_chess_timer', {
        p_game_session_id: gameSession.id,
        p_player1_time: player === 'player1' ? 0 : player1Time,
        p_player2_time: player === 'player2' ? 0 : player2Time
      });

      if (error) throw error;

      const result = data as any;
      if (result && result.timeout) {
        const winnerId = result.winner === 'player1' ? gameSession.player1_id : gameSession.player2_id;
        await supabase.rpc('calculate_match_earnings', {
          session_id: gameSession.id,
          winner_user_id: winnerId
        });

        setIsGameOver(true);
        setWinner(winnerId);
        if (winnerId === user?.id) {
          setShowConfetti(true);
          toast.success('🎉 مبروك! فزت بسبب انتهاء وقت الخصم!');
        } else {
          toast.error('😢 للأسف، انتهى وقتك وخسرت المباراة');
        }
      }
    } catch (error) {
      console.error('Error handling timeout:', error);
    }
  };

  const handleGameEnd = async (status: string) => {
    setIsGameOver(true);
    
    let winnerId: string | null = null;
    if (status === 'checkmate') {
      winnerId = currentTurnPlayerId === gameSession.player1_id 
        ? gameSession.player2_id 
        : gameSession.player1_id;
    }

    if (winnerId) {
      await supabase.rpc('calculate_match_earnings', {
        session_id: gameSession.id,
        winner_user_id: winnerId
      });

      setWinner(winnerId);
      if (winnerId === user?.id) {
        setShowConfetti(true);
        toast.success('🎉 مبروك الفوز!');
      } else {
        toast.error('😢 للأسف خسرت هذه المرة');
      }
    } else {
      await supabase.rpc('handle_draw_match', {
        session_id: gameSession.id
      });
      toast.info('تعادل! تم إرجاع الرهان');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onExit} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            خروج
          </Button>
          
          <Badge variant="golden" className="text-lg px-4 py-2">
            <Trophy className="h-5 w-5 ml-2" />
            {gameSession.prize_amount} جنيه
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timer Column */}
          <div className="order-2 lg:order-1">
            <ChessTimer
              player1Time={player1Time}
              player2Time={player2Time}
              isPlayer1Turn={currentTurnPlayerId === gameSession.player1_id}
              isPlayer1={isPlayer1}
              onTimeOut={handleTimeOut}
            />
          </div>

          {/* Board Column */}
          <div className="order-1 lg:order-2">
            <Card className="game-board-glow">
              <CardContent className="p-4">
                <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                  <Chessboard
                    position={game.fen()}
                    onPieceDrop={handleMove}
                    boardOrientation={playerColor as 'white' | 'black'}
                    arePiecesDraggable={!isGameOver && isMyTurn}
                    customBoardStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: '#3B82F6' }}
                    customLightSquareStyle={{ backgroundColor: '#E0E7FF' }}
                  />
                </div>

                {isGameOver && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    {winner === user?.id ? (
                      <>
                        <Trophy className="h-12 w-12 text-primary mx-auto mb-2 animate-bounce" />
                        <h3 className="text-2xl font-bold text-primary mb-2">🎉 مبروك الفوز!</h3>
                        <p className="text-lg">فزت بـ {gameSession.prize_amount} جنيه</p>
                      </>
                    ) : winner ? (
                      <>
                        <p className="text-xl font-semibold mb-2">😢 للأسف خسرت</p>
                        <Button onClick={onExit} className="mt-2">
                          العب مرة أخرى
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold">تعادل!</p>
                        <p className="text-sm text-muted-foreground mt-1">تم إرجاع الرهان</p>
                      </>
                    )}
                  </div>
                )}

                {!isGameOver && (
                  <div className="mt-4 text-center">
                    <Badge variant={isMyTurn ? 'default' : 'secondary'} className="text-sm">
                      {isMyTurn ? '🎯 دورك الآن!' : '⏳ انتظر دور الخصم...'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Move History Column */}
          <div className="order-3">
            <MoveHistory moves={moveHistory} />
          </div>
        </div>
      </div>
    </div>
  );
};
