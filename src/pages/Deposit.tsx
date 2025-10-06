import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ArrowRight, ArrowLeft, ImageIcon, CheckCircle } from "lucide-react";

const Deposit = () => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
          description: "يرجى تسجيل الدخول أولاً للوصول إلى صفحة الإيداع",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      setIsLoggedIn(true);
      
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

  const paymentMethods = [
    {
      id: "vodafone_cash",
      name: "فودافون كاش",
      details: {
        wallet_number: "01234567890",
        instructions: "اتصل على *9# واتبع التعليمات لإرسال المبلغ"
      }
    },
    {
      id: "etisalat_cash",
      name: "اتصالات كاش",
      details: {
        wallet_number: "01098765432",
        instructions: "اتصل على *141# واتبع التعليمات لإرسال المبلغ"
      }
    },
    {
      id: "orange_cash",
      name: "أورانج كاش",
      details: {
        wallet_number: "01156789012",
        instructions: "اتصل على *888# واتبع التعليمات لإرسال المبلغ"
      }
    }
  ];

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "خطأ في نوع الملف",
          description: "يرجى اختيار صورة فقط",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "حجم الملف كبير",
          description: "يجب أن يكون حجم الصورة أقل من 5 ميجابايت",
          variant: "destructive"
        });
        return;
      }

      setReceiptFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadReceipt = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    try {
      const { error: uploadError, data } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`فشل في رفع الصورة: ${uploadError.message}`);
      }

      return fileName;
    } catch (error) {
      console.error('Storage upload failed:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) < 50) {
      toast({
        title: "خطأ",
        description: "أقل مبلغ للإيداع هو 50 ج",
        variant: "destructive"
      });
      return;
    }

    if (!paymentMethod || !senderNumber || !receiptFile) {
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

      // Upload receipt image
      console.log('Starting file upload...', receiptFile.name, receiptFile.size);
      const receiptUrl = await uploadReceipt(receiptFile, user.id);
      console.log('File uploaded successfully:', receiptUrl);

      // Get payment method details
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
      
      // Create deposit request
      console.log('Creating deposit request...');
      const { error, data } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_details: selectedMethod?.details || {},
          sender_number: senderNumber,
          receipt_image_url: receiptUrl
        })
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`فشل في حفظ طلب الإيداع: ${error.message}`);
      }

      console.log('Deposit request created successfully:', data);

      // تحديث حالة الإيداع الأول للإحالة
      try {
        await supabase.rpc('mark_first_deposit', {
          p_user_id: user.id
        });
      } catch (refError) {
        console.log('Note: Referral update skipped (no referral)', refError);
      }

      toast({
        title: "تم إرسال طلب الإيداع",
        description: "سيتم مراجعة طلبك ومعالجته في أقرب وقت ممكن"
      });

      // Reset form
      setAmount("");
      setPaymentMethod("");
      setSenderNumber("");
      setReceiptFile(null);
      setReceiptPreview(null);
      
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في إرسال طلب الإيداع",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMethodDetails = paymentMethods.find(m => m.id === paymentMethod);

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
          <h1 className="text-3xl font-bold text-primary">إيداع الأموال</h1>
        </div>

        <Card className="backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-center">طلب إيداع جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-lg font-medium">
                  المبلغ المراد إيداعه (ج.م)
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
                  أقل مبلغ للإيداع 50 ج
                </p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">اختر طريقة الدفع</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-start space-x-reverse space-x-3">
                      <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                      <Label
                        htmlFor={method.id}
                        className="flex-1 cursor-pointer border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium text-lg mb-2">{method.name}</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><span className="font-medium">رقم المحفظة:</span> {method.details.wallet_number}</p>
                          <p><span className="font-medium">التعليمات:</span> {method.details.instructions}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Selected Method Details */}
              {selectedMethodDetails && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-lg mb-3 text-primary">
                      تفاصيل الدفع - {selectedMethodDetails.name}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">الرقم:</span> {selectedMethodDetails.details.wallet_number}</p>
                      <p><span className="font-medium">الخطوات:</span></p>
                      <p className="bg-background/50 p-3 rounded-md">
                        {selectedMethodDetails.details.instructions}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sender Number */}
              <div className="space-y-2">
                <Label htmlFor="senderNumber" className="text-lg font-medium">
                  رقم الهاتف الذي أرسل منه المبلغ
                </Label>
                <Input
                  id="senderNumber"
                  type="tel"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="text-center"
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-3">
                <Label className="text-lg font-medium">إرفاق صورة إيصال الدفع</Label>
                
                {receiptPreview ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-sm font-medium text-success">تم رفع الصورة بنجاح</span>
                      </div>
                      <img 
                        src={receiptPreview} 
                        alt="معاينة الإيصال" 
                        className="max-w-full h-32 object-contain rounded mx-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {receiptFile?.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      اختيار صورة أخرى
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          اضغط لاختيار صورة الإيصال
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, GIF حتى 5MB
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "جاري الإرسال..." : "إرسال طلب الإيداع"}
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Deposit;