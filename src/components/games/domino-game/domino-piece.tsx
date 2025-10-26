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
        // ✨ اللمسة الذهبية - Golden Touch
        "relative bg-gradient-to-br from-amber-50 via-white to-amber-50/50",
        "dark:from-amber-900/20 dark:via-card dark:to-amber-800/10",
        "border-2 rounded-xl shadow-[0_4px_12px_rgba(217,119,6,0.2)] transition-all duration-300",
        "flex",
        isHorizontal ? "w-16 h-8 sm:w-20 sm:h-10 md:w-24 md:h-12 flex-row" : "w-8 h-16 sm:w-10 sm:h-20 md:w-12 md:h-24 flex-col",
        // Selected state with golden glow
        isSelected && "ring-4 ring-amber-500 ring-offset-2 scale-110 animate-pulse border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]",
        // Hover effects with golden shimmer
        onClick && !disabled && "cursor-pointer active:scale-95 hover:shadow-[0_8px_24px_rgba(217,119,6,0.3)] hover:border-amber-400/70 touch-manipulation",
        disabled && "opacity-40 cursor-not-allowed grayscale",
        !disabled && !isSelected && "border-amber-300/40 dark:border-amber-700/40",
        className
      )}
    >
      {/* Golden edge highlight */}
      <div className="absolute inset-0 rounded-xl border border-amber-400/20 pointer-events-none" />
      
      {/* Golden shimmer effect on hover */}
      {!disabled && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        </div>
      )}

      {/* Left/Top Half */}
      <div className={cn(
        "relative flex items-center justify-center",
        "border-amber-400/30 dark:border-amber-600/30",
        isHorizontal ? "w-1/2 h-full border-r-2" : "w-full h-1/2 border-b-2"
      )}>
        {/* Background pattern with golden tint */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#d97706_1px,_transparent_1px)] bg-[length:8px_8px]" />
        </div>
        {renderDots(piece.left)}
      </div>

      {/* Right/Bottom Half */}
      <div className={cn(
        "relative flex items-center justify-center",
        isHorizontal ? "w-1/2 h-full" : "w-full h-1/2"
      )}>
        {/* Background pattern with golden tint */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#d97706_1px,_transparent_1px)] bg-[length:8px_8px]" />
        </div>
        {renderDots(piece.right)}
      </div>

      {/* Enhanced glossy overlay with golden tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-transparent rounded-xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/30 rounded-xl pointer-events-none" />

      {/* Enhanced shadow with golden glow */}
      <div className="absolute -bottom-1 inset-x-2 h-2 bg-amber-900/30 rounded-full blur-md -z-10" />
      {isSelected && (
        <div className="absolute inset-0 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse -z-10" />
      )}
    </div>
  );
};
