import React from 'react';
import { LudoPiece } from './ludo-piece';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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
      const isStartZone = i === 0 || i === 13 || i === 26 || i === 39;

      cells.push(
        <div
          key={i}
          className={cn(
            "relative flex items-center justify-center transition-all duration-300",
            "w-12 h-12 sm:w-14 sm:h-14 border-2",
            isSafeZone
              ? "bg-gradient-to-br from-yellow-200 to-yellow-100 border-yellow-500 shadow-lg scale-110 z-10"
              : "bg-white border-gray-300 hover:bg-gray-50",
            isStartZone && "ring-4 ring-green-400 ring-opacity-50"
          )}
        >
          {isSafeZone && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">⭐</div>
            </div>
          )}
          {piecesAtPosition.length > 0 && (
            <div className="flex gap-0.5 flex-wrap justify-center items-center z-20 relative">
              {piecesAtPosition.slice(0, 4).map((piece) => (
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

  const renderHome = (pieces: Piece[], color: string, playerName: string) => {
    const homePieces = pieces.filter(p => p.inHome);
    const finishedPieces = pieces.filter(p => p.isFinished);

    return (
      <Card className={cn(
        "relative overflow-hidden",
        "w-56 h-56 rounded-3xl shadow-2xl p-6",
        "transition-all duration-500 hover:scale-105",
        color === 'blue'
          ? 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 border-4 border-blue-500'
          : 'bg-gradient-to-br from-red-100 via-red-50 to-red-100 border-4 border-red-500'
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className={cn(
            "absolute inset-0",
            color === 'blue' ? 'bg-blue-900' : 'bg-red-900'
          )} style={{
            backgroundImage: `radial-gradient(circle, ${color === 'blue' ? '#1e3a8a' : '#7f1d1d'} 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Player Name Badge */}
        <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white font-bold text-sm shadow-lg z-10",
          color === 'blue'
            ? 'bg-gradient-to-r from-blue-600 to-blue-500'
            : 'bg-gradient-to-r from-red-600 to-red-500'
        )}>
          {playerName}
        </div>

        {/* Home Pieces Grid */}
        <div className="relative grid grid-cols-2 gap-4 h-full items-center justify-items-center">
          {homePieces.map((piece) => (
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
          ))}
        </div>

        {/* Finished Pieces Counter */}
        {finishedPieces.length > 0 && (
          <div className={cn(
            "absolute -bottom-2 left-1/2 -translate-x-1/2",
            "px-3 py-1 rounded-full text-white font-bold text-xs shadow-lg",
            "flex items-center gap-1",
            color === 'blue' ? 'bg-blue-600' : 'bg-red-600'
          )}>
            <span>🏆</span>
            <span>{finishedPieces.length}/4</span>
          </div>
        )}
      </Card>
    );
  };

  const renderFinishLine = (pieces: Piece[], color: string) => {
    const finishedPieces = pieces.filter(p => p.isFinished);

    return (
      <div className={cn(
        "flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
        "bg-gradient-to-r shadow-lg border-2",
        color === 'blue'
          ? 'from-blue-100 to-blue-50 border-blue-400'
          : 'from-red-100 to-red-50 border-red-400'
      )}>
        <span className="font-bold text-lg">🏁</span>
        {finishedPieces.map((piece) => (
          <LudoPiece
            key={piece.id}
            id={piece.id}
            color={color}
            position={-1}
            isSelected={false}
            onClick={() => {}}
          />
        ))}
        {finishedPieces.length === 0 && (
          <span className="text-sm text-muted-foreground">لا قطع منتهية بعد</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-background dark:via-card/20 dark:to-background rounded-3xl shadow-2xl border-4 border-green-400/30">
      {/* Top Section - Homes */}
      <div className="flex gap-12 items-center flex-wrap justify-center">
        {renderHome(player1Pieces, 'blue', currentPlayerId === player1Id ? 'أنت (أزرق)' : 'الخصم (أحمر)')}
        <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
          VS
        </div>
        {renderHome(player2Pieces, 'red', currentPlayerId === player1Id ? 'الخصم (أحمر)' : 'أنت (أزرق)')}
      </div>

      {/* Middle Section - Board Path */}
      <Card className="p-6 bg-white dark:bg-card/50 rounded-2xl shadow-2xl">
        <div className="relative">
          {/* Decorative Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-200 to-yellow-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-400">
              <span className="text-5xl">🎲</span>
            </div>
          </div>

          {/* Path Grid */}
          <div className="relative z-10 flex flex-wrap max-w-[700px] gap-0.5">
            {renderPath()}
          </div>
        </div>
      </Card>

      {/* Bottom Section - Finish Lines */}
      <div className="flex gap-8 flex-wrap justify-center">
        {renderFinishLine(player1Pieces, 'blue')}
        {renderFinishLine(player2Pieces, 'red')}
      </div>

      {/* Turn Indicator */}
      <Card className={cn(
        "p-4 text-center shadow-xl transition-all duration-300",
        currentPlayerId === player1Id
          ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-500'
          : 'bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-500'
      )}>
        <p className="text-xl font-bold flex items-center justify-center gap-2">
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
          الدور الحالي: {currentPlayerId === player1Id ? '🔵 أنت (أزرق)' : '🔴 الخصم (أحمر)'}
        </p>
      </Card>
    </div>
  );
};
