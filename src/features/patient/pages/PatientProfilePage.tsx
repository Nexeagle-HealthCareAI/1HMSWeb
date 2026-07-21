import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertTriangle,
  Cloud,
  ClipboardList,
  PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  PatientOverview,
  PatientTimeline,
  PatientLabTests,
  PatientAnalytics
} from '../components';
import EPrescriptionPad, { EPrescriptionPadRef } from '@/features/patient/components/EPrescriptionPad';
import PrescriptionCustomizePanel from '@/features/prescription/components/PrescriptionCustomizePanel';
import { usePatientProfile } from '../hooks/usePatientProfile';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { PatientProfileData } from '../services/patientProfileApi';
import { PrescriptionPreviewModal, type GeneratePrescriptionDetailsRequest } from '@/components/shared/prescription-preview';
import { timelineApi, TimelineEventData } from '../services/timelineApi';
import { PatientProfileModal } from '../components/PatientProfileModal';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { InkRxPad } from '@/features/patient/components/DrawingBoard/InkRxPad';
import { prescriptionFieldConfigApi } from '@/features/doctor/services/prescriptionFieldConfigApi';

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
  const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();

  // Use patientId from route params or query params
  const patientId = routePatientId || queryPatientId;

  const [patient, setPatient] = useState<PatientData | null>(null);
  // ?tab=inkrx deep-links straight into the handwriting pad (used by DocBoard's InkRx button).
  const initialTab = searchParams.get('tab') === 'inkrx' ? 'inkrx' : 'prescriptions';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // InkRx — full-screen handwritten prescription on the doctor's letterhead.
  const [inkRxOpen, setInkRxOpen] = useState(initialTab === 'inkrx');
  const [inkRxTemplateUrl, setInkRxTemplateUrl] = useState<string | null>(null);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showPostSubmitDialog, setShowPostSubmitDialog] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
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
    if ((activeTab === 'timeline' || activeTab === 'overview') && patientId && hospitalId) {
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
        email: patientProfile.email || '',
        address: `${patientProfile.addressLine1}, ${patientProfile.city}, ${patientProfile.state || ''}, ${patientProfile.country} - ${patientProfile.pincode}`,
        bloodGroup: patientProfile.bloodGroup || '',
        emergencyContact: patientProfile.emergencyContactPhone || '',
        medicalHistory: [],
        allergies: patientProfile.allergies
          ? patientProfile.allergies.split(',').map(s => s.trim()).filter(Boolean)
          : [],
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

  // Report attachments from the patient's past visits (flattened from the timeline) — feeds the
  // Lab Tests tab so it shows the full report history, not just the current appointment.
  const historyAttachments = useMemo(
    () => timelineEvents.flatMap(e => (e.attachments || []).map(a => ({
      attachmentId: a.attachmentId,
      fileName: a.fileName,
      storageUrl: a.storageUrl,
      reportType: a.reportType,
      uploadedBy: a.uploadedBy,
      uploadedAt: a.uploadedAt,
      notes: a.notes,
    }))),
    [timelineEvents]
  );

  // Letterhead for InkRx — same settings call the prescription-settings page uses (requires
  // BOTH doctorId and hospitalId; see EPrescriptionPad's identical fetch).
  useEffect(() => {
    if (!doctorId || !hospitalId) return;
    prescriptionFieldConfigApi.getPrescriptionSettings(doctorId, hospitalId)
      .then((res) => {
        const uri = res?.data?.uri;
        if (uri) setInkRxTemplateUrl(uri);
      })
      .catch(() => { /* blank A4 fallback inside the pad */ });
  }, [doctorId, hospitalId]);

  // Overview removed; Timeline, Lab Tests and Prescription Fields live inside the prescription pad
  // (as sheets). The typed pad and the handwritten InkRx pad are the two views.
  const navigationItems = [
    { id: 'prescriptions', label: 'ePrescription Pad', icon: ClipboardList },
    { id: 'inkrx', label: 'InkRx — Handwritten', icon: PenLine },
  ];

  const inkRxAppointmentId = appointmentId || activeAppointmentId || '';

  const activeTabMeta = navigationItems.find((item) => item.id === activeTab) || navigationItems[0];

  // Handle edit profile click


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
    if (isSubscriptionReadOnly) { blockAction('Saving a prescription draft'); return; }
    if (ePrescriptionPadRef.current) {
      await ePrescriptionPadRef.current.saveDraft();
    }
  };

  // Risk level — derived from real data: age, recorded allergies, distinct chronic conditions
  // (comorbidities + diagnoses across visits), and polypharmacy at the latest visit.
  const getRiskLevel = () => {
    if (!patient) return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };

    let riskScore = 0;

    if (patient.age > 65) riskScore += 1;
    if (patient.age > 80) riskScore += 1;
    if (patient.allergies.length >= 1) riskScore += 1;

    // Distinct chronic conditions seen across the patient's visits.
    const conditions = new Set<string>();
    timelineEvents.forEach(e => {
      [e.comorbidity, e.diagnosis].forEach(field => {
        (field || '')
          .split(/[;,]/)
          .map(s => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach(c => conditions.add(c));
      });
    });
    if (conditions.size >= 2) riskScore += 1;
    if (conditions.size >= 4) riskScore += 1;

    // Polypharmacy at the most recent visit (timeline is newest-first).
    const recentMeds = timelineEvents[0]?.medications?.length ?? 0;
    if (recentMeds > 3) riskScore += 1;

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
        {/* Fixed Side Navigation - Professional Design (desktop/tablet only; mobile uses the back
            button + single tab in the sticky header instead, since there's only one nav item) */}
        <div className={`hidden lg:block ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 fixed h-screen overflow-y-auto transition-all duration-300 ease-in-out shadow-sm`}>
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
                <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'} bg-brand-100 rounded-full flex items-center justify-center border border-brand-200`}>
                  <User className={`${sidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5'} text-brand-600`} />
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
                  onClick={() => {
                    setActiveTab(item.id);
                    // Selecting InkRx goes straight into the full-screen pad — no extra click.
                    if (item.id === 'inkrx') setInkRxOpen(true);
                  }}
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
        <div className={`flex-1 ml-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} overflow-y-auto transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-950`} style={{ height: '100vh' }}>
          <div className="ml-0 lg:ml-4">
            {/* Patient Header - Show for all tabs */}
            {patient && (
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-20">
                <div className="px-3 sm:px-6 py-3 sm:py-4 text-gray-900 dark:text-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                    {/* Left Section: Avatar + Basic Info + Actions */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Mobile-only back button (sidebar nav is hidden below lg) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="lg:hidden h-9 w-9 p-0 shrink-0"
                        title="Back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>

                      {/* Patient Avatar with Risk Indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white shadow-md">
                          <AvatarImage src="/api/placeholder/80/80" />
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-brand-500 to-purple-600 text-white">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 border-2 border-white rounded-full p-0.5 ${riskLevel.bg}`}>
                          <riskLevel.icon className={`h-2.5 w-2.5 ${riskLevel.color}`} />
                        </div>
                      </div>

                      {/* Patient Name and Basic Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-50 truncate">{patient.name}</h1>
                          <Badge className={`${riskLevel.bg} ${riskLevel.color} border-0 text-xs px-2 py-0.5`}>
                            {riskLevel.level} Risk
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPatientProfileModal(true)}
                            className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                            title="Edit Profile"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Compact Info Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-800 dark:text-gray-200">ID:</span>
                            <span className="text-brand-600 dark:text-brand-300 font-mono">{patient.id}</span>
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      {/* Mobile/tablet tab switcher — the sidebar nav is hidden below lg */}
                      <div className="flex lg:hidden items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start">
                        {navigationItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              if (item.id === 'inkrx') setInkRxOpen(true);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === item.id
                              ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                              : 'text-gray-500 dark:text-gray-400'}`}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.id === 'inkrx' ? 'InkRx' : 'Rx Pad'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">
                        {activeTabMeta && (
                          <>
                            <activeTabMeta.icon className="h-5 w-5 text-primary shrink-0 hidden lg:block" />
                            <span className="hidden lg:inline">{activeTabMeta.label}</span>
                            {activeTab === 'prescriptions' && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1.5 rounded-full shadow-md sm:ml-2">
                                <Cloud className="h-3.5 w-3.5 text-white" />
                                <span>Auto-save enabled</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {activeTab === 'prescriptions' && (
                        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-9 sm:h-9" onClick={handlePreview}>
                            Preview
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs sm:text-sm h-9 sm:h-9 border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                            onClick={handleSaveForLater}
                            disabled={isSubscriptionReadOnly}
                          >
                            Save for later
                          </Button>
                          <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => isSubscriptionReadOnly ? blockAction('Submitting a prescription') : setShowSubmitConfirm(true)} disabled={isSubscriptionReadOnly}>
                            Submit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allergy banner — always visible so a doctor sees it before prescribing */}
            {patient && patient.allergies.length > 0 && (
              <div className="mx-3 sm:mx-6 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                <span><span className="font-bold">Allergies:</span> {patient.allergies.join(', ')}</span>
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

            {/* InkRx Tab — launch panel; the pad itself is full-screen (fixed inset-0) */}
            {activeTab === 'inkrx' && (
              <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <PenLine className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">InkRx — Handwritten Prescription</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                    Write directly on your letterhead with Apple Pencil or any stylus, full screen —
                    saved as a PDF in the appointment&apos;s documents.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2 shadow-md"
                  disabled={!inkRxAppointmentId}
                  onClick={() => setInkRxOpen(true)}
                >
                  <PenLine className="h-4 w-4" /> Start Writing
                </Button>
                {!inkRxAppointmentId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 max-w-sm">
                    No active appointment found for this patient — open InkRx from the Doctor Board
                    appointment row so the prescription is filed against the right visit.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <InkRxPad
          open={inkRxOpen && Boolean(inkRxAppointmentId)}
          onClose={() => setInkRxOpen(false)}
          templateUrl={inkRxTemplateUrl}
          appointmentId={inkRxAppointmentId}
          patientId={patientId || ''}
          hospitalId={hospitalId || ''}
          doctorId={doctorId || ''}
          patientName={patient?.name}
          patientAge={patient ? String(patient.age) : undefined}
          onGoToSettings={() => {
            setInkRxOpen(false);
            navigate('/dashboard?tab=settings&subtab=layout');
          }}
        />



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
          onNavigateToSettings={() => {
            setPreviewModalOpen(false);
            // Navigate to Doctor Dashboard Settings -> Layout
            navigate('/dashboard?tab=settings&subtab=layout');
          }}
        />

        <PatientProfileModal
          isOpen={showPatientProfileModal}
          onClose={() => setShowPatientProfileModal(false)}
          hospitalId={hospitalId || ''}
          patientId={patientId || ''}
          patientName={patient?.name}
        />
      </div>
    </div >
  );
};
