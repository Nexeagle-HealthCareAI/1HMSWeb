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
  Printer
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
import { ArrowUp, Minimize2, Maximize2 } from 'lucide-react';

import { AppointmentBooking } from './AppointmentBooking';
import { VitalsForm } from './VitalsForm';
import { TokenPrintModal } from './TokenPrintModal';
import { PatientOverview } from '@/features/patient/components/PatientOverview';
import { format } from 'date-fns';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

import { AppointmentDetail, appointmentApi } from '../services/appointmentApi';

export const AppointmentDashboard = () => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showBooking, setShowBooking] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showTokenPrint, setShowTokenPrint] = useState(false);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AppointmentDetail | null>(null);
  const [selectedAppointmentForToken, setSelectedAppointmentForToken] = useState<AppointmentDetail | null>(null);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<AppointmentDetail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [compactMode, setCompactMode] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentDetail | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const getStatusBadge = (status: AppointmentDetail['finalStatusCode'], appointment?: AppointmentDetail) => {
    switch (status) {
      case 'VITALS_REQUIRED':
        return (
          <Badge 
            className="bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            Vitals
          </Badge>
        );
      case 'READY':
        return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5 font-medium">Ready</Badge>;
      case 'UNDER_CONSULT':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5 font-medium">Consulting</Badge>;
      case 'LAB_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 font-medium">Lab</Badge>;
      case 'AWAITING_RECONSULT':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1.5 py-0.5 font-medium">Reconsult</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 font-medium">Done</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5 font-medium">Scheduled</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-50 text-gray-600 border-gray-300 text-xs px-1.5 py-0.5 font-medium">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{status}</Badge>;
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

  const handleTokenPrintClick = (appointment: AppointmentDetail) => {
    setSelectedAppointmentForToken(appointment);
    setShowTokenPrint(true);
  };

  const handlePatientIdClick = (appointment: AppointmentDetail) => {
    setSelectedPatientForProfile(appointment);
    setShowPatientProfile(true);
  };

  const handleTokenPrintClose = () => {
    setShowTokenPrint(false);
    setSelectedAppointmentForToken(null);
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

  // Debug logging
  console.log('AppointmentDashboard Debug:', {
    hospitalId,
    startDate,
    endDate,
    activeTab,
    appointmentData,
    appointments: appointments.length,
    isLoading,
    error,
    // Log first few appointments to see data structure
    sampleAppointments: appointments.slice(0, 3).map(apt => ({
      id: apt.appointmentId,
      patientName: apt.patientFullName,
      startAt: apt.startAt,
      appointmentDate: apt.appointmentDate,
      finalStatusCode: apt.finalStatusCode
    }))
  });

  const filteredAppointments = useMemo(() => {
    console.log('🔄 FILTERING STARTED - useMemo triggered');
    console.log('Filter parameters:', { selectedStatus, activeTab, searchTerm, selectedDoctor });
    
    if (!appointments || appointments.length === 0) return [];
    
    const today = new Date(); // Use actual current date
    
    // If no appointments, return empty array
    if (appointments.length === 0) {
      console.log('No appointments to filter');
      return [];
    }
    
    console.log('Filtering appointments:', {
      totalAppointments: appointments.length,
      activeTab,
      selectedStatus,
      searchTerm,
      selectedDoctor,
      startDate,
      endDate,
      today: today.toDateString()
    });
    
    console.log('Current selectedStatus in filter:', selectedStatus, 'Type:', typeof selectedStatus);
    
    const filtered = appointments.filter(appointment => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        appointment.patientFullName.toLowerCase().includes(searchLower) ||
        appointment.patientId.toLowerCase().includes(searchLower) ||
        (appointment.doctorName && appointment.doctorName.toLowerCase().includes(searchLower)) ||
        appointment.patientMobile.includes(searchTerm)
      );
      
      const matchesDoctor = selectedDoctor === 'all' || appointment.doctorName === selectedDoctor;
      
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
      
      // Filter by date range if on past or future tab
      let matchesDateRange = true;
      if (activeTab === 'past' || activeTab === 'future') {
        const appointmentStartDate = new Date(appointment.startAt);
        // Reset time to start of day for accurate date comparison
        const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
        
        if (startDate) {
          const startDateObj = new Date(startDate);
          const startDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
          if (startDay > appointmentDay) {
            matchesDateRange = false;
          }
        }
        if (endDate) {
          const endDateObj = new Date(endDate);
          const endDay = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());
          if (endDay < appointmentDay) {
            matchesDateRange = false;
          }
        }
      }
      
      // Filter by appointment type based on active tab
      // Use startAt for more accurate date comparison since it includes time
      const appointmentStartDate = new Date(appointment.startAt);
      let matchesType = false;
      
      // Reset time to start of day for accurate date comparison
      const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (activeTab) {
      case 'current':
          matchesType = appointmentDay.getTime() === todayStart.getTime();
          break;
      case 'past':
          matchesType = appointmentDay < todayStart;
          break;
      case 'future':
          matchesType = appointmentDay > todayStart;
          break;
      default:
          matchesType = true;
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
     if (filtered.length === 0 && appointments.length > 0) {
       console.warn('No appointments match current filters, showing all appointments for debugging');
       console.log('Filter debug info:', {
         activeTab,
         selectedStatus,
         searchTerm,
         selectedDoctor,
         startDate,
         endDate,
         totalAppointments: appointments.length,
         sampleAppointments: appointments.slice(0, 3).map(a => ({
           patientName: a.patientFullName,
           status: a.finalStatusCode,
           startAt: a.startAt
         }))
       });
       
       // Additional debug: Check what appointments exist with the selected status
       if (activeTab === 'current' && selectedStatus !== 'all') {
         const appointmentsWithStatus = appointments.filter(a => {
           const appointmentStartDate = new Date(a.startAt);
           const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
           const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
           return appointmentDay.getTime() === todayStart.getTime() && 
                  String(a.finalStatusCode || '').toUpperCase() === String(selectedStatus || '').toUpperCase();
         });
         
         console.log('Appointments with selected status:', {
           selectedStatus,
           count: appointmentsWithStatus.length,
           appointments: appointmentsWithStatus.map(a => ({
             patientName: a.patientFullName,
             status: a.finalStatusCode,
             startAt: a.startAt
           }))
         });
       }
       
       return appointments.sort((a, b) => {
         const timeA = new Date(a.startAt).getTime();
         const timeB = new Date(b.startAt).getTime();
         return timeA - timeB;
       });
     }

    // Sort by appointment time in increasing order
    const sortedFiltered = filtered.sort((a, b) => {
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      return timeA - timeB;
    });
    
    console.log('✅ FILTERING COMPLETED');
    console.log('Final filtered result:', {
      totalFiltered: sortedFiltered.length,
      selectedStatus,
      activeTab,
      filteredAppointments: sortedFiltered.map(a => ({
        patientName: a.patientFullName,
        finalStatusCode: a.finalStatusCode
      }))
    });
    
    return sortedFiltered;
  }, [searchTerm, selectedDoctor, selectedStatus, startDate, endDate, activeTab, appointments]);

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

  if (showBooking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBooking(false)}
              className="group flex items-center gap-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <span className="text-gray-700 dark:text-gray-200 font-medium">Back</span>
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Book New Appointment</h1>
          </div>
        </div>
        <AppointmentBooking />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Appointment Dashboard</h1>
              <Button 
            variant="outline"
                onClick={() => setShowBooking(true)} 
            className="group flex items-center gap-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
              >
            <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform group-hover:translate-x-1" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">Book Appointment</span>
              </Button>
          </div>
        </div>                

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Main Content Area */}
        <div className="w-full">
          {/* Current Appointments Section */}
          <div className="space-y-4">
            {/* Appointment Type Tabs */}
            <div className="mb-4">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                 {[
                   { key: 'current', label: 'Current Appointments' },
                   { key: 'past', label: 'Past Appointments' },
                   { key: 'future', label: 'Future Appointments' }
                 ].map((tab) => (
                   <button
                     key={tab.key}
                     onClick={() => setActiveTab(tab.key as 'current' | 'past' | 'future')}
                     className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                       activeTab === tab.key
                         ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                         : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                     }`}
                   >
                     <span>{tab.label}</span>
                   </button>
                 ))}
            </div>
                    </div>
                    
            {/* Compact Search Bar */}
            <div className="mb-4">
              <div className="flex items-center gap-4">
                {/* Search Input */}
                <div className="relative max-w-md">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                    placeholder="Search patients, ID, or doctor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                          />
                      </div>
                      
                {/* Doctor Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Doctor:</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-48 h-10">
                            <SelectValue placeholder="All Doctors" />
                          </SelectTrigger>
                          <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {Array.from(new Set(appointments.map(a => a.doctorName).filter(Boolean))).map((doctor) => (
                        <SelectItem key={doctor} value={doctor || ''}>
                          {doctor}
                        </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                  </div>

                {/* Date Range Filter - Only show for Past and Future tabs */}
                {(activeTab === 'past' || activeTab === 'future') && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Start Date</label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="w-40 h-10 text-xs"
                          placeholder="Start Date"
                        />
                      </div>
                      <span className="text-gray-400 text-sm mt-6">to</span>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">End Date</label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="w-40 h-10 text-xs"
                          placeholder="End Date"
                          min={startDate || undefined}
                        />
                    </div>
                        </div>
                        </div>
                )}
                  </div>
                  </div>

                         {/* Status Navigation - Only show for Current tab */}
             {activeTab === 'current' && (
               <div className="mb-4">
                 <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                    { key: 'VITALS_REQUIRED', label: 'Vitals Required', color: 'bg-red-100 text-red-700 border-red-200' },
                    { key: 'READY', label: 'Ready', color: 'bg-green-100 text-green-700 border-green-200' },
                    { key: 'UNDER_CONSULT', label: 'Under Consult', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                    { key: 'LAB_REQUIRED', label: 'Lab Required', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                    { key: 'AWAITING_RECONSULT', label: 'Awaiting Reconsult', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                    { key: 'COMPLETED', label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                    { key: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-300' }
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
                         className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 hover:scale-105 ${
                           selectedStatus === status.key
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
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading appointments...</p>
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
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading appointments</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error.message || 'Failed to load appointments'}</p>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  Try Again
                </Button>
                </div>
            )}

            {/* Current Appointments Table */}
            {!isLoading && !error && (
              <div className="space-y-4">
               <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <div className="flex items-center justify-between">
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
                
                <div className="overflow-x-auto">
                    <Table className="border-collapse">
                                        <TableHeader>
                         <TableRow className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Patient ID</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Patient Name</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Doctor Name</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Token No</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">
                             {activeTab === 'past' ? 'Last Appointment Date' : activeTab === 'future' ? 'Appointment Date' : 'Appointment Time'}
                           </TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">
                             {activeTab === 'past' ? 'Last Completed Status' : 'Current Status'}
                           </TableHead>
                           {activeTab !== 'past' && (
                             <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Actions</TableHead>
                           )}
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Print Prescription</TableHead>
                                                       <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">
                              {activeTab === 'past' ? 'Next FollowUp Date' : 'Print Token'}
                            </TableHead>
                            {activeTab === 'past' && (
                              <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">IsCompleted</TableHead>
                            )}
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                                                           <TableCell colSpan={activeTab === 'past' ? 9 : 9} className="text-center py-6">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <CalendarDays className="h-3 w-3 text-gray-400" />
                              </div>
                              <div>
                                  <p className="text-gray-900 dark:text-white font-medium text-xs">
                                    {activeTab === 'current' && 'No current appointments found'}
                                    {activeTab === 'past' && 'No past appointments found'}
                                    {activeTab === 'future' && 'No future appointments found'}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Try adjusting your search terms or doctor filter</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                                                     currentAppointments.map((appointment) => (
                             <TableRow key={appointment.appointmentId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${compactMode ? 'h-10' : 'h-12'}`}>
                               {/* Patient ID */}
                               <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                 <button
                                   onClick={() => handlePatientIdClick(appointment)}
                                   className="font-mono bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                 >
                                {appointment.patientId}
                                 </button>
                               </TableCell>
                               
                               {/* Patient Name */}
                               <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                 <div className="min-w-0">
                                   <div className="font-medium text-gray-900 dark:text-white text-xs truncate">
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
                                 <div className="flex items-center gap-1.5">
                                   <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                     <User className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                </div>
                                   <span className="text-gray-700 dark:text-gray-300 text-xs truncate">
                                     {appointment.doctorName || 'Not Assigned'}
                                   </span>
                              </div>
                            </TableCell>
                               
                                                                                               {/* Token No */}
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                  <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                                    {appointment.token?.tokenNumber || 'N/A'}
                                  </span>
                                </TableCell>
                                
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
                               
                                                               {/* Actions - Only show for current and future tabs */}
                                {activeTab !== 'past' && (
                                  <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                    <div className="flex gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                       disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                       className={`h-6 px-2 text-xs ${
                                         ['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)
                                           ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                           : 'text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                       }`}
                                       onClick={() => handleCancelClick(appointment)}
                                     >
                                       <X className="h-2.5 w-2.5 mr-1" />
                                      Cancel
                                    </Button>
                                    {appointment.finalStatusCode === 'VITALS_REQUIRED' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                        onClick={() => handleVitalsClick(appointment)}
                                        className="h-6 px-2 text-xs text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    >
                                        <Heart className="h-2.5 w-2.5 mr-1" />
                                        Vitals
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
                                   className="h-6 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                   <FileText className="h-2.5 w-2.5 mr-1" />
                                Print
                              </Button>
                            </TableCell>
                               
                                                               {/* Print Token / Next Meet Required */}
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                  {activeTab === 'past' ? (
                                    <div className="text-center">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">NA</span>
                                </div>
                                  ) : (
                          <Button
                            variant="outline"
                            size="sm"
                                      onClick={() => handleTokenPrintClick(appointment)}
                                      className="h-6 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                                      <Printer className="h-2.5 w-2.5 mr-1" />
                                  Print
                          </Button>
                        )}
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
                                          Completed
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
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
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
       {showTokenPrint && selectedAppointmentForToken && (
         <TokenPrintModal
           appointment={selectedAppointmentForToken}
           isOpen={showTokenPrint}
           onClose={handleTokenPrintClose}
        />
      )}

      {/* Patient Profile Modal */}
      {showPatientProfile && selectedPatientForProfile && (
        <Dialog open={showPatientProfile} onOpenChange={setShowPatientProfile}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Profile - {selectedPatientForProfile.patientFullName}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <PatientOverview
                patient={{
                  id: selectedPatientForProfile.patientId,
                  name: selectedPatientForProfile.patientFullName,
                  age: 0, // Default value, would need to be fetched from API
                  gender: 'Unknown', // Default value, would need to be fetched from API
                  phone: selectedPatientForProfile.patientMobile || '',
                  email: '', // Default value, would need to be fetched from API
                  address: '', // Default value, would need to be fetched from API
                  bloodGroup: '', // Default value, would need to be fetched from API
                  emergencyContact: '', // Default value, would need to be fetched from API
                  medicalHistory: [], // Default value, would need to be fetched from API
                  allergies: [], // Default value, would need to be fetched from API
                  currentMedications: [] // Default value, would need to be fetched from API
                }}
                appointments={[]} // Default value, would need to be fetched from API
                prescriptions={[]} // Default value, would need to be fetched from API
                labTests={[]} // Default value, would need to be fetched from API
                vitalSigns={[]} // Default value, would need to be fetched from API
                onNavigateToTimeline={() => {}} // Placeholder function
                        />
                      </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {appointmentToCancel && (
            <div className="py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Patient:</span> {appointmentToCancel.patientFullName}</div>
                  <div><span className="font-medium">Patient ID:</span> {appointmentToCancel.patientId}</div>
                  <div><span className="font-medium">Doctor:</span> {appointmentToCancel.doctorName}</div>
                  <div><span className="font-medium">Appointment ID:</span> {appointmentToCancel.appointmentId}</div>
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
              Keep Appointment
                        </Button>
                                  <Button 
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
                                  </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDashboard; 
