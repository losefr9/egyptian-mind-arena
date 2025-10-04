import React from 'react';
import { Card } from '@/components/ui/card';

interface CapturedPiecesProps {
  capturedPieces: {
    white: string[];
    black: string[];
  };
}

const PIECE_UNICODE_MAP: Record<string, string> = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ capturedPieces }) => {
  const renderCapturedPieces = (pieces: string[], color: 'white' | 'black') => {
    if (pieces.length === 0) {
      return <div className="text-muted-foreground text-sm">لا توجد قطع مأسورة</div>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {pieces.map((piece, index) => (
          <span 
            key={index} 
            className={`text-2xl ${color === 'white' ? 'text-foreground' : 'text-foreground/90'}`}
          >
            {PIECE_UNICODE_MAP[piece.toLowerCase()] || piece}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50 space-y-4">
      <div>
        <h3 className="font-bold mb-2 text-sm text-muted-foreground">القطع البيضاء المأسورة</h3>
        {renderCapturedPieces(capturedPieces.white, 'white')}
      </div>
      
      <div className="border-t border-border/50 pt-4">
        <h3 className="font-bold mb-2 text-sm text-muted-foreground">القطع السوداء المأسورة</h3>
        {renderCapturedPieces(capturedPieces.black, 'black')}
      </div>
    </Card>
  );
};
