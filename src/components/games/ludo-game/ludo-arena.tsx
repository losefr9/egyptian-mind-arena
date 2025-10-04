import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LudoBoard } from './ludo-board';
import { LudoDice } from './ludo-dice';
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
    <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button onClick={onExit} variant="outline">
            <ArrowLeft className="ml-2" />
            الخروج
          </Button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold">لعبة لودو</h2>
            <p className="text-lg">الرهان: {betAmount} جنيه</p>
          </div>
          
          <div className="w-24" />
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8">
          <LudoBoard
            player1Pieces={match.player1_pieces}
            player2Pieces={match.player2_pieces}
            selectedPiece={selectedPiece}
            onPieceClick={handlePieceClick}
            currentPlayerId={match.current_turn_player_id}
            player1Id={player1Id}
          />

          <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-3xl shadow-xl">
            <h3 className="text-2xl font-bold">النرد</h3>
            
            <LudoDice
              value={match.last_dice_roll}
              onRoll={handleRollDice}
              canRoll={
                match.current_turn_player_id === currentUserId &&
                (match.can_roll_again || match.last_dice_roll === 0)
              }
              isRolling={isRolling}
            />

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                رميات 6 متتالية: {match.consecutive_sixes}/3
              </p>
              {match.consecutive_sixes >= 2 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ احذر! رمية 6 أخرى ستخسرك الدور
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
