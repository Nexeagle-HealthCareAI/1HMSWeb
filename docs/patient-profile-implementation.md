# Patient Profile Implementation

## Overview
This implementation adds patient profile viewing and editing functionality to the appointment dashboard. When users click on a patient ID in the appointment dashboard, they can now view and edit the patient's registered details.

## Features Implemented

### 1. API Integration
- **GET** `/patient-profile?hospitalId={id}&patientId={id}` - Fetch patient profile details
- **PUT** `/patient-profile?hospitalId={id}&patientId={id}` - Update patient profile details

### 2. Components Created
- `PatientProfileModal` - Modal component for viewing and editing patient details
- `patientProfileApi` - API service for patient profile operations
- `usePatientProfile` - React hook for managing patient profile state

### 3. Key Features
- **View Mode**: Display patient information in a clean, organized layout
- **Edit Mode**: Allow editing of patient details with form validation
- **Real-time Updates**: Automatic refresh after successful updates
- **Error Handling**: Proper error messages and loading states
- **Responsive Design**: Works on desktop and mobile devices

### 4. Data Fields
The following patient information can be viewed and edited:
- Full Name (required)
- Age (required)
- Gender (required)
- Mobile Number (required)
- Address Line 1 (required)
- City (required)
- State
- Country
- Pincode
- Insurance ID
- Payment Mode

### 5. Read-only Fields
The following fields are displayed but cannot be edited:
- Patient ID (cannot be changed)
- Registration ID (system generated)
- Hospital ID (cannot be changed)
- Registered At (system timestamp)
- Registered By (user who registered the patient)

## Usage

### In Appointment Dashboard
1. Click on any patient ID in the appointment list
2. The patient profile modal will open showing all registered details
3. Click "Edit Profile" to make changes
4. Make necessary changes and click "Save Changes"
5. The profile will be updated and the modal will return to view mode

### API Calls
The implementation makes the following API calls:

**Fetch Patient Profile:**
```bash
GET /patient-profile?hospitalId=3FA7F5AD-2114-4567-9BC4-CCB71FDE4790&patientId=PTID39756489
Authorization: Bearer {token}
```

**Update Patient Profile:**
```bash
PUT /patient-profile?hospitalId=3FA7F5AD-2114-4567-9BC4-CCB71FDE4790&patientId=PTID39756489
Authorization: Bearer {token}
Content-Type: application/json

{
  "hospitalId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "patientId": "PTID39756489",
  "fullName": "Updated Name",
  "mobile": "+91895621447",
  "ageYears": 32,
  "sex": "Male",
  "addressLine1": "Updated Address",
  "city": "Hyderabad",
  "state": "Telangana",
  "country": "India",
  "pincode": "500081",
  "insuranceId": "INS123456",
  "paymentMode": "Cash"
}
```

## Technical Details

### File Structure
```
src/features/patient/
├── components/
│   ├── PatientProfileModal.tsx    # Main modal component
│   └── index.ts                   # Export file
├── hooks/
│   └── usePatientProfile.ts       # React hook for state management
└── services/
    └── patientProfileApi.ts       # API service functions
```

### Dependencies
- React Query for data fetching and caching
- React Hook Form for form management
- Zod for validation (if needed)
- Tailwind CSS for styling
- Lucide React for icons

### State Management
- Uses React Query for server state management
- Local state for form data and editing mode
- Toast notifications for user feedback

## Error Handling
- Network errors are caught and displayed to the user
- Form validation ensures required fields are filled
- Loading states prevent multiple simultaneous requests
- Graceful fallbacks for missing data

## Future Enhancements
- Add form validation with more detailed error messages
- Implement field-level validation
- Add support for file uploads (profile pictures)
- Add audit trail for profile changes
- Implement bulk editing capabilities
