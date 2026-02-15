
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(tabs)';
    const onWelcome = segments.length === 0;
    
    if (!user && inAuthGroup) {
      console.log('[Auth] Redirecting to welcome');
      router.replace('/');
    } else if (user && onWelcome) {
      console.log('[Auth] Redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [user, segments, isLoading, router]);

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const response = await authenticatedGet<{ user: User }>('/api/auth/me');
      setUser(response.user);
    } catch (error) {
      await removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role: 'crew_lead' | 'admin') => {
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/login' : '/api/auth/admin/login';
    const response = await apiPost<{ user: User; token: string }>(endpoint, { email, password });
    await saveToken(response.token);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => {
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/register' : '/api/auth/admin/register';
    const response = await apiPost<{ user: User }>(endpoint, { email, password, name });
    await login(email, password, role);
  };

  const logout = useCallback(async () => {
    console.log('[Auth] Logout initiated');
    
    try {
      try {
        await authenticatedPost('/api/auth/logout', {});
        console.log('[Auth] Server logout successful');
      } catch (error) {
        console.warn('[Auth] Server logout failed (non-critical):', error);
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      console.log('[Auth] Clearing local state...');
      
      await removeToken();
      console.log('[Auth] Token removed');
      
      setUser(null);
      console.log('[Auth] User set to null');
      
      setIsLoading(false);
      console.log('[Auth] Loading set to false');
      
      // DIRECTLY navigate instead of relying on navigation effect
      console.log('[Auth] About to navigate to /');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[Auth] Navigating now');
      (router as any).navigate({ name: 'index' });
      
      console.log('[Auth] Navigation called');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};
