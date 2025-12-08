import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Plus,
  Search,
  Heart,
  UserCheck,
  FlaskConical,
  Clock,
  User,
  Bot,
  CalendarDays,
  Phone,
  X,
  FileText,
  Printer,
  ExternalLink,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Settings,
  Database,
  History,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  ClipboardCheck,
  CircleCheck,
  Expand,
  LucideIcon,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PrescriptionCustomizePanel } from '@/features/prescription/components/PrescriptionCustomizePanel';
import { PrescriptionLayout } from '@/features/prescription/components/layout/PrescriptionLayout';
import { format, subDays, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useQueryClient } from '@tanstack/react-query';
import { useDoctorProfile } from '../hooks/useDoctorProfile';
import { useDoctorAppointmentDetails } from '../hooks/useDoctorAppointmentDetails';
import { DoctorAppointmentDetail } from '../services/doctorApi';
import {
  PrescriptionPreviewModal,
  type GeneratePrescriptionDetailsRequest,
} from '@/components/shared/prescription-preview';

// Lazy-load the calendar page so it only loads when the doctor opens it from the dashboard
const DoctorCalendar = lazy(() => import('@/features/doctor-calendar/DoctorCalendarPage').then(module => ({ default: module.DoctorCalendarPage })));
// Lazy-load the AI assistant so it only loads when opened from the dashboard
const DocAI = lazy(() => import('@/features/ai/components/DocAI').then(module => ({ default: module.DocAI })));

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
  phone?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { hospitalId, userId: authUserId, employeeId, userRole } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
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
  const [activeNavButton, setActiveNavButton] = useState<'appointments' | 'settings' | 'calendar' | 'assistant'>('appointments');
  const [settingsTab, setSettingsTab] = useState<'fields' | 'personalized' | 'layout'>('fields');
  const [layoutRefreshToken, setLayoutRefreshToken] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Live update states
  const [isLiveUpdateEnabled, setIsLiveUpdateEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // userId for doctor profile
  const userId = authUserId || '';

  type NavKey = 'appointments' | 'calendar' | 'assistant' | 'settings';

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

  const doctorDisplayName = doctorProfileResponse?.userId || 'Doctor';

  const navButtons: Array<{ key: NavKey; label: string; shortLabel: string; Icon: LucideIcon; requiresProfile?: boolean; description: string; }> = [
    {
      key: 'appointments',
      label: 'Appointments',
      shortLabel: 'Appts',
      Icon: Calendar,
      description: 'Monitor today’s queue'
    },
    {
      key: 'calendar',
      label: t('doctorCalendar.myCalendar') || 'My Calendar',
      shortLabel: 'Cal',
      Icon: CalendarDays,
      requiresProfile: true,
      description: 'Plan your week'
    },
    {
      key: 'assistant',
      label: 'AI Assistant',
      shortLabel: 'AI',
      Icon: Bot,
      requiresProfile: true,
      description: 'Summaries & insights'
    },
    {
      key: 'settings',
      label: 'Prescription Settings',
      shortLabel: 'Settings',
      Icon: FileText,
      requiresProfile: true,
      description: 'Personalize layouts'
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
      alert('Prescription preview requires doctor and hospital context.');
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
            Vitals Required
          </Badge>
        );
      case 'READY':
        return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5 font-medium">Ready</Badge>;
      case 'UNDER_CONSULT':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5 font-medium">Consulting</Badge>;
      case 'LAB_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 font-medium">Lab Required</Badge>;
      case 'AWAITING_RECONSULT':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1.5 py-0.5 font-medium">Reconsult</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 font-medium">Completed</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5 font-medium">Scheduled</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-50 text-gray-600 border-gray-300 text-xs px-1.5 py-0.5 font-medium">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{status}</Badge>;
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
      label: 'Current Appointments',
      subLabel: 'Live queue & vitals',
      Icon: Activity,
      accent: 'from-blue-500 via-indigo-500 to-purple-500',
      iconColor: 'text-blue-500 dark:text-blue-300',
      count: appointmentTabCounts.current
    },
    {
      value: 'past',
      label: 'Past Visits',
      subLabel: 'History & follow-ups',
      Icon: Clock,
      accent: 'from-slate-500 via-slate-600 to-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-300',
      count: appointmentTabCounts.past
    },
    {
      value: 'future',
      label: 'Upcoming Schedule',
      subLabel: 'Next 7 days',
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
    navigate(`/patient/new?patientId=${appointment.patientId}`);
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

  const tabBarStickyOffset = Math.max(headerHeight, 0) + 16;
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

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col"
      style={shouldApplyScale ? scaledStyle : undefined}
    >
      <div
        className="flex flex-col flex-1 w-full"
        style={{ pointerEvents: isDoctorExperienceLocked ? 'none' : 'auto', opacity: isDoctorExperienceLocked ? 0.5 : 1 }}
      >
        {/* Header - Mobile Responsive */}
        <div
          ref={headerRef}
          className="bg-gradient-to-br from-white via-blue-50/60 to-indigo-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900 border-b border-white/70 dark:border-slate-800 px-3 sm:px-6 py-4 shadow-lg flex-shrink-0 sticky top-0 z-30 backdrop-blur"
        >
        <div className="w-full mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shadow-blue-500/40">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight"> Dashboard</h1>
                  {clampedProfileCompletion < 100 && (
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs">
                      <button
                        type="button"
                        onClick={() => navigate('/profile?tab=professional')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-blue-100 dark:border-slate-800 shadow-inner transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        title="View professional profile"
                      >
                        <span className="uppercase tracking-wide text-blue-600 dark:text-blue-300 font-semibold">Professional profile</span>
                        <div className="flex items-center gap-1 text-gray-900 dark:text-white font-bold">
                          {clampedProfileCompletion}%
                          {clampedProfileCompletion === 100 && <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                      </button>
                      <div className="h-1.5 w-full sm:w-48 bg-blue-100/70 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${clampedProfileCompletion}%` }}
                          aria-label={`Professional profile completion ${clampedProfileCompletion}%`}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!doctorProfileRestricted && profileCompletionPercentage === 100 && (
                  <Badge className="ml-2 bg-white/80 dark:bg-slate-800/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/40 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold shadow-sm">
                    <UserCheck className="h-3.5 w-3.5 text-green-600" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-full lg:w-auto">
              <div className="flex flex-wrap gap-1.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-1 shadow-inner shadow-white/60 dark:shadow-black/40">
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
                      title={locked ? (doctorProfileMessage || 'Complete your profile to unlock this section') : description}
                      className={`group flex-1 lg:flex-none min-w-[96px] flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 text-[12px] ${
                        isActive
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Responsive */}
      {activeNavButton === 'appointments' && (
        <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
          {/* Loading - Mobile Responsive */}
          {isDataLoading && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-12 text-center shadow-lg">
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
                    {doctorProfileLoading ? 'Loading doctor profile...' : 'Loading appointment data...'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch your data</p>
                </div>
              </div>
            </div>
          )}

          {/* Error - Mobile Responsive */}
          {shouldShowError && (
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-8 text-center shadow-lg">
              <div className="flex flex-col items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center animate-pulse">
                  <X className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-200">
                    {doctorProfileError ? 'Failed to load doctor profile' : 'Failed to load appointment data'}
                  </p>
                  <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm max-w-md">
                    {!hospitalId || !doctorId
                      ? `Missing required data: ${!hospitalId ? 'Hospital ID' : ''} ${!doctorId ? 'Doctor ID' : ''}`
                      : 'Please check the console for error details and try refreshing the page'}
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
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="bg-white hover:bg-red-50 border-red-300 text-red-700 hover:text-red-800 transition-all duration-200 w-full sm:w-auto"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Refresh Page
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
                          Complete Your Doctor Profile
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 text-sm sm:text-base mt-2 font-medium">
                          {doctorProfileMessage || 'Unlock full access to calendar, appointments, and prescription features'}
                        </p>
                      </div>

                      {/* Required Information List */}
                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-blue-100 dark:border-blue-900/50">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Required Information:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <span>Medical License Number</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <span>Department & Specializations</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <span>Professional Qualifications</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <span>Experience & Registration Details</span>
                          </div>
                        </div>
                      </div>

                      {/* Benefits Section */}
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Calendar Access</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Prescriptions</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Appointments</span>
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
                        <span className="text-base sm:text-lg">Complete Profile Now</span>
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center lg:text-left mt-2">
                      Takes only 2-3 minutes
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
                className={`w-full ${isSidebarCollapsed ? 'lg:w-[4.5rem] xl:w-20' : 'lg:w-64 xl:w-72'} lg:sticky lg:self-start transition-all duration-300`}
                style={{ top: `${tabBarStickyOffset}px` }}
              >
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-xl border border-gray-200 dark:border-gray-800 h-full lg:min-h-[calc(100vh-160px)] flex flex-col">
                  <div className={`mb-2 px-1 flex items-center justify-end gap-2 ${isSidebarCollapsed ? 'lg:flex-col lg:items-center lg:gap-1.5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 lg:hidden">Swipe to explore</span>
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                        className="hidden lg:inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 p-1.5 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-300 transition-colors"
                        aria-pressed={isSidebarCollapsed}
                        aria-expanded={!isSidebarCollapsed}
                        aria-controls="appointment-views-nav"
                        aria-label={isSidebarCollapsed ? 'Expand appointment sidebar' : 'Collapse appointment sidebar'}
                      >
                        {isSidebarCollapsed ? (
                          <Expand className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden />
                        )}
                        <span className="sr-only">{isSidebarCollapsed ? 'Expand appointment sidebar' : 'Collapse appointment sidebar'}</span>
                      </button>
                    </div>
                  </div>
                  <TooltipProvider delayDuration={150}>
                    <TabsList
                      id="appointment-views-nav"
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full bg-transparent h-auto lg:flex lg:flex-col ${
                        isSidebarCollapsed ? 'lg:items-stretch lg:gap-1.5' : 'lg:gap-2'
                      } lg:overflow-visible lg:justify-start`}
                    >
                      {appointmentTabsConfig.map(({ value, label, subLabel, Icon, accent, iconColor }) => {
                        const isActive = activeTab === value;
                        const iconChip = (
                          <div
                            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border bg-white/90 dark:bg-gray-900/70 shadow-sm transition-colors ${
                              isActive
                                ? 'border-blue-200 text-blue-600 dark:text-blue-300'
                                : `border-gray-100/80 dark:border-gray-800/70 ${iconColor}`
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden />
                            {isSidebarCollapsed && <span className="sr-only">{label}</span>}
                          </div>
                        );

                        const triggerBody = isSidebarCollapsed ? (
                          iconChip
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            {iconChip}
                            <div className="flex flex-col flex-1 min-w-0 text-left">
                              <p className="font-semibold leading-tight text-[13px]">{label}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{subLabel}</p>
                            </div>
                            <span
                              className={`absolute inset-x-4 top-1 h-1 rounded-full opacity-0 transition-opacity duration-300 ${
                                isActive ? 'opacity-100' : 'group-hover:opacity-70'
                              } bg-gradient-to-r ${accent}`}
                            />
                          </div>
                        );

                        if (isSidebarCollapsed) {
                          return (
                            <Tooltip key={value} delayDuration={150}>
                              <TooltipTrigger asChild>
                                <TabsTrigger
                                  value={value}
                                  disabled={isDoctorExperienceLocked}
                                  className={`group relative flex items-center justify-center px-1.5 py-1.5 rounded-xl border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                    isActive
                                      ? 'bg-white text-gray-900 dark:bg-gray-800/80 dark:text-white border-blue-200 shadow-lg shadow-blue-100/60 dark:shadow-none'
                                      : 'bg-white/70 dark:bg-gray-900/20 border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-200 hover:bg-white/90 dark:hover:border-gray-800 dark:hover:bg-gray-900/40'
                                  } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {triggerBody}
                                </TabsTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px] text-xs">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                                <p className="text-gray-500 dark:text-gray-400">{subLabel}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return (
                          <TabsTrigger
                            key={value}
                            value={value}
                            disabled={isDoctorExperienceLocked}
                            className={`group relative flex w-full items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                              isActive
                                ? 'bg-white text-gray-900 dark:bg-gray-800/80 dark:text-white border-blue-200 shadow-lg shadow-blue-100/60 dark:shadow-none'
                                : 'bg-white/60 dark:bg-gray-900/20 border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-200 hover:bg-white/90 dark:hover:border-gray-800 dark:hover:bg-gray-900/40'
                            } ${isDoctorExperienceLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {triggerBody}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex-1 w-full lg:pl-4 xl:pl-6">
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
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'all'
                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <CircleCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>All ({currentAppointmentCounts.all})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'VITALS_REQUIRED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('VITALS_REQUIRED')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'VITALS_REQUIRED'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                            : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Vitals ({currentAppointmentCounts.vitalsRequired})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'READY' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('READY')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'READY'
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                            : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Ready ({currentAppointmentCounts.ready})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'UNDER_CONSULT' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('UNDER_CONSULT')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'UNDER_CONSULT'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                            : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Consulting ({currentAppointmentCounts.underConsult})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'LAB_REQUIRED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('LAB_REQUIRED')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'LAB_REQUIRED'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                            : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <FlaskConical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Lab ({currentAppointmentCounts.labRequired})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'AWAITING_RECONSULT' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('AWAITING_RECONSULT')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'AWAITING_RECONSULT'
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Reconsult ({currentAppointmentCounts.awaitingReconsult})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'COMPLETED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('COMPLETED')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'COMPLETED'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Completed ({currentAppointmentCounts.completed})</span>
                        </div>
                      </Button>

                      <Button
                        variant={selectedStatus === 'CANCELLED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick('CANCELLED')}
                        className={`text-xs h-7 sm:h-8 px-2 sm:px-3 font-semibold transition-all duration-300 transform hover:scale-105 ${
                          selectedStatus === 'CANCELLED'
                            ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                            : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Cancelled ({currentAppointmentCounts.cancelled})</span>
                        </div>
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        Last synced{' '}
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
                        <span className="sr-only">Refresh</span>
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
                        placeholder="Search patients by name or ID..."
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

                {/* Table */}
                <div className="rounded-3xl border border-gray-100/80 dark:border-gray-800/70 bg-white/95 dark:bg-gray-950/60 shadow-[0_30px_80px_-45px_rgba(37,99,235,0.65)] dark:shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
                  <div className="overflow-x-auto rounded-3xl">
                    <Table className="min-w-full text-sm">
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900">
                          <TableHead className="text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Patient
                          </TableHead>
                          <TableHead className="hidden xl:table-cell text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Patient Name
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Token
                          </TableHead>
                          <TableHead className="hidden md:table-cell text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Appointment Time
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Status
                          </TableHead>
                          <TableHead className="hidden lg:table-cell text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Case
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Actions
                          </TableHead>
                          <TableHead className="hidden lg:table-cell text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Print Rx
                          </TableHead>
                          <TableHead className="hidden lg:table-cell text-[11px] font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300 uppercase py-4 px-4">
                            Print Token
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <TableRow
                              key={appointment.appointmentId}
                              className="group border-b border-gray-100/80 dark:border-gray-800/70 last:border-b-0 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                            >
                              <TableCell className="py-4 px-4 align-top">
                                <div className="space-y-1.5">
                                  <button
                                    onClick={() => handlePatientIdClick(appointment)}
                                    className="text-sm font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-1 transition-colors"
                                  >
                                    {appointment.patientId}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                    {appointment.patientFullName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {appointment.phone || 'No mobile on file'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                                {appointment.patientFullName}
                              </TableCell>
                              <TableCell className="py-4 px-4">
                                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100 px-3 py-1 text-xs font-semibold">
                                  <span className="text-[11px] uppercase tracking-wide">Token</span>
                                  <span>#{appointment.tokenDetails?.tokenNumber || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell py-4 px-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(new Date(appointment.startAt), 'EEE, MMM dd')}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-4 align-middle">
                                {getStatusBadge(appointment.finalStatusCode)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell py-4 px-4">
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  New Case
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 px-4">
                                <div className="flex flex-wrap gap-2">
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
                                      Cancel
                                    </Button>
                                  )}
                                  {appointment.finalStatusCode === 'VITALS_REQUIRED' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 text-xs font-semibold text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                    >
                                      <Heart className="h-3 w-3 mr-1" />
                                      Vitals
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell py-4 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  disabled={!hospitalId || !doctorId}
                                  onClick={() => openPrescriptionPreview(appointment)}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell py-4 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                >
                                  <Printer className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-10 text-gray-500 dark:text-gray-400">
                              No appointments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Past - Mobile Responsive */}
                </TabsContent>

                <TabsContent value="past" className="space-y-4 pt-2">
                  <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 p-3 md:p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="relative group flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search patients by name or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-sm"
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
                      <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300">
                        <span>From</span>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="h-9 text-sm"
                          max={endDate || pastDateUpperBound}
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300">
                        <span>To</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="h-9 text-sm"
                          min={startDate || undefined}
                          max={pastDateUpperBound}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100/80 dark:border-gray-800/70 bg-white/95 dark:bg-gray-950/60 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur">
                    <div className="overflow-x-auto rounded-3xl">
                      <Table className="border-collapse">
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800/80">
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Patient ID</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Patient Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Token</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Last Visit</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Case</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Print Rx</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Follow Up</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentAppointments.length > 0 ? (
                            currentAppointments.map((appointment) => (
                              <TableRow
                                key={appointment.appointmentId}
                                className="hover:bg-blue-50/60 dark:hover:bg-gray-800/60 transition-colors duration-200 border-b border-gray-100/70 dark:border-gray-800/60"
                              >
                                <TableCell className="font-medium py-3 px-4">
                                  <button
                                    onClick={() => handlePatientIdClick(appointment)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    {appointment.patientId}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </TableCell>
                                <TableCell className="py-3 px-4">{appointment.patientFullName}</TableCell>
                                <TableCell className="py-3 px-4">{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                                <TableCell className="py-3 px-4">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                      {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                                <TableCell className="py-3 px-4">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                    New
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    disabled={!hospitalId || !doctorId}
                                    onClick={() => openPrescriptionPreview(appointment)}
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Print
                                  </Button>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">NA</span>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  {appointment.finalStatusCode === 'COMPLETED' ? (
                                    <div className="flex items-center justify-center">
                                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-sm">
                                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-sm border-2 border-red-200 dark:border-red-800">
                                        <X className="h-5 w-5 text-red-600 dark:text-red-400 font-bold" />
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                No past appointments found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-center mt-4 min-h-[50px]">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {totalPages > 0 ? (
                          Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink onClick={() => handlePageChange(page)} isActive={currentPage === page} className="cursor-pointer">
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        ) : (
                          <PaginationItem>
                            <PaginationLink className="opacity-50">1</PaginationLink>
                          </PaginationItem>
                        )}

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
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 p-3 md:p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="relative group flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search upcoming patients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-sm"
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
                      <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300">
                        <span>From</span>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="h-9 text-sm"
                          min={futureDateLowerBound}
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[140px] text-[11px] text-gray-600 dark:text-gray-300">
                        <span>To</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="h-9 text-sm"
                          min={startDate || futureDateLowerBound}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100/80 dark:border-gray-800/70 bg-white/95 dark:bg-gray-950/60 shadow-[0_25px_70px_-40px_rgba(16,185,129,0.8)] backdrop-blur">
                    <div className="overflow-x-auto rounded-3xl">
                      <Table className="border-collapse">
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800/80">
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Patient ID</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4 hidden sm:table-cell">Patient Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Token</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4 hidden md:table-cell">Time</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4 hidden lg:table-cell">Case</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4">Actions</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4 hidden lg:table-cell">Print Rx</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase py-3 px-4 hidden lg:table-cell">Print Token</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentAppointments.length > 0 ? (
                            currentAppointments.map((appointment) => (
                              <TableRow
                                key={appointment.appointmentId}
                                className="hover:bg-emerald-50/60 dark:hover:bg-gray-800/60 transition-colors duration-200 border-b border-gray-100/70 dark:border-gray-800/60"
                              >
                                <TableCell className="font-medium py-3 px-4">
                                  <button
                                    onClick={() => handlePatientIdClick(appointment)}
                                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 inline-flex items-center gap-1"
                                  >
                                    {appointment.patientId}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </TableCell>
                                <TableCell className="py-3 px-4 hidden sm:table-cell">{appointment.patientFullName}</TableCell>
                                <TableCell className="py-3 px-4">{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                                <TableCell className="py-3 px-4 hidden md:table-cell">
                                  {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                </TableCell>
                                <TableCell className="py-3 px-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                                <TableCell className="py-3 px-4 hidden lg:table-cell">
                                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                    New
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                  <div className="flex flex-wrap gap-2">
                                    {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                      appointment.finalStatusCode
                                    ) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => handleCancelClick(appointment)}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-4 hidden lg:table-cell">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    disabled={!hospitalId || !doctorId}
                                    onClick={() => openPrescriptionPreview(appointment)}
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Print
                                  </Button>
                                </TableCell>
                                <TableCell className="py-3 px-4 hidden lg:table-cell">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-semibold bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  >
                                    <Printer className="h-3 w-3 mr-1" />
                                    Print
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                No future appointments found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-center mt-4 min-h-[50px]">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {totalPages > 0 ? (
                          Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink onClick={() => handlePageChange(page)} isActive={currentPage === page} className="cursor-pointer">
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        ) : (
                          <PaginationItem>
                            <PaginationLink className="opacity-50">1</PaginationLink>
                          </PaginationItem>
                        )}

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
              <Suspense fallback={<div className="p-6 text-center">Loading calendar...</div>}>
                <DoctorCalendar />
              </Suspense>
            </div>
          )}

          {/* AI Assistant - embedded in DocBoard */}
          {activeNavButton === 'assistant' && (
            <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4">
              <Suspense fallback={<div className="p-6 text-center">Loading assistant...</div>}>
                <DocAI />
              </Suspense>
            </div>
          )}

          {/* Prescription Settings */}
          {activeNavButton === 'settings'  && (
            <div className="w-full mx-auto px-3 sm:px-6 py-2 sm:py-4 space-y-4">
              {/* Unified Prescription Settings Navigation - Mobile Responsive */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 sm:p-3 shadow-sm">
                <Tabs value={settingsTab} onValueChange={(value) => handleSettingsTabChange(value as 'fields' | 'personalized' | 'layout')}>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 h-auto">
                    <TabsTrigger 
                      value="fields" 
                      className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium hidden sm:inline">Fields</span>
                      <span className="font-medium sm:hidden">Fields</span>
                      {settingsTab === 'fields' && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="personalized" 
                      className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium hidden sm:inline">Personal Data</span>
                      <span className="font-medium sm:hidden">Personal</span>
                      {settingsTab === 'personalized' && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="layout" 
                      onClick={handleLayoutTabClick}
                      className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium hidden sm:inline">Layout Lab</span>
                      <span className="font-medium sm:hidden">Layout</span>
                      {settingsTab === 'layout' && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Prescription Settings Content - Mobile Responsive */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <Tabs value={settingsTab} onValueChange={(value) => handleSettingsTabChange(value as 'fields' | 'personalized' | 'layout')}>
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
                </Tabs>
              </div>
            </div>
          )}

      </div>

      <PrescriptionPreviewModal
        open={previewModalOpen}
        onOpenChange={handlePreviewModalChange}
        request={previewRequest}
        title="Prescription Preview"
        description="Download, share, or print the prescription PDF."
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this appointment? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {appointmentToCancel && (
            <div className="py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span> {appointmentToCancel.patientFullName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span> {appointmentToCancel.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Doctor:</span> Dr. Current User
                  </div>
                  <div>
                    <span className="font-medium">Appointment ID:</span> {appointmentToCancel.appointmentId}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelDialogClose} disabled={isCancelling}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 

