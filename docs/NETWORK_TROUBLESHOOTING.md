
# Network & CORS Troubleshooting Guide

## Overview
This guide helps you troubleshoot "Failed to fetch" errors and network connectivity issues in the CrewClock app.

## Current Configuration

### Backend URL
The app is configured to use: `https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev`

This is set in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev"
    }
  }
}
```

### CORS Configuration (Backend)
The backend has been configured with the following CORS settings:
- **Allowed Origins**: All origins (*)
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, **X-Company-Token** (critical for multi-tenant auth)
- **Exposed Headers**: Content-Type, Authorization
- **Credentials**: Enabled
- **Max Age**: 86400 seconds (24 hours)

## Common Issues & Solutions

### 1. "Failed to fetch" Error

**Symptoms:**
- Request fails before reaching the backend
- No entry in backend logs
- Error message: "Failed to fetch" or "Network request failed"

**Possible Causes:**

#### A. CORS Not Configured (Backend Issue)
**Solution:** The backend CORS configuration has been updated. Wait for the backend build to complete, then test again.

**How to verify:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register an admin
4. Look for the OPTIONS preflight request
5. Check response headers for `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers`

#### B. Backend Not Running or Unreachable
**Solution:** Verify the backend is accessible:
```bash
# Test from your browser or terminal
curl https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/openapi.yaml
```

If this fails, the backend server is not running or not accessible.

#### C. Network Connectivity Issues
**Solution:**
- Check your internet connection
- Try accessing the backend URL in a browser
- Verify firewall/antivirus is not blocking the request

#### D. SSL/Certificate Issues
**Solution:**
- Ensure the backend has a valid SSL certificate
- For development, you may need to accept self-signed certificates

### 2. Running Backend Locally

If you're running the backend on your local machine:

#### For Web (Expo in browser)
Use `localhost` or `127.0.0.1`:
```json
{
  "extra": {
    "backendUrl": "http://localhost:8082"
  }
}
```

#### For Physical Device or Emulator
**IMPORTANT:** `localhost` will NOT work on devices/emulators. Use your machine's LAN IP address.

**Find your LAN IP:**
- **macOS/Linux:** Run `ifconfig` and look for `inet` under `en0` or `wlan0`
- **Windows:** Run `ipconfig` and look for `IPv4 Address`

Example:
```json
{
  "extra": {
    "backendUrl": "http://192.168.1.100:8082"
  }
}
```

**Note:** Make sure your device and computer are on the same network.

### 3. Testing the Backend Endpoint

To verify the `/api/auth/admin/register` endpoint is reachable:

#### Using curl:
```bash
curl -X POST https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/auth/admin/register \
  -H "Content-Type: application/json" \
  -H "X-Company-Token: YOUR_COMPANY_TOKEN" \
  -d '{"email":"test@example.com","password":"test123","name":"Test Admin"}'
```

#### Using Browser DevTools:
1. Open the app in a browser
2. Open DevTools (F12)
3. Go to Console tab
4. Run:
```javascript
fetch('https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev/api/auth/admin/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Company-Token': 'YOUR_COMPANY_TOKEN'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123',
    name: 'Test Admin'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Enhanced Error Logging

The app now includes detailed error logging for network issues:

### In Development Mode
When a "Failed to fetch" error occurs, you'll see:
```
═══════════════════════════════════════════════════
🚨 NETWORK ERROR: Failed to fetch
═══════════════════════════════════════════════════
This usually indicates one of the following issues:
1. CORS Error - Backend is not allowing cross-origin requests
   - Check that @fastify/cors is installed and configured
   - Verify X-Company-Token is in allowedHeaders
2. Network Connectivity - Cannot reach the backend server
   - Verify backend URL: https://...
   - Check if backend is running and accessible
3. SSL/Certificate Issues - HTTPS certificate problems
4. Firewall/Network Blocking - Request is being blocked

Request details:
  URL: https://...
  Method: POST
  Headers: [...]
  Backend URL: https://...
═══════════════════════════════════════════════════
```

### Viewing Logs

#### Frontend Logs (React Native/Expo):
- **Web:** Open browser DevTools Console (F12)
- **iOS Simulator:** Check Xcode Console or Metro bundler terminal
- **Android Emulator:** Check Android Studio Logcat or Metro bundler terminal
- **Physical Device:** Use React Native Debugger or Metro bundler terminal

#### Backend Logs:
Use the backend logs tool to see if requests are reaching the server.

## Checklist for Troubleshooting

- [ ] Backend is running and accessible (test with curl or browser)
- [ ] CORS is enabled on the backend with `X-Company-Token` in allowedHeaders
- [ ] Backend URL in `app.json` is correct for your environment
- [ ] If using local backend with device/emulator, using LAN IP (not localhost)
- [ ] Company token is present in AsyncStorage (check logs for "Company token status: present")
- [ ] Network connectivity is working (can access other websites)
- [ ] Firewall/antivirus is not blocking the request
- [ ] SSL certificate is valid (for HTTPS backends)

## Next Steps

1. **Wait for Backend Build:** The CORS fix is currently being applied to the backend. Wait for the build to complete.

2. **Test Again:** Once the backend build is complete, try registering an admin again.

3. **Check Logs:** If the issue persists, check both frontend and backend logs for more details.

4. **Verify CORS Headers:** Use browser DevTools to verify the CORS headers are present in the response.

## Support

If you continue to experience issues after following this guide:
1. Check the frontend logs for detailed error messages
2. Check the backend logs to see if requests are reaching the server
3. Verify the CORS configuration in the backend code
4. Test the endpoint directly using curl or Postman
