import { PrescriptionDesignerData } from '@/features/prescription/hooks/usePrescriptionDesigner';

export const defaultPrescriptionData: PrescriptionDesignerData = {
  patient: {
    name: 'John Doe',
    id: 'PT-000458',
    age: '38',
    gender: 'Male',
    phone: '+1 999 123 4567',
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
  },
  chiefComplaints: ['Intermittent chest discomfort', 'Shortness of breath on exertion'],
  comorbidities: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
  investigations: ['ECG (resting)', 'Lipid profile', 'HbA1c', 'Chest X-ray'],
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
