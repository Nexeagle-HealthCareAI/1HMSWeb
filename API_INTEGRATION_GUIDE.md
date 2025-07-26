# API Integration Guide for NexEagle easyHMS

## Overview
This guide explains how the login API has been integrated into the NexEagle easyHMS application.

## API Endpoint
- **Base URL**: `https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net/api`
- **Login Endpoint**: `/Auth/login`

## Files Created/Modified

### 1. `src/services/authService.ts`
Complete authentication service with the following features:
- Login with email/password
- Login with mobile/OTP
- Send OTP functionality
- Forgot password flow
- Token management
- Logout functionality

### 2. `src/contexts/AuthContext.tsx`
React Context for managing authentication state across the application:
- User state management
- Authentication status
- Login/logout functions
- Token storage and retrieval

### 3. `src/components/Login.tsx` (Updated)
Updated to use real API calls instead of mock data:
- Email/password login
- Mobile/OTP login
- Forgot password flow
- Error handling with toast notifications

### 4. `src/App.tsx` (Updated)
Wrapped with `AuthProvider` to provide authentication context throughout the app.

### 5. `src/utils/apiClient.ts`
Utility for making authenticated API requests:
- Automatic token inclusion in headers
- Error handling for 401 responses
- Generic GET, POST, PUT, DELETE methods
- Example API functions for common operations

## API Request Format

### Login with Email/Password
```json
{
  "isEmailUsed": true,
  "emailAddress": "user@example.com",
  "password": "hashed_password_here",
  "mobileNumber": "",
  "otp": ""
}
```

### Login with Mobile/OTP
```json
{
  "isEmailUsed": false,
  "emailAddress": "",
  "password": "",
  "mobileNumber": "string",
  "otp": "string"
}
```

## API Response Format
```json
{
  "success": true,
  "message": "Login Successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## How to Use

### 1. Login Component
The Login component now automatically uses the API:
- Enter email/password or mobile number
- For OTP login, the system will send OTP to the mobile number
- Successful login stores the access token in localStorage
- Error messages are displayed via toast notifications

### 2. Making Authenticated API Calls
Use the `ApiClient` utility for making authenticated requests:

```typescript
import { ApiClient, patientApi, appointmentApi } from '@/utils/apiClient';

// Example: Get all patients
const patients = await patientApi.getAll();

// Example: Create a new appointment
const newAppointment = await appointmentApi.create({
  patientId: "123",
  date: "2024-01-15",
  time: "10:00"
});

// Example: Custom API call
const data = await ApiClient.get('/custom-endpoint');
```

### 3. Using Auth Context
Access authentication state in any component:

```typescript
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      Welcome, {user?.email}!
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

## Token Management

### Automatic Token Inclusion
- All API calls automatically include the access token in the Authorization header
- Format: `Bearer <accessToken>`

### Token Expiration Handling
- If a 401 response is received, the user is automatically logged out
- User is redirected to the login page
- Token is removed from localStorage

### Token Storage
- Access tokens are stored in localStorage
- Tokens persist across browser sessions
- Manual logout clears the token

## Error Handling

### Network Errors
- Displayed via toast notifications
- User-friendly error messages
- Automatic retry for certain operations

### Authentication Errors
- 401 responses trigger automatic logout
- Clear error messages for invalid credentials
- OTP validation errors

### API Errors
- Structured error responses
- Consistent error handling across all API calls

## Security Features

### Token Security
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Automatic token inclusion in requests
- Token validation on app startup

### Error Handling
- No sensitive information in error messages
- Proper error logging (implement as needed)
- User-friendly error display

## Testing the Integration

### 1. Email/Password Login
1. Navigate to the login page
2. Enter valid email and password
3. Click "Login"
4. Verify successful login and token storage

### 2. Mobile/OTP Login
1. Switch to "Login with OTP"
2. Enter mobile number
3. Click "Send OTP"
4. Enter the received OTP
5. Click "Verify & Login"

### 3. Forgot Password
1. Click "Forgot Password?"
2. Enter mobile number
3. Verify OTP
4. Set new password

### 4. Authenticated API Calls
1. Login successfully
2. Use the `ApiClient` to make authenticated requests
3. Verify that the access token is included in requests

## Next Steps

### 1. Environment Variables
Consider moving the API base URL to environment variables:
```env
VITE_API_BASE_URL=https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net/api
```

### 2. Token Refresh
Implement token refresh mechanism for long-lived sessions.

### 3. Enhanced Security
- Consider using httpOnly cookies for token storage
- Implement CSRF protection
- Add rate limiting for login attempts

### 4. Error Logging
- Implement proper error logging
- Add error tracking service integration

### 5. Loading States
- Add loading indicators for API calls
- Implement skeleton loading for better UX

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure the API server allows requests from your domain
   - Check if the API supports the required HTTP methods

2. **Token Not Included**
   - Verify that login was successful
   - Check localStorage for the access token
   - Ensure the AuthProvider is wrapping your app

3. **401 Errors**
   - Token may be expired
   - User will be automatically logged out
   - Re-login to get a new token

4. **Network Errors**
   - Check internet connection
   - Verify API endpoint is accessible
   - Check browser console for detailed errors

### Debug Mode
Enable debug logging by adding console.log statements in the auth service methods.

## Support
For API-related issues, contact the backend team or refer to the API documentation. 