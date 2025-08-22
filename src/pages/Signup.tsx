import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, ArrowRight } from 'lucide-react';

const Signup = () => {
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // سيتم تنفيذ إنشاء الحساب مع Supabase Auth لاحقاً
    console.log('إنشاء حساب جديد...');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full px-4">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              إنشاء حساب جديد
            </CardTitle>
            <p className="text-muted-foreground">
              انضم إلى منصة العقل المصري
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullname">الاسم الكامل</Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="أدخل اسمك الكامل"
                  required
                />
              </div>
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
                  placeholder="أدخل كلمة مرور قوية"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
              <Button type="submit" variant="golden" className="w-full">
                إنشاء الحساب
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{' '}
                  <a href="/login" className="text-primary hover:underline">
                    تسجيل الدخول
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

export default Signup;