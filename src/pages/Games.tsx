import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Crown,
  Trophy,
  Zap
} from 'lucide-react';
import { GameCard } from '@/components/games/game-card';
import { BettingLevels } from '@/components/games/betting-levels';
import { WaitingScreen } from '@/components/games/waiting-screen';
import { supabase } from '@/integrations/supabase/client';

type ViewState = 'games' | 'betting' | 'waiting';

interface Game {
  id: string;
  name: string;
  description: string;
  image_url: string;
  activePlayersCount?: number;
}

const Games = () => {
  const [viewState, setViewState] = useState<ViewState>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [totalActivePlayers, setTotalActivePlayers] = useState(0);

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

      // Simulate active players count for demo
      const gamesWithPlayers = gamesData?.map((game, index) => ({
        ...game,
        activePlayersCount: [245, 180, 320, 156][index] || Math.floor(Math.random() * 200) + 50
      })) || [];

      setGames(gamesWithPlayers);
      
      // Calculate total active players
      const total = gamesWithPlayers.reduce((sum, game) => sum + (game.activePlayersCount || 0), 0);
      setTotalActivePlayers(total);
    } catch (error) {
      console.error('Error fetching games:', error);
      // Fallback to demo data
      const demoGames = [
        {
          id: '1',
          name: 'الشطرنج المصري',
          description: 'لعبة الشطرنج الكلاسيكية بنكهة مصرية',
          image_url: '/api/placeholder/150/150',
          activePlayersCount: 245
        },
        {
          id: '2',
          name: 'الداما الذكية',
          description: 'لعبة الداما مع تحديات ذكية',
          image_url: '/api/placeholder/150/150',
          activePlayersCount: 180
        },
        {
          id: '3',
          name: 'الذكاء السريع',
          description: 'أسئلة ذكاء وتفكير منطقي',
          image_url: '/api/placeholder/150/150',
          activePlayersCount: 320
        },
        {
          id: '4',
          name: 'بلوت الاستراتيجية',
          description: 'لعبة البلوت مع عنصر الاستراتيجية',
          image_url: '/api/placeholder/150/150',
          activePlayersCount: 156
        }
      ];
      setGames(demoGames);
      setTotalActivePlayers(901);
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setViewState('betting');
  };

  const handleBetLevelSelect = (amount: number) => {
    setSelectedBetAmount(amount);
    setViewState('waiting');
  };

  const handleBackToGames = () => {
    setViewState('games');
    setSelectedGame(null);
    setSelectedBetAmount(0);
  };

  const handleBackToBetting = () => {
    setViewState('betting');
    setSelectedBetAmount(0);
  };

  const renderContent = () => {
    switch (viewState) {
      case 'betting':
        return selectedGame ? (
          <BettingLevels
            gameName={selectedGame.name}
            onLevelSelect={handleBetLevelSelect}
            onBack={handleBackToGames}
          />
        ) : null;
      
      case 'waiting':
        return selectedGame ? (
          <WaitingScreen
            betAmount={selectedBetAmount}
            gameName={selectedGame.name}
            onCancel={handleBackToBetting}
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
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClick={() => handleGameSelect(game)}
                />
              ))}
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
    <div className="min-h-screen" dir="rtl">
      <Navbar isLoggedIn={true} username="محمد أحمد" balance={1250.50} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Games;