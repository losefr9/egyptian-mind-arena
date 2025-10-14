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
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  processed_at: string | null;
  profiles: {
    username: string;
    email: string;
    balance: number;
  };
}

export const DepositsRequests = () => {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    paymentMethod: 'all',
    dateRange: '7',
    searchTerm: '',
    minAmount: '',
    maxAmount: '',
  });
  const { toast } = useToast();

  const itemsPerPage = 20;

  useEffect(() => {
    fetchDepositRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filters]);

  const fetchDepositRequests = async () => {
    try {
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (depositsError) throw depositsError;

      if (!depositsData || depositsData.length === 0) {
        setRequests([]);
        return;
      }

      for (const request of depositsData) {
        try {
          await supabase.rpc('log_admin_deposit_access', {
            request_id: request.id
          });
        } catch (logError) {
          console.warn('Failed to log access:', logError);
        }
      }

      const userIds = [...new Set(depositsData.map(req => req.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, balance')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      const requestsWithProfiles = depositsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || {
          username: 'مجهول',
          email: 'غير معروف',
          balance: 0
        }
      }));

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching deposit requests:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الإيداع",
        variant: "destructive"
      });
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Filter by payment method
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(r => r.payment_method === filters.paymentMethod);
    }

    // Filter by date range
    const daysAgo = parseInt(filters.dateRange);
    if (daysAgo > 0) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - daysAgo);
      filtered = filtered.filter(r => new Date(r.created_at) >= dateLimit);
    }

    // Filter by amount range
    if (filters.minAmount) {
      filtered = filtered.filter(r => r.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(r => r.amount <= parseFloat(filters.maxAmount));
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.profiles.username.toLowerCase().includes(term) ||
        r.profiles.email.toLowerCase().includes(term) ||
        r.sender_number.includes(term)
      );
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
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

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({
          balance: request.profiles.balance + request.amount
        })
        .eq('id', request.user_id);

      if (balanceError) throw balanceError;

      // تسجيل في سجل الأنشطة
      await supabase.rpc('log_user_activity', {
        _user_id: request.user_id,
        _action: 'deposit_approved',
        _details: {
          amount: request.amount,
          payment_method: request.payment_method,
          new_balance: request.profiles.balance + request.amount
        }
      });

      toast({
        title: "تم القبول",
        description: `تم قبول طلب الإيداع وإضافة ${request.amount} جنيه إلى حساب المستخدم`
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

      await supabase.rpc('log_user_activity', {
        _user_id: request.user_id,
        _action: 'deposit_rejected',
        _details: {
          amount: request.amount,
          reason: adminMessage
        }
      });

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

  const handleBulkApprove = async () => {
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending').slice(0, 10);
    
    if (pendingRequests.length === 0) {
      toast({
        title: "لا توجد طلبات",
        description: "لا توجد طلبات معلقة للموافقة الجماعية",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`هل أنت متأكد من الموافقة على ${pendingRequests.length} طلبات؟`)) {
      return;
    }

    toast({
      title: "جاري المعالجة",
      description: `جاري الموافقة على ${pendingRequests.length} طلبات...`,
    });

    let successCount = 0;
    for (const request of pendingRequests) {
      try {
        await handleApprove({ ...request, profiles: request.profiles });
        successCount++;
      } catch (error) {
        console.error('Bulk approve error:', error);
      }
    }

    toast({
      title: "اكتملت المعالجة",
      description: `تم الموافقة على ${successCount} من ${pendingRequests.length} طلبات`,
    });

    fetchDepositRequests();
  };

  const exportToCSV = () => {
    const csvContent = [
      ['التاريخ', 'المستخدم', 'البريد', 'المبلغ', 'الطريقة', 'الحالة', 'ملاحظات'],
      ...filteredRequests.map(r => [
        new Date(r.created_at).toLocaleDateString('ar-EG'),
        r.profiles.username,
        r.profiles.email,
        r.amount,
        r.payment_method,
        r.status,
        r.admin_notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `deposit-requests-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات بنجاح",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
      case 'approved':
        return <Badge className="bg-success text-white"><Check className="h-3 w-3 ml-1" />مقبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (request: DepositRequest) => {
    const hoursSinceCreation = (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60);
    if (request.amount >= 1000) {
      return <Badge className="bg-red-600"><AlertTriangle className="h-3 w-3 ml-1" />مبلغ كبير</Badge>;
    }
    if (hoursSinceCreation > 24) {
      return <Badge className="bg-orange-600"><Clock className="h-3 w-3 ml-1" />متأخر</Badge>;
    }
    return null;
  };

  const pendingCount = filteredRequests.filter(r => r.status === 'pending').length;
  const approvedToday = filteredRequests.filter(r => 
    r.status === 'approved' && 
    new Date(r.processed_at || '').toDateString() === new Date().toDateString()
  ).length;
  const totalAmount = filteredRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const avgProcessingTime = filteredRequests
    .filter(r => r.processed_at && r.status !== 'pending')
    .reduce((sum, r) => {
      const diff = new Date(r.processed_at!).getTime() - new Date(r.created_at).getTime();
      return sum + diff / (1000 * 60);
    }, 0) / filteredRequests.filter(r => r.processed_at).length || 0;

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm font-medium text-muted-foreground">مقبول اليوم</p>
                <p className="text-2xl font-bold text-primary">{approvedToday}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">المبلغ الكلي</p>
                <p className="text-2xl font-bold text-success">{totalAmount.toFixed(2)} ج.م</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">متوسط وقت المعالجة</p>
                <p className="text-2xl font-bold">{avgProcessingTime.toFixed(0)} دقيقة</p>
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              الفلترة والإجراءات
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 ml-1" />
                تصدير CSV
              </Button>
              <Button size="sm" onClick={handleBulkApprove} disabled={pendingCount === 0}>
                <CheckCircle2 className="h-4 w-4 ml-1" />
                موافقة جماعية
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>الحالة</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="approved">مقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <Select value={filters.paymentMethod} onValueChange={(value) => setFilters({...filters, paymentMethod: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                  <SelectItem value="etisalat_cash">اتصالات كاش</SelectItem>
                  <SelectItem value="orange_money">أورانج موني</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الفترة الزمنية</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">اليوم</SelectItem>
                  <SelectItem value="7">آخر 7 أيام</SelectItem>
                  <SelectItem value="30">آخر 30 يوم</SelectItem>
                  <SelectItem value="0">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الحد الأدنى</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
              />
            </div>

            <div>
              <Label>الحد الأقصى</Label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.maxAmount}
                onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
              />
            </div>

            <div>
              <Label>بحث</Label>
              <Input
                placeholder="اسم، إيميل، رقم..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              طلبات الإيداع ({filteredRequests.length})
            </span>
            <span className="text-sm text-muted-foreground">
              صفحة {currentPage} من {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedRequests.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات تطابق الفلترة</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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

                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-primary">{request.amount} ج.م</p>
                          <p className="text-sm text-muted-foreground">{request.payment_method}</p>
                          <p className="text-sm">الرصيد: {request.profiles.balance} ج.م</p>
                        </div>

                        <div className="space-y-2">
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request)}
                          {request.admin_notes && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {request.admin_notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 items-start">
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
                                    src={`https://axyhlyhcfvumtwpzgbgh.supabase.co/storage/v1/object/public/payment-receipts/${request.receipt_image_url}`}
                                    alt="إيصال الدفع"
                                    className="max-w-full h-auto rounded-lg"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg';
                                    }}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};