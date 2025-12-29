// src/features/prescription/utils/prescriptionTestData.ts
import { GeneratePrescriptionDetailsPayload, PrescriptionTemplateDescriptor } from "@/components/shared/prescription-preview/services/generatePrescriptionDetailsService";
import { PrescriptionDesignerData } from "@/features/prescription/hooks/usePrescriptionDesigner";

// Dummy template descriptor to satisfy the type
const dummyTemplate: PrescriptionTemplateDescriptor = {
  prescriptionSettingsId: null,
  hospitalId: null,
  doctorId: null,
  headerHeight: 0,
  footerHeight: 0,
  contentLeftMargin: 0,
  contentRightMargin: 0,
  overFlowPage: false,
  fontFamily: 'Helvetica',
  fontSize: 10,
  fontWeight: 'regular',
  textColour: '#000000',
  uri: null,
  createdBy: null,
  createdAtUtc: new Date().toISOString(),
  updatedAtUtc: new Date().toISOString()
};

export const samplePrescriptionPayload: GeneratePrescriptionDetailsPayload = {
  template: dummyTemplate,
  patientData: {
    patientDetails: [
      {
        patientId: "PTID58260943",
        name: "TestName",
        age: 15,
        sex: "Male",
        address: "Line Bazar",
        contact: "null", // Corrected per typical string expectation
        mobile: "7896321456",
        city: "Purnea",
        state: "Bihar",
        country: "India",
        pincode: "700156",
        insuranceId: undefined
      }
    ],
    vitals: {
      bp: {
        sys: 160,
        dia: 80
      },
      pulse: 88,
      tempC: 99,
      spo2: 99,
      heightCm: 180,
      weightKg: 90,
      bmi: 27.8
    }
  },
  chiefComplaint: "Ankel Pain since 5 days; Fever since 45 days; Stomach Pain since 10 days",
  history: "History; New Gistory; New History2; New records",
  comorbidity: "asd; Commorbidity; Diabetic nephropathy; sugar; Myasthenia gravis",
  examination: "Examination 1; examination2; examination3; examninaton4",
  diagnosis: "ADD; Disgnosos; diagnosis more; qwerr; asdfsrdc",
  orders: {
    investigations: [
      "CBC",
      "KFT",
      "RBS"
    ],
    procedures: [
      "Dg Standing"
    ]
  },
  medications: [
    {
      drugName: "Paracetamol 40",
      dose: "650mg",
      route: "oral",
      frequency: "TDS",
      duration: "12 days",
      instructions: "After food",
      saltName: ""
    },
    {
      drugName: "Vomi-Stop Susp",
      dose: "30 mL",
      route: "IM",
      frequency: "BD",
      duration: "15 days",
      instructions: "After food",
      saltName: ""
    },
    {
      drugName: "Eno Sachet",
      dose: "5 gm",
      route: "IV",
      frequency: "BD",
      duration: "12 days",
      instructions: "Before food",
      saltName: ""
    }
  ],
  nonPharmacologicalAdvice: [
    {
      advice: "Take good bed rest",
      duration: "5 weeks",
      notes: ""
    },
    {
      advice: "Neew Proper sleep and Water intake",
      duration: "",
      notes: ""
    }
  ],
  privateNotes: "Patient need to be contacted again",
  certificates: {
    type: "UNFIT_FOR_DUTY",
    content: "FITNESS CERTIFICATE (UNFIT)\n\nDate of Issue: {{issuedDate}}\n\nMr/Ms {{patientName}} (Age {{age}}, {{gender}}; Patient ID: {{patientId}}/{{uhid}}) was examined on {{appointmentDate}} and is certified as:\n\nFitness Status: {{fitnessStatus}}\nUnfit for duty/work from: {{fromDate}} to {{toDate}} due to {{diagnosis}}.\n\nRemarks: {{remarks}}",
    issuedDate: "2025-12-29T00:00:00",
    fromDate: "2025-12-30T00:00:00",
    toDate: "2025-12-31T00:00:00",
    fitnessStatus: "FIT",
    remarks: "Good",
    category: "Fitness"
  },
  followUp: {
    followUpOn: "2025-12-30T00:00:00",
    reason: "BP Test",
    patientInstructions: null,
    referralEnabled: true,
    referral: {
      referredTo: {
        specialty: "Ortho",
        doctorName: "Govind Mondal"
      },
      clinicalSummary: ""
    }
  },
  immunizations: [
    {
      name: "HB",
      status: "advised",
      date: "2025-12-30T00:00:00",
      nextDueDate: "2025-12-31T00:00:00",
      doseNumber: 0,
      remarks: ""
    }
  ]
};

export const defaultPrescriptionData: PrescriptionDesignerData = {
  patient: {
    name: 'John Doe',
    id: 'PT-000458',
    age: '38',
    gender: 'Male',
    phone: '+1 999 123 4567',
    details: [
      { label: 'Patient ID', value: 'PT-000458' },
      { label: 'Age', value: '38' },
      { label: 'Gender', value: 'Male' },
      { label: 'Phone', value: '+1 999 123 4567' },
    ],
  },
  doctor: {
    name: 'Dr. Maya Desai',
    registration: 'REG/TS/2025/0093',
    specialization: 'Cardiologist',
    clinic: 'EasyHMS Cardio Center',
  },
  visit: {
    date: new Date().toISOString(),
    location: 'Hyderabad, IN',
    followUp: '2 weeks or earlier if symptoms worsen',
  },
  vitals: {
    bloodPressure: '120/80 mmHg',
    pulse: '74 bpm',
    temperature: '98.4 F',
    spo2: '99%',
    height: '178 cm',
    weight: '74 kg',
    bmi: '23.4',
  },
  chiefComplaints: ['Intermittent chest discomfort', 'Shortness of breath on exertion'],
  comorbidities: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
  investigations: ['ECG (resting)', 'Lipid profile', 'HbA1c', 'Chest X-ray'],
  procedures: ['Dg Standing'],
  medicines: [
    {
      name: 'Atorvastatin 20 mg',
      dose: '1 tablet',
      frequency: 'Once daily',
      duration: '30 days',
      notes: 'Preferably at bedtime',
    },
    {
      name: 'Metoprolol 25 mg',
      dose: '1 tablet',
      frequency: 'Twice daily',
      duration: '30 days',
      notes: 'Monitor pulse before dose',
    },
  ],
  advice: ['Continue moderate exercise (30 mins/day)', 'Maintain DASH diet plan', 'Review logs for blood sugar & BP'],
  notes: 'Discussed red-flag symptoms. Patient instructed to visit ER for persistent pain.',
};

