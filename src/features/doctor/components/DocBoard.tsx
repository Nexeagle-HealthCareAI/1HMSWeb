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
import { format, subDays, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';
import { PrescriptionEditor } from './prescription/PrescriptionEditor';
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
  finalStatusCode: 'VITALS_REQUIRED' | 'READY' | 'UNDER_CONSULT' | 'LAB_REQUIRED' | 'AWAITING_RECONSULT' | 'COMPLETED' | 'SCHEDULED' | 'CANCELLED';
  phone?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { hospitalId,userId: authUserId, employeeId } = useAuthStore();
  const queryClient = useQueryClient();  
  
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
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);

  // Get user ID for doctor profile API call - try multiple sources
  const userId =  authUserId ||'';
  
  
  // Get doctor profile to extract doctorId
  const { data: doctorProfileResponse, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorProfile(userId);
  const doctorId = doctorProfileResponse?.doctorId || '';
  // Doctor profile loaded
  // Get appointment details based on active tab and date range - memoized to prevent unnecessary recalculations
  const { startDate: apiStartDate, endDate: apiEndDate } = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    let result;
    switch (activeTab) {
      case 'current':
        result = { startDate: today, endDate: today };
        break;
      case 'past':
        result = { startDate: startDate || yesterday, endDate: endDate || today };
        break;
      case 'future':
        result = { startDate: startDate || tomorrow, endDate: endDate || tomorrow };
        break;
      default:
        result = { startDate: today, endDate: today };
    }
    
    // Date range calculated
    
    return result;
  }, [activeTab, startDate, endDate]);
  
  // Debug API call parameters
  const appointmentApiEnabled = !!hospitalId && !!doctorId && !doctorProfileLoading;
  
  // API call parameters are now stable
  
  const { data: appointmentData, isLoading: appointmentLoading, error: appointmentError, refetch } = useDoctorAppointmentDetails({
    status: 'ALL',
    startDate: apiStartDate,
    endDate: apiEndDate,
    hospitalId: hospitalId || '',
    doctorId: doctorId,
    enabled: appointmentApiEnabled
  });
  
  // Transform API data to match component expectations
  const appointments: PatientAppointment[] = appointmentData?.items?.map(item => ({
    appointmentId: item.appointmentId,
    patientFullName: item.patientFullName,
    patientId: item.patientId,
    doctorName: 'Dr. Unknown',
    tokenDetails: { tokenNumber: item.tokenDetails?.tokenNumber || 0 },
    startAt: item.startAt,
    endAt: item.endAt,
    finalStatusCode: item.finalStatusCode as any,
    phone: item.patientMobile
  })) || [];
  
  // Combined loading and error states
  const isDataLoading = doctorProfileLoading || appointmentLoading;
  const hasError = doctorProfileError || appointmentError;
  const shouldShowError = hasError && !isDataLoading;

  // Removed auto-refresh useEffect hooks to prevent API call loops


  

  // Set default dates for past and future tabs
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

  // Filter appointments based on active tab and search
  const filteredAppointments = useMemo(() => {
    
    let filtered = appointments;
    
    // Filter by tab
    if (activeTab === 'past') {
      filtered = filtered.filter(apt => 
        new Date(apt.startAt) < new Date()
      );
    } else if (activeTab === 'future') {
      filtered = filtered.filter(apt => 
        new Date(apt.startAt) > new Date()
      );
    } else {
      filtered = filtered.filter(apt => 
        new Date(apt.startAt).toDateString() === new Date().toDateString()
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.patientFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (for current tab)
    if (activeTab === 'current' && selectedStatus !== 'all') {
      filtered = filtered.filter(apt => apt.finalStatusCode === selectedStatus);
    }

    // Filter by date range (for past and future tabs)
    if (activeTab === 'past' || activeTab === 'future') {
      if (startDate) {
        filtered = filtered.filter(apt => 
          new Date(apt.startAt) >= new Date(startDate)
        );
      }
      if (endDate) {
        filtered = filtered.filter(apt => 
          new Date(apt.startAt) <= new Date(endDate)
        );
      }
    }

    // Sort by appointment time (increasing)
    const sorted = filtered.sort((a, b) => 
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    
    // Filtering completed
    
    return sorted;
  }, [appointments, activeTab, searchTerm, selectedStatus, startDate, endDate]);

  // Calculate current appointment counts
  const currentAppointmentCounts = useMemo(() => {
    const currentAppointments = appointments.filter(apt => 
      new Date(apt.startAt).toDateString() === new Date().toDateString()
    );
    
    return {
      all: currentAppointments.length,
      vitalsRequired: currentAppointments.filter(apt => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      ready: currentAppointments.filter(apt => apt.finalStatusCode === 'READY').length,
      underConsult: currentAppointments.filter(apt => apt.finalStatusCode === 'UNDER_CONSULT').length,
      labRequired: currentAppointments.filter(apt => apt.finalStatusCode === 'LAB_REQUIRED').length,
      awaitingReconsult: currentAppointments.filter(apt => apt.finalStatusCode === 'AWAITING_RECONSULT').length,
      completed: currentAppointments.filter(apt => apt.finalStatusCode === 'COMPLETED').length,
      cancelled: currentAppointments.filter(apt => apt.finalStatusCode === 'CANCELLED').length,
    };
  }, [appointments]);

  // Calculate analytics for past appointments
  const analytics = useMemo(() => {
    const pastAppointments = appointments.filter(apt => 
      new Date(apt.startAt) < new Date()
    );
    
    const statusCounts = {
      // Count appointments that were scheduled but never completed (no-show equivalent)
      noShow: pastAppointments.filter(apt => 
        apt.finalStatusCode === 'SCHEDULED' || apt.finalStatusCode === 'VITALS_REQUIRED'
      ).length,
      cancelled: pastAppointments.filter(apt => apt.finalStatusCode === 'CANCELLED').length,
      completed: pastAppointments.filter(apt => apt.finalStatusCode === 'COMPLETED').length,
      // Count appointments that required additional steps (rescheduled equivalent)
      rescheduled: pastAppointments.filter(apt => 
        apt.finalStatusCode === 'LAB_REQUIRED' || apt.finalStatusCode === 'AWAITING_RECONSULT'
      ).length,
      late: pastAppointments.filter(apt => {
        // Consider appointments late if they were completed more than 15 minutes after scheduled time
        if (apt.finalStatusCode !== 'COMPLETED') return false;
        const scheduledTime = new Date(apt.startAt);
        const completedTime = new Date(apt.endAt);
        const delayMinutes = (completedTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
        return delayMinutes > 15;
      }).length,
    };
    
    const total = pastAppointments.length;
    const successRate = total > 0 ? ((statusCounts.completed / total) * 100).toFixed(1) : '0.0';
    
    return {
      ...statusCounts,
      total,
      successRate: `${successRate}%`
    };
  }, [appointments]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  const handleCancelClick = (appointment: PatientAppointment) => {
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

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Clinical Dashboard</h1>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setShowPrescriptionEditor(true)}
          >
            <FileText className="h-4 w-4" />
            Prescription Settings
          </Button>
                    </div>
                  </div>
                
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Loading State */}
        {isDataLoading && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {doctorProfileLoading ? 'Loading doctor profile...' : 'Loading appointment data...'}
                  </p>
                </div>
              </div>
        )}

        {/* Error State */}
        {shouldShowError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
              <p className="text-red-800 dark:text-red-200 font-medium">
                {doctorProfileError ? 'Failed to load doctor profile' : 'Failed to load appointment data'}
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm">
                {!hospitalId || !doctorId 
                  ? `Missing required data: ${!hospitalId ? 'Hospital ID' : ''} ${!doctorId ? 'Doctor ID' : ''}`
                  : 'Please check the console for error details and try refreshing the page'
                }
              </p>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch?.()}
                >
                  Retry
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
                </div>
              </div>
            </div>
        )}

        {/* Main Content */}
        {!isDataLoading && !shouldShowError && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'current' | 'past' | 'future')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Appointments</TabsTrigger>
            <TabsTrigger value="past">Past Appointments</TabsTrigger>
            <TabsTrigger value="future">Future Appointments</TabsTrigger>
          </TabsList>

        {/* Current Appointments Tab */}
        <TabsContent value="current" className="p-6">
          {/* Status Navigation */}
            <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('all')}
                className="text-xs"
              >
                All ({currentAppointmentCounts.all})
              </Button>
              <Button
                variant={selectedStatus === 'VITALS_REQUIRED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('VITALS_REQUIRED')}
                className="text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <Heart className="h-3 w-3 mr-1" />
                Vitals Required ({currentAppointmentCounts.vitalsRequired})
              </Button>
              <Button
                variant={selectedStatus === 'READY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('READY')}
                className="text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/20"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Ready ({currentAppointmentCounts.ready})
              </Button>
              <Button
                variant={selectedStatus === 'UNDER_CONSULT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('UNDER_CONSULT')}
                className="text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20"
              >
                <Clock className="h-3 w-3 mr-1" />
                Under Consult ({currentAppointmentCounts.underConsult})
              </Button>
              <Button
                variant={selectedStatus === 'LAB_REQUIRED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('LAB_REQUIRED')}
                className="text-xs bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
              >
                <FlaskConical className="h-3 w-3 mr-1" />
                Lab Required ({currentAppointmentCounts.labRequired})
              </Button>
              <Button
                variant={selectedStatus === 'AWAITING_RECONSULT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('AWAITING_RECONSULT')}
                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
              >
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Reconsult ({currentAppointmentCounts.awaitingReconsult})
              </Button>
              <Button
                variant={selectedStatus === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('COMPLETED')}
                className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Completed ({currentAppointmentCounts.completed})
              </Button>
              <Button
                variant={selectedStatus === 'CANCELLED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('CANCELLED')}
                className="text-xs bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/20"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelled ({currentAppointmentCounts.cancelled})
              </Button>
              </div>
            </div>
            
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                </div>
                </div>
              </div>
              
          {/* Appointments Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Token No</TableHead>
                  <TableHead>Appointment Time</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Print Prescription</TableHead>
                  <TableHead>Print Token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAppointments.length > 0 ? (
                  currentAppointments.map((appointment) => (
                    <TableRow key={appointment.appointmentId}>
                      <TableCell className="font-medium">{appointment.patientId}</TableCell>
                      <TableCell>{appointment.patientFullName}</TableCell>
                      <TableCell>{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
              <Button 
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleCancelClick(appointment)}
                          >
                            <X className="h-2.5 w-2.5 mr-1" />
                            Cancel
              </Button>
            </div>
                        {appointment.finalStatusCode === 'VITALS_REQUIRED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 mt-1"
                          >
                            <Heart className="h-2.5 w-2.5 mr-1" />
                            Vitals
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <FileText className="h-2.5 w-2.5 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <Printer className="h-2.5 w-2.5 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No appointments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
              
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
        </div>
      )}
        </TabsContent>

        {/* Past Appointments Tab */}
        <TabsContent value="past" className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                  </div>
                </div>
          <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-[150px]"
                placeholder="Start Date"
              />
              <span className="text-gray-400 text-sm">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-[150px]"
                min={startDate || undefined}
                placeholder="End Date"
              />
          </div>
        </div>
            
          {/* Main Content - Table and Analytics */}
          <div className="flex gap-4">
            {/* Past Appointments Table */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Patient ID</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Patient Name</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Token No</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Last Appt Date</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Last Status</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Print Rx</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Next FollowUp</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">IsCompleted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.appointmentId}>
                      <TableCell className="font-medium">{appointment.patientId}</TableCell>
                      <TableCell>{appointment.patientFullName}</TableCell>
                      <TableCell>{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900 dark:text-white text-xs">
                            {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <FileText className="h-2.5 w-2.5 mr-1" />
                          Print
          </Button>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500 dark:text-gray-400">NA</span>
                      </TableCell>
                      <TableCell>
                        {appointment.finalStatusCode === 'COMPLETED' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <X className="h-4 w-4 text-red-500" />
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No past appointments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
      </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
                    </div>
                  )}
            
            {/* Analytics Card - Ultra Compact */}
            <div className="w-48 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-2">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
              
              {/* Analytics Stats */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">No-Show</span>
                </div>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{analytics.noShow}</span>
      </div>

                <div className="flex items-center justify-between p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Cancelled</span>
                      </div>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{analytics.cancelled}</span>
                      </div>
                
                <div className="flex items-center justify-between p-1.5 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Completed</span>
                    </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">{analytics.completed}</span>
                      </div>
                
                <div className="flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Rescheduled</span>
                      </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{analytics.rescheduled}</span>
                    </div>
                
                <div className="flex items-center justify-between p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Late</span>
                      </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{analytics.late}</span>
                      </div>
                    </div>
              
              {/* Summary */}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{analytics.total}</span>
                      </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Success</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">{analytics.successRate}</span>
                      </div>
                    </div>
                      </div>
                      </div>
        </TabsContent>

        {/* Future Appointments Tab */}
        <TabsContent value="future" className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                    </div>
                      </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-[150px]"
                placeholder="Start Date"
              />
              <span className="text-gray-400 text-sm">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-[150px]"
                min={startDate || undefined}
                placeholder="End Date"
              />
                      </div>
                    </div>
              
          {/* Future Appointments Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Token No</TableHead>
                  <TableHead>Appointment Time</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Print Prescription</TableHead>
                  <TableHead>Print Token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.appointmentId}>
                      <TableCell className="font-medium">{appointment.patientId}</TableCell>
                      <TableCell>{appointment.patientFullName}</TableCell>
                      <TableCell>{appointment.tokenDetails?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
              <Button 
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleCancelClick(appointment)}
                          >
                            <X className="h-2.5 w-2.5 mr-1" />
                            Cancel
              </Button>
                      </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <FileText className="h-2.5 w-2.5 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <Printer className="h-2.5 w-2.5 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No future appointments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
                      </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
                    </div>
                  )}
        </TabsContent>

        </Tabs>
        )}
                      </div>

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
                  <div><span className="font-medium">Doctor:</span> Dr. Current User</div>
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

      {/* Prescription Editor */}
      {showPrescriptionEditor && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prescription Template Editor
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrescriptionEditor(false)}
              >
                Close
              </Button>
                      </div>
            <div className="h-[calc(100%-80px)] overflow-auto">
              <PrescriptionEditor />
                      </div>
          </div>
        </div>
      )}
    </div>
  );
}; 