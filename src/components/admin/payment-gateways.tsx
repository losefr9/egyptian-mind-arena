import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Edit, Power, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  account_details: any;
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
      setGateways(data || []);
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

  const updateGateway = async (gateway: PaymentGateway) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update(gateway)
        .eq('id', gateway.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث بيانات البوابة',
      });
      fetchGateways();
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGateway(gateway)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>تعديل بوابة الدفع</DialogTitle>
                        </DialogHeader>
                        {selectedGateway && (
                          <div className="space-y-4">
                            <div>
                              <Label>الحد الأدنى للمبلغ</Label>
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
                              <Label>الحد الأقصى للمبلغ</Label>
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
                              <Label>التعليمات</Label>
                              <Input
                                value={selectedGateway.instructions}
                                onChange={(e) =>
                                  setSelectedGateway({
                                    ...selectedGateway,
                                    instructions: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <Button onClick={() => updateGateway(selectedGateway)}>
                              حفظ التغييرات
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأدنى</p>
                    <p className="text-lg font-semibold">{gateway.min_amount} جنيه</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحد الأقصى</p>
                    <p className="text-lg font-semibold">{gateway.max_amount} جنيه</p>
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
                    <span className="font-medium">{gatewayStats.total_amount.toFixed(2)} جنيه</span>
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
    </div>
  );
};