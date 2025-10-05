import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DominoBoard } from './domino-board';
import { DominoHand } from './domino-hand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trophy } from 'lucide-react';

interface DominoArenaProps {
  sessionId: string;
  currentUserId: string;
  player1Id: string;
  player2Id: string;
  betAmount: number;
  onGameEnd: (winnerId: string | null) => void;
}

export const DominoArena: React.FC<DominoArenaProps> = ({
  sessionId,
  currentUserId,
  player1Id,
  player2Id,
  betAmount,
  onGameEnd
}) => {
  const [matchData, setMatchData] = useState<any>(null);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [opponentHandCount, setOpponentHandCount] = useState(7);
  const [chain, setChain] = useState<any[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);
  const [boneyardCount, setBoneyardCount] = useState(14);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameStatus, setGameStatus] = useState('playing');
  const [player1Name, setPlayer1Name] = useState('لاعب 1');
  const [player2Name, setPlayer2Name] = useState('لاعب 2');

  const isPlayer1 = currentUserId === player1Id;

  useEffect(() => {
    fetchGameData();
    fetchPlayerNames();
    setupRealtimeSubscription();
  }, []);

  const fetchPlayerNames = async () => {
    const { data: p1Data } = await supabase.rpc('get_public_username', {
      user_id_input: player1Id
    });
    const { data: p2Data } = await supabase.rpc('get_public_username', {
      user_id_input: player2Id
    });

    setPlayer1Name(p1Data?.[0]?.username || 'لاعب 1');
    setPlayer2Name(p2Data?.[0]?.username || 'لاعب 2');
  };

  const fetchGameData = async () => {
    const { data, error } = await supabase
      .from('domino_matches')
      .select('*')
      .eq('game_session_id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching game:', error);
      // إنشاء مباراة جديدة
      await initializeMatch();
      return;
    }

    updateGameState(data);
  };

  const initializeMatch = async () => {
    // إنشاء سجل المباراة
    const { data: newMatch, error: createError } = await supabase
      .from('domino_matches')
      .insert({
        game_session_id: sessionId,
        current_turn_player_id: player1Id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating match:', createError);
      toast.error('فشل في إنشاء المباراة');
      return;
    }

    // توزيع القطع
    const { data: dealResult, error: dealError } = await supabase.rpc(
      'shuffle_and_deal_dominos',
      { p_game_session_id: sessionId }
    );

    if (dealError) {
      console.error('Error dealing:', dealError);
      toast.error('فشل في توزيع القطع');
      return;
    }

    toast.success('تم بدء اللعبة!');
    fetchGameData();
  };

  const updateGameState = (data: any) => {
    setMatchData(data);
    setChain(data.board_chain || []);
    setIsMyTurn(data.current_turn_player_id === currentUserId);
    setGameStatus(data.match_status);
    setBoneyardCount((data.boneyard || []).length);

    if (isPlayer1) {
      setMyHand(data.player1_hand || []);
      setOpponentHandCount((data.player2_hand || []).length);
    } else {
      setMyHand(data.player2_hand || []);
      setOpponentHandCount((data.player1_hand || []).length);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`domino-match-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'domino_matches',
          filter: `game_session_id=eq.${sessionId}`
        },
        (payload) => {
          updateGameState(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const canPlacePiece = (piece: any, side: 'left' | 'right') => {
    if (chain.length === 0) return true;

    const chainLeft = chain[0]?.left;
    const chainRight = chain[chain.length - 1]?.right;

    if (side === 'left') {
      return piece.left === chainLeft || piece.right === chainLeft;
    } else {
      return piece.left === chainRight || piece.right === chainRight;
    }
  };

  const handlePlacePiece = async (side: 'left' | 'right') => {
    if (!selectedPiece || !isMyTurn) return;

    const { data, error } = await supabase.rpc('make_domino_move', {
      p_game_session_id: sessionId,
      p_player_id: currentUserId,
      p_piece: selectedPiece,
      p_side: side
    });

    if (error) {
      console.error('Error making move:', error);
      toast.error('فشل في تنفيذ الحركة');
      return;
    }

    const result = data as any;
    
    if (!result?.success) {
      toast.error(result?.error || 'حركة غير صالحة');
      return;
    }

    if (result?.winner) {
      toast.success('فوز!');
      onGameEnd(result.winner);
    } else {
      toast.success('تم تنفيذ الحركة');
    }

    setSelectedPiece(null);
  };

  const handleDrawFromBoneyard = async () => {
    if (!isMyTurn) return;

    const { data, error } = await supabase.rpc('draw_from_boneyard', {
      p_game_session_id: sessionId,
      p_player_id: currentUserId
    });

    if (error) {
      console.error('Error drawing:', error);
      toast.error('فشل في السحب');
      return;
    }

    const result = data as any;
    
    if (!result?.success) {
      toast.error(result?.error || 'لا يمكن السحب');
      return;
    }

    toast.success('تم سحب قطعة جديدة');
  };

  const canPlaceLeft = selectedPiece && canPlacePiece(selectedPiece, 'left');
  const canPlaceRight = selectedPiece && canPlacePiece(selectedPiece, 'right');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-card/30 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <Card className="bg-gradient-to-r from-card/90 via-card/80 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary to-primary-glow rounded-xl">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    🎴 لعبة الدومينو
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">تحدي استراتيجي</p>
                </div>
              </div>
              <Badge variant="golden" className="text-lg px-6 py-2 shadow-lg">
                💰 الرهان: {betAmount} ج.م
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* اللاعب الخصم - Enhanced */}
        <Card className="bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary via-secondary/80 to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-background/50">
                    {(isPlayer1 ? player2Name : player1Name)[0]}
                  </div>
                  {!isMyTurn && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full animate-pulse ring-2 ring-background" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{isPlayer1 ? player2Name : player1Name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    🎴 عدد القطع: <span className="font-bold text-foreground">{opponentHandCount}</span>
                  </p>
                </div>
              </div>
              {!isMyTurn && (
                <Badge variant="default" className="bg-gradient-to-r from-primary to-primary-glow animate-pulse">
                  ⏳ دوره الآن
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* اللوحة - Enhanced with glow effect */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-xl" />
          <div className="relative">
            <DominoBoard
              chain={chain}
              onPlaceLeft={canPlaceLeft ? () => handlePlacePiece('left') : undefined}
              onPlaceRight={canPlaceRight ? () => handlePlacePiece('right') : undefined}
              canPlaceLeft={isMyTurn && canPlaceLeft}
              canPlaceRight={isMyTurn && canPlaceRight}
              selectedPiece={selectedPiece}
            />
          </div>
        </div>

        {/* معلومات إضافية - Enhanced */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">{boneyardCount}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البونيارد</p>
                  <p className="text-sm font-semibold">قطعة متبقية</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {isMyTurn && boneyardCount > 0 && (
            <Button
              onClick={handleDrawFromBoneyard}
              variant="outline"
              size="lg"
              className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            >
              <Download className="h-5 w-5" />
              سحب من البونيارد
            </Button>
          )}
        </div>

        {/* يد اللاعب - Enhanced */}
        <Card className="bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                  {(isPlayer1 ? player1Name : player2Name)[0]}
                </div>
                <div>
                  <CardTitle className="text-lg">قطعك ({myHand.length})</CardTitle>
                  <p className="text-xs text-muted-foreground">اختر قطعة للعب</p>
                </div>
              </div>
              {isMyTurn && (
                <Badge variant="default" className="bg-gradient-to-r from-success to-success/80 animate-pulse">
                  🎮 دورك الآن
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              {isMyTurn && (
                <div className="absolute -inset-2 bg-gradient-to-r from-success/10 to-primary/10 rounded-xl blur-lg" />
              )}
              <div className="relative">
                <DominoHand
                  pieces={myHand}
                  onPieceSelect={setSelectedPiece}
                  selectedPiece={selectedPiece}
                  disabled={!isMyTurn}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
