
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiPost, authenticatedGet, authenticatedPost, saveToken, getToken, removeToken } from '@/utils/api';
import { useRouter, useSegments } from 'expo-router';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'crew_lead' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: 'crew_lead' | 'admin') => Promise<void>;
  register: (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Protected route navigation
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const onWelcomeScreen = segments.length === 0;
    const onLoginScreen = segments[0] === 'login';

    console.log('[Auth] Navigation check:', { 
      user: user?.email, 
      inAuthGroup, 
      onWelcomeScreen, 
      onLoginScreen,
      segments,
      isLoggingOut
    });

    if (!user && (inAuthGroup || (!onWelcomeScreen && !onLoginScreen))) {
      // User is not authenticated but trying to access protected routes
      // OR user is not on welcome/login screen
      console.log('[Auth] User not authenticated, redirecting to welcome screen');
      router.replace('/');
    } else if (user && onWelcomeScreen && !isLoggingOut) {
      // User is authenticated and on welcome screen, redirect to home
      console.log('[Auth] User authenticated on welcome screen, redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [user, segments, isLoading, isLoggingOut, router]);

  const checkSession = async () => {
    console.log('[Auth] Checking session...');
    setIsLoading(true);
    
    try {
      const token = await getToken();
      if (!token) {
        console.log('[Auth] No token found');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await authenticatedGet<{ user: User }>('/api/auth/me');
      console.log('[Auth] Session valid, user:', response.user);
      setUser(response.user);
    } catch (error) {
      console.error('[Auth] Session check failed:', error);
      // Token is invalid, clear it
      await removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role: 'crew_lead' | 'admin') => {
    console.log(`[Auth] Logging in as ${role}:`, email);
    
    const endpoint = role === 'crew_lead' 
      ? '/api/auth/crew-lead/login'
      : '/api/auth/admin/login';

    const response = await apiPost<{ user: User; token: string }>(endpoint, {
      email,
      password,
    });

    // Save token
    await saveToken(response.token);
    
    // Set user
    setUser(response.user);
    
    console.log('[Auth] Login successful:', response.user);
  };

  const register = async (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => {
    console.log(`[Auth] Registering as ${role}:`, email);
    
    const endpoint = role === 'crew_lead'
      ? '/api/auth/crew-lead/register'
      : '/api/auth/admin/register';

    const response = await apiPost<{ user: User }>(endpoint, {
      email,
      password,
      name,
    });

    console.log('[Auth] Registration successful:', response.user);
    
    // After registration, log in automatically
    await login(email, password, role);
  };

  const logout = useCallback(async () => {
    console.log('[Auth] Logout initiated...');
    setIsLoggingOut(true);
    
    try {
      // Try to notify server first (with auth token)
      try {
        await authenticatedPost('/api/auth/logout', {});
        console.log('[Auth] Server logout successful');
      } catch (error) {
        console.warn('[Auth] Server logout failed (non-critical):', error);
      }
      
      // Clear local state
      console.log('[Auth] Clearing local auth state...');
      await removeToken();
      
      // Clear user state FIRST
      setUser(null);
      
      console.log('[Auth] Local logout complete - user state cleared');
      
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Even on error, clear local state
      await removeToken();
      setUser(null);
    } finally {
      // Reset isLoggingOut AFTER clearing user state
      setIsLoggingOut(false);
      
      // Force navigation to welcome screen after state is cleared
      // Use setTimeout to ensure this happens after React finishes updating
      setTimeout(() => {
        console.log('[Auth] Force navigating to welcome screen');
        router.replace('/');
      }, 50);
    }
  }, [router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
