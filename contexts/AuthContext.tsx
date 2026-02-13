
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  const router = useRouter();
  const segments = useSegments();
  const isLoggingOutRef = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Protected route navigation
  useEffect(() => {
    // Skip navigation during logout or loading to prevent conflicts
    if (isLoading || isLoggingOutRef.current) {
      console.log('[Auth] Skipping navigation check (loading or logging out)');
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';
    const onWelcomeScreen = segments.length === 0;
    const onLoginScreen = segments[0] === 'login';

    console.log('[Auth] Navigation check:', { 
      user: user?.email, 
      inAuthGroup, 
      onWelcomeScreen, 
      onLoginScreen,
      segments
    });

    // Clear any pending navigation timeouts
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    if (!user && (inAuthGroup || (!onWelcomeScreen && !onLoginScreen))) {
      // User is not authenticated but trying to access protected routes
      console.log('[Auth] User not authenticated, redirecting to welcome screen');
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace('/');
      }, 50);
    } else if (user && onWelcomeScreen) {
      // User is authenticated and on welcome screen, redirect to home
      console.log('[Auth] User authenticated on welcome screen, redirecting to home');
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace('/(tabs)/(home)/');
      }, 50);
    }
  }, [user, segments, isLoading]);

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
    // Prevent multiple logout calls and navigation conflicts
    if (isLoggingOutRef.current) {
      console.log('[Auth] Logout already in progress, skipping...');
      return;
    }
    
    isLoggingOutRef.current = true;
    console.log('[Auth] Logout initiated...');
    
    // Clear any pending navigation timeouts
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    
    try {
      // Try to notify server (with auth token before we clear it)
      try {
        await authenticatedPost('/api/auth/logout', {});
        console.log('[Auth] Server logout successful');
      } catch (error) {
        console.warn('[Auth] Server logout failed (non-critical):', error);
      }
      
      // Clear local storage
      console.log('[Auth] Clearing local auth state...');
      await removeToken();
      
      // Clear user state AFTER token is removed to ensure consistency
      setUser(null);
      
      console.log('[Auth] Local logout complete - user state cleared');
      
      // Navigate to welcome screen with a small delay to ensure state updates propagate
      console.log('[Auth] Navigating to welcome screen');
      setTimeout(() => {
        router.replace('/');
      }, 100);
      
      console.log('[Auth] Logout process complete');
      
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Even on error, clear local state
      await removeToken();
      setUser(null);
      setTimeout(() => {
        router.replace('/');
      }, 100);
    } finally {
      // Reset logout flag after navigation completes
      setTimeout(() => {
        isLoggingOutRef.current = false;
        console.log('[Auth] Logout flag reset');
      }, 500);
    }
  }, [router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

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
