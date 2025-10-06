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
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-full transition-all duration-300 cursor-pointer",
        "shadow-lg hover:shadow-2xl active:shadow-inner",
        "flex items-center justify-center border-2",
        inHome ? "w-12 h-12 opacity-90" : "w-8 h-8",
        isFinished && "opacity-50",
        isSelected && "ring-4 ring-yellow-400 ring-offset-2 scale-125 animate-pulse z-50",
        !isSelected && "hover:scale-110 active:scale-95",
        color === 'blue'
          ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 border-blue-800 hover:from-blue-300 hover:to-blue-600'
          : 'bg-gradient-to-br from-red-400 via-red-500 to-red-700 border-red-800 hover:from-red-300 hover:to-red-600'
      )}
    >
      {/* Inner Circle for 3D effect */}
      <div className={cn(
        "absolute rounded-full",
        inHome ? "inset-3" : "inset-2",
        color === 'blue' ? 'bg-blue-300/40' : 'bg-red-300/40'
      )} />

      {/* Center Dot */}
      <div className="relative w-3 h-3 bg-white rounded-full shadow-inner z-10" />

      {/* Highlight for shine effect */}
      <div className={cn(
        "absolute rounded-full blur-sm",
        inHome ? "top-1.5 left-1.5 w-4 h-4" : "top-1 left-1 w-2 h-2",
        "bg-white/60"
      )} />

      {/* Shadow for depth */}
      <div className={cn(
        "absolute -bottom-0.5 rounded-full blur-md",
        inHome ? "inset-x-2 h-3" : "inset-x-1 h-2",
        color === 'blue' ? 'bg-blue-900/40' : 'bg-red-900/40'
      )} />
    </button>
  );
};
