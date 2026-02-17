
# Testing Reports Feature - Step by Step Guide

## Prerequisites
Before testing reports, you need to have:
1. ✅ At least one admin or crew lead account
2. ✅ At least 2-3 employees created
3. ✅ At least 1-2 job sites created
4. ✅ Some time entries (clock in/out records)

## Setup Test Data

### Step 1: Create Admin Account
```
1. Open app
2. Tap "Admin Login"
3. Tap "Don't have an account? Register"
4. Fill in:
   - Name: Test Admin
   - Email: admin@test.com
   - Password: admin123
5. Tap "Register"
```

### Step 2: Create Employees
```
1. From home screen, tap "Manage Employees"
2. Tap "Add Employee"
3. Create Regular Employee #1:
   - Name: John Smith
   - Uncheck "Designate as Crew Leader"
   - Tap "Add Employee"
4. Create Regular Employee #2:
   - Name: Jane Doe
   - Uncheck "Designate as Crew Leader"
   - Tap "Add Employee"
5. Create Crew Leader:
   - Name: Mike Johnson
   - Check "Designate as Crew Leader"
   - Email: mike@test.com
   - Tap "Add Employee"
   - **IMPORTANT**: Save the generated password shown in the success modal
```

### Step 3: Create Job Sites
```
1. From home screen, tap "Job Sites"
2. Tap "Add Job Site"
3. Create Job Site #1:
   - Name: Downtown Construction
   - Location: 123 Main St, Downtown
   - Tap "Add Site"
4. Create Job Site #2:
   - Name: Riverside Project
   - Location: 456 River Rd, Riverside
   - Tap "Add Site"
```

### Step 4: Create Time Entries
```
1. Logout from admin account
2. Login as crew lead (mike@test.com with the generated password)
3. From home screen, tap "Clock In Team"
4. Select both employees (John Smith and Jane Doe)
5. Tap "Clock In (2)"
6. Select "Downtown Construction"
7. Tap "Confirm Clock In"
8. Wait a few minutes (or hours for realistic data)
9. Repeat steps 3-7 to clock out:
   - Tap "Clock In Team" again
   - Select the same employees
   - Tap "Clock Out" (if implemented)
```

**Note**: If clock-out isn't working from the UI, you may need to manually create time entries with both clock-in and clock-out times using the backend directly or wait for the feature to be implemented.

## Testing Reports

### Test 1: Daily Report

```
1. Login as admin or crew lead
2. From home screen, tap "Reports"
3. Verify "Daily" tab is selected (should be orange/highlighted)
4. Tap the date selector
5. Select today's date (or the date you created time entries)
6. Tap "Generate Report"
7. Wait for loading indicator
8. Verify the report displays:
   ✓ Total Hours summary card
   ✓ Employees section with:
     - Employee names
     - Hours worked
     - Job sites breakdown
   ✓ Job Sites section with:
     - Job site names
     - Total hours per site
9. Tap "Export CSV"
10. Verify CSV file is created and can be shared/downloaded
11. Open CSV file and verify format:
    - Headers: Employee Name, Job Site, Hours Worked, Date
    - Data rows with correct information
```

**Expected Result**: 
- Report shows all employees who worked on the selected date
- Hours are calculated correctly (clock-out time - clock-in time)
- CSV export works and contains correct data

### Test 2: Weekly Report

```
1. Still in Reports screen
2. Tap "Weekly" tab
3. Tap the date selector
4. Select any date in the week you want to report on
   (The system will automatically use the Monday of that week)
5. Tap "Generate Report"
6. Wait for loading indicator
7. Verify the report displays:
   ✓ Week range (Monday to Saturday)
   ✓ Total Hours summary
   ✓ Employees section with:
     - Employee names
     - Regular Hours (up to 40)
     - Overtime Hours (anything over 40)
     - Total Hours
     - "OT" badge if overtime exists
     - Job sites breakdown
   ✓ Job Sites section with total hours
8. Tap "Export CSV"
9. Verify CSV file format:
   - Headers: Employee Name, Regular Hours, Overtime Hours, Total Hours, Overtime Flag, Job Sites
   - Overtime Flag shows "Yes" or "No"
```

**Expected Result**:
- Report shows Monday-Saturday range
- Overtime is correctly calculated (>40 hours = overtime)
- Employees with >40 hours show "OT" badge
- CSV export includes overtime calculations

### Test 3: Monthly Report

```
1. Still in Reports screen
2. Tap "Monthly" tab
3. Tap the date selector
4. Select any date in the month you want to report on
5. Tap "Generate Report"
6. Wait for loading indicator
7. Verify the report displays:
   ✓ Month and Year
   ✓ Total Hours summary
   ✓ Pay Periods section (Monday-Saturday periods)
   ✓ Employees section with:
     - Employee names
     - Regular Hours (total for month)
     - Overtime Hours (total for month)
     - Total Hours
     - "OT" badge if any overtime
     - Job sites breakdown
   ✓ Job Sites section with monthly totals
8. Tap "Export CSV"
9. Verify CSV file format:
   - Headers: Employee Name, Pay Period, Regular Hours, Overtime Hours, Total Hours, Overtime Flag, Job Sites
   - Multiple rows per employee (one per pay period)
```

**Expected Result**:
- Report shows entire month broken down by pay periods
- Each pay period is Monday-Saturday (6 days)
- Overtime calculated per pay period
- CSV export includes all pay periods

## Troubleshooting

### Issue: "Failed to generate report"
**Possible Causes**:
1. No time entries exist for the selected date/period
2. Backend reports endpoints not implemented
3. Authentication token expired

**Solutions**:
1. Create time entries first (see Step 4 above)
2. Check backend logs for errors
3. Logout and login again

### Issue: "No data in report"
**Possible Causes**:
1. Selected wrong date
2. Time entries exist but not for that date
3. Employees were clocked in but not clocked out

**Solutions**:
1. Try different dates
2. Check time entries in database
3. Ensure clock-out times are recorded

### Issue: "CSV export fails"
**Possible Causes**:
1. File system permissions
2. Backend CSV endpoint not implemented
3. Network error

**Solutions**:
1. Check app permissions
2. Test CSV endpoint directly with curl
3. Check network connection

### Issue: "Overtime not calculated correctly"
**Expected Behavior**:
- Regular hours: 0-40 hours per week
- Overtime hours: anything over 40 hours per week
- Weekly report should show both separately
- Monthly report should calculate per pay period (Monday-Saturday)

**If incorrect**:
1. Check backend overtime calculation logic
2. Verify pay period boundaries (Monday-Saturday)
3. Ensure time entries have correct timestamps

## API Endpoint Testing (Manual)

If the UI reports fail, test the backend directly:

### Test Daily Report Endpoint
```bash
curl -X GET \
  'https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/reports/daily?date=2024-01-15' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Test Weekly Report Endpoint
```bash
curl -X GET \
  'https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/reports/weekly?startDate=2024-01-15' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Test Monthly Report Endpoint
```bash
curl -X GET \
  'https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/reports/monthly?year=2024&month=1' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Test CSV Export Endpoint
```bash
curl -X GET \
  'https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/reports/daily/csv?date=2024-01-15' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  --output daily-report.csv
```

**To get your token**:
1. Login to the app
2. Check AsyncStorage or console logs for the token
3. Or use browser dev tools to inspect network requests

## Success Criteria

✅ **Daily Report**:
- Shows correct date
- Lists all employees who worked that day
- Shows hours worked per employee
- Shows job sites breakdown
- CSV export works

✅ **Weekly Report**:
- Shows Monday-Saturday range
- Calculates regular hours (0-40)
- Calculates overtime hours (>40)
- Flags employees with overtime
- CSV export includes overtime data

✅ **Monthly Report**:
- Shows entire month
- Breaks down by pay periods
- Calculates overtime per pay period
- Shows job sites summary
- CSV export includes all pay periods

✅ **General**:
- Loading indicators work
- Error messages are user-friendly
- Success messages appear
- CSV files can be shared/downloaded
- Works on iOS, Android, and Web

---

**Need Help?**
- Check console logs for `[API]` messages
- Verify backend URL in `app.json`
- Test backend endpoints directly with curl
- Check that time entries exist in the database
