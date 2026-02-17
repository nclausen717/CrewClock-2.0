
# Quick Reference Guide - CrewClock Backend Integration

## 🚀 Quick Start

### Run the App
```bash
npm start
# Then press 'i' for iOS, 'a' for Android, or 'w' for Web
```

### Test Credentials (Create These First)
```
Admin:
  Email: admin@test.com
  Password: admin123

Crew Lead:
  Email: crew@test.com
  Password: crew123
```

## 📱 App Flow

```
Welcome Screen
  ├─ Admin Login → Admin Dashboard
  │   ├─ Manage Employees
  │   ├─ Job Sites
  │   └─ Reports
  │
  └─ Crew Lead Login → Crew Lead Dashboard
      ├─ Clock In Team
      └─ Reports
```

## 🔑 Key Files

### API Integration
- `utils/api.ts` - API client with auth
- `contexts/AuthContext.tsx` - Auth state management
- `app.json` - Backend URL configuration

### Screens
- `app/index.tsx` - Welcome/Login selector
- `app/login/admin.tsx` - Admin login/register
- `app/login/crew-lead.tsx` - Crew lead login/register
- `app/employees.tsx` - Employee management
- `app/job-sites.tsx` - Job site management
- `app/clock-in.tsx` - Time tracking
- `app/reports.tsx` - **NEWLY INTEGRATED** Reports generation

### Components
- `components/ui/Modal.tsx` - Custom modal (replaces Alert)

## 🔧 API Endpoints

### Reports (Newly Integrated)
```typescript
// Daily Report
GET /api/reports/daily?date=2024-01-15
Response: { date, totalHours, employees[], jobSites[] }

// Weekly Report
GET /api/reports/weekly?startDate=2024-01-15
Response: { weekStart, weekEnd, totalHours, employees[], jobSites[] }

// Monthly Report
GET /api/reports/monthly?year=2024&month=1
Response: { month, year, totalHours, payPeriods[], employees[], jobSites[] }

// CSV Exports
GET /api/reports/daily/csv?date=2024-01-15
GET /api/reports/weekly/csv?startDate=2024-01-15
GET /api/reports/monthly/csv?year=2024&month=1
Response: text/csv file
```

### Authentication
```typescript
POST /api/auth/admin/login
POST /api/auth/admin/register
POST /api/auth/crew-lead/login
POST /api/auth/crew-lead/register
GET  /api/auth/me
```

### Employees
```typescript
GET    /api/employees
POST   /api/employees
PUT    /api/employees/{id}
DELETE /api/employees/{id}
```

### Job Sites
```typescript
GET    /api/job-sites
POST   /api/job-sites
PUT    /api/job-sites/{id}
DELETE /api/job-sites/{id}
```

### Time Tracking
```typescript
GET  /api/employees/for-clock-in
POST /api/time-entries/clock-in
POST /api/time-entries/clock-out
GET  /api/time-entries/active
```

## 💡 Usage Examples

### Making API Calls
```typescript
import { authenticatedGet, authenticatedPost } from '@/utils/api';

// GET request
const employees = await authenticatedGet<Employee[]>('/api/employees');

// POST request
const newEmployee = await authenticatedPost('/api/employees', {
  name: 'John Doe',
  isCrewLeader: false
});

// Reports
const dailyReport = await authenticatedGet<DailyReport>(
  `/api/reports/daily?date=2024-01-15`
);
```

### Using Auth Context
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Login />;
  
  return <Dashboard user={user} />;
}
```

### Showing Modals
```typescript
import { Modal } from '@/components/ui/Modal';

const [modalVisible, setModalVisible] = useState(false);

<Modal
  visible={modalVisible}
  title="Success"
  message="Operation completed successfully"
  type="success"
  onClose={() => setModalVisible(false)}
/>
```

## 🧪 Testing Checklist

### Before Testing Reports
- [ ] Create admin account
- [ ] Create 2-3 employees
- [ ] Create 1-2 job sites
- [ ] Clock in employees at a job site
- [ ] Wait a few minutes
- [ ] Clock out employees (if implemented)

### Test Reports
- [ ] Generate daily report
- [ ] Generate weekly report
- [ ] Generate monthly report
- [ ] Export daily CSV
- [ ] Export weekly CSV
- [ ] Export monthly CSV
- [ ] Verify overtime calculations (>40 hrs/week)
- [ ] Verify pay periods (Monday-Saturday)

## 🐛 Common Issues

### "Failed to generate report"
```
Cause: No time entries for selected date
Fix: Create time entries first by clocking in/out employees
```

### "Authentication failed"
```
Cause: Invalid credentials or expired token
Fix: Logout and login again
```

### "CSV export failed"
```
Cause: Backend CSV endpoint may not be implemented
Fix: Check backend logs and test endpoint with curl
```

### App redirects to login after refresh
```
Cause: Auth bootstrap not working
Fix: Check AuthContext and app/index.tsx implementation
```

## 📊 Report Types Explained

### Daily Report
- Shows hours worked on a specific date
- Breaks down by employee and job site
- No overtime calculation (single day)

### Weekly Report
- Shows Monday-Saturday (6 days)
- Calculates regular hours (0-40)
- Calculates overtime (>40)
- Flags employees with overtime

### Monthly Report
- Shows entire month
- Breaks down by pay periods (Monday-Saturday)
- Calculates overtime per pay period
- Shows job sites summary

## 🔍 Debugging

### Check Console Logs
```typescript
// Look for these prefixes:
[API] - API calls and responses
[Auth] - Authentication events
```

### Check AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get stored token
const token = await AsyncStorage.getItem('@crewclock_auth_token');
console.log('Token:', token);
```

### Test Backend Directly
```bash
# Get token from app
TOKEN="your_token_here"

# Test daily report
curl -H "Authorization: Bearer $TOKEN" \
  "https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/reports/daily?date=2024-01-15"
```

## 📝 Code Snippets

### Generate Report
```typescript
const handleGenerateReport = async () => {
  setLoading(true);
  try {
    const endpoint = `/api/reports/daily?date=${formatDateForAPI(selectedDate)}`;
    const response = await authenticatedGet<DailyReport>(endpoint);
    setReportData(response);
    showModal('Success', 'Report generated', 'success');
  } catch (error: any) {
    showModal('Error', error.message, 'error');
  } finally {
    setLoading(false);
  }
};
```

### Export CSV
```typescript
const handleExportCSV = async () => {
  const token = await getToken();
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const csvContent = await response.text();
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent);
  await Sharing.shareAsync(fileUri);
};
```

## 🎯 Success Criteria

✅ All API calls use `utils/api.ts`
✅ No hardcoded backend URLs
✅ Authentication persists on reload
✅ No `Alert.alert()` usage
✅ Proper error handling
✅ Loading states everywhere
✅ TypeScript types for all responses

---

**Backend URL**: https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev
**Status**: ✅ Integration Complete
**Last Updated**: 2024
