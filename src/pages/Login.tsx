import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, ArrowRight } from 'lucide-react';

const Login = () => {
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // سيتم تنفيذ تسجيل الدخول مع Supabase Auth لاحقاً
    console.log('تسجيل الدخول...');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full px-4">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              تسجيل الدخول
            </CardTitle>
            <p className="text-muted-foreground">
              ادخل إلى حسابك لبدء اللعب
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
              <Button type="submit" variant="golden" className="w-full">
                تسجيل الدخول
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  ليس لديك حساب؟{' '}
                  <a href="/signup" className="text-primary hover:underline">
                    إنشاء حساب جديد
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;