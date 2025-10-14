import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Check, 
  X, 
  Clock, 
  TrendingDown,
  CreditCard,
  User,
  Calendar,
  Wallet
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_method: string;
  withdrawal_details: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    username: string;
    email: string;
    balance: number;
  };
}

export const WithdrawRequests = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  const fetchWithdrawRequests = async () => {
    try {
      // First get all withdrawal requests
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      if (!withdrawalsData || withdrawalsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get all unique user IDs
      const userIds = [...new Set(withdrawalsData.map(req => req.user_id))];

      // Get user profiles for these IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, balance')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine the data
      const requestsWithProfiles = withdrawalsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || {
          username: 'مجهول',
          email: 'غير معروف',
          balance: 0
        }
      }));

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات السحب",
        variant: "destructive"
      });
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: WithdrawRequest) => {
    if (!adminMessage.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة رسالة للمستخدم",
        variant: "destructive"
      });
      return;
    }

    if (request.profiles.balance < request.amount) {
      toast({
        title: "رصيد غير كافي",
        description: "رصيد المستخدم أقل من المبلغ المطلوب سحبه",
        variant: "destructive"
      });
      return;
    }

    setProcessingId(request.id);
    
    try {
      // Update withdrawal request status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          admin_notes: adminMessage,
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Deduct amount from user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({
          balance: request.profiles.balance - request.amount
        })
        .eq('id', request.user_id);

      if (balanceError) throw balanceError;

      toast({
        title: "تم القبول",
        description: `تم قبول طلب السحب وخصم ${request.amount} ج.م من حساب المستخدم`
      });

      setAdminMessage('');
      setSelectedRequest(null);
      fetchWithdrawRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في معالجة طلب السحب",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: WithdrawRequest) => {
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
        .from('withdrawal_requests')
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
        description: "تم رفض طلب السحب وإرسال الرسالة للمستخدم"
      });

      setAdminMessage('');
      setSelectedRequest(null);
      fetchWithdrawRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في رفض طلب السحب",
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
        <p className="text-muted-foreground">جاري تحميل طلبات السحب...</p>
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
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">المبلغ المسحوب</p>
                <p className="text-2xl font-bold text-destructive">{totalAmount.toFixed(2)} ج.م</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            جميع طلبات السحب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات سحب</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-destructive/20">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* User Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.profiles.username}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Wallet className="h-4 w-4" />
                          <span>{request.withdrawal_details?.wallet_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-destructive">{request.amount} ج.م</p>
                        <p className="text-sm text-muted-foreground">{request.withdrawal_method}</p>
                        <p className="text-sm">الرصيد الحالي: {request.profiles.balance} ج.م</p>
                        {request.withdrawal_details?.account_name && (
                          <p className="text-xs text-muted-foreground">
                            اسم الحساب: {request.withdrawal_details.account_name}
                          </p>
                        )}
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
                                <DialogTitle>معالجة طلب السحب</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p><strong>المستخدم:</strong> {request.profiles.username}</p>
                                  <p><strong>المبلغ:</strong> {request.amount} ج.م</p>
                                  <p><strong>الطريقة:</strong> {request.withdrawal_method}</p>
                                  <p><strong>الرصيد الحالي:</strong> {request.profiles.balance} ج.م</p>
                                  <p><strong>رقم المحفظة:</strong> {request.withdrawal_details?.wallet_number}</p>
                                  <p><strong>اسم الحساب:</strong> {request.withdrawal_details?.account_name}</p>
                                </div>
                                
                                <div>
                                  <label htmlFor="admin-message" className="text-sm font-medium">رسالة للمستخدم</label>
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