import React from 'react';
import { LudoPiece } from './ludo-piece';
import { cn } from '@/lib/utils';

interface Piece {
  id: string;
  position: number;
  inHome: boolean;
  isFinished: boolean;
}

interface LudoBoardProps {
  player1Pieces: Piece[];
  player2Pieces: Piece[];
  selectedPiece: string | null;
  onPieceClick: (pieceId: string) => void;
  currentPlayerId: string;
  player1Id: string;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  player1Pieces,
  player2Pieces,
  selectedPiece,
  onPieceClick,
  currentPlayerId,
  player1Id
}) => {
  const renderPath = () => {
    const cells = [];
    const totalCells = 52;
    
    for (let i = 0; i < totalCells; i++) {
      const piecesAtPosition = [
        ...player1Pieces.filter(p => p.position === i && !p.inHome && !p.isFinished),
        ...player2Pieces.filter(p => p.position === i && !p.inHome && !p.isFinished)
      ];
      
      const isSafeZone = i % 13 === 0;
      
      cells.push(
        <div
          key={i}
          className={cn(
            "w-10 h-10 border-2 border-gray-300 flex items-center justify-center",
            isSafeZone && "bg-yellow-200 border-yellow-500"
          )}
        >
          {piecesAtPosition.length > 0 && (
            <div className="flex gap-1">
              {piecesAtPosition.slice(0, 2).map((piece) => (
                <LudoPiece
                  key={piece.id}
                  id={piece.id}
                  color={player1Pieces.find(p => p.id === piece.id) ? 'blue' : 'red'}
                  position={piece.position}
                  isSelected={selectedPiece === piece.id}
                  onClick={() => onPieceClick(piece.id)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return cells;
  };

  const renderHome = (pieces: Piece[], color: string, isTop: boolean) => {
    return (
      <div className={cn(
        "w-48 h-48 rounded-2xl shadow-xl p-4",
        "grid grid-cols-2 gap-4",
        color === 'blue' ? 'bg-blue-100 border-4 border-blue-500' : 'bg-red-100 border-4 border-red-500'
      )}>
        {pieces.map((piece) => (
          piece.inHome && (
            <div key={piece.id} className="flex items-center justify-center">
              <LudoPiece
                id={piece.id}
                color={color}
                position={piece.position}
                inHome={piece.inHome}
                isSelected={selectedPiece === piece.id}
                onClick={() => onPieceClick(piece.id)}
              />
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl">
      <div className="flex gap-8 items-center">
        {renderHome(player1Pieces, 'blue', true)}
        <div className="text-2xl font-bold">VS</div>
        {renderHome(player2Pieces, 'red', true)}
      </div>

      <div className="grid grid-cols-13 gap-0 bg-white p-4 rounded-xl shadow-2xl">
        {renderPath()}
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">
          الدور الحالي: {currentPlayerId === player1Id ? 'أنت (أزرق)' : 'الخصم (أحمر)'}
        </p>
      </div>
    </div>
  );
};
