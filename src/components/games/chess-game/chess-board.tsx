import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

interface ChessBoardProps {
  position: string; // FEN notation
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
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <div className="aspect-square w-full max-w-[600px] mx-auto">
        <div className="grid grid-cols-8 gap-0 h-full border-2 border-border rounded-lg overflow-hidden">
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
                    aspect-square relative flex items-center justify-center text-4xl sm:text-5xl
                    transition-all duration-200
                    ${isLight ? 'bg-accent/20' : 'bg-secondary/30'}
                    ${isSelected ? 'ring-4 ring-primary ring-inset' : ''}
                    ${isHighlighted ? 'bg-primary/20' : ''}
                    ${isMyTurn ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  `}
                >
                  {piece && (
                    <span className={`
                      select-none transition-transform duration-200
                      ${isSelected ? 'scale-110' : 'hover:scale-105'}
                      ${piece.startsWith('w') ? 'text-foreground' : 'text-foreground/90'}
                    `}>
                      {PIECE_UNICODE[piece as keyof typeof PIECE_UNICODE]}
                    </span>
                  )}
                  
                  {/* Square coordinates */}
                  {col === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] font-bold text-muted-foreground/50">
                      {rank}
                    </span>
                  )}
                  {row === 7 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold text-muted-foreground/50">
                      {file}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Turn Indicator */}
      {isMyTurn && (
        <div className="mt-4 text-center py-2 bg-primary/20 rounded-lg">
          <span className="font-bold text-primary">دورك - اختر قطعة للحركة</span>
        </div>
      )}
    </Card>
  );
};
