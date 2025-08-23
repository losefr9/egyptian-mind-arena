import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Circle } from 'lucide-react';

interface XOBoardProps {
  board: string[];
  onCellClick: (index: number) => void;
  currentPlayer: 'X' | 'O';
  disabled: boolean;
  playerSymbol: 'X' | 'O';
}

export const XOBoard: React.FC<XOBoardProps> = ({
  board,
  onCellClick,
  currentPlayer,
  disabled,
  playerSymbol
}) => {
  const renderCell = (value: string, index: number) => {
    const isClickable = !disabled && !value && currentPlayer === playerSymbol;
    
    return (
      <Button
        key={index}
        variant="outline"
        className={`
          h-28 w-28 text-4xl font-bold transition-all duration-300 transform hover:scale-105
          ${isClickable ? 'hover:bg-primary/10 hover:border-primary cursor-pointer animate-pulse' : 'cursor-not-allowed'}
          ${value === 'X' ? 'text-red-500 bg-red-50 animate-bounce' : value === 'O' ? 'text-blue-500 bg-blue-50 animate-bounce' : ''}
          ${value !== '' ? 'animate-scale-in' : ''}
          border-2 shadow-lg
        `}
        onClick={() => isClickable && onCellClick(index)}
        disabled={!isClickable}
      >
        {value === 'X' && <span className="animate-bounce">❌</span>}
        {value === 'O' && <span className="animate-bounce">⭕</span>}
      </Button>
    );
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-xl border-4 border-primary/30 shadow-2xl">
      <div className="grid grid-cols-3 gap-3 w-96 h-96 mx-auto">
        {board.map((cell, index) => renderCell(cell, index))}
      </div>
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground animate-fade-in">
          🎯 اختر مربعاً واجب على السؤال الرياضي!
        </p>
      </div>
    </div>
  );
};