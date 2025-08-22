import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Wallet } from "lucide-react";

const Withdraw = () => {
  const [amount, setAmount] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState("");
  const [walletDetails, setWalletDetails] = useState({
    wallet_number: "",
    account_name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const quickAmounts = [50, 100, 200, 500];

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "يجب تسجيل الدخول",
          description: "يرجى تسجيل الدخول أولاً للوصول إلى صفحة السحب",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Get user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Error checking auth:', error);
      navigate('/login');
    }
  };

  const withdrawalMethods = [
    {
      id: "vodafone_cash",
      name: "فودافون كاش",
      description: "استلام على محفظة فودافون كاش"
    },
    {
      id: "etisalat_cash", 
      name: "اتصالات كاش",
      description: "استلام على محفظة اتصالات كاش"
    },
    {
      id: "orange_cash",
      name: "أورانج كاش", 
      description: "استلام على محفظة أورانج كاش"
    }
  ];

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) < 50) {
      toast({
        title: "خطأ",
        description: "أقل مبلغ للسحب هو 50 ج",
        variant: "destructive"
      });
      return;
    }

    if (!withdrawalMethod || !walletDetails.wallet_number || !walletDetails.account_name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Check user balance from the profile we fetched
      if (userProfile && userProfile.balance < parseFloat(amount)) {
        toast({
          title: "رصيد غير كافي",
          description: `رصيدك الحالي ${userProfile.balance.toFixed(2)} ج.م أقل من المبلغ المطلوب سحبه`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          withdrawal_method: withdrawalMethod,
          withdrawal_details: walletDetails
        });

      if (error) throw error;

      toast({
        title: "تم إرسال طلب السحب",
        description: "سيتم مراجعة طلبك ومعالجته في أقرب وقت ممكن"
      });

      // Reset form
      setAmount("");
      setWithdrawalMethod("");
      setWalletDetails({ wallet_number: "", account_name: "" });
      
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في إرسال طلب السحب",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMethod = withdrawalMethods.find(m => m.id === withdrawalMethod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-muted/30 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-primary">سحب الأموال</h1>
          {userProfile && (
            <div className="mr-auto">
              <span className="text-sm text-muted-foreground">الرصيد الحالي: </span>
              <span className="text-lg font-bold text-success">{userProfile.balance?.toFixed(2) || '0.00'} ج.م</span>
            </div>
          )}
        </div>

        <Card className="backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-center">طلب سحب جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-lg font-medium">
                  المبلغ المراد سحبه (ج.م)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="text-lg text-center"
                  min="50"
                />
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type="button"
                      variant={amount === quickAmount.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickAmount(quickAmount)}
                      className="min-w-16"
                    >
                      {quickAmount} ج
                    </Button>
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  أقل مبلغ للسحب 50 ج
                </p>
              </div>

              {/* Withdrawal Methods */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">اختر وسيلة السحب</Label>
                <RadioGroup value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                  {withdrawalMethods.map((method) => (
                    <div key={method.id} className="flex items-start space-x-reverse space-x-3">
                      <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                      <Label
                        htmlFor={method.id}
                        className="flex-1 cursor-pointer border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Wallet className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium text-lg">{method.name}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Wallet Details */}
              {selectedMethod && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-lg mb-4 text-primary">
                      تفاصيل الاستلام - {selectedMethod.name}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="wallet_number" className="text-sm font-medium">
                          رقم المحفظة لاستلام المبلغ
                        </Label>
                        <Input
                          id="wallet_number"
                          type="tel"
                          value={walletDetails.wallet_number}
                          onChange={(e) => setWalletDetails(prev => ({
                            ...prev,
                            wallet_number: e.target.value
                          }))}
                          placeholder="01xxxxxxxxx"
                          className="text-center mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="account_name" className="text-sm font-medium">
                          اسم صاحب المحفظة
                        </Label>
                        <Input
                          id="account_name"
                          type="text"
                          value={walletDetails.account_name}
                          onChange={(e) => setWalletDetails(prev => ({
                            ...prev,
                            account_name: e.target.value
                          }))}
                          placeholder="أدخل الاسم كما هو مسجل في المحفظة"
                          className="text-center mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Important Notice */}
              <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                <CardContent className="pt-4">
                  <h4 className="font-bold text-sm mb-2 text-yellow-800 dark:text-yellow-200">
                    ملاحظة هامة:
                  </h4>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• تأكد من صحة بيانات المحفظة قبل الإرسال</li>
                    <li>• سيتم معالجة طلبك خلال 24 ساعة</li>
                    <li>• لا يمكن إلغاء الطلب بعد الإرسال</li>
                    <li>• تأكد من وجود رصيد كافي في حسابك</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "جاري الإرسال..." : "إرسال طلب السحب"}
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Withdraw;