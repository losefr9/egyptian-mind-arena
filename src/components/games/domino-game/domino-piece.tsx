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
}

export const DominoPiece: React.FC<DominoPieceProps> = ({
  piece,
  onClick,
  className,
  isHorizontal = true,
  disabled = false
}) => {
  const renderDots = (value: number) => {
    const dots: JSX.Element[] = [];
    
    // نمط النقاط حسب الرقم
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
          className="absolute w-2 h-2 bg-foreground rounded-full"
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
        "relative bg-card border-2 border-primary rounded-lg shadow-lg transition-all",
        isHorizontal ? "w-20 h-10 flex-row" : "w-10 h-20 flex-col",
        onClick && !disabled && "cursor-pointer hover:scale-105 hover:shadow-xl hover:border-primary-glow",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* النصف الأول */}
      <div className={cn(
        "relative border-primary",
        isHorizontal ? "w-1/2 h-full border-r" : "w-full h-1/2 border-b"
      )}>
        {renderDots(piece.left)}
      </div>
      
      {/* النصف الثاني */}
      <div className={cn(
        "relative",
        isHorizontal ? "w-1/2 h-full" : "w-full h-1/2"
      )}>
        {renderDots(piece.right)}
      </div>
    </div>
  );
};
