import React from 'react';
import { Gamepad2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "جاري التحميل..." }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Gamepad2 className="h-8 w-8 text-white" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-lg">{message}</p>
        <div className="flex justify-center space-x-1 space-x-reverse">
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};