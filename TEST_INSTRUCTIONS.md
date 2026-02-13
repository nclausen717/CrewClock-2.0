
# CrewClock Backend Integration - Test Instructions

## 🎯 Backend API
**URL:** https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev

## 📋 Test Scenarios

### 1. Crew Lead Registration & Login

#### Test User Credentials (Create these first):
- **Email:** crewlead@test.com
- **Password:** Test123!
- **Name:** John Crew Lead
- **Role:** crew_lead

#### Steps to Test:
1. Open the app - you should see the Welcome screen with two buttons
2. Tap "Crew Lead Login"
3. Toggle to "Register" mode
4. Fill in:
   - Name: John Crew Lead
   - Email: crewlead@test.com
   - Password: Test123!
5. Tap "Register"
6. You should be redirected to the home screen
7. Check the home screen shows "Welcome, John Crew Lead!" with "Crew Lead Dashboard" badge
8. Navigate to Profile tab
9. Verify your name, email, and "Crew Lead" role badge are displayed
10. Tap "Logout" and confirm
11. You should be redirected to the Welcome screen

#### Test Login:
1. From Welcome screen, tap "Crew Lead Login"
2. Enter:
   - Email: crewlead@test.com
   - Password: Test123!
3. Tap "Login"
4. You should be redirected to the home screen with your info

### 2. Admin Registration & Login

#### Test User Credentials (Create these first):
- **Email:** admin@test.com
- **Password:** Admin123!
- **Name:** Sarah Admin
- **Role:** admin

#### Steps to Test:
1. From Welcome screen, tap "Admin Login"
2. Toggle to "Register" mode
3. Fill in:
   - Name: Sarah Admin
   - Email: admin@test.com
   - Password: Admin123!
4. Tap "Register"
5. You should be redirected to the home screen
6. Check the home screen shows "Welcome, Sarah Admin!" with "Admin Dashboard" badge (purple color)
7. Navigate to Profile tab
8. Verify your name, email, and "Admin" role badge are displayed (purple color)
9. Tap "Logout" and confirm
10. You should be redirected to the Welcome screen

#### Test Login:
1. From Welcome screen, tap "Admin Login"
2. Enter:
   - Email: admin@test.com
   - Password: Admin123!
3. Tap "Login"
4. You should be redirected to the home screen with your info

### 3. Session Persistence

1. Login as either Crew Lead or Admin
2. Refresh the page (Web) or close and reopen the app (Mobile)
3. You should remain logged in and see the home screen
4. Your user info should still be displayed correctly

### 4. Error Handling

#### Invalid Email:
1. Try to register/login with invalid email (e.g., "notanemail")
2. Should see error modal: "Invalid Email"

#### Missing Fields:
1. Try to register without filling all fields
2. Should see error modal: "Missing Information"

#### Wrong Credentials:
1. Try to login with wrong password
2. Should see error modal: "Authentication Failed"

#### Role Mismatch:
1. Register as Crew Lead with email: test@example.com
2. Logout
3. Try to login as Admin with the same email
4. Should see error: "Authentication Failed" (role doesn't match)

### 5. API Endpoints Verification

All these endpoints should be working:

✅ POST /api/auth/crew-lead/register
✅ POST /api/auth/crew-lead/login
✅ POST /api/auth/admin/register
✅ POST /api/auth/admin/login
✅ GET /api/auth/me (with Bearer token)
✅ POST /api/auth/logout (with Bearer token)

## 🔍 Debugging

Check browser console (Web) or React Native debugger for logs:
- `[API]` - API calls and responses
- `[Auth]` - Authentication state changes
- `[Welcome]` - Welcome screen navigation logic

## ✅ Success Criteria

- ✅ Users can register as Crew Lead or Admin
- ✅ Users can login with correct credentials
- ✅ Role-specific colors and badges are displayed
- ✅ Session persists across page refreshes
- ✅ Logout works and redirects to Welcome screen
- ✅ Error messages are shown in custom modals (no Alert.alert)
- ✅ User info is displayed correctly on Home and Profile screens
- ✅ Auth state is managed globally via AuthContext
- ✅ API calls use the centralized utils/api.ts wrapper
- ✅ Bearer tokens are properly stored and sent with authenticated requests

## 🎨 UI Features

- Custom Modal component for all user feedback (no Alert.alert)
- Loading indicators during API calls
- Role-specific colors:
  - Crew Lead: Blue (#2563eb)
  - Admin: Purple (#7c3aed)
- Smooth navigation and state management
- Responsive design for web and mobile
