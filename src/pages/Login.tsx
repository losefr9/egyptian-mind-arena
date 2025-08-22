import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, ArrowLeft, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if input is email or username
      let email = formData.username;
      
      // If it's not an email, look up the email from username
      if (!formData.username.includes('@')) {
        // Try to get user by username from auth.users metadata
        const { data: users, error: usersError } = await supabase
          .rpc('get_user_email_by_username', { username_input: formData.username });
        
        if (usersError || !users || users.length === 0) {
          // Fallback: try direct username-to-email mapping for admin accounts
          if (formData.username === 'admin1') {
            email = '9bo5om9@gmail.com';
          } else if (formData.username === 'admin2') {
            email = 'totolosefr@gmail.com';
          } else {
            throw new Error('اسم المستخدم غير صحيح');
          }
        } else {
          email = users[0].email;
        }
      }

      console.log('Attempting login with email:', email);

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: formData.password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error('كلمة المرور غير صحيحة أو البريد الإلكتروني غير موجود');
      }

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بعودتك إلى E-FAR!"
      });

      // Navigate to home page
      navigate('/');
    } catch (error: any) {
      console.error('Login process error:', error);
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في تسجيل الدخول",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-primary/20 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <Card className="backdrop-blur-sm border-primary/20 shadow-elegant">
          <CardHeader className="text-center pb-6">
            {/* Logo and Platform Name */}
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mb-4 shadow-glow">
              <Gamepad2 className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              E-FAR
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              تسجيل الدخول
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  اليوزر نيم
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="أدخل اليوزر نيم"
                  className="h-12 text-center"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="أدخل كلمة المرور"
                    className="h-12 text-center pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 text-lg font-semibold mt-8"
                disabled={isLoading}
              >
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>

              {/* Signup Link */}
              <div className="text-center pt-6">
                <p className="text-sm text-muted-foreground">
                  ليس لديك حساب؟{' '}
                  <Link to="/signup" className="text-primary hover:text-primary-glow font-medium hover:underline transition-colors">
                    إنشاء حساب جديد
                  </Link>
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