# API Endpoints Migration Guide

## Overview
This guide helps you migrate from hardcoded API endpoints to using the centralized API configuration in `src/app/api.ts`.

## Current Status

### ✅ Already Configured and Using API_ENDPOINTS
- **User Management** (`src/features/user-management/services/userManagementApi.ts`)
- **Auth** (`src/features/auth/services/authApi.ts`)
- **User Profile** (`src/features/profile/services/userProfileApi.ts`)
- **Media Upload** (`src/features/profile/services/mediaUploadApi.ts`)
- **Doctor Profile** (`src/features/doctor/services/doctorProfileApi.ts`)

### 🔄 Needs Migration
- **Doctor API** (`src/features/doctor/services/doctorApi.ts`)
- **Appointment API** (`src/features/appointment/services/appointmentApi.ts`)
- **Patient API** (`src/features/patient/services/patientApi.ts`)
- **Billing API** (`src/features/billing/services/billingApi.ts`)
- **AI API** (`src/features/ai/services/aiApi.ts`)

## Available Endpoints

### User Management
```typescript
API_ENDPOINTS.USER_MANAGEMENT.INVITE_USER
API_ENDPOINTS.USER_MANAGEMENT.GET_INVITED_USERS
API_ENDPOINTS.USER_MANAGEMENT.GET_ONBOARDED_USERS
```

### Doctors
```typescript
API_ENDPOINTS.DOCTORS.PROFILE
API_ENDPOINTS.DOCTORS.GET_ALL
API_ENDPOINTS.DOCTORS.GET_BY_ID(id)
API_ENDPOINTS.DOCTORS.CREATE
API_ENDPOINTS.DOCTORS.UPDATE(id)
API_ENDPOINTS.DOCTORS.DELETE(id)
API_ENDPOINTS.DOCTORS.GET_PROFILE
API_ENDPOINTS.DOCTORS.UPDATE_PROFILE
API_ENDPOINTS.DOCTORS.SEARCH(query)
API_ENDPOINTS.DOCTORS.GET_STATS
API_ENDPOINTS.DOCTORS.GET_SCHEDULE(id, date)
API_ENDPOINTS.DOCTORS.UPDATE_SCHEDULE(id)
API_ENDPOINTS.DOCTORS.GET_APPOINTMENTS(id, params)
API_ENDPOINTS.DOCTORS.GET_TODAY_APPOINTMENTS
API_ENDPOINTS.DOCTORS.GET_PATIENTS(id)
API_ENDPOINTS.DOCTORS.CREATE_PRESCRIPTION
API_ENDPOINTS.DOCTORS.GET_PRESCRIPTIONS(params)
API_ENDPOINTS.DOCTORS.UPDATE_PRESCRIPTION(id)
API_ENDPOINTS.DOCTORS.DELETE_PRESCRIPTION(id)
API_ENDPOINTS.DOCTORS.GET_DASHBOARD
API_ENDPOINTS.DOCTORS.UPDATE_AVAILABILITY
API_ENDPOINTS.DOCTORS.GET_AVAILABLE_SLOTS(date)
```

### Appointments
```typescript
API_ENDPOINTS.APPOINTMENTS.GET_ALL
API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(id)
API_ENDPOINTS.APPOINTMENTS.CREATE
API_ENDPOINTS.APPOINTMENTS.UPDATE(id)
API_ENDPOINTS.APPOINTMENTS.DELETE(id)
API_ENDPOINTS.APPOINTMENTS.GET_TODAY
API_ENDPOINTS.APPOINTMENTS.GET_BY_DATE(date)
API_ENDPOINTS.APPOINTMENTS.GET_BY_DOCTOR(doctorId, params)
API_ENDPOINTS.APPOINTMENTS.GET_BY_PATIENT(patientId)
API_ENDPOINTS.APPOINTMENTS.UPDATE_STATUS(id)
API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(id)
API_ENDPOINTS.APPOINTMENTS.CANCEL(id)
API_ENDPOINTS.APPOINTMENTS.COMPLETE(id)
API_ENDPOINTS.APPOINTMENTS.NO_SHOW(id)
API_ENDPOINTS.APPOINTMENTS.GET_SLOTS(doctorId, date)
API_ENDPOINTS.APPOINTMENTS.BLOCK_SLOTS
API_ENDPOINTS.APPOINTMENTS.UNBLOCK_SLOTS
API_ENDPOINTS.APPOINTMENTS.GET_STATS(params)
API_ENDPOINTS.APPOINTMENTS.SEND_REMINDER(id)
API_ENDPOINTS.APPOINTMENTS.BULK_REMINDERS
```

### Patients
```typescript
API_ENDPOINTS.PATIENTS.GET_ALL
API_ENDPOINTS.PATIENTS.GET_BY_ID(id)
API_ENDPOINTS.PATIENTS.CREATE
API_ENDPOINTS.PATIENTS.UPDATE(id)
API_ENDPOINTS.PATIENTS.DELETE(id)
API_ENDPOINTS.PATIENTS.SEARCH(query)
API_ENDPOINTS.PATIENTS.GET_STATS
API_ENDPOINTS.PATIENTS.GET_PROFILE(id)
API_ENDPOINTS.PATIENTS.UPDATE_PROFILE(id)
API_ENDPOINTS.PATIENTS.GET_MEDICAL_RECORDS(id)
API_ENDPOINTS.PATIENTS.CREATE_MEDICAL_RECORD
API_ENDPOINTS.PATIENTS.UPDATE_MEDICAL_RECORD(id)
API_ENDPOINTS.PATIENTS.DELETE_MEDICAL_RECORD(id)
API_ENDPOINTS.PATIENTS.GET_APPOINTMENTS(id)
API_ENDPOINTS.PATIENTS.GET_BILLING(id)
API_ENDPOINTS.PATIENTS.SEND_REMINDER(id)
API_ENDPOINTS.PATIENTS.BULK_REMINDERS
API_ENDPOINTS.PATIENTS.GET_DASHBOARD(id)
```

### Billing
```typescript
API_ENDPOINTS.BILLING.GET_ALL
API_ENDPOINTS.BILLING.GET_BY_ID(id)
API_ENDPOINTS.BILLING.CREATE
API_ENDPOINTS.BILLING.UPDATE(id)
API_ENDPOINTS.BILLING.DELETE(id)
API_ENDPOINTS.BILLING.GET_BY_PATIENT(patientId)
API_ENDPOINTS.BILLING.GET_BY_APPOINTMENT(appointmentId)
API_ENDPOINTS.BILLING.UPDATE_STATUS(id)
API_ENDPOINTS.BILLING.CREATE_PAYMENT
API_ENDPOINTS.BILLING.GET_PAYMENTS(billId)
API_ENDPOINTS.BILLING.CREATE_INSURANCE_CLAIM
API_ENDPOINTS.BILLING.GET_INSURANCE_CLAIMS(params)
API_ENDPOINTS.BILLING.UPDATE_INSURANCE_CLAIM_STATUS(id)
API_ENDPOINTS.BILLING.GET_STATS(params)
API_ENDPOINTS.BILLING.GET_CONFIGURATION
```

### AI
```typescript
API_ENDPOINTS.AI.GET_CONVERSATIONS(params)
API_ENDPOINTS.AI.GET_CONVERSATION(id)
API_ENDPOINTS.AI.CREATE_CONVERSATION
API_ENDPOINTS.AI.DELETE_CONVERSATION(id)
API_ENDPOINTS.AI.GET_MESSAGES(conversationId)
API_ENDPOINTS.AI.SEND_MESSAGE
API_ENDPOINTS.AI.GET_DOCUMENT_ANALYSES(params)
API_ENDPOINTS.AI.GET_DOCUMENT_ANALYSIS(id)
API_ENDPOINTS.AI.CREATE_DOCUMENT_ANALYSIS
API_ENDPOINTS.AI.DELETE_DOCUMENT_ANALYSIS(id)
API_ENDPOINTS.AI.GET_MEDICAL_INSIGHTS(params)
API_ENDPOINTS.AI.GET_MEDICAL_INSIGHT(id)
API_ENDPOINTS.AI.GENERATE_MEDICAL_INSIGHT
API_ENDPOINTS.AI.DELETE_MEDICAL_INSIGHT(id)
API_ENDPOINTS.AI.GET_ASSISTANTS
API_ENDPOINTS.AI.GET_ASSISTANT(id)
API_ENDPOINTS.AI.CREATE_ASSISTANT
API_ENDPOINTS.AI.UPDATE_ASSISTANT(id)
API_ENDPOINTS.AI.DELETE_ASSISTANT(id)
API_ENDPOINTS.AI.GET_MODELS
API_ENDPOINTS.AI.GET_MODEL(id)
API_ENDPOINTS.AI.GET_STATS(params)
API_ENDPOINTS.AI.SEARCH_CONVERSATIONS(query)
API_ENDPOINTS.AI.DELETE_MESSAGES(conversationId)
API_ENDPOINTS.AI.GET_CONVERSATION_SUMMARY(conversationId)
API_ENDPOINTS.AI.GENERATE_CONVERSATION_TITLE(conversationId)
API_ENDPOINTS.AI.ANALYZE_MEDICAL_TEXT
API_ENDPOINTS.AI.GET_PATIENT_SUGGESTIONS(patientId)
API_ENDPOINTS.AI.GET_DIAGNOSIS_SUGGESTIONS
API_ENDPOINTS.AI.CHECK_MEDICATION_INTERACTIONS
```

## Migration Steps

### 1. Import API_ENDPOINTS
```typescript
import { API_ENDPOINTS } from '@/app/api';
```

### 2. Replace Hardcoded URLs
**Before:**
```typescript
return apiClient.get('/doctors');
```

**After:**
```typescript
return apiClient.get(API_ENDPOINTS.DOCTORS.GET_ALL);
```

### 3. For Dynamic Endpoints
**Before:**
```typescript
return apiClient.get(`/doctors/${id}`);
```

**After:**
```typescript
return apiClient.get(API_ENDPOINTS.DOCTORS.GET_BY_ID(id));
```

### 4. For Query Parameters
**Before:**
```typescript
return apiClient.get(`/appointments?${params.toString()}`);
```

**After:**
```typescript
return apiClient.get(API_ENDPOINTS.APPOINTMENTS.GET_ALL);
// Note: Query parameters should be handled by the API client
```

## Benefits of Using API_ENDPOINTS

1. **Centralized Configuration**: All endpoints in one place
2. **Type Safety**: TypeScript provides autocomplete and error checking
3. **Easy Maintenance**: Change endpoints without touching multiple files
4. **Consistency**: Ensures all services use the same endpoint structure
5. **Environment Support**: Easy to switch between different API environments

## Example Migration

### Before (doctorApi.ts):
```typescript
export const doctorApi = {
  getAll: () => apiClient.get('/doctors'),
  getById: (id: string) => apiClient.get(`/doctors/${id}`),
  create: (data: any) => apiClient.post('/doctors', data),
  update: (id: string, data: any) => apiClient.put(`/doctors/${id}`, data),
  delete: (id: string) => apiClient.delete(`/doctors/${id}`),
};
```

### After (doctorApi.ts):
```typescript
import { API_ENDPOINTS } from '@/app/api';

export const doctorApi = {
  getAll: () => apiClient.get(API_ENDPOINTS.DOCTORS.GET_ALL),
  getById: (id: string) => apiClient.get(API_ENDPOINTS.DOCTORS.GET_BY_ID(id)),
  create: (data: any) => apiClient.post(API_ENDPOINTS.DOCTORS.CREATE, data),
  update: (id: string, data: any) => apiClient.put(API_ENDPOINTS.DOCTORS.UPDATE(id), data),
  delete: (id: string) => apiClient.delete(API_ENDPOINTS.DOCTORS.DELETE(id)),
};
```

## Next Steps

1. **Priority 1**: Migrate `doctorApi.ts` (most commonly used)
2. **Priority 2**: Migrate `appointmentApi.ts` (core functionality)
3. **Priority 3**: Migrate `patientApi.ts` and `billingApi.ts`
4. **Priority 4**: Migrate `aiApi.ts` (advanced features)

## Notes

- All endpoints are now centralized in `src/app/api.ts`
- The base URL is configured via environment variable `VITE_API_BASE_URL`
- Mock data functions are ready to be replaced with real API calls
- TypeScript provides full type safety for all endpoints

