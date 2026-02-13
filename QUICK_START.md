
# CrewClock - Quick Start Guide

## 🚀 Getting Started

The CrewClock app is now fully integrated with the backend API. Follow these steps to test the authentication system.

## 📱 Running the App

The app should already be running. If not:
```bash
npm run dev
```

## 🧪 Quick Test Flow

### 1. First Time Setup - Create Admin Account

1. Open the app - you'll see the Welcome screen
2. Tap **"Admin Login"**
3. Tap **"Don't have an account? Register"**
4. Fill in the form:
   - **Name:** Sarah Admin
   - **Email:** admin@test.com
   - **Password:** Admin123!
5. Tap **"Register"**
6. ✅ You should be redirected to the home screen
7. Notice the purple "Admin Dashboard" badge
8. Navigate to the **Profile** tab
9. See your name, email, and purple "Admin" badge

### 2. Test Logout

1. In the Profile tab, tap **"Logout"**
2. A confirmation modal will appear
3. Tap **"Logout"** to confirm
4. ✅ You should be redirected to the Welcome screen

### 3. Test Login

1. From the Welcome screen, tap **"Admin Login"**
2. Enter your credentials:
   - **Email:** admin@test.com
   - **Password:** Admin123!
3. Tap **"Login"**
4. ✅ You should be logged in and see the home screen

### 4. Create Crew Lead Account

1. Logout if you're logged in
2. From the Welcome screen, tap **"Crew Lead Login"**
3. Tap **"Don't have an account? Register"**
4. Fill in the form:
   - **Name:** John Crew Lead
   - **Email:** crewlead@test.com
   - **Password:** Test123!
5. Tap **"Register"**
6. ✅ You should be redirected to the home screen
7. Notice the blue "Crew Lead Dashboard" badge
8. Navigate to the **Profile** tab
9. See your name, email, and blue "Crew Lead" badge

### 5. Test Session Persistence

1. While logged in, refresh the page (Web) or close and reopen the app (Mobile)
2. ✅ You should remain logged in
3. Your user information should still be displayed

## 🎨 Visual Differences

### Crew Lead (Blue Theme)
- Blue badges and icons (#2563eb)
- "Crew Lead Dashboard" label
- Person icon

### Admin (Purple Theme)
- Purple badges and icons (#7c3aed)
- "Admin Dashboard" label
- Shield icon

## ⚠️ Error Testing

### Test Invalid Email
1. Try to register with email: "notanemail"
2. ✅ Should see error modal: "Invalid Email"

### Test Missing Fields
1. Try to register without filling all fields
2. ✅ Should see error modal: "Missing Information"

### Test Wrong Password
1. Try to login with wrong password
2. ✅ Should see error modal: "Authentication Failed"

### Test Role Mismatch
1. Register as Crew Lead with: test@example.com
2. Logout
3. Try to login as Admin with the same email
4. ✅ Should see error: "Authentication Failed"

## 🔍 Debugging

Open the browser console (F12) to see detailed logs:

```
[Auth] Checking session...
[Auth] Session valid, user: {...}
[API] POST https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/auth/crew-lead/login
[API] Success: {...}
```

## ✅ What's Working

- ✅ Dual-role authentication (Crew Lead & Admin)
- ✅ Registration for both roles
- ✅ Login for both roles
- ✅ Session persistence
- ✅ Logout functionality
- ✅ Role-specific UI and colors
- ✅ Custom modals (no Alert.alert)
- ✅ Loading states
- ✅ Error handling
- ✅ Email validation
- ✅ Auth bootstrap (no redirect loops)

## 🎯 Backend API

All requests go to:
```
https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev
```

Endpoints being used:
- POST `/api/auth/crew-lead/register`
- POST `/api/auth/crew-lead/login`
- POST `/api/auth/admin/register`
- POST `/api/auth/admin/login`
- GET `/api/auth/me` (with Bearer token)
- POST `/api/auth/logout` (with Bearer token)

## 📚 More Information

- `TEST_INSTRUCTIONS.md` - Comprehensive testing guide
- `API_REFERENCE.md` - Complete API documentation
- `INTEGRATION_SUMMARY.md` - Technical integration details

## 🎉 Ready to Use!

The authentication system is fully functional and ready for production. You can now start building additional features like time tracking and report generation on top of this foundation.

---

**Need Help?** Check the console logs for detailed debugging information. All API calls and auth state changes are logged with `[API]` and `[Auth]` prefixes.
