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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Main Content with Side Navigation */}
      <div className="flex">
        {/* Fixed Side Navigation - Enhanced UI/UX */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-72 lg:w-80'} bg-white border-r border-gray-200 fixed h-screen overflow-y-auto shadow-lg transition-all duration-300 ease-in-out`}>
          {/* Patient Profile Header in Side Nav - Enhanced */}
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-4 lg:p-6'} border-b border-gray-200 bg-gradient-to-r from-slate-800 to-slate-900 text-white relative overflow-hidden`}>
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
                {!sidebarCollapsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="flex items-center gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-xs"
                >
                  {sidebarCollapsed ? <Menu className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
              </div>
              <div className="space-y-3">
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10 lg:w-12 lg:h-12'} bg-white/10 rounded-full flex items-center justify-center border border-white/20`}>
                    <User className={`${sidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5 lg:h-6 lg:w-6'} text-white`} />
                  </div>
                  {!sidebarCollapsed && (
                    <div>
                      <h1 className="text-lg lg:text-xl font-bold text-white mb-1 drop-shadow-sm">Patient Profile</h1>
                      <p className="text-blue-100 text-xs lg:text-sm font-medium">ID: {patientId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <nav className={`${sidebarCollapsed ? 'p-2' : 'p-4 lg:p-6'}`}>
            {!sidebarCollapsed && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Quick Navigation
                </h3>
              </div>
            )}
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`
                        w-full group relative overflow-hidden transition-all duration-300 ease-in-out flex items-center
                        ${sidebarCollapsed ? 'justify-center px-1 h-12 w-12 mx-auto' : 'gap-3 px-4 py-3 lg:px-4 lg:py-3 h-12'}
                        rounded-lg text-left
                        ${isActive
                          ? 'bg-slate-100 text-slate-900 shadow-sm border-l-4 border-slate-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                        }
                      `}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-600 rounded-r-full"></div>
                      )}
                      
                      {/* Icon with enhanced styling */}
                      <div className={`
                        ${sidebarCollapsed ? 'p-1.5' : 'p-2'} rounded-md transition-all duration-300 flex-shrink-0
                        ${isActive 
                          ? 'bg-slate-200 shadow-sm' 
                          : 'bg-slate-100 group-hover:bg-slate-200 group-hover:shadow-sm'
                        }
                      `}>
                        <IconComponent className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4 lg:h-5 lg:w-5'} transition-all duration-300 ${
                          isActive ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-700'
                        }`} />
                      </div>
                      
                      {/* Text with enhanced styling */}
                      {!sidebarCollapsed && (
                        <>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="font-medium text-sm lg:text-base text-slate-900">{item.label}</span>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.id === 'overview' && 'Patient summary, vitals & medical history'}
                              {item.id === 'timeline' && 'Medical history timeline'}
                              {item.id === 'prescriptions' && 'Medication & prescriptions'}
                              {item.id === 'lab-tests' && 'Test results & reports'}
                              {item.id === 'customize-eprescription' && 'Template settings'}
                            </div>
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                              <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-600" />
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Scrollable Content Area - Optimized padding for laptop screens */}
        <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-72 lg:ml-80'} p-4 lg:p-6 xl:p-8 overflow-y-auto h-screen transition-all duration-300 ease-in-out`}>
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
            <div className="space-y-6 lg:space-y-8">
              {/* Enhanced Header - Optimized for laptop */}
              <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-8">
                <div className="p-3 lg:p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl">
                  <Settings className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 lg:mb-3">Customize ePrescription</h2>
                  <p className="text-gray-600 text-sm lg:text-base xl:text-xl leading-relaxed">Configure prescription templates and settings for better workflow efficiency</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Template Settings */}
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/40 p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500 hover:scale-102 lg:hover:scale-105">
                  <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl lg:rounded-2xl shadow-lg">
                      <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Prescription Template</h3>
                      <p className="text-gray-500 text-xs lg:text-sm">Configure default templates and headers</p>
                    </div>
                  </div>
                  <div className="space-y-6 lg:space-y-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 lg:mb-4">
                        Default Template
                      </label>
                      <select className="w-full px-4 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 shadow-lg transition-all duration-300 text-sm lg:text-base">
                        <option>Standard Template</option>
                        <option>Cardiology Template</option>
                        <option>Pediatric Template</option>
                        <option>Custom Template</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 lg:mb-4">
                        Header Information
                      </label>
                      <textarea 
                        className="w-full px-4 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 shadow-lg transition-all duration-300 resize-none text-sm lg:text-base"
                        rows={4}
                        placeholder="Enter default header information for prescriptions..."
                      />
                    </div>
                  </div>
                </div>

                {/* Field Configuration */}
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/40 p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500 hover:scale-102 lg:hover:scale-105">
                  <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl lg:rounded-2xl shadow-lg">
                      <Settings className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Field Configuration</h3>
                      <p className="text-gray-500 text-xs lg:text-sm">Choose which fields to include</p>
                    </div>
                  </div>
                  <div className="space-y-3 lg:space-y-4">
                    {[
                      'Chief Complaint', 'Patient History', 'Comorbidity', 'Observation',
                      'Investigation', 'Advice', 'Instructions'
                    ].map((field) => (
                      <div key={field} className="flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/30 rounded-xl lg:rounded-2xl hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-300 group/item">
                        <span className="text-xs lg:text-sm font-semibold text-gray-700 group-hover/item:text-blue-700 transition-colors">{field}</span>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300" 
                            defaultChecked 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medication Settings */}
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/40 p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500 hover:scale-102 lg:hover:scale-105">
                  <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl lg:rounded-2xl shadow-lg">
                      <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Medication Settings</h3>
                      <p className="text-gray-500 text-xs lg:text-sm">Configure medication fields</p>
                    </div>
                  </div>
                  <div className="space-y-4 lg:space-y-6">
                    <label className="block text-sm font-bold text-gray-700 mb-4 lg:mb-6">
                      Default Medication Fields
                    </label>
                    {[
                      'Medicine Composition', 'Dosage', 'Frequency', 'Duration'
                    ].map((field) => (
                      <div key={field} className="flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-gray-50/80 to-purple-50/30 rounded-xl lg:rounded-2xl hover:from-purple-50/50 hover:to-violet-50/30 transition-all duration-300 group/item">
                        <span className="text-xs lg:text-sm font-semibold text-gray-600 group-hover/item:text-purple-700 transition-colors">{field}</span>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg border-2 border-gray-300 text-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300" 
                            defaultChecked 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Settings */}
                <div className="group bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/40 p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500 hover:scale-102 lg:hover:scale-105">
                  <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl lg:rounded-2xl shadow-lg">
                      <Settings className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Print Settings</h3>
                      <p className="text-gray-500 text-xs lg:text-sm">Configure print options</p>
                    </div>
                  </div>
                  <div className="space-y-6 lg:space-y-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 lg:mb-4">
                        Paper Size
                      </label>
                      <select className="w-full px-4 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 bg-white/90 shadow-lg transition-all duration-300 text-sm lg:text-base">
                        <option>A4</option>
                        <option>Letter</option>
                        <option>Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 lg:mb-4">
                        Orientation
                      </label>
                      <select className="w-full px-4 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 bg-white/90 shadow-lg transition-all duration-300 text-sm lg:text-base">
                        <option>Portrait</option>
                        <option>Landscape</option>
                      </select>
                    </div>
                    <div className="space-y-3 lg:space-y-4">
                      {[
                        'Include Doctor Signature', 'Include Hospital Logo'
                      ].map((option) => (
                        <div key={option} className="flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-gray-50/80 to-orange-50/30 rounded-xl lg:rounded-2xl hover:from-orange-50/50 hover:to-red-50/30 transition-all duration-300 group/item">
                          <span className="text-xs lg:text-sm font-semibold text-gray-700 group-hover/item:text-orange-700 transition-colors">{option}</span>
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg border-2 border-gray-300 text-orange-600 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300" 
                              defaultChecked 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Save Button - Optimized for laptop */}
              <div className="flex justify-end pt-8 lg:pt-12">
                <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-8 lg:px-12 py-3 lg:py-4 rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500 transform hover:scale-105 lg:hover:scale-110 text-base lg:text-lg font-semibold">
                  <Settings className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
