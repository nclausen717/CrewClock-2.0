
# CrewClock API Reference

## Base URL
```
https://x7ydjwck6f6dxcyxtq5hxqfkggu4jxdd.app.specular.dev
```

## Authentication Endpoints

### 1. Crew Lead Registration
**POST** `/api/auth/crew-lead/register`

**Request Body:**
```json
{
  "email": "crewlead@test.com",
  "password": "Test123!",
  "name": "John Crew Lead"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "crewlead@test.com",
    "name": "John Crew Lead",
    "role": "crew_lead"
  }
}
```

### 2. Crew Lead Login
**POST** `/api/auth/crew-lead/login`

**Request Body:**
```json
{
  "email": "crewlead@test.com",
  "password": "Test123!"
}
```

**Response (200):**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "crewlead@test.com",
    "name": "John Crew Lead",
    "role": "crew_lead"
  }
}
```

### 3. Admin Registration
**POST** `/api/auth/admin/register`

**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "Admin123!",
  "name": "Sarah Admin"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@test.com",
    "name": "Sarah Admin",
    "role": "admin"
  }
}
```

### 4. Admin Login
**POST** `/api/auth/admin/login`

**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "Admin123!"
}
```

**Response (200):**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "admin@test.com",
    "name": "Sarah Admin",
    "role": "admin"
  }
}
```

### 5. Get Current User
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@test.com",
    "name": "User Name",
    "role": "crew_lead" | "admin"
  }
}
```

### 6. Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Email already exists"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

```json
{
  "error": "Role mismatch"
}
```

## Frontend Integration

### API Utility (`utils/api.ts`)
```typescript
import { apiPost, authenticatedGet } from '@/utils/api';

// Login
const response = await apiPost('/api/auth/crew-lead/login', {
  email: 'user@test.com',
  password: 'password'
});

// Get current user (authenticated)
const user = await authenticatedGet('/api/auth/me');
```

### Auth Context (`contexts/AuthContext.tsx`)
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();

// Login
await login('user@test.com', 'password', 'crew_lead');

// Register
await register('user@test.com', 'password', 'John Doe', 'admin');

// Logout
await logout();
```

## Token Management

Tokens are stored in AsyncStorage with key: `@crewclock_auth_token`

- Saved after successful login/registration
- Automatically included in authenticated requests
- Removed on logout
- Validated on app startup via `/api/auth/me` endpoint
