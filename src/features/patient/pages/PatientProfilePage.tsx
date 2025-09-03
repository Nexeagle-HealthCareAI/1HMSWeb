import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  ChevronRight,
  User,
  History,
  FileText,
  TestTube,
  Activity,
  Settings,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  PatientOverview,
  PatientTimeline,
  PatientPrescriptions,
  PatientLabTests
} from '../components';

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
}

interface Prescription {
  id: string;
  date: Date;
  doctor: string;
  visitType: string;
  chiefComplaint: string;
  patientHistory: string;
  comorbidity: string;
  advice: string;
  investigation: string;
  observation: string;
  medications: {
    name: string;
    composition: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  instructions: string;
}

interface LabTestResult {
  id: string;
  appointmentId: string;
  testName: string;
  testDate: Date;
  orderedBy: string;
  status: 'ordered' | 'collected' | 'completed' | 'cancelled';
  results: {
    parameter: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    notes?: string;
  }[];
  notes?: string;
  attachments?: string[];
}

interface Appointment {
  id: string;
  date: Date;
  time: string;
  doctor: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: string;
  notes?: string;
  prescription?: Prescription;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'appointment' | 'prescription' | 'lab-test' | 'vital-update' | 'consultation';
  title: string;
  description: string;
  doctor: string;
  status: string;
  icon: React.ComponentType<any>;
  color: string;
  details?: any;
}

interface VitalSigns {
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  weight: number;
}

const samplePatient: PatientData = {
  id: 'P001',
  name: 'John Doe',
  age: 45,
  gender: 'Male',
  phone: '+91-9876543210',
  email: 'john.doe@email.com',
  address: '123 Main Street, City, State - 123456',
  bloodGroup: 'B+',
  emergencyContact: '+91-9876543211',
  medicalHistory: ['Hypertension (2020)', 'Diabetes Type 2 (2018)'],
  allergies: ['Penicillin', 'Shellfish'],
  currentMedications: ['Metformin 500mg', 'Lisinopril 10mg']
};

const samplePrescriptions: Prescription[] = [
  {
    id: 'RX001',
    date: new Date('2024-01-15'),
    doctor: 'Dr. Sarah Johnson',
    visitType: 'Follow-up',
    chiefComplaint: 'Chest pain and shortness of breath for the past 3 days',
    patientHistory: 'Patient has a history of hypertension for 5 years. Previous episodes of chest pain were managed with medication adjustments.',
    comorbidity: 'Hypertension, Type 2 Diabetes, Hyperlipidemia',
    advice: 'Maintain low-sodium diet, regular exercise, and stress management. Monitor blood pressure twice daily.',
    investigation: 'ECG, Chest X-ray, Lipid profile, Blood sugar monitoring',
    observation: 'Blood pressure elevated at 160/95 mmHg. Heart rate regular at 85 bpm. No signs of acute cardiac event.',
    medications: [
      {
        name: 'Amlodipine',
        composition: 'Amlodipine Besylate',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days'
      },
      {
        name: 'Atenolol',
        composition: 'Atenolol',
        dosage: '25mg',
        frequency: 'Twice daily',
        duration: '30 days'
      }
    ],
    instructions: 'Take medications with food. Monitor blood pressure daily. Return in 4 weeks for follow-up.'
  }
];

const sampleLabTests: LabTestResult[] = [
  {
    id: 'LAB001',
    appointmentId: 'APT001',
    testName: 'Complete Blood Count',
    testDate: new Date('2024-01-15'),
    orderedBy: 'Dr. Sarah Johnson',
    status: 'completed',
    results: [
      { parameter: 'Hemoglobin', value: '13.5', unit: 'g/dL', normalRange: '13.0-17.0', status: 'normal' },
      { parameter: 'WBC Count', value: '8.2', unit: 'K/μL', normalRange: '4.0-11.0', status: 'normal' },
      { parameter: 'Platelet Count', value: '250', unit: 'K/μL', normalRange: '150-400', status: 'normal' }
    ],
    notes: 'All parameters within normal range'
  },
  {
    id: 'LAB002',
    appointmentId: 'APT001',
    testName: 'Lipid Profile',
    testDate: new Date('2024-01-10'),
    orderedBy: 'Dr. Sarah Johnson',
    status: 'completed',
    results: [
      { parameter: 'Total Cholesterol', value: '220', unit: 'mg/dL', normalRange: '<200', status: 'high' },
      { parameter: 'HDL Cholesterol', value: '45', unit: 'mg/dL', normalRange: '>40', status: 'normal' },
      { parameter: 'LDL Cholesterol', value: '140', unit: 'mg/dL', normalRange: '<100', status: 'high' }
    ],
    notes: 'Elevated total and LDL cholesterol levels noted'
  }
];

const sampleAppointments: Appointment[] = [
  {
    id: 'APT001',
    date: new Date('2024-01-20'),
    time: '09:00 AM',
    doctor: 'Dr. Sarah Johnson',
    status: 'completed',
    type: 'Follow-up',
    notes: 'Patient reported improvement in symptoms',
    prescription: {
      id: 'RX001',
      date: new Date('2024-01-20'),
      doctor: 'Dr. Sarah Johnson',
      visitType: 'Follow-up',
      chiefComplaint: 'Chest pain and shortness of breath for the past 3 days',
      patientHistory: 'Patient has a history of hypertension for 5 years. Previous episodes of chest pain were managed with medication adjustments.',
      comorbidity: 'Hypertension, Type 2 Diabetes, Hyperlipidemia',
      advice: 'Maintain low-sodium diet, regular exercise, and stress management. Monitor blood pressure twice daily.',
      investigation: 'ECG, Chest X-ray, Lipid profile, Blood sugar monitoring',
      observation: 'Blood pressure elevated at 160/95 mmHg. Heart rate regular at 85 bpm. No signs of acute cardiac event.',
      medications: [
        {
          name: 'Amlodipine',
          composition: 'Amlodipine Besylate',
          dosage: '5mg',
          frequency: 'Once daily',
          duration: '30 days'
        },
        {
          name: 'Atenolol',
          composition: 'Atenolol',
          dosage: '25mg',
          frequency: 'Twice daily',
          duration: '30 days'
        }
      ],
      instructions: 'Take medications with food. Monitor blood pressure daily. Return in 4 weeks for follow-up.'
    }
  },
  {
    id: 'APT002',
    date: new Date('2024-01-25'),
    time: '10:30 AM',
    doctor: 'Dr. Sarah Johnson',
    status: 'scheduled',
    type: 'Consultation'
  }
];

const sampleVitalSigns: VitalSigns[] = [
  { date: '2024-01-01', systolic: 140, diastolic: 90, heartRate: 85, temperature: 98.6, oxygenSaturation: 98, respiratoryRate: 16, weight: 75.2 },
  { date: '2024-01-08', systolic: 135, diastolic: 88, heartRate: 82, temperature: 98.4, oxygenSaturation: 99, respiratoryRate: 15, weight: 74.8 },
  { date: '2024-01-15', systolic: 130, diastolic: 85, heartRate: 78, temperature: 98.2, oxygenSaturation: 98, respiratoryRate: 14, weight: 74.5 },
  { date: '2024-01-22', systolic: 128, diastolic: 82, heartRate: 75, temperature: 98.1, oxygenSaturation: 99, respiratoryRate: 14, weight: 74.2 },
  { date: '2024-01-29', systolic: 125, diastolic: 80, heartRate: 72, temperature: 98.0, oxygenSaturation: 98, respiratoryRate: 13, weight: 73.8 },
];

// Create timeline events from all patient data
const createTimelineEvents = (appointments: Appointment[], prescriptions: Prescription[], labTests: LabTestResult[]): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  // Add appointments
  appointments.forEach(apt => {
    events.push({
      id: apt.id,
      date: apt.date,
      type: 'appointment',
      title: `${apt.type} Appointment`,
      description: `Appointment with ${apt.doctor} at ${apt.time}`,
      doctor: apt.doctor,
      status: apt.status,
      icon: () => null, // Will be set by the component
      color: apt.status === 'completed' ? 'text-green-600' : apt.status === 'cancelled' ? 'text-red-600' : 'text-blue-600',
      details: apt
    });
  });

  // Add prescriptions
  prescriptions.forEach(pres => {
    events.push({
      id: pres.id,
      date: pres.date,
      type: 'prescription',
      title: `Prescription - ${pres.visitType}`,
      description: `${pres.medications.length} medications prescribed`,
      doctor: pres.doctor,
      status: 'active',
      icon: () => null, // Will be set by the component
      color: 'text-purple-600',
      details: pres
    });
  });

  // Add lab tests
  labTests.forEach(test => {
    events.push({
      id: test.id,
      date: test.testDate,
      type: 'lab-test',
      title: test.testName,
      description: `Lab test ordered by ${test.orderedBy}`,
      doctor: test.orderedBy,
      status: test.status,
      icon: () => null, // Will be set by the component
      color: test.status === 'completed' ? 'text-green-600' : 'text-orange-600',
      details: test
    });
  });

  // Sort by date (newest first)
  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const PatientProfilePage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientData>(samplePatient);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(samplePrescriptions);
  const [labTests] = useState<LabTestResult[]>(sampleLabTests);
  const [appointments, setAppointments] = useState<Appointment[]>(sampleAppointments);
  const [vitalSigns] = useState<VitalSigns[]>(sampleVitalSigns);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Create timeline events
  const timelineEvents = createTimelineEvents(appointments, prescriptions, labTests);

  useEffect(() => {
    if (patientId) {
      // TODO: Fetch patient data from API
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [patientId]);

  // Handle automatic new prescription creation when navigating to prescriptions tab
  useEffect(() => {
    if (activeTab === 'prescriptions') {
      // Only create a new prescription if there are no existing prescriptions
      if (prescriptions.length === 0) {
        const newPrescription: Prescription = {
          id: `RX${Date.now()}`,
          date: new Date(),
          doctor: 'Dr. Sarah Johnson',
          visitType: 'New Consultation',
          chiefComplaint: '',
          patientHistory: '',
          comorbidity: '',
          advice: '',
          investigation: '',
          observation: '',
          medications: [],
          instructions: ''
        };
        
        // Add the new prescription
        setPrescriptions([newPrescription]);
      }
    }
  }, [activeTab, prescriptions.length]);

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'lab-tests', label: 'Lab Tests', icon: TestTube },
    { id: 'customize-eprescription', label: 'Customize ePrescription', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-all duration-300">
      {/* Main Content with Side Navigation */}
      <div className="flex">
        {/* Fixed Side Navigation - Professional Design */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 fixed h-screen overflow-y-auto transition-all duration-300 ease-in-out shadow-sm`}>
          {/* Patient Profile Header in Side Nav */}
          <div className={`${sidebarCollapsed ? 'p-3' : 'p-6'} border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
              {!sidebarCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                  className="flex items-center gap-1 bg-muted/50 border-border text-muted-foreground hover:bg-muted transition-all duration-200 text-xs"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center gap-1 bg-muted/50 border-border text-muted-foreground hover:bg-muted transition-all duration-200 text-xs"
              >
                {sidebarCollapsed ? <Menu className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              </Button>
            </div>
            <div className="space-y-3">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'} bg-blue-100 rounded-full flex items-center justify-center border border-blue-200`}>
                  <User className={`${sidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                </div>
                {!sidebarCollapsed && (
                <div>
                    <h1 className="text-base font-semibold text-foreground mb-1 transition-colors duration-200">Patient Profile</h1>
                    <p className="text-sm text-muted-foreground transition-colors duration-200">ID: {patientId}</p>
                </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className={`${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-1 mt-2 transition-all duration-200`}>
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
              const isActive = activeTab === item.id;
                return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`
                    w-full group relative transition-all duration-200 flex items-center hover-lift
                    ${sidebarCollapsed ? 'justify-center px-2 h-11 w-11 mx-auto rounded-lg' : 'justify-start gap-3 h-11 px-3 rounded-lg'}
                    ${isActive 
                      ? 'ring-2 ring-primary bg-primary/5 text-primary border border-primary/20 shadow-sm' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }
                  `}
                      onClick={() => setActiveTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <IconComponent className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'} transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`} />
                  
                  {!sidebarCollapsed && (
                    <span className={`font-medium text-sm transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {item.label}
                    </span>
                  )}
                </Button>
                );
              })}
          </nav>
        </div>

        {/* Scrollable Content Area */}
        <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} p-6 overflow-y-auto h-screen transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-950`}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <PatientOverview
              patient={patient}
              appointments={appointments}
              prescriptions={prescriptions}
              labTests={labTests}
              vitalSigns={vitalSigns}
              onNavigateToTimeline={() => setActiveTab('timeline')}
            />
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <PatientTimeline timelineEvents={timelineEvents} />
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <PatientPrescriptions
              prescriptions={prescriptions}
              onPrescriptionsChange={setPrescriptions}
              patientVitals={vitalSigns[0]} // Pass the latest vitals
            />
          )}

          {/* Lab Tests Tab */}
          {activeTab === 'lab-tests' && (
            <PatientLabTests labTests={labTests} appointments={appointments} />
          )}

          {/* Customize ePrescription Tab */}
          {activeTab === 'customize-eprescription' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                                 <div className="p-3 bg-primary rounded-lg shadow-sm">
                   <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                   <h2 className="text-2xl font-semibold text-foreground mb-2">Customize ePrescription</h2>
                   <p className="text-muted-foreground">Configure prescription templates and settings for better workflow efficiency</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Settings */}
                 <div className="bg-card rounded-lg border border-border p-6">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Template Settings</h3>
                   <p className="text-muted-foreground text-sm mb-4">
                     Configure default prescription templates and formatting options.
                   </p>
                   <Button className="bg-primary hover:bg-primary/90 text-white">
                     Configure Templates
                   </Button>
                </div>

                 {/* Prescription Settings */}
                 <div className="bg-card rounded-lg border border-border p-6">
                   <h3 className="text-lg font-semibold text-foreground mb-4">Prescription Settings</h3>
                   <p className="text-muted-foreground text-sm mb-4">
                     Set default medications, dosages, and prescription preferences.
                   </p>
                   <Button className="bg-primary hover:bg-primary/90 text-white">
                     Manage Settings
                   </Button>
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
