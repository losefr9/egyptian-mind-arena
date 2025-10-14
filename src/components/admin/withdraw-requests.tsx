import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Wallet,
  Filter,
  Download,
  Search,
  AlertCircle,
  DollarSign
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

interface WithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_method: string;
  withdrawal_details: any;
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

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  avgProcessingTime: number;
}

export const WithdrawRequests = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<WithdrawRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    avgProcessingTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  
  // فلاتر
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, statusFilter, methodFilter, searchTerm, dateFrom, dateTo, amountMin, amountMax]);

  const fetchWithdrawRequests = async () => {
    try {
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      if (!withdrawalsData || withdrawalsData.length === 0) {
        setRequests([]);
        setFilteredRequests([]);
        calculateStats([]);
        return;
      }

      const userIds = [...new Set(withdrawalsData.map(req => req.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, balance')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      const requestsWithProfiles = withdrawalsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || {
          username: 'مجهول',
          email: 'غير معروف',
          balance: 0
        }
      }));

      setRequests(requestsWithProfiles);
      setFilteredRequests(requestsWithProfiles);
      calculateStats(requestsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات السحب",
        variant: "destructive"
      });
      setRequests([]);
      setFilteredRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: WithdrawRequest[]) => {
    const pending = data.filter(r => r.status === 'pending').length;
    const approved = data.filter(r => r.status === 'approved').length;
    const rejected = data.filter(r => r.status === 'rejected').length;
    const totalAmount = data
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.amount, 0);

    // حساب متوسط وقت المعالجة
    const processedRequests = data.filter(r => r.processed_at);
    const avgProcessingTime = processedRequests.length > 0
      ? processedRequests.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const processed = new Date(r.processed_at!).getTime();
          return sum + (processed - created);
        }, 0) / processedRequests.length / (1000 * 60) // تحويل إلى دقائق
      : 0;

    setStats({
      pending,
      approved,
      rejected,
      totalAmount,
      avgProcessingTime: Math.round(avgProcessingTime)
    });
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // فلتر طريقة السحب
    if (methodFilter !== 'all') {
      filtered = filtered.filter(r => r.withdrawal_method === methodFilter);
    }

    // بحث
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.profiles.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.withdrawal_details?.wallet_number?.includes(searchTerm)
      );
    }

    // فلتر التاريخ
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.created_at) <= new Date(dateTo));
    }

    // فلتر المبلغ
    if (amountMin) {
      filtered = filtered.filter(r => r.amount >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(r => r.amount <= parseFloat(amountMax));
    }

    setFilteredRequests(filtered);
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

  const exportToCSV = () => {
    const headers = ['التاريخ', 'المستخدم', 'البريد', 'المبلغ', 'الطريقة', 'رقم المحفظة', 'الحالة', 'ملاحظات'];
    const rows = filteredRequests.map(r => [
      new Date(r.created_at).toLocaleDateString('ar-EG'),
      r.profiles.username,
      r.profiles.email,
      r.amount,
      r.withdrawal_method,
      r.withdrawal_details?.wallet_number || '',
      r.status,
      r.admin_notes || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `طلبات_السحب_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
      case 'approved':
        return <Badge className="bg-green-600"><Check className="h-3 w-3 ml-1" />مقبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (request: WithdrawRequest) => {
    const hoursSinceCreated = (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60);
    
    if (request.status === 'pending' && hoursSinceCreated > 24) {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 ml-1" />متأخر</Badge>;
    }
    if (request.amount > 1000) {
      return <Badge variant="default" className="text-xs bg-purple-600">مبلغ كبير</Badge>;
    }
    return null;
  };

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">معلق</p>
                <p className="text-2xl font-bold text-orange-800">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">مقبول</p>
                <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">مرفوض</p>
                <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
              </div>
              <X className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">إجمالي المسحوب</p>
                <p className="text-xl font-bold text-purple-800">{stats.totalAmount.toFixed(2)} ج.م</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">متوسط المعالجة</p>
                <p className="text-xl font-bold text-blue-800">{stats.avgProcessingTime} دقيقة</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              فلاتر البحث
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 ml-1" />
              تصدير CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث (اسم، بريد، رقم محفظة)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="طريقة السحب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                <SelectItem value="instapay">انستاباي</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="من تاريخ"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="إلى تاريخ"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="أقل مبلغ"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
              <Input
                type="number"
                placeholder="أكبر مبلغ"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              عرض {filteredRequests.length} من {requests.length} طلب
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setMethodFilter('all');
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
                setAmountMin('');
                setAmountMax('');
              }}
            >
              إعادة تعيين الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            طلبات السحب ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات تطابق الفلاتر</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-red-500/30 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      {/* User Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.profiles.username}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Wallet className="h-4 w-4" />
                          <span>{request.withdrawal_details?.wallet_number}</span>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-red-600">{request.amount} ج.م</p>
                        <Badge variant="outline">{request.withdrawal_method}</Badge>
                        <p className="text-sm">الرصيد: {request.profiles.balance} ج.م</p>
                        {request.withdrawal_details?.account_name && (
                          <p className="text-xs text-muted-foreground">
                            اسم الحساب: {request.withdrawal_details.account_name}
                          </p>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleString('ar-EG')}</span>
                        </div>
                        {request.processed_at && (
                          <p className="text-xs text-muted-foreground">
                            تمت المعالجة: {new Date(request.processed_at).toLocaleString('ar-EG')}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request)}
                        </div>
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
                                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                  <p><strong>المستخدم:</strong> {request.profiles.username}</p>
                                  <p><strong>المبلغ:</strong> {request.amount} ج.م</p>
                                  <p><strong>الطريقة:</strong> {request.withdrawal_method}</p>
                                  <p><strong>الرصيد الحالي:</strong> {request.profiles.balance} ج.م</p>
                                  <p><strong>رقم المحفظة:</strong> {request.withdrawal_details?.wallet_number}</p>
                                  <p><strong>اسم الحساب:</strong> {request.withdrawal_details?.account_name}</p>
                                  {request.profiles.balance < request.amount && (
                                    <div className="flex items-center gap-2 text-destructive">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="text-sm font-medium">رصيد غير كافي!</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <label htmlFor="admin-message" className="text-sm font-medium">رسالة للمستخدم *</label>
                                  <Textarea
                                    id="admin-message"
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    placeholder="اكتب رسالة للمستخدم..."
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApprove(request)}
                                    disabled={processingId === request.id || request.profiles.balance < request.amount}
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
