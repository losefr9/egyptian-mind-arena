import React from 'react';
import { DominoPiece } from './domino-piece';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface DominoBoardProps {
  chain: Array<{
    left: number;
    right: number;
    id: string;
  }>;
  onPlaceLeft?: () => void;
  onPlaceRight?: () => void;
  canPlaceLeft: boolean;
  canPlaceRight: boolean;
  selectedPiece: any;
}

export const DominoBoard: React.FC<DominoBoardProps> = ({
  chain,
  onPlaceLeft,
  onPlaceRight,
  canPlaceLeft,
  canPlaceRight,
  selectedPiece
}) => {
  return (
    <div className="relative w-full min-h-[200px] bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border-2 border-primary/20 p-6 overflow-x-auto">
      {chain.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[150px]">
          <div className="text-center space-y-2">
            <div className="text-4xl">🎲</div>
            <p className="text-muted-foreground">ضع أول قطعة لبدء اللعبة</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {/* زر الوضع على اليسار */}
          {selectedPiece && canPlaceLeft && onPlaceLeft && (
            <Button
              onClick={onPlaceLeft}
              variant="secondary"
              size="sm"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* السلسلة */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {chain.map((piece, index) => (
              <DominoPiece
                key={piece.id}
                piece={piece}
                isHorizontal={true}
              />
            ))}
          </div>

          {/* زر الوضع على اليمين */}
          {selectedPiece && canPlaceRight && onPlaceRight && (
            <Button
              onClick={onPlaceRight}
              variant="secondary"
              size="sm"
              className="shrink-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* معلومات السلسلة */}
      {chain.length > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <span>الطرف الأيسر: {chain[0]?.left}</span>
            <span>•</span>
            <span>الطرف الأيمن: {chain[chain.length - 1]?.right}</span>
          </div>
        </div>
      )}
    </div>
  );
};
