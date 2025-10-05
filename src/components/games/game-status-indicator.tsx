import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Swords, Users } from 'lucide-react';

interface GameStatusIndicatorProps {
  isMyTurn: boolean;
  currentPlayerName?: string;
  gameStatus?: 'playing' | 'waiting' | 'finished';
}

export const GameStatusIndicator: React.FC<GameStatusIndicatorProps> = ({
  isMyTurn,
  currentPlayerName,
  gameStatus = 'playing'
}) => {
  const getStatusConfig = () => {
    if (gameStatus === 'finished') {
      return {
        icon: Crown,
        text: 'انتهت اللعبة',
        variant: 'secondary' as const,
        className: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      };
    }

    if (gameStatus === 'waiting') {
      return {
        icon: Users,
        text: 'في انتظار اللاعبين',
        variant: 'outline' as const,
        className: 'bg-muted/50 animate-pulse'
      };
    }

    if (isMyTurn) {
      return {
        icon: Swords,
        text: 'دورك الآن! 🎮',
        variant: 'default' as const,
        className: 'bg-gradient-to-r from-success to-success/80 animate-pulse shadow-lg'
      };
    }

    return {
      icon: Users,
      text: `دور ${currentPlayerName || 'الخصم'}`,
      variant: 'secondary' as const,
      className: 'bg-muted/50'
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.className} border transition-all duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 justify-center">
          <StatusIcon className="h-5 w-5" />
          <Badge variant={config.variant} className="text-sm px-4 py-1">
            {config.text}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};