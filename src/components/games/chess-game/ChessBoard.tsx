import React from 'react';
import { Chess, Square } from 'chess.js';

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square) => Promise<boolean>;
  playerColor: 'white' | 'black';
  disabled: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ game, onMove, playerColor, disabled }) => {
  const [selectedSquare, setSelectedSquare] = React.useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = React.useState<Square[]>([]);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

  const getPieceSymbol = (piece: { type: string; color: string } | null): string => {
    if (!piece) return '';
    const symbols: Record<string, Record<string, string>> = {
      'p': { 'w': '♙', 'b': '♟' },
      'n': { 'w': '♘', 'b': '♞' },
      'b': { 'w': '♗', 'b': '♝' },
      'r': { 'w': '♖', 'b': '♜' },
      'q': { 'w': '♕', 'b': '♛' },
      'k': { 'w': '♔', 'b': '♚' }
    };
    return symbols[piece.type]?.[piece.color] || '';
  };

  const handleSquareClick = async (square: Square) => {
    if (disabled) return;

    if (selectedSquare) {
      // Try to make a move
      const success = await onMove(selectedSquare, square);
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      // Select piece
      const piece = game.get(square);
      if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to as Square));
      }
    }
  };

  const isLightSquare = (file: string, rank: number): boolean => {
    const fileIndex = files.indexOf(file);
    return (fileIndex + rank) % 2 === 0;
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="grid grid-cols-8 gap-0 border-4 border-primary/30 rounded-lg overflow-hidden shadow-2xl">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = game.get(square);
            const isLight = isLightSquare(file, rank);
            const isSelected = selectedSquare === square;
            const isPossibleMove = possibleMoves.includes(square);
            
            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  aspect-square flex items-center justify-center text-4xl sm:text-5xl md:text-6xl
                  cursor-pointer transition-all duration-200 relative
                  ${isLight ? 'bg-[#E0E7FF]' : 'bg-[#3B82F6]'}
                  ${isSelected ? 'ring-4 ring-primary ring-inset' : ''}
                  ${isPossibleMove ? 'after:content-[""] after:absolute after:w-4 after:h-4 after:bg-success/50 after:rounded-full' : ''}
                  ${!disabled && piece && piece.color === (playerColor === 'white' ? 'w' : 'b') ? 'hover:brightness-90' : ''}
                `}
              >
                {piece && (
                  <span className={`select-none ${piece.color === 'w' ? 'filter drop-shadow-lg' : 'opacity-90'}`}>
                    {getPieceSymbol(piece)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Coordinates */}
      <div className="grid grid-cols-8 mt-1 text-center text-xs text-muted-foreground">
        {files.map(file => (
          <div key={file}>{file}</div>
        ))}
      </div>
    </div>
  );
};
