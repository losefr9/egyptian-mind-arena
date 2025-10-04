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
import { MatchPreparationScreen } from '@/components/games/match-preparation-screen';
import { XORaceArena } from '@/components/games/xo-game/xo-race-arena';
import { ChessArena } from '@/components/games/chess-game/chess-arena';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { InstallAppButton } from '@/components/ui/install-app-button';

type ViewState = 'games' | 'betting' | 'waiting' | 'preparation' | 'playing';

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
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(0);
  const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  useEffect(() => {
    fetchGames();
    setupPresenceTracking();
  }, []);

  const setupPresenceTracking = () => {
    const channel = supabase.channel('online-players');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlinePlayersCount(count);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New players joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Players left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user?.id) {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchGames = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setGames(gamesData || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
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
            onMatchFound={async (gameSession) => {
              setCurrentGameSession(gameSession);
              
              // جلب أسماء اللاعبين
              const { data: player1Data } = await supabase.rpc('get_public_username', { 
                user_id_input: gameSession.player1_id 
              });
              const { data: player2Data } = await supabase.rpc('get_public_username', { 
                user_id_input: gameSession.player2_id 
              });

              setPlayer1Name(player1Data?.[0]?.username || 'لاعب 1');
              setPlayer2Name(player2Data?.[0]?.username || 'لاعب 2');
              
              // الانتقال لشاشة التحضير لمدة 5 ثواني
              setViewState('preparation');
            }}
          />
        ) : null;
      
      case 'preparation':
        return selectedGame && currentGameSession ? (
          <MatchPreparationScreen
            player1Name={player1Name}
            player2Name={player2Name}
            betAmount={selectedBetAmount}
            gameName={selectedGame.name}
            onComplete={() => setViewState('playing')}
          />
        ) : null;
      
      case 'playing':
        if (!currentGameSession || !selectedGame) return null;
        
        if (selectedGame.name === 'XO Game') {
          return (
            <XORaceArena
              gameSession={currentGameSession}
              onExit={handleExitGame}
            />
          );
        } else if (selectedGame.name === 'Chess') {
          return (
            <ChessArena
              sessionId={currentGameSession.id}
              currentUserId={user!.id}
              player1Id={currentGameSession.player1_id}
              player2Id={currentGameSession.player2_id}
              betAmount={currentGameSession.bet_amount}
              onGameEnd={async (winnerId) => {
                // معالجة نهاية اللعبة
                if (winnerId) {
                  await supabase.rpc('calculate_match_earnings', {
                    session_id: currentGameSession.id,
                    winner_user_id: winnerId
                  });
                } else {
                  // تعادل
                  await supabase.rpc('handle_draw_match', {
                    session_id: currentGameSession.id
                  });
                }
                handleExitGame();
              }}
            />
          );
        }
        
        return null;
      
      default:
        return (
          <>
            <div className="mb-8 text-center space-y-4">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                راهن على نفسك وليس على الحظ واربح
              </h1>
              
              <InstallAppButton />
              
              <Card className="inline-block bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="h-3 w-3 bg-success rounded-full animate-pulse" />
                        <div className="absolute inset-0 h-3 w-3 bg-success rounded-full animate-ping opacity-75" />
                      </div>
                      <span className="font-semibold">متصل الآن:</span>
                    </div>
                    <Badge variant="golden" className="text-lg px-4 py-1">
                      <Users className="h-4 w-4 ml-1" />
                      {onlinePlayersCount.toLocaleString()}
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