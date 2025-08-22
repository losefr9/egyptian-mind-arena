import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, ArrowLeft, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const [formData, setFormData] = useState({
    playerName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور وتأكيد كلمة المرور غير متطابقتان",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون على الأقل 6 أحرف",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username)
        .single();

      if (existingUser) {
        throw new Error('اسم المستخدم مستخدم بالفعل');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email || `${formData.username}@efar.local`,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            player_name: formData.playerName,
            phone: formData.phone
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // The profile will be created automatically by the trigger
        // Just wait a moment and then try to fetch it
        setTimeout(async () => {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user!.id)
              .single();

            if (!error && profile) {
              // Update profile with username from form since trigger might not have it
              await supabase
                .from('profiles')
                .update({
                  username: formData.username
                })
                .eq('id', authData.user!.id);
            }
          } catch (error) {
            console.error('Error updating profile:', error);
          }
        }, 1000);
      }

      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "مرحباً بك في منصة E-FAR!"
      });

      // Navigate to home page
      navigate('/');
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في إنشاء الحساب",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-lg w-full">
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
              إنشاء حساب جديد
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-5">
              {/* Player Name */}
              <div className="space-y-2">
                <Label htmlFor="playerName" className="text-sm font-medium">
                  اسم اللاعب *
                </Label>
                <Input
                  id="playerName"
                  name="playerName"
                  type="text"
                  value={formData.playerName}
                  onChange={handleInputChange}
                  placeholder="أدخل اسم اللاعب"
                  className="h-12 text-center"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  اليوزر نيم *
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

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  رقم الهاتف *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="01xxxxxxxxx"
                  className="h-12 text-center"
                  required
                />
              </div>

              {/* Email (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  الإيميل (اختياري)
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@email.com"
                  className="h-12 text-center"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="أدخل كلمة مرور قوية"
                    className="h-12 text-center pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  تأكيد كلمة المرور *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="أعد إدخال كلمة المرور"
                    className="h-12 text-center pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "جاري الإنشاء..." : "إنشاء الحساب"}
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{' '}
                  <Link to="/login" className="text-primary hover:text-primary-glow font-medium hover:underline transition-colors">
                    تسجيل الدخول
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

export default Signup;