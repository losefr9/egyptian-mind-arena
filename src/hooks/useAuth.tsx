import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  id: string;
  username: string;
  balance: number;
  role: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          console.log('Initial session found:', session.user.email);
          // تعيين حالة تسجيل الدخول أولاً بناءً على وجود الجلسة
          setIsLoggedIn(true);
          // محاولة جلب البروفايل مع retry
          await fetchUserProfileWithRetry(session.user.id);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // الاستماع لتغييرات حالة المصادقة - تبسيط الدالة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (session?.user) {
          console.log('User signed in');
          // تعيين حالة تسجيل الدخول فوراً
          setIsLoggedIn(true);
          // جلب البروفايل في setTimeout لتجنب blocking
          setTimeout(() => {
            if (mounted) {
              fetchUserProfileWithRetry(session.user.id);
            }
          }, 0);
        } else {
          console.log('User signed out');
          setUser(null);
          setIsLoggedIn(false);
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      // محاولة جلب الدور من جدول user_roles كـ fallback
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!error && roleData) {
        console.log('Role fetched from user_roles:', roleData.role);
        return roleData.role;
      }
      
      return 'user'; // default role
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }
  };

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserData | null> => {
    try {
      console.log(`Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, balance, role, email')
        .eq('id', userId)
        .maybeSingle(); // استخدام maybeSingle بدلاً من single

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      if (!profile) {
        console.log('No profile found, fetching role separately');
        // إذا لم نجد profile، نجلب الدور من user_roles
        const role = await fetchUserRole(userId);
        
        // إنشاء userData أساسي
        const basicUserData = {
          id: userId,
          username: "مستخدم",
          balance: 0,
          role: role,
          email: ""
        };
        
        setUser(basicUserData);
        return basicUserData;
      }

      console.log('Profile fetched successfully:', profile);

      const userData = {
        id: profile.id,
        username: profile.username || "مستخدم",
        balance: profile.role === 'admin' ? 0 : (profile.balance || 0), // أرصدة الأدمن دائماً 0
        role: profile.role || "user",
        email: profile.email || ""
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // إذا فشل جلب البروفايل، نحاول جلب الدور على الأقل
      if (retryCount === 0) {
        console.log('Attempting to fetch role as fallback');
        try {
          const role = await fetchUserRole(userId);
          const fallbackUserData = {
            id: userId,
            username: "مستخدم",
            balance: 0,
            role: role,
            email: ""
          };
          setUser(fallbackUserData);
          return fallbackUserData;
        } catch (roleError) {
          console.error('Failed to fetch role as fallback:', roleError);
        }
      }
      
      setUser(null);
      return null;
    }
  };

  const fetchUserProfileWithRetry = async (userId: string): Promise<UserData | null> => {
    let lastError = null;
    
    // محاولة 3 مرات
    for (let i = 0; i < 3; i++) {
      try {
        const result = await fetchUserProfile(userId, i);
        if (result) {
          return result;
        }
      } catch (error) {
        lastError = error;
        console.log(`Retry ${i + 1} failed:`, error);
        
        // انتظار قصير قبل المحاولة التالية
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    console.error('All retries failed:', lastError);
    return null;
  };

  const refreshUserData = () => {
    if (user) {
      fetchUserProfile(user.id);
    }
  };

  return {
    user,
    isLoading,
    isLoggedIn,
    refreshUserData
  };
};