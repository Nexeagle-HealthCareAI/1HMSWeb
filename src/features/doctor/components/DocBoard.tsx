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
import { format, subDays, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

// Mock data - replace with actual API calls
interface PatientAppointment {
  appointmentId: string;
  patientFullName: string;
  patientId: string;
  doctorName: string;
  token?: {
    tokenNumber: number;
  };
  startAt: string;
  endAt: string;
  finalStatusCode: 'VITALS_REQUIRED' | 'READY' | 'UNDER_CONSULT' | 'LAB_REQUIRED' | 'AWAITING_RECONSULT' | 'COMPLETED' | 'SCHEDULED';
  phone?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Mock data - replace with actual API calls
  const mockAppointments: PatientAppointment[] = [
    {
      appointmentId: 'APT001',
      patientFullName: 'John Doe',
      patientId: 'P001',
      doctorName: 'Dr. Smith',
      token: { tokenNumber: 1 },
      startAt: '2024-01-15T09:00:00Z',
      endAt: '2024-01-15T09:30:00Z',
      finalStatusCode: 'VITALS_REQUIRED',
      phone: '+1234567890'
    },
    {
      appointmentId: 'APT002',
      patientFullName: 'Jane Smith',
      patientId: 'P002',
      doctorName: 'Dr. Johnson',
      token: { tokenNumber: 2 },
      startAt: '2024-01-15T10:00:00Z',
      endAt: '2024-01-15T10:30:00Z',
      finalStatusCode: 'READY',
      phone: '+1234567891'
    }
  ];

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

  const getStatusBadge = (status: PatientAppointment['finalStatusCode']) => {
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
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{status}</Badge>;
    }
  };

  // Filter appointments based on active tab and search
  const filteredAppointments = useMemo(() => {
    let appointments = mockAppointments;
    
    // Filter by tab
    if (activeTab === 'past') {
      appointments = appointments.filter(apt => 
        new Date(apt.startAt) < new Date() && 
        apt.finalStatusCode === 'COMPLETED'
      );
    } else if (activeTab === 'future') {
      appointments = appointments.filter(apt => 
        new Date(apt.startAt) > new Date()
      );
    } else {
      appointments = appointments.filter(apt => 
        new Date(apt.startAt).toDateString() === new Date().toDateString()
      );
    }

    // Filter by search term
    if (searchTerm) {
      appointments = appointments.filter(apt =>
        apt.patientFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (for current tab)
    if (activeTab === 'current' && selectedStatus !== 'all') {
      appointments = appointments.filter(apt => apt.finalStatusCode === selectedStatus);
    }

    // Filter by date range (for past and future tabs)
    if (activeTab === 'past' || activeTab === 'future') {
      if (startDate) {
        appointments = appointments.filter(apt => 
          new Date(apt.startAt) >= new Date(startDate)
        );
      }
      if (endDate) {
        appointments = appointments.filter(apt => 
          new Date(apt.startAt) <= new Date(endDate)
        );
      }
    }

    // Sort by appointment time (increasing)
    return appointments.sort((a, b) => 
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [mockAppointments, activeTab, searchTerm, selectedStatus, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };



  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinical Dashboard</h1>
          <p className="text-muted-foreground">Manage your patient appointments and consultations</p>
        </div>

      </div>

      {/* Tabs */}
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
                All
              </Button>
              <Button
                variant={selectedStatus === 'VITALS_REQUIRED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('VITALS_REQUIRED')}
                className="text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <Heart className="h-3 w-3 mr-1" />
                Vitals Required
              </Button>
              <Button
                variant={selectedStatus === 'READY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('READY')}
                className="text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/20"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Ready
              </Button>
              <Button
                variant={selectedStatus === 'UNDER_CONSULT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('UNDER_CONSULT')}
                className="text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20"
              >
                <Clock className="h-3 w-3 mr-1" />
                Under Consult
              </Button>
              <Button
                variant={selectedStatus === 'LAB_REQUIRED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('LAB_REQUIRED')}
                className="text-xs bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
              >
                <FlaskConical className="h-3 w-3 mr-1" />
                Lab Required
              </Button>
              <Button
                variant={selectedStatus === 'AWAITING_RECONSULT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('AWAITING_RECONSULT')}
                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
              >
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Reconsult
              </Button>
              <Button
                variant={selectedStatus === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusClick('COMPLETED')}
                className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Completed
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
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Doctor Name</TableHead>
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
                      <TableCell>{appointment.doctorName}</TableCell>
                      <TableCell>{appointment.token?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calendar className="h-2.5 w-2.5 mr-1" />
                            Re-schedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
              </div>
            </div>
            
          {/* Past Appointments Table */}
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Token No</TableHead>
                  <TableHead>Appointment Time</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Print Prescription</TableHead>
                  <TableHead>Next Meet Required</TableHead>
                  <TableHead>Past Completed Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAppointments.length > 0 ? (
                  currentAppointments.map((appointment) => (
                    <TableRow key={appointment.appointmentId}>
                      <TableCell className="font-medium">{appointment.patientId}</TableCell>
                      <TableCell>{appointment.patientFullName}</TableCell>
                      <TableCell>{appointment.doctorName}</TableCell>
                      <TableCell>{appointment.token?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calendar className="h-2.5 w-2.5 mr-1" />
                            Re-schedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-green-50 text-green-700 border-green-300">
                            Yes
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-red-50 text-red-700 border-red-300">
                            No
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-green-50 text-green-700 border-green-300">
                            Completed
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                            Pending
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
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
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>

          {/* Future Appointments Table */}
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Doctor Name</TableHead>
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
                      <TableCell>{appointment.doctorName}</TableCell>
                      <TableCell>{appointment.token?.tokenNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.finalStatusCode)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calendar className="h-2.5 w-2.5 mr-1" />
                            Re-schedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(appointment.finalStatusCode)}
                            className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
    </div>
  );
}; 