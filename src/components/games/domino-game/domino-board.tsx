import React from 'react';
import { DominoPiece } from './domino-piece';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="relative w-full min-h-[250px] bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-card/50 dark:via-card/40 dark:to-card/30 rounded-2xl border-4 border-primary/20 p-8 overflow-x-auto shadow-2xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 rounded-2xl overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.05) 48%, rgba(0,0,0,0.05) 52%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, rgba(0,0,0,0.05) 48%, rgba(0,0,0,0.05) 52%, transparent 52%)
          `,
          backgroundSize: '30px 30px'
        }} />
      </div>

      {/* Board Label */}
      <div className="absolute top-2 left-4 px-3 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-xs font-bold text-primary border border-primary/30">
        🎴 لوحة اللعب
      </div>

      {chain.length === 0 ? (
        <div className="relative flex items-center justify-center h-full min-h-[180px]">
          <div className="text-center space-y-4 animate-pulse">
            <div className="text-7xl">🎲</div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-primary">ابدأ اللعبة!</p>
              <p className="text-sm text-muted-foreground">ضع أول قطعة لبدء السلسلة</p>
            </div>
            {selectedPiece && (
              <div className="mt-4 px-4 py-2 bg-primary/20 rounded-xl border border-primary/30 backdrop-blur-sm">
                <p className="text-sm font-medium">
                  القطعة المحددة: {selectedPiece.left} - {selectedPiece.right}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center gap-3 min-h-[180px]">
          {/* Left Placement Button */}
          {selectedPiece && canPlaceLeft && onPlaceLeft && (
            <div className="shrink-0 animate-bounce">
              <Button
                onClick={onPlaceLeft}
                size="lg"
                className={cn(
                  "h-12 w-12 rounded-full shadow-2xl",
                  "bg-gradient-to-r from-primary to-primary-glow",
                  "hover:scale-110 active:scale-95 transition-all",
                  "border-2 border-primary-foreground/20"
                )}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* Chain Container */}
          <div className="relative flex items-center gap-2 flex-wrap justify-center max-w-full px-4">
            {/* Left End Indicator */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold text-yellow-900 shadow-lg">
                {chain[0]?.left}
              </div>
              <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-300">يسار</span>
            </div>

            {/* Domino Chain */}
            {chain.map((piece, index) => (
              <div
                key={piece.id}
                className="transition-all duration-300 hover:z-10"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideIn 0.5s ease-out forwards'
                }}
              >
                <DominoPiece
                  piece={piece}
                  isHorizontal={true}
                />
              </div>
            ))}

            {/* Right End Indicator */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-blue-600 flex items-center justify-center text-xs font-bold text-blue-900 shadow-lg">
                {chain[chain.length - 1]?.right}
              </div>
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">يمين</span>
            </div>
          </div>

          {/* Right Placement Button */}
          {selectedPiece && canPlaceRight && onPlaceRight && (
            <div className="shrink-0 animate-bounce">
              <Button
                onClick={onPlaceRight}
                size="lg"
                className={cn(
                  "h-12 w-12 rounded-full shadow-2xl",
                  "bg-gradient-to-r from-accent to-primary",
                  "hover:scale-110 active:scale-95 transition-all",
                  "border-2 border-primary-foreground/20"
                )}
              >
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chain Info Footer */}
      {chain.length > 0 && (
        <div className="relative mt-6 pt-4 border-t-2 border-primary/20">
          <div className="flex items-center justify-center gap-8 flex-wrap text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl border border-yellow-300 dark:border-yellow-700">
              <span className="font-bold text-yellow-800 dark:text-yellow-200">الطرف الأيسر:</span>
              <span className="text-2xl font-black text-yellow-900 dark:text-yellow-100">{chain[0]?.left}</span>
            </div>
            <div className="px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary">
              {chain.length} قطعة
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl border border-blue-300 dark:border-blue-700">
              <span className="font-bold text-blue-800 dark:text-blue-200">الطرف الأيمن:</span>
              <span className="text-2xl font-black text-blue-900 dark:text-blue-100">{chain[chain.length - 1]?.right}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
