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
import { GameSessionValidator } from '@/components/games/game-session-validator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlinePlayers } from '@/hooks/useOnlinePlayers';
import { toast } from 'sonner';
import { InstallAppButton } from '@/components/ui/install-app-button';
import { GAME_IDS, GAME_NAMES } from '@/constants/games';

type ViewState = 'games' | 'betting' | 'waiting' | 'verifying_data' | 'preparation' | 'playing';

interface Game {
  id: string;
  name: string;
  description: string;
  image_url: string;
  activePlayersCount?: number;
}

interface GameSession {
  id: string;
  game_id: string;
  bet_amount: number;
  player1_id: string;
  player2_id: string;
  status: string;
  prize_amount: number;
  platform_fee_percentage: number;
}

const Games = () => {
  const { user, isLoading, isLoggedIn } = useAuth();
  const { onlinePlayers } = useOnlinePlayers(30000);
  const [viewState, setViewState] = useState<ViewState>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(0);
  const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [isLoadingGame, setIsLoadingGame] = useState(false);

  useEffect(() => {
    fetchGames();
    setupPresenceTracking();

    const refreshInterval = setInterval(() => {
      fetchGames();
    }, 300000);

    const gamesChannel = supabase
      .channel('games-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        () => {
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(gamesChannel);
    };
  }, []);

  // ✅ CRITICAL: التحقق والمزامنة التلقائية + إعادة تحميل الصفحة للتأكد من تحديث cache
  useEffect(() => {
    const verifyAndFetchGameData = async () => {
      if (currentGameSession && currentGameSession.game_id && viewState === 'verifying_data') {
        setIsLoadingGame(true);
        
        const sessionGameId = currentGameSession.game_id;
        console.log('🔍 [SYNC] التحقق من game_id من الجلسة:', sessionGameId);
        console.log('🔍 [SYNC] اسم اللعبة المتوقع:', GAME_NAMES[sessionGameId as keyof typeof GAME_IDS] || 'غير معروف');
        console.log('💰 [SYNC] مبلغ الرهان:', currentGameSession.bet_amount);
        
        try {
          // جلب بيانات اللعبة بناءً على game_id من الجلسة فقط
          const { data: gameData, error: gameError } = await supabase
            .from('games')
            .select('*')
            .eq('id', sessionGameId)
            .single();

          if (gameError) throw gameError;
          if (!gameData) throw new Error('لم يتم العثور على اللعبة');

          // جلب أسماء اللاعبين
          const { data: player1Data } = await supabase.rpc('get_public_username', { 
            user_id_input: currentGameSession.player1_id 
          });
          const { data: player2Data } = await supabase.rpc('get_public_username', { 
            user_id_input: currentGameSession.player2_id 
          });

          setPlayer1Name(player1Data?.[0]?.username || 'لاعب 1');
          setPlayer2Name(player2Data?.[0]?.username || 'لاعب 2');

          // ✅ تحديث selectedGame بناءً على game_id من الجلسة فقط
          console.log('✅ [SYNC] تم التحقق - اللعبة من DB:', gameData.name, '| ID:', gameData.id);
          console.log('👥 [SYNC] اللاعبون:', player1Data?.[0]?.username, 'vs', player2Data?.[0]?.username);
          
          // 🔄 حفظ بيانات الجلسة في sessionStorage لإعادة التحميل
          sessionStorage.setItem('currentGameSession', JSON.stringify(currentGameSession));
          sessionStorage.setItem('selectedGame', JSON.stringify(gameData));
          sessionStorage.setItem('selectedBetAmount', String(currentGameSession.bet_amount));
          
          setSelectedGame(gameData);
          
          // الانتقال لشاشة التحضير بعد 2 ثانية
          setTimeout(() => {
            console.log('✅ [SYNC] البيانات متزامنة - الانتقال لشاشة التحضير');
            setViewState('preparation');
          }, 2000);

        } catch (error) {
          console.error('❌ [SYNC] خطأ في التحقق من بيانات اللعبة:', error);
          toast.error('خطأ في تحميل بيانات المباراة');
          handleBackToGames();
        } finally {
          setIsLoadingGame(false);
        }
      }
    };

    verifyAndFetchGameData();
  }, [currentGameSession?.game_id, viewState]);

  // 🔄 استعادة الجلسة من sessionStorage عند تحميل الصفحة
  useEffect(() => {
    const savedSession = sessionStorage.getItem('currentGameSession');
    const savedGame = sessionStorage.getItem('selectedGame');
    const savedBetAmount = sessionStorage.getItem('selectedBetAmount');
    
    if (savedSession && savedGame && savedBetAmount) {
      console.log('🔄 استعادة الجلسة من sessionStorage');
      setCurrentGameSession(JSON.parse(savedSession));
      setSelectedGame(JSON.parse(savedGame));
      setSelectedBetAmount(Number(savedBetAmount));
      setViewState('preparation');
      
      // مسح البيانات المحفوظة
      sessionStorage.removeItem('currentGameSession');
      sessionStorage.removeItem('selectedGame');
      sessionStorage.removeItem('selectedBetAmount');
    }
  }, []);

  const setupPresenceTracking = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status: 'online',
          current_page: 'games',
          current_game_id: null,
          current_bet_amount: null,
          last_seen: new Date().toISOString(),
          session_start: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      const heartbeatInterval = setInterval(async () => {
        if (user?.id) {
          await supabase
            .from('user_presence')
            .update({
              last_seen: new Date().toISOString(),
              status: 'online'
            })
            .eq('user_id', user.id);
        }
      }, 30000);

      window.addEventListener('beforeunload', async () => {
        await supabase
          .from('user_presence')
          .update({
            status: 'offline',
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id);
      });

      return () => {
        clearInterval(heartbeatInterval);
      };
    } catch (error) {
      console.error('Error setting up presence tracking:', error);
    }
  };

  const fetchGames = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const filteredGames = (gamesData || []).filter(game =>
        !game.name?.toLowerCase().includes('ludo') &&
        !game.name?.toLowerCase().includes('لودو')
      );

      const gamesWithPlayers = filteredGames.map((game) => ({
        ...game,
        activePlayersCount: onlinePlayers.byGame[game.id] || 0
      }));

      setGames(gamesWithPlayers);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    }
  };

  const handleGameSelect = async (game: Game) => {
    setSelectedGame(game);
    setViewState('betting');

    if (user?.id) {
      await supabase
        .from('user_presence')
        .update({
          current_page: 'betting',
          current_game_id: game.id,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }
  };

  const handleBetLevelSelect = async (amount: number) => {
    if (!user || !selectedGame) return;

    setSelectedBetAmount(amount);
    setIsMatchmaking(true);

    if (user?.id) {
      await supabase
        .from('user_presence')
        .update({
          current_bet_amount: amount,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

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

        console.log('🎮 تم العثور على خصم - بدء التحقق من البيانات');
        setCurrentGameSession(sessionData);
        setViewState('verifying_data');
        toast.success('تم العثور على خصم! جاري التحقق من بيانات المباراة...');
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
              console.log('🎮 تم العثور على خصم من شاشة الانتظار - بدء التحقق');
              setCurrentGameSession(gameSession);
              setViewState('verifying_data');
            }}
          />
        ) : null;
      
      case 'verifying_data':
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
            <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl">
              <CardContent className="p-8 text-center space-y-6">
                <div className="animate-spin h-16 w-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <h3 className="text-2xl font-bold">جاري التحقق من البيانات</h3>
                <p className="text-muted-foreground">
                  يتم التأكد من معلومات المباراة واللاعبين...
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ التحقق من نوع اللعبة</p>
                  <p>✓ التحقق من مبلغ الرهان</p>
                  <p>✓ جلب بيانات اللاعبين</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
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
        if (!currentGameSession) {
          console.error('❌ [RENDER] لا توجد جلسة لعب');
          return null;
        }

        // عرض شاشة التحميل أثناء جلب اللعبة
        if (isLoadingGame || !selectedGame) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Card className="p-8 text-center">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg font-semibold">جاري تحميل اللعبة...</p>
              </Card>
            </div>
          );
        }

        const sessionGameId = currentGameSession.game_id;
        
        console.log('🎮 [RENDER] معرف اللعبة من الجلسة:', sessionGameId);
        console.log('🎮 [RENDER] اسم اللعبة المتوقع:', GAME_NAMES[sessionGameId as keyof typeof GAME_IDS]);

        // ✅ CRITICAL FIX: استخدام game_id فقط بدلاً من selectedGame.name
        // المصدر الوحيد للحقيقة هو currentGameSession.game_id
        
        if (sessionGameId === GAME_IDS.XO) {
          console.log('▶️ [RENDER] تشغيل لعبة XO - game_id:', GAME_IDS.XO);
          return (
            <XORaceArena
              gameSession={currentGameSession}
              onExit={handleExitGame}
            />
          );
        } 
        
        if (sessionGameId === GAME_IDS.CHESS) {
          console.log('▶️ [RENDER] تشغيل لعبة الشطرنج - game_id:', GAME_IDS.CHESS);
          const ChessArenaLazy = React.lazy(() => 
            import('@/components/games/chess-game/chess-arena').then(m => ({ default: m.ChessArena }))
          );
          
          return (
            <React.Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-lg">جاري تحميل لعبة الشطرنج...</p>
                </div>
              </div>
            }>
              <ChessArenaLazy
                sessionId={currentGameSession.id}
                currentUserId={user!.id}
                player1Id={currentGameSession.player1_id}
                player2Id={currentGameSession.player2_id}
                betAmount={currentGameSession.bet_amount}
                onGameEnd={async (winnerId) => {
                  if (winnerId) {
                    await supabase.rpc('calculate_match_earnings', {
                      session_id: currentGameSession.id,
                      winner_user_id: winnerId
                    });
                  } else {
                    await supabase.rpc('handle_draw_match', {
                      session_id: currentGameSession.id
                    });
                  }
                  handleExitGame();
                }}
              />
            </React.Suspense>
          );
        } 
        
        if (sessionGameId === GAME_IDS.DOMINO) {
          console.log('▶️ [RENDER] تشغيل لعبة الدومينو - game_id:', GAME_IDS.DOMINO);
          const DominoArenaLazy = React.lazy(() => 
            import('@/components/games/domino-game/domino-arena').then(m => ({ default: m.DominoArena }))
          );
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>}>
              <DominoArenaLazy
                sessionId={currentGameSession.id}
                currentUserId={user!.id}
                player1Id={currentGameSession.player1_id}
                player2Id={currentGameSession.player2_id}
                betAmount={currentGameSession.bet_amount}
                onGameEnd={async (winnerId) => {
                  if (winnerId) {
                    await supabase.rpc('calculate_match_earnings', {
                      session_id: currentGameSession.id,
                      winner_user_id: winnerId
                    });
                  } else {
                    await supabase.rpc('handle_draw_match', {
                      session_id: currentGameSession.id
                    });
                  }
                  handleExitGame();
                }}
              />
            </React.Suspense>
          );
        }

        // ❌ لعبة غير معروفة - game_id غير موجود في GAME_IDS
        console.error('❌ [RENDER] لعبة غير معروفة - game_id:', sessionGameId);
        console.error('❌ [RENDER] الألعاب المتاحة:', Object.entries(GAME_IDS));
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Card className="p-6">
              <p>خطأ: اللعبة غير معروفة</p>
              <p className="text-xs text-muted-foreground mt-2">معرف اللعبة: {sessionGameId}</p>
            </Card>
          </div>
        );
      
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
                      <span className="font-semibold">لاعبين في انتظار المباريات:</span>
                    </div>
                    <Badge variant="golden" className="text-lg px-4 py-1">
                      <Users className="h-4 w-4 mr-1" />
                      {onlinePlayers.total}
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