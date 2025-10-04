import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DominoBoard } from './domino-board';
import { DominoHand } from './domino-hand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Download } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">لعبة الدومينو</CardTitle>
              <Badge variant="golden" className="text-lg px-4 py-1">
                الرهان: {betAmount} ج.م
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* اللاعب الخصم */}
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{isPlayer1 ? player2Name : player1Name}</h3>
                <p className="text-sm text-muted-foreground">
                  عدد القطع: {opponentHandCount}
                </p>
              </div>
              {!isMyTurn && (
                <Badge variant="default">دوره الآن</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* اللوحة */}
        <DominoBoard
          chain={chain}
          onPlaceLeft={canPlaceLeft ? () => handlePlacePiece('left') : undefined}
          onPlaceRight={canPlaceRight ? () => handlePlacePiece('right') : undefined}
          canPlaceLeft={isMyTurn && canPlaceLeft}
          canPlaceRight={isMyTurn && canPlaceRight}
          selectedPiece={selectedPiece}
        />

        {/* معلومات إضافية */}
        <div className="flex items-center justify-center gap-4">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            البونيارد: {boneyardCount} قطعة
          </Badge>
          {isMyTurn && boneyardCount > 0 && (
            <Button
              onClick={handleDrawFromBoneyard}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 ml-2" />
              سحب من البونيارد
            </Button>
          )}
        </div>

        {/* يد اللاعب */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قطعك ({myHand.length})</CardTitle>
              {isMyTurn && (
                <Badge variant="default">دورك الآن</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DominoHand
              pieces={myHand}
              onPieceSelect={setSelectedPiece}
              selectedPiece={selectedPiece}
              disabled={!isMyTurn}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
