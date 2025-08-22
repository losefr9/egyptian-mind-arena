import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  TrendingUp,
  Receipt,
  User,
  Phone,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  sender_number: string;
  receipt_image_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    username: string;
    email: string;
    balance: number;
  };
}

export const DepositsRequests = () => {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDepositRequests();
  }, []);

  const fetchDepositRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select(`
          id,
          user_id,
          amount,
          payment_method,
          payment_details,
          sender_number,
          receipt_image_url,
          status,
          admin_notes,
          created_at,
          profiles (
            username,
            email,
            balance
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الإيداع",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: DepositRequest) => {
    if (!adminMessage.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة رسالة للمستخدم",
        variant: "destructive"
      });
      return;
    }

    setProcessingId(request.id);
    
    try {
      // Update deposit request status
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'approved',
          admin_notes: adminMessage,
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({
          balance: request.profiles.balance + request.amount
        })
        .eq('id', request.user_id);

      if (balanceError) throw balanceError;

      toast({
        title: "تم القبول",
        description: `تم قبول طلب الإيداع وإضافة ${request.amount} ج.م إلى حساب المستخدم`
      });

      setAdminMessage('');
      setSelectedRequest(null);
      fetchDepositRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في معالجة طلب الإيداع",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: DepositRequest) => {
    if (!adminMessage.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    setProcessingId(request.id);
    
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          admin_notes: adminMessage,
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "تم الرفض",
        description: "تم رفض طلب الإيداع وإرسال الرسالة للمستخدم"
      });

      setAdminMessage('');
      setSelectedRequest(null);
      fetchDepositRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في رفض طلب الإيداع",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-success text-white"><Check className="h-3 w-3 ml-1" />مقبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const totalAmount = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">جاري تحميل طلبات الإيداع...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الطلبات المعلقة</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-primary">{requests.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">المبلغ المقبول</p>
                <p className="text-2xl font-bold text-success">{totalAmount.toFixed(2)} ج.م</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            جميع طلبات الإيداع
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات إيداع</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* User Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.profiles.username}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{request.sender_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-primary">{request.amount} ج.م</p>
                        <p className="text-sm text-muted-foreground">{request.payment_method}</p>
                        <p className="text-sm">الرصيد الحالي: {request.profiles.balance} ج.م</p>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        {getStatusBadge(request.status)}
                        {request.admin_notes && (
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {request.admin_notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {request.receipt_image_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 ml-1" />
                                الإيصال
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>إيصال الدفع</DialogTitle>
                              </DialogHeader>
                              <div className="text-center">
                                <img 
                                  src={`${supabase.storage.from('payment-receipts').getPublicUrl(request.receipt_image_url).data.publicUrl}`}
                                  alt="إيصال الدفع"
                                  className="max-w-full h-auto rounded-lg"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {request.status === 'pending' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                معالجة
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>معالجة طلب الإيداع</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p><strong>المستخدم:</strong> {request.profiles.username}</p>
                                  <p><strong>المبلغ:</strong> {request.amount} ج.م</p>
                                  <p><strong>الطريقة:</strong> {request.payment_method}</p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="admin-message">رسالة للمستخدم</Label>
                                  <Textarea
                                    id="admin-message"
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    placeholder="اكتب رسالة للمستخدم..."
                                    className="mt-1"
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApprove(request)}
                                    disabled={processingId === request.id}
                                    className="flex-1"
                                  >
                                    <Check className="h-4 w-4 ml-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReject(request)}
                                    disabled={processingId === request.id}
                                    className="flex-1"
                                  >
                                    <X className="h-4 w-4 ml-1" />
                                    رفض
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};