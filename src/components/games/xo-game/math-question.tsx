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
      const { data, error } = await supabase.rpc('validate_math_answer', {
        question_id: questionId,
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
            {!isCorrect && validationResult && (
              <div className="text-sm">
                الإجابة الصحيحة: {validationResult.correctAnswer}
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