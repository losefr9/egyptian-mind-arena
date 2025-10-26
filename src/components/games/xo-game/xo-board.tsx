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
  savingMove?: boolean;
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
  connectionStatus = 'connected',
  savingMove = false
}) => {
  const renderCell = (value: string, index: number) => {
    const isClickable = !disabled && !value && !savingMove;
    const isOpponentSolving = opponentSolving === index;
    const isPendingCell = pendingMove?.cellIndex === index;
    
    return (
      <Button
        key={index}
        variant="outline"
        className={`
          aspect-square w-full text-2xl sm:text-3xl md:text-4xl font-bold transition-all duration-300 transform active:scale-95
          ${isClickable && !isOpponentSolving && !isPendingCell ? 'hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/20 hover:border-primary hover:shadow-xl cursor-pointer' : 'cursor-not-allowed opacity-70'}
          ${isOpponentSolving ? 'bg-gradient-to-br from-orange-200 to-orange-300 border-orange-400 animate-pulse shadow-lg' : ''}
          ${isPendingCell ? 'bg-gradient-to-br from-yellow-200 to-yellow-300 border-yellow-400 animate-pulse shadow-lg' : ''}
          ${value === 'X' ? 'text-red-500 bg-gradient-to-br from-red-50 to-red-100 border-red-300 shadow-lg' : value === 'O' ? 'text-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-lg' : !isOpponentSolving && !isPendingCell ? 'bg-gradient-to-br from-background to-muted/50' : ''}
          ${value !== '' ? 'shadow-xl' : 'hover:shadow-lg'}
          border-2 min-h-[70px] sm:min-h-[90px] rounded-xl relative overflow-hidden touch-manipulation
          ${value === '' && isClickable && !isOpponentSolving && !isPendingCell ? 'group' : ''}
        `}
        onClick={() => isClickable && !isOpponentSolving && onCellClick(index)}
        disabled={!isClickable || isOpponentSolving}
      >
        {/* تأثير التمرير للخلايا الفارغة */}
        {value === '' && isClickable && !isOpponentSolving && !isPendingCell && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        )}
        
        {/* مؤشر اللاعب الآخر يحل */}
        {isOpponentSolving && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-300/50 to-orange-500/50 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-orange-700 font-bold text-sm animate-bounce">🏃‍♂️</span>
          </div>
        )}
        
        {/* مؤشر جاري الحفظ */}
        {isPendingCell && value === '' && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/50 to-yellow-500/50 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-yellow-700 font-bold text-sm animate-spin">💾</span>
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
          {value === '' && isClickable && !isOpponentSolving && !isPendingCell && (
            <span className="opacity-30 group-hover:opacity-60 transition-opacity duration-300 text-muted-foreground">
              ⚡
            </span>
          )}
          {isPendingCell && value === '' && (
            <span className="text-yellow-600 font-bold animate-pulse">💾</span>
          )}
        </div>
      </Button>
    );
  };

  return (
    <div className="relative">
      {/* الخلفية المتحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl blur-sm"></div>
      
      <div className="relative bg-gradient-to-br from-background/90 to-muted/30 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-2xl border-2 border-primary/40 shadow-2xl w-full max-w-lg mx-auto">
        {/* العنوان */}
        <div className="text-center mb-3">
          <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎮 لوحة XO الذكية
          </h3>
        </div>

        {/* الشبكة */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto bg-gradient-to-br from-muted/20 to-accent/10 p-2 sm:p-3 rounded-xl border-2 border-primary/20">
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