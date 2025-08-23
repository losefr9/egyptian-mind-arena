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
          const profileData = await fetchUserProfile(session.user.id);
          if (profileData && mounted) {
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // الاستماع لتغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (session?.user) {
          console.log('User signed in, fetching profile...');
          const profileData = await fetchUserProfile(session.user.id);
          if (profileData && mounted) {
            setIsLoggedIn(true);
          }
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
        return null;
      }

      console.log('Profile fetched successfully:', profile);

      const userData = {
        id: profile.id,
        username: profile.username || "مستخدم",
        balance: profile.balance || 0,
        role: profile.role || "user",
        email: profile.email
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUser(null);
      return null;
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