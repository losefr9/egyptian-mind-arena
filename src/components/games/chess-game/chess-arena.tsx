import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chess } from 'chess.js';
import { ChessBoard } from './chess-board';
import { ChessTimer } from './chess-timer';
import { CapturedPieces } from './captured-pieces';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { GameEndDialog } from '../game-end-dialog';

interface ChessArenaProps {
  sessionId: string;
  currentUserId: string;
  player1Id: string;
  player2Id: string;
  betAmount: number;
  onGameEnd: (winnerId: string | null) => void;
}

export const ChessArena: React.FC<ChessArenaProps> = ({
  sessionId,
  currentUserId,
  player1Id,
  player2Id,
  betAmount,
  onGameEnd
}) => {
  const [chess] = useState(new Chess());
  const [boardState, setBoardState] = useState(chess.fen());
  const [player1Time, setPlayer1Time] = useState(600);
  const [player2Time, setPlayer2Time] = useState(600);
  const [currentTurn, setCurrentTurn] = useState<string>(player1Id);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[], black: string[] }>({ white: [], black: [] });
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [gameEndState, setGameEndState] = useState<{ show: boolean; result: 'win' | 'lose' | 'draw'; prize: number; winnerId: string | null } | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const { toast } = useToast();

  const isMyTurn = currentTurn === currentUserId;
  const myColor = currentUserId === player1Id ? 'white' : 'black';

  useEffect(() => {
    fetchPlayerNames();
    setupRealtimeSubscription();
    loadMatchState();
  }, []);

  const fetchPlayerNames = async () => {
    const { data: p1 } = await supabase.rpc('get_public_username', { user_id_input: player1Id });
    const { data: p2 } = await supabase.rpc('get_public_username', { user_id_input: player2Id });
    setPlayer1Name(p1?.[0]?.username || 'لاعب 1');
    setPlayer2Name(p2?.[0]?.username || 'لاعب 2');
  };

  const loadMatchState = async () => {
    try {
      let { data, error } = await supabase
        .from('chess_matches')
        .select('*')
        .eq('game_session_id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('Error loading chess match:', error);
        toast({
          title: "خطأ في تحميل المباراة",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (!data) {
        console.log('No chess match found, creating one...');
        const { data: newMatch, error: createError } = await supabase
          .from('chess_matches')
          .insert({
            game_session_id: sessionId,
            board_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            player1_time_remaining: 600,
            player2_time_remaining: 600,
            current_turn_player_id: player1Id,
            match_status: 'playing',
            move_history: []
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating chess match:', createError);
          toast({
            title: "خطأ في إنشاء المباراة",
            description: createError.message,
            variant: "destructive"
          });
          return;
        }

        data = newMatch;
        console.log('Chess match created successfully:', data);
      }

      if (data) {
        chess.load(data.board_state);
        setBoardState(data.board_state);
        setPlayer1Time(data.player1_time_remaining);
        setPlayer2Time(data.player2_time_remaining);
        setCurrentTurn(data.current_turn_player_id);
        updateCapturedPieces(data.move_history || []);

        if (data.move_history && Array.isArray(data.move_history) && data.move_history.length > 0) {
          setGameStarted(true);
        }

        console.log('Chess match loaded:', {
          boardState: data.board_state,
          currentTurn: data.current_turn_player_id,
          moveCount: data.move_history?.length || 0
        });
      }
    } catch (error) {
      console.error('Exception in loadMatchState:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل حالة المباراة",
        variant: "destructive"
      });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chess_match_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chess_matches',
          filter: `game_session_id=eq.${sessionId}`
        },
        (payload) => {
          const newData = payload.new as any;
          chess.load(newData.board_state);
          setBoardState(newData.board_state);
          setPlayer1Time(newData.player1_time_remaining);
          setPlayer2Time(newData.player2_time_remaining);
          setCurrentTurn(newData.current_turn_player_id);
          updateCapturedPieces(newData.move_history || []);

          if (newData.move_history && Array.isArray(newData.move_history) && newData.move_history.length > 0) {
            setGameStarted(true);
          }

          if (newData.match_status === 'checkmate' || newData.match_status === 'timeout') {
            handleGameEnd(newData.match_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateCapturedPieces = (moveHistory: any) => {
    const captured = { white: [] as string[], black: [] as string[] };
    
    if (Array.isArray(moveHistory)) {
      moveHistory.forEach((move: any) => {
        if (move.captured) {
          const color = move.color === 'w' ? 'black' : 'white';
          captured[color].push(move.captured);
        }
      });
    }
    
    setCapturedPieces(captured);
  };

  const handleMove = async (from: string, to: string, promotion?: string) => {
    if (!isMyTurn) {
      console.log('Not your turn - blocking move');
      toast({
        title: "ليس دورك",
        description: "انتظر دورك للعب",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Attempting move:', { from, to, promotion, currentTurn, myId: currentUserId });

      const moveOptions: any = { from, to };
      if (promotion) {
        moveOptions.promotion = promotion;
      }

      const move = chess.move(moveOptions);

      if (!move) {
        console.log('Invalid move rejected by chess.js');
        toast({
          title: "حركة غير صالحة",
          description: "هذه الحركة غير مسموح بها",
          variant: "destructive"
        });
        return false;
      }

      console.log('Move validated by chess.js:', move);
      const newBoardState = chess.fen();

      const moveData = {
        from,
        to,
        piece: move.piece,
        captured: move.captured,
        color: move.color,
        flags: move.flags,
        san: move.san,
        timestamp: new Date().toISOString()
      };

      console.log('Sending move to server...');
      const { data, error } = await supabase.rpc('make_chess_move', {
        p_game_session_id: sessionId,
        p_player_id: currentUserId,
        p_from: from,
        p_to: to,
        p_board_state: newBoardState,
        p_move_data: moveData
      });

      if (error) {
        console.error('Server rejected move:', error);
        chess.undo();
        toast({
          title: "خطأ في الخادم",
          description: error.message || "فشل في تنفيذ الحركة",
          variant: "destructive"
        });
        return false;
      }

      console.log('Move accepted by server:', data);
      setMoveCount(prev => prev + 1);

      if (!gameStarted) {
        setGameStarted(true);
      }

      toast({
        title: "حركة ناجحة",
        description: `تم تحريك القطعة من ${from} إلى ${to}`,
        duration: 1500
      });

      if (chess.isCheckmate()) {
        console.log('Checkmate detected!');
        await supabase.from('chess_matches').update({ match_status: 'checkmate' }).eq('game_session_id', sessionId);
        await handleGameEnd('checkmate');
      } else if (chess.isCheck()) {
        console.log('Check!');
        toast({
          title: "كش!",
          description: "الملك في خطر",
          duration: 2000
        });
      } else if (chess.isStalemate() || chess.isDraw()) {
        console.log('Draw/Stalemate detected');
        await handleGameEnd('draw');
      }

      return true;
    } catch (error) {
      console.error('Exception in handleMove:', error);
      chess.undo();
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleGameEnd = async (status: string) => {
    let winnerId = null;
    let result: 'win' | 'lose' | 'draw' = 'draw';
    
    if (status === 'checkmate') {
      winnerId = currentTurn === player1Id ? player2Id : player1Id;
      result = winnerId === currentUserId ? 'win' : 'lose';
    } else if (status === 'timeout') {
      winnerId = player1Time <= 0 ? player2Id : player1Id;
      result = winnerId === currentUserId ? 'win' : 'lose';
    }

    setGameEndState({
      show: true,
      result,
      prize: result === 'win' ? betAmount * 1.8 : 0,
      winnerId
    });

    setTimeout(() => onGameEnd(winnerId), 5000);
  };

  const handleTimeUpdate = async (p1Time: number, p2Time: number) => {
    if (p1Time <= 0 || p2Time <= 0) {
      console.log('Time expired!', { p1Time, p2Time });
      await supabase.rpc('update_chess_timer', {
        p_game_session_id: sessionId,
        p_player1_time: Math.max(0, p1Time),
        p_player2_time: Math.max(0, p2Time)
      });
      return;
    }

    if (moveCount > 0 && (moveCount % 5 === 0 || p1Time <= 60 || p2Time <= 60)) {
      await supabase.rpc('update_chess_timer', {
        p_game_session_id: sessionId,
        p_player1_time: p1Time,
        p_player2_time: p2Time
      });
    }
  };

  return (
    <>
      {gameEndState && (
        <GameEndDialog
          isOpen={gameEndState.show}
          result={gameEndState.result}
          prize={gameEndState.prize}
          stats={{ moves: moveCount }}
          onBackToGames={() => onGameEnd(gameEndState.winnerId)}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with improved design */}
        <Card className="p-6 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary-glow rounded-xl">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الجائزة الكبرى</p>
                <span className="font-bold text-2xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {betAmount * 2} جنيه
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-background/50 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold">مباراة شطرنج</span>
            </div>
          </div>
        </Card>

        {/* Game Board */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Main Board */}
          <div className="space-y-4">
            {/* Player 2 Info - Enhanced */}
            <Card className="p-4 bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary via-secondary/80 to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-background/50">
                      {player2Name[0]}
                    </div>
                    {currentTurn === player2Id && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full animate-pulse ring-2 ring-background" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{player2Name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-foreground/80" />
                      القطع السوداء
                    </div>
                  </div>
                </div>
                <ChessTimer
                  timeInSeconds={player2Time}
                  isActive={gameStarted && currentTurn === player2Id}
                  onTimeUpdate={(time) => setPlayer2Time(time)}
                />
              </div>
            </Card>

            {/* Chess Board with enhanced shadow */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl animate-pulse" />
              <div className="relative">
                <ChessBoard
                  position={boardState}
                  onMove={handleMove}
                  orientation={myColor}
                  isMyTurn={isMyTurn}
                />
              </div>
            </div>

            {/* Player 1 Info - Enhanced */}
            <Card className="p-4 bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg ring-2 ring-background/50">
                      {player1Name[0]}
                    </div>
                    {currentTurn === player1Id && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full animate-pulse ring-2 ring-background" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{player1Name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-foreground/20" />
                      القطع البيضاء
                    </div>
                  </div>
                </div>
                <ChessTimer
                  timeInSeconds={player1Time}
                  isActive={gameStarted && currentTurn === player1Id}
                  onTimeUpdate={(time) => setPlayer1Time(time)}
                />
              </div>
            </Card>
          </div>

          {/* Side Panel - Enhanced */}
          <div className="space-y-4">
            <CapturedPieces capturedPieces={capturedPieces} />
            
            {/* Game Status - Enhanced */}
            <Card className="p-6 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border-border/50">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                حالة اللعبة
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                  <span className="text-muted-foreground">الدور الحالي:</span>
                  <span className={`font-bold px-3 py-1 rounded-full ${
                    currentTurn === currentUserId 
                      ? 'bg-gradient-to-r from-primary to-primary-glow text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentTurn === currentUserId ? 'دورك! 🎯' : 'دور الخصم'}
                  </span>
                </div>
                {chess.isCheck() && (
                  <div className="text-center py-3 px-4 bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive rounded-xl font-bold border border-destructive/30 animate-pulse">
                    ⚠️ كش! احذر الملك
                  </div>
                )}
                {!gameStarted && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/30">
                    <p className="text-sm text-center text-amber-600 dark:text-amber-400 font-semibold">
                      ⏸️ المؤقت سيبدأ بعد أول حركة
                    </p>
                  </div>
                )}
                <div className="mt-4 p-4 bg-gradient-to-br from-primary/10 to-accent/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-center">
                    {isMyTurn ? '🎮 دورك في اللعب' : '⏳ انتظر دور الخصم'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
