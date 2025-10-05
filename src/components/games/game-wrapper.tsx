import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Users, Clock } from 'lucide-react';

interface GameWrapperProps {
  children: React.ReactNode;
  gameName: string;
  betAmount: number;
  player1Name?: string;
  player2Name?: string;
  onExit?: () => void;
  showTimer?: boolean;
  timeRemaining?: number;
}

export const GameWrapper: React.FC<GameWrapperProps> = ({
  children,
  gameName,
  betAmount,
  player1Name,
  player2Name,
  onExit,
  showTimer = false,
  timeRemaining = 0
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-card/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <Card className="p-6 bg-gradient-to-r from-card/90 via-card/80 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] transition-all duration-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {onExit && (
              <Button 
                onClick={onExit} 
                variant="outline" 
                className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                الخروج
              </Button>
            )}
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary via-primary/90 to-primary-glow rounded-xl shadow-lg">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الجائزة الكبرى</p>
                <span className="font-bold text-2xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {betAmount * 2} جنيه
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {showTimer && timeRemaining > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold">{timeRemaining}s</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 px-4 py-2 bg-background/50 rounded-lg border border-border/50">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">{gameName}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Players Info */}
        {(player1Name || player2Name) && (
          <div className="grid md:grid-cols-2 gap-4">
            {player1Name && (
              <Card className="p-4 bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg ring-2 ring-background/50">
                    {player1Name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{player1Name}</div>
                    <div className="text-xs text-muted-foreground">اللاعب الأول</div>
                  </div>
                </div>
              </Card>
            )}
            
            {player2Name && (
              <Card className="p-4 bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary via-secondary/80 to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-background/50">
                    {player2Name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{player2Name}</div>
                    <div className="text-xs text-muted-foreground">اللاعب الثاني</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Game Content */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl blur-xl opacity-50" />
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};