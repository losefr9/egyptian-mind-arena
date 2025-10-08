import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'offer' | 'update' | 'warning';
  target_type: 'all' | 'specific_users' | 'game_players';
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'announcement' as const,
    target_type: 'all' as const,
    scheduled_for: '',
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الإشعارات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const notification = {
        ...newNotification,
        created_by: user.id,
        status: newNotification.scheduled_for ? 'scheduled' : 'draft',
        scheduled_for: newNotification.scheduled_for || null,
      };

      const { error } = await supabase
        .from('notifications')
        .insert([notification]);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء الإشعار',
      });

      setShowCreateDialog(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'announcement',
        target_type: 'all',
        scheduled_for: '',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الإشعار',
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async (notificationId: string) => {
    try {
      // الحصول على الإشعار
      const { data: notification } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (!notification) throw new Error('الإشعار غير موجود');

      // الحصول على المستخدمين المستهدفين
      let targetUsers: any[] = [];
      if (notification.target_type === 'all') {
        const { data } = await supabase.from('profiles').select('id');
        targetUsers = data || [];
      }

      // إنشاء سجلات التسليم
      const deliveryRecords = targetUsers.map(user => ({
        notification_id: notificationId,
        user_id: user.id,
      }));

      const { error: deliveryError } = await supabase
        .from('notification_delivery')
        .insert(deliveryRecords);

      if (deliveryError) throw deliveryError;

      // تحديث حالة الإشعار
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      toast({
        title: 'تم بنجاح',
        description: `تم إرسال الإشعار إلى ${targetUsers.length} مستخدم`,
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الإشعار',
        variant: 'destructive',
      });
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إلغاء الإشعار',
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error cancelling notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الإشعار',
        variant: 'destructive',
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      announcement: 'إعلان',
      offer: 'عرض',
      update: 'تحديث',
      warning: 'تحذير',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTargetLabel = (target: string) => {
    const labels = {
      all: 'جميع المستخدمين',
      specific_users: 'مستخدمين محددين',
      game_players: 'لاعبي لعبة معينة',
    };
    return labels[target as keyof typeof labels] || target;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: 'مسودة', icon: Clock, className: 'text-muted-foreground' },
      scheduled: { label: 'مجدول', icon: Calendar, className: 'text-blue-500' },
      sent: { label: 'تم الإرسال', icon: CheckCircle, className: 'text-green-500' },
      cancelled: { label: 'ملغي', icon: XCircle, className: 'text-red-500' },
    };
    const badge = badges[status as keyof typeof badges];
    if (!badge) return null;
    const Icon = badge.icon;
    return (
      <span className={`flex items-center gap-1 ${badge.className}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </span>
    );
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
        <h2 className="text-2xl font-bold">إدارة الإشعارات</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              إنشاء إشعار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء إشعار جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <Input
                  value={newNotification.title}
                  onChange={(e) =>
                    setNewNotification({ ...newNotification, title: e.target.value })
                  }
                  placeholder="عنوان الإشعار"
                />
              </div>

              <div>
                <Label>الرسالة</Label>
                <Textarea
                  value={newNotification.message}
                  onChange={(e) =>
                    setNewNotification({ ...newNotification, message: e.target.value })
                  }
                  placeholder="محتوى الإشعار"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الإشعار</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value: any) =>
                      setNewNotification({ ...newNotification, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">إعلان</SelectItem>
                      <SelectItem value="offer">عرض</SelectItem>
                      <SelectItem value="update">تحديث</SelectItem>
                      <SelectItem value="warning">تحذير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>المستهدفون</Label>
                  <Select
                    value={newNotification.target_type}
                    onValueChange={(value: any) =>
                      setNewNotification({ ...newNotification, target_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="specific_users">مستخدمين محددين</SelectItem>
                      <SelectItem value="game_players">لاعبي لعبة معينة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>جدولة الإرسال (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={newNotification.scheduled_for}
                  onChange={(e) =>
                    setNewNotification({ ...newNotification, scheduled_for: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={createNotification} className="flex-1">
                  {newNotification.scheduled_for ? 'جدولة الإشعار' : 'حفظ كمسودة'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* قائمة الإشعارات */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {notification.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{getTypeLabel(notification.type)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {getTargetLabel(notification.target_type)}
                    </span>
                    <span>•</span>
                    {getStatusBadge(notification.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notification.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => sendNotification(notification.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      إرسال الآن
                    </Button>
                  )}
                  {(notification.status === 'draft' || notification.status === 'scheduled') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelNotification(notification.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      إلغاء
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{notification.message}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>تم الإنشاء: {new Date(notification.created_at).toLocaleDateString('ar-EG')}</span>
                {notification.scheduled_for && (
                  <>
                    <span>•</span>
                    <span>
                      مجدول: {new Date(notification.scheduled_for).toLocaleString('ar-EG')}
                    </span>
                  </>
                )}
                {notification.sent_at && (
                  <>
                    <span>•</span>
                    <span>
                      تم الإرسال: {new Date(notification.sent_at).toLocaleString('ar-EG')}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد إشعارات بعد</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};