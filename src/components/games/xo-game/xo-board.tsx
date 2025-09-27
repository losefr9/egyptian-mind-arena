import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Circle } from 'lucide-react';

interface XOBoardProps {
  board: string[];
  onCellClick: (index: number) => void;
  currentPlayer: 'X' | 'O';
  disabled: boolean;
  playerSymbol: 'X' | 'O';
  opponentSolving?: number | null;
  lockedCells?: Set<number>;
  pendingMove?: {cellIndex: number, symbol: string} | null;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected';
}

export const XOBoard: React.FC<XOBoardProps> = ({ 
  board, 
  onCellClick, 
  currentPlayer, 
  disabled, 
  playerSymbol,
  opponentSolving,
  lockedCells = new Set(),
  pendingMove,
  connectionStatus = 'connected'
}) => {
  const renderCell = (value: string, index: number) => {
    const isClickable = !disabled && !value;
    const isOpponentSolving = opponentSolving === index;
    
    return (
      <Button
        key={index}
        variant="outline"
        className={`
          aspect-square w-full text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold transition-all duration-500 transform 
          ${isClickable && !isOpponentSolving ? 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/20 hover:border-primary hover:scale-110 hover:shadow-xl cursor-pointer animate-pulse hover:animate-none' : 'cursor-not-allowed opacity-70'}
          ${isOpponentSolving ? 'bg-gradient-to-br from-orange-200 to-orange-300 border-orange-400 animate-pulse shadow-lg' : ''}
          ${value === 'X' ? 'text-red-500 bg-gradient-to-br from-red-50 to-red-100 border-red-300 animate-bounce shadow-lg' : value === 'O' ? 'text-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 animate-bounce shadow-lg' : !isOpponentSolving ? 'bg-gradient-to-br from-background to-muted/50 hover:from-primary/10 hover:to-accent/10' : ''}
          ${value !== '' ? 'animate-scale-in shadow-xl' : 'hover:shadow-lg'}
          border-2 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] rounded-lg relative overflow-hidden
          ${value === '' && isClickable && !isOpponentSolving ? 'group' : ''}
        `}
        onClick={() => isClickable && !isOpponentSolving && onCellClick(index)}
        disabled={!isClickable || isOpponentSolving}
      >
        {/* تأثير التمرير للخلايا الفارغة */}
        {value === '' && isClickable && !isOpponentSolving && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        )}
        
        {/* مؤشر اللاعب الآخر يحل */}
        {isOpponentSolving && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-300/50 to-orange-500/50 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-orange-700 font-bold text-sm animate-bounce">🏃‍♂️</span>
          </div>
        )}
        
        {/* المحتوى */}
        <div className="relative z-10">
          {value === 'X' && (
            <span className="drop-shadow-lg animate-bounce text-red-600">❌</span>
          )}
          {value === 'O' && (
            <span className="drop-shadow-lg animate-bounce text-blue-600">⭕</span>
          )}
          {value === '' && isClickable && !isOpponentSolving && (
            <span className="opacity-30 group-hover:opacity-60 transition-opacity duration-300 text-muted-foreground">
              ⚡
            </span>
          )}
        </div>
      </Button>
    );
  };

  return (
    <div className="relative">
      {/* الخلفية المتحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl blur-sm"></div>
      
      <div className="relative bg-gradient-to-br from-background/90 to-muted/30 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl border-4 border-primary/40 shadow-2xl w-full max-w-md mx-auto">
        {/* العنوان */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
            🎮 لوحة XO الذكية
          </h3>
        </div>
        
        {/* الشبكة */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 aspect-square mx-auto bg-gradient-to-br from-muted/20 to-accent/10 p-2 rounded-lg border-2 border-primary/20">
          {board.map((cell, index) => renderCell(cell, index))}
        </div>
        
        {/* النصائح */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground animate-fade-in bg-muted/30 p-2 rounded-lg">
            🎯 اختر مربعاً واجب على السؤال الرياضي بسرعة!
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-red-500">❌</span>
              <span className="text-muted-foreground">لاعب X</span>
            </div>
            <div className="w-px h-4 bg-muted-foreground/30"></div>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">⭕</span>
              <span className="text-muted-foreground">لاعب O</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};