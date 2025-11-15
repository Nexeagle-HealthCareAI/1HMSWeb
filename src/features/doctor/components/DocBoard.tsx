import React, { useState, useMemo, useEffect } from 'react';
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
  Eye,
  User,
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
  Settings as SettingsIcon,
  Settings,
  Database
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PrescriptionSettings } from '@/pages/PrescriptionSettings';
import { PrescriptionCustomizePanel } from '@/components/prescription/PrescriptionCustomizePanel';
import { format, subDays, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { useQueryClient } from '@tanstack/react-query';
import { useDoctorProfile } from '../hooks/useDoctorProfile';
import { useDoctorAppointmentDetails } from '../hooks/useDoctorAppointmentDetails';
import { DoctorAppointmentDetail } from '../services/doctorApi';

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
  const { hospitalId, userId: authUserId, employeeId } = useAuthStore();
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
  const [activeNavButton, setActiveNavButton] = useState<'appointments' | 'settings'>('appointments');
  const [settingsTab, setSettingsTab] = useState<'layout' | 'fields' | 'personalized'>('layout');
  const [isMobile, setIsMobile] = useState(false);

  // Live update states
  const [isLiveUpdateEnabled, setIsLiveUpdateEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch from layout tab on mobile
  useEffect(() => {
    if (isMobile && settingsTab === 'layout') {
      setSettingsTab('fields'); // Switch to fields tab on mobile
    }
  }, [isMobile, settingsTab]);

  // Prevent body scrolling
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = 'auto';
    };
  }, []);

  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // Helper function for safe date formatting (kept for future use)
  const formatSafeDate = (dateString: string | undefined, formatString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, formatString);
    } catch {
      return 'N/A';
    }
  };

  // userId for doctor profile
  const userId = authUserId || '';

  // Doctor Profile
  const { data: doctorProfileResponse, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorProfile(userId);
  const doctorId = doctorProfileResponse?.doctorId || '';
  
  // Check if doctor profile is restricted (204/404 means profile incomplete)
  const doctorProfileRestricted = useAuthStore(state => state.doctorProfileRestricted);
  const doctorProfileMessage = useAuthStore(state => state.doctorProfileMessage);

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
  
  // Check if the error is a 204/404 (profile incomplete) - these should show restriction message, not error
  const isProfileIncompleteError = doctorProfileError && (
    (doctorProfileError as any)?.response?.status === 204 || 
    (doctorProfileError as any)?.response?.status === 404 ||
    doctorProfileError?.message?.includes('not found')
  );
  
  // Only show error if it's NOT a profile incomplete error (204/404) or if profile is not restricted
  // If profile is restricted, we show the restriction message instead
  const hasError = (doctorProfileError || appointmentError) && !isProfileIncompleteError && !doctorProfileRestricted;
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

  // Default date ranges for past/future tabs
  useEffect(() => {
    if (activeTab === 'past') {
      setStartDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (activeTab === 'future') {
      setStartDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
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
    setStartDate(value);
    if (value && endDate && new Date(value) > new Date(endDate)) {
      setEndDate(value);
    }
  };
  const handleEndDateChange = (value: string) => {
    if (startDate && value && new Date(value) < new Date(startDate)) {
      console.warn('Start date cannot be after end date');
      return;
    }
    setEndDate(value);
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

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Header - Mobile Responsive */}
      <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-2 sm:py-3 shadow-lg flex-shrink-0 sticky top-0 z-30">
        <div className="w-full mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner w-full sm:w-auto">
              <button
                onClick={() => setActiveNavButton('appointments')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none ${
                  activeNavButton === 'appointments'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Appointments</span>
                <span className="sm:hidden">Appts</span>
              </button>
              <button
                onClick={() => setActiveNavButton('settings')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none ${
                  activeNavButton === 'settings'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Prescription Settings</span>
                <span className="sm:hidden">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Responsive */}
      {activeNavButton === 'appointments' && (
        <div className="flex-1 overflow-hidden">
          <div className="w-full mx-auto p-2 sm:p-4 h-full overflow-y-auto">
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
              className="h-full flex flex-col"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 mb-2 sm:mb-3">
                <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12 bg-transparent">
                  <TabsTrigger
                    value="current"
                    disabled={doctorProfileRestricted}
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-300 hover:scale-105 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full"></div>
                      <span className="hidden sm:inline">Current Appointments</span>
                      <span className="sm:hidden">Current</span>
                      {activeTab === 'current' && (
                        <div className="flex items-center gap-1">
                          {isLiveUpdateEnabled && <Activity className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500" />}
                          {isRefreshing && <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 animate-spin" />}
                          {connectionStatus === 'online' ? (
                            <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    disabled={doctorProfileRestricted}
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-300 hover:scale-105 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full"></div>
                      <span className="hidden sm:inline">Past Appointments</span>
                      <span className="sm:hidden">Past</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="future"
                    disabled={doctorProfileRestricted}
                    className="text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-300 hover:scale-105 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full"></div>
                      <span className="hidden sm:inline">Future Appointments</span>
                      <span className="sm:hidden">Future</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
            </div>
            
              {/* Live Update Controls - Mobile Responsive */}
              {activeTab === 'current' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200">
                          {isLiveUpdateEnabled ? 'Live Updates Active' : 'Live Updates Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Last updated: {format(lastUpdateTime, 'HH:mm:ss')}
                        </span>
                        {connectionStatus === 'online' ? (
                          <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500" />
                        ) : (
                          <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="h-7 sm:h-8 px-2 sm:px-3 text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 flex-1 sm:flex-none"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh Now</span>
                        <span className="sm:hidden">Refresh</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLiveUpdateEnabled(!isLiveUpdateEnabled)}
                        className={`h-7 sm:h-8 px-2 sm:px-3 text-xs flex-1 sm:flex-none ${
                          isLiveUpdateEnabled
                            ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {isLiveUpdateEnabled ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh'}
                        </span>
                        <span className="sm:hidden">
                          {isLiveUpdateEnabled ? 'Disable' : 'Enable'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Current - Mobile Responsive */}
              <TabsContent value="current" className="p-2 sm:p-4 flex-1 overflow-auto">
                {/* Status Filters - Mobile Responsive */}
                <div className="mb-2 sm:mb-3">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full"></div>
                        <span className="hidden sm:inline">All ({currentAppointmentCounts.all})</span>
                        <span className="sm:hidden">All ({currentAppointmentCounts.all})</span>
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
                        <span className="hidden sm:inline">Vitals ({currentAppointmentCounts.vitalsRequired})</span>
                        <span className="sm:hidden">Vitals ({currentAppointmentCounts.vitalsRequired})</span>
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
                        <span className="hidden sm:inline">Ready ({currentAppointmentCounts.ready})</span>
                        <span className="sm:hidden">Ready ({currentAppointmentCounts.ready})</span>
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
                        <span className="hidden sm:inline">Consult ({currentAppointmentCounts.underConsult})</span>
                        <span className="sm:hidden">Consult ({currentAppointmentCounts.underConsult})</span>
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
                        <span className="hidden sm:inline">Lab ({currentAppointmentCounts.labRequired})</span>
                        <span className="sm:hidden">Lab ({currentAppointmentCounts.labRequired})</span>
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
                        <span className="hidden sm:inline">Reconsult ({currentAppointmentCounts.awaitingReconsult})</span>
                        <span className="sm:hidden">Reconsult ({currentAppointmentCounts.awaitingReconsult})</span>
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
                        <span className="hidden sm:inline">Done ({currentAppointmentCounts.completed})</span>
                        <span className="sm:hidden">Done ({currentAppointmentCounts.completed})</span>
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
                        <span className="hidden sm:inline">Cancel ({currentAppointmentCounts.cancelled})</span>
                        <span className="sm:hidden">Cancel ({currentAppointmentCounts.cancelled})</span>
                      </div>
                    </Button>
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
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Patient ID</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden sm:table-cell">Patient Name</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Token No</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden md:table-cell">Appointment Time</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Case</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Actions</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Print Prescription</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Print Token</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <TableRow
                              key={appointment.appointmentId}
                              className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                            >
                              <TableCell className="font-medium py-3 px-4">
                                <button
                                  onClick={() => handlePatientIdClick(appointment)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-200 flex items-center gap-1"
                                >
                                  {appointment.patientId}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </TableCell>
                              <TableCell className="py-3 px-4">{appointment.patientFullName}</TableCell>
                              <TableCell className="py-3 px-4">{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                              <TableCell className="py-3 px-4">
                                {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                              </TableCell>
                              <TableCell className="py-3 px-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                              <TableCell className="py-3 px-4">
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                  New
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex gap-1">
                                  {/* Hide the cancel button for statuses where it's not allowed */}
                                  {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                    appointment.finalStatusCode
                                  ) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 text-xs font-semibold text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-105"
                                      onClick={() => handleCancelClick(appointment)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                                {appointment.finalStatusCode === 'VITALS_REQUIRED' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-semibold text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 mt-1 transition-all duration-200 hover:scale-105"
                                  >
                                    <Heart className="h-3 w-3 mr-1" />
                                    Vitals
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-green-50 text-green-700 border-green-300 hover:bg-green-100 transition-all duration-200 hover:scale-105"
                                >
                                  <Printer className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No appointments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                      </div>
                      </div>

                {/* Pagination */}
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
              </TabsContent>

              {/* Past - Mobile Responsive */}
              <TabsContent value="past" className="p-2 sm:p-4 flex-1 overflow-auto">
                {/* Search + Date Range - Mobile Responsive */}
                <div className="flex flex-col gap-3 mb-3">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <Input
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Date Range - Mobile Optimized */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          From Date
                        </label>
                        <Input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => handleStartDateChange(e.target.value)} 
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          To Date
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                          min={startDate || undefined}
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Select date range to filter past appointments
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Patient ID</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Patient Name</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Token No</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Last Appt Date</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Last Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Case</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Print Rx</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Next FollowUp</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">IsCompleted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <TableRow
                              key={appointment.appointmentId}
                              className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                            >
                              <TableCell className="font-medium py-3 px-4">
                                <button
                                  onClick={() => handlePatientIdClick(appointment)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-200 flex items-center gap-1"
                                >
                                  {appointment.patientId}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </TableCell>
                              <TableCell className="py-3 px-4">{appointment.patientFullName}</TableCell>
                              <TableCell className="py-3 px-4">{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-gray-900 dark:text-white text-xs">
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
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                  <FileText className="h-2.5 w-2.5 mr-1" />
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
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No past appointments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                      </div>
                      </div>

                {/* Pagination */}
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
              </TabsContent>

              {/* Future - Mobile Responsive */}
              <TabsContent value="future" className="p-2 sm:p-4 flex-1 overflow-auto">
                {/* Search + Date Range - Mobile Responsive */}
                <div className="flex flex-col gap-3 mb-3">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <Input
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Date Range - Mobile Optimized */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          From Date
                        </label>
                        <Input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => handleStartDateChange(e.target.value)} 
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          To Date
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                          min={startDate || undefined}
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Select date range to filter future appointments
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Patient ID</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden sm:table-cell">Patient Name</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Token No</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden md:table-cell">Appointment Time</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Case</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2">Actions</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Print Prescription</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1.5 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">Print Token</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAppointments.length > 0 ? (
                          currentAppointments.map((appointment) => (
                            <TableRow
                              key={appointment.appointmentId}
                              className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                            >
                              <TableCell className="font-medium py-3 px-4">
                                <button
                                  onClick={() => handlePatientIdClick(appointment)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-200 flex items-center gap-1"
                                >
                                  {appointment.patientId}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </TableCell>
                              <TableCell className="py-3 px-4">{appointment.patientFullName}</TableCell>
                              <TableCell className="py-3 px-4">{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                              <TableCell className="py-3 px-4">
                                {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                              </TableCell>
                              <TableCell className="py-3 px-4">{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                              <TableCell className="py-3 px-4">
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                  New
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex gap-1">
                                  {!['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(
                                    appointment.finalStatusCode
                                  ) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => handleCancelClick(appointment)}
                                    >
                                      <X className="h-2.5 w-2.5 mr-1" />
                                      Cancel
                                    </Button>
                                  )}
                      </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-green-50 text-green-700 border-green-300 hover:bg-green-100 transition-all duration-200 hover:scale-105"
                                >
                                  <Printer className="h-3 w-3 mr-1" />
                                  Print
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No future appointments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                      </div>
                    </div>

                {/* Pagination */}
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
              </TabsContent>
            </Tabs>
            )}
          </div>
        </div>
      )}

      {/* Prescription Settings */}
      {activeNavButton === 'settings' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Prescription Settings Header */}
            <div className="flex-shrink-0 p-2 sm:p-4 border-b border-gray-200 bg-white">
            </div>

            {/* Unified Prescription Settings Navigation - Mobile Responsive */}
            <div className="flex-shrink-0 p-2 sm:p-3 border-b border-gray-200">
              <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as 'layout' | 'fields' | 'personalized')}>
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 h-auto">
                  <TabsTrigger 
                    value="layout" 
                    disabled={isMobile}
                    className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                      isMobile ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-medium hidden sm:inline">Layout</span>
                    <span className="font-medium sm:hidden">Layout</span>
                    {settingsTab === 'layout' && !isMobile && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                    {isMobile && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></div>
                    )}
                  </TabsTrigger>
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
                </TabsList>
              </Tabs>
            </div>

            {/* Prescription Settings Content - Mobile Responsive */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as 'layout' | 'fields' | 'personalized')}>
                <TabsContent value="layout" className="h-full m-0 overflow-y-auto">
                  {isMobile ? (
                    <div className="p-4 sm:p-6 flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                      <div className="text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Layout Settings Not Available on Mobile
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Layout settings require a larger screen for optimal editing experience. Please use a desktop or tablet device to access this feature.
                        </p>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>Switch to desktop mode to access Layout Settings</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 sm:p-4">
                      <PrescriptionSettings />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="fields" className="h-full m-0 overflow-y-auto">
                  <div className="h-full overflow-y-auto p-2 sm:p-4">
                    <PrescriptionCustomizePanel showCloseButton={false} defaultTab="fields" />
                  </div>
                </TabsContent>
                <TabsContent value="personalized" className="h-full m-0 overflow-y-auto">
                  <div className="h-full overflow-y-auto p-2 sm:p-4">
                    <PrescriptionCustomizePanel showCloseButton={false} defaultTab="personalized" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

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

