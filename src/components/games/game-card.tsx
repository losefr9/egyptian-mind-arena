import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Gamepad2 } from 'lucide-react';

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
        </div>
        <CardTitle className="text-xl">{game.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{game.description}</p>
      </CardHeader>
      
      <CardContent>
        {game.image_url ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden mb-4 relative group">
            <img 
              src={game.image_url} 
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