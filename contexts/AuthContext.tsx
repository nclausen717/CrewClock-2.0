
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiPost, apiCall, authenticatedGet, authenticatedPost, saveToken, getToken, removeToken, saveCompanyToken, getCompanyToken, removeCompanyToken, companyApiPost, companyAuthApiGet, companyAuthApiPost, companyAuthenticatedPost } from '@/utils/api';
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

  useEffect(() => {
    checkCompanySession();
  }, []);

  useEffect(() => {
    if (companyLoading || isLoading) return;
    
    const inAuthGroup = segments[0] === '(tabs)';
    const onWelcome = segments.length === 0;
    const onCompanyLogin = segments[0] === 'login' && segments[1] === 'company';
    const onRoleLogin = segments[0] === 'login' && (segments[1] === 'crew-lead' || segments[1] === 'admin');
    
    if (!company && !onCompanyLogin) {
      console.log('[Auth] No company session, redirecting to company login');
      router.replace('/login/company');
    } else if (company && !user && inAuthGroup) {
      console.log('[Auth] Company authenticated but no user, redirecting to welcome');
      router.replace('/');
    } else if (company && user && (onWelcome || onRoleLogin || onCompanyLogin)) {
      console.log('[Auth] Fully authenticated, redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [user, company, segments, isLoading, companyLoading, router]);

  const checkCompanySession = async () => {
    try {
      const token = await getCompanyToken();
      if (!token) {
        setCompany(null);
        setCompanyLoading(false);
        setIsLoading(false);
        return;
      }
      const response = await companyAuthApiGet<{ company: Company }>('/api/auth/company/me');
      setCompany(response.company);
      
      // If company session is valid, check user session
      await checkSession();
    } catch (error) {
      await removeCompanyToken();
      setCompany(null);
      setCompanyLoading(false);
      setIsLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        setCompanyLoading(false);
        return;
      }
      const response = await authenticatedGet<{ user: User }>('/api/auth/me');
      setUser(response.user);
    } catch (error) {
      await removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
      setCompanyLoading(false);
    }
  };

  const companyLogin = async (email: string, password: string) => {
    const response = await companyApiPost<{ company: Company; token: string }>('/api/auth/company/login', { email, password });
    await saveCompanyToken(response.token);
    setCompany(response.company);
    setCompanyLoading(false);
  };

  const companyRegister = async (email: string, password: string, name: string, city?: string, phone?: string) => {
    console.log('[Auth] Registering company at /api/companies/register');
    try {
      const response = await companyApiPost<{ company: Company }>('/api/companies/register', { email, password, name, city, phone });
      console.log('[Auth] Company registration successful:', response);
      // After registration, automatically log in
      await companyLogin(email, password);
    } catch (error: any) {
      console.error('[Auth] Company registration failed:', error);
      throw error;
    }
  };

  const companyLogout = useCallback(async () => {
    console.log('[Auth] Company logout started');
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
        console.warn('[Auth] Server company logout failed:', error);
      }
    } finally {
      await removeCompanyToken();
      await removeToken();
      setCompany(null);
      setUser(null);
      setCompanyLoading(false);
      setIsLoading(false);
      
      console.log('[Auth] Company logout complete, reloading page');
      
      // Force a full page reload to clear everything
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }, 100);
    }
  }, []);

  const login = async (email: string, password: string, role: 'crew_lead' | 'admin') => {
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/login' : '/api/auth/admin/login';
    const response = await companyAuthApiPost<{ user: User; token: string }>(endpoint, { email, password });
    await saveToken(response.token);
    setUser(response.user);
  };

  const register = async (email: string, password: string, name: string, role: 'crew_lead' | 'admin') => {
    const endpoint = role === 'crew_lead' ? '/api/auth/crew-lead/register' : '/api/auth/admin/register';
    const response = await companyAuthApiPost<{ user: User }>(endpoint, { email, password, name });
    await login(email, password, role);
  };

  const logout = useCallback(async () => {
    console.log('[Auth] Logout started');
    try {
      try {
        await authenticatedPost('/api/auth/logout', {});
      } catch (error) {
        console.warn('[Auth] Server logout failed:', error);
      }
    } finally {
      await removeToken();
      setUser(null);
      setIsLoading(false);
      
      console.log('[Auth] Logout complete, reloading page');
      
      // Force a full page reload to clear everything
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }, 100);
    }
  }, []);

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
