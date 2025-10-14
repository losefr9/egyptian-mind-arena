import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import Confetti from 'react-confetti';

interface GameEndDialogProps {
  isOpen: boolean;
  result: 'win' | 'lose' | 'draw';
  prize: number;
  stats?: {
    moves?: number;
    timeElapsed?: string;
    accuracy?: number;
  };
  onPlayAgain?: () => void;
  onBackToGames: () => void;
}

export const GameEndDialog: React.FC<GameEndDialogProps> = ({
  isOpen,
  result,
  prize,
  stats,
  onPlayAgain,
  onBackToGames
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && result === 'win') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [isOpen, result]);

  const getResultConfig = () => {
    switch (result) {
      case 'win':
        return {
          title: '🎉 مبروك! لقد فزت!',
          subtitle: 'أداء رائع!',
          color: 'from-green-500 via-emerald-500 to-teal-500',
          textColor: 'text-green-500',
          icon: Trophy,
          bgGlow: 'bg-green-500/20'
        };
      case 'lose':
        return {
          title: '😔 خسرت المباراة',
          subtitle: 'حظ أوفر في المرة القادمة',
          color: 'from-red-500 via-rose-500 to-pink-500',
          textColor: 'text-red-500',
          icon: Medal,
          bgGlow: 'bg-red-500/20'
        };
      case 'draw':
        return {
          title: '🤝 تعادل',
          subtitle: 'مباراة متكافئة',
          color: 'from-blue-500 via-cyan-500 to-sky-500',
          textColor: 'text-blue-500',
          icon: Award,
          bgGlow: 'bg-blue-500/20'
        };
    }
  };

  const config = getResultConfig();
  const Icon = config.icon;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-primary/20">
          {/* Header with gradient */}
          <div className={`relative bg-gradient-to-r ${config.color} p-8 text-white`}>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className={`absolute inset-0 ${config.bgGlow} rounded-full blur-2xl animate-pulse`} />
                <div className="relative bg-white/20 backdrop-blur-sm p-6 rounded-full">
                  <Icon className="h-16 w-16" />
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{config.title}</h2>
                <p className="text-white/90">{config.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Prize */}
            {result === 'win' && (
              <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">أرباحك</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {prize} ج.م
                </p>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  إحصائيات المباراة
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {stats.moves && (
                    <div className="p-3 bg-background/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">عدد الحركات</p>
                      <p className="text-2xl font-bold">{stats.moves}</p>
                    </div>
                  )}
                  {stats.timeElapsed && (
                    <div className="p-3 bg-background/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">الوقت المستغرق</p>
                      <p className="text-2xl font-bold">{stats.timeElapsed}</p>
                    </div>
                  )}
                  {stats.accuracy && (
                    <div className="col-span-2 p-3 bg-background/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">دقة اللعب</p>
                      <p className="text-2xl font-bold">{stats.accuracy}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {onPlayAgain && (
                <Button
                  onClick={onPlayAgain}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                  size="lg"
                >
                  لعب مرة أخرى 🎮
                </Button>
              )}
              <Button
                onClick={onBackToGames}
                variant="outline"
                className="w-full"
                size="lg"
              >
                العودة للألعاب
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};