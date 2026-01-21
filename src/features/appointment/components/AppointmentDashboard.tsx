import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  RefreshCw,
  Wifi,
  ArrowLeft,
  Activity,
  CalendarClock,
  Ban,
  Loader2,
  Upload,
  UserX,
  Tag,
  ArrowUp,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { AppointmentBooking } from './AppointmentBooking';
import { TokenPrintModal } from './TokenPrintModal';
import { VitalsForm } from './VitalsForm';
import { RescheduleDialog } from './RescheduleDialog';
import { format } from 'date-fns';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AppointmentDetail, appointmentApi } from '../services/appointmentApi';
import { PrescriptionPreviewModal, type GeneratePrescriptionDetailsRequest } from '@/components/shared/prescription-preview';
import AttachmentsSection from '@/features/patient/components/AttachmentsSection';
import { PatientProfileModal } from '@/features/patient/components/PatientProfileModal';

export const AppointmentDashboard = () => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showBooking, setShowBooking] = useState(false);
  const [bookingRefreshToken, setBookingRefreshToken] = useState(0);
  const [showVitalsForm, setShowVitalsForm] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<AppointmentDetail | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [compactMode, setCompactMode] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentDetail | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [appointmentForBilling, setAppointmentForBilling] = useState<AppointmentDetail | null>(null);
  const [labAttachmentModal, setLabAttachmentModal] = useState<{ open: boolean; patientId?: string; patientName?: string; appointmentId?: string }>({ open: false });
  const [labAttachments, setLabAttachments] = useState<Record<string, string[]>>({});
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [patientProfileName, setPatientProfileName] = useState<string | undefined>(undefined);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentDetail | null>(null);

  // Token Print State
  const [tokenPrintOpen, setTokenPrintOpen] = useState(false);
  const [tokenPrintData, setTokenPrintData] = useState<{
    tokenNumber: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    appointmentDate: string;
    department?: string;
  } | null>(null);

  const handlePrintToken = (appointment: AppointmentDetail) => {
    setTokenPrintData({
      tokenNumber: String(appointment.token?.tokenNumber || 'N/A'),
      patientName: appointment.patientFullName,
      patientId: appointment.patientId,
      doctorName: appointment.doctorName || 'N/A',
      appointmentDate: appointment.startAt,
      department: appointment.departments?.[0] || undefined
    });
    setTokenPrintOpen(true);
  };

  const handleOpenLabAttachments = (appointment: AppointmentDetail) => {
    setLabAttachmentModal({
      open: true,
      patientId: appointment.patientId,
      patientName: appointment.patientFullName,
      appointmentId: appointment.appointmentId,
    });
  };

  const handlePatientClick = (appointment: AppointmentDetail) => {
    setPatientProfileId(appointment.patientId);
    setPatientProfileName(appointment.patientFullName);
    setShowPatientProfileModal(true);
  };

  const handleLabAttachmentsChange = (next: string[]) => {
    if (!labAttachmentModal.patientId) return;
    setLabAttachments((prev) => ({ ...prev, [labAttachmentModal.patientId]: next }));
  };

  const handleRescheduleClick = (appointment: AppointmentDetail) => {
    setAppointmentToReschedule(appointment);
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSuccess = () => {
    // Refresh list after successful reschedule
    if (refetch) refetch();
  };

  const getStatusBadge = (status: AppointmentDetail['finalStatusCode'], appointment?: AppointmentDetail) => {
    const statusLabels = {
      VITALS_REQUIRED: t('appointmentDashboard.statusLabels.vitalsRequired'),
      READY: t('appointmentDashboard.statusLabels.ready'),
      UNDER_CONSULT: t('appointmentDashboard.statusLabels.underConsult'),
      LAB_REQUIRED: t('appointmentDashboard.statusLabels.labRequired'),
      AWAITING_RECONSULT: t('appointmentDashboard.statusLabels.awaitingReconsult'),
      COMPLETED: t('appointmentDashboard.statusLabels.completed'),
      SCHEDULED: t('appointmentDashboard.statusLabels.scheduled'),
      CANCELLED: t('appointmentDashboard.statusLabels.cancelled'),
    } as Record<string, string>;

    switch (status) {
      case 'VITALS_REQUIRED':
        return (
          <Badge
            className="bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            {statusLabels.VITALS_REQUIRED}
          </Badge>
        );
      case 'READY':
        return (
          <Badge
            className="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            {statusLabels.READY}
          </Badge>
        );
      case 'UNDER_CONSULT':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.UNDER_CONSULT}</Badge>;
      case 'LAB_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.LAB_REQUIRED}</Badge>;
      case 'AWAITING_RECONSULT':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.AWAITING_RECONSULT}</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.COMPLETED}</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.SCHEDULED}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-50 text-gray-600 border-gray-300 text-xs px-1.5 py-0.5 font-medium">{statusLabels.CANCELLED}</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels[status || ''] || status}</Badge>;
    }
  };

  const handleVitalsClick = (appointment: AppointmentDetail) => {
    setSelectedPatient(appointment);
    setShowVitalsForm(true);
  };

  const handleVitalsSubmit = (vitalsData: any) => {
    console.log('Vitals submitted for patient:', selectedPatient?.patientFullName, vitalsData);

    // Invalidate appointment details queries to refresh dashboard data
    queryClient.invalidateQueries({
      queryKey: ['appointmentDetails']
    });

    setShowVitalsForm(false);
    setSelectedPatient(null);
  };

  const handleVitalsCancel = () => {
    setShowVitalsForm(false);
    setSelectedPatient(null);
  };







  const handleAddBillClick = (appointment: AppointmentDetail) => {
    setAppointmentForBilling(appointment);
    setShowAddBillModal(true);
  };

  const handleAddBillModalChange = (open: boolean) => {
    setShowAddBillModal(open);
    if (!open) {
      setAppointmentForBilling(null);
    }
  };

  const handleBookingClick = () => {
    setBookingRefreshToken((prev) => prev + 1);
    setShowBooking(true);
  };

  const handlePreviewModalChange = (open: boolean) => {
    setPreviewModalOpen(open);
    if (!open) {
      setPreviewRequest(null);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!refetch) return;

    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Use existing hook for appointment details
  const { data: appointmentData, isLoading, error, refetch } = useAppointmentDetails(
    'All',
    startDate || new Date().toISOString().split('T')[0],
    endDate || new Date().toISOString().split('T')[0],
    hospitalId || '',
    !!hospitalId
  );

  const appointments = appointmentData?.items || [];

  const getDoctorFilterValue = (doctorId?: string, doctorName?: string | null) => {
    if (doctorId) {
      return doctorId;
    }
    if (doctorName) {
      return doctorName.trim().toLowerCase();
    }
    return '';
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDayDate = (dateKey?: string | null) => {
    if (!dateKey) {
      return null;
    }
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const getAppointmentDateKey = (appointment: AppointmentDetail) => {
    if (appointment.startAt) {
      const startDate = new Date(appointment.startAt);
      if (!Number.isNaN(startDate.getTime())) {
        return formatDateKey(startDate);
      }
    }
    if (appointment.appointmentDate) {
      return appointment.appointmentDate.slice(0, 10);
    }
    return '';
  };

  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((appointment) => {
      const key = getDoctorFilterValue(appointment.doctorId, appointment.doctorName);
      if (!key) {
        return;
      }
      if (!map.has(key)) {
        map.set(key, appointment.doctorName || 'Unknown Doctor');
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [appointments]);

  const isDefaultFilterState =
    !searchTerm.trim() &&
    selectedDoctor === 'all' &&
    selectedStatus === 'all' &&
    !startDate &&
    !endDate;

  const filteredAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    const today = new Date(); // Use actual current date
    const todayKey = formatDateKey(today);
    const todayDay = toDayDate(todayKey);

    // If no appointments, return empty array
    if (appointments.length === 0) {
      return [];
    }

    console.log('Current selectedStatus in filter:', selectedStatus, 'Type:', typeof selectedStatus);

    const filtered = appointments.filter(appointment => {
      const searchLower = searchTerm.toLowerCase();
      const nameLower = appointment.patientFullName?.toLowerCase() || '';
      const tokenNumber = String(appointment.token?.tokenNumber ?? '').toLowerCase();
      const matchesSearch = (
        nameLower.includes(searchLower) ||
        appointment.patientId?.toLowerCase().includes(searchLower) ||
        appointment.patientMobile?.toLowerCase().includes(searchLower) ||
        (appointment.appointmentDate && appointment.appointmentDate.toLowerCase().includes(searchLower)) ||
        (tokenNumber && tokenNumber.includes(searchLower))
      );

      const doctorValue = getDoctorFilterValue(appointment.doctorId, appointment.doctorName);
      const matchesDoctor = selectedDoctor === 'all' || (!!doctorValue && doctorValue === selectedDoctor);

      // Filter by status if on current tab
      let matchesStatus = true;
      if (activeTab === 'current' && selectedStatus !== 'all') {
        // Convert both to strings and compare case-insensitively for better matching
        const appointmentStatus = String(appointment.finalStatusCode || '').toUpperCase();
        const selectedStatusUpper = String(selectedStatus || '').toUpperCase();
        matchesStatus = appointmentStatus === selectedStatusUpper;

        // Debug log for status matching
        console.log('Status comparison:', {
          appointmentStatus,
          selectedStatusUpper,
          matchesStatus,
          appointmentId: appointment.appointmentId,
          patientName: appointment.patientFullName
        });

        // Special debug for VITALS_REQUIRED
        if (selectedStatusUpper === 'VITALS_REQUIRED') {
          console.log('🔍 VITALS_REQUIRED filter debug:', {
            appointmentStatus,
            selectedStatusUpper,
            matchesStatus,
            appointmentId: appointment.appointmentId,
            patientName: appointment.patientFullName
          });
        }
      }

      const appointmentDateKey = getAppointmentDateKey(appointment);
      const appointmentDay = toDayDate(appointmentDateKey);

      // Filter by date range if on past or future tab
      let matchesDateRange = true;
      if ((activeTab === 'past' || activeTab === 'future') && appointmentDay) {
        if (startDate) {
          const startDay = toDayDate(startDate);
          if (startDay && startDay > appointmentDay) {
            matchesDateRange = false;
          }
        }
        if (endDate) {
          const endDay = toDayDate(endDate);
          if (endDay && endDay < appointmentDay) {
            matchesDateRange = false;
          }
        }
      }

      // Filter by appointment type based on active tab
      let matchesType = true;

      if (isDefaultFilterState) {
        switch (activeTab) {
          case 'current':
            matchesType = appointmentDateKey === todayKey;
            break;
          case 'past':
            matchesType = !!appointmentDay && !!todayDay && appointmentDay < todayDay;
            break;
          case 'future':
            matchesType = !!appointmentDay && !!todayDay && appointmentDay > todayDay;
            break;
          default:
            matchesType = true;
        }
      }

      const result = matchesSearch && matchesDoctor && matchesStatus && matchesDateRange && matchesType;

      // Debug status filtering specifically
      if (activeTab === 'current' && selectedStatus !== 'all') {
        console.log('Status filtering debug:', {
          patientName: appointment.patientFullName,
          appointmentStatus: appointment.finalStatusCode,
          selectedStatus,
          matchesStatus,
          result,
          allFilters: {
            matchesSearch,
            matchesDoctor,
            matchesStatus,
            matchesDateRange,
            matchesType
          }
        });

        // Special debug for VITALS_REQUIRED
        if (selectedStatus === 'VITALS_REQUIRED') {
          console.log('VITALS_REQUIRED filter debug:', {
            patientName: appointment.patientFullName,
            appointmentStatus: appointment.finalStatusCode,
            appointmentStatusUpper: String(appointment.finalStatusCode || '').toUpperCase(),
            selectedStatusUpper: String(selectedStatus || '').toUpperCase(),
            matchesStatus,
            willBeIncluded: result
          });
        }
      }

      if (!result) {
        console.log('Appointment filtered out:', {
          patientName: appointment.patientFullName,
          appointmentDate: appointment.appointmentDate,
          finalStatusCode: appointment.finalStatusCode,
          matchesSearch,
          matchesDoctor,
          matchesStatus,
          matchesDateRange,
          matchesType
        });
      }

      return result;
    });

    console.log('Filtered results:', {
      filteredCount: filtered.length,
      selectedStatus,
      activeTab,
      totalAppointments: appointments.length,
      filteredAppointments: filtered.map(a => ({
        patientName: a.patientFullName,
        appointmentDate: a.appointmentDate,
        finalStatusCode: a.finalStatusCode
      })),
      statusBreakdown: appointments.reduce((acc, apt) => {
        const status = apt.finalStatusCode;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Additional debug: Show what appointments exist for the current tab and status
    if (activeTab === 'current') {
      const currentTabAppointments = appointments.filter(a => {
        const appointmentStartDate = new Date(a.startAt);
        const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
        const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        return appointmentDay.getTime() === todayStart.getTime();
      });

      console.log('Current tab appointments breakdown:', {
        totalCurrent: currentTabAppointments.length,
        byStatus: currentTabAppointments.reduce((acc, apt) => {
          const status = String(apt.finalStatusCode || '').toUpperCase();
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        selectedStatus,
        filteredCount: filtered.length
      });
    }

    // Final debug summary
    console.log('🎯 FINAL FILTER RESULT:', {
      selectedStatus,
      activeTab,
      totalAppointments: appointments.length,
      filteredCount: filtered.length,
      filteredAppointmentIds: filtered.map(a => a.appointmentId),
      isEmpty: filtered.length === 0
    });

    // Log the current status filter for debugging
    if (activeTab === 'current') {
      console.log('Current tab status filter:', {
        selectedStatus,
        totalAppointments: appointments.length,
        filteredCount: filtered.length,
        statusBreakdown: {
          all: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime();
          }).length,
          vitalsRequired: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === 'VITALS_REQUIRED';
          }).length,
          ready: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === 'READY';
          }).length
        }
      });

      // Additional debug info for status filtering
      if (selectedStatus !== 'all') {
        console.log('Status filter details:', {
          selectedStatus,
          appointmentsWithStatus: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === String(selectedStatus || '').toUpperCase();
          }).length,
          filteredAppointmentsWithStatus: filtered.filter(a => String(a.finalStatusCode || '').toUpperCase() === String(selectedStatus || '').toUpperCase()).length
        });
      }
    }

    // If filtering is too restrictive and no results, show all appointments for debugging
    // Sort by appointment time in increasing order
    const sortedFiltered = filtered.sort((a, b) => {
      // Sort only by appointment time
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      return timeA - timeB;
    });

    if (
      sortedFiltered.length === 0 &&
      appointments.length > 0 &&
      activeTab === 'current' &&
      isDefaultFilterState
    ) {
      return [...appointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }

    return sortedFiltered;
  }, [searchTerm, selectedDoctor, selectedStatus, startDate, endDate, activeTab, appointments, isDefaultFilterState]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search term, doctor selection, status selection, date range, or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDoctor, selectedStatus, startDate, endDate, activeTab]);

  // Reset status filter when switching tabs
  useEffect(() => {
    setSelectedStatus('all');
  }, [activeTab]);

  // Reset date range when switching tabs
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (activeTab === 'past') {
      setStartDate(yesterday.toISOString().split('T')[0]);
      setEndDate(yesterday.toISOString().split('T')[0]);
    } else if (activeTab === 'future') {
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setEndDate(tomorrow.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [activeTab]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    if (!appointments) return {
      total: 0,
      vitalsRequired: 0,
      completed: 0,
      doctorStats: [] as { name: string; count: number; noShowCount: number }[]
    };

    // Use all currently loaded appointments for stats (logic matches active tab/date range)
    const currentViewAppointments = appointments;

    const doctorMap = new Map<string, { total: number; noShow: number }>();

    currentViewAppointments.forEach(apt => {
      const docName = apt.doctorName || 'Unknown Doctor';
      const currentStats = doctorMap.get(docName) || { total: 0, noShow: 0 };

      currentStats.total += 1;

      // Calculate No Show (VITALS_REQUIRED is considered No Show for Past appointments)
      if (apt.finalStatusCode === 'VITALS_REQUIRED') {
        currentStats.noShow += 1;
      }

      doctorMap.set(docName, currentStats);
    });

    const doctorStats = Array.from(doctorMap.entries()).map(([name, stats]) => ({
      name,
      count: stats.total,
      noShowCount: stats.noShow
    }));

    return {
      total: currentViewAppointments.length,
      vitalsRequired: currentViewAppointments.filter(apt => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      completed: currentViewAppointments.filter(apt => apt.finalStatusCode === 'COMPLETED').length,
      doctorStats
    };
  }, [appointments]);

  // Initial load when component mounts
  useEffect(() => {
    if (refetch && hospitalId) {
      console.log('AppointmentDashboard mounted - triggering initial API load');
      refetch();
    }
  }, [refetch, hospitalId]);

  // Refetch when page becomes visible again (user navigates back to dashboard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && refetch && hospitalId) {
        console.log('Page became visible - refetching appointments');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, hospitalId]);

  // Live update functionality for current appointments
  useEffect(() => {
    if (activeTab !== 'current' || !refetch || !hospitalId) {
      return;
    }

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      try {
        await refetch();
      } catch (error) {
        console.error('Live update failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, refetch, hospitalId]);

  // Connection status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      if (refetch && hospitalId) {
        refetch(); // Refresh data when connection is restored
      }
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch, hospitalId]);

  // Refetch when returning from appointment booking page
  useEffect(() => {
    if (!showBooking && refetch && hospitalId) {
      console.log('Returned from appointment booking - refetching appointments');
      refetch();
    }
  }, [showBooking, refetch, hospitalId]);

  // Auto-refresh appointments every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (refetch) {
        refetch();
        console.log('Auto-refreshing appointments...');
      }
    }, 10 * 60 * 1000); // 10 minutes in milliseconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [refetch]);

  // Refetch appointments when date range changes
  useEffect(() => {
    if (refetch && (startDate || endDate)) {
      refetch();
    }
  }, [startDate, endDate, refetch]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table for better UX
    const tableElement = document.querySelector('.overflow-x-auto');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Date validation functions
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // If end date is set and is before the new start date, update end date to match start date
    if (value && endDate && new Date(value) > new Date(endDate)) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    // If start date is set and the new end date is before start date, don't allow it
    if (startDate && value && new Date(value) < new Date(startDate)) {
      // Optionally show a toast or alert here
      console.warn('Start date cannot be after end date');
      return;
    }
    setEndDate(value);
  };

  const handleCancelClick = (appointment: AppointmentDetail) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel) return;

    setIsCancelling(true);
    try {
      console.log('Cancelling appointment:', appointmentToCancel.appointmentId);

      const response = await appointmentApi.cancelAppointment({
        appointmentId: appointmentToCancel.appointmentId,
        patientId: appointmentToCancel.patientId
      });

      console.log('Cancel API response:', response);

      // Close dialog and reset state
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);

      // Invalidate appointment details queries to refresh dashboard data
      queryClient.invalidateQueries({
        queryKey: ['appointmentDetails']
      });

      // Refresh appointment data
      if (refetch) {
        refetch();
      }

      console.log('Appointment cancelled successfully - status should be CANCELLED');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      // TODO: Show error message
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  const handlePrintPrescription = (appointment: AppointmentDetail) => {
    if (!hospitalId) {
      toast({
        title: t('appointmentDashboard.toast.missingHospitalTitle'),
        description: t('appointmentDashboard.toast.missingHospitalDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (!appointment.appointmentId || !appointment.patientId || !appointment.doctorId) {
      toast({
        title: t('appointmentDashboard.toast.missingAppointmentDataTitle'),
        description: t('appointmentDashboard.toast.missingAppointmentDataDescription'),
        variant: 'destructive',
      });
      return;
    }

    setPreviewRequest({
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      hospitalId,
      doctorId: appointment.doctorId,
    });
    setPreviewModalOpen(true);
  };

  if (showBooking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBooking(false)}
              className="group flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">{t('common.back')}</span>
            </Button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">{t('appointmentDashboard.bookNewAppointment')}</h1>
          </div>
        </div>
        <AppointmentBooking refreshToken={bookingRefreshToken} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header - AdminDashboard Style */}
      <div className="px-3 sm:px-4 lg:px-6 pt-1 pb-4">
        <div className="space-y-6">

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-br from-white via-blue-50/60 to-indigo-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900 border-b border-white/70 dark:border-slate-800 rounded-2xl shadow-lg shadow-blue-100/30 dark:shadow-black/30 px-3 py-3 sm:px-6 sm:py-4">

            {/* Left: Title and Actions */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {t('appointmentDashboard.title')}
                </h1>

                <Button
                  onClick={handleBookingClick}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 rounded-full px-5 sm:px-6 h-9 sm:h-10 gap-2 ml-2 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="bg-white/20 rounded-full p-1">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="hidden sm:inline font-semibold tracking-wide">{t('appointmentDashboard.bookAppointment')}</span>
                  <span className="sm:hidden font-semibold">Book</span>
                </Button>
              </div>

              {/* Live Status Indicators */}
              {activeTab === 'current' && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300">
                    {isRefreshing ? <RefreshCw className="h-3 w-3 animate-spin text-blue-500" /> : <Activity className="h-3 w-3 text-emerald-500" />}
                    <span>{isRefreshing ? 'Updating...' : 'Live System'}</span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    {connectionStatus === 'online' ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
                    <span className={connectionStatus === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {connectionStatus === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Navigation Tabs */}
            <nav className="flex flex-wrap gap-2 bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-1 shadow-inner shadow-white/60 dark:shadow-black/40 mt-3 sm:mt-0 min-w-[220px] justify-end">
              {[
                { key: 'current', label: t('appointmentDashboard.tabs.current'), Icon: Clock, desc: 'Active Queue' },
                { key: 'past', label: t('appointmentDashboard.tabs.past'), Icon: Calendar, desc: 'History' },
                { key: 'future', label: t('appointmentDashboard.tabs.future'), Icon: CalendarDays, desc: 'Upcoming' },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                const Icon = tab.Icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`group flex-1 lg:flex-none min-w-[96px] flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 text-[12px] ${isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-xl shadow-blue-500/30'
                      : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/70'
                      } hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                      <span className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-800'}`}>
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    <span className={`hidden sm:block text-[10px] leading-snug ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'}`}>
                      {tab.desc}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
        {/* Main Content Area */}
        <div className="w-full">
          {/* KPI Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Appointments */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-100/80 via-white to-white dark:from-indigo-950/60 dark:to-gray-900 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <Calendar className="h-20 w-20 text-indigo-600 dark:text-indigo-400 -rotate-12" />
              </div>
              <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-indigo-100/80 dark:bg-indigo-900/50 rounded-xl shadow-inner ring-4 ring-indigo-50 dark:ring-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-900/60 dark:text-indigo-200/60">Total Appointments</span>
              </div>
              <div className="text-4xl font-extrabold text-indigo-900 dark:text-white relative z-10 tracking-tight ml-1">{kpiStats.total}</div>
            </div>

            {activeTab !== 'future' && (
              <>
                {/* Vitals Required (No Show for Past) */}
                <div className={`relative overflow-hidden ${activeTab === 'past' ? 'bg-gradient-to-br from-gray-100/80 via-white to-white dark:from-gray-950/60 dark:to-gray-900 border-gray-100/50 dark:border-gray-800/50' : 'bg-gradient-to-br from-rose-100/80 via-white to-white dark:from-rose-950/60 dark:to-gray-900 border-rose-100/50 dark:border-rose-800/50'} p-5 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    {activeTab === 'past' ? <UserX className="h-20 w-20 text-gray-600 dark:text-gray-400 -rotate-12" /> : <Heart className="h-20 w-20 text-rose-600 dark:text-rose-400 -rotate-12" />}
                  </div>
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className={`p-2.5 ${activeTab === 'past' ? 'bg-gray-100/80 dark:bg-gray-900/50 ring-gray-50 dark:ring-gray-900/30' : 'bg-rose-100/80 dark:bg-rose-900/50 ring-rose-50 dark:ring-rose-900/30'} rounded-xl shadow-inner ring-4 group-hover:scale-110 transition-transform duration-300`}>
                      {activeTab === 'past' ? <UserX className={`h-6 w-6 ${activeTab === 'past' ? 'text-gray-600 dark:text-gray-400' : 'text-rose-600 dark:text-rose-400'}`} /> : <Heart className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'past' ? 'text-gray-900/60 dark:text-gray-200/60' : 'text-rose-900/60 dark:text-rose-200/60'}`}>
                      {activeTab === 'past' ? 'No Show' : 'Vitals Required'}
                    </span>
                  </div>
                  <div className={`text-4xl font-extrabold ${activeTab === 'past' ? 'text-gray-900 dark:text-white' : 'text-rose-900 dark:text-white'} relative z-10 tracking-tight ml-1`}>{kpiStats.vitalsRequired}</div>
                </div>

                {/* Completed */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100/80 via-white to-white dark:from-emerald-950/60 dark:to-gray-900 p-5 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <UserCheck className="h-20 w-20 text-emerald-600 dark:text-emerald-400 -rotate-12" />
                  </div>
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className="p-2.5 bg-emerald-100/80 dark:bg-emerald-900/50 rounded-xl shadow-inner ring-4 ring-emerald-50 dark:ring-emerald-900/30 group-hover:scale-110 transition-transform duration-300">
                      <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-900/60 dark:text-emerald-200/60">Completed</span>
                  </div>
                  <div className="text-4xl font-extrabold text-emerald-900 dark:text-white relative z-10 tracking-tight ml-1">{kpiStats.completed}</div>
                </div>
              </>
            )}

            {/* Doctor Stats - Dynamically rendered */}
            {kpiStats.doctorStats.map((doc, idx) => (
              <div key={idx} className="relative overflow-hidden bg-gradient-to-br from-blue-100/80 via-white to-white dark:from-blue-950/60 dark:to-gray-900 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-800/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <User className="h-20 w-20 text-blue-600 dark:text-blue-400 -rotate-12" />
                </div>
                <div className="flex items-center gap-4 mb-3 relative z-10">
                  <div className="p-2.5 bg-blue-100/80 dark:bg-blue-900/50 rounded-xl shadow-inner ring-4 ring-blue-50 dark:ring-blue-900/30 group-hover:scale-110 transition-transform duration-300">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60 dark:text-blue-200/60 truncate max-w-[100px]" title={doc.name}>{doc.name}</span>
                </div>
                <div className="relative z-10 ml-1">
                  <div className="text-4xl font-extrabold text-blue-900 dark:text-white tracking-tight">{doc.count}</div>
                  {activeTab === 'past' && doc.noShowCount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full w-fit">
                      <UserX className="h-3 w-3" />
                      <span>No Show: {doc.noShowCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Appointments Section */}
          <div className="space-y-4">


            {/* Compact Search Bar */}
            <div className="mb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {/* Search Input */}
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('appointmentDashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>

                {/* Doctor Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appointmentDashboard.doctorLabel')}:</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-full sm:w-48 h-10">
                      <SelectValue placeholder={t('appointmentDashboard.allDoctors')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('appointmentDashboard.allDoctors')}</SelectItem>
                      {doctorOptions.map((doctor) => (
                        <SelectItem key={doctor.value} value={doctor.value}>
                          {doctor.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter - Only show for Past and Future tabs */}
                {/* Date Range Filter - Only show for Past and Future tabs */}
                {(activeTab === 'past' || activeTab === 'future') && (() => {
                  const today = new Date();

                  // Calculate Max Date for Past Tab (Yesterday)
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const maxPastDate = yesterday.toISOString().split('T')[0];

                  // Calculate Min Date for Future Tab (Tomorrow)
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const minFutureDate = tomorrow.toISOString().split('T')[0];

                  return (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appointmentDashboard.dateRange.label')}:</label>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-xs text-gray-500 dark:text-gray-400">{t('appointmentDashboard.dateRange.start')}</label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="w-full sm:w-40 h-10 text-xs"
                            placeholder={t('appointmentDashboard.dateRange.start')}
                            max={activeTab === 'past' ? maxPastDate : undefined}
                            min={activeTab === 'future' ? minFutureDate : undefined}
                          />
                        </div>
                        <span className="text-gray-400 text-sm mt-6">{t('appointmentDashboard.dateRange.to')}</span>
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-xs text-gray-500 dark:text-gray-400">{t('appointmentDashboard.dateRange.end')}</label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className="w-full sm:w-40 h-10 text-xs"
                            placeholder={t('appointmentDashboard.dateRange.end')}
                            min={startDate || (activeTab === 'future' ? minFutureDate : undefined)}
                            max={activeTab === 'past' ? maxPastDate : undefined}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Status Navigation - Only show for Current tab */}
            {activeTab === 'current' && (
              <div className="mb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: t('appointmentDashboard.statusFilters.all'), color: 'bg-gray-100 text-gray-700 border-gray-200' },
                      { key: 'VITALS_REQUIRED', label: t('appointmentDashboard.statusFilters.vitalsRequired'), color: 'bg-red-100 text-red-700 border-red-200' },
                      { key: 'READY', label: t('appointmentDashboard.statusFilters.ready'), color: 'bg-green-100 text-green-700 border-green-200' },
                      { key: 'UNDER_CONSULT', label: t('appointmentDashboard.statusFilters.underConsult'), color: 'bg-blue-100 text-blue-700 border-blue-200' },
                      { key: 'LAB_REQUIRED', label: t('appointmentDashboard.statusFilters.labRequired'), color: 'bg-orange-100 text-orange-700 border-orange-200' },
                      { key: 'AWAITING_RECONSULT', label: t('appointmentDashboard.statusFilters.awaitingReconsult'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                      { key: 'COMPLETED', label: t('appointmentDashboard.statusFilters.completed'), color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                      { key: 'CANCELLED', label: t('appointmentDashboard.statusFilters.cancelled'), color: 'bg-gray-100 text-gray-600 border-gray-300' }
                    ].map((status) => {
                      const count = appointments.filter(a => {
                        const appointmentStartDate = new Date(a.startAt);
                        const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
                        const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                        // For "all" status, count all current appointments
                        if (status.key === 'all') {
                          return appointmentDay.getTime() === todayStart.getTime();
                        }

                        // For specific status, count appointments with that status (case-insensitive)
                        return appointmentDay.getTime() === todayStart.getTime() &&
                          String(a.finalStatusCode || '').toUpperCase() === String(status.key || '').toUpperCase();
                      }).length;

                      return (
                        <button
                          key={status.key}
                          onClick={() => {
                            console.log('Status button clicked:', status.key);
                            console.log('Current selectedStatus before update:', selectedStatus);
                            setSelectedStatus(status.key);
                            setCurrentPage(1);
                            console.log('Status filter should now be:', status.key);

                            // Debug: Check what appointments exist with this status
                            const appointmentsWithThisStatus = appointments.filter(a => {
                              const appointmentStartDate = new Date(a.startAt);
                              const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
                              const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                              return appointmentDay.getTime() === todayStart.getTime() &&
                                String(a.finalStatusCode || '').toUpperCase() === String(status.key || '').toUpperCase();
                            });

                            console.log(`Appointments with status ${status.key}:`, appointmentsWithThisStatus.map(a => ({
                              patientName: a.patientFullName,
                              finalStatusCode: a.finalStatusCode
                            })));
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 hover:scale-105 ${selectedStatus === status.key
                            ? `${status.color} shadow-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-current`
                            : `${status.color} hover:opacity-80`
                            }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{status.label}</span>
                            <span className="px-1.5 py-0.5 bg-white/50 rounded-full text-xs font-bold">
                              {count}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="h-9 px-4 text-xs md:self-start mt-2 sm:mt-0"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {t('appointmentDashboard.refreshNow')}
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('appointmentDashboard.loadingAppointments')}</p>
              </div>
            )}



            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
                <div className="text-red-600 dark:text-red-400 mb-2">
                  <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">{t('appointmentDashboard.errorTitle')}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error.message || t('appointmentDashboard.errorDescription')}</p>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  {t('appointmentDashboard.tryAgain')}
                </Button>
              </div>
            )}

            {/* Current Appointments Table */}
            {!isLoading && !error && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto shadow-sm">
                  <div className="px-2 sm:px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {totalPages > 1 && `Page ${currentPage} of ${totalPages}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalPages > 1 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs px-2 py-1">
                            {currentPage}/{totalPages}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <Table className="border-collapse min-w-[700px] md:min-w-full text-xs md:text-sm">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span>{t('appointmentDashboard.table.patientId')}</span>
                              <Eye className="h-2.5 w-2.5 text-gray-400" />
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.patientName')}</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.doctorName')}</TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.tokenNo')}</TableHead>
                          {activeTab === 'current' && (
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.printToken', { defaultValue: 'Print Token' })}</TableHead>
                          )}
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">
                            {activeTab === 'past'
                              ? t('appointmentDashboard.table.lastAppointmentDate')
                              : activeTab === 'future'
                                ? t('appointmentDashboard.table.appointmentDate')
                                : t('appointmentDashboard.table.appointmentTime')}
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">
                            {activeTab === 'past'
                              ? t('appointmentDashboard.table.lastCompletedStatus')
                              : t('appointmentDashboard.table.currentStatus')}
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">
                            {t('appointmentDashboard.table.labReports', { defaultValue: 'Lab reports' })}
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">
                            {t('appointmentDashboard.table.case', { defaultValue: 'Case' })}
                          </TableHead>

                          {activeTab !== 'past' && (
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.actions')}</TableHead>
                          )}
                          <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.printPrescription')}</TableHead>
                          {activeTab === 'past' && (
                            <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-1 px-1 md:py-2 md:px-2">{t('appointmentDashboard.table.isCompleted')}</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={activeTab === 'past' ? 9 : activeTab === 'current' ? 10 : 9} className="text-center py-6">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <CalendarDays className="h-3 w-3 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-gray-900 dark:text-white font-medium text-xs">
                                    {activeTab === 'current' && t('appointmentDashboard.emptyStates.current')}
                                    {activeTab === 'past' && t('appointmentDashboard.emptyStates.past')}
                                    {activeTab === 'future' && t('appointmentDashboard.emptyStates.future')}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">{t('appointmentDashboard.emptyStates.adjustFilters')}</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentAppointments.map((appointment) => (
                            <TableRow key={appointment.appointmentId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${compactMode ? 'h-10' : 'h-12'} text-xs md:text-sm`}>
                              {/* Patient ID */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <div
                                  onClick={() => handlePatientClick(appointment)}
                                  className="group relative font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    <span>{appointment.patientId}</span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Patient Name */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <div className="min-w-0 cursor-pointer" onClick={() => handlePatientClick(appointment)}>
                                  <div className="font-medium text-gray-900 dark:text-white text-xs truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    {appointment.patientFullName}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <Phone className="h-2.5 w-2.5" />
                                    <span className="truncate">{appointment.patientMobile}</span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Doctor Name */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                {/* Laptop/Desktop: show full info, else only doctor name */}
                                <div className="hidden lg:flex items-center gap-1.5">
                                  <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <span className="text-gray-700 dark:text-gray-300 text-xs truncate">
                                    {appointment.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}
                                  </span>
                                </div>
                                <div className="lg:hidden">
                                  <span className="text-gray-700 dark:text-gray-300 text-xs truncate">
                                    {appointment.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Token No */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                                  {appointment.token?.tokenNumber || t('appointmentDashboard.actionButtons.notApplicable')}
                                </span>
                              </TableCell>

                              {/* Print Token Action */}
                              {activeTab === 'current' && (
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePrintToken(appointment)}
                                    className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full"
                                    title={t('appointmentDashboard.actionButtons.printToken', { defaultValue: 'Print Token' })}
                                  >
                                    <Tag className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}

                              {/* Appointment Time / Last Appointment Date / Appointment Date */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                {activeTab === 'past' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                                      {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                    </span>
                                  </div>
                                ) : activeTab === 'future' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                                      {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                                      {format(new Date(appointment.startAt), 'HH:mm')}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(appointment.endAt), 'HH:mm')}
                                    </span>
                                  </div>
                                )}
                              </TableCell>

                              {/* Current Status */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                {getStatusBadge(appointment.finalStatusCode, appointment)}
                              </TableCell>

                              {/* Lab reports */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                {['LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(
                                  String(appointment.finalStatusCode || '').toUpperCase()
                                ) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenLabAttachments(appointment)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                                    title={t('appointmentDashboard.actionButtons.addLabReport', { defaultValue: 'Add lab report' })}
                                  >
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
                                )}
                              </TableCell>

                              {/* Case */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5 font-medium hover:bg-blue-100">
                                  {appointment.appointmentType || 'New / Fee'}
                                </Badge>
                              </TableCell>



                              {/* Actions - Only show for current and future tabs */}
                              {activeTab !== 'past' && (
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                      className={`h-6 px-2 text-xs ${['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                        : 'text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        }`}
                                      onClick={() => handleCancelClick(appointment)}
                                    >
                                      <Ban className="h-2.5 w-2.5 mr-1" />
                                      {t('common.cancel')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                      className={`h-6 px-2 text-xs ${['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                        : 'text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                        }`}
                                      onClick={() => handleRescheduleClick(appointment)}
                                    >
                                      <CalendarClock className="h-2.5 w-2.5 mr-1" />
                                      Reschedule
                                    </Button>
                                    {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleVitalsClick(appointment)}
                                        className="h-6 px-2 text-xs text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                      >
                                        <Activity className="h-2.5 w-2.5 mr-1" />
                                        {t('appointmentDashboard.actionButtons.vitals')}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}

                              {/* Print Prescription */}
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={previewModalOpen && previewRequest?.appointmentId === appointment.appointmentId}
                                  onClick={() => handlePrintPrescription(appointment)}
                                  className="h-6 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  {previewModalOpen && previewRequest?.appointmentId === appointment.appointmentId ? (
                                    <>
                                      <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                                      {t('appointmentDashboard.actionButtons.preparing')}
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="h-2.5 w-2.5 mr-1" />
                                      {t('common.print')}
                                    </>
                                  )}
                                </Button>
                              </TableCell>

                              {/* Past Completed Status - Only show for past tab */}
                              {activeTab === 'past' && (
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-center`}>
                                  <div className="flex justify-center items-center">
                                    {appointment.finalStatusCode === 'COMPLETED' ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                      >
                                        <UserCheck className="h-2.5 w-2.5 mr-1" />
                                        {t('appointmentDashboard.actionButtons.completed')}
                                      </Button>
                                    ) : (
                                      <div className="flex items-center justify-center w-8 h-8 bg-red-200 dark:bg-red-800/40 rounded-full border-2 border-red-300 dark:border-red-600 shadow-sm">
                                        <X className="h-5 w-5 text-red-700 dark:text-red-300 font-bold" />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <CalendarDays className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-400 text-sm">No appointments found</p>
                      </div>
                    ) : (
                      currentAppointments.map((appointment) => (
                        <div key={appointment.appointmentId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
                          {/* Header: Token & Status */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold">
                                #{appointment.token?.tokenNumber || 'NA'}
                              </span>
                              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 border-gray-200">
                                {format(new Date(appointment.startAt), 'HH:mm')}
                              </Badge>
                            </div>
                            <div>
                              {getStatusBadge(appointment.finalStatusCode, appointment)}
                            </div>
                          </div>

                          {/* Patient Info */}
                          <div className="flex items-start gap-3" onClick={() => handlePatientClick(appointment)}>
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full mt-1">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                {appointment.patientFullName}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs bg-gray-50 px-1 rounded border">{appointment.patientId}</span>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {appointment.patientMobile}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Doctor Info */}
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                            <UserCheck className="h-3 w-3 text-green-600" />
                            <span className="font-medium">Dr. {appointment.doctorName || 'Not Assigned'}</span>
                          </div>

                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />

                          {/* Actions Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {activeTab !== 'past' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                onClick={() => handleCancelClick(appointment)}
                                className={`h-8 text-xs border-red-200 text-red-700 bg-red-50/50 ${['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <X className="h-3 w-3 mr-1.5" /> Cancel
                              </Button>
                            )}

                            {activeTab === 'current' && (
                              <Button variant="outline" size="sm" onClick={() => handlePrintToken(appointment)} className="h-8 text-xs border-orange-200 text-orange-700 bg-orange-50/50">
                                <Tag className="h-3 w-3 mr-1.5" /> Token
                              </Button>
                            )}

                            {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                              <Button variant="outline" size="sm" onClick={() => handleVitalsClick(appointment)} className="h-8 text-xs border-purple-200 text-purple-700 bg-purple-50/50">
                                <Heart className="h-3 w-3 mr-1.5" /> Vitals
                              </Button>
                            )}

                            <Button variant="outline" size="sm" onClick={() => handlePrintPrescription(appointment)} className="h-8 text-xs border-green-200 text-green-700 bg-green-50/50">
                              <FileText className="h-3 w-3 mr-1.5" /> Rx Print
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* User Guide */}
                  <div className="mt-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{t('appointmentDashboard.quickTip.title')}</span>
                      </div>
                      <span>
                        {t('appointmentDashboard.quickTip.description', {
                          defaultValue: 'Click on any Patient ID to view the patient\'s complete profile and medical history',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('appointmentDashboard.pagination.showing', {
                      from: startIndex + 1,
                      to: Math.min(endIndex, filteredAppointments.length),
                      total: filteredAppointments.length,
                    })}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {/* Page numbers - show more pages for better navigation */}
                      {Array.from({ length: totalPages }, (_, i) => {
                        const page = i + 1;
                        // Show first 3 pages, last 3 pages, and pages around current
                        const shouldShow =
                          page <= 3 ||
                          page >= totalPages - 2 ||
                          Math.abs(page - currentPage) <= 1;

                        if (!shouldShow) {
                          // Show ellipsis between gaps
                          if (page === 4 || page === totalPages - 3) {
                            return (
                              <PaginationItem key={`ellipsis-${page}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === currentPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vitals Form Modal */}
      {showVitalsForm && selectedPatient && (
        <VitalsForm
          patientName={selectedPatient.patientFullName}
          appointmentId={selectedPatient.appointmentId}
          patientId={selectedPatient.patientId}
          onSubmit={handleVitalsSubmit}
          onCancel={handleVitalsCancel}
          hideSkipButton={true}
        />
      )}

      {/* Token Print Modal */}


      <PrescriptionPreviewModal
        open={previewModalOpen}
        onOpenChange={handlePreviewModalChange}
        request={previewRequest}
      />

      <AttachmentsSection
        open={labAttachmentModal.open}
        onOpenChange={(open) => setLabAttachmentModal((prev) => ({ ...prev, open }))}
        trigger={null}
        attachments={labAttachments[labAttachmentModal.patientId || ''] || []}
        onChange={handleLabAttachmentsChange}
        patientId={labAttachmentModal.patientId}
        patientName={labAttachmentModal.patientName}
      />

      {/* Add Bill Modal */}
      <Dialog open={showAddBillModal} onOpenChange={handleAddBillModalChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('appointmentDashboard.addBill.title', { defaultValue: 'Add Bill' })}</DialogTitle>
            <DialogDescription>
              {t('appointmentDashboard.addBill.description', {
                defaultValue: 'Review the appointment details and proceed to add billing information.',
              })}
            </DialogDescription>
          </DialogHeader>

          {appointmentForBilling && (
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('appointmentDashboard.dialog.patient', { defaultValue: 'Patient' })}</span>
                <span className="text-right">{appointmentForBilling.patientFullName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('appointmentDashboard.table.patientId')}</span>
                <span className="text-right font-mono">{appointmentForBilling.patientId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('appointmentDashboard.table.doctorName')}</span>
                <span className="text-right">{appointmentForBilling.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('appointmentDashboard.table.appointmentTime')}</span>
                <span className="text-right">{format(new Date(appointmentForBilling.startAt), 'PPpp')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('appointmentDashboard.table.tokenNo')}</span>
                <span className="text-right font-mono">{appointmentForBilling.token?.tokenNumber || t('appointmentDashboard.actionButtons.notApplicable')}</span>
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
            <DialogTitle>{t('appointmentDashboard.dialog.cancelTitle')}</DialogTitle>
            <DialogDescription>
              {t('appointmentDashboard.dialog.cancelDescription')}
            </DialogDescription>
          </DialogHeader>
          {appointmentToCancel && (
            <div className="py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">{t('appointmentDashboard.dialog.patient')}:</span> {appointmentToCancel.patientFullName}</div>
                  <div><span className="font-medium">{t('appointmentDashboard.dialog.patientId')}:</span> {appointmentToCancel.patientId}</div>
                  <div><span className="font-medium">{t('appointmentDashboard.dialog.doctor')}:</span> {appointmentToCancel.doctorName}</div>
                  <div><span className="font-medium">{t('appointmentDashboard.dialog.appointmentId')}:</span> {appointmentToCancel.appointmentId}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDialogClose}
              disabled={isCancelling}
            >
              {t('appointmentDashboard.dialog.keepAppointment')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? t('appointmentDashboard.dialog.cancelling') : t('appointmentDashboard.dialog.confirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      <PatientProfileModal
        isOpen={showPatientProfileModal}
        onClose={() => setShowPatientProfileModal(false)}
        hospitalId={hospitalId || ''}
        patientId={patientProfileId || ''}
        patientName={patientProfileName}
      />

      <TokenPrintModal
        open={tokenPrintOpen}
        onOpenChange={setTokenPrintOpen}
        tokenData={tokenPrintData}
      />

      {appointmentToReschedule && (
        <RescheduleDialog
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          appointment={appointmentToReschedule}
          onSuccess={handleRescheduleSuccess}
          enableDoctorSelection={true}
        />
      )}
    </div>
  );
};

export default AppointmentDashboard; 
