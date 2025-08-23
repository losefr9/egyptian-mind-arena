import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timer, Calculator, CheckCircle, XCircle } from 'lucide-react';

interface MathQuestionProps {
  question: string;
  questionId: string;
  timeLeft: number;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onTimeUp: () => void;
  disabled?: boolean;
}

export const MathQuestion: React.FC<MathQuestionProps> = ({
  question,
  questionId,
  timeLeft,
  onAnswer,
  onTimeUp,
  disabled = false
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [validationResult, setValidationResult] = useState<{isCorrect: boolean, correctAnswer: number} | null>(null);

  useEffect(() => {
    if (timeLeft <= 0 && !isAnswered) {
      onTimeUp();
    }
  }, [timeLeft, isAnswered, onTimeUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isAnswered || !userAnswer.trim()) return;

    const answer = parseInt(userAnswer);
    
    setIsAnswered(true);
    setShowResult(true);

    // استيراد supabase للتحقق من الإجابة
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data, error } = await supabase.rpc('validate_generated_math_answer', {
        question_text: question,
        user_answer: answer
      });

      if (error) throw error;

      const result = data?.[0];
      const isCorrect = result?.is_correct || false;
      const correctAnswer = result?.correct_answer || 0;

      setValidationResult({ isCorrect, correctAnswer });
      onAnswer(answer, isCorrect);

      // إخفاء النتيجة بعد ثانيتين
      setTimeout(() => {
        setShowResult(false);
        setIsAnswered(false);
        setUserAnswer('');
        setValidationResult(null);
      }, 2000);
    } catch (error) {
      console.error('Error validating answer:', error);
      onAnswer(answer, false);
    }
  };

  const getTimeColor = () => {
    if (timeLeft <= 5) return 'text-red-500';
    if (timeLeft <= 10) return 'text-yellow-500';
    return 'text-green-500';
  };

  const isCorrect = showResult && validationResult?.isCorrect;

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 animate-scale-in">
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse" />
            <span className="text-sm sm:text-base">🧮 سؤال رياضي</span>
          </div>
          <div className={`flex items-center gap-2 ${getTimeColor()} animate-pulse`}>
            <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="font-bold text-sm sm:text-base">{timeLeft}ث</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 p-3 sm:p-4 bg-muted rounded-lg animate-fade-in">
            🔢 {question}
          </div>
        </div>

        {showResult ? (
          <div className={`text-center p-3 sm:p-4 rounded-lg animate-scale-in ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 animate-bounce" />
              ) : (
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 animate-pulse" />
              )}
              <span className="font-bold text-sm sm:text-base">
                {isCorrect ? '🎉 إجابة صحيحة!' : '❌ إجابة خاطئة!'}
              </span>
            </div>
            {!isCorrect && validationResult && (
              <div className="text-xs sm:text-sm">
                الإجابة الصحيحة: {validationResult.correctAnswer}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Input
                type="number"
                placeholder="أدخل الإجابة"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={disabled || isAnswered}
                className="text-center text-base sm:text-lg"
                autoFocus
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full animate-pulse hover:animate-none text-sm sm:text-base"
              disabled={disabled || isAnswered || !userAnswer.trim() || timeLeft <= 0}
              size="sm"
            >
              🚀 إرسال الإجابة
            </Button>
          </form>
        )}

        <div className="text-xs text-muted-foreground text-center animate-fade-in">
          ⚡ أجب على السؤال بسرعة لوضع علامتك على اللوحة
        </div>
      </CardContent>
    </Card>
  );
};