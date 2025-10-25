import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LudoBoard } from './ludo-board';
import { LudoDice } from './ludo-dice';
import { ExitConfirmationDialog } from '../exit-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import Confetti from 'react-confetti';

interface LudoArenaProps {
  sessionId: string;
  currentUserId: string;
  player1Id: string;
  player2Id: string;
  betAmount: number;
  onExit: () => void;
}

interface Piece {
  id: string;
  position: number;
  inHome: boolean;
  isFinished: boolean;
}

interface LudoMatch {
  id: string;
  player1_pieces: Piece[];
  player2_pieces: Piece[];
  current_turn_player_id: string;
  last_dice_roll: number;
  can_roll_again: boolean;
  match_status: string;
  consecutive_sixes: number;
}

export const LudoArena: React.FC<LudoArenaProps> = ({
  sessionId,
  currentUserId,
  player1Id,
  player2Id,
  betAmount,
  onExit
}) => {
  const { toast } = useToast();
  const [match, setMatch] = useState<LudoMatch | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    initializeMatch();
    subscribeToMatch();
  }, [sessionId]);

  const initializeMatch = async () => {
    const { data: existingMatch } = await supabase
      .from('ludo_matches')
      .select('*')
      .eq('game_session_id', sessionId)
      .single();

    if (!existingMatch) {
      const { data: newMatch, error } = await supabase
        .from('ludo_matches')
        .insert({
          game_session_id: sessionId,
          current_turn_player_id: player1Id
        })
        .select()
        .single();

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        return;
      }
      setMatch({
        ...newMatch,
        player1_pieces: newMatch.player1_pieces as any as Piece[],
        player2_pieces: newMatch.player2_pieces as any as Piece[]
      });
    } else {
      setMatch({
        ...existingMatch,
        player1_pieces: existingMatch.player1_pieces as any as Piece[],
        player2_pieces: existingMatch.player2_pieces as any as Piece[]
      });
      if (existingMatch.match_status === 'finished') {
        const { data: session } = await supabase
          .from('game_sessions')
          .select('winner_id')
          .eq('id', sessionId)
          .single();
        if (session?.winner_id) {
          setWinner(session.winner_id);
          setShowConfetti(true);
        }
      }
    }
  };

  const subscribeToMatch = () => {
    const channel = supabase
      .channel(`ludo-match-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ludo_matches',
          filter: `game_session_id=eq.${sessionId}`
        },
        (payload) => {
      if (payload.new) {
            const newData = payload.new as any;
            setMatch({
              ...newData,
              player1_pieces: newData.player1_pieces as Piece[],
              player2_pieces: newData.player2_pieces as Piece[]
            });
            
            const newMatch = payload.new as any;
            if (newMatch.match_status === 'finished') {
              checkWinner();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkWinner = async () => {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('winner_id, winner_earnings')
      .eq('id', sessionId)
      .single();

    if (session?.winner_id) {
      setWinner(session.winner_id);
      setShowConfetti(true);
      
      toast({
        title: session.winner_id === currentUserId ? '🎉 فوز!' : '😔 خسارة',
        description: session.winner_id === currentUserId 
          ? `لقد فزت بمبلغ ${session.winner_earnings} جنيه!`
          : 'حظ أفضل المرة القادمة',
        duration: 5000
      });
    }
  };

  const handleRollDice = async () => {
    if (!match || match.current_turn_player_id !== currentUserId) return;

    setIsRolling(true);
    const result = await supabase.rpc('roll_ludo_dice', {
      p_game_session_id: sessionId,
      p_player_id: currentUserId
    }) as any;

    setIsRolling(false);

    if (result.data?.success) {
      if (result.data.lostTurn) {
        toast({
          title: 'خسرت الدور!',
          description: result.data.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: `رميت ${result.data.dice}`,
          description: result.data.canRollAgain ? 'يمكنك الرمي مرة أخرى!' : 'اختر قطعة للتحريك',
        });
      }
    }
  };

  const handlePieceClick = async (pieceId: string) => {
    if (!match || match.current_turn_player_id !== currentUserId || match.last_dice_roll === 0) {
      return;
    }

    setSelectedPiece(pieceId);

    const result = await supabase.rpc('move_ludo_piece', {
      p_game_session_id: sessionId,
      p_player_id: currentUserId,
      p_piece_id: pieceId,
      p_dice_roll: match.last_dice_roll
    }) as any;

    if (result.data?.success) {
      if (result.data.winner) {
        await supabase.rpc('calculate_match_earnings', {
          session_id: sessionId,
          winner_user_id: result.data.winner
        });
      }
      setSelectedPiece(null);
      toast({ title: 'تم!', description: result.data.message });
    } else {
      toast({
        title: 'خطأ',
        description: result.data?.error || 'فشل في تنفيذ الحركة',
        variant: 'destructive'
      });
    }
  };

  const handleExitClick = () => {
    if (!winner) {
      setShowExitDialog(true);
    } else {
      onExit();
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
        toast({
          title: 'تم الخروج',
          description: 'تم احتساب المباراة كخسارة',
          duration: 2000
        });
        setTimeout(() => onExit(), 500);
      } else {
        toast({
          title: 'خطأ',
          description: result.message || 'فشل في معالجة الخروج',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('خطأ في الخروج:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الخروج',
        variant: 'destructive'
      });
    }
  };

  if (!match) {
    return <div className="text-center p-8">جاري التحميل...</div>;
  }

  if (winner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-yellow-100 to-orange-100">
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <Trophy className="w-32 h-32 mx-auto mb-6 text-yellow-500" />
          
          <h1 className="text-5xl font-bold mb-4">
            {winner === currentUserId ? '🎉 فوز!' : '😔 خسارة'}
          </h1>
          
          <p className="text-2xl mb-8">
            {winner === currentUserId 
              ? `لقد فزت بمبلغ ${betAmount * 1.8} جنيه!`
              : 'حظ أفضل المرة القادمة'}
          </p>

          <Button onClick={onExit} size="lg" className="text-xl px-8">
            <ArrowLeft className="ml-2" />
            العودة للألعاب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExitConfirmationDialog
        isOpen={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirmExit={handleConfirmExit}
        gameName="لودو"
      />

      <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-background dark:via-card/20 dark:to-background">
      <div className="max-w-7xl mx-auto">
        {/* Header - Enhanced */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <Button onClick={handleExitClick} variant="outline" className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
            <ArrowLeft className="h-4 w-4" />
            خروج
          </Button>
          
          <div className="text-center bg-white dark:bg-card/50 px-8 py-4 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/20">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎲 لعبة لودو
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-lg font-semibold">الرهان: {betAmount} جنيه</p>
            </div>
          </div>
          
          <div className="w-24 hidden md:block" />
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8">
          {/* Enhanced Board */}
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-xl" />
            <div className="relative">
              <LudoBoard
                player1Pieces={match.player1_pieces}
                player2Pieces={match.player2_pieces}
                selectedPiece={selectedPiece}
                onPieceClick={handlePieceClick}
                currentPlayerId={match.current_turn_player_id}
                player1Id={player1Id}
              />
            </div>
          </div>

          {/* Dice Panel - Enhanced */}
          <div className="flex flex-col items-center gap-6 bg-white dark:bg-card/50 p-8 rounded-3xl shadow-2xl backdrop-blur-sm border border-primary/10">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                🎲 النرد
              </h3>
              <p className="text-sm text-muted-foreground">
                {match.current_turn_player_id === currentUserId ? 'دورك!' : 'دور الخصم'}
              </p>
            </div>
            
            <div className="relative">
              {match.current_turn_player_id === currentUserId && (
                <div className="absolute -inset-3 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-lg animate-pulse" />
              )}
              <div className="relative">
                <LudoDice
                  value={match.last_dice_roll}
                  onRoll={handleRollDice}
                  canRoll={
                    match.current_turn_player_id === currentUserId &&
                    (match.can_roll_again || match.last_dice_roll === 0)
                  }
                  isRolling={isRolling}
                />
              </div>
            </div>

            {/* Stats Panel */}
            <div className="w-full space-y-4 mt-4">
              <div className="bg-gradient-to-br from-primary/10 to-accent/5 p-4 rounded-xl border border-primary/20">
                <p className="text-sm font-semibold text-center mb-2">إحصائيات النرد</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">رميات 6 متتالية:</span>
                  <span className={`font-bold ${match.consecutive_sixes >= 2 ? 'text-destructive' : 'text-primary'}`}>
                    {match.consecutive_sixes}/3
                  </span>
                </div>
              </div>
              
              {match.consecutive_sixes >= 2 && (
                <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg animate-pulse">
                  <p className="text-xs text-destructive text-center font-semibold">
                    ⚠️ احذر! رمية 6 أخرى ستخسرك الدور
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
