
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get backend URL from app.json configuration
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

const TOKEN_KEY = '@crewclock_auth_token';
const COMPANY_TOKEN_KEY = '@crewclock_company_token';

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

// Company token management
export const saveCompanyToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(COMPANY_TOKEN_KEY, token);
    console.log('[API] Company token saved successfully');
  } catch (error) {
    console.error('[API] Error saving company token:', error);
  }
};

export const getCompanyToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(COMPANY_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('[API] Error getting company token:', error);
    return null;
  }
};

export const removeCompanyToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COMPANY_TOKEN_KEY);
    console.log('[API] Company token removed successfully');
  } catch (error) {
    console.error('[API] Error removing company token:', error);
  }
};

// Generic API call wrapper
interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  requiresCompanyAuth?: boolean;
}

export const apiCall = async <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<T> => {
  const { method = 'GET', body, headers = {}, requiresAuth = false, requiresCompanyAuth = false } = options;

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

  // Add company token if required
  if (requiresCompanyAuth) {
    const companyToken = await getCompanyToken();
    if (companyToken) {
      requestHeaders['X-Company-Token'] = companyToken;
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

    // Check if response is ok first
    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, use a generic error message
        console.warn('[API] Failed to parse error response:', jsonError);
        throw new Error(`Request failed with status ${response.status}`);
      }
      console.error(`[API] Error ${response.status}:`, errorData);
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    // For successful responses, parse JSON
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Check if the response was expected to contain JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // If response claims to be JSON but parsing failed, this is an error
        console.error('[API] Response claimed to be JSON but parsing failed:', error);
        throw new Error('Received malformed JSON response from server');
      }
      // If response is empty or not JSON, return empty object
      console.warn('[API] Response body is empty or not JSON, returning empty object');
      data = {};
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

// Company API methods (without auth, for login/register)
export const companyApiPost = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiCall<T>(endpoint, { method: 'POST', body });

// Company authenticated API methods (with company token)
export const companyAuthApiGet = <T = any>(endpoint: string): Promise<T> =>
  apiCall<T>(endpoint, { method: 'GET', requiresCompanyAuth: true });

export const companyAuthApiPost = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiCall<T>(endpoint, { method: 'POST', body, requiresCompanyAuth: true });

// Company authenticated API methods (with both company and user tokens)
export const companyAuthenticatedPost = <T = any>(endpoint: string, body: any): Promise<T> =>
  apiCall<T>(endpoint, { method: 'POST', body, requiresAuth: true, requiresCompanyAuth: true });

export const companyAuthenticatedGet = <T = any>(endpoint: string): Promise<T> =>
  apiCall<T>(endpoint, { method: 'GET', requiresAuth: true, requiresCompanyAuth: true });
