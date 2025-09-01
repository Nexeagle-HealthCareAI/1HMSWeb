import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Heart, 
  UserCheck, 
  FlaskConical, 
  CheckCircle,
  Clock,
  Eye,
  X,
  User,
  Stethoscope,
  ArrowLeft,
  List,
  CalendarDays,
  History,
  CalendarIcon,
  TrendingUp,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentBooking } from './AppointmentBooking';
import { VitalsForm } from './VitalsForm';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  appointmentDate: string;
  tokenNo: number;
  vitalsUpdated: boolean;
  status: 'vitals-required' | 'ready-consultation' | 'under-consultation' | 'lab-test-required' | 'awaiting-reconsultation' | 'completed';
  phone: string;
}

// TODO: Replace with actual API data
const mockAppointments: Appointment[] = [];

// TODO: Replace with actual API data
const mockPastAppointments: Appointment[] = [];

// TODO: Replace with actual API data
const mockFutureAppointments: Appointment[] = [];

export const AppointmentDashboard = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalToday = mockAppointments.length;
    const vitalsRequired = mockAppointments.filter(apt => apt.status === 'vitals-required').length;
    const doctorFollowUps = mockAppointments.filter(apt => apt.status === 'awaiting-reconsultation').length;
    const labFollowUps = mockAppointments.filter(apt => apt.status === 'lab-test-required').length;
    const completed = mockAppointments.filter(apt => apt.status === 'completed').length;
    const readyConsultation = mockAppointments.filter(apt => apt.status === 'ready-consultation').length;
    const underConsultation = mockAppointments.filter(apt => apt.status === 'under-consultation').length;

    return {
      totalToday,
      vitalsRequired,
      doctorFollowUps,
      labFollowUps,
      completed,
      readyConsultation,
      underConsultation
    };
  }, []);

      // Calculate past appointments stats
  const pastStats = useMemo(() => {
    const totalPast = mockPastAppointments.length;
    const completedPast = mockPastAppointments.filter(apt => apt.status === 'completed').length;
    const uniqueDates = [...new Set(mockPastAppointments.map(apt => apt.appointmentDate))].length;

    return {
      totalPast,
      completedPast,
      uniqueDates
    };
  }, []);

  // Calculate future appointments stats
  const futureStats = useMemo(() => {
    const totalFuture = mockFutureAppointments.length;
    const readyFuture = mockFutureAppointments.filter(apt => apt.status === 'ready-consultation').length;
    const uniqueFutureDates = [...new Set(mockFutureAppointments.map(apt => apt.appointmentDate))].length;

    return {
      totalFuture,
      readyFuture,
      uniqueFutureDates
    };
  }, []);

  // Filter appointments based on active tab
  const filteredAppointments = useMemo(() => {
    let appointments = activeTab === 'current' ? mockAppointments : activeTab === 'past' ? mockPastAppointments : mockFutureAppointments;
    
    appointments = appointments.filter(appointment => {
      const matchesSearch = 
        appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesDoctor = doctorFilter === 'all' || appointment.doctorName === doctorFilter;
      const matchesSelectedStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
      
      // Date filtering logic
      let matchesDate = true;
      
      if (activeTab === 'current') {
        // Current tab: use single date filter
        matchesDate = !selectedDate || appointment.appointmentDate === format(selectedDate, 'yyyy-MM-dd');
      } else if (activeTab === 'past') {
        // Past tab: use date range filter with max date constraint
        if (dateRange.startDate && dateRange.endDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59); // Include the entire end date
          matchesDate = appointmentDate >= startDate && appointmentDate <= endDate;
        } else if (dateRange.startDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          matchesDate = appointmentDate >= startDate;
        } else if (dateRange.endDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59); // Include the entire end date
          matchesDate = appointmentDate <= endDate;
        } else {
          // Fallback to single date filter if no range is set
          matchesDate = !selectedDate || appointment.appointmentDate === format(selectedDate, 'yyyy-MM-dd');
        }
      } else if (activeTab === 'future') {
        // Future tab: use date range filter with min date constraint
        if (dateRange.startDate && dateRange.endDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59); // Include the entire end date
          matchesDate = appointmentDate >= startDate && appointmentDate <= endDate;
        } else if (dateRange.startDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          matchesDate = appointmentDate >= startDate;
        } else if (dateRange.endDate) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59); // Include the entire end date
          matchesDate = appointmentDate <= endDate;
        } else {
          // Fallback to single date filter if no range is set
          matchesDate = !selectedDate || appointment.appointmentDate === format(selectedDate, 'yyyy-MM-dd');
        }
      }
      
      return matchesSearch && matchesStatus && matchesDoctor && matchesSelectedStatus && matchesDate;
    });

    return appointments;
  }, [searchTerm, statusFilter, doctorFilter, selectedStatus, activeTab, selectedDate, dateRange]);

  const getStatusBadge = (status: Appointment['status'], appointment?: Appointment) => {
    switch (status) {
      case 'vitals-required':
        return (
          <Badge 
            className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200 transition-colors text-xs"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            {t('appointmentDashboard.status.vitalsRequired')}
          </Badge>
        );
      case 'ready-consultation':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{t('appointmentDashboard.status.readyConsultation')}</Badge>;
      case 'under-consultation':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">{t('appointmentDashboard.status.underConsultation')}</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">{t('appointmentDashboard.status.labTestRequired')}</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">{t('appointmentDashboard.status.awaitingReconsultation')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{t('appointmentDashboard.status.completed')}</Badge>;
      default:
        return null;
    }
  };

  const handleVitalsClick = (appointment: Appointment) => {
    setSelectedPatient(appointment);
    setShowVitalsForm(true);
  };

  const handleVitalsSubmit = (vitalsData: any) => {
    console.log('Vitals submitted for patient:', selectedPatient?.patientName, vitalsData);
    setShowVitalsForm(false);
    setSelectedPatient(null);
  };

  const handleVitalsCancel = () => {
    setShowVitalsForm(false);
    setSelectedPatient(null);
  };

  const uniqueDoctors = [...new Set(mockAppointments.map(apt => apt.doctorName))];

  const clearDateFilters = () => {
    setSelectedDate(undefined);
    setDateRange({ startDate: '', endDate: '' });
  };

  // If booking view is active, show the booking component
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
              <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform group-hover:-translate-x-1" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">{t('appointmentDashboard.back')}</span>
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('appointmentDashboard.bookNewAppointment')}</h1>
          </div>
        </div>
        <AppointmentBooking />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
                          <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('appointmentDashboard.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('appointmentDashboard.subtitle')}</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowBooking(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
              {t('appointmentDashboard.bookAppointment')}
          </Button>
          </div>
        </div>

                  {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 transition-all duration-300">
          {activeTab === 'current' ? (
            <>
                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.total')}</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{kpis.totalToday}</p>
                        </div>
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.vitals')}</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">{kpis.vitalsRequired}</p>
                        </div>
                        <div className="p-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg">
                          <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.ready')}</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{kpis.readyConsultation}</p>
                        </div>
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.consulting')}</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{kpis.underConsultation}</p>
                        </div>
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.labTests')}</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{kpis.labFollowUps}</p>
                        </div>
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.followUps')}</p>
                          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{kpis.doctorFollowUps}</p>
                        </div>
                        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('appointmentDashboard.kpis.completed')}</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{kpis.completed}</p>
                        </div>
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                </CardContent>
              </Card>
            </>
              ) : activeTab === 'past' ? (
                <>
                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Total Past</p>
                          <p className="text-lg font-bold text-gray-900">{pastStats.totalPast}</p>
                        </div>
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Completed</p>
                          <p className="text-lg font-bold text-green-600">{pastStats.completedPast}</p>
                        </div>
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Unique Dates</p>
                          <p className="text-lg font-bold text-blue-600">{pastStats.uniqueDates}</p>
                        </div>
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Filtered</p>
                          <p className="text-lg font-bold text-purple-600">{filteredAppointments.length}</p>
                        </div>
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <Filter className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Total Future</p>
                          <p className="text-lg font-bold text-blue-900">{futureStats.totalFuture}</p>
                        </div>
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                </CardContent>
              </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Ready</p>
                          <p className="text-lg font-bold text-green-600">{futureStats.readyFuture}</p>
                  </div>
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Unique Dates</p>
                          <p className="text-lg font-bold text-purple-600">{futureStats.uniqueFutureDates}</p>
                        </div>
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Filtered</p>
                          <p className="text-xl font-bold text-orange-600">{filteredAppointments.length}</p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Filter className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

                 {/* Main Content Area */}
         <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'current' | 'past' | 'future')} className="w-full">
                         <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('appointmentDashboard.currentAppointments')}
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t('appointmentDashboard.pastHistory')}
                </TabsTrigger>
                <TabsTrigger value="future" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {t('appointmentDashboard.futureAppointments')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="current" className="p-6">
              {/* Current Appointments Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                                     <div>
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('appointmentDashboard.currentAppointments')}</h2>
                     <p className="text-gray-600 dark:text-gray-400">{t('appointmentDashboard.managePatientFlow')}</p>
                   </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">{t('appointmentDashboard.liveUpdates')}</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {kpis.totalToday} {t('appointmentDashboard.totalToday')}
                    </Badge>
                  </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appointmentDashboard.priorityActions')}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Vitals ({kpis.vitalsRequired})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ready ({kpis.readyConsultation})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Consulting ({kpis.underConsultation})
                  </Button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Patients</label>
                <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                          placeholder="Search by patient name, ID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                  />
                </div>
              </div>
                    <div className="lg:w-64">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Doctor</label>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                          <SelectItem value="all">👥 All Doctors</SelectItem>
                  {uniqueDoctors.map(doctor => (
                            <SelectItem key={doctor} value={doctor}>👨‍⚕️ {doctor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            </div>
        </div>

              {/* Status Navigation */}
          <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Patient Journey Status</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Click any status to filter appointments
                </div>
              </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <button
                  onClick={() => setSelectedStatus('all')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <div className="text-center">
                      <div className="text-lg font-bold mb-1">{kpis.totalToday}</div>
                      <div className="text-xs font-medium">All Patients</div>
                      <div className="text-xs opacity-75 mt-1">Total Today</div>
                  </div>
                    {selectedStatus === 'all' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('vitals-required')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'vitals-required'
                        ? 'bg-red-600 text-white border-red-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <div className="text-center">
                      <Heart className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.vitalsRequired}</div>
                      <div className="text-xs font-medium">Vitals</div>
                      <div className="text-xs opacity-75 mt-1">Needs Update</div>
                  </div>
                    {selectedStatus === 'vitals-required' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('ready-consultation')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'ready-consultation'
                        ? 'bg-green-600 text-white border-green-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <div className="text-center">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.readyConsultation}</div>
                      <div className="text-xs font-medium">Ready</div>
                      <div className="text-xs opacity-75 mt-1">For Consultation</div>
                  </div>
                    {selectedStatus === 'ready-consultation' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('under-consultation')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'under-consultation'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <div className="text-center">
                      <Stethoscope className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.underConsultation}</div>
                      <div className="text-xs font-medium">Consulting</div>
                      <div className="text-xs opacity-75 mt-1">In Progress</div>
                  </div>
                    {selectedStatus === 'under-consultation' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('lab-test-required')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'lab-test-required'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }`}
                >
                  <div className="text-center">
                      <FlaskConical className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.labFollowUps}</div>
                      <div className="text-xs font-medium">Lab Tests</div>
                      <div className="text-xs opacity-75 mt-1">Required</div>
                  </div>
                    {selectedStatus === 'lab-test-required' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('awaiting-reconsultation')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'awaiting-reconsultation'
                        ? 'bg-yellow-600 text-white border-yellow-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                  }`}
                >
                  <div className="text-center">
                      <Clock className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.doctorFollowUps}</div>
                      <div className="text-xs font-medium">Follow-ups</div>
                      <div className="text-xs opacity-75 mt-1">Awaiting</div>
                  </div>
                    {selectedStatus === 'awaiting-reconsultation' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-600 rounded-full"></div>
                    )}
                </button>

                <button
                  onClick={() => setSelectedStatus('completed')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedStatus === 'completed'
                        ? 'bg-green-600 text-white border-green-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <div className="text-center">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.completed}</div>
                      <div className="text-xs font-medium">Completed</div>
                      <div className="text-xs opacity-75 mt-1">Finished</div>
                  </div>
                    {selectedStatus === 'completed' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full"></div>
                    )}
                </button>
                </div>
              </div>

                             {/* Compact Appointments Table */}
               <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                                         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                       {selectedStatus === 'all' ? 'All Appointments' : `${selectedStatus.replace('-', ' ').toUpperCase()} Appointments`}
                     </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {filteredAppointments.length} results
                    </Badge>
                  </div>
              </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                                           <TableRow className="bg-gray-50 dark:bg-gray-700">
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Token</TableHead>
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Patient Details</TableHead>
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Doctor</TableHead>
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Time</TableHead>
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Status</TableHead>
                       <TableHead className="font-semibold text-gray-900 dark:text-white">Actions</TableHead>
                     </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Search className="h-5 w-5 text-gray-400" />
            </div>
                              <div>
                                <p className="text-gray-900 font-medium">No appointments found</p>
                                <p className="text-gray-500 text-xs">Try adjusting your filters or search terms</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700">
                                  #{appointment.tokenNo}
                                </Badge>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-gray-900">{appointment.patientName}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span className="font-mono">{appointment.patientId}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3" />
                                    {appointment.phone}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-gray-700">{appointment.doctorName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-900">{appointment.appointmentTime}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status, appointment)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="hover:bg-blue-50">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                {appointment.status === 'vitals-required' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleVitalsClick(appointment)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Heart className="h-3 w-3 mr-1" />
                                    Vitals
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="past" className="p-6">
              {/* Past Appointments Header */}
              <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Past Appointments History</h2>
                    <p className="text-gray-600 dark:text-gray-400">View and analyze historical appointment data</p>
                </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <History className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Historical Data</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {pastStats.completedPast} Completed
                </Badge>
                  </div>
              </div>
              
                {/* Statistics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Total Past Appointments</p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-300">{pastStats.totalPast}</p>
                      </div>
                                              <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
                          <History className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                        </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">Successfully Completed</p>
                        <p className="text-lg font-bold text-green-900 dark:text-green-300">{pastStats.completedPast}</p>
                      </div>
                      <div className="p-1.5 bg-green-200 dark:bg-green-800 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-700 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-400">Unique Appointment Days</p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-300">{pastStats.uniqueDates}</p>
                      </div>
                      <div className="p-1.5 bg-purple-200 dark:bg-purple-800 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Past Appointments Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Past Appointments</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by patient name, ID, or doctor..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter by Date Range</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          className="w-full"
                          placeholder="Select start date"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                        <Input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          className="w-full"
                          placeholder="Select end date"
                        />
                      </div>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          onClick={clearDateFilters}
                          size="sm"
                          className="w-full md:w-auto"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Date Filters
                        </Button>
                      </div>
                    )}
                  </div>
                  {selectedDate && (
                                         <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                       <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                         <CalendarIcon className="h-4 w-4" />
                         Showing appointments for <span className="font-medium">{format(selectedDate, 'MMMM dd, yyyy')}</span>
              </div>
            </div>
          )}
                </div>
              </div>

                             {/* Compact Past Appointments Table */}
               <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                                         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                       {selectedDate ? `Appointments on ${format(selectedDate, 'MMMM dd, yyyy')}` : 'All Past Appointments'}
                     </h3>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {filteredAppointments.length} records
                    </Badge>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Date</TableHead>
                        <TableHead className="font-semibold text-gray-900">Patient Details</TableHead>
                        <TableHead className="font-semibold text-gray-900">Doctor</TableHead>
                        <TableHead className="font-semibold text-gray-900">Time</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <History className="h-5 w-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-gray-900 font-medium">No past appointments found</p>
                                <p className="text-gray-500 text-xs">Try adjusting your date filter or search terms</p>
                              </div>
                            </div>
                        </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {format(new Date(appointment.appointmentDate), 'MMM dd')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(appointment.appointmentDate), 'yyyy')}
                                  </div>
                                </div>
                              </div>
                          </TableCell>
                        <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-gray-900">{appointment.patientName}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span className="font-mono">{appointment.patientId}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3" />
                                    {appointment.phone}
                                  </div>
                                </div>
                              </div>
                        </TableCell>
                        <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-gray-700">{appointment.doctorName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-900">{appointment.appointmentTime}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="hover:bg-blue-50">
                            <Eye className="h-3 w-3 mr-1" />
                                  View Details
                          </Button>
                                <Button variant="outline" size="sm" className="hover:bg-green-50">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Analytics
                                </Button>
                              </div>
                        </TableCell>
                      </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
              </div>
              </div>
            </TabsContent>

            <TabsContent value="future" className="p-6">
              {/* Future Appointments Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                      <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Future Appointments</h2>
                    <p className="text-gray-600 dark:text-gray-400">View and manage upcoming patient appointments</p>
                      </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Upcoming</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {mockFutureAppointments.length} Total Future
                    </Badge>
                  </div>
                </div>

                                 {/* Quick Actions Bar for Future Appointments */}
                 <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                                     <div className="flex items-center gap-2">
                     <AlertCircle className="h-4 w-4 text-orange-600" />
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority Actions:</span>
                   </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ready ({mockFutureAppointments.filter(apt => apt.status === 'ready-consultation').length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Consulting ({mockFutureAppointments.filter(apt => apt.status === 'under-consultation').length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                  >
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Lab Tests ({mockFutureAppointments.filter(apt => apt.status === 'lab-test-required').length})
                  </Button>
                </div>
              </div>

                             {/* Search and Filters for Future Appointments */}
               <div className="mb-6">
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    <div className="flex-1">
                                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Future Patients</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by patient name, ID, or doctor..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="lg:w-64">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Date Range</label>
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                            <Input
                              type="date"
                              value={dateRange.startDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              className="w-full"
                              placeholder="Select start date"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                            <Input
                              type="date"
                              value={dateRange.endDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              className="w-full"
                              placeholder="Select end date"
                            />
                          </div>
                        </div>
                        {(dateRange.startDate || dateRange.endDate) && (
                          <Button
                            variant="outline"
                            onClick={clearDateFilters}
                            size="sm"
                            className="w-full"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {(dateRange.startDate || dateRange.endDate) && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                        <CalendarIcon className="h-4 w-4" />
                        Showing appointments from{' '}
                        <span className="font-medium">
                          {dateRange.startDate ? format(new Date(dateRange.startDate), 'MMM dd, yyyy') : 'today'}
                        </span>
                        {' '}to{' '}
                        <span className="font-medium">
                          {dateRange.endDate ? format(new Date(dateRange.endDate), 'MMM dd, yyyy') : 'future'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

                             {/* Compact Future Appointments Table */}
               <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                                         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                       {(dateRange.startDate || dateRange.endDate) 
                        ? `Future Appointments ${dateRange.startDate && dateRange.endDate ? `(${format(new Date(dateRange.startDate), 'MMM dd')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')})` : dateRange.startDate ? `(from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')})` : `(until ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')})`}`
                        : 'All Future Appointments'
                      }
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {filteredAppointments.length} records
                    </Badge>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Date</TableHead>
                        <TableHead className="font-semibold text-gray-900">Patient Details</TableHead>
                        <TableHead className="font-semibold text-gray-900">Doctor</TableHead>
                        <TableHead className="font-semibold text-gray-900">Time</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <CalendarDays className="h-5 w-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-gray-900 font-medium">No future appointments found</p>
                                <p className="text-gray-500 text-xs">Try adjusting your date filter or search terms</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {format(new Date(appointment.appointmentDate), 'MMM dd')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(appointment.appointmentDate), 'yyyy')}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-gray-900">{appointment.patientName}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span className="font-mono">{appointment.patientId}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3" />
                                    {appointment.phone}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-gray-700">{appointment.doctorName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="font-medium text-gray-900">{appointment.appointmentTime}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="hover:bg-blue-50">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                                {appointment.status === 'vitals-required' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleVitalsClick(appointment)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Heart className="h-3 w-3 mr-1" />
                                    Vitals
                                  </Button>
                                )}
                    </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              </div>
            </div>
            </TabsContent>
          </Tabs>
        </div>
        </div>

      {/* Vitals Form Modal */}
      {showVitalsForm && selectedPatient && (
        <VitalsForm
          patientName={selectedPatient.patientName}
          onSubmit={handleVitalsSubmit}
          onCancel={handleVitalsCancel}
          hideSkipButton={true}
        />
      )}
    </div>
  );
};