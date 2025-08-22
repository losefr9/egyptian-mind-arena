import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Search,
  Calendar,
  Mail,
  Phone,
  Trophy,
  Wallet
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  balance: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل المستخدمين",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);
  const totalWins = users.reduce((sum, user) => sum + (user.wins || 0), 0);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">جاري تحميل المستخدمين...</p>
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
                <p className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-primary">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold text-success">{totalBalance.toFixed(2)} ج.م</p>
              </div>
              <Wallet className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الانتصارات</p>
                <p className="text-2xl font-bold text-warning">{totalWins}</p>
              </div>
              <Trophy className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة المستخدمين
          </CardTitle>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="البحث عن المستخدمين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* User Basic Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">{user.username || 'غير محدد'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{user.email || 'غير محدد'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>انضم في {new Date(user.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>

                      {/* Financial Info */}
                      <div className="space-y-2">
                        <div className="text-center p-3 bg-success/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                          <p className="text-xl font-bold text-success">{user.balance?.toFixed(2) || '0.00'} ج.م</p>
                        </div>
                      </div>

                      {/* Gaming Stats */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-primary/10 rounded">
                            <p className="text-xs text-muted-foreground">الانتصارات</p>
                            <p className="text-lg font-bold text-primary">{user.wins || 0}</p>
                          </div>
                          <div className="text-center p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground">الهزائم</p>
                            <p className="text-lg font-bold text-destructive">{user.losses || 0}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <Badge variant="outline">
                            معدل الفوز: {
                              user.wins || user.losses 
                                ? ((user.wins || 0) / ((user.wins || 0) + (user.losses || 0)) * 100).toFixed(1)
                                : '0'
                            }%
                          </Badge>
                        </div>
                      </div>

                      {/* Account Status */}
                      <div className="space-y-2">
                        <Badge variant="default" className="bg-success text-white">
                          حساب نشط
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          آخر تحديث: {new Date(user.updated_at).toLocaleDateString('ar-EG')}
                        </p>
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