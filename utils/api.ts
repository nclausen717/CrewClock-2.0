
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get backend URL from app.json configuration
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

const TOKEN_KEY = '@crewclock_auth_token';

// Token management
export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log('[API] Token saved successfully');
  } catch (error) {
    console.error('[API] Error saving token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('[API] Error getting token:', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    console.log('[API] Token removed successfully');
  } catch (error) {
    console.error('[API] Error removing token:', error);
  }
};

// Generic API call wrapper
interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

export const apiCall = async <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<T> => {
  const { method = 'GET', body, headers = {}, requiresAuth = false } = options;

  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Only set Content-Type if we have a body to send
  if (body && method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Add auth token if required
  if (requiresAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[API] Error ${response.status}:`, data);
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    console.log(`[API] Success:`, data);
    return data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
};

// Convenience methods
export const apiGet = <T = any>(endpoint: string, requiresAuth = false): Promise<T> =>
  apiCall<T>(endpoint, { method: 'GET', requiresAuth });

export const apiPost = <T = any>(endpoint: string, body: any, requiresAuth = false): Promise<T> =>
  apiCall<T>(endpoint, { method: 'POST', body, requiresAuth });

export const apiPut = <T = any>(endpoint: string, body: any, requiresAuth = false): Promise<T> =>
  apiCall<T>(endpoint, { method: 'PUT', body, requiresAuth });

export const apiPatch = <T = any>(endpoint: string, body: any, requiresAuth = false): Promise<T> =>
  apiCall<T>(endpoint, { method: 'PATCH', body, requiresAuth });

export const apiDelete = <T = any>(endpoint: string, requiresAuth = false): Promise<T> =>
  apiCall<T>(endpoint, { method: 'DELETE', requiresAuth });

// Authenticated versions (convenience)
export const authenticatedGet = <T = any>(endpoint: string): Promise<T> =>
  apiGet<T>(endpoint, true);

export const authenticatedPost = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiPost<T>(endpoint, body, true);

export const authenticatedPut = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiPut<T>(endpoint, body, true);

export const authenticatedPatch = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiPatch<T>(endpoint, body, true);

export const authenticatedDelete = <T = any>(endpoint: string): Promise<T> =>
  apiDelete<T>(endpoint, true);
