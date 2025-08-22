import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Edit, DollarSign, Activity, Users, TrendingUp, Wallet } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  balance: number;
  wins: number;
  losses: number;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UserActivity {
  id: string;
  user_id: string;
  admin_id: string | null;
  action: string;
  details: any;
  created_at: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [balanceAction, setBalanceAction] = useState({ amount: '', operation: 'add' });
  const { toast } = useToast();

  // جلب بيانات المستخدمين
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات المستخدمين",
        variant: "destructive",
      });
    }
  };

  // جلب سجل النشاط
  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('Activities table might not exist yet:', error);
        setActivities([]);
        return;
      }
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchActivities()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // تحديث رصيد المستخدم
  const updateUserBalance = async () => {
    if (!selectedUser || !balanceAction.amount) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مستخدم وإدخال المبلغ",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('update_user_balance', {
        _user_id: selectedUser.id,
        _amount: parseFloat(balanceAction.amount),
        _operation: balanceAction.operation
      });

      if (error) throw error;

      // تسجيل النشاط
      await supabase.rpc('log_user_activity', {
        _user_id: selectedUser.id,
        _action: `balance_${balanceAction.operation}`,
        _details: {
          amount: parseFloat(balanceAction.amount),
          operation: balanceAction.operation,
          previous_balance: selectedUser.balance
        }
      });

      toast({
        title: "تم بنجاح",
        description: "تم تحديث رصيد المستخدم بنجاح",
      });

      await fetchUsers();
      await fetchActivities();
      setBalanceAction({ amount: '', operation: 'add' });
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الرصيد",
        variant: "destructive",
      });
    }
  };

  // تصفية المستخدمين
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.includes(searchTerm)
  );

  // حساب الإحصائيات
  const totalUsers = users.length;
  const totalBalance = users.reduce((sum, user) => sum + Number(user.balance), 0);
  const totalWins = users.reduce((sum, user) => sum + user.wins, 0);
  const adminUsers = users.filter(user => user.role === 'admin').length;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات المستخدمين */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary ml-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-green-500 ml-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold">{totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500 ml-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الانتصارات</p>
                <p className="text-2xl font-bold">{totalWins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500 ml-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">عدد الأدمن</p>
                <p className="text-2xl font-bold">{adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث وإدارة الرصيد */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="ml-2 h-5 w-5" />
            البحث وإدارة المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="البحث بالإيميل أو اليوزرنيم أو ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* إدارة الرصيد */}
          {selectedUser && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-3">
                إدارة رصيد: {selectedUser.username || selectedUser.email}
              </h4>
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-sm font-medium">المبلغ</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={balanceAction.amount}
                    onChange={(e) => setBalanceAction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">العملية</label>
                  <select
                    value={balanceAction.operation}
                    onChange={(e) => setBalanceAction(prev => ({ ...prev, operation: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="add">إضافة</option>
                    <option value="subtract">خصم</option>
                    <option value="set">تحديد</option>
                  </select>
                </div>
                <Button onClick={updateUserBalance}>تحديث الرصيد</Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>إلغاء</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle>المستخدمين ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد نتائج للبحث
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{user.username || 'غير محدد'}</h4>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'إدمن' : 'مستخدم'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        انضم في: {new Date(user.created_at).toLocaleDateString('ar')}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {Number(user.balance).toFixed(2)} ج.م
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.wins} فوز / {user.losses} خسارة
                      </div>
                      <div className="text-xs text-muted-foreground">
                        معدل الفوز: {user.wins + user.losses > 0 
                          ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* سجل النشاط */}
      <Card>
        <CardHeader>
          <CardTitle>آخر الأنشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد أنشطة مسجلة
              </p>
            ) : (
              activities.slice(0, 10).map((activity) => {
                const user = users.find(u => u.id === activity.user_id);
                return (
                  <div key={activity.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {user?.username || user?.email || 'مستخدم محذوف'}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          - {activity.action}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString('ar')}
                      </span>
                    </div>
                    {activity.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(activity.details, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManagement;