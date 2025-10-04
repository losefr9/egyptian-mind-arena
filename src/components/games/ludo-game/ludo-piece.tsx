import React from 'react';
import { cn } from '@/lib/utils';

interface LudoPieceProps {
  id: string;
  color: string;
  position: number;
  isSelected?: boolean;
  onClick?: () => void;
  inHome?: boolean;
  isFinished?: boolean;
}

export const LudoPiece: React.FC<LudoPieceProps> = ({
  color,
  isSelected,
  onClick,
  inHome,
  isFinished
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-300",
        "flex items-center justify-center shadow-lg",
        isSelected && "ring-4 ring-yellow-400 scale-110",
        inHome && "opacity-70",
        isFinished && "opacity-50",
        color === 'blue' && "bg-blue-500 border-blue-700",
        color === 'red' && "bg-red-500 border-red-700",
        "hover:scale-110 active:scale-95"
      )}
    >
      <div className="w-3 h-3 bg-white rounded-full" />
    </div>
  );
};
