import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

interface ChessBoardProps {
  position: string;
  onMove: (from: string, to: string) => Promise<boolean>;
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

  const handleSquareClick = async (row: number, col: number) => {
    if (!isMyTurn) return;

    const squareName = getSquareName(row, col);
    const piece = board[row][col];

    if (selectedSquare) {
      const success = await onMove(selectedSquare, squareName);
      setSelectedSquare(null);
      setHighlightedSquares([]);
    } else if (piece) {
      const myColor = orientation === 'white' ? 'w' : 'b';
      if (piece.startsWith(myColor)) {
        setSelectedSquare(squareName);
        setHighlightedSquares([squareName]);
      }
    }
  };

  const isSquareLight = (row: number, col: number) => {
    return (row + col) % 2 === 0;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="aspect-square w-full max-w-[600px] mx-auto">
        <div className="grid grid-cols-8 gap-0 h-full border-4 border-primary/30 rounded-xl overflow-hidden shadow-2xl">
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
                  className={`
                    aspect-square relative flex items-center justify-center text-4xl sm:text-5xl lg:text-6xl
                    transition-all duration-300 ease-out
                    ${
                      isLight
                        ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/30'
                        : 'bg-gradient-to-br from-amber-800 to-amber-700 dark:from-amber-950 dark:to-amber-900'
                    }
                    ${
                      isSelected
                        ? 'ring-4 ring-primary ring-inset shadow-[inset_0_0_20px_rgba(var(--primary),0.5)] scale-95'
                        : ''
                    }
                    ${
                      isHighlighted
                        ? 'bg-primary/30 shadow-[inset_0_0_15px_rgba(var(--primary),0.4)]'
                        : ''
                    }
                    ${
                      isMyTurn
                        ? 'hover:bg-primary/20 hover:shadow-[inset_0_0_10px_rgba(var(--primary),0.3)] cursor-pointer active:scale-95'
                        : 'cursor-not-allowed opacity-70'
                    }
                  `}
                >
                  {piece && (
                    <span
                      className={`
                      select-none transition-all duration-300 ease-out
                      ${isSelected ? 'scale-110 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]' : 'hover:scale-105'}
                      ${
                        piece.startsWith('w')
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter brightness-110'
                          : 'text-gray-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]'
                      }
                    `}
                    >
                      {PIECE_UNICODE[piece as keyof typeof PIECE_UNICODE]}
                    </span>
                  )}

                  {/* Square coordinates */}
                  {col === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] font-bold text-foreground/60 drop-shadow-sm">
                      {rank}
                    </span>
                  )}
                  {row === 7 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold text-foreground/60 drop-shadow-sm">
                      {file}
                    </span>
                  )}

                  {/* Highlight effect for possible moves */}
                  {isHighlighted && !isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Turn Indicator */}
      {isMyTurn && (
        <div className="mt-4 text-center py-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-xl border border-primary/40 animate-pulse">
          <span className="font-bold text-primary text-lg flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            دورك - اختر قطعة للحركة
          </span>
        </div>
      )}
    </Card>
  );
};
