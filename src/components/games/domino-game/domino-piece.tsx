import React from 'react';
import { cn } from '@/lib/utils';

interface DominoPieceProps {
  piece: {
    left: number;
    right: number;
    id: string;
  };
  onClick?: () => void;
  className?: string;
  isHorizontal?: boolean;
  disabled?: boolean;
  isSelected?: boolean;
}

export const DominoPiece: React.FC<DominoPieceProps> = ({
  piece,
  onClick,
  className,
  isHorizontal = true,
  disabled = false,
  isSelected = false
}) => {
  const renderDots = (value: number) => {
    const dots: JSX.Element[] = [];

    const dotPatterns: Record<number, number[][]> = {
      0: [],
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]]
    };

    const pattern = dotPatterns[value] || [];
    pattern.forEach(([row, col], idx) => {
      dots.push(
        <div
          key={idx}
          className="absolute w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full shadow-md"
          style={{
            top: `${(row * 33) + 16.5}%`,
            left: `${(col * 33) + 16.5}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      );
    });

    return dots;
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "relative bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-card dark:via-card/90 dark:to-card/80",
        "border-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300",
        "flex",
        isHorizontal ? "w-20 h-10 sm:w-24 sm:h-12 flex-row" : "w-10 h-20 sm:w-12 sm:h-24 flex-col",
        isSelected && "ring-4 ring-primary ring-offset-2 scale-110 animate-pulse border-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]",
        onClick && !disabled && "cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-primary/50 active:scale-95",
        disabled && "opacity-40 cursor-not-allowed grayscale",
        !disabled && !isSelected && "border-gray-300 dark:border-gray-700",
        className
      )}
    >
      {/* Left/Top Half */}
      <div className={cn(
        "relative flex items-center justify-center",
        "border-gray-400 dark:border-gray-600",
        isHorizontal ? "w-1/2 h-full border-r-2" : "w-full h-1/2 border-b-2"
      )}>
        {/* Background pattern for texture */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:8px_8px]" />
        </div>
        {renderDots(piece.left)}
      </div>

      {/* Right/Bottom Half */}
      <div className={cn(
        "relative flex items-center justify-center",
        isHorizontal ? "w-1/2 h-full" : "w-full h-1/2"
      )}>
        {/* Background pattern for texture */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:8px_8px]" />
        </div>
        {renderDots(piece.right)}
      </div>

      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-xl pointer-events-none" />

      {/* Shadow for depth */}
      <div className="absolute -bottom-1 inset-x-2 h-2 bg-black/20 rounded-full blur-md -z-10" />
    </div>
  );
};
