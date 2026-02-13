
# CrewClock Backend Integration - Complete Test Instructions

## 🎯 Backend API
**URL:** https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev

## 📋 Complete Test Flow

### Phase 1: Admin Setup & Employee Management

#### 1.1 Admin Registration & Login

**Test Admin Credentials:**
- **Email:** admin@test.com
- **Password:** Admin123!
- **Name:** Sarah Admin

**Steps:**
1. Open the app - you should see the Welcome screen
2. Tap "Admin Login"
3. Toggle to "Register" mode
4. Fill in the credentials above
5. Tap "Register"
6. ✅ You should be redirected to the home screen
7. ✅ Verify "Welcome, Sarah Admin!" with Admin badge (deep blue color)
8. ✅ Verify you see "Manage Employees" and "Job Sites" action cards

#### 1.2 Add Regular Employees

**Steps:**
1. From home screen, tap "Manage Employees"
2. ✅ Should see empty state: "No employees yet"
3. Tap "Add Employee" button at bottom
4. Add Employee #1:
   - Name: James Smith
   - Leave "Designate as Crew Leader" unchecked
   - Tap "Add Employee"
   - ✅ Should see success modal: "Employee added successfully"
5. Repeat for:
   - David Johnson
   - Emma Wilson
   - Robert Brown
6. ✅ Verify stats show: "4 Total Employees", "0 Crew Leaders", "4 Workers"
7. ✅ Each employee card should show name and "Worker" badge

#### 1.3 Add Crew Leader Employee

**Steps:**
1. Tap "Add Employee" button
2. Fill in:
   - Name: John Crew Lead
   - Check "Designate as Crew Leader"
   - Email: crewlead@test.com
3. Tap "Add Employee"
4. ✅ Should see success modal with generated password (SAVE THIS PASSWORD!)
   - Example: "Password: abc123xyz"
5. ✅ Verify stats now show: "5 Total Employees", "1 Crew Leaders", "4 Workers"
6. ✅ John Crew Lead card should show email and "Crew Leader" badge (orange color)

#### 1.4 Delete Employee

**Steps:**
1. Tap trash icon on "Robert Brown"
2. ✅ Should see success modal: "Robert Brown has been removed"
3. ✅ Verify stats now show: "4 Total Employees"
4. ✅ Robert Brown should no longer appear in the list

#### 1.5 Add Job Sites

**Steps:**
1. Go back to home screen
2. Tap "Job Sites"
3. ✅ Should see empty state: "No job sites yet"
4. Tap "Add Job Site" button
5. Add Job Site #1:
   - Site Name: Downtown Office Building
   - Location: 123 Main St, Downtown
   - Tap "Add Site"
   - ✅ Should see success modal
6. Add Job Site #2:
   - Site Name: Riverside Apartments
   - Location: 456 River Rd, Riverside
7. Add Job Site #3:
   - Site Name: Industrial Park Warehouse
   - Location: 789 Industrial Blvd
8. ✅ Verify stats show: "3 Total Sites", "3 Active Sites"
9. ✅ Each job site card should show name, location icon, and address

#### 1.6 Delete Job Site

**Steps:**
1. Tap trash icon on "Industrial Park Warehouse"
2. ✅ Should see success modal: "Industrial Park Warehouse has been removed"
3. ✅ Verify stats now show: "2 Total Sites"

#### 1.7 Admin Logout

**Steps:**
1. Go back to home screen
2. Scroll down to "Logout" button
3. Tap "Logout"
4. ✅ Should see confirmation modal: "Are you sure you want to logout?"
5. Tap "Logout" to confirm
6. ✅ Should be redirected to Welcome screen

---

### Phase 2: Crew Leader Clock-In Flow

#### 2.1 Crew Leader Login

**Steps:**
1. From Welcome screen, tap "Crew Lead Login"
2. Enter credentials:
   - Email: crewlead@test.com
   - Password: [Use the password from step 1.3]
3. Tap "Login"
4. ✅ Should be redirected to home screen
5. ✅ Verify "Welcome, John Crew Lead!" with Crew Lead badge (orange color)
6. ✅ Verify you see "Clock In Team" action card (NOT "Manage Employees" or "Job Sites")

#### 2.2 Clock In Multiple Employees

**Steps:**
1. From home screen, tap "Clock In Team"
2. ✅ Should see list of employees: James Smith, David Johnson, Emma Wilson
3. ✅ Should NOT see John Crew Lead (crew leaders can't clock themselves in)
4. ✅ Header should show "0 selected"
5. Tap on "James Smith" card
6. ✅ Card should highlight with orange border and checkmark
7. ✅ Header should show "1 selected"
8. Tap on "David Johnson" and "Emma Wilson"
9. ✅ Header should show "3 selected"
10. Tap "Clock In (3)" button at bottom
11. ✅ Should see modal: "Select Job Site"
12. ✅ Should see list of job sites: Downtown Office Building, Riverside Apartments
13. Tap on "Downtown Office Building"
14. ✅ Card should highlight with checkmark
15. Tap "Confirm Clock In"
16. ✅ Should see success modal:
    - "Clock In Successful"
    - "Successfully clocked in: James Smith, David Johnson, Emma Wilson"
    - "at Downtown Office Building"
17. ✅ Modal should close and selections should be cleared

#### 2.3 Clock In Single Employee

**Steps:**
1. From Clock In screen, tap on "Emma Wilson" only
2. Tap "Clock In (1)"
3. Select "Riverside Apartments"
4. Tap "Confirm Clock In"
5. ✅ Should see success modal with Emma Wilson at Riverside Apartments

#### 2.4 Error Handling - No Employee Selected

**Steps:**
1. From Clock In screen, ensure no employees are selected
2. Tap "Clock In (0)" button (should be disabled/grayed out)
3. ✅ Button should not respond or show warning modal

#### 2.5 Error Handling - No Job Site Selected

**Steps:**
1. Select an employee
2. Tap "Clock In (1)"
3. In the job site modal, tap "Confirm Clock In" WITHOUT selecting a job site
4. ✅ Should see warning modal: "No Job Site Selected"

#### 2.6 Cancel Job Site Selection

**Steps:**
1. Select employees
2. Tap "Clock In"
3. In job site modal, tap "Cancel"
4. ✅ Modal should close
5. ✅ Employee selections should remain (not cleared)

---

### Phase 3: Session Persistence & Error Handling

#### 3.1 Session Persistence

**Steps:**
1. While logged in as Crew Lead, refresh the page (Web) or close/reopen app (Mobile)
2. ✅ Should remain logged in
3. ✅ Should see home screen with user info
4. ✅ Navigate to different screens - all should work

#### 3.2 Invalid Credentials

**Steps:**
1. Logout
2. Try to login with wrong password
3. ✅ Should see error modal: "Authentication Failed"

#### 3.3 Missing Fields

**Steps:**
1. Try to add employee without name
2. ✅ Should see warning modal: "Please enter employee name"
3. Try to add crew leader without email
4. ✅ Should see warning modal: "Email is required for crew leaders"

#### 3.4 Network Error Handling

**Steps:**
1. Turn off internet connection
2. Try to fetch employees or job sites
3. ✅ Should see error modal with appropriate message
4. Turn internet back on
5. Pull to refresh or navigate away and back
6. ✅ Data should load successfully

---

## 🔍 API Endpoints Tested

### Authentication
- ✅ POST /api/auth/admin/register
- ✅ POST /api/auth/admin/login
- ✅ POST /api/auth/crew-lead/login
- ✅ GET /api/auth/me
- ✅ POST /api/auth/logout

### Employee Management (Admin)
- ✅ GET /api/employees
- ✅ POST /api/employees
- ✅ DELETE /api/employees/:id

### Job Site Management (Admin)
- ✅ GET /api/job-sites
- ✅ POST /api/job-sites
- ✅ DELETE /api/job-sites/:id

### Time Tracking (Crew Leader)
- ✅ GET /api/employees/for-clock-in
- ✅ POST /api/time-entries/clock-in

---

## 🐛 Debugging

Check browser console (Web) or React Native debugger for logs:
- `[API]` - API calls and responses
- `[Auth]` - Authentication state changes
- `[Welcome]` - Welcome screen navigation logic

Example logs you should see:
```
[API] POST https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/auth/admin/login
[API] Success: { token: "...", user: { ... } }
[Auth] Login successful: { id: "...", email: "admin@test.com", ... }
[API] GET https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/employees
[API] Success: [{ id: "...", name: "James Smith", ... }]
```

---

## ✅ Success Criteria

### Authentication
- ✅ Admin can register and login
- ✅ Crew leader can login with generated credentials
- ✅ Session persists across page refreshes
- ✅ Logout works and redirects to Welcome screen
- ✅ Bearer tokens are properly stored and sent

### Employee Management
- ✅ Admin can view all employees
- ✅ Admin can add regular employees
- ✅ Admin can add crew leaders with auto-generated passwords
- ✅ Admin can delete employees
- ✅ Stats update correctly (total, crew leaders, workers)
- ✅ Crew leader badge shows orange, worker badge shows blue

### Job Site Management
- ✅ Admin can view all job sites
- ✅ Admin can add job sites
- ✅ Admin can delete job sites
- ✅ Stats update correctly

### Time Tracking
- ✅ Crew leader can view employees for clock-in
- ✅ Crew leader can select multiple employees
- ✅ Crew leader can select job site
- ✅ Clock-in creates time entries successfully
- ✅ Success message shows employee names and job site

### UI/UX
- ✅ Custom Modal component for all feedback (no Alert.alert)
- ✅ Loading indicators during API calls
- ✅ Role-specific colors (Admin: deep blue, Crew Lead: orange)
- ✅ Empty states with helpful messages
- ✅ Error messages are clear and actionable
- ✅ Smooth navigation and state management

---

## 🎨 UI Color Reference

- **Admin Primary:** #003d5b (Deep Blue)
- **Crew Lead Primary:** #ff6b35 (Orange)
- **Clock Background:** #001f3f (Dark Blue)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)
- **Warning:** #f59e0b (Amber)

---

## 📝 Sample Test Data Summary

**Admin Account:**
- Email: admin@test.com
- Password: Admin123!

**Crew Leader Account:**
- Email: crewlead@test.com
- Password: [Generated during employee creation]

**Employees:**
- James Smith (Worker)
- David Johnson (Worker)
- Emma Wilson (Worker)
- John Crew Lead (Crew Leader)

**Job Sites:**
- Downtown Office Building (123 Main St, Downtown)
- Riverside Apartments (456 River Rd, Riverside)
