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
  const renderHome = (pieces: Piece[], color: string, playerName: string) => {
    const homePieces = pieces.filter(p => p.inHome);
    const finishedPieces = pieces.filter(p => p.isFinished);

    return (
      <Card className={cn(
        "relative overflow-hidden",
        "w-48 h-48 sm:w-56 sm:h-56 rounded-3xl shadow-2xl p-4 sm:p-6",
        "transition-all duration-500 hover:scale-105",
        color === 'blue'
          ? 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100 border-4 border-blue-500'
          : 'bg-gradient-to-br from-red-100 via-red-50 to-red-100 border-4 border-red-500'
      )}>
        <div className="absolute inset-0 opacity-10">
          <div className={cn(
            "absolute inset-0",
            color === 'blue' ? 'bg-blue-900' : 'bg-red-900'
          )} style={{
            backgroundImage: `radial-gradient(circle, ${color === 'blue' ? '#1e3a8a' : '#7f1d1d'} 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white font-bold text-xs sm:text-sm shadow-lg z-10",
          color === 'blue'
            ? 'bg-gradient-to-r from-blue-600 to-blue-500'
            : 'bg-gradient-to-r from-red-600 to-red-500'
        )}>
          {playerName}
        </div>

        <div className="relative grid grid-cols-2 gap-3 sm:gap-4 h-full items-center justify-items-center">
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

  const renderPathCell = (position: number) => {
    const piecesAtPosition = [
      ...player1Pieces.filter(p => p.position === position && !p.inHome && !p.isFinished),
      ...player2Pieces.filter(p => p.position === position && !p.inHome && !p.isFinished)
    ];

    const isSafeZone = position % 13 === 0;
    const isStartZone = position === 0 || position === 13 || position === 26 || position === 39;

    return (
      <div
        key={position}
        className={cn(
          "relative flex items-center justify-center transition-all duration-300",
          "w-8 h-8 sm:w-10 sm:h-10 border-2 rounded-md",
          isSafeZone
            ? "bg-gradient-to-br from-yellow-300 to-yellow-200 border-yellow-600 shadow-lg scale-110"
            : "bg-white dark:bg-card border-gray-400 dark:border-gray-600",
          isStartZone && "ring-2 ring-green-500"
        )}
      >
        {isSafeZone && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">⭐</span>
          </div>
        )}
        {piecesAtPosition.length > 0 && (
          <div className="flex gap-0.5 flex-wrap justify-center items-center z-20 relative">
            {piecesAtPosition.slice(0, 2).map((piece) => (
              <div key={piece.id} className="scale-75">
                <LudoPiece
                  id={piece.id}
                  color={player1Pieces.find(p => p.id === piece.id) ? 'blue' : 'red'}
                  position={piece.position}
                  isSelected={selectedPiece === piece.id}
                  onClick={() => onPieceClick(piece.id)}
                />
              </div>
            ))}
          </div>
        )}
        <span className="absolute bottom-0 right-0 text-[8px] text-muted-foreground font-mono opacity-50">
          {position}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8 bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-background dark:via-card/20 dark:to-background rounded-3xl shadow-2xl border-4 border-green-400/30">
      <div className="flex gap-6 sm:gap-12 items-center flex-wrap justify-center">
        {renderHome(player1Pieces, 'blue', currentPlayerId === player1Id ? 'أنت (أزرق)' : 'الخصم')}
        <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
          VS
        </div>
        {renderHome(player2Pieces, 'red', currentPlayerId === player1Id ? 'الخصم' : 'أنت (أحمر)')}
      </div>

      <Card className="p-4 sm:p-6 bg-white dark:bg-card/50 rounded-2xl shadow-2xl">
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-yellow-200 to-yellow-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-400">
              <span className="text-4xl sm:text-5xl">🎲</span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-6 gap-1">
            {/* الصف الأول (0-5) */}
            {[...Array(6)].map((_, i) => renderPathCell(i))}

            {/* الصف الثاني (6-11) */}
            {[...Array(6)].map((_, i) => renderPathCell(6 + i))}

            {/* الصف الثالث (12-17) */}
            {[...Array(6)].map((_, i) => renderPathCell(12 + i))}

            {/* الصف الرابع (18-23) */}
            {[...Array(6)].map((_, i) => renderPathCell(18 + i))}

            {/* الصف الخامس (24-29) */}
            {[...Array(6)].map((_, i) => renderPathCell(24 + i))}

            {/* الصف السادس (30-35) */}
            {[...Array(6)].map((_, i) => renderPathCell(30 + i))}

            {/* الصف السابع (36-41) */}
            {[...Array(6)].map((_, i) => renderPathCell(36 + i))}

            {/* الصف الثامن (42-47) */}
            {[...Array(6)].map((_, i) => renderPathCell(42 + i))}

            {/* الصف التاسع (48-51) + مربعات فارغة */}
            {[...Array(4)].map((_, i) => renderPathCell(48 + i))}
            <div className="w-8 h-8 sm:w-10 sm:h-10" />
            <div className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>
      </Card>

      <Card className={cn(
        "p-4 text-center shadow-xl transition-all duration-300 w-full max-w-md",
        currentPlayerId === player1Id
          ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-500'
          : 'bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-500'
      )}>
        <p className="text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
          الدور الحالي: {currentPlayerId === player1Id ? '🔵 أنت (أزرق)' : '🔴 الخصم (أحمر)'}
        </p>
      </Card>
    </div>
  );
};
