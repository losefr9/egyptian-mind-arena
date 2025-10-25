import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Chess } from 'chess.js';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  orientation: 'white' | 'black';
  isMyTurn: boolean;
}

const PIECE_UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  onMove,
  orientation,
  isMyTurn
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [promotionDialog, setPromotionDialog] = useState<{ show: boolean; from: string; to: string } | null>(null);

  const parseFEN = (fen: string) => {
    const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    const rows = fen.split(' ')[0].split('/');

    rows.forEach((row, i) => {
      let col = 0;
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const piece = char.toUpperCase();
          board[i][col] = color + piece;
          col++;
        } else {
          col += parseInt(char);
        }
      }
    });

    return board;
  };

  const board = parseFEN(position);
  const files = orientation === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = orientation === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const getSquareName = (row: number, col: number): string => {
    const file = files[col];
    const rank = ranks[row];
    return file + rank;
  };

  const isPromotionMove = (from: string, to: string): boolean => {
    const tempChess = new Chess(position);
    const piece = tempChess.get(from as any);

    if (!piece || piece.type !== 'p') return false;

    const toRank = to[1];
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!isMyTurn) {
      console.log('⛔ Not my turn, ignoring click');
      return;
    }

    const squareName = getSquareName(row, col);
    const piece = board[row][col];
    const myColor = orientation === 'white' ? 'w' : 'b';

    console.log('🎯 Square clicked:', { squareName, piece, selectedSquare, highlightedSquares: highlightedSquares.length });

    if (selectedSquare) {
      console.log('📍 A piece is already selected:', selectedSquare);

      if (piece && piece.startsWith(myColor)) {
        console.log('🔄 Switching to another piece');
        setSelectedSquare(squareName);

        const tempChess = new Chess(position);
        const moves = tempChess.moves({ square: squareName as any, verbose: true }) as any[];
        const possibleSquares = moves.map((move: any) => move.to);

        setHighlightedSquares([squareName, ...possibleSquares]);
      } else {
        if (highlightedSquares.includes(squareName)) {
          if (isPromotionMove(selectedSquare, squareName)) {
            setPromotionDialog({ show: true, from: selectedSquare, to: squareName });
          } else {
            const success = await onMove(selectedSquare, squareName);

            if (success) {
              setSelectedSquare(null);
              setHighlightedSquares([]);
            }
          }
        } else {
          setSelectedSquare(null);
          setHighlightedSquares([]);
        }
      }
    } else if (piece && piece.startsWith(myColor)) {
      setSelectedSquare(squareName);

      const tempChess = new Chess(position);
      const moves = tempChess.moves({ square: squareName as any, verbose: true }) as any[];
      const possibleSquares = moves.map((move: any) => move.to);

      setHighlightedSquares([squareName, ...possibleSquares]);
    }
  };

  const handlePromotion = async (piece: string) => {
    if (!promotionDialog) return;

    const success = await onMove(promotionDialog.from, promotionDialog.to, piece);
    if (success) {
      setSelectedSquare(null);
      setHighlightedSquares([]);
      setPromotionDialog(null);
    }
  };

  const isSquareLight = (row: number, col: number) => {
    return (row + col) % 2 === 0;
  };

  return (
    <Card className="p-2 sm:p-4 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="aspect-square w-full max-w-[95vw] sm:max-w-[600px] mx-auto">
        <div className="grid grid-cols-8 gap-0 h-full border-2 sm:border-4 border-primary/30 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl touch-none">
          {ranks.map((rank, row) =>
            files.map((file, col) => {
              const squareName = getSquareName(row, col);
              const piece = board[row][col];
              const isLight = isSquareLight(row, col);
              const isSelected = selectedSquare === squareName;
              const isHighlighted = highlightedSquares.includes(squareName);

              return (
                <button
                  key={squareName}
                  onClick={() => handleSquareClick(row, col)}
                  disabled={!isMyTurn}
                  style={{ touchAction: 'manipulation' }}
                  className={`
                    aspect-square relative flex items-center justify-center 
                    text-2xl sm:text-4xl md:text-5xl lg:text-6xl
                    transition-all duration-200 ease-out select-none
                    ${
                      isLight
                        ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/30'
                        : 'bg-gradient-to-br from-amber-800 to-amber-700 dark:from-amber-950 dark:to-amber-900'
                    }
                    ${
                      isSelected
                        ? 'ring-2 sm:ring-4 ring-primary ring-inset shadow-[inset_0_0_15px_rgba(var(--primary),0.6)] scale-95 bg-primary/40'
                        : ''
                    }
                    ${
                      isHighlighted && !isSelected
                        ? 'shadow-[inset_0_0_12px_rgba(var(--primary),0.3)]'
                        : ''
                    }
                    ${
                      isMyTurn
                        ? 'active:bg-primary/30 active:scale-95 cursor-pointer'
                        : 'cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  {piece && (
                    <span
                      className={`
                      select-none transition-all duration-200 ease-out pointer-events-none
                      ${isSelected ? 'scale-110 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]' : ''}
                      ${
                        piece.startsWith('w')
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] filter brightness-110'
                          : 'text-gray-900 dark:text-gray-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                      }
                    `}
                    >
                      {PIECE_UNICODE[piece as keyof typeof PIECE_UNICODE]}
                    </span>
                  )}

                  {/* Square coordinates - hidden on very small screens */}
                  {col === 0 && (
                    <span className="hidden sm:block absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[8px] sm:text-[10px] font-bold text-foreground/60 drop-shadow-sm pointer-events-none">
                      {rank}
                    </span>
                  )}
                  {row === 7 && (
                    <span className="hidden sm:block absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 text-[8px] sm:text-[10px] font-bold text-foreground/60 drop-shadow-sm pointer-events-none">
                      {file}
                    </span>
                  )}

                  {/* Enhanced highlight effect for possible moves */}
                  {isHighlighted && !isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {piece ? (
                        // حركة أسر - دائرة حمراء
                        <div className="absolute inset-0.5 sm:inset-1 border-2 sm:border-4 border-red-500 dark:border-red-400 rounded-full animate-pulse shadow-lg" />
                      ) : (
                        // حركة عادية - نقطة خضراء
                        <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-green-500 dark:bg-green-400 animate-pulse shadow-lg ring-2 ring-green-400/50" />
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Enhanced Turn Indicator */}
      {isMyTurn && (
        <div className="mt-3 sm:mt-4 text-center py-2 sm:py-3 bg-gradient-to-r from-primary/20 via-primary/35 to-primary/20 rounded-lg sm:rounded-xl border border-primary/50 animate-pulse">
          <span className="font-bold text-primary text-sm sm:text-lg flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse shadow-lg" />
            دورك - اختر قطعة للحركة
          </span>
        </div>
      )}

      {/* Promotion Dialog */}
      <Dialog open={promotionDialog?.show || false} onOpenChange={() => setPromotionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center text-xl font-bold">اختر قطعة للترقية</DialogTitle>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {['q', 'r', 'b', 'n'].map((piece) => {
              const pieceSymbol = orientation === 'white'
                ? PIECE_UNICODE[('w' + piece.toUpperCase()) as keyof typeof PIECE_UNICODE]
                : PIECE_UNICODE[('b' + piece.toUpperCase()) as keyof typeof PIECE_UNICODE];
              const pieceName = piece === 'q' ? 'وزير' : piece === 'r' ? 'رخ' : piece === 'b' ? 'فيل' : 'حصان';

              return (
                <Button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="h-24 text-6xl hover:scale-110 transition-transform"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span>{pieceSymbol}</span>
                    <span className="text-xs">{pieceName}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
