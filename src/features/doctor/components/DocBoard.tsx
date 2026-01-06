import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Plus,
  RefreshCw,
  Scan,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  SunMedium,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  X,
  ZoomIn
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AttachmentsSection from '@/features/patient/components/AttachmentsSection';
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

// Lazy-load the calendar page so it only loads when the doctor opens it from the dashboard
const DoctorCalendar = lazy(() => import('@/features/doctor-calendar/DoctorCalendarPage').then(module => ({ default: module.DoctorCalendarPage })));
const DoctorAnalyticsPage = lazy(() => import('./DoctorAnalyticsPage').then(module => ({ default: module.DoctorAnalyticsPage })));

interface PatientAppointment {
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
  | 'CANCELLED';
  appointmentType: string | null;
  phone?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const { t } = useTranslation();
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
  const [appointmentToCancel, setAppointmentToCancel] = useState<PatientAppointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsNavCollapsed, setIsSettingsNavCollapsed] = useState(false);

  // Live update states
  const [isLiveUpdateEnabled, setIsLiveUpdateEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

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
        return { startDate: startDate || yesterday, endDate: endDate || today };
      case 'future':
        return { startDate: startDate || tomorrow, endDate: endDate || tomorrow };
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

  // Loading + Error state combine
  const isDataLoading = doctorProfileLoading || appointmentLoading;

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

  // Live update effect
  useEffect(() => {
    if (!isLiveUpdateEnabled || activeTab !== 'current' || !refetch || !hospitalId || !doctorId) return;

    const interval = setInterval(async () => {
      if (connectionStatus === 'online') {
        setIsRefreshing(true);
        try {
          await refetch();
          setLastUpdateTime(new Date());
        } catch (error) {
          console.error('Live update failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLiveUpdateEnabled, activeTab, refetch, hospitalId, doctorId, connectionStatus]);

  // Connection status listeners
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      if (refetch && hospitalId && doctorId) refetch();
    };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch, hospitalId, doctorId]);

  const pastDateUpperBound = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const futureDateLowerBound = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Default date ranges for past/future tabs
  useEffect(() => {
    if (activeTab === 'past') {
      setStartDate(pastDateUpperBound);
      setEndDate(pastDateUpperBound);
    } else if (activeTab === 'future') {
      setStartDate(futureDateLowerBound);
      setEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [activeTab, pastDateUpperBound, futureDateLowerBound]);

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
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5 font-medium">{t('docBoard.statusBadge.consulting')}</Badge>;
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
        accent: 'from-blue-500 via-indigo-500 to-purple-500',
        iconColor: 'text-blue-500 dark:text-blue-300',
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
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    try {
      await appointmentApi.cancelAppointment({
        appointmentId: appointmentToCancel.appointmentId,
        patientId: appointmentToCancel.patientId
      });

      // Close dialog + refresh immediately (more reliable than invalidating a guessed key)
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
      await refetch?.();
      console.log('Appointment cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
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

  // Manual refresh
  const handleManualRefresh = async () => {
    if (refetch && hospitalId && doctorId) {
      setIsRefreshing(true);
      try {
        await refetch();
        setLastUpdateTime(new Date());
      } catch (error) {
        console.error('Manual refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
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
        {/* Header - Matches AdminDashboard */}
        <div ref={headerRef} className="px-3 sm:px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-br from-white via-blue-50/60 to-indigo-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900 border-b border-white/70 dark:border-slate-800 rounded-2xl shadow-lg shadow-blue-100/30 dark:shadow-black/30 px-3 py-3 sm:px-6 sm:py-4">

            {/* Left: Title and Profile Stats */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {t('docBoard.header.title')}
                </h1>

                {clampedProfileCompletion < 100 && (
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => navigate('/profile?tab=professional')}
                      className="flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-white/50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 hover:bg-blue-50 transition-colors"
                      title={t('docBoard.header.viewProfessionalProfile')}
                    >
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {clampedProfileCompletion}%
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">Complete</span>
                    </button>
                    {/* Progress bar removed to match cleaner admin look, or could be kept if compact */}
                  </div>
                )}

                {!doctorProfileRestricted && profileCompletionPercentage === 100 && (
                  <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 text-xs font-semibold shadow-sm">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {t('docBoard.header.verified')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Navigation Tabs */}
            <nav className="flex flex-wrap gap-2 bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-1 shadow-inner shadow-white/60 dark:shadow-black/40 mt-3 sm:mt-0 min-w-[220px] justify-end">
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
                    className={`group flex-1 lg:flex-none min-w-[96px] flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 text-[12px] ${isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-xl shadow-blue-500/30'
                      : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/70'
                      } ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                      <span className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-800'}`}>
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{shortLabel}</span>
                    </div>
                    <span className={`hidden sm:block text-[10px] leading-snug ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'}`}>
                      {description}
                    </span>
                    <span className={`block text-[10px] leading-snug truncate w-full ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'} sm:hidden`}>
                      {description}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content - Mobile Responsive */}
        {activeNavButton === 'appointments' && (
          <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
            {/* Loading - Mobile Responsive */}
            {isDataLoading && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-4 sm:p-8 text-center shadow-lg">
                <div className="flex flex-col items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-0 w-8 h-8 sm:w-12 sm:h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin"
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
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 dark:bg-blue-800/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 dark:bg-indigo-800/20 rounded-full blur-2xl -ml-12 -mb-12"></div>

                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    {/* Icon Section */}
                    <div className="flex-shrink-0 mx-auto lg:mx-0">
                      <div className="relative">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
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
                          <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            {t('docBoard.restriction.title')}
                          </h3>
                          <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base mt-2 font-medium">
                            {doctorProfileMessage || t('docBoard.restriction.subtitle')}
                          </p>
                        </div>

                        {/* Required Information List */}
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-blue-100 dark:border-blue-900/50">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            {t('docBoard.restriction.requiredInfoTitle')}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.license')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.department')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                              <span>{t('docBoard.restriction.requiredItems.qualifications')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
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
                        className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-6 sm:py-7 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-xl"
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
                  className={`w-full ${isSidebarCollapsed ? 'lg:w-[4.5rem] xl:w-20' : 'lg:w-64 xl:w-72'} lg:sticky lg:self-start transition-all duration-300 z-10`}
                  style={{ top: `${tabBarStickyOffset}px` }}
                >
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl shadow-sm h-full lg:min-h-[calc(100vh-160px)] flex flex-col backdrop-blur-md">
                    <div className={`p-4 flex items-center ${isSidebarCollapsed ? 'justify-center lg:flex-col lg:gap-4' : 'justify-between'}`}>
                      {!isSidebarCollapsed && (
                        <div className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
                          Views
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                        className="hidden lg:inline-flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 transition-all hover:shadow-md"
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
                        className={`flex flex-col w-full bg-transparent h-auto gap-2 p-3`}
                      >
                        {appointmentTabsConfig.map(({ value, label, subLabel, Icon, accent, iconColor }) => {
                          const isActive = activeTab === value;

                          if (isSidebarCollapsed) {
                            return (
                              <Tooltip key={value}>
                                <TooltipTrigger asChild>
                                  <TabsTrigger
                                    value={value}
                                    disabled={isDoctorExperienceLocked}
                                    className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive
                                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                                      } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <Icon className="h-5 w-5" />
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
                              className={`group relative flex w-full items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 border border-transparent ${isActive
                                ? 'bg-white dark:bg-gray-800 shadow-md border-gray-100 dark:border-gray-700'
                                : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                                } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                <Icon className="h-5 w-5" />
                              </div>

                              <div className="flex flex-col flex-1 min-w-0">
                                <span className={`font-semibold text-sm ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {label}
                                </span>
                                <span className="text-xs text-gray-400 truncate">
                                  {subLabel}
                                </span>
                              </div>

                              {isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-lg bg-blue-600`}></div>
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
                    {/* Status Filters & Sync Controls */}
                    <div className="mb-2 sm:mb-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1">
                          <Button
                            variant={selectedStatus === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusClick('all')}
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'all'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'VITALS_REQUIRED'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'READY'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'UNDER_CONSULT'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                              : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'LAB_REQUIRED'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'AWAITING_RECONSULT'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'COMPLETED'
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
                            className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${selectedStatus === 'CANCELLED'
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
                            size="icon"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="h-7 w-7 sm:h-8 sm:w-8 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-800"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="sr-only">{t('docBoard.sync.refresh')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Search - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="flex-1">
                        <div className="relative group">
                          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4 group-focus-within:text-blue-500 transition-colors duration-200" />
                          <Input
                            placeholder={t('docBoard.search.currentPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
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

                    {isMobile ? (
                      <div className="space-y-3">
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <div
                              key={appointment.appointmentId}
                              className="rounded-2xl border border-gray-200/80 dark:border-gray-800/70 bg-white dark:bg-gray-950 p-3 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                  <button
                                    onClick={() => handlePatientIdClick(appointment)}
                                    className="text-sm font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-1 transition-colors"
                                  >
                                    {appointment.patientId}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                  <p className="text-sm text-gray-900 dark:text-white truncate">{appointment.patientFullName}</p>
                                  {appointment.phone && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appointment.phone}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 text-right">
                                  {getStatusBadge(appointment.finalStatusCode)}
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                  </div>
                                  <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {format(new Date(appointment.startAt), 'EEE, MMM dd')}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100 px-3 py-1 text-xs font-semibold">
                                  <span className="text-[11px] uppercase tracking-wide">{t('docBoard.table.tokenLabel')}</span>
                                  <span>#{appointment.tokenDetails?.tokenNumber || t('docBoard.table.notAvailable')}</span>
                                </div>
                                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                                  {t('docBoard.table.newCase')}
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {['LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(String(appointment.finalStatusCode || '').toUpperCase()) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenLabAttachments(appointment)}
                                    className="h-8 px-3 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    {t('docBoard.table.addLabReport', { defaultValue: 'Lab report' })}
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddBillClick(appointment)}
                                  className="h-8 px-3 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {t('docBoard.table.addBill', { defaultValue: 'Add Bill' })}
                                </Button>

                                {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                  appointment.finalStatusCode
                                ) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 text-xs font-semibold text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      onClick={() => handleCancelClick(appointment)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {t('common.cancel')}
                                    </Button>
                                  )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  disabled={!hospitalId || !doctorId}
                                  onClick={() => openPrescriptionPreview(appointment)}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {t('common.print')}
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 p-6 text-center text-gray-500 dark:text-gray-400">
                            {t('docBoard.empty.current')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
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
                                      className="group border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all duration-200"
                                    >
                                      <TableCell className="py-4 pl-6 align-middle font-medium">
                                        <button
                                          onClick={() => handlePatientIdClick(appointment)}
                                          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1.5 transition-colors group-hover:underline decoration-blue-300 underline-offset-4"
                                        >
                                          {appointment.patientId}
                                          <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                      </TableCell>
                                      <TableCell className="hidden xl:table-cell py-4 align-middle text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName}</span>
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
                                        <div className="transform transition-transform duration-200 hover:scale-105 origin-left">
                                          {getStatusBadge(appointment.finalStatusCode)}
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
                                                  className="h-8 w-8 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                                          {appointment.appointmentType || 'New / Fee'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 align-middle text-center">
                                        {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                          appointment.finalStatusCode
                                        ) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                              onClick={() => handleCancelClick(appointment)}
                                            >
                                              <span className="sr-only">{t('common.cancel')}</span>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          )}
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell py-4 align-middle text-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
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
                      </div>
                    )}

                    {/* Past - Mobile Responsive */}
                  </TabsContent>

                  <TabsContent value="past" className="space-y-4 pt-2">
                    <div className="space-y-4">
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

                      {/* Past Appointments Table Card */}
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-100/50 dark:shadow-black/20 overflow-hidden backdrop-blur-sm">
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
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1.5 font-semibold transition-colors"
                                      >
                                        {appointment.patientId}
                                        <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName}</span>
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
                                    <TableCell className="py-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                        {appointment.appointmentType || t('docBoard.table.newCase')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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

                      {/* Future Appointments Table Card */}
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-100/50 dark:shadow-black/20 overflow-hidden backdrop-blur-sm">
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
                                        <span className="font-medium text-gray-900 dark:text-white">{appointment.patientFullName}</span>
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
                                    <TableCell className="py-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                                        {appointment.appointmentType || t('docBoard.table.newCase')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex flex-wrap gap-2">
                                        {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                          appointment.finalStatusCode
                                        ) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                              onClick={() => handleCancelClick(appointment)}
                                            >
                                              <X className="h-3.5 w-3.5 mr-1" />
                                              {t('common.cancel')}
                                            </Button>
                                          )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 mx-auto"
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
          </div>
        )}

        {/* Doctor Calendar - embedded in DocBoard */}
        {activeNavButton === 'calendar' && (
          <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
            <Suspense fallback={<div className="p-6 text-center">{t('docBoard.calendar.loading')}</div>}>
              <DoctorCalendar />
            </Suspense>
          </div>
        )}

        {/* Analytics Page */}
        {activeNavButton === 'analytics' && (
          <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
            <Suspense fallback={<div className="p-6 text-center">{t('common.loading')}</div>}>
              <DoctorAnalyticsPage />
            </Suspense>
          </div>
        )}

        {/* Prescription Settings */}
        {activeNavButton === 'settings' && (
          <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
            <div className="p-2 sm:p-4">
              <Tabs
                value={settingsTab}
                onValueChange={(value) => handleSettingsTabChange(value as 'fields' | 'personalized' | 'layout')}
                className="flex flex-col md:flex-row gap-4"
              >
                <div className={`flex md:flex-col w-full ${isSettingsNavCollapsed ? 'md:w-16 lg:w-20' : 'md:w-60 lg:w-64'} gap-2 md:gap-3`}>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md p-3 md:min-h-[460px] flex flex-col gap-4">
                    <div className="hidden md:flex items-center justify-end mb-10">
                      <button
                        type="button"
                        onClick={() => setIsSettingsNavCollapsed((prev) => !prev)}
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 p-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-300 transition-colors"
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
                        className={`flex md:flex-col w-full bg-gray-100 dark:bg-gray-800/80 rounded-xl ${isSettingsNavCollapsed ? 'md:items-center md:gap-1.5 p-1.5' : 'md:items-stretch md:gap-3 p-2'
                          }`}
                      >
                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="fields"
                                className={`w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 ${isSettingsNavCollapsed ? 'md:justify-center md:px-2' : ''
                                  }`}
                              >
                                <Settings className="h-4 w-4" />
                                <span className="sr-only">{t('docBoard.settings.fields')}</span>
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">{t('docBoard.settings.fields')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="fields"
                            className="w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">{t('docBoard.settings.fields')}</span>
                          </TabsTrigger>
                        ))}

                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="personalized"
                                className={`w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 ${isSettingsNavCollapsed ? 'md:justify-center md:px-2' : ''
                                  }`}
                              >
                                <Database className="h-4 w-4" />
                                <span className="sr-only">{t('docBoard.settings.personalData')}</span>
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">{t('docBoard.settings.personalData')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="personalized"
                            className="w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          >
                            <Database className="h-4 w-4" />
                            <span className="font-medium">{t('docBoard.settings.personalData')}</span>
                          </TabsTrigger>
                        ))}

                        {(isSettingsNavCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger
                                value="layout"
                                onClick={handleLayoutTabClick}
                                className={`w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${isSettingsNavCollapsed ? 'md:justify-center md:px-2' : ''
                                  }`}
                              >
                                <LayoutDashboard className="h-4 w-4" />
                                <span className="sr-only">{t('docBoard.settings.layoutLab')}</span>
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">{t('docBoard.settings.layoutLab')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <TabsTrigger
                            value="layout"
                            onClick={handleLayoutTabClick}
                            className="w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="font-medium">{t('docBoard.settings.layoutLab')}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                  <TabsContent value="fields" className="m-0">
                    <div className="p-2 sm:p-4">
                      <PrescriptionCustomizePanel showCloseButton={false} defaultTab="fields" />
                    </div>
                  </TabsContent>
                  <TabsContent value="personalized" className="m-0">
                    <div className="p-2 sm:p-4">
                      <PrescriptionCustomizePanel showCloseButton={false} defaultTab="personalized" />
                    </div>
                  </TabsContent>
                  <TabsContent value="layout" className="m-0">
                    <div className="p-2 sm:p-4">
                      <PrescriptionLayout refreshToken={layoutRefreshToken} />
                    </div>
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
      />

      <PrescriptionPreviewModal
        open={previewModalOpen}
        onOpenChange={handlePreviewModalChange}
        request={previewRequest}
        enableLayoutSettingsNavigation={true}
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
            <Button onClick={() => handleAddBillModalChange(false)} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {t('common.continue', { defaultValue: 'Proceed' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

