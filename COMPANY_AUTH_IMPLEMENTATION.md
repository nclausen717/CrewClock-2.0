# Company Authentication Layer Implementation Summary

## Overview
This implementation adds a multi-tiered authentication system to CrewClock 2.0, where companies authenticate first, then users within that company can login as either Crew Lead or Admin. This ensures complete data isolation between companies.

## Key Features Implemented

### 1. Database Schema Changes
**Files Modified:**
- `backend/src/db/schema.ts` - Added company and company_session tables, company_id foreign keys
- `backend/src/db/auth-schema.ts` - Added company_id to user table
- `backend/drizzle/20260216234746_add_company_authentication.sql` - Migration file

**New Tables:**
- `company` - Stores company information (email, password, name, city, phone)
- `company_session` - Manages company authentication sessions (24-hour expiration)

**Updated Tables:**
- `user` - Added `company_id` foreign key
- `crews` - Added `company_id` foreign key, removed unique constraint on name (now unique per company)
- `job_sites` - Added `company_id` foreign key
- `time_entries` - Added `company_id` foreign key

### 2. Backend API Changes

**New Routes (backend/src/routes/company-auth.ts):**
- `POST /api/auth/company/register` - Self-service company registration
- `POST /api/auth/company/login` - Company login (returns 24-hour token)
- `POST /api/auth/company/logout` - Company logout
- `GET /api/auth/company/me` - Get current company session

**Updated Routes (backend/src/routes/auth.ts):**
- All crew-lead and admin login/register endpoints now require company authentication
- Users are validated against their company_id during login
- User registration automatically links to authenticated company

**New Utilities:**
- `backend/src/utils/company-auth.ts` - `requireCompanyAuth()` middleware for protecting endpoints

### 3. Frontend Changes

**API Utilities (utils/api.ts):**
- Added company token management functions
- Added `X-Company-Token` header support
- New helper functions for company API calls

**Authentication Context (contexts/AuthContext.tsx):**
- Added company state and methods
- Added `companyLoading` state
- New methods: `companyLogin()`, `companyRegister()`, `companyLogout()`
- Updated routing logic to check both company and user sessions

**New Screens:**
- `app/login/company.tsx` - Company login/registration screen with form validation

**Updated Screens:**
- `app/index.tsx` - Now shows role selection only after company authentication
- `app/(tabs)/profile.tsx` - Shows company information and separate logout options

## Authentication Flow

```
1. App Startup
   ↓
2. Check Company Session
   ↓
   No Company Session → Redirect to /login/company
   ↓
3. Company Login/Register
   ↓
4. Company Authenticated → Show Role Selection (Crew Lead/Admin)
   ↓
5. Select Role → Role-specific Login
   ↓
6. User Authenticated → Access Main App
```

## Security Features

1. **Password Hashing**: Uses Better Auth's crypto for secure password hashing
2. **Token Management**: Separate tokens for company and user sessions
3. **Session Expiration**: Company sessions expire after 24 hours
4. **Company Isolation**: All user login endpoints validate company_id
5. **Secure Storage**: Tokens stored in AsyncStorage with proper key management

## Data Isolation

All data queries will be filtered by company_id to ensure:
- Companies only see their own users
- Crews are isolated per company
- Job sites are company-specific
- Time entries are company-specific
- Reports show only company data

## API Request Headers

- User authentication: `Authorization: Bearer <user-token>`
- Company authentication: `X-Company-Token: <company-token>`
- Protected endpoints require both headers

## Migration Path

For existing installations:
1. Run the migration to add company tables and foreign keys
2. Existing users will need to be manually assigned to companies (or companies created for them)
3. The migration adds NOT NULL constraints, so existing data must be updated

## Next Steps (Not Yet Implemented)

1. **Data Filtering**: Add company_id filtering to all existing query endpoints:
   - Crews endpoints
   - Employees endpoints
   - Job sites endpoints
   - Time entries endpoints
   - Reports endpoints

2. **Testing**: Comprehensive testing of:
   - Company registration and login flows
   - Multi-company data isolation
   - Session management and expiration
   - Edge cases and error handling

3. **Features**: Consider adding:
   - Company settings page
   - Ability to manage multiple users within a company
   - Company profile editing
   - Admin-only company management features

## Files Changed

### Backend
1. `backend/src/db/schema.ts` - Company tables and foreign keys
2. `backend/src/db/auth-schema.ts` - User company_id
3. `backend/src/routes/company-auth.ts` - New company auth endpoints
4. `backend/src/routes/auth.ts` - Updated to require company auth
5. `backend/src/utils/company-auth.ts` - New auth middleware
6. `backend/src/index.ts` - Register company auth routes
7. `backend/drizzle/20260216234746_add_company_authentication.sql` - Database migration

### Frontend
1. `utils/api.ts` - Company token management and API helpers
2. `contexts/AuthContext.tsx` - Company authentication state and methods
3. `app/login/company.tsx` - New company login screen
4. `app/index.tsx` - Updated welcome/role selection flow
5. `app/(tabs)/profile.tsx` - Show company info and logout options

## Technical Notes

- Company names are NOT unique globally (multiple companies can have the same name)
- Crew names are unique per company (not globally)
- Company sessions use UUID tokens stored in company_session table
- User sessions remain separate from company sessions for granular control
- Logout from role returns to role selection; logout from company requires re-authentication

## Testing Checklist

- [ ] Register new company with all fields
- [ ] Register new company with only required fields
- [ ] Login with existing company credentials
- [ ] Verify company token stored correctly
- [ ] Register crew lead user within company
- [ ] Register admin user within company
- [ ] Login as crew lead with company context
- [ ] Login as admin with company context
- [ ] Verify data isolation (create second company and test)
- [ ] Test company session expiration (24 hours)
- [ ] Test role logout (returns to role selection)
- [ ] Test company logout (full logout)
- [ ] Verify profile shows company information
- [ ] Test invalid company credentials
- [ ] Test invalid user credentials with valid company
- [ ] Test user from different company cannot login
