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
import { ArrowUp, Minimize2, Maximize2 } from 'lucide-react';

import { AppointmentBooking } from './AppointmentBooking';
import { VitalsForm } from './VitalsForm';
import { format } from 'date-fns';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useAuthStore } from '@/store/authStore';

import { AppointmentDetail } from '../services/appointmentApi';

export const AppointmentDashboard = () => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showBooking, setShowBooking] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AppointmentDetail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [compactMode, setCompactMode] = useState(true);

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
    setShowVitalsForm(false);
    setSelectedPatient(null);
  };

  const handleVitalsCancel = () => {
    setShowVitalsForm(false);
    setSelectedPatient(null);
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

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    const today = new Date(); // Use actual current date
    
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
      const matchesStatus = activeTab !== 'current' || selectedStatus === 'all' || appointment.finalStatusCode === selectedStatus;
      
      // Filter by date range if on past or future tab
      let matchesDateRange = true;
      if (activeTab === 'past' || activeTab === 'future') {
        const appointmentDate = new Date(appointment.appointmentDate);
        if (startDate && new Date(startDate) > appointmentDate) {
          matchesDateRange = false;
        }
        if (endDate && new Date(endDate) < appointmentDate) {
          matchesDateRange = false;
        }
      }
      
      // Filter by appointment type based on active tab
      const appointmentDate = new Date(appointment.appointmentDate);
      let matchesType = false;
      
      switch (activeTab) {
        case 'current':
          matchesType = appointmentDate.toDateString() === today.toDateString();
          break;
        case 'past':
          matchesType = appointmentDate < today;
          break;
        case 'future':
          matchesType = appointmentDate > today;
          break;
        default:
          matchesType = true;
      }
      
      return matchesSearch && matchesDoctor && matchesStatus && matchesDateRange && matchesType;
    });

    // Sort by appointment time in increasing order
    return filtered.sort((a, b) => {
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      return timeA - timeB;
    });
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
                          onChange={(e) => setStartDate(e.target.value)}
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
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-40 h-10 text-xs"
                          placeholder="End Date"
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
                    { key: 'COMPLETED', label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                  ].map((status) => {
                    const count = appointments.filter(a => 
                      new Date(a.appointmentDate).toDateString() === new Date().toDateString() && 
                      (status.key === 'all' || a.finalStatusCode === status.key)
                    ).length;
                    
                    return (
                      <button
                        key={status.key}
                        onClick={() => setSelectedStatus(status.key)}
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
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Appointment Time</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Current Status</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Actions</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Print Prescription</TableHead>
                           <TableHead className="font-semibold text-gray-900 dark:text-white text-xs py-2 px-2">Print Token</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                                                 {filteredAppointments.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={9} className="text-center py-6">
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
                                 <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium">
                                   {appointment.patientId}
                                 </span>
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
                                
                                {/* Appointment Time */}
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                                      {format(new Date(appointment.startAt), 'HH:mm')}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(appointment.endAt), 'HH:mm')}
                                    </span>
                                  </div>
                                </TableCell>
                                
                                {/* Current Status */}
                               <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                 {getStatusBadge(appointment.finalStatusCode, appointment)}
                               </TableCell>
                               
                                                               {/* Actions */}
                                <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                                                                                    <div className="flex gap-1">
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                                     className={`h-6 px-2 text-xs ${
                                       ['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)
                                         ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                         : 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                     }`}
                                   >
                                     <Calendar className="h-2.5 w-2.5 mr-1" />
                                     Re-schedule
                                   </Button>
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                                     className={`h-6 px-2 text-xs ${
                                       ['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)
                                         ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                         : 'text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                     }`}
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
                               
                               {/* Print Token */}
                               <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   className="h-6 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                 >
                                   <Printer className="h-2.5 w-2.5 mr-1" />
                                   Print
                                 </Button>
                               </TableCell>
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
    </div>
  );
};

export default AppointmentDashboard; 
