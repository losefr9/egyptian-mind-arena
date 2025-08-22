import React from 'react';
import { Navbar } from '@/components/ui/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, 
  Crown, 
  Users, 
  Clock,
  Star,
  Trophy
} from 'lucide-react';

const Games = () => {
  const games = [
    {
      id: 1,
      name: 'الشطرنج المصري',
      description: 'لعبة الشطرنج الكلاسيكية بنكهة مصرية',
      players: 2,
      duration: '15-30 دقيقة',
      difficulty: 'متقدم',
      reward: '100-500 ج.م',
      rating: 4.8,
      online: 245
    },
    {
      id: 2,
      name: 'الداما الذكية',
      description: 'لعبة الداما مع تحديات ذكية',
      players: 2,
      duration: '10-20 دقيقة',
      difficulty: 'متوسط',
      reward: '50-300 ج.م',
      rating: 4.6,
      online: 180
    },
    {
      id: 3,
      name: 'الذكاء السريع',
      description: 'أسئلة ذكاء وتفكير منطقي',
      players: '1-4',
      duration: '5-10 دقائق',
      difficulty: 'سهل',
      reward: '25-150 ج.م',
      rating: 4.7,
      online: 320
    },
    {
      id: 4,
      name: 'بلوت الاستراتيجية',
      description: 'لعبة البلوت مع عنصر الاستراتيجية',
      players: 4,
      duration: '20-40 دقيقة',
      difficulty: 'متقدم',
      reward: '200-800 ج.م',
      rating: 4.9,
      online: 156
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'سهل': return 'success';
      case 'متوسط': return 'warning';
      case 'متقدم': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <Navbar isLoggedIn={true} username="محمد أحمد" balance={1250.50} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            الألعاب المتاحة
          </h1>
          <p className="text-xl text-muted-foreground">
            اختر لعبتك المفضلة وابدأ في ربح المال الحقيقي
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-golden transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant={getDifficultyColor(game.difficulty) as any}>
                    {game.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{game.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{game.description}</p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{game.players} لاعبين</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{game.duration}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning" />
                      <span>{game.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 text-success">
                      <span className="w-2 h-2 bg-success rounded-full"></span>
                      <span>{game.online} متصل</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">{game.reward}</span>
                  </div>
                  
                  <Button variant="golden" className="w-full mt-4">
                    انضم للعبة
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <Button variant="outline">
                اشترك في التحديثات
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Games;