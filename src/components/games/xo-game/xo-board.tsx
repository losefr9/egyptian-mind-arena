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
          h-24 w-24 text-3xl font-bold transition-all duration-200
          ${isClickable ? 'hover:bg-primary/10 hover:border-primary cursor-pointer' : 'cursor-not-allowed'}
          ${value === 'X' ? 'text-red-500' : value === 'O' ? 'text-blue-500' : ''}
          border-2
        `}
        onClick={() => isClickable && onCellClick(index)}
        disabled={!isClickable}
      >
        {value === 'X' && <X size={32} />}
        {value === 'O' && <Circle size={32} />}
      </Button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-card rounded-lg border">
      {board.map((cell, index) => renderCell(cell, index))}
    </div>
  );
};