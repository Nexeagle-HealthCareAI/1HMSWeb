# E-Prescription API Documentation

## Base URL
```
/api/eprescriptions
```

## Authentication
All endpoints require JWT authentication in the header:
```
Authorization: Bearer <jwt-token>
```

---

## Endpoints

### 1. Create E-Prescription
**POST** `/api/eprescriptions`

Creates a new e-prescription for a patient.

**Request Body:**
```json
{
  "patientId": "uuid",
  "vitals": {
    "bloodPressure": "120/80",
    "temperature": "98.6°F",
    "heartRate": "72 bpm",
    "weight": "70 kg",
    "height": "170 cm",
    "bmi": "24.2",
    "oxygenSaturation": "98%"
  },
  "chiefComplaint": "Chest pain and shortness of breath",
  "history": "Patient has a history of hypertension...",
  "comorbidity": "Diabetes, Hypertension",
  "examination": "BP: 140/90, HR: 88, RR: 20...",
  "diagnosis": "Acute coronary syndrome",
  "orders": {
    "investigations": ["ECG", "Troponin", "CBC"],
    "procedures": ["Echocardiogram", "Stress test"]
  },
  "medications": [
    {
      "name": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily",
      "duration": "Lifelong",
      "instructions": "Take with food"
    }
  ],
  "privateNotes": "Patient needs close monitoring",
  "certificates": "Sick leave for 3 days",
  "immunizations": "COVID-19 vaccinated",
  "followUp": {
    "date": "2024-02-15",
    "referral": "Cardiologist",
    "notes": "Follow up in 2 weeks"
  },
  "nonPharmacologicalAdvice": "Low salt diet, regular exercise",
  "attachments": ["ecg-report.pdf", "lab-results.pdf"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "doctorId": "doctor-uuid",
    "patientId": "patient-uuid",
    "prescriptionNumber": "EP-2024-001",
    "prescriptionDate": "2024-01-15",
    "status": "draft",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "E-prescription created successfully"
}
```

### 2. Get E-Prescription
**GET** `/api/eprescriptions/{prescriptionId}`

Retrieves a specific e-prescription.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "doctorId": "doctor-uuid",
    "patientId": "patient-uuid",
    "prescriptionNumber": "EP-2024-001",
    "prescriptionDate": "2024-01-15",
    "vitals": { /* vitals object */ },
    "chiefComplaint": "Chest pain and shortness of breath",
    "history": "Patient has a history of hypertension...",
    "comorbidity": "Diabetes, Hypertension",
    "examination": "BP: 140/90, HR: 88, RR: 20...",
    "diagnosis": "Acute coronary syndrome",
    "orders": {
      "investigations": ["ECG", "Troponin", "CBC"],
      "procedures": ["Echocardiogram", "Stress test"]
    },
    "medications": [
      {
        "id": "med-uuid",
        "name": "Aspirin",
        "dosage": "75mg",
        "frequency": "Once daily",
        "duration": "Lifelong",
        "instructions": "Take with food"
      }
    ],
    "privateNotes": "Patient needs close monitoring",
    "certificates": "Sick leave for 3 days",
    "immunizations": "COVID-19 vaccinated",
    "followUp": {
      "date": "2024-02-15",
      "referral": "Cardiologist",
      "notes": "Follow up in 2 weeks"
    },
    "nonPharmacologicalAdvice": "Low salt diet, regular exercise",
    "attachments": ["ecg-report.pdf", "lab-results.pdf"],
    "status": "draft",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "E-prescription retrieved successfully"
}
```

### 3. Update E-Prescription
**PUT** `/api/eprescriptions/{prescriptionId}`

Updates an existing e-prescription.

**Request Body:** (Same as create, all fields optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "updatedAt": "2024-01-15T11:30:00Z"
  },
  "message": "E-prescription updated successfully"
}
```

### 4. List E-Prescriptions
**GET** `/api/eprescriptions`

Retrieves a list of e-prescriptions with pagination.

**Query Parameters:**
- `patientId` (optional): Filter by patient ID
- `doctorId` (optional): Filter by doctor ID
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "prescription-uuid",
        "prescriptionNumber": "EP-2024-001",
        "prescriptionDate": "2024-01-15",
        "patientName": "John Doe",
        "diagnosis": "Acute coronary syndrome",
        "status": "draft",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  },
  "message": "E-prescriptions retrieved successfully"
}
```

### 5. Delete E-Prescription
**DELETE** `/api/eprescriptions/{prescriptionId}`

Deletes an e-prescription (only if status is 'draft').

**Response:**
```json
{
  "success": true,
  "message": "E-prescription deleted successfully"
}
```

### 6. Print E-Prescription
**POST** `/api/eprescriptions/{prescriptionId}/print`

Generates a printable version of the e-prescription.

**Response:**
```json
{
  "success": true,
  "data": {
    "printUrl": "https://api.example.com/print/prescription-uuid",
    "expiresAt": "2024-01-15T12:30:00Z"
  },
  "message": "Print URL generated successfully"
}
```

---

## Field Configuration Endpoints

### 1. Get Doctor Field Configuration
**GET** `/api/doctors/{doctorId}/field-configurations`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "doctorId": "doctor-uuid",
    "fieldConfigs": [
      {
        "id": "vitals",
        "label": "Vitals",
        "enabled": true,
        "required": true,
        "category": "basic"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Field configuration retrieved successfully"
}
```

### 2. Update Doctor Field Configuration
**PUT** `/api/doctors/{doctorId}/field-configurations`

**Request Body:**
```json
{
  "fieldConfigs": [
    {
      "id": "vitals",
      "label": "Vitals",
      "enabled": true,
      "required": true,
      "category": "basic"
    },
    {
      "id": "chiefComplaint",
      "label": "Chief Complaint",
      "enabled": true,
      "required": true,
      "category": "basic"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "updatedAt": "2024-01-15T11:30:00Z"
  },
  "message": "Field configuration updated successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "chiefComplaint",
      "message": "Chief complaint is required"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `INTERNAL_ERROR`: Server error
