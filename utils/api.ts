
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get backend URL from app.json configuration
// To change the backend URL, update expo.extra.backendUrl in app.json or app.config.js.
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

if (__DEV__) {
  console.log('[API] Resolved BACKEND_URL:', BACKEND_URL);
  if (BACKEND_URL === 'http://localhost:3000' && Platform.OS !== 'web') {
    console.warn(
      '[API] WARNING: BACKEND_URL is set to localhost (http://localhost:3000) but the platform is not web. ' +
      'Real devices and simulators cannot reach localhost. ' +
      'Set expo.extra.backendUrl in app.json to your backend\'s network address.'
    );
  }
}

// Security warning: On web platforms, AsyncStorage maps to localStorage which is
// vulnerable to XSS attacks. Auth tokens stored here can be stolen by malicious scripts.
// For production web deployments, prefer httpOnly cookies managed server-side.
// On React Native mobile, AsyncStorage is acceptable.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  console.warn(
    '[Security] Auth tokens are stored in localStorage on web. ' +
    'This is vulnerable to XSS attacks. For production, use httpOnly cookies.'
  );
}
const TOKEN_KEY = '@crewclock_auth_token';
const COMPANY_TOKEN_KEY = '@crewclock_company_token';

// Token management
export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (__DEV__) {
      console.log('[API] Token saved successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error saving token:', error);
    }
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error getting token:', error);
    }
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    if (__DEV__) {
      console.log('[API] Token removed successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error removing token:', error);
    }
  }
};

// Company token management
export const saveCompanyToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(COMPANY_TOKEN_KEY, token);
    if (__DEV__) {
      console.log('[API] Company token saved successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error saving company token:', error);
    }
  }
};

export const getCompanyToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(COMPANY_TOKEN_KEY);
    if (__DEV__) {
      console.log('[API] Retrieved company token from storage:', token ? 'present' : 'null');
    }
    return token;
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error getting company token:', error);
    }
    return null;
  }
};

export const removeCompanyToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COMPANY_TOKEN_KEY);
    if (__DEV__) {
      console.log('[API] Company token removed successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[API] Error removing company token:', error);
    }
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
  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
  }

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
      if (__DEV__) {
        console.log('[API] Added Authorization header');
      }
    } else {
      throw new Error('Authentication required but no auth token found. Please log in again.');
    }
  }

  // Add company token if required
  if (requiresCompanyAuth) {
    const companyToken = await getCompanyToken();
    if (companyToken) {
      requestHeaders['X-Company-Token'] = companyToken;
      if (__DEV__) {
        console.log('[API] Added X-Company-Token header:', '[REDACTED]');
      }
    } else {
      throw new Error('Company authentication required but no company token found. Please log in again.');
    }
  }

  if (__DEV__) {
    console.log('[API] Request headers:', Object.keys(requestHeaders));
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
    if (__DEV__) {
      console.log('[API] Request body:', JSON.stringify(body).substring(0, 100));
    }
  }

  try {
    if (__DEV__) {
      console.log('[API] Sending fetch request...');
      console.log('[API] Full request details:', {
        url,
        method,
        headers: Object.keys(requestHeaders),
        hasBody: !!requestOptions.body
      });
    }
    const response = await fetch(url, requestOptions);
    if (__DEV__) {
      console.log('[API] Fetch response received:', response.status, response.statusText);
      console.log('[API] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      });
    }
    
    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      if (__DEV__) {
        console.error(`[API] HTTP Error ${response.status} ${response.statusText}`);
      }
      
      // Try to parse error response - read text first, then try JSON
      let errorMessage = `Request failed with status ${response.status}`;
      const text = await response.text();
      try {
        const errorData = JSON.parse(text) as { error?: string; message?: string };
        errorMessage = errorData.error || errorData.message || errorMessage;
        if (__DEV__) {
          console.error(`[API] Error details:`, errorData);
        }
      } catch {
        // text is not JSON, use status-based messaging
        if (__DEV__) {
          console.error(`[API] Non-JSON error response:`, text.substring(0, 200));
        }
        
        // Provide helpful error message based on status code
        if (response.status === 404) {
          errorMessage = 'API endpoint not found. The backend may still be building or the route is not registered.';
        } else if (response.status === 500) {
          errorMessage = 'Internal server error. Please check the backend logs.';
        }
      }
      
      throw new Error(errorMessage);
    }

    // Parse successful response as JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonParseError) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        throw new Error('Received malformed JSON response from server');
      }
      // If response is empty or not JSON, return empty object
      data = {};
    }
    if (__DEV__) {
      console.log(`[API] Success:`, data);
    }
    return data;
  } catch (error: any) {
    // Enhanced error logging for network/CORS issues
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (__DEV__) {
        console.error('═══════════════════════════════════════════════════');
        console.error('🚨 NETWORK ERROR: Failed to fetch');
        console.error('═══════════════════════════════════════════════════');
        console.error('This usually indicates one of the following issues:');
        console.error('1. CORS Error - Backend is not allowing cross-origin requests');
        console.error('   - Check that @fastify/cors is installed and configured');
        console.error('   - Verify X-Company-Token is in allowedHeaders');
        console.error('2. Network Connectivity - Cannot reach the backend server');
        console.error('   - Verify backend URL:', BACKEND_URL);
        console.error('   - Check if backend is running and accessible');
        console.error('3. SSL/Certificate Issues - HTTPS certificate problems');
        console.error('4. Firewall/Network Blocking - Request is being blocked');
        console.error('');
        console.error('Request details:');
        console.error('  URL:', url);
        console.error('  Method:', method);
        console.error('  Headers:', Object.keys(requestHeaders));
        console.error('  Backend URL:', BACKEND_URL);
        console.error('═══════════════════════════════════════════════════');
      }
      throw new Error(
        'Network request failed. This is likely a CORS issue. ' +
        'Please ensure the backend has CORS enabled with X-Company-Token in allowedHeaders. ' +
        `Backend URL: ${BACKEND_URL}`
      );
    }
    
    // If it's already an Error with a message, rethrow it
    if (error instanceof Error) {
      if (__DEV__) {
        console.error('[API] Request failed:', error.message);
        console.error('[API] Error stack:', error.stack);
      }
      throw error;
    }
    
    if (__DEV__) {
      console.error('[API] Request failed:', error);
    }
    throw new Error('Network request failed. Please check your connection.');
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
