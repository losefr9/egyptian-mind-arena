import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List } from 'lucide-react';

interface Move {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  timestamp: string;
}

interface MoveHistoryProps {
  moves: Move[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const getPieceSymbol = (piece: string): string => {
    const symbols: Record<string, string> = {
      'p': '♟',
      'n': '♞',
      'b': '♝',
      'r': '♜',
      'q': '♛',
      'k': '♚',
      'P': '♙',
      'N': '♘',
      'B': '♗',
      'R': '♖',
      'Q': '♕',
      'K': '♔'
    };
    return symbols[piece] || piece;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <List className="h-5 w-5" />
          سجل الحركات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {moves.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              لم تبدأ المباراة بعد
            </p>
          ) : (
            <div className="space-y-2">
              {moves.map((move, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-card/50 hover:bg-card transition-colors"
                >
                  <span className="text-sm font-mono">
                    {index + 1}. {getPieceSymbol(move.piece)} {move.from} → {move.to}
                  </span>
                  {move.captured && (
                    <span className="text-xs text-destructive">
                      ✗ {getPieceSymbol(move.captured)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
