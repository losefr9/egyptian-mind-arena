import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Edit, Power, TrendingUp, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AccountDetail {
  label: string;
  value: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  account_details: AccountDetail[];
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  fees_percentage: number;
  processing_time: string;
  instructions: string;
}

interface GatewayStats {
  gateway_id: string;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_amount: number;
  total_fees: number;
  avg_processing_time_minutes: number;
}

export const PaymentGateways = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [stats, setStats] = useState<GatewayStats[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGateways();
    fetchStats();
  }, []);

  const fetchGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // تحويل account_details من jsonb إلى مصفوفة
      const formattedData = (data || []).map(gateway => ({
        ...gateway,
        account_details: Array.isArray(gateway.account_details) 
          ? (gateway.account_details as any[]).map(d => ({ label: String(d.label || ''), value: String(d.value || '') }))
          : Object.entries(gateway.account_details || {}).map(([label, value]) => ({ label, value: String(value) }))
      })) as PaymentGateway[];
      
      setGateways(formattedData);
    } catch (error) {
      console.error('Error fetching gateways:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بوابات الدفع',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateway_stats')
        .select('*');

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleGateway = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: `تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} البوابة`,
      });
      fetchGateways();
    } catch (error) {
      console.error('Error toggling gateway:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة البوابة',
        variant: 'destructive',
      });
    }
  };

  const updateGateway = async () => {
    if (!selectedGateway) return;

    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({
          name: selectedGateway.name,
          type: selectedGateway.type,
          account_details: selectedGateway.account_details as any,
          min_amount: selectedGateway.min_amount,
          max_amount: selectedGateway.max_amount,
          fees_percentage: selectedGateway.fees_percentage,
          instructions: selectedGateway.instructions,
          processing_time: selectedGateway.processing_time,
        })
        .eq('id', selectedGateway.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث بيانات البوابة',
      });
      fetchGateways();
      setEditDialogOpen(false);
      setSelectedGateway(null);
    } catch (error) {
      console.error('Error updating gateway:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث البوابة',
        variant: 'destructive',
      });
    }
  };

  const addAccountDetail = () => {
    if (!selectedGateway) return;
    setSelectedGateway({
      ...selectedGateway,
      account_details: [...selectedGateway.account_details, { label: '', value: '' }]
    });
  };

  const removeAccountDetail = (index: number) => {
    if (!selectedGateway) return;
    const newDetails = [...selectedGateway.account_details];
    newDetails.splice(index, 1);
    setSelectedGateway({
      ...selectedGateway,
      account_details: newDetails
    });
  };

  const updateAccountDetail = (index: number, field: 'label' | 'value', value: string) => {
    if (!selectedGateway) return;
    const newDetails = [...selectedGateway.account_details];
    newDetails[index][field] = value;
    setSelectedGateway({
      ...selectedGateway,
      account_details: newDetails
    });
  };

  const getGatewayStats = (gatewayId: string) => {
    return stats.find(s => s.gateway_id === gatewayId) || {
      total_transactions: 0,
      successful_transactions: 0,
      failed_transactions: 0,
      total_amount: 0,
      total_fees: 0,
      avg_processing_time_minutes: 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة بوابات الدفع</h2>
      </div>

      {/* بطاقات البوابات */}
      <div className="grid gap-6 md:grid-cols-2">
        {gateways.map((gateway) => {
          const gatewayStats = getGatewayStats(gateway.id);
          const successRate = gatewayStats.total_transactions > 0
            ? (gatewayStats.successful_transactions / gatewayStats.total_transactions) * 100
            : 0;

          return (
            <Card key={gateway.id} className={!gateway.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {gateway.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateway.is_active}
                      onCheckedChange={() => toggleGateway(gateway.id, gateway.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGateway(gateway);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* معلومات الحساب */}
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">معلومات الحساب:</p>
                  {gateway.account_details.map((detail, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{detail.label}:</span>{' '}
                      <span className="text-muted-foreground">{detail.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأدنى</p>
                    <p className="text-lg font-semibold">{gateway.min_amount} ج.م</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأقصى</p>
                    <p className="text-lg font-semibold">{gateway.max_amount} ج.م</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">إجمالي المعاملات</span>
                    <span className="font-medium">{gatewayStats.total_transactions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">معدل النجاح</span>
                    <span className="font-medium flex items-center gap-1">
                      {successRate.toFixed(1)}%
                      {successRate > 90 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">إجمالي المبالغ</span>
                    <span className="font-medium">{gatewayStats.total_amount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">متوسط وقت المعالجة</span>
                    <span className="font-medium">{gatewayStats.avg_processing_time_minutes} دقيقة</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog للتعديل */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بوابة الدفع</DialogTitle>
          </DialogHeader>
          {selectedGateway && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>اسم البوابة</Label>
                  <Input
                    value={selectedGateway.name}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>نوع البوابة</Label>
                  <Input
                    value={selectedGateway.type}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        type: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* معلومات الحسابات/الأرقام */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>معلومات الحساب (الأرقام/المحافظ)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAccountDetail}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة
                  </Button>
                </div>
                
                {selectedGateway.account_details.map((detail, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <Input
                        placeholder="العنوان (مثل: رقم الهاتف، اسم المحفظة)"
                        value={detail.label}
                        onChange={(e) => updateAccountDetail(index, 'label', e.target.value)}
                        className="mb-2"
                      />
                      <Input
                        placeholder="القيمة (مثل: 01234567890)"
                        value={detail.value}
                        onChange={(e) => updateAccountDetail(index, 'value', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAccountDetail(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد الأدنى للمبلغ (ج.م)</Label>
                  <Input
                    type="number"
                    value={selectedGateway.min_amount}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        min_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>الحد الأقصى للمبلغ (ج.م)</Label>
                  <Input
                    type="number"
                    value={selectedGateway.max_amount}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        max_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نسبة الرسوم (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedGateway.fees_percentage}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        fees_percentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>وقت المعالجة</Label>
                  <Input
                    value={selectedGateway.processing_time}
                    onChange={(e) =>
                      setSelectedGateway({
                        ...selectedGateway,
                        processing_time: e.target.value,
                      })
                    }
                    placeholder="مثل: 5-15 دقيقة"
                  />
                </div>
              </div>

              <div>
                <Label>التعليمات</Label>
                <Textarea
                  value={selectedGateway.instructions}
                  onChange={(e) =>
                    setSelectedGateway({
                      ...selectedGateway,
                      instructions: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="أدخل تعليمات للمستخدمين حول كيفية استخدام هذه البوابة"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={updateGateway} className="flex-1">
                  حفظ التغييرات
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedGateway(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
