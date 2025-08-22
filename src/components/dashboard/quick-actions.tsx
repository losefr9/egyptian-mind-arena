import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'deposit',
      title: 'إيداع الأموال',
      description: 'أضف أموال إلى حسابك',
      icon: Wallet,
      color: 'text-primary bg-primary/10',
      action: () => navigate('/deposit')
    },
    {
      id: 'withdraw',
      title: 'سحب الأموال',
      description: 'اسحب أرباحك بسهولة',
      icon: CreditCard,
      color: 'text-success bg-success/10',
      action: () => navigate('/withdraw')
    },
    {
      id: 'play',
      title: 'ابدأ اللعب',
      description: 'اختر لعبتك واربح الآن',
      icon: TrendingUp,
      color: 'text-warning bg-warning/10',
      action: () => navigate('/games')
    }
  ];

  return (
    <Card className="mb-8 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl text-center">الإجراءات السريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="lg"
                onClick={action.action}
                className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-elegant transition-all duration-300 group"
              >
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};