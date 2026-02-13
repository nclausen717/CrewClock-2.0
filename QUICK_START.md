
# CrewClock - Quick Start Guide

## 🚀 Getting Started

The CrewClock app is now fully integrated with the backend API. All features are working: authentication, employee management, job site management, and time tracking.

## 📱 Running the App

The app should already be running. If not:
```bash
npm run dev
```

## 🧪 Quick Test Flow (5 Minutes)

### Step 1: Create Admin Account

1. Open the app → Welcome screen
2. Tap **"Admin Login"** → **"Register"**
3. Fill in:
   - Name: Sarah Admin
   - Email: admin@test.com
   - Password: Admin123!
4. Tap **"Register"**
5. ✅ Redirected to home screen with deep blue "Admin" badge

### Step 2: Add Employees

1. From home, tap **"Manage Employees"**
2. Tap **"Add Employee"**
3. Add regular employee:
   - Name: James Smith
   - Leave crew leader unchecked
   - Tap **"Add Employee"**
4. Add crew leader:
   - Name: John Crew Lead
   - Check **"Designate as Crew Leader"**
   - Email: crewlead@test.com
   - Tap **"Add Employee"**
   - ✅ **SAVE THE GENERATED PASSWORD!**
5. ✅ See 2 employees: 1 crew leader (orange badge), 1 worker (blue badge)

### Step 3: Add Job Sites

1. Go back → Tap **"Job Sites"**
2. Tap **"Add Job Site"**
3. Add site:
   - Name: Downtown Office
   - Location: 123 Main St
   - Tap **"Add Site"**
4. ✅ See job site with location icon

### Step 4: Test Crew Leader Clock-In

1. Logout → Tap **"Crew Lead Login"**
2. Login with:
   - Email: crewlead@test.com
   - Password: [from Step 2]
3. ✅ See orange "Crew Lead" badge
4. Tap **"Clock In Team"**
5. Select **James Smith**
6. Tap **"Clock In (1)"**
7. Select **Downtown Office**
8. Tap **"Confirm Clock In"**
9. ✅ Success modal shows "James Smith at Downtown Office"

### Step 5: Test Session Persistence

1. Refresh page (Web) or close/reopen app (Mobile)
2. ✅ Still logged in as crew leader
3. All data persists

## 🎨 Visual Differences

### Crew Lead (Orange Theme)
- Orange badges and icons (#ff6b35)
- "Crew Lead" badge
- Person icon
- **Actions:** Clock In Team

### Admin (Deep Blue Theme)
- Deep blue badges and icons (#003d5b)
- "Admin" badge
- Shield icon
- **Actions:** Manage Employees, Job Sites

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

### Authentication
- ✅ Dual-role authentication (Crew Lead & Admin)
- ✅ Registration for both roles
- ✅ Login for both roles
- ✅ Session persistence
- ✅ Logout functionality
- ✅ Auth bootstrap (no redirect loops)

### Employee Management (Admin)
- ✅ View all employees
- ✅ Add regular employees
- ✅ Add crew leaders with auto-generated passwords
- ✅ Delete employees
- ✅ Real-time stats

### Job Site Management (Admin)
- ✅ View all job sites
- ✅ Add job sites
- ✅ Delete job sites
- ✅ Real-time stats

### Time Tracking (Crew Leader)
- ✅ View employees for clock-in
- ✅ Multi-select employees
- ✅ Select job site
- ✅ Clock in team

### UI/UX
- ✅ Role-specific UI and colors
- ✅ Custom modals (no Alert.alert)
- ✅ Loading states
- ✅ Error handling
- ✅ Email validation
- ✅ Empty states

## 🎯 Backend API

All requests go to:
```
https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev
```

### Endpoints Integrated:

**Authentication:**
- POST `/api/auth/crew-lead/register`
- POST `/api/auth/crew-lead/login`
- POST `/api/auth/admin/register`
- POST `/api/auth/admin/login`
- GET `/api/auth/me`
- POST `/api/auth/logout`

**Employee Management:**
- GET `/api/employees`
- POST `/api/employees`
- DELETE `/api/employees/:id`

**Job Site Management:**
- GET `/api/job-sites`
- POST `/api/job-sites`
- DELETE `/api/job-sites/:id`

**Time Tracking:**
- GET `/api/employees/for-clock-in`
- POST `/api/time-entries/clock-in`

## 📚 More Information

- `TEST_INSTRUCTIONS.md` - Comprehensive testing guide
- `API_REFERENCE.md` - Complete API documentation
- `INTEGRATION_SUMMARY.md` - Technical integration details

## 🎉 Production Ready!

All features are fully integrated and working:
- ✅ Authentication with session persistence
- ✅ Employee management with crew leader designation
- ✅ Job site management
- ✅ Time tracking with multi-employee clock-in

**For comprehensive testing, see `TEST_INSTRUCTIONS.md`**

---

**Need Help?** Check the console logs for detailed debugging information. All API calls are logged with `[API]` prefix.

---

## 🔧 Recent Bug Fixes (Latest Update)

### ✅ Fix 1: Logout Now Redirects to Login Screen
**Issue**: "When I log out as admin, it doesn't take me back to the main login screen, so I can't switch between admin and crew leader."

**Fixed**: Logout now properly calls `/api/auth/logout` endpoint and redirects to welcome screen. You can now switch between admin and crew leader accounts.

**Test**: 
1. Login as admin
2. Tap Logout
3. ✅ Redirected to welcome screen
4. Can now login as crew lead

---

### ✅ Fix 2: No More 403 Forbidden Errors
**Issue**: "Under Quick Actions: 'Manage Employees' shows a forbidden error. 'Job Sites' also shows a forbidden error."

**Fixed**: Backend now properly detects admin role from session. All admin endpoints work correctly.

**Test**:
1. Login as admin
2. Tap "Manage Employees" - ✅ No 403 error
3. Tap "Job Sites" - ✅ No 403 error

---

### ✅ Fix 3: Crew Leader Passwords Auto-Generated
**Issue**: "When adding a crew leader, I can't set a password—only an optional email."

**Fixed**: Backend now auto-generates secure passwords for crew leaders. Password is displayed in success modal.

**Test**:
1. Login as admin
2. Add crew leader with email
3. ✅ Success modal shows generated password
4. Use password to login as crew lead

---

### ✅ Fix 4: All Report Buttons Work
**Issue**: "Under 'Reports,' none of the buttons in 'Generate Report' work."

**Fixed**: All report endpoints integrated. Daily, Weekly, Monthly reports + CSV export all working.

**Test**:
1. Navigate to Reports
2. Tap Daily/Weekly/Monthly - ✅ All buttons work
3. Tap Generate Report - ✅ Report displays
4. Tap Export CSV - ✅ CSV downloads

---

## 🎉 All Issues Resolved!

All reported bugs have been fixed and verified. The app is fully functional and ready for production use.
