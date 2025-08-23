import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timer, Calculator, CheckCircle, XCircle } from 'lucide-react';

interface MathQuestionProps {
  question: string;
  correctAnswer: number;
  timeLeft: number;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onTimeUp: () => void;
  disabled?: boolean;
}

export const MathQuestion: React.FC<MathQuestionProps> = ({
  question,
  correctAnswer,
  timeLeft,
  onAnswer,
  onTimeUp,
  disabled = false
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0 && !isAnswered) {
      onTimeUp();
    }
  }, [timeLeft, isAnswered, onTimeUp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isAnswered || !userAnswer.trim()) return;

    const answer = parseInt(userAnswer);
    const isCorrect = answer === correctAnswer;
    
    setIsAnswered(true);
    setShowResult(true);
    onAnswer(answer, isCorrect);

    // إخفاء النتيجة بعد ثانيتين
    setTimeout(() => {
      setShowResult(false);
      setIsAnswered(false);
      setUserAnswer('');
    }, 2000);
  };

  const getTimeColor = () => {
    if (timeLeft <= 5) return 'text-red-500';
    if (timeLeft <= 10) return 'text-yellow-500';
    return 'text-green-500';
  };

  const isCorrect = showResult && parseInt(userAnswer) === correctAnswer;

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <span>سؤال رياضي</span>
          </div>
          <div className={`flex items-center gap-2 ${getTimeColor()}`}>
            <Timer className="h-4 w-4" />
            <span className="font-bold">{timeLeft}ث</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4 p-4 bg-muted rounded-lg">
            {question} = ?
          </div>
        </div>

        {showResult ? (
          <div className={`text-center p-4 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span className="font-bold">
                {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة!'}
              </span>
            </div>
            {!isCorrect && (
              <div className="text-sm">
                الإجابة الصحيحة: {correctAnswer}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="number"
                placeholder="أدخل الإجابة"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={disabled || isAnswered}
                className="text-center text-lg"
                autoFocus
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={disabled || isAnswered || !userAnswer.trim() || timeLeft <= 0}
            >
              إرسال الإجابة
            </Button>
          </form>
        )}

        <div className="text-xs text-muted-foreground text-center">
          أجب على السؤال لوضع علامتك على اللوحة
        </div>
      </CardContent>
    </Card>
  );
};