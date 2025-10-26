import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Gamepad2 } from 'lucide-react';
import xoGameHero from '@/assets/xo-game-hero.jpg';
import dominoGameHero from '@/assets/domino-game-hero.jpg';
import chessGameHero from '@/assets/chess-game-hero.jpg';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    description: string;
    image_url: string;
    activePlayersCount?: number;
  };
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  // استخدام الصور المحلية بناءً على معرف اللعبة
  const getGameImage = () => {
    if (game.image_url?.includes('xo-game-hero')) return xoGameHero;
    if (game.image_url?.includes('domino-game-hero')) return dominoGameHero;
    if (game.image_url?.includes('chess-game-hero')) return chessGameHero;
    return game.image_url;
  };

  return (
    <Card 
      className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-golden transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          {game.activePlayersCount !== undefined && game.activePlayersCount > 0 && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
              <Users className="h-3 w-3 mr-1" />
              {game.activePlayersCount} متصل
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{game.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{game.description}</p>
      </CardHeader>
      
      <CardContent>
        {game.image_url ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden mb-4 relative group">
            <img 
              src={getGameImage()} 
              alt={game.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center mb-4">
            <Gamepad2 className="h-16 w-16 text-primary/40" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};