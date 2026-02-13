# CrewClock - Site Time Tracker

A comprehensive time tracking application for construction crews with dual-role authentication (Admin & Crew Leader).

## 🚀 Features

### For Admins
- **Employee Management**: Add, view, and delete employees
- **Crew Leader Designation**: Create crew leaders with auto-generated login credentials
- **Job Site Management**: Add, view, and delete job sites with location tracking
- **Real-time Statistics**: Track total employees, crew leaders, workers, and job sites

### For Crew Leaders
- **Team Clock-In**: Clock in multiple employees at once
- **Job Site Selection**: Choose the work location for the team
- **Employee Management**: View and select from available employees

## 🏗️ Tech Stack

- **Frontend**: React Native + Expo 54
- **Backend**: Node.js API (deployed)
- **Authentication**: JWT Bearer tokens with AsyncStorage
- **UI**: Custom components with role-based theming
- **Navigation**: Expo Router with tab navigation

## 📱 Quick Start

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Create an admin account:**
   - Tap "Admin Login" → "Register"
   - Email: admin@test.com
   - Password: Admin123!

3. **Add employees and job sites:**
   - Navigate to "Manage Employees"
   - Add regular employees and crew leaders
   - Navigate to "Job Sites"
   - Add work locations

4. **Test crew leader flow:**
   - Logout and login as crew leader (use generated credentials)
   - Navigate to "Clock In Team"
   - Select employees and job site
   - Confirm clock-in

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute quick start guide
- **[TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md)** - Comprehensive testing guide
- **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - Technical integration details

## 🎨 UI Themes

- **Admin**: Deep Blue (#003d5b) - Shield icon
- **Crew Leader**: Orange (#ff6b35) - Person icon
- **Background**: Dark Blue (#001f3f)

## 🔐 Security

- JWT Bearer token authentication
- Secure token storage with AsyncStorage
- Role-based access control
- Session persistence across app restarts
- Automatic session validation

## ✅ Production Ready

All features are fully integrated and tested:
- ✅ Authentication with session persistence
- ✅ Employee management (CRUD)
- ✅ Job site management (CRUD)
- ✅ Time tracking with multi-employee clock-in/out
- ✅ Reports generation (Daily/Weekly/Monthly with CSV export)
- ✅ Role-based UI and permissions
- ✅ Error handling with custom modals (409 duplicate emails, 400 validation, etc.)
- ✅ Loading states for all async operations
- ✅ Web and mobile compatibility
- ✅ Generated password display for crew leaders
- ✅ Comprehensive error messages from backend

## 🌐 Backend API

**URL**: https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev

All API endpoints are fully integrated and working.

---

Made with 💙 using [Natively.dev](https://natively.dev)
