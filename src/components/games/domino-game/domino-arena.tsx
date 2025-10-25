import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DominoBoard } from './domino-board';
import { DominoHand } from './domino-hand';
import { ExitConfirmationDialog } from '../exit-confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Download, Trophy } from 'lucide-react';

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
  const [showExitDialog, setShowExitDialog] = useState(false);

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

  const handlePlacePiece = async (side?: 'left' | 'right') => {
    if (!selectedPiece || !isMyTurn) return;

    // ✅ إذا كانت اللوحة فارغة، لا نحتاج لتحديد جهة
    const finalSide = chain.length === 0 ? 'left' : side;
    
    if (!finalSide) {
      toast.error('اختر الجهة التي تريد وضع القطعة فيها');
      return;
    }

    const { data, error } = await supabase.rpc('make_domino_move', {
      p_game_session_id: sessionId,
      p_player_id: currentUserId,
      p_piece: selectedPiece,
      p_side: finalSide
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
      toast.success('فوز! 🎉');
      onGameEnd(result.winner);
    } else {
      toast.success('تم تنفيذ الحركة ✅');
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

  const handleExitClick = () => {
    if (gameStatus === 'playing') {
      setShowExitDialog(true);
    } else {
      onGameEnd(null);
    }
  };

  const handleConfirmExit = async () => {
    try {
      const { data, error } = await supabase.rpc('handle_player_resignation', {
        p_session_id: sessionId,
        p_resigning_player_id: currentUserId
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast.info('تم الخروج من المباراة - تم احتساب الخسارة');
        setTimeout(() => onGameEnd(result.winner_id), 500);
      } else {
        toast.error(result.message || 'فشل في معالجة الخروج');
      }
    } catch (error) {
      console.error('خطأ في الخروج:', error);
      toast.error('حدث خطأ أثناء الخروج من المباراة');
    }
  };

  return (
    <>
      <ExitConfirmationDialog
        isOpen={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirmExit={handleConfirmExit}
        gameName="الدومينو"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-card/30 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <Card className="bg-gradient-to-r from-card/90 via-card/80 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="px-6 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitClick}
              className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              خروج
            </Button>
          </div>
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

            {/* لوحة الأوامر - تظهر عند اختيار قطعة */}
            {selectedPiece && isMyTurn && (
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl border-2 border-primary/30 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-4">
                  <p className="text-sm font-bold text-primary mb-1">✨ قطعة محددة</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-3 py-1 bg-card rounded-lg border border-border">
                      <span className="font-mono text-lg">{selectedPiece.left}</span>
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="px-3 py-1 bg-card rounded-lg border border-border">
                      <span className="font-mono text-lg">{selectedPiece.right}</span>
                    </div>
                  </div>
                </div>

                {chain.length === 0 ? (
                  // إذا كانت اللوحة فارغة
                  <div className="flex justify-center">
                    <Button
                      onClick={() => handlePlacePiece('left')}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white shadow-lg"
                    >
                      <span className="text-xl">🎯</span>
                      ضع القطعة وابدأ اللعب
                    </Button>
                  </div>
                ) : (
                  // إذا كانت هناك قطع على اللوحة
                  <div className="flex gap-3 justify-center flex-wrap">
                    {canPlaceLeft ? (
                      <Button
                        onClick={() => handlePlacePiece('left')}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg min-w-[140px]"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        ضع يسار ({chain[0]?.left})
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        disabled
                        className="gap-2 min-w-[140px] opacity-40"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        يسار ✗
                      </Button>
                    )}

                    {canPlaceRight ? (
                      <Button
                        onClick={() => handlePlacePiece('right')}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg min-w-[140px]"
                      >
                        ضع يمين ({chain[chain.length - 1]?.right})
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        disabled
                        className="gap-2 min-w-[140px] opacity-40"
                      >
                        يمين ✗
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}

                {!canPlaceLeft && !canPlaceRight && chain.length > 0 && (
                  <p className="text-center text-sm text-destructive mt-3 font-medium">
                    ⚠️ هذه القطعة لا يمكن وضعها - اختر قطعة أخرى أو اسحب من البونيارد
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};
