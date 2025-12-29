import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Menu,
  Phone,
  Heart,
  Mail,
  Edit,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  PatientOverview,
  PatientTimeline,
  PatientLabTests,
  PatientProfileModal
} from '../components';
import EPrescriptionPad, { EPrescriptionPadRef } from '@/features/patient/components/EPrescriptionPad';
import PrescriptionCustomizePanel from '@/features/prescription/components/PrescriptionCustomizePanel';
import { usePatientProfile } from '../hooks/usePatientProfile';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { PatientProfileData } from '../services/patientProfileApi';
import { PrescriptionPreviewModal, type GeneratePrescriptionDetailsRequest } from '@/components/shared/prescription-preview';
import { timelineApi, TimelineEventData } from '../services/timelineApi';

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



export const PatientProfilePage: React.FC = () => {
  const { patientId: routePatientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();

  const safeDecode = (value: string | null) => {
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const queryPatientId = safeDecode(searchParams.get('patientId'));
  const appointmentId = safeDecode(searchParams.get('appointmentId'));
  const navigate = useNavigate();
  const {
    hospitalId: storedHospitalId,
    doctorId: storedDoctorId,
    getHospitalId,
    getDoctorId,
  } = useAuthStore();

  // Use patientId from route params or query params
  const patientId = routePatientId || queryPatientId;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labTests, setLabTests] = useState<LabTestResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showPostSubmitDialog, setShowPostSubmitDialog] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const ePrescriptionPadRef = useRef<EPrescriptionPadRef>(null);

  // Use the patient profile hook for real data
  const hospitalId = storedHospitalId || getHospitalId();
  const doctorId = storedDoctorId || getDoctorId();

  const {
    patientProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile
  } = usePatientProfile(hospitalId || '', patientId || '');

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventData[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'timeline' && patientId && hospitalId) {
      fetchTimelineEvents();
    }
  }, [activeTab, patientId, hospitalId]);

  const fetchTimelineEvents = async () => {
    if (!patientId || !hospitalId) return;

    setIsTimelineLoading(true);
    try {
      const targetDoctorId = doctorId || 'unknown';
      const response = await timelineApi.getEvents(patientId, targetDoctorId, hospitalId);
      if (response.success && response.data && response.data.length > 0) {
        setTimelineEvents(response.data[0].timelineData || []);
      }
    } catch (error) {
      console.error("Failed to fetch timeline events", error);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  // Update local patient state when real profile data is loaded
  useEffect(() => {
    if (patientProfile) {
      setPatient({
        id: patientProfile.patientId,
        name: patientProfile.fullName,
        age: patientProfile.ageYears,
        gender: patientProfile.sex,
        phone: patientProfile.mobile,
        email: '',
        address: `${patientProfile.addressLine1}, ${patientProfile.city}, ${patientProfile.state || ''}, ${patientProfile.country} - ${patientProfile.pincode}`,
        bloodGroup: '',
        emergencyContact: '',
        medicalHistory: [],
        allergies: [],
        currentMedications: []
      });
    }
  }, [patientProfile]);

  // Fetch active appointment ID for draft purposes
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveAppointment = async () => {
      if (!patientId || appointmentId) return; // Skip if we already have appointmentId from URL

      try {
        // Use searchPatients to find the patient's record which includes appointmentId
        const response = await appointmentApi.searchPatients({
          by: 'patientId',
          q: patientId,
          scope: 'local'
        });

        if (response.items && response.items.length > 0) {
          const match = response.items.find(item => item.patientId === patientId);
          if (match && match.appointmentId) {
            console.log('Found active appointment for patient:', match.appointmentId);
            setActiveAppointmentId(match.appointmentId);
          }
        }
      } catch (err) {
        console.error('Failed to look up active appointment for patient', err);
      }
    };

    fetchActiveAppointment();
  }, [patientId, appointmentId]);

  // Handle automatic new prescription creation when navigating to prescriptions tab
  useEffect(() => {
    if (activeTab === 'prescriptions') {
      // Only create a new prescription if there are no existing prescriptions
      if (prescriptions.length === 0) {
        const newPrescription: Prescription = {
          id: `RX${Date.now()}`,
          date: new Date(),
          doctor: 'Current Doctor', // Will be replaced with actual doctor name
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
    { id: 'prescriptions', label: 'E-Prescription', icon: FileText },
    { id: 'lab-tests', label: 'Lab Tests', icon: TestTube },
    { id: 'prescription-fields', label: 'Prescription Fields', icon: Settings },
  ];

  const activeTabMeta = navigationItems.find((item) => item.id === activeTab) || navigationItems[0];

  // Handle edit profile click
  const handleEditProfile = () => {
    setShowPatientProfileModal(true);
  };

  // Handle profile modal close
  const handleProfileModalClose = () => {
    setShowPatientProfileModal(false);
  };

  // Handle profile update success
  const handleProfileUpdateSuccess = () => {
    refetchProfile();
    setShowPatientProfileModal(false);
  };

  const handleConfirmSubmit = async () => {
    // Call the submit method on the EPrescriptionPad component
    if (ePrescriptionPadRef.current) {
      const success = await ePrescriptionPadRef.current.submitPrescription();
      if (success) {
        setShowSubmitConfirm(false);
        setShowPostSubmitDialog(true);
      }
    } else {
      setShowSubmitConfirm(false);
    }
  };

  const handleNextPatient = () => {
    setShowPostSubmitDialog(false);
    navigate(-1); // Navigate back to list/queue
  };

  const handleContinueCurrent = () => {
    setShowPostSubmitDialog(false);
  };

  const handlePreview = () => {
    if (!patientId || !appointmentId || !hospitalId || !doctorId) {
      alert('Missing details to generate preview. Please ensure patient, appointment, hospital, and doctor are set.');
      return;
    }

    setPreviewRequest({
      appointmentId,
      patientId,
      hospitalId,
      doctorId,
    });
    setPreviewModalOpen(true);
  };

  const handlePreviewModalChange = (open: boolean) => {
    setPreviewModalOpen(open);
    if (!open) {
      setPreviewRequest(null);
    }
  };

  const handleSaveForLater = async () => {
    if (ePrescriptionPadRef.current) {
      await ePrescriptionPadRef.current.saveDraft();
    }
  };

  // Calculate risk level for patient header
  const getRiskLevel = () => {
    if (!patient) return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };

    let riskScore = 0;

    // Check age risk
    if (patient.age > 65) riskScore += 1;
    if (patient.age > 80) riskScore += 1;

    // Check medical history
    if (patient.medicalHistory && patient.medicalHistory.length > 2) riskScore += 1;
    if (patient.allergies && patient.allergies.length > 1) riskScore += 1;

    // Check current medications
    if (patient.currentMedications && patient.currentMedications.length > 3) riskScore += 1;

    if (riskScore >= 4) return { level: 'High', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    if (riskScore >= 2) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  const riskLevel = getRiskLevel();

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">Error loading patient profile</div>
          <p className="text-muted-foreground">Please try again later.</p>
          <Button onClick={() => refetchProfile()} variant="outline">
            Retry
          </Button>
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
                    ${sidebarCollapsed ? 'justify-center px-2 h-11 w-11 mx-auto rounded-lg' : 'justify-start gap-2 h-11 px-2.5 rounded-lg'}
                    ${isActive
                      ? 'ring-2 ring-primary bg-primary/5 text-primary border border-primary/20 shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }
                  `}
                  onClick={() => setActiveTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <IconComponent className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'} transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />

                  {!sidebarCollapsed && (
                    <span className={`font-medium text-sm transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
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
        <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-y-auto transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-950`} style={{ height: '100vh' }}>
          <div className="ml-4">
            {/* Patient Header - Show for all tabs */}
            {patient && (
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-20">
                <div className="px-6 py-4 text-gray-900 dark:text-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left Section: Avatar + Basic Info + Actions */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Patient Avatar with Risk Indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                          <AvatarImage src="/api/placeholder/80/80" />
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 border-2 border-white rounded-full p-0.5 ${riskLevel.bg}`}>
                          <riskLevel.icon className={`h-2.5 w-2.5 ${riskLevel.color}`} />
                        </div>
                      </div>

                      {/* Patient Name and Basic Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50 truncate">{patient.name}</h1>
                          <Badge className={`${riskLevel.bg} ${riskLevel.color} border-0 text-xs px-2 py-0.5`}>
                            {riskLevel.level} Risk
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditProfile}
                            className="gap-2 text-xs h-8 px-2 shadow-none hover:bg-transparent hover:text-primary"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>

                        {/* Compact Info Row */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-800 dark:text-gray-200">ID:</span>
                            <span className="text-blue-600 dark:text-blue-300 font-mono">{patient.id}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-800 dark:text-gray-200">Age:</span>
                            <span>{patient.age}y, {patient.gender}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate max-w-32">{patient.phone}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>{patient.bloodGroup}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="truncate max-w-32">{patient.email}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Contextual Actions / Active Tab Indicator */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">
                        {activeTabMeta && (
                          <>
                            <activeTabMeta.icon className="h-5 w-5 text-primary" />
                            <span>{activeTabMeta.label}</span>
                          </>
                        )}
                      </div>
                      {activeTab === 'prescriptions' && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={handlePreview}>
                            Preview
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs sm:text-sm h-8 sm:h-9 border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                            onClick={handleSaveForLater}
                          >
                            Save for later
                          </Button>
                          <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => setShowSubmitConfirm(true)}>
                            Submit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-semibold">Coming Soon</div>
                  <p className="text-sm">Overview will be available in an upcoming update.</p>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="h-full p-6">
                {isTimelineLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PatientTimeline
                    timelineEvents={timelineEvents}
                  />
                )}
              </div>
            )}

            {/* Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
              <div className="h-full">
                <EPrescriptionPad
                  ref={ePrescriptionPadRef}
                  appointmentId={appointmentId || activeAppointmentId || undefined}
                />
              </div>
            )}

            {/* Prescription Fields Tab */}
            {activeTab === 'prescription-fields' && (
              <div className="h-full">
                <PrescriptionCustomizePanel showCloseButton={false} defaultTab="fields" />
              </div>
            )}

            {/* Lab Tests Tab */}
            {activeTab === 'lab-tests' && (
              <div className="h-full">
                <PatientLabTests labTests={labTests} appointments={appointments} />
              </div>
            )}
          </div>
        </div>

        {/* Patient Profile Modal */}
        {showPatientProfileModal && patientId && (
          <PatientProfileModal
            isOpen={showPatientProfileModal}
            onClose={handleProfileModalClose}
            hospitalId={hospitalId || ''}
            patientId={patientId}
            patientName={patient?.name || 'Unknown Patient'}
          />
        )}

        {/* Submit Confirmation Modal */}
        <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit E-Prescription</DialogTitle>
              <DialogDescription>
                Once you confirm, this patient’s e-prescription will be marked as completed.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to submit the prescription for this patient?
            </p>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSubmit}>
                Confirm & Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Post-Submission Success Dialog */}
        <Dialog open={showPostSubmitDialog} onOpenChange={setShowPostSubmitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Submission Successful
              </DialogTitle>
              <DialogDescription>
                The prescription has been successfully submitted and saved.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Would you like to continue with the current patient or check for the next patient?
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleContinueCurrent}>
                Continue with Current
              </Button>
              <Button onClick={handleNextPatient}>
                Check Next Patient
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PrescriptionPreviewModal
          open={previewModalOpen}
          onOpenChange={handlePreviewModalChange}
          request={previewRequest}
        />
      </div>
    </div >
  );
};
