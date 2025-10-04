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
  const [player1Time, setPlayer1Time] = useState(600); // 10 minutes
  const [player2Time, setPlayer2Time] = useState(600);
  const [currentTurn, setCurrentTurn] = useState<string>(player1Id);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[], black: string[] }>({ white: [], black: [] });
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
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
    const { data, error } = await supabase
      .from('chess_matches')
      .select('*')
      .eq('game_session_id', sessionId)
      .single();

    if (data && !error) {
      chess.load(data.board_state);
      setBoardState(data.board_state);
      setPlayer1Time(data.player1_time_remaining);
      setPlayer2Time(data.player2_time_remaining);
      setCurrentTurn(data.current_turn_player_id);
      updateCapturedPieces(data.move_history || []);
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

  const handleMove = async (from: string, to: string) => {
    if (!isMyTurn) {
      toast({
        title: "ليس دورك",
        description: "انتظر دورك للعب",
        variant: "destructive"
      });
      return false;
    }

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) return false;

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

      const { data, error } = await supabase.rpc('make_chess_move', {
        p_game_session_id: sessionId,
        p_player_id: currentUserId,
        p_from: from,
        p_to: to,
        p_board_state: newBoardState,
        p_move_data: moveData
      });

      if (error) {
        chess.undo();
        toast({
          title: "خطأ",
          description: "فشل في تنفيذ الحركة",
          variant: "destructive"
        });
        return false;
      }

      // Check for checkmate or stalemate
      if (chess.isCheckmate()) {
        await handleGameEnd('checkmate');
      } else if (chess.isStalemate() || chess.isDraw()) {
        await handleGameEnd('draw');
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  const handleGameEnd = async (status: string) => {
    let winnerId = null;
    
    if (status === 'checkmate') {
      winnerId = currentTurn === player1Id ? player2Id : player1Id;
      toast({
        title: "كش مات! 🎉",
        description: winnerId === currentUserId ? "مبروك! لقد فزت!" : "خسرت المباراة",
      });
    } else if (status === 'timeout') {
      winnerId = player1Time <= 0 ? player2Id : player1Id;
      toast({
        title: "انتهى الوقت ⏰",
        description: winnerId === currentUserId ? "فزت بسبب نفاد وقت الخصم" : "نفد وقتك",
      });
    } else if (status === 'draw') {
      toast({
        title: "تعادل",
        description: "انتهت المباراة بالتعادل",
      });
    }

    onGameEnd(winnerId);
  };

  const handleTimeUpdate = async (p1Time: number, p2Time: number) => {
    await supabase.rpc('update_chess_timer', {
      p_game_session_id: sessionId,
      p_player1_time: p1Time,
      p_player2_time: p2Time
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">الرهان: {betAmount} جنيه</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">مباراة شطرنج</span>
            </div>
          </div>
        </Card>

        {/* Game Board */}
        <div className="grid md:grid-cols-[1fr_400px] gap-4">
          {/* Main Board */}
          <div className="space-y-4">
            {/* Player 2 Info */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white font-bold">
                    {player2Name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{player2Name}</div>
                    <div className="text-xs text-muted-foreground">القطع السوداء</div>
                  </div>
                </div>
                <ChessTimer
                  timeInSeconds={player2Time}
                  isActive={currentTurn === player2Id}
                  onTimeUpdate={(time) => setPlayer2Time(time)}
                />
              </div>
            </Card>

            {/* Chess Board */}
            <ChessBoard
              position={boardState}
              onMove={handleMove}
              orientation={myColor}
              isMyTurn={isMyTurn}
            />

            {/* Player 1 Info */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                    {player1Name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{player1Name}</div>
                    <div className="text-xs text-muted-foreground">القطع البيضاء</div>
                  </div>
                </div>
                <ChessTimer
                  timeInSeconds={player1Time}
                  isActive={currentTurn === player1Id}
                  onTimeUpdate={(time) => setPlayer1Time(time)}
                />
              </div>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            <CapturedPieces capturedPieces={capturedPieces} />
            
            {/* Game Status */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-bold mb-3">حالة اللعبة</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدور:</span>
                  <span className="font-bold text-primary">
                    {currentTurn === currentUserId ? 'دورك' : 'دور الخصم'}
                  </span>
                </div>
                {chess.isCheck() && (
                  <div className="text-center py-2 px-3 bg-destructive/20 text-destructive rounded-lg font-bold">
                    كش! 👑
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
