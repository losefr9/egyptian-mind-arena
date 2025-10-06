import React from 'react';
import { DominoPiece } from './domino-piece';
import { cn } from '@/lib/utils';

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
    <div className={cn(
      "relative p-6 rounded-2xl transition-all duration-300",
      "bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5",
      "border-2 border-primary/20 shadow-lg",
      !disabled && "hover:border-primary/30"
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,_transparent_25%,_rgba(0,0,0,0.05)_25%,_rgba(0,0,0,0.05)_50%,_transparent_50%,_transparent_75%,_rgba(0,0,0,0.05)_75%)] bg-[length:20px_20px]" />
      </div>

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full" />
          <h3 className="text-lg font-bold">قطعك ({pieces.length})</h3>
        </div>
        {!disabled && (
          <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
            انقر لاختيار قطعة
          </div>
        )}
      </div>

      {/* Pieces Grid */}
      <div className="relative flex flex-wrap gap-3 justify-center min-h-[80px]">
        {pieces.length > 0 ? (
          pieces.map((piece, index) => (
            <div
              key={piece.id}
              className="transition-all duration-200"
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'fadeInUp 0.5s ease-out forwards'
              }}
            >
              <DominoPiece
                piece={piece}
                onClick={() => !disabled && onPieceSelect(piece)}
                disabled={disabled}
                isSelected={selectedPiece?.id === piece.id}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-5xl mb-3 opacity-50">🎴</div>
            <div className="text-muted-foreground font-medium">
              لا توجد قطع متبقية
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              قد تحتاج للسحب من البونيارد
            </div>
          </div>
        )}
      </div>

      {/* Selected Piece Indicator */}
      {selectedPiece && (
        <div className="relative mt-4 pt-4 border-t border-primary/20">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary animate-pulse">
            <div className="h-2 w-2 rounded-full bg-primary" />
            قطعة محددة: {selectedPiece.left} - {selectedPiece.right}
          </div>
        </div>
      )}
    </div>
  );
};
