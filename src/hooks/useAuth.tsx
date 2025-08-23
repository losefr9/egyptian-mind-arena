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

    const initAuth = async () => {
      try {
        // التحقق من الجلسة الحالية أولاً
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          console.log('Initial session found:', session.user.email);
          await fetchUserProfile(session.user.id);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    // إعداد listener أولاً
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (session?.user) {
          console.log('User signed in, fetching profile...');
          await fetchUserProfile(session.user.id);
          setIsLoggedIn(true);
        } else {
          console.log('User signed out');
          setUser(null);
          setIsLoggedIn(false);
        }
        setIsLoading(false);
      }
    );

    // ثم التحقق من الجلسة الحالية
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, balance, role, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      console.log('Profile fetched:', profile);

      setUser({
        id: profile.id,
        username: profile.username || "مستخدم",
        balance: profile.balance || 0,
        role: profile.role || "user",
        email: profile.email
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUser(null);
    }
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