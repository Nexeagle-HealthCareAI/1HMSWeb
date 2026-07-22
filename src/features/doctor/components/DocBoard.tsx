import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bell,
  BarChart,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Clock,
  Database,
  Download,
  Expand,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  FlaskConical,
  Heart,
  HeartPulse,
  Layout,
  LayoutDashboard,
  ListChecks,
  PrinterIcon,
  Loader2,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  MoreVertical,
  PenLine,
  Plus,
  RefreshCw,
  Scan,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  Stethoscope,
  Sparkles,
  Star,
  SunMedium,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Wifi,
  X,
  ZoomIn
} from 'lucide-react';
import { format, subDays, addDays, subMonths, addMonths } from 'date-fns';
import { useAuthStore, useAppStore } from '@/store';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AttachmentsSection from '@/features/patient/components/AttachmentsSection';
import { AdviseAdmissionSheet } from '@/features/patient/components/AdviseAdmissionSheet';
import { AdmissionStatusBadge } from '@/features/patient/components/AdmissionStatusBadge';
import { admissionReferralApi, AdmissionReferralItem } from '@/features/ipd-redesign/services/admissionReferralApi';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useQueryClient } from '@tanstack/react-query';
import { useDoctorProfile } from '../hooks/useDoctorProfile';
import { useDoctorAppointmentDetails } from '../hooks/useDoctorAppointmentDetails';
import { DoctorAppointmentDetail } from '../services/doctorApi';
import {
  PrescriptionPreviewModal,
  type GeneratePrescriptionDetailsRequest,
} from '@/components/shared/prescription-preview';
import PrescriptionCustomizePanel from '@/features/prescription/components/PrescriptionCustomizePanel';
import { PrescriptionLayout } from '@/features/prescription/components/layout/PrescriptionLayout';
import { useToast } from '@/hooks/use-toast';
import { RescheduleDialog } from '../../appointment/components/RescheduleDialog';
import { AppointmentDetail } from '../../appointment/services/appointmentApi';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';

const pastDateUpperBound = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const futureDateLowerBound = format(addDays(new Date(), 1), 'yyyy-MM-dd');

// Lazy-load the calendar page so it only loads when the doctor opens it from the dashboard
const DoctorCalendar = lazy(() => import('@/features/doctor-calendar/DoctorCalendarPage').then(module => ({ default: module.DoctorCalendarPage })));
const DoctorAnalyticsPage = lazy(() => import('./DoctorAnalyticsPage').then(module => ({ default: module.DoctorAnalyticsPage })));

import { MobileAppointmentCard } from './MobileAppointmentCard';

export interface PatientAppointment {
  appointmentId: string;
  patientFullName: string;
  patientId: string;
  doctorName: string;
  token?: {
    tokenNumber: number;
  };
  tokenDetails?: {
    tokenNumber: number;
  };
  startAt: string;
  endAt: string;
  finalStatusCode:
  | 'VITALS_REQUIRED'
  | 'READY'
  | 'UNDER_CONSULT'
  | 'LAB_REQUIRED'
  | 'AWAITING_RECONSULT'
  | 'COMPLETED'
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'PRE_APPOINTMENT';
  appointmentType: string | null;
  phone?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hospitalId, userId: authUserId, employeeId, userRole } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentDetail | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<PatientAppointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [markDoneDialogOpen, setMarkDoneDialogOpen] = useState(false);
  const [appointmentToMarkDone, setAppointmentToMarkDone] = useState<PatientAppointment | null>(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const location = useLocation();

  const [activeNavButton, setActiveNavButton] = useState<'appointments' | 'settings' | 'calendar' | 'analytics'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'settings' || tab === 'calendar' || tab === 'analytics') return tab;
    return 'appointments';
  });

  const [settingsTab, setSettingsTab] = useState<'fields' | 'personalized' | 'layout'>(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get('subtab');
    if (sub === 'fields' || sub === 'personalized' || sub === 'layout') return sub;
    return 'fields';
  });

  // Sync state with URL params changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && (tab === 'appointments' || tab === 'settings' || tab === 'calendar' || tab === 'analytics')) {
      setActiveNavButton(tab as 'appointments' | 'settings' | 'calendar' | 'analytics');
    }

    const sub = params.get('subtab');
    if (sub && (sub === 'fields' || sub === 'personalized' || sub === 'layout')) {
      setSettingsTab(sub as 'fields' | 'personalized' | 'layout');
    }
  }, [location.search]);

  const [layoutRefreshToken, setLayoutRefreshToken] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [appointmentForBilling, setAppointmentForBilling] = useState<PatientAppointment | null>(null);
  const [labAttachmentModal, setLabAttachmentModal] = useState<{ open: boolean; patientId?: string; patientName?: string; appointmentId?: string }>({ open: false });
  const [labAttachments, setLabAttachments] = useState<Record<string, string[]>>({});
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSettingsNavCollapsed, setIsSettingsNavCollapsed] = useState(true);

  // Auto-collapse sidebar on mount for maximizing screen real estate
  const setGlobalSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const isLowBandwidthMode = useAppStore((state) => state.isLowBandwidthMode);
  useEffect(() => {
    setGlobalSidebarCollapsed(true);
  }, [setGlobalSidebarCollapsed]);

  // Live update states
  const [isLiveUpdateEnabled, setIsLiveUpdateEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // userId for doctor profile
  const userId = authUserId || '';

  type NavKey = 'appointments' | 'calendar' | 'analytics' | 'settings';

  const { data: doctorProfileResponse, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorProfile(userId);
  const doctorId = doctorProfileResponse?.doctorId || '';
  // Profile completion percentage for verified badge
  const profileCompletionPercentage = doctorProfileResponse?.profileCompletionPercentage || 0;
  const clampedProfileCompletion = Math.min(Math.max(profileCompletionPercentage, 0), 100);
  // Check if doctor profile is restricted (204/404 means profile incomplete)
  const doctorProfileRestricted = useAuthStore(state => state.doctorProfileRestricted);
  const doctorProfileMessage = useAuthStore(state => state.doctorProfileMessage);
  const canBypassDoctorRestriction = (userRole === 'AdminDoctor' || userRole === 'Doctor') && Boolean(hospitalId);
  const isDoctorExperienceLocked = doctorProfileRestricted && !canBypassDoctorRestriction;

  const doctorDisplayName = doctorProfileResponse?.userId || t('docBoard.header.defaultDoctorName');

  const navButtons: Array<{ key: NavKey; label: string; shortLabel: string; Icon: LucideIcon; requiresProfile?: boolean; description: string; }> = [
    {
      key: 'appointments',
      label: t('docBoard.nav.appointments.label'),
      shortLabel: t('docBoard.nav.appointments.short'),
      Icon: Calendar,
      description: t('docBoard.nav.appointments.description')
    },
    {
      key: 'calendar',
      label: t('docBoard.nav.calendar.label'),
      shortLabel: t('docBoard.nav.calendar.short'),
      Icon: CalendarDays,
      requiresProfile: true,
      description: t('docBoard.nav.calendar.description')
    },
    {
      key: 'analytics',
      label: t('docBoard.nav.analytics.label', { defaultValue: 'Analytics' }),
      shortLabel: t('docBoard.nav.analytics.short', { defaultValue: 'Analytics' }),
      Icon: BarChart,
      requiresProfile: true,
      description: t('docBoard.nav.analytics.description', { defaultValue: 'View practice analytics' })
    },
    {
      key: 'settings',
      label: t('docBoard.nav.settings.label'),
      shortLabel: t('docBoard.nav.settings.short'),
      Icon: FileText,
      requiresProfile: true,
      description: t('docBoard.nav.settings.description')
    }
  ];

  const handleSettingsTabChange = (value: 'fields' | 'personalized' | 'layout') => {
    console.log('Settings tab changing to:', value);
    setSettingsTab(value);
    if (value === 'layout') {
      setLayoutRefreshToken((token) => token + 1);
    }
  };

  const handleLayoutTabClick = () => {
    if (settingsTab === 'layout') {
      setLayoutRefreshToken((token) => token + 1);
    }
  };

  const buildPreviewRequest = (appointment: PatientAppointment): GeneratePrescriptionDetailsRequest | null => {
    if (!appointment?.appointmentId || !appointment?.patientId || !hospitalId || !doctorId) {
      return null;
    }
    return {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      hospitalId,
      doctorId,
    };
  };

  const openPrescriptionPreview = (appointment: PatientAppointment) => {
    const requestPayload = buildPreviewRequest(appointment);
    if (!requestPayload) {
      alert(t('docBoard.alerts.previewMissingContext'));
      return;
    }
    setPreviewRequest(requestPayload);
    setPreviewModalOpen(true);
  };

  const handlePreviewModalChange = (open: boolean) => {
    setPreviewModalOpen(open);
    if (!open) {
      setPreviewRequest(null);
    }
  };

  const handleAddBillClick = (appointment: PatientAppointment) => {
    setAppointmentForBilling(appointment);
    setShowAddBillModal(true);
  };

  const handleAddBillModalChange = (open: boolean) => {
    setShowAddBillModal(open);
    if (!open) {
      setAppointmentForBilling(null);
    }
  };

  const handleOpenLabAttachments = (appointment: PatientAppointment) => {
    setLabAttachmentModal({
      open: true,
      patientId: appointment.patientId,
      patientName: appointment.patientFullName,
      appointmentId: appointment.appointmentId,
    });
  };

  const handleLabAttachmentsChange = (next: string[]) => {
    if (!labAttachmentModal.patientId) return;
    setLabAttachments((prev) => ({ ...prev, [labAttachmentModal.patientId]: next }));
  };

  // Compute API date window based on tab
  const { startDate: apiStartDate, endDate: apiEndDate } = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    switch (activeTab) {
      case 'current':
        return { startDate: today, endDate: today };
      case 'past':
        const monthAgo = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
        return { startDate: startDate || monthAgo, endDate: endDate || yesterday };
      case 'future':
        const monthHence = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        return { startDate: startDate || tomorrow, endDate: endDate || monthHence };
      default:
        return { startDate: today, endDate: today };
    }
  }, [activeTab, startDate, endDate]);

  const appointmentApiEnabled = !!hospitalId && !!doctorId && !doctorProfileLoading;

  // Appointments (✅ put enabled in options argument)
  const {
    data: appointmentData,
    isLoading: appointmentLoading,
    error: appointmentError,
    refetch
  } = useDoctorAppointmentDetails(
    {
      status: 'ALL',
      startDate: apiStartDate,
      endDate: apiEndDate,
      hospitalId: hospitalId || '',
      doctorId
    }
  );

  // Normalize data
  const appointments: PatientAppointment[] =
    appointmentData?.items?.map((item) => ({
      appointmentId: item.appointmentId,
      patientFullName: item.patientFullName,
      patientId: item.patientId,
      doctorName: 'Dr. Unknown',
      tokenDetails: { tokenNumber: item.tokenDetails?.tokenNumber || 0 },
      startAt: item.startAt,
      endAt: item.endAt,
      finalStatusCode: item.finalStatusCode as PatientAppointment['finalStatusCode'],
      appointmentType: item.appointmentType,
      phone: item.patientMobile
    })) || [];

  // Latest admission-advice referral per patient, for the AdmissionStatusBadge shown alongside
  // each appointment row. Fetched once (not per-row) to avoid an N+1 request per visible patient.
  const [referralsByPatient, setReferralsByPatient] = useState<Record<string, AdmissionReferralItem>>({});

  useEffect(() => {
    let cancelled = false;
    if (!hospitalId || !doctorId) {
      setReferralsByPatient({});
      return;
    }
    admissionReferralApi.list({ hospitalId, referringDoctorId: doctorId })
      .then(res => {
        if (cancelled) return;
        const map: Record<string, AdmissionReferralItem> = {};
        // Referrals come back ordered by CreatedAt desc, so the first one seen per patient is the latest.
        (res?.referrals ?? []).forEach(r => {
          if (!map[r.patientId]) map[r.patientId] = r;
        });
        setReferralsByPatient(map);
      })
      .catch(() => { if (!cancelled) setReferralsByPatient({}); });
    return () => { cancelled = true; };
  }, [hospitalId, doctorId]);

  // Loading + Error state combine
  // If profile is restricted (204), we shouldn't consider appointment loading state as blocking
  const isDataLoading = doctorProfileLoading || (!doctorProfileRestricted && appointmentLoading);

  const normalizedDoctorProfileError = doctorProfileError as AxiosError | undefined;
  const normalizedAppointmentError = appointmentError as AxiosError | undefined;

  // Check if the error is a 204/404 (profile incomplete) - these should show restriction message, not error
  const isProfileIncompleteError = Boolean(
    normalizedDoctorProfileError && (
      normalizedDoctorProfileError.response?.status === 204 ||
      normalizedDoctorProfileError.response?.status === 404 ||
      normalizedDoctorProfileError.message?.includes('not found')
    )
  );

  // Only show error if it's NOT a profile incomplete error (204/404) or if profile is not restricted
  // If profile is restricted, we show the restriction message instead
  const hasError = (normalizedDoctorProfileError || normalizedAppointmentError) && !isProfileIncompleteError && !isDoctorExperienceLocked;
  const shouldShowError = hasError && !isDataLoading;

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, startDate, endDate]);

  // Live update manual refresh fallback
  const handleManualRefresh = async () => {
    if (refetch && hospitalId && doctorId) {
      try {
        await refetch();
        setLastUpdateTime(new Date());
      } catch (error) {
        console.error('Manual update failed:', error);
      }
    }
  };

  // Default date ranges for past/future tabs
  useEffect(() => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const monthAgo = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const monthHence = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

    if (activeTab === 'past') {
      setStartDate(monthAgo);
      setEndDate(yesterday);
    } else if (activeTab === 'future') {
      setStartDate(tomorrow);
      setEndDate(monthHence);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VITALS_REQUIRED':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 text-xs px-1.5 py-0.5 font-medium">
            {t('docBoard.statusBadge.vitalsRequired')}
          </Badge>
        );
      case 'READY':
        return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.ready')}</Badge>;
      case 'UNDER_CONSULT':
        return <Badge className="bg-brand-50 text-brand-700 border-brand-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.consulting')}</Badge>;
      case 'LAB_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.labRequired')}</Badge>;
      case 'AWAITING_RECONSULT':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.reconsult')}</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.completed')}</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.scheduled')}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-50 text-gray-600 border-gray-300 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.cancelled')}</Badge>;
      case 'PRE_APPOINTMENT':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.preAppointment')}</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.default', { status })}</Badge>;
    }
  };

  // Helpers for day boundaries
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Filtered appointments (no in-place mutation, correct date range handling)
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (activeTab === 'past') {
      filtered = filtered.filter((apt) => new Date(apt.startAt) < todayStart);
    } else if (activeTab === 'future') {
      filtered = filtered.filter((apt) => new Date(apt.startAt) > todayEnd);
    } else {
      filtered = filtered.filter((apt) => {
        const d = new Date(apt.startAt);
        return d >= todayStart && d <= todayEnd;
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.patientFullName.toLowerCase().includes(q) || apt.patientId.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'current' && selectedStatus !== 'all') {
      filtered = filtered.filter((apt) => apt.finalStatusCode === (selectedStatus as PatientAppointment['finalStatusCode']));
    }

    if (activeTab === 'past' || activeTab === 'future') {
      const startDt = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const endDt = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

      if (startDt) {
        filtered = filtered.filter((apt) => new Date(apt.startAt) >= startDt);
      }
      if (endDt) {
        filtered = filtered.filter((apt) => new Date(apt.startAt) <= endDt);
      }
    }

    // Sort on a cloned array to avoid mutating source
    return [...filtered].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [appointments, activeTab, searchTerm, selectedStatus, startDate, endDate, todayStart, todayEnd]);

  // Clamp pagination if filters reduce pages
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    if (newTotalPages > 0 && currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [filteredAppointments.length, itemsPerPage, currentPage]);

  // Counts for "current" chips
  const currentAppointmentCounts = useMemo(() => {
    const currentAppointments = appointments.filter((apt) => {
      const d = new Date(apt.startAt);
      return d >= todayStart && d <= todayEnd;
    });

    return {
      all: currentAppointments.length,
      vitalsRequired: currentAppointments.filter((apt) => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      ready: currentAppointments.filter((apt) => apt.finalStatusCode === 'READY').length,
      underConsult: currentAppointments.filter((apt) => apt.finalStatusCode === 'UNDER_CONSULT').length,
      labRequired: currentAppointments.filter((apt) => apt.finalStatusCode === 'LAB_REQUIRED').length,
      awaitingReconsult: currentAppointments.filter((apt) => apt.finalStatusCode === 'AWAITING_RECONSULT').length,
      completed: currentAppointments.filter((apt) => apt.finalStatusCode === 'COMPLETED').length,
      cancelled: currentAppointments.filter((apt) => apt.finalStatusCode === 'CANCELLED').length
    };
  }, [appointments, todayStart, todayEnd]);

  const appointmentTabCounts = useMemo(() => {
    return appointments.reduce(
      (acc, apt) => {
        const d = new Date(apt.startAt);
        if (d < todayStart) {
          acc.past += 1;
        } else if (d > todayEnd) {
          acc.future += 1;
        } else {
          acc.current += 1;
        }
        return acc;
      },
      { current: 0, past: 0, future: 0 }
    );
  }, [appointments, todayStart, todayEnd]);

  const pastAppointmentsSummary = useMemo(() => {
    const pastAppointments = appointments.filter((apt) => new Date(apt.startAt) < todayStart);
    const sorted = pastAppointments.length
      ? [...pastAppointments].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      : [];

    return {
      total: pastAppointments.length,
      completed: pastAppointments.filter((apt) => apt.finalStatusCode === 'COMPLETED').length,
      noShow: pastAppointments.filter((apt) => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      ready: pastAppointments.filter((apt) => apt.finalStatusCode === 'READY').length,
      awaitingReconsult: pastAppointments.filter((apt) => apt.finalStatusCode === 'AWAITING_RECONSULT').length,
      cancelled: pastAppointments.filter((apt) => apt.finalStatusCode === 'CANCELLED').length,
      lastVisit: sorted[0]?.startAt || null
    };
  }, [appointments, todayStart]);

  const futureAppointmentsSummary = useMemo(() => {
    const futureAppointments = appointments.filter((apt) => new Date(apt.startAt) > todayEnd);
    const sorted = futureAppointments.length
      ? [...futureAppointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      : [];

    return {
      total: futureAppointments.length,
      scheduled: futureAppointments.filter((apt) => apt.finalStatusCode === 'SCHEDULED').length,
      ready: futureAppointments.filter((apt) => apt.finalStatusCode === 'READY').length,
      vitalsRequired: futureAppointments.filter((apt) => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      nextVisit: sorted[0]?.startAt || null
    };
  }, [appointments, todayEnd]);

  const appointmentTabsConfig: Array<{
    value: 'current' | 'past' | 'future';
    label: string;
    subLabel: string;
    Icon: LucideIcon;
    accent: string;
    iconColor: string;
    count: number;
  }> = [
      {
        value: 'current',
        label: t('docBoard.tabs.current.label'),
        subLabel: t('docBoard.tabs.current.subLabel'),
        Icon: Activity,
        accent: 'from-brand-500 via-brand-500 to-purple-500',
        iconColor: 'text-brand-500 dark:text-brand-300',
        count: appointmentTabCounts.current
      },
      {
        value: 'past',
        label: t('docBoard.tabs.past.label'),
        subLabel: t('docBoard.tabs.past.subLabel'),
        Icon: Clock,
        accent: 'from-slate-500 via-slate-600 to-slate-700',
        iconColor: 'text-slate-500 dark:text-slate-300',
        count: appointmentTabCounts.past
      },
      {
        value: 'future',
        label: t('docBoard.tabs.future.label'),
        subLabel: t('docBoard.tabs.future.subLabel'),
        Icon: CalendarDays,
        accent: 'from-emerald-500 via-teal-500 to-cyan-500',
        iconColor: 'text-emerald-500 dark:text-emerald-300',
        count: appointmentTabCounts.future
      }
    ];

  const activeAppointmentTab = appointmentTabsConfig.find((tab) => tab.value === activeTab);

  // Pagination slices
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Pagination helper
  const renderPaginationItems = () => {
    if (totalPages <= 0) return null;

    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => handlePageChange(1)} isActive={currentPage === 1} className="cursor-pointer">
            1
          </PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <span className="flex h-9 w-9 items-center justify-center">...</span>
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i} className="cursor-pointer">
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <span className="flex h-9 w-9 items-center justify-center">...</span>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)} isActive={currentPage === totalPages} className="cursor-pointer">
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || (totalPages > 0 && page > totalPages)) return;
    setCurrentPage(page);
  };

  // Date validation handlers
  const handleStartDateChange = (value: string) => {
    let nextValue = value;
    if (activeTab === 'past' && nextValue && nextValue > pastDateUpperBound) {
      nextValue = pastDateUpperBound;
    }
    if (activeTab === 'future' && nextValue && nextValue < futureDateLowerBound) {
      nextValue = futureDateLowerBound;
    }

    setStartDate(nextValue);
    if (nextValue && endDate && new Date(nextValue) > new Date(endDate)) {
      setEndDate(nextValue);
    }
  };
  const handleEndDateChange = (value: string) => {
    let nextValue = value;

    if (activeTab === 'past' && nextValue && nextValue > pastDateUpperBound) {
      nextValue = pastDateUpperBound;
    }
    if (activeTab === 'future' && nextValue && nextValue < futureDateLowerBound) {
      nextValue = futureDateLowerBound;
    }

    if (startDate && nextValue && new Date(nextValue) < new Date(startDate)) {
      console.warn('Start date cannot be after end date');
      return;
    }
    setEndDate(nextValue);
  };

  const handleCancelClick = (appointment: PatientAppointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel || !hospitalId) return;
    setIsCancelling(true);
    try {
      const response = await appointmentApi.cancelAppointment({
        appointmentId: appointmentToCancel.appointmentId,
        patientId: appointmentToCancel.patientId,
        hospitalId,
        reason: cancelReason.trim() || undefined,
      });

      if (!response.success) {
        toast({
          title: 'Could not cancel appointment',
          description: response.message,
          variant: 'destructive',
        });
        return;
      }

      // Close dialog + refresh immediately (more reliable than invalidating a guessed key)
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
      setCancelReason('');
      toast({ title: 'Appointment cancelled', description: response.message });
      await refetch?.();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Could not cancel appointment',
        description: error?.response?.data?.message || error?.message,
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkDoneClick = (appointment: PatientAppointment) => {
    setAppointmentToMarkDone(appointment);
    setMarkDoneDialogOpen(true);
  };

  const handleConfirmMarkDone = async () => {
    if (!appointmentToMarkDone) return;
    setIsMarkingDone(true);
    try {
      await appointmentApi.completeAppointment({
        hospitalId: hospitalId || '',
        doctordId: doctorId || '',
        appointmentId: appointmentToMarkDone.appointmentId,
        patientId: appointmentToMarkDone.patientId
      });

      setMarkDoneDialogOpen(false);
      setAppointmentToMarkDone(null);
      await refetch?.();
    } catch (error) {
      console.error('Error marking appointment as done:', error);
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
    setCancelReason('');
  };

  const handleRescheduleClick = (appointment: PatientAppointment) => {
    const appointmentDetail: AppointmentDetail = {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      patientFullName: appointment.patientFullName,
      patientMobile: appointment.phone || '',
      patientSex: '',
      patientAgeYears: 0,
      doctorId: doctorId || '',
      doctorName: appointment.doctorName,
      appointmentDate: appointment.startAt,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      finalStatusCode: appointment.finalStatusCode,
      reason: '',
      insuranceId: null,
      paymentMode: '',
      lastStatusAt: '',
      appointmentType: appointment.appointmentType || 'New',
      createdAt: '',
      token: {
        tokenId: '',
        tokenNumber: appointment.tokenDetails?.tokenNumber || 0,
        status: '',
        createdAt: ''
      },
      departments: []
    };

    setAppointmentToReschedule(appointmentDetail);
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSuccess = () => {
    setShowRescheduleDialog(false);
    setAppointmentToReschedule(null);
    toast({
      title: "Rescheduled",
      description: "Appointment has been successfully rescheduled.",
    });
    refetch?.();
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handlePatientIdClick = (appointment: DoctorAppointmentDetail | PatientAppointment) => {
    const encodedPatientId = encodeURIComponent(appointment.patientId);
    const encodedAppointmentId = appointment.appointmentId ? encodeURIComponent(appointment.appointmentId) : '';
    const appointmentParam = encodedAppointmentId ? `&appointmentId=${encodedAppointmentId}` : '';
    navigate(`/patient/new?patientId=${encodedPatientId}${appointmentParam}`);
  };

  // Deep-link straight into the full-screen InkRx handwriting pad on the patient workspace
  // (?tab=inkrx auto-opens it) — one tap from the board to pen-on-letterhead.
  const handleInkRxClick = (appointment: DoctorAppointmentDetail | PatientAppointment) => {
    const encodedPatientId = encodeURIComponent(appointment.patientId);
    const encodedAppointmentId = appointment.appointmentId ? encodeURIComponent(appointment.appointmentId) : '';
    const appointmentParam = encodedAppointmentId ? `&appointmentId=${encodedAppointmentId}` : '';
    navigate(`/patient/new?patientId=${encodedPatientId}${appointmentParam}&tab=inkrx`);
  };

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [activeNavButton, doctorProfileRestricted, profileCompletionPercentage]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1024 && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  }, [windowWidth, isSidebarCollapsed]);

  useEffect(() => {
    if (windowWidth < 768 && isSettingsNavCollapsed) {
      setIsSettingsNavCollapsed(false);
    }
  }, [windowWidth, isSettingsNavCollapsed]);

  const tabBarStickyOffset = 16;
  const computeScale = (width: number) => {
    if (width < 1024) return 1;
    if (width >= 1600) return 1;
    if (width >= 1440) return 0.95;
    if (width >= 1280) return 0.9;
    if (width >= 1024) return 0.87;
    return 1;
  };
  const uiScale = computeScale(windowWidth);
  const shouldApplyScale = uiScale !== 1;
  const scaledStyle = useMemo(
    () => ({
      transform: `scale(${uiScale})`,
      transformOrigin: 'top left',
      width: `${100 / uiScale}%`,
      minHeight: `${100 / uiScale}vh`
    }),
    [uiScale]
  );

  const isMobile = windowWidth < 768;

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col"
      style={shouldApplyScale ? scaledStyle : undefined}
    >
      <div
        className="flex flex-col flex-1 w-full"
        style={{ pointerEvents: isDoctorExperienceLocked ? 'none' : 'auto', opacity: isDoctorExperienceLocked ? 0.5 : 1 }}
      >
        {/* Header Card (Unified Theme & Layout matching IPD, Appointment, and Billing Dashboards) */}
        <div ref={headerRef} className="px-3 sm:px-4 lg:px-6 pt-4 pb-2 shrink-0">
          <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
            {/* Decorative flare */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-5">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                        {t('docBoard.header.title')}
                      </h1>
                      {clampedProfileCompletion < 100 && (
                        <button
                          type="button"
                          onClick={() => navigate('/profile?tab=professional')}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                          title={t('docBoard.header.viewProfessionalProfile')}
                        >
                          <span>{clampedProfileCompletion}% Complete</span>
                        </button>
                      )}
                      {!doctorProfileRestricted && profileCompletionPercentage === 100 && (
                        <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold shadow-sm">
                          <UserCheck className="h-2.5 w-2.5 mr-1" />
                          {t('docBoard.header.verified')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-brand-100 mt-0.5 leading-tight">Practice oversight, calendar and clinical records.</p>
                  </div>
                </div>
              </div>

              {/* Navigation Tab Capsule */}
              <nav className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm">
                {navButtons.map(({ key, label, shortLabel, Icon, requiresProfile, description }) => {
                  const isActive = activeNavButton === key;
                  const locked = requiresProfile && doctorProfileRestricted;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!locked) setActiveNavButton(key);
                      }}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-pressed={isActive}
                      tabIndex={locked ? -1 : 0}
                      title={locked ? (doctorProfileMessage || t('docBoard.nav.lockedMessage')) : description}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 px-1 select-none whitespace-normal flex-1",
                        isActive
                          ? "bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm"
                          : "text-brand-100 hover:bg-white/10 hover:text-white",
                        locked && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <Icon className="h-5 w-5 mb-1 shrink-0" />
                      <span className="text-[9px] font-bold tracking-wide leading-tight hidden sm:inline">{label}</span>
                      <span className="text-[9px] font-bold tracking-wide leading-tight sm:hidden">{shortLabel}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {activeNavButton === 'appointments' && (
          <SubscriptionReadOnlyOverlay featureLabel="Managing appointments" className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            {/* Loading - Mobile Responsive */}
            {isDataLoading && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-4 sm:p-8 text-center shadow-lg">
                <div className="flex flex-col items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-0 w-8 h-8 sm:w-12 sm:h-12 border-4 border-transparent border-t-brand-400 rounded-full animate-spin"
                      style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                    ></div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {doctorProfileLoading ? t('docBoard.loading.doctorProfile') : t('docBoard.loading.appointments')}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('docBoard.loading.helper')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error - Mobile Responsive */}
            {shouldShowError && (
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 sm:p-8 text-center shadow-lg">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center animate-pulse">
                    <X className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-200">
                      {doctorProfileError ? t('docBoard.error.doctorProfile') : t('docBoard.error.appointments')}
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm max-w-md">
                      {!hospitalId || !doctorId
                        ? t('docBoard.error.missingData', {
                          fields: [!hospitalId ? t('docBoard.error.missingHospitalId') : '', !doctorId ? t('docBoard.error.missingDoctorId') : '']
                            .filter(Boolean)
                            .join(' ')
                        })
                        : t('docBoard.error.generic')}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch?.()}
                      className="bg-white hover:bg-red-50 border-red-300 text-red-700 hover:text-red-800 transition-all duration-200 w-full sm:w-auto"
                    >
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t('common.retry')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="bg-white hover:bg-red-50 border-red-300 text-red-700 hover:text-red-800 transition-all duration-200 w-full sm:w-auto"
                    >
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t('docBoard.error.refreshPage')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Restriction Message - Enhanced */}
            {!isDataLoading && !shouldShowError && doctorProfileRestricted && (
              <div className="bg-gradient-to-br from-brand-50 via-brand-50 to-purple-50 dark:from-brand-900/20 dark:via-brand-900/20 dark:to-purple-900/20 border-2 border-brand-200 dark:border-brand-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-200/20 dark:bg-brand-800/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-200/20 dark:bg-brand-800/20 rounded-full blur-2xl -ml-12 -mb-12"></div>

                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    {/* Icon Section */}
                    <div className="flex-shrink-0 mx-auto lg:mx-0">
                      <div className="relative">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
                          <UserCheck className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <span className="text-yellow-900 font-bold text-sm">!</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 text-center lg:text-left">
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-600 to-brand-600 dark:from-brand-400 dark:to-brand-400 bg-clip-text text-transparent">
                            {t('docBoard.restriction.title')}
                          </h3>
                          <p className="text-brand-700 dark:text-brand-300 text-sm sm:text-base mt-2 font-medium">
                            {doctorProfileMessage || t('docBoard.restriction.subtitle')}
                          </p>
                        </div>

                        {/* Required Information List */}
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-brand-100 dark:border-brand-900/50">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                            {t('docBoard.restriction.requiredInfoTitle')}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.license')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.department')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.qualifications')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.experience')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Benefits Section */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{t('docBoard.restriction.benefits.calendar')}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{t('docBoard.restriction.benefits.prescriptions')}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{t('docBoard.restriction.benefits.appointments')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button Section */}
                    <div className="flex-shrink-0 w-full lg:w-auto">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => navigate('/profile?tab=professional')}
                        className="w-full lg:w-auto bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 text-white font-semibold px-6 py-6 sm:py-7 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          <span className="text-base sm:text-lg">{t('docBoard.restriction.completeProfileCta')}</span>
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      </Button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center lg:text-left mt-2">
                        {t('docBoard.restriction.ctaHelper')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {!isDataLoading && !shouldShowError && (
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as 'current' | 'past' | 'future');
                  setSelectedStatus('all'); // ✅ reset status when switching tabs
                  setCurrentPage(1);
                }}
                className="flex flex-col lg:flex-row gap-3 lg:gap-6 items-start"
              >
                <div
                  className={`w-full ${isSidebarCollapsed ? 'lg:w-[4.5rem] xl:w-20' : 'lg:w-64 xl:w-72'} sticky lg:self-start transition-all duration-300 z-50`}
                  style={{ top: `${tabBarStickyOffset}px` }}
                >
                  <div className="bg-white/95 dark:bg-slate-900/95 border border-gray-200/70 dark:border-slate-800 rounded-2xl lg:shadow-sm lg:h-full lg:min-h-[calc(100vh-160px)] flex lg:flex-col backdrop-blur-xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] max-lg:p-1">
                    <div className={`hidden lg:flex p-4 items-center ${isSidebarCollapsed ? 'justify-center lg:flex-col lg:gap-4' : 'justify-between'}`}>
                      {!isSidebarCollapsed && (
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
                          Views
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                        className="inline-flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 p-2 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-300 transition-all hover:shadow-md"
                        aria-label={isSidebarCollapsed ? t('docBoard.tabs.expandSidebar') : t('docBoard.tabs.collapseSidebar')}
                      >
                        {isSidebarCollapsed ? (
                          <Expand className="h-4 w-4" />
                        ) : (
                          <Minimize2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <TooltipProvider delayDuration={0}>
                      <TabsList
                        id="appointment-views-nav"
                        className={`flex flex-row overflow-x-auto lg:flex-col w-full bg-transparent h-auto gap-1 lg:gap-2 p-0 lg:p-3 max-lg:hide-scrollbar`}
                      >
                        {appointmentTabsConfig.map(({ value, label, subLabel, Icon }) => {
                          const isActive = activeTab === value;

                          if (isSidebarCollapsed) {
                            return (
                              <Tooltip key={value}>
                                <TooltipTrigger asChild>
                                  <TabsTrigger
                                    value={value}
                                    disabled={isDoctorExperienceLocked}
                                    className={`relative flex flex-col items-center justify-center w-full gap-1 h-auto py-2 rounded-xl transition-all duration-300 hidden lg:flex ${isActive
                                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                                      } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-[10px] font-semibold leading-tight text-center w-full px-1 break-words">
                                      {label}
                                    </span>
                                  </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="ml-2 font-medium bg-gray-900 text-white border-0">
                                  {label}
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          return (
                            <TabsTrigger
                              key={value}
                              value={value}
                              disabled={isDoctorExperienceLocked}
                              className={`group relative flex flex-1 lg:w-full items-center justify-center lg:justify-start gap-1.5 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-300 border border-transparent whitespace-nowrap ${isActive
                                ? 'bg-white dark:bg-gray-800 shadow-sm border-gray-200/50 dark:border-gray-700 max-lg:bg-gray-100 dark:max-lg:bg-gray-800'
                                : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50 max-lg:text-gray-500'
                                } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className={`p-1.5 lg:p-2 rounded-lg transition-colors hidden lg:block ${isActive ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                              </div>
                              <div className={`block lg:hidden ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'}`}>
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="flex flex-col flex-none lg:flex-1 min-w-0 items-center lg:items-start">
                                <span className={`font-bold text-xs lg:text-sm ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {label}
                                </span>
                                <span className="hidden lg:block text-xs text-gray-400 truncate">
                                  {subLabel}
                                </span>
                              </div>

                              {isActive && (
                                <div className={`hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-lg bg-brand-600`}></div>
                              )}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex-1 w-full min-w-0 lg:pl-4 xl:pl-6">
                  {activeAppointmentTab && (
                    <div className="mb-3">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{activeAppointmentTab.label}</h2>
                      {activeAppointmentTab.subLabel && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activeAppointmentTab.subLabel}</p>
                      )}
                    </div>
                  )}

                  {/* Current - Mobile Responsive */}
                  <TabsContent value="current" className="space-y-4 pt-2">
                    {/* KPI Section for Current Appointments */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Total Appointments */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-brand-100/80 via-white to-white dark:from-brand-950/60 dark:to-gray-900 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-brand-100/80 dark:bg-brand-900/50 rounded-lg text-brand-600 dark:text-brand-400">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-900/60 dark:text-brand-200/60 min-w-0 break-words">Total Today</span>
                        </div>
                        <div className="text-3xl font-bold text-brand-900 dark:text-white">{currentAppointmentCounts.all}</div>
                      </div>

                      {/* Not Entered (Vitals Required) */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-orange-100/80 via-white to-white dark:from-orange-950/60 dark:to-gray-900 p-4 rounded-2xl border border-orange-100/50 dark:border-orange-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-orange-100/80 dark:bg-orange-900/50 rounded-lg text-orange-600 dark:text-orange-400">
                            <Clock className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-orange-900/60 dark:text-orange-200/60 min-w-0 break-words">Vitals Required</span>
                        </div>
                        <div className="text-3xl font-bold text-orange-900 dark:text-white">{currentAppointmentCounts.vitalsRequired}</div>
                      </div>

                      {/* Completed */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100/80 via-white to-white dark:from-emerald-950/60 dark:to-gray-900 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-emerald-100/80 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/60 dark:text-emerald-200/60 min-w-0 break-words">Completed</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-900 dark:text-white">{currentAppointmentCounts.completed}</div>
                      </div>

                      {/* Cancelled */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-red-100/80 via-white to-white dark:from-red-950/60 dark:to-gray-900 p-4 rounded-2xl border border-red-100/50 dark:border-red-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-red-100/80 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400">
                            <UserX className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-red-900/60 dark:text-red-200/60 min-w-0 break-words">Cancelled</span>
                        </div>
                        <div className="text-3xl font-bold text-red-900 dark:text-white">{currentAppointmentCounts.cancelled}</div>
                      </div>
                    </div>

                    {/* Status Filters & Sync Controls */}
                    <div className="mb-2 sm:mb-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1">
                          <Button
                            variant={selectedStatus === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('all')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'all'
                              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <CircleCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.all', { count: currentAppointmentCounts.all })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'VITALS_REQUIRED' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('VITALS_REQUIRED')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'VITALS_REQUIRED'
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.vitalsRequired', { count: currentAppointmentCounts.vitalsRequired })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'READY' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('READY')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'READY'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                              : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.ready', { count: currentAppointmentCounts.ready })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'UNDER_CONSULT' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('UNDER_CONSULT')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'UNDER_CONSULT'
                              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg'
                              : 'bg-brand-50 text-brand-700 border-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.consulting', { count: currentAppointmentCounts.underConsult })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'LAB_REQUIRED' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('LAB_REQUIRED')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'LAB_REQUIRED'
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                              : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <FlaskConical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.labRequired', { count: currentAppointmentCounts.labRequired })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'AWAITING_RECONSULT' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('AWAITING_RECONSULT')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'AWAITING_RECONSULT'
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.reconsult', { count: currentAppointmentCounts.awaitingReconsult })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'COMPLETED' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('COMPLETED')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'COMPLETED'
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.completed', { count: currentAppointmentCounts.completed })}</span>
                            </div>
                          </Button>

                          <Button
                            variant={selectedStatus === 'CANCELLED' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('CANCELLED')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 rounded-full ${selectedStatus === 'CANCELLED'
                              ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                              : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20'
                              }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>{t('docBoard.filters.cancelled', { count: currentAppointmentCounts.cancelled })}</span>
                            </div>
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            {t('docBoard.sync.lastSynced')}{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            className="h-8 gap-1.5 border-gray-200 dark:border-gray-700 font-medium"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Refresh</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Search - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-1">
                        <div className="relative group">
                          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4 group-focus-within:text-brand-500 transition-colors duration-200" />
                          <Input
                            placeholder={t('docBoard.search.currentPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {currentAppointments.length > 0 ? (
                        currentAppointments.map((appointment) => {
                          // Determine the primary action based on status (similar to desktop table logic)
                          let primaryActionLabel = '';
                          let onPrimaryActionClick: ((app: PatientAppointment) => void) | undefined = undefined;

                          if (['READY', 'AWAITING_RECONSULT'].includes(appointment.finalStatusCode)) {
                            primaryActionLabel = 'Start Consult';
                            onPrimaryActionClick = handlePatientIdClick;
                          } else if (appointment.finalStatusCode === 'UNDER_CONSULT') {
                            primaryActionLabel = 'Complete Consult';
                            onPrimaryActionClick = handleMarkDoneClick;
                          } else if (appointment.finalStatusCode === 'VITALS_REQUIRED') {
                            primaryActionLabel = 'Start Consult';
                            onPrimaryActionClick = handlePatientIdClick;
                          }

                          return (
                            <MobileAppointmentCard
                              key={appointment.appointmentId}
                              appointment={appointment}
                              hospitalId={hospitalId || null}
                              doctorId={doctorId || null}
                              referral={referralsByPatient[appointment.patientId]}
                              getStatusBadge={getStatusBadge}
                              onPatientIdClick={handlePatientIdClick}
                              onOpenLabAttachments={handleOpenLabAttachments}
                              onAddBillClick={handleAddBillClick}
                              onRescheduleClick={handleRescheduleClick}
                              onCancelClick={handleCancelClick}
                              onPrintClick={openPrescriptionPreview}
                              primaryActionLabel={primaryActionLabel}
                              onPrimaryActionClick={onPrimaryActionClick}
                              onInkRx={handleInkRxClick}
                            />
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 p-6 text-center text-gray-500 dark:text-gray-400">
                          {t('docBoard.empty.current')}
                        </div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block space-y-3">
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-100/50 dark:shadow-black/20 overflow-hidden backdrop-blur-sm">
                        {/* Table Header/Toolbar - Optional */}


                        <div className="overflow-x-auto w-full">
                          <Table className="w-full text-sm">
                            <TableHeader>
                              <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                                <TableHead className="w-[180px] font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 pl-8">
                                  {t('docBoard.table.patient')}
                                </TableHead>
                                <TableHead className="hidden xl:table-cell font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">
                                  {t('docBoard.table.patientName')}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">
                                  {t('docBoard.table.token')}
                                </TableHead>
                                <TableHead className="hidden md:table-cell font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">
                                  {t('docBoard.table.appointmentTime')}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">
                                  {t('docBoard.table.status')}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 text-center">
                                  {t('docBoard.table.labReports', { defaultValue: 'Lab reports' })}
                                </TableHead>

                                <TableHead className="hidden lg:table-cell font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">
                                  {t('docBoard.table.case')}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 text-center">
                                  {t('docBoard.table.actions')}
                                </TableHead>
                                <TableHead className="hidden lg:table-cell font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 text-center">
                                  {t('docBoard.table.printRx')}
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAppointments.length > 0 ? (
                                currentAppointments.map((appointment) => (
                                  <TableRow
                                    key={appointment.appointmentId}
                                    className="group border-b border-gray-100 dark:border-gray-800 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-all duration-200"
                                  >
                                    <TableCell className="py-4 pl-6 align-middle font-medium">
                                      <button
                                        onClick={() => handlePatientIdClick(appointment)}
                                        className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 transition-colors group-hover:underline decoration-brand-300 underline-offset-4"
                                      >
                                        {appointment.patientId}
                                        <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="hidden xl:table-cell py-4 align-middle text-sm text-gray-700 dark:text-gray-300">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName?.split('-')[0].trim()}</span>
                                        {appointment.patientFullName?.includes('-') && (
                                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block leading-tight">
                                            {appointment.patientFullName.split('-').slice(1).join('-').trim()}
                                          </span>
                                        )}
                                        {appointment.phone && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{appointment.phone}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-middle">
                                      <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 text-xs font-bold border border-gray-200 dark:border-gray-700">
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">#</span>
                                        <span>{appointment.tokenDetails?.tokenNumber || '-'}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-4 align-middle">
                                      <div className="flex flex-col">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums tracking-tight">
                                          {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                          {format(new Date(appointment.startAt), 'EEE, MMM dd')}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-middle">
                                      <div className="transform transition-transform duration-200 hover:scale-105 origin-left flex flex-col gap-1 items-start">
                                        {getStatusBadge(appointment.finalStatusCode)}
                                        <AdmissionStatusBadge referral={referralsByPatient[appointment.patientId]} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-middle text-center">
                                      {['LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(
                                        String(appointment.finalStatusCode || '').toUpperCase()
                                      ) ? (
                                        <TooltipProvider>
                                          <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenLabAttachments(appointment)}
                                                className="h-8 w-8 rounded-full text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                              >
                                                <FlaskConical className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Add Lab Report</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-700 text-xl font-light">·</span>
                                      )}
                                    </TableCell>

                                    <TableCell className="hidden lg:table-cell py-4 align-middle">
                                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                        {(!appointment.appointmentType || appointment.appointmentType === 'New' || appointment.appointmentType === 'New/Fee' || appointment.appointmentType === 'New / Fee') ? t('docBoard.table.newCase', { defaultValue: 'New' }) : appointment.appointmentType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 align-middle text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 rounded-lg transition-colors mr-1"
                                        onClick={() => handleInkRxClick(appointment)}
                                        title="InkRx — handwritten prescription"
                                      >
                                        <PenLine className="h-4 w-4" />
                                      </Button>
                                      <AdviseAdmissionSheet
                                        hospitalId={hospitalId || ''}
                                        doctorId={doctorId || ''}
                                        patientId={appointment.patientId}
                                        appointmentId={appointment.appointmentId}
                                        trigger={
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 rounded-lg transition-colors mr-1"
                                            title="Advise Admission"
                                          >
                                            <BedDouble className="h-4 w-4" />
                                          </Button>
                                        }
                                      />
                                      {!['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode) && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 rounded-lg transition-colors mr-1"
                                            onClick={() => handleMarkDoneClick(appointment)}
                                            title={t('docBoard.markDoneDialog.title', { defaultValue: 'Mark Done' })}
                                          >
                                            <CircleCheck className="h-4 w-4" />
                                          </Button>
                                          {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT'].includes(appointment.finalStatusCode) && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 rounded-lg transition-colors mr-1"
                                                onClick={() => handleRescheduleClick(appointment)}
                                                title={t('common.reschedule', { defaultValue: 'Reschedule' })}
                                              >
                                                <Calendar className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                onClick={() => handleCancelClick(appointment)}
                                              >
                                                <span className="sr-only">{t('common.cancel')}</span>
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </>
                                          )}
                                        </>
                                      )
                                      }
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell py-4 align-middle text-center">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:bg-brand-900/20"
                                        disabled={!hospitalId || !doctorId}
                                        onClick={() => openPrescriptionPreview(appointment)}
                                      >
                                        <PrinterIcon className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={10} className="h-96 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-4">
                                        <Calendar className="h-12 w-12 opacity-50" />
                                      </div>
                                      <p className="text-lg font-medium text-gray-900 dark:text-gray-200">{t('docBoard.empty.current')}</p>
                                      <p className="text-sm max-w-xs mx-auto mt-1">No appointments found matching your filters.</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center mt-4 pb-2">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(currentPage - 1)}
                              className={currentPage === 1 || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {renderPaginationItems()}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handlePageChange(currentPage + 1)}
                              className={currentPage === totalPages || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>

                    {/* Past - Mobile Responsive */}
                  </TabsContent>

                  <TabsContent value="past" className="space-y-4 pt-2">
                    <div className="space-y-4">
                      {/* KPI Section for Past History */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Appointments */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-100/80 via-white to-white dark:from-brand-950/60 dark:to-gray-900 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-100/80 dark:bg-brand-900/50 rounded-lg text-brand-600 dark:text-brand-400">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-900/60 dark:text-brand-200/60 min-w-0 break-words">Total</span>
                          </div>
                          <div className="text-3xl font-bold text-brand-900 dark:text-white">{pastAppointmentsSummary.total}</div>
                        </div>

                        {/* No Show (Vitals Required) */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-rose-100/80 via-white to-white dark:from-rose-950/60 dark:to-gray-900 p-4 rounded-2xl border border-rose-100/50 dark:border-rose-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-rose-100/80 dark:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400">
                              <UserX className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-900/60 dark:text-rose-200/60 min-w-0 break-words">No Show</span>
                          </div>
                          <div className="text-3xl font-bold text-rose-900 dark:text-white">{pastAppointmentsSummary.noShow}</div>
                        </div>

                        {/* Completed */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100/80 via-white to-white dark:from-emerald-950/60 dark:to-gray-900 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100/80 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                              <UserCheck className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/60 dark:text-emerald-200/60 min-w-0 break-words">Completed</span>
                          </div>
                          <div className="text-3xl font-bold text-emerald-900 dark:text-white">{pastAppointmentsSummary.completed}</div>
                        </div>

                        {/* Ready (Stats) */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-100/80 via-white to-white dark:from-brand-950/60 dark:to-gray-900 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-100/80 dark:bg-brand-900/50 rounded-lg text-brand-600 dark:text-brand-400">
                              <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-900/60 dark:text-brand-200/60 min-w-0 break-words">Ready Status</span>
                          </div>
                          <div className="text-3xl font-bold text-brand-900 dark:text-white">{pastAppointmentsSummary.ready}</div>
                        </div>
                      </div>

                      {/* Search & Filter Card */}
                      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 p-3 md:p-4 shadow-sm">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="relative group flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder={t('docBoard.search.pastPlaceholder')}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                            />
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                            <span>{t('docBoard.date.from')}</span>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => handleStartDateChange(e.target.value)}
                              className="h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                              max={endDate || pastDateUpperBound}
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                            <span>{t('docBoard.date.to')}</span>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => handleEndDateChange(e.target.value)}
                              className="h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                              min={startDate || undefined}
                              max={pastDateUpperBound}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mobile Card View - Past */}
                      <div className="md:hidden space-y-3">
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <MobileAppointmentCard
                              key={appointment.appointmentId}
                              appointment={appointment}
                              hospitalId={hospitalId || null}
                              doctorId={doctorId || null}
                              referral={referralsByPatient[appointment.patientId]}
                              getStatusBadge={getStatusBadge}
                              onPatientIdClick={handlePatientIdClick}
                              onOpenLabAttachments={handleOpenLabAttachments}
                              onAddBillClick={handleAddBillClick}
                              onRescheduleClick={handleRescheduleClick}
                              onCancelClick={handleCancelClick}
                              onPrintClick={openPrescriptionPreview}
                              onInkRx={handleInkRxClick}
                            />
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 p-6 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-3">
                              <Calendar className="h-6 w-6 opacity-40" />
                              <span className="text-sm font-medium">{t('docBoard.empty.past')}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-100/50 dark:shadow-black/20 overflow-hidden backdrop-blur-sm">
                        {/* Header Toolbar */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/50">
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                              <ListChecks className="h-4 w-4" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {t('docBoard.tabs.pastHistory', { defaultValue: 'Past Visits History' })}
                            </h3>
                          </div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                            {totalPages > 1
                              ? `${t('common.page')} ${currentPage} ${t('common.of')} ${totalPages}`
                              : `${filteredAppointments.length} records`
                            }
                          </p>
                        </div>

                        <div className="overflow-x-auto w-full">
                          <Table className="w-full text-sm">
                            <TableHeader>
                              <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                                <TableHead className="w-[140px] font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 pl-8">{t('docBoard.table.patientId')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.patientName')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.token')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.lastVisit')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.status')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.case')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.printRx')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5">{t('docBoard.table.followUp')}</TableHead>
                                <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider py-5 text-center">{t('docBoard.table.completed')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAppointments.length > 0 ? (
                                currentAppointments.map((appointment) => (
                                  <TableRow
                                    key={appointment.appointmentId}
                                    className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border-b border-gray-100 dark:border-gray-800 last:border-0"
                                  >
                                    <TableCell className="font-medium py-4 pl-6">
                                      <button
                                        onClick={() => handlePatientIdClick(appointment)}
                                        className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 font-semibold transition-colors"
                                      >
                                        {appointment.patientId}
                                        <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName?.split('-')[0].trim()}</span>
                                        {appointment.patientFullName?.includes('-') && (
                                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block leading-tight">
                                            {appointment.patientFullName.split('-').slice(1).join('-').trim()}
                                          </span>
                                        )}
                                        {appointment.phone && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{appointment.phone}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                        {appointment.tokenDetails?.tokenNumber || 'N/A'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="space-y-0.5">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm block">
                                          {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 block">
                                          {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-col gap-1 items-start">
                                        {getStatusBadge(appointment.finalStatusCode)}
                                        <AdmissionStatusBadge referral={referralsByPatient[appointment.patientId]} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="text-xs bg-brand-50 text-brand-700 border-brand-200 font-medium">
                                        {appointment.appointmentType || t('docBoard.table.newCase')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 text-xs text-gray-600 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                        disabled={!hospitalId || !doctorId}
                                        onClick={() => openPrescriptionPreview(appointment)}
                                      >
                                        <PrinterIcon className="h-3.5 w-3.5 mr-1.5" />
                                        {t('common.print')}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t('docBoard.table.notApplicable')}</span>
                                    </TableCell>
                                    <TableCell className="py-4 text-center">
                                      {appointment.finalStatusCode === 'COMPLETED' ? (
                                        <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                          <Check className="h-4 w-4" />
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full">
                                          <X className="h-4 w-4" />
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={9} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-full">
                                        <Calendar className="h-8 w-8 opacity-50" />
                                      </div>
                                      <span className="text-sm font-medium">{t('docBoard.empty.past')}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="flex justify-center mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => handlePageChange(currentPage - 1)}
                                className={currentPage === 1 || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            {renderPaginationItems()}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => handlePageChange(currentPage + 1)}
                                className={currentPage === totalPages || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Future - Mobile Responsive */}
                  <TabsContent value="future" className="space-y-4 pt-2">
                    <div className="space-y-4">
                      {/* KPI Section for Future Appointments */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Appointments */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-brand-100/80 via-white to-white dark:from-brand-950/60 dark:to-gray-900 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-100/80 dark:bg-brand-900/50 rounded-lg text-brand-600 dark:text-brand-400">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-900/60 dark:text-brand-200/60 min-w-0 break-words">Total Upcoming</span>
                          </div>
                          <div className="text-3xl font-bold text-brand-900 dark:text-white">{futureAppointmentsSummary.total}</div>
                        </div>
                      </div>

                      {/* Search & Filter Card */}
                      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 p-3 md:p-4 shadow-sm">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="relative group flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder={t('docBoard.search.futurePlaceholder', { defaultValue: 'Search future appointments...' })}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                            />
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                            <span>{t('docBoard.date.from')}</span>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => handleStartDateChange(e.target.value)}
                              className="h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                              min={futureDateLowerBound}
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                            <span>{t('docBoard.date.to')}</span>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => handleEndDateChange(e.target.value)}
                              className="h-9 text-sm bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                              min={startDate || futureDateLowerBound}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mobile Card View - Future */}
                      <div className="md:hidden space-y-3">
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <MobileAppointmentCard
                              key={appointment.appointmentId}
                              appointment={appointment}
                              hospitalId={hospitalId || null}
                              doctorId={doctorId || null}
                              referral={referralsByPatient[appointment.patientId]}
                              getStatusBadge={getStatusBadge}
                              onPatientIdClick={handlePatientIdClick}
                              onOpenLabAttachments={handleOpenLabAttachments}
                              onAddBillClick={handleAddBillClick}
                              onRescheduleClick={handleRescheduleClick}
                              onCancelClick={handleCancelClick}
                              onPrintClick={openPrescriptionPreview}
                              onInkRx={handleInkRxClick}
                            />
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 p-6 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-3">
                              <Calendar className="h-6 w-6 opacity-40" />
                              <span className="text-sm font-medium">{t('docBoard.empty.future')}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-100/50 dark:shadow-black/20 overflow-hidden backdrop-blur-sm">
                        {/* Header Toolbar */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/50">
                          <div className="flex items-center gap-2">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                              <CalendarDays className="h-4 w-4" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {t('docBoard.tabs.futureUpcoming', { defaultValue: 'Upcoming Appointments' })}
                            </h3>
                          </div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                            {totalPages > 1
                              ? `${t('common.page')} ${currentPage} ${t('common.of')} ${totalPages}`
                              : `${filteredAppointments.length} records`
                            }
                          </p>
                        </div>

                        <div className="overflow-x-auto w-full">
                          <Table className="w-full text-sm">
                            <TableHeader>
                              <TableRow className="bg-gray-50/80 dark:bg-gray-900/80 hover:bg-gray-50/80 dark:hover:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
                                <TableHead className="w-[140px] font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4 pl-6">{t('docBoard.table.patientId')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.patientName')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.token')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.time')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.status')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.case')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4">{t('docBoard.table.actions')}</TableHead>
                                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider py-4 text-center">{t('docBoard.table.printRx')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAppointments.length > 0 ? (
                                currentAppointments.map((appointment) => (
                                  <TableRow
                                    key={appointment.appointmentId}
                                    className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                                  >
                                    <TableCell className="font-medium py-4 pl-6">
                                      <button
                                        onClick={() => handlePatientIdClick(appointment)}
                                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1.5 font-semibold transition-colors"
                                      >
                                        {appointment.patientId}
                                        <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName?.split('-')[0].trim()}</span>
                                        {appointment.patientFullName?.includes('-') && (
                                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block leading-tight">
                                            {appointment.patientFullName.split('-').slice(1).join('-').trim()}
                                          </span>
                                        )}
                                        {appointment.phone && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{appointment.phone}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                        {appointment.tokenDetails?.tokenNumber || 'N/A'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="space-y-0.5">
                                        <span className="font-medium text-gray-700 dark:text-white text-sm block">
                                          {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 block">
                                          {format(new Date(appointment.startAt), 'MMM dd')}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-col gap-1 items-start">
                                        {getStatusBadge(appointment.finalStatusCode)}
                                        <AdmissionStatusBadge referral={referralsByPatient[appointment.patientId]} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                                        {appointment.appointmentType || t('docBoard.table.newCase')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-wrap gap-2">
                                        <AdviseAdmissionSheet
                                          hospitalId={hospitalId || ''}
                                          doctorId={doctorId || ''}
                                          patientId={appointment.patientId}
                                          appointmentId={appointment.appointmentId}
                                          trigger={
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 mr-1"
                                            >
                                              <BedDouble className="h-3.5 w-3.5 mr-1" />
                                              Advise Admission
                                            </Button>
                                          }
                                        />

                                        {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                          appointment.finalStatusCode
                                        ) && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 mr-1"
                                                onClick={() => handleRescheduleClick(appointment)}
                                              >
                                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                                {t('common.reschedule', { defaultValue: 'Reschedule' })}
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => handleCancelClick(appointment)}
                                              >
                                                <X className="h-3.5 w-3.5 mr-1" />
                                                {t('common.cancel')}
                                              </Button>
                                            </>
                                          )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 text-xs text-gray-600 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 mx-auto"
                                        disabled={!hospitalId || !doctorId}
                                        onClick={() => openPrescriptionPreview(appointment)}
                                      >
                                        <PrinterIcon className="h-3.5 w-3.5" />
                                        <span className="sr-only">{t('common.print')}</span>
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-full">
                                        <CalendarDays className="h-8 w-8 opacity-50" />
                                      </div>
                                      <span className="text-sm font-medium">{t('docBoard.empty.future')}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="flex justify-center mt-4">
                        {/* Use same Pagination as above */}
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => handlePageChange(currentPage - 1)}
                                className={currentPage === 1 || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            {renderPaginationItems()}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => handlePageChange(currentPage + 1)}
                                className={currentPage === totalPages || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </SubscriptionReadOnlyOverlay>
        )}

        {/* Doctor Calendar - embedded in DocBoard */}
        {activeNavButton === 'calendar' && (
          <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            <Suspense fallback={<div className="p-6 text-center">{t('docBoard.calendar.loading')}</div>}>
              <DoctorCalendar />
            </Suspense>
          </div>
        )}

        {/* Analytics Page */}
        {activeNavButton === 'analytics' && (
          <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            <Suspense fallback={<div className="p-6 text-center">{t('common.loading')}</div>}>
              <DoctorAnalyticsPage />
            </Suspense>
          </div>
        )}

        {/* Prescription Settings */}
        {activeNavButton === 'settings' && (
          <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            <div className="p-2 sm:p-4">
              <Tabs
                value={settingsTab}
                onValueChange={(value) => handleSettingsTabChange(value as 'fields' | 'personalized' | 'layout')}
                className="flex flex-col md:flex-row gap-4"
              >
                <div
                  className={`w-full ${isSettingsNavCollapsed ? 'md:w-16 lg:w-20' : 'md:w-60 lg:w-64'} sticky md:self-start transition-all duration-300 z-40`}
                  style={{ top: `${tabBarStickyOffset}px` }}
                >
                  <div className={`border border-gray-200/70 dark:border-slate-800 rounded-2xl md:shadow-sm md:h-full md:min-h-[460px] flex md:flex-col shadow-[0_4px_20px_rgb(0,0,0,0.08)] max-md:p-1 ${!isLowBandwidthMode ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl' : 'bg-white dark:bg-slate-900'}`}>
                    <div className="hidden md:flex items-center justify-end mb-10 p-2">
                      <button
                        type="button"
                        onClick={() => setIsSettingsNavCollapsed((prev) => !prev)}
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 p-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 hover:border-brand-200 dark:hover:text-brand-300 transition-colors"
                        aria-pressed={isSettingsNavCollapsed}
                        aria-expanded={!isSettingsNavCollapsed}
                        aria-label={isSettingsNavCollapsed ? t('docBoard.tabs.expandSidebar') : t('docBoard.tabs.collapseSidebar')}
                      >
                        {isSettingsNavCollapsed ? <Expand className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                        <span className="sr-only">{isSettingsNavCollapsed ? t('docBoard.tabs.expandSidebar') : t('docBoard.tabs.collapseSidebar')}</span>
                      </button>
                    </div>

                    <TooltipProvider delayDuration={150}>
                      <TabsList
                        className={`flex flex-row overflow-x-auto md:flex-col w-full bg-transparent h-auto gap-1 md:gap-3 p-0 md:p-2 max-md:hide-scrollbar`}
                      >
                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="fields"
                                className={`relative flex items-center justify-center w-full h-10 rounded-xl transition-all duration-300 hidden md:flex data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-50 dark:hover:bg-green-900/20`}
                              >
                                <Settings className="h-5 w-5" />
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2 font-medium bg-gray-900 text-white border-0">{t('docBoard.settings.fields')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="fields"
                            className="flex-1 md:flex-none w-auto md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-2 px-3 py-2 text-sm md:text-sm data-[state=active]:bg-white md:data-[state=active]:bg-green-600 data-[state=active]:text-green-700 md:data-[state=active]:text-white data-[state=active]:shadow-sm md:data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-100/50 md:hover:bg-green-50 md:dark:hover:bg-green-900/20 overflow-hidden rounded-xl border border-transparent md:data-[state=active]:border-transparent data-[state=active]:border-gray-200/50"
                          >
                            <Settings className="h-4 w-4 flex-shrink-0" />
                            <span className="font-bold md:font-medium truncate block w-auto md:w-full text-center md:text-left">{isMobile ? 'Fields' : t('docBoard.settings.fields')}</span>
                          </TabsTrigger>
                        ))}

                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="personalized"
                                className={`relative flex items-center justify-center w-full h-10 rounded-xl transition-all duration-300 hidden md:flex data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                              >
                                <Database className="h-5 w-5" />
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2 font-medium bg-gray-900 text-white border-0">{t('docBoard.settings.personalData')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="personalized"
                            className="flex-1 md:flex-none w-auto md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-2 px-3 py-2 text-sm md:text-sm data-[state=active]:bg-white md:data-[state=active]:bg-purple-600 data-[state=active]:text-purple-700 md:data-[state=active]:text-white data-[state=active]:shadow-sm md:data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-100/50 md:hover:bg-purple-50 md:dark:hover:bg-purple-900/20 overflow-hidden rounded-xl border border-transparent md:data-[state=active]:border-transparent data-[state=active]:border-gray-200/50"
                          >
                            <Database className="h-4 w-4 flex-shrink-0" />
                            <span className="font-bold md:font-medium truncate block w-auto md:w-full text-center md:text-left">{isMobile ? 'Library' : t('docBoard.settings.personalData')}</span>
                          </TabsTrigger>
                        ))}

                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="layout"
                                onClick={handleLayoutTabClick}
                                className={`relative flex items-center justify-center w-full h-10 rounded-xl transition-all duration-300 hidden md:flex data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-brand-50 dark:hover:bg-brand-900/20`}
                              >
                                <LayoutDashboard className="h-5 w-5" />
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2 font-medium bg-gray-900 text-white border-0">{t('docBoard.settings.layoutLab')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="layout"
                            onClick={handleLayoutTabClick}
                            className="flex-1 md:flex-none w-auto md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-2 px-3 py-2 text-sm md:text-sm data-[state=active]:bg-white md:data-[state=active]:bg-brand-600 data-[state=active]:text-brand-700 md:data-[state=active]:text-white data-[state=active]:shadow-sm md:data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-100/50 md:hover:bg-brand-50 md:dark:hover:bg-brand-900/20 overflow-hidden rounded-xl border border-transparent md:data-[state=active]:border-transparent data-[state=active]:border-gray-200/50"
                          >
                            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                            <span className="font-bold md:font-medium truncate block w-auto md:w-full text-center md:text-left">{isMobile ? 'Layout' : t('docBoard.settings.layoutLab')}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </TooltipProvider>
                  </div>
                </div>

                <div className={`flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col overflow-hidden ${!isLowBandwidthMode ? 'backdrop-blur-md bg-white/95 dark:bg-gray-900/95' : ''}`}>
                  <TabsContent value="fields" className="m-0 flex-1 flex flex-col">
                    <PrescriptionCustomizePanel key="fields-panel" showCloseButton={false} defaultTab="fields" />
                  </TabsContent>
                  <TabsContent value="personalized" className="m-0 flex-1 min-w-0 flex flex-col">
                    <PrescriptionCustomizePanel key="personalized-panel" showCloseButton={false} defaultTab="personalized" />
                  </TabsContent>
                  <TabsContent value="layout" className="m-0 flex-1 min-w-0 flex flex-col p-2 sm:p-4 overflow-x-hidden">
                    <PrescriptionLayout refreshToken={layoutRefreshToken} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}

      </div>

      <AttachmentsSection
        open={labAttachmentModal.open}
        onOpenChange={(open) => setLabAttachmentModal((prev) => ({ ...prev, open }))}
        trigger={null}
        attachments={labAttachments[labAttachmentModal.patientId || ''] || []}
        onChange={handleLabAttachmentsChange}
        patientId={labAttachmentModal.patientId}
        patientName={labAttachmentModal.patientName}
        appointmentId={labAttachmentModal.appointmentId}
        doctorId={doctorId}
      />

      <PrescriptionPreviewModal
        open={previewModalOpen}
        onOpenChange={handlePreviewModalChange}
        request={previewRequest}
        onNavigateToSettings={() => {
          setPreviewModalOpen(false);
          setActiveNavButton('settings');
          setSettingsTab('layout');
          // Update URL for consistency and bookmarking, using replace to avoid history stack buildup if desired
          navigate('/dashboard?tab=settings&subtab=layout');
        }}
        title={t('docBoard.preview.title')}
        description={t('docBoard.preview.description')}
      />

      {/* Add Bill Modal */}
      <Dialog open={showAddBillModal} onOpenChange={handleAddBillModalChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('docBoard.table.addBill', { defaultValue: 'Add Bill' })}</DialogTitle>
            <DialogDescription>
              {t('docBoard.addBill.description', {
                defaultValue: 'Review the appointment details and proceed to billing.',
              })}
            </DialogDescription>
          </DialogHeader>

          {appointmentForBilling && (
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('docBoard.table.patientName')}</span>
                <span className="text-right">{appointmentForBilling.patientFullName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('docBoard.table.patient')}</span>
                <span className="text-right font-mono">{appointmentForBilling.patientId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('docBoard.table.doctorName', { defaultValue: 'Doctor' })}</span>
                <span className="text-right">{appointmentForBilling.doctorName || t('docBoard.table.notAvailable')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('docBoard.table.appointmentTime')}</span>
                <span className="text-right">{format(new Date(appointmentForBilling.startAt), 'PPpp')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('docBoard.table.token')}</span>
                <span className="text-right font-mono">{appointmentForBilling.tokenDetails?.tokenNumber || t('docBoard.table.notAvailable')}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleAddBillModalChange(false)}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
            <Button onClick={() => handleAddBillModalChange(false)} className="bg-brand-600 text-white hover:bg-brand-700">
              {t('common.continue', { defaultValue: 'Proceed' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={markDoneDialogOpen} onOpenChange={setMarkDoneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('docBoard.markDoneDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('docBoard.markDoneDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkingDone}>{t('docBoard.markDoneDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmMarkDone(); }} disabled={isMarkingDone} className="bg-green-600 hover:bg-green-700">
              {isMarkingDone ? t('docBoard.markDoneDialog.marking') : t('docBoard.markDoneDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('docBoard.cancelDialog.title')}</DialogTitle>
            <DialogDescription>{t('docBoard.cancelDialog.description')}</DialogDescription>
          </DialogHeader>
          {appointmentToCancel && (
            <div className="py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{t('docBoard.cancelDialog.patient')}:</span> {appointmentToCancel.patientFullName}
                  </div>
                  <div>
                    <span className="font-medium">{t('docBoard.cancelDialog.patientId')}:</span> {appointmentToCancel.patientId}
                  </div>
                  <div>
                    <span className="font-medium">{t('docBoard.cancelDialog.doctor')}:</span> {doctorDisplayName}
                  </div>
                  <div>
                    <span className="font-medium">{t('docBoard.cancelDialog.appointmentId')}:</span> {appointmentToCancel.appointmentId}
                  </div>
                </div>
              </div>

              {['VITALS_REQUIRED', 'READY'].includes(appointmentToCancel.finalStatusCode) && (
                <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                  This patient has already checked in today.
                </div>
              )}

              <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3 text-xs text-gray-500 dark:text-gray-400">
                If a payment was already collected for this appointment, it will be automatically refunded. If this visit has a pending admission referral, it won't be cancelled automatically — check the Referred Admissions board.
              </div>

              <div className="mt-3">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason (optional)</label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why is this appointment being cancelled?"
                  rows={2}
                  className="mt-1 text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelDialogClose} disabled={isCancelling}>
              {t('docBoard.cancelDialog.keepAppointment')}
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={isCancelling}>
              {isCancelling ? t('docBoard.cancelDialog.cancelling') : t('docBoard.cancelDialog.confirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {appointmentToReschedule && (
        <RescheduleDialog
          appointment={appointmentToReschedule}
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          onSuccess={handleRescheduleSuccess}
          disablePastAndToday={true}
          hideDoctorName={true}
        />
      )}
    </div>
  );
};

