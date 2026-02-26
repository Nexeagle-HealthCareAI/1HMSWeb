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
  HelpCircle,
  WifiOff,
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
import { DashboardQuickGuide } from './DashboardQuickGuide';
import { VitalsForm } from './VitalsForm';
import { RescheduleDialog } from './RescheduleDialog';
import { format } from 'date-fns';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useAuthStore, useAppStore } from '@/store';
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
  const [showQuickGuide, setShowQuickGuide] = useState(false);

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

  // Auto-collapse sidebar on mount for maximizing screen real estate
  const setGlobalSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);

  useEffect(() => {
    setGlobalSidebarCollapsed(true);
  }, [setGlobalSidebarCollapsed]);

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

    try {
      await refetch();
    } catch (error) {
      console.error('Manual refresh failed:', error);
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
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(today.getMonth() + 1);

    if (activeTab === 'past') {
      setStartDate(oneMonthAgo.toISOString().split('T')[0]);
      setEndDate(yesterday.toISOString().split('T')[0]);
    } else if (activeTab === 'future') {
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setEndDate(oneMonthFromNow.toISOString().split('T')[0]);
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

  // Refetch when returning from appointment booking page
  useEffect(() => {
    if (!showBooking && refetch && hospitalId) {
      console.log('Returned from appointment booking - refetching appointments');
      refetch();
    }
  }, [showBooking, refetch, hospitalId]);

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
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm relative z-10">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setShowBooking(false)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm font-semibold border border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>{t('common.back')}</span>
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{t('appointmentDashboard.bookNewAppointment')}</h1>
            </div>
          </div>
        </div>
        <AppointmentBooking refreshToken={bookingRefreshToken} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-zinc-950 px-3 sm:px-4 lg:px-6 pt-1 pb-4 gap-4 overflow-auto relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-zinc-950 dark:to-zinc-950 pointer-events-none" />

      {/* Header Container */}
      <div className="flex-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-900/5 border border-white/60 dark:border-zinc-800/60 overflow-hidden relative z-10 w-full mb-2">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-900/80 dark:via-indigo-900/80 dark:to-violet-900/80 px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-blue-500/20">

          {/* Left: Title and Actions */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                <CalendarDays className="h-6 w-6 text-blue-200" />
                {t('appointmentDashboard.title')}
              </h1>

              <Button
                onClick={handleBookingClick}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-lg shadow-black/10 rounded-full px-5 sm:px-6 h-9 sm:h-10 gap-2 ml-2 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/20 backdrop-blur-sm"
              >
                <div className="bg-white/20 rounded-full p-1">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="hidden sm:inline font-semibold tracking-wide">{t('appointmentDashboard.bookAppointment')}</span>
                <span className="sm:hidden font-semibold">Book</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickGuide(true)}
                className="bg-white/5 hover:bg-white/10 text-blue-100 border border-white/10 rounded-full h-8 sm:h-10 px-3 sm:px-4 ml-2 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{t('appointmentDashboard.quickGuide', 'Dashboard Help')}</span>
                </div>
              </Button>
            </div>

          </div>

          {/* Right: Navigation Tabs */}
          <nav className="flex flex-wrap gap-2 bg-black/20 dark:bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-inner min-w-[220px] justify-end mt-3 sm:mt-0">
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
                  className={`group flex-1 lg:flex-none min-w-[100px] flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-3 py-1.5 border transition-all duration-300 text-[12px] relative overflow-hidden ${isActive
                    ? 'bg-blue-500/20 text-white border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : 'bg-transparent border-transparent text-blue-100/70 hover:bg-white/10 hover:text-white'
                    } hover:-translate-y-0.5`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse" />}
                  <div className="flex items-center gap-1.5 text-[12px] font-bold relative z-10">
                    <span className={`p-1 rounded-lg ${isActive ? 'bg-white/20 shadow-inner' : 'bg-white/10'}`}>
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-blue-200'}`} />
                    </span>
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  <span className={`hidden sm:block text-[10px] leading-snug relative z-10 ${isActive ? 'text-blue-100' : 'text-blue-200/50'}`}>
                    {tab.desc}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full relative z-10 flex flex-col gap-6">
        {/* KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
          {/* Total Appointments */}
          <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Calendar className="h-20 w-20 text-indigo-500 -rotate-12" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 mb-3 relative z-10">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl shadow-inner ring-1 ring-indigo-500/30 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-900/70 dark:text-indigo-300/80">Total</span>
            </div>
            <div className="text-4xl font-mono font-black text-indigo-900 dark:text-white relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-violet-500 dark:group-hover:from-indigo-400 dark:group-hover:to-violet-400 transition-all">{kpiStats.total}</div>
          </div>

          {activeTab !== 'future' && (
            <>
              {/* Vitals Required (No Show for Past) */}
              <div className={`relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg ${activeTab === 'past' ? 'hover:shadow-gray-500/20' : 'hover:shadow-rose-500/20'} hover:-translate-y-1 transition-all duration-300 group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  {activeTab === 'past' ? <UserX className="h-20 w-20 text-gray-500 -rotate-12" /> : <Heart className="h-20 w-20 text-rose-500 -rotate-12" />}
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${activeTab === 'past' ? 'from-gray-500/5' : 'from-rose-500/5'} to-transparent pointer-events-none`} />
                <div className="flex items-center gap-4 mb-3 relative z-10">
                  <div className={`p-2.5 rounded-xl shadow-inner ring-1 group-hover:scale-110 transition-all duration-300 ${activeTab === 'past' ? 'bg-gray-100 dark:bg-gray-500/20 ring-gray-500/30 text-gray-600 dark:text-gray-400 group-hover:bg-gray-500 group-hover:text-white' : 'bg-rose-100 dark:bg-rose-500/20 ring-rose-500/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white'}`}>
                    {activeTab === 'past' ? <UserX className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'past' ? 'text-gray-700/80 dark:text-gray-400' : 'text-rose-900/70 dark:text-rose-300/80'}`}>
                    {activeTab === 'past' ? 'No Show' : 'Vitals Req'}
                  </span>
                </div>
                <div className={`text-4xl font-mono font-black ${activeTab === 'past' ? 'text-gray-800 dark:text-white group-hover:from-gray-600 group-hover:to-slate-500 dark:group-hover:from-gray-400 dark:group-hover:to-slate-400' : 'text-rose-900 dark:text-white group-hover:from-rose-600 group-hover:to-pink-500 dark:group-hover:from-rose-400 dark:group-hover:to-pink-400'} relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all`}>{kpiStats.vitalsRequired}</div>
              </div>

              {/* Completed */}
              <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <UserCheck className="h-20 w-20 text-emerald-500 -rotate-12" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 mb-3 relative z-10">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl shadow-inner ring-1 ring-emerald-500/30 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-900/70 dark:text-emerald-300/80">Completed</span>
                </div>
                <div className="text-4xl font-mono font-black text-emerald-900 dark:text-white relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-emerald-400 dark:group-hover:to-teal-400 transition-all">{kpiStats.completed}</div>
              </div>
            </>
          )}

          {/* Doctor Stats - Dynamically rendered */}
          {kpiStats.doctorStats.map((doc, idx) => (
            <div key={idx} className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300 group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <User className="h-20 w-20 text-cyan-500 -rotate-12" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-cyan-100 dark:bg-cyan-500/20 rounded-xl shadow-inner ring-1 ring-cyan-500/30 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 text-cyan-600 dark:text-cyan-400">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-900/70 dark:text-cyan-300/80 truncate max-w-[100px]" title={doc.name}>{doc.name}</span>
              </div>
              <div className="relative z-10 ml-1">
                <div className="text-4xl font-mono font-black text-cyan-900 dark:text-white tracking-tighter drop-shadow-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-500 dark:group-hover:from-cyan-400 dark:group-hover:to-blue-400 transition-all">{doc.count}</div>
                {activeTab === 'past' && doc.noShowCount > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-red-100 bg-red-500 dark:bg-red-600 px-2 pl-1 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)] w-fit uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
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


          {/* Compact Search Bar and Filters */}
          <div className="mb-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-xl shadow-indigo-900/5 relative z-10 w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-900/10 pointer-events-none" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap relative z-10">
              {/* Search Input */}
              <div className="relative w-full sm:w-80 lg:w-96 flex-none">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-500/70 dark:text-indigo-400" />
                <Input
                  placeholder={t('appointmentDashboard.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white/80 dark:bg-zinc-950/50 border-indigo-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 rounded-xl transition-all duration-300 shadow-inner font-medium"
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 w-full sm:w-auto flex-1">
                {/* Doctor Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold uppercase tracking-widest text-indigo-900/60 dark:text-indigo-200/60 whitespace-nowrap">{t('appointmentDashboard.doctorLabel')}</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-full sm:w-48 h-10 bg-white/80 dark:bg-zinc-950/50 border-indigo-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 rounded-xl transition-all duration-300 shadow-inner font-medium">
                      <SelectValue placeholder={t('appointmentDashboard.allDoctors')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-indigo-100/50 dark:border-zinc-800 backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 shadow-xl">
                      <SelectItem value="all" className="font-medium cursor-pointer rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/30">{t('appointmentDashboard.allDoctors')}</SelectItem>
                      {doctorOptions.map((doctor) => (
                        <SelectItem key={doctor.value} value={doctor.value} className="font-medium cursor-pointer rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/30">
                          {doctor.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto relative px-4 sm:border-l border-indigo-100/50 dark:border-zinc-800/50">
                      <label className="text-xs font-bold uppercase tracking-widest text-indigo-900/60 dark:text-indigo-200/60 whitespace-nowrap hidden sm:block">{t('appointmentDashboard.dateRange.label')}</label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="w-full sm:w-36 h-10 bg-white/80 dark:bg-zinc-950/50 border-indigo-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 rounded-xl transition-all duration-300 shadow-inner text-xs font-mono font-bold"
                            max={activeTab === 'past' ? maxPastDate : undefined}
                            min={activeTab === 'future' ? minFutureDate : undefined}
                          />
                        </div>
                        <span className="text-gray-400 font-medium px-1">-</span>
                        <div className="relative w-full">
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className="w-full sm:w-36 h-10 bg-white/80 dark:bg-zinc-950/50 border-indigo-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 rounded-xl transition-all duration-300 shadow-inner text-xs font-mono font-bold"
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
          </div>

          {/* Status Navigation - Only show for Current tab */}
          {activeTab === 'current' && (
            <div className="mb-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-2 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: t('appointmentDashboard.statusFilters.all'), color: 'bg-slate-100 text-slate-700 border-slate-200/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 hover:bg-slate-200' },
                    { key: 'VITALS_REQUIRED', label: t('appointmentDashboard.statusFilters.vitalsRequired'), color: 'bg-rose-100 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50 hover:bg-rose-200' },
                    { key: 'READY', label: t('appointmentDashboard.statusFilters.ready'), color: 'bg-green-100 text-green-700 border-green-200/50 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 hover:bg-green-200' },
                    { key: 'UNDER_CONSULT', label: t('appointmentDashboard.statusFilters.underConsult'), color: 'bg-blue-100 text-blue-700 border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50 hover:bg-blue-200' },
                    { key: 'LAB_REQUIRED', label: t('appointmentDashboard.statusFilters.labRequired'), color: 'bg-orange-100 text-orange-700 border-orange-200/50 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50 hover:bg-orange-200' },
                    { key: 'AWAITING_RECONSULT', label: t('appointmentDashboard.statusFilters.awaitingReconsult'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200/50 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50 hover:bg-yellow-200' },
                    { key: 'COMPLETED', label: t('appointmentDashboard.statusFilters.completed'), color: 'bg-emerald-100 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50 hover:bg-emerald-200' },
                    { key: 'CANCELLED', label: t('appointmentDashboard.statusFilters.cancelled'), color: 'bg-gray-100 text-gray-600 border-gray-300/50 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50 hover:bg-gray-200' }
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
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-300 ${selectedStatus === status.key
                          ? `${status.color.replace('hover:bg-', '')} shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-2 ring-offset-2 ring-offset-white/50 dark:ring-offset-zinc-900/50 ring-current scale-[1.02]`
                          : `${status.color} opacity-80 hover:opacity-100 hover:scale-105 hover:shadow-md`
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{status.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-inner backdrop-blur-sm ${selectedStatus === status.key ? 'bg-white/60 dark:bg-black/30' : 'bg-white/40 dark:bg-black/20'}`}>
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
              <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 rounded-2xl overflow-x-auto shadow-xl shadow-indigo-900/5 relative z-10">
                <div className="px-2 sm:px-4 py-2.5 border-b border-indigo-100/50 dark:border-zinc-800/50 bg-gradient-to-r from-indigo-50/30 to-transparent dark:from-indigo-900/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div>
                      <p className="text-xs font-bold text-indigo-900/60 dark:text-indigo-200/60 uppercase tracking-widest">
                        {totalPages > 1 && `Page ${currentPage} of ${totalPages}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalPages > 1 && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50 text-xs px-2 py-1 shadow-sm">
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
                      <TableRow className="bg-indigo-50/50 dark:bg-indigo-900/20 backdrop-blur-md hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 border-b border-indigo-100/50 dark:border-zinc-800/50">
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase">
                          <div className="flex items-center gap-1.5 drop-shadow-sm">
                            <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{t('appointmentDashboard.table.patientId')}</span>
                            <Eye className="h-3 w-3 text-indigo-400/50" />
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.patientName')}</TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.doctorName')}</TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.tokenNo')}</TableHead>
                        {activeTab === 'current' && (
                          <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.printToken', { defaultValue: 'Print Token' })}</TableHead>
                        )}
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">
                          {activeTab === 'past'
                            ? t('appointmentDashboard.table.lastAppointmentDate')
                            : activeTab === 'future'
                              ? t('appointmentDashboard.table.appointmentDate')
                              : t('appointmentDashboard.table.appointmentTime')}
                        </TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">
                          {activeTab === 'past'
                            ? t('appointmentDashboard.table.lastCompletedStatus')
                            : t('appointmentDashboard.table.currentStatus')}
                        </TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">
                          {t('appointmentDashboard.table.labReports', { defaultValue: 'Lab reports' })}
                        </TableHead>
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">
                          {t('appointmentDashboard.table.case', { defaultValue: 'Case' })}
                        </TableHead>

                        {activeTab !== 'past' && (
                          <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.actions')}</TableHead>
                        )}
                        <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.printPrescription')}</TableHead>
                        {activeTab === 'past' && (
                          <TableHead className="font-bold text-indigo-900 dark:text-indigo-100 text-xs py-2 px-2 tracking-wide uppercase drop-shadow-sm">{t('appointmentDashboard.table.isCompleted')}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={activeTab === 'past' ? 9 : activeTab === 'current' ? 10 : 9} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shadow-inner">
                                <CalendarDays className="h-6 w-6 text-indigo-400 dark:text-indigo-500" />
                              </div>
                              <div>
                                <p className="text-indigo-900 dark:text-white font-bold text-sm tracking-wide">
                                  {activeTab === 'current' && t('appointmentDashboard.emptyStates.current')}
                                  {activeTab === 'past' && t('appointmentDashboard.emptyStates.past')}
                                  {activeTab === 'future' && t('appointmentDashboard.emptyStates.future')}
                                </p>
                                <p className="text-indigo-600/70 dark:text-indigo-400/70 text-xs font-medium mt-1">{t('appointmentDashboard.emptyStates.adjustFilters')}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentAppointments.map((appointment) => (
                          <TableRow key={appointment.appointmentId} className={`group hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all border-b border-indigo-50 dark:border-zinc-800/50 ${compactMode ? 'h-10' : 'h-12'} text-xs md:text-sm relative hover:shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]`}>
                            {/* Patient ID */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div
                                onClick={() => handlePatientClick(appointment)}
                                className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-indigo-100 dark:border-zinc-700 px-2 py-1 rounded shadow-sm text-[10px] sm:text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all hover:scale-105"
                              >
                                <User className="h-3 w-3" />
                                <span>{appointment.patientId}</span>
                              </div>
                            </TableCell>

                            {/* Patient Name */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div className="min-w-0 cursor-pointer" onClick={() => handlePatientClick(appointment)}>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors drop-shadow-sm">
                                  {appointment.patientFullName?.split('-')[0].trim()}
                                </div>
                                {appointment.patientFullName?.includes('-') && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                                    {appointment.patientFullName.split('-').slice(1).join('-').trim()}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                  <Phone className="h-2.5 w-2.5 text-indigo-400" />
                                  <span className="truncate">{appointment.patientMobile}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Doctor Name */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner border border-white/50 dark:border-transparent">
                                  <User className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-300" />
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 text-xs truncate font-semibold">
                                  {appointment.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}
                                </span>
                              </div>
                            </TableCell>

                            {/* Token No */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <span className="font-mono bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm">
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
                                  className="h-8 w-8 p-0 text-orange-600 hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-500 hover:text-white dark:hover:from-orange-600 dark:hover:text-white rounded-full transition-all shadow-sm hover:shadow-orange-500/30"
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
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                                    {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              ) : activeTab === 'future' ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                                    {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-fit">
                                    {format(new Date(appointment.startAt), 'HH:mm')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium px-1">
                                    {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              )}
                            </TableCell>

                            {/* Current Status */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <span className="scale-[0.85] origin-left inline-block">{getStatusBadge(appointment.finalStatusCode, appointment)}</span>
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
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-500 hover:text-white dark:hover:from-blue-600 dark:hover:text-white rounded-full transition-all shadow-sm hover:shadow-blue-500/30"
                                  title={t('appointmentDashboard.actionButtons.addLabReport', { defaultValue: 'Add lab report' })}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-[11px] text-slate-300 dark:text-slate-600 font-bold">—</span>
                              )}
                            </TableCell>

                            {/* Case */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-[10px] px-2 py-0.5 font-bold shadow-sm">
                                {appointment.appointmentType || 'New / Fee'}
                              </Badge>
                            </TableCell>



                            {/* Actions - Only show for current and future tabs */}
                            {activeTab !== 'past' && (
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                    className={`h-7 px-2.5 text-xs font-bold transition-all duration-300 ${['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)
                                      ? 'text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-900/20'
                                      : 'text-rose-600 border-rose-200 dark:border-rose-800/50 hover:bg-gradient-to-r hover:from-rose-50 hover:to-red-50 dark:hover:from-rose-900/20 dark:hover:to-red-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-rose-300 dark:hover:border-rose-700'
                                      }`}
                                    onClick={() => handleCancelClick(appointment)}
                                  >
                                    <Ban className="h-3 w-3 mr-1.5 opacity-80" />
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                    className={`h-7 px-2.5 text-xs font-bold transition-all duration-300 ${['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)
                                      ? 'text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-900/20'
                                      : 'text-indigo-600 border-indigo-200 dark:border-indigo-800/50 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-900/20 dark:hover:to-blue-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-indigo-300 dark:hover:border-indigo-700'
                                      }`}
                                    onClick={() => handleRescheduleClick(appointment)}
                                  >
                                    <CalendarClock className="h-3 w-3 mr-1.5 opacity-80" />
                                    Reschedule
                                  </Button>
                                  {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleVitalsClick(appointment)}
                                      className="h-7 px-2.5 text-xs font-bold text-fuchsia-600 border-fuchsia-200 dark:border-fuchsia-800/50 hover:bg-gradient-to-r hover:from-fuchsia-50 hover:to-purple-50 dark:hover:from-fuchsia-900/20 dark:hover:to-purple-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-all duration-300"
                                    >
                                      <Activity className="h-3 w-3 mr-1.5 opacity-80" />
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
                                className="h-7 px-2.5 text-xs font-bold text-emerald-600 border-emerald-200 dark:border-emerald-800/50 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300"
                              >
                                {previewModalOpen && previewRequest?.appointmentId === appointment.appointmentId ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    {t('appointmentDashboard.actionButtons.preparing')}
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3 mr-1.5 opacity-80" />
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
                                      className="h-7 px-2.5 text-xs font-bold text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 shadow-inner"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1.5" />
                                      {t('appointmentDashboard.actionButtons.completed')}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center justify-center w-8 h-8 bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-300 dark:border-rose-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] rounded-full">
                                      <X className="h-4 w-4 text-rose-700 dark:text-rose-300 font-black" />
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
                <div className="md:hidden space-y-4">
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-inner">
                      <CalendarDays className="h-10 w-10 text-indigo-300 dark:text-indigo-700 mx-auto mb-3 opacity-50" />
                      <p className="text-indigo-900/70 dark:text-indigo-200/70 text-sm font-bold tracking-wide">No appointments found</p>
                    </div>
                  ) : (
                    currentAppointments.map((appointment) => (
                      <div key={appointment.appointmentId} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/50 dark:border-zinc-800/50 rounded-2xl shadow-lg shadow-indigo-900/5 p-4 space-y-4 relative overflow-hidden group">
                        {/* Shimmer Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 pointer-events-none opacity-50" />

                        {/* Header: Token & Status */}
                        <div className="flex justify-between items-start relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
                              #{appointment.token?.tokenNumber || 'NA'}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-slate-50/80 text-slate-600 border-slate-200 shadow-inner font-mono font-bold dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700">
                              {format(new Date(appointment.startAt), 'HH:mm')}
                            </Badge>
                          </div>
                          <div>
                            <span className="scale-90 origin-right inline-block shadow-sm rounded-full">{getStatusBadge(appointment.finalStatusCode, appointment)}</span>
                          </div>
                        </div>

                        {/* Patient Info */}
                        <div className="flex items-start gap-3 relative z-10" onClick={() => handlePatientClick(appointment)}>
                          <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-2.5 rounded-xl shadow-inner border border-white dark:border-slate-700 mt-1">
                            <User className="h-5 w-5 text-slate-500 dark:text-slate-400 drop-shadow-sm" />
                          </div>
                          <div>
                            <div className="font-black text-slate-800 dark:text-slate-100 text-[15px] drop-shadow-sm">
                              {appointment.patientFullName}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2.5 mt-1.5">
                              <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-inner text-indigo-600 dark:text-indigo-400">{appointment.patientId}</span>
                              <div className="flex items-center gap-1 font-medium bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                                <Phone className="h-3 w-3 text-indigo-400" />
                                {appointment.patientMobile}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 dark:from-cyan-900/20 dark:to-blue-900/20 p-2.5 rounded-xl border border-white/50 dark:border-zinc-800/50 shadow-sm relative z-10">
                          <UserCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="font-bold tracking-wide">Dr. {appointment.doctorName || 'Not Assigned'}</span>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-indigo-100 dark:via-zinc-800 to-transparent my-3 opacity-50" />

                        {/* Actions Grid */}
                        <div className="grid grid-cols-2 gap-2.5 relative z-10">
                          {activeTab !== 'past' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                              onClick={() => handleCancelClick(appointment)}
                              className={`h-9 text-xs font-bold rounded-xl transition-all shadow-sm ${['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode) ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : 'border-rose-200 text-rose-700 bg-white hover:bg-rose-50 hover:border-rose-300'}`}
                            >
                              <X className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Cancel
                            </Button>
                          )}

                          {activeTab === 'current' && (
                            <Button variant="outline" size="sm" onClick={() => handlePrintToken(appointment)} className="h-9 text-xs font-bold rounded-xl border-orange-200 text-orange-700 bg-white hover:bg-orange-50 hover:border-orange-300 transition-all shadow-sm">
                              <Tag className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Token
                            </Button>
                          )}

                          {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                            <Button variant="outline" size="sm" onClick={() => handleVitalsClick(appointment)} className="h-9 text-xs font-bold rounded-xl border-fuchsia-200 text-fuchsia-700 bg-white hover:bg-fuchsia-50 hover:border-fuchsia-300 transition-all shadow-sm">
                              <Heart className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Vitals
                            </Button>
                          )}

                          <Button variant="outline" size="sm" onClick={() => handlePrintPrescription(appointment)} className="h-9 text-xs font-bold rounded-xl border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm">
                            <FileText className="h-3.5 w-3.5 mr-1.5 opacity-80" /> Rx Print
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
            <div className="px-4 py-3 border-t border-indigo-100/50 dark:border-zinc-800/50 bg-indigo-50/30 dark:bg-indigo-900/10 backdrop-blur-md rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-200/60 uppercase tracking-widest">
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
      )
      }

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

      {
        appointmentToReschedule && (
          <RescheduleDialog
            open={showRescheduleDialog}
            onOpenChange={setShowRescheduleDialog}
            appointment={appointmentToReschedule}
            onSuccess={handleRescheduleSuccess}
            enableDoctorSelection={true}
          />
        )
      }
      <DashboardQuickGuide
        open={showQuickGuide}
        onOpenChange={setShowQuickGuide}
      />
    </div >
  );
};

export default AppointmentDashboard; 
