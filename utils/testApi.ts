
/**
 * API Testing Utilities
 * 
 * Use these functions to test API endpoints directly from the console.
 * 
 * Example usage in browser console:
 * 
 * import { testCrewLeadRegister, testCrewLeadLogin } from './utils/testApi';
 * 
 * // Test registration
 * await testCrewLeadRegister('test@example.com', 'password123', 'Test User');
 * 
 * // Test login
 * await testCrewLeadLogin('test@example.com', 'password123');
 */

import { apiPost, authenticatedGet, BACKEND_URL } from './api';

export const testCrewLeadRegister = async (email: string, password: string, name: string) => {
  console.log('🧪 Testing Crew Lead Registration...');
  try {
    const response = await apiPost('/api/auth/crew-lead/register', {
      email,
      password,
      name,
    });
    console.log('✅ Registration successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
};

export const testCrewLeadLogin = async (email: string, password: string) => {
  console.log('🧪 Testing Crew Lead Login...');
  try {
    const response = await apiPost('/api/auth/crew-lead/login', {
      email,
      password,
    });
    console.log('✅ Login successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

export const testAdminRegister = async (email: string, password: string, name: string) => {
  console.log('🧪 Testing Admin Registration...');
  try {
    const response = await apiPost('/api/auth/admin/register', {
      email,
      password,
      name,
    });
    console.log('✅ Registration successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
};

export const testAdminLogin = async (email: string, password: string) => {
  console.log('🧪 Testing Admin Login...');
  try {
    const response = await apiPost('/api/auth/admin/login', {
      email,
      password,
    });
    console.log('✅ Login successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

export const testGetCurrentUser = async () => {
  console.log('🧪 Testing Get Current User...');
  try {
    const response = await authenticatedGet('/api/auth/me');
    console.log('✅ Get current user successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Get current user failed:', error);
    throw error;
  }
};

export const testLogout = async () => {
  console.log('🧪 Testing Logout...');
  try {
    const response = await apiPost('/api/auth/logout', {}, true);
    console.log('✅ Logout successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Logout failed:', error);
    throw error;
  }
};

export const testAllEndpoints = async () => {
  console.log('🧪 Testing All Endpoints...');
  console.log('Backend URL:', BACKEND_URL);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123!';
  const testName = 'Test User';
  
  try {
    // Test Crew Lead Registration
    console.log('\n1️⃣ Testing Crew Lead Registration...');
    const registerResponse = await testCrewLeadRegister(testEmail, testPassword, testName);
    
    // Test Crew Lead Login
    console.log('\n2️⃣ Testing Crew Lead Login...');
    const loginResponse = await testCrewLeadLogin(testEmail, testPassword);
    
    // Test Get Current User
    console.log('\n3️⃣ Testing Get Current User...');
    const userResponse = await testGetCurrentUser();
    
    // Test Logout
    console.log('\n4️⃣ Testing Logout...');
    const logoutResponse = await testLogout();
    
    console.log('\n✅ All tests passed!');
    return {
      register: registerResponse,
      login: loginResponse,
      user: userResponse,
      logout: logoutResponse,
    };
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    throw error;
  }
};

// Export for easy console access
if (typeof window !== 'undefined') {
  (window as any).testApi = {
    testCrewLeadRegister,
    testCrewLeadLogin,
    testAdminRegister,
    testAdminLogin,
    testGetCurrentUser,
    testLogout,
    testAllEndpoints,
  };
  console.log('🧪 Test utilities loaded. Access via window.testApi');
}
