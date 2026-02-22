
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiPost, apiCall, authenticatedGet, authenticatedPost, saveToken, getToken, removeToken, saveCompanyToken, getCompanyToken, removeCompanyToken, companyApiPost, companyAuthApiGet, companyAuthApiPost, BACKEND_URL } from '@/utils/api';
import { useRouter, useSegments } from 'expo-router';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'crew_lead' | 'admin';
}

interface Company {
  id: string;
  email: string;
  name: string;
  city?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  companyLoading: boolean;
  isAuthenticated: boolean;
  isCompanyAuthenticated: boolean;
  login: (email: string, password: string, role: 'crew_lead' | 'admin') => Promise<void>;
  register: (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  companyLogin: (email: string, password: string) => Promise<void>;
  companyRegister: (email: string, password: string, name: string, city?: string, phone?: string) => Promise<void>;
  companyLogout: () => Promise<void>;
  checkSession: () => Promise<void>;
  checkCompanySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check session functions - defined with useCallback but NO dependencies to avoid circular loops
  const checkSession = useCallback(async () => {
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
  }, []); // Empty dependency array - this function doesn't depend on anything

  const checkCompanySession = useCallback(async () => {
    try {
      const token = await getCompanyToken();
      if (__DEV__) console.log('[Auth] Checking company session, token:', token ? 'present' : 'missing');
      if (!token) {
        setCompany(null);
        setCompanyLoading(false);
        setIsLoading(false);
        return;
      }
      const response = await companyAuthApiGet<{ company: Company }>('/api/auth/company/me');
      if (__DEV__) console.log('[Auth] Company session valid:', response.company.name);
      setCompany(response.company);
      
      // If company session is valid, check user session
      const userToken = await getToken();
      if (userToken) {
        try {
          const userResponse = await authenticatedGet<{ user: User }>('/api/auth/me');
          setUser(userResponse.user);
        } catch (error) {
          await removeToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    } catch (error) {
      if (__DEV__) console.error('[Auth] Company session check failed:', error);
      await removeCompanyToken();
      setCompany(null);
      setCompanyLoading(false);
      setIsLoading(false);
    } finally {
      setCompanyLoading(false);
    }
  }, []); // Empty dependency array - this function doesn't depend on anything

  // Initial session check - only runs once on mount
  useEffect(() => {
    checkCompanySession();
  }, []); // Empty dependency array - only run once on mount

  // Navigation logic - runs when auth state or route changes
  useEffect(() => {
    if (companyLoading || isLoading) return;
    
    const inAuthGroup = segments[0] === '(tabs)';
    const onWelcome = segments.length === 0;
    const onCompanyLogin = segments[0] === 'login' && segments[1] === 'company';
    const onRoleLogin = segments[0] === 'login' && (segments[1] === 'crew-lead' || segments[1] === 'admin');
    
    if (!company && !onCompanyLogin) {
      if (__DEV__) console.log('[Auth] No company session, redirecting to company login');
      router.replace('/login/company');
    } else if (company && !user && inAuthGroup) {
      if (__DEV__) console.log('[Auth] Company authenticated but no user, redirecting to welcome');
      router.replace('/');
    } else if (company && user && (onWelcome || onRoleLogin || onCompanyLogin)) {
      if (__DEV__) console.log('[Auth] Fully authenticated, redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [user, company, segments, isLoading, companyLoading, router]);

  const companyLogin = async (email: string, password: string) => {
    const response = await companyApiPost<{ company: Company; token: string }>('/api/auth/company/login', { email, password });
    await saveCompanyToken(response.token);
    setCompany(response.company);
    setCompanyLoading(false);
    setIsLoading(false);
  };

  const companyRegister = async (email: string, password: string, name: string, city?: string, phone?: string) => {
    if (__DEV__) console.log('[Auth] Registering company at /api/companies/register');
    try {
      const response = await companyApiPost<{ company: Company }>('/api/companies/register', { email, password, name, city, phone });
      if (__DEV__) console.log('[Auth] Company registration successful:', response);
      // After registration, automatically log in
      await companyLogin(email, password);
    } catch (error: any) {
      if (__DEV__) console.error('[Auth] Company registration failed:', error);
      throw error;
    }
  };

  const companyLogout = useCallback(async () => {
    if (__DEV__) console.log('[Auth] Company logout started');
    try {
      try {
        const token = await getCompanyToken();
        if (token) {
          await apiCall('/api/auth/company/logout', { 
            method: 'POST', 
            requiresCompanyAuth: true 
          });
        }
      } catch (error) {
        if (__DEV__) console.warn('[Auth] Server company logout failed:', error);
      }
    } finally {
      await removeCompanyToken();
      await removeToken();
      setCompany(null);
      setUser(null);
      setCompanyLoading(false);
      setIsLoading(false);
      
      if (__DEV__) console.log('[Auth] Company logout complete, reloading page');
      
      // Force a full page reload to clear everything
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        } else {
          // For native platforms, navigate to company login
          router.replace('/login/company');
        }
      }, 100);
    }
  }, [router]);

  const login = async (email: string, password: string, role: 'crew_lead' | 'admin') => {
    if (__DEV__) console.log('[Auth] Login attempt:', { email, role });
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/login' : '/api/auth/admin/login';
    const response = await companyAuthApiPost<{ user: User; token: string }>(endpoint, { email, password });
    if (__DEV__) console.log('[Auth] Login successful, saving token');
    await saveToken(response.token);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => {
    if (__DEV__) console.log('[Auth] Register attempt:', { email, name, role });
    if (__DEV__) console.log('[Auth] Checking company token before registration...');
    const companyToken = await getCompanyToken();
    if (__DEV__) console.log('[Auth] Company token status:', companyToken ? 'present' : 'MISSING');
    
    if (!companyToken) {
      const error = new Error('Company session not found. Please log in as a company first.');
      if (__DEV__) console.error('[Auth] Registration blocked - no company token');
      throw error;
    }
    
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/register' : '/api/auth/admin/register';
    if (__DEV__) console.log('[Auth] Calling registration endpoint:', endpoint);
    
    try {
      const response = await companyAuthApiPost<{ user: User }>(endpoint, { email, password, name });
      if (__DEV__) console.log('[Auth] Registration successful, now logging in');
      await login(email, password, role);
    } catch (error: any) {
      if (__DEV__) {
        console.error('[Auth] Registration failed:', error);
        console.error('[Auth] Error type:', error.constructor.name);
        console.error('[Auth] Error message:', error.message);
      }
      
      // Provide more helpful error messages
      if (error.message && error.message.includes('CORS')) {
        const detail = __DEV__ ? ` (${BACKEND_URL})` : '';
        throw new Error(`Unable to connect to server${detail}. The backend may need CORS configuration. Please contact support.`);
      } else if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
        const detail = __DEV__ ? ` at ${BACKEND_URL}` : '';
        throw new Error(`Cannot reach server${detail}. Please check your internet connection and ensure the backend is running.`);
      }
      
      throw error;
    }
  };

  const logout = useCallback(async () => {
    if (__DEV__) console.log('[Auth] Logout started');
    try {
      try {
        await authenticatedPost('/api/auth/logout', {});
      } catch (error) {
        if (__DEV__) console.warn('[Auth] Server logout failed:', error);
      }
    } finally {
      await removeToken();
      setUser(null);
      setIsLoading(false);
      
      if (__DEV__) console.log('[Auth] Logout complete, reloading page');
      
      // Force a full page reload to clear everything
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        } else {
          // For native platforms, navigate to welcome/role selection (company session still active)
          router.replace('/');
        }
      }, 100);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      company,
      isLoading, 
      companyLoading,
      isAuthenticated: !!user, 
      isCompanyAuthenticated: !!company,
      login, 
      register, 
      logout, 
      companyLogin,
      companyRegister,
      companyLogout,
      checkSession,
      checkCompanySession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
