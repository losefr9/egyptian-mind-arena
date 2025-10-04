import React from 'react';
import { DominoPiece } from './domino-piece';

interface DominoHandProps {
  pieces: Array<{
    left: number;
    right: number;
    id: string;
  }>;
  onPieceSelect: (piece: any) => void;
  selectedPiece: any;
  disabled?: boolean;
}

export const DominoHand: React.FC<DominoHandProps> = ({
  pieces,
  onPieceSelect,
  selectedPiece,
  disabled = false
}) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center p-4 bg-background/50 rounded-xl border border-primary/20">
      {pieces.map((piece) => (
        <DominoPiece
          key={piece.id}
          piece={piece}
          onClick={() => onPieceSelect(piece)}
          disabled={disabled}
          className={
            selectedPiece?.id === piece.id
              ? 'ring-2 ring-primary ring-offset-2 scale-110'
              : ''
          }
        />
      ))}
      {pieces.length === 0 && (
        <div className="text-muted-foreground text-center py-4">
          لا توجد قطع متبقية
        </div>
      )}
    </div>
  );
};
