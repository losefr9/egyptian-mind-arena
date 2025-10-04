import React from 'react';
import { Button } from '@/components/ui/button';
import { Dices } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LudoDiceProps {
  value: number;
  onRoll: () => void;
  canRoll: boolean;
  isRolling?: boolean;
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  onRoll,
  canRoll,
  isRolling = false
}) => {
  const getDotPositions = (num: number): [number, number][] => {
    const positions: Record<number, [number, number][]> = {
      1: [[2, 2]],
      2: [[1, 1], [3, 3]],
      3: [[1, 1], [2, 2], [3, 3]],
      4: [[1, 1], [1, 3], [3, 1], [3, 3]],
      5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
      6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]]
    };
    return positions[num] || [];
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {value > 0 && (
        <div className={cn(
          "w-24 h-24 bg-white rounded-xl shadow-2xl border-4 border-gray-300",
          "grid grid-cols-4 grid-rows-4 gap-1 p-3",
          isRolling && "animate-bounce"
        )}>
          {Array.from({ length: 16 }).map((_, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const isVisible = getDotPositions(value).some(
              ([r, c]) => r === row && c === col
            );
            return (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all",
                  isVisible ? "bg-gray-800" : "bg-transparent"
                )}
              />
            );
          })}
        </div>
      )}
      
      <Button
        onClick={onRoll}
        disabled={!canRoll}
        className="w-32 h-12 text-lg font-bold"
        variant={canRoll ? "default" : "secondary"}
      >
        <Dices className="mr-2" />
        {value === 0 ? 'ارمِ النرد' : 'ارمِ مرة أخرى'}
      </Button>
    </div>
  );
};
