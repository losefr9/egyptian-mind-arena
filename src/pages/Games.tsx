import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Crown,
  Trophy,
  Zap,
  Gamepad2
} from 'lucide-react';
import { GameCard } from '@/components/games/game-card';
import { BettingLevels } from '@/components/games/betting-levels';
import { WaitingScreen } from '@/components/games/waiting-screen';
import { XORaceArena } from '@/components/games/xo-game/xo-race-arena';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ViewState = 'games' | 'betting' | 'waiting' | 'playing';

interface Game {
  id: string;
  name: string;
  description: string;
  image_url: string;
  activePlayersCount?: number;
}

interface GameSession {
  id: string;
  bet_amount: number;
  player1_id: string;
  player2_id: string;
  status: string;
  prize_amount: number;
  platform_fee_percentage: number;
}

const Games = () => {
  const { user, isLoading, isLoggedIn } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [totalActivePlayers, setTotalActivePlayers] = useState(0);
  const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // حساب عدد اللاعبين النشطين الحقيقي
      const { data: activeSessions } = await supabase
        .from('game_sessions')
        .select('game_id')
        .in('status', ['waiting', 'in_progress']);

      const gamesWithPlayers = gamesData?.map((game) => {
        const activeCount = activeSessions?.filter(session => session.game_id === game.id).length || 0;
        return {
          ...game,
          activePlayersCount: activeCount
        };
      }) || [];

      setGames(gamesWithPlayers);
      
      // حساب إجمالي اللاعبين النشطين
      const total = gamesWithPlayers.reduce((sum, game) => sum + (game.activePlayersCount || 0), 0);
      setTotalActivePlayers(total);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
      setTotalActivePlayers(0);
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setViewState('betting');
  };

  const handleBetLevelSelect = async (amount: number) => {
    if (!user || !selectedGame) return;

    setSelectedBetAmount(amount);
    setIsMatchmaking(true);
    
    try {
      // استخدام الدالة المحسنة للماتشينق السريع
      const { data: matchResult, error: matchError } = await supabase.rpc(
        'find_match_and_create_session_v3',
        {
          p_user_id: user.id,
          p_game_id: selectedGame.id,
          p_bet_amount: amount
        }
      );

      if (matchError) throw matchError;

      const result = matchResult[0] || matchResult;

      if (!result.success) {
        toast.error(result.message || 'خطأ في الماتشينق');
        return;
      }

      if (result.action === 'queued') {
        // تم إضافة اللاعب لقائمة الانتظار
        toast.success('تم إضافتك لقائمة الانتظار - جاري البحث عن خصم...');
        
        // إنشاء جلسة مؤقتة للانتظار
        const tempSession = {
          id: 'temp-' + Date.now(),
          game_id: selectedGame.id,
          player1_id: user.id,
          player2_id: null,
          bet_amount: amount,
          status: 'waiting',
          prize_amount: amount * 2,
          platform_fee_percentage: 10
        };
        
        setCurrentGameSession(tempSession);
        setViewState('waiting');
      } else if (result.action === 'matched') {
        // تم العثور على خصم - الحصول على بيانات الجلسة
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', result.session_id)
          .single();

        if (sessionError) throw sessionError;

        setCurrentGameSession(sessionData);
        setViewState('playing');
        toast.success('تم العثور على خصم! جاري بدء المباراة...');
      }

      // تسجيل النشاط
      if (result.session_id) {
        await supabase
          .from('player_match_activities')
          .insert({
            user_id: user.id,
            game_session_id: result.session_id,
            activity_type: 'game_joined',
            activity_details: { 
              bet_amount: amount, 
              game_name: selectedGame.name,
              action: result.action
            }
          });
      }

    } catch (error) {
      console.error('Error in matchmaking:', error);
      toast.error('خطأ في البحث عن مباراة');
    } finally {
      setIsMatchmaking(false);
    }
  };

  const handleBackToGames = () => {
    setViewState('games');
    setSelectedGame(null);
    setSelectedBetAmount(0);
    setCurrentGameSession(null);
  };

  const handleBackToBetting = () => {
    setViewState('betting');
    setSelectedBetAmount(0);
    setCurrentGameSession(null);
  };

  const handleExitGame = () => {
    setViewState('games');
    setSelectedGame(null);
    setSelectedBetAmount(0);
    setCurrentGameSession(null);
    fetchGames(); // تحديث البيانات
  };

  const renderContent = () => {
    switch (viewState) {
      case 'betting':
        return selectedGame ? (
          <BettingLevels
            gameName={selectedGame.name}
            gameId={selectedGame.id}
            onLevelSelect={handleBetLevelSelect}
            onBack={handleBackToGames}
          />
        ) : null;
      
      case 'waiting':
        return selectedGame && currentGameSession ? (
          <WaitingScreen
            betAmount={selectedBetAmount}
            gameName={selectedGame.name}
            gameSessionId={currentGameSession.id}
            onCancel={handleBackToBetting}
            onMatchFound={(gameSession) => {
              setCurrentGameSession(gameSession);
              setViewState('playing');
            }}
          />
        ) : null;
      
      case 'playing':
        return currentGameSession ? (
          <XORaceArena
            gameSession={currentGameSession}
            onExit={handleExitGame}
          />
        ) : null;
      
      default:
        return (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                راهن على نفسك وليس على الحظ واربح
              </h1>
              
              <Card className="inline-block bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary animate-pulse" />
                      <span className="font-semibold">اللاعبون النشطون:</span>
                    </div>
                    <Badge variant="golden" className="text-lg px-4 py-1">
                      <Users className="h-4 w-4 ml-1" />
                      {totalActivePlayers.toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.length > 0 ? (
                games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleGameSelect(game)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد ألعاب متاحة حالياً</h3>
                  <p className="text-muted-foreground">سيتم إضافة المزيد من الألعاب قريباً</p>
                </div>
              )}
            </div>
            
            <div className="mt-12 text-center">
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-8">
                  <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-4">ألعاب قريباً</h3>
                  <p className="text-muted-foreground mb-6">
                    المزيد من الألعاب الشيقة قادمة قريباً. كن من أول المشاركين!
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        );
    }
  };

  return (
    <main className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {renderContent()}
      </div>
    </main>
  );
};

export default Games;