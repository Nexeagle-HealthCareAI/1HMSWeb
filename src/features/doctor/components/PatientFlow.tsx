import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  Heart, 
  FlaskConical, 
  CheckCircle,
  Clock,
  Eye,
  X,
  User,
  Stethoscope,
  CalendarDays,
  History,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface Patient {
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

// Mock data removed - replace with real data from API
const mockPatients: Patient[] = [];

// Mock data removed - replace with real data from API
const mockPastPatients: Patient[] = [];

// Mock data removed - replace with real data from API
const mockFuturePatients: Patient[] = [];

export const PatientFlow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });

  // Handle patient ID click to navigate to patient profile
  const handlePatientIdClick = (patientId: string) => {
    navigate(`/patient/${patientId}`);
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalToday = mockPatients.length;
    const vitalsRequired = mockPatients.filter(apt => apt.status === 'vitals-required').length;
    const doctorFollowUps = mockPatients.filter(apt => apt.status === 'awaiting-reconsultation').length;
    const labFollowUps = mockPatients.filter(apt => apt.status === 'lab-test-required').length;
    const completed = mockPatients.filter(apt => apt.status === 'completed').length;
    const readyConsultation = mockPatients.filter(apt => apt.status === 'ready-consultation').length;
    const underConsultation = mockPatients.filter(apt => apt.status === 'under-consultation').length;

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
    const totalPast = mockPastPatients.length;
    const completedPast = mockPastPatients.filter(apt => apt.status === 'completed').length;
    const uniqueDates = [...new Set(mockPastPatients.map(apt => apt.appointmentDate))].length;

    return {
      totalPast,
      completedPast,
      uniqueDates
    };
  }, []);

  // Calculate future appointments stats
  const futureStats = useMemo(() => {
    const totalFuture = mockFuturePatients.length;
    const readyFuture = mockFuturePatients.filter(apt => apt.status === 'ready-consultation').length;
    const uniqueFutureDates = [...new Set(mockFuturePatients.map(apt => apt.appointmentDate))].length;

    return {
      totalFuture,
      readyFuture,
      uniqueFutureDates
    };
  }, []);

  // Filter patients based on active tab
  const filteredPatients = useMemo(() => {
    let patients = activeTab === 'current' ? mockPatients : activeTab === 'past' ? mockPastPatients : mockFuturePatients;
    
    patients = patients.filter(patient => {
      const matchesSearch = 
        patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesSelectedStatus = selectedStatus === 'all' || patient.status === selectedStatus;
      
      // Date filtering logic
      let matchesDate = true;
      
      if (activeTab === 'current') {
        // For current tab, use single date filter
        matchesDate = !selectedDate || patient.appointmentDate === format(selectedDate, 'yyyy-MM-dd');
      } else if (activeTab === 'past' || activeTab === 'future') {
        // For past and future tabs, use date range filter
        if (dateRange.startDate && dateRange.endDate) {
          const patientDate = new Date(patient.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          matchesDate = patientDate >= startDate && patientDate <= endDate;
        } else if (dateRange.startDate) {
          const patientDate = new Date(patient.appointmentDate);
          const startDate = new Date(dateRange.startDate);
          matchesDate = patientDate >= startDate;
        } else if (dateRange.endDate) {
          const patientDate = new Date(patient.appointmentDate);
          const endDate = new Date(dateRange.endDate);
          matchesDate = patientDate <= endDate;
        }
      }
      
      return matchesSearch && matchesStatus && matchesSelectedStatus && matchesDate;
    });

    return patients;
  }, [searchTerm, statusFilter, selectedStatus, activeTab, selectedDate, dateRange]);

  const getStatusBadge = (status: Patient['status'], patient?: Patient) => {
    const badgeLabel = t(`patientFlow.statusBadges.${status}`);
    switch (status) {
      case 'vitals-required':
        return (
          <Badge 
            className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200 transition-colors text-xs"
            onClick={() => patient && handleVitalsClick(patient)}
          >
            {badgeLabel}
          </Badge>
        );
      case 'ready-consultation':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{badgeLabel}</Badge>;
      case 'under-consultation':
        return <Badge className="bg-brand-100 text-brand-800 border-brand-300 text-xs">{badgeLabel}</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">{badgeLabel}</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">{badgeLabel}</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{badgeLabel}</Badge>;
      default:
        return null;
    }
  };

  const handleVitalsClick = (patient: Patient) => {
    console.log('Vitals clicked for patient:', patient.patientName);
  };

  const uniqueDoctors = [...new Set(mockPatients.map(apt => apt.doctorName))];

  const clearDateFilters = () => {
    setSelectedDate(undefined);
    setDateRange({ startDate: '', endDate: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        




        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'current' | 'past' | 'future')} className="w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('patientFlow.tabs.current')}
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t('patientFlow.tabs.past')}
                </TabsTrigger>
                <TabsTrigger value="future" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {t('patientFlow.tabs.future')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="current" className="p-6">
              {/* Current Patients Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('patientFlow.current.title')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('patientFlow.current.subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">{t('patientFlow.current.live')}</span>
                    </div>
                    <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200">
                      {kpis.totalToday} {t('patientFlow.current.totalToday')}
                    </Badge>
                  </div>
                </div>


              </div>

              {/* Search and Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('patientFlow.current.searchLabel')}</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={t('patientFlow.current.searchPlaceholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>

              {/* Status Navigation */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('patientFlow.current.journeyTitle')}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('patientFlow.current.journeyHint')}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <button
                    onClick={() => setSelectedStatus('all')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedStatus === 'all'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold mb-1">{kpis.totalToday}</div>
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.all.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.all.subtitle')}</div>
                    </div>
                    {selectedStatus === 'all' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-600 rounded-full"></div>
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
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.vitals.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.vitals.subtitle')}</div>
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
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.ready.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.ready.subtitle')}</div>
                    </div>
                    {selectedStatus === 'ready-consultation' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedStatus('under-consultation')}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedStatus === 'under-consultation'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                    }`}
                  >
                    <div className="text-center">
                      <Stethoscope className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-lg font-bold mb-1">{kpis.underConsultation}</div>
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.consulting.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.consulting.subtitle')}</div>
                    </div>
                    {selectedStatus === 'under-consultation' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-600 rounded-full"></div>
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
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.lab.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.lab.subtitle')}</div>
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
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.followups.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.followups.subtitle')}</div>
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
                      <div className="text-xs font-medium">{t('patientFlow.current.tiles.completed.title')}</div>
                      <div className="text-xs opacity-75 mt-1">{t('patientFlow.current.tiles.completed.subtitle')}</div>
                    </div>
                    {selectedStatus === 'completed' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Patients Table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.token')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientId')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientName')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.contact')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.time')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.status')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-brand-600">
                              <button
                                onClick={() => handlePatientIdClick(patient.patientId)}
                                className="hover:text-brand-800 hover:underline cursor-pointer transition-colors"
                                title={t('patientFlow.table.patientIdTitle')}
                              >
                                {patient.patientId}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">{t('patientFlow.table.rowId', { id: patient.patientId })}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(`2000-01-01T${patient.appointmentTime}`), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(patient.status, patient)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {t('patientFlow.table.view')}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {selectedStatus === 'all'
                                  ? t('patientFlow.empty.current')
                                  : t('patientFlow.empty.currentByStatus', { status: t(`patientFlow.statusLabels.${selectedStatus}`) })}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('patientFlow.past.title')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('patientFlow.past.subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <History className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.past.chip')}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {pastStats.completedPast} {t('patientFlow.past.badge')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Search and Date Range Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('patientFlow.past.searchLabel')}</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={t('patientFlow.past.searchPlaceholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Date Range Filter */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('patientFlow.filters.dateRangeTitle')}</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('patientFlow.filters.startDate')}</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('patientFlow.filters.endDate')}</label>
                        <Input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={clearDateFilters}
                          size="sm"
                          className="h-10 px-3"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('patientFlow.filters.clear')}
                        </Button>
                      </div>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {dateRange.startDate && dateRange.endDate 
                              ? t('patientFlow.filters.summaryBetween', { start: format(new Date(dateRange.startDate), 'MMM dd, yyyy'), end: format(new Date(dateRange.endDate), 'MMM dd, yyyy') })
                              : dateRange.startDate 
                                ? t('patientFlow.filters.summaryFrom', { start: format(new Date(dateRange.startDate), 'MMM dd, yyyy') })
                                : t('patientFlow.filters.summaryUntil', { end: format(new Date(dateRange.endDate), 'MMM dd, yyyy') })
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Past Appointments Table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.token')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientId')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientName')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.contact')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.date')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.time')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.status')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-brand-600">
                              <button
                                onClick={() => handlePatientIdClick(patient.patientId)}
                                className="hover:text-brand-800 hover:underline cursor-pointer transition-colors"
                                title={t('patientFlow.table.patientIdTitle')}
                              >
                                {patient.patientId}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">{t('patientFlow.table.rowId', { id: patient.patientId })}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(patient.appointmentDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(`2000-01-01T${patient.appointmentTime}`), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(patient.status, patient)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {t('patientFlow.table.view')}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <History className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {t('patientFlow.empty.past')}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('patientFlow.future.title')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('patientFlow.future.subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                      <CalendarDays className="h-4 w-4 text-brand-600" />
                      <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{t('patientFlow.future.chip')}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {futureStats.readyFuture} {t('patientFlow.future.badge')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Search and Date Range Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('patientFlow.future.searchLabel')}</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={t('patientFlow.future.searchPlaceholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Date Range Filter */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('patientFlow.filters.dateRangeTitle')}</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('patientFlow.filters.startDate')}</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{t('patientFlow.filters.endDate')}</label>
                        <Input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={clearDateFilters}
                          size="sm"
                          className="h-10 px-3"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('patientFlow.filters.clear')}
                        </Button>
                      </div>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {dateRange.startDate && dateRange.endDate 
                              ? t('patientFlow.filters.summaryBetween', { start: format(new Date(dateRange.startDate), 'MMM dd, yyyy'), end: format(new Date(dateRange.endDate), 'MMM dd, yyyy') })
                              : dateRange.startDate 
                                ? t('patientFlow.filters.summaryFrom', { start: format(new Date(dateRange.startDate), 'MMM dd, yyyy') })
                                : t('patientFlow.filters.summaryUntil', { end: format(new Date(dateRange.endDate), 'MMM dd, yyyy') })
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Future Appointments Table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.token')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientId')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.patientName')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.contact')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.date')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.time')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.status')}</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patientFlow.table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-brand-600">
                              <button
                                onClick={() => handlePatientIdClick(patient.patientId)}
                                className="hover:text-brand-800 hover:underline cursor-pointer transition-colors"
                                title={t('patientFlow.table.patientIdTitle')}
                              >
                                {patient.patientId}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">{t('patientFlow.table.rowId', { id: patient.patientId })}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(patient.appointmentDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(`2000-01-01T${patient.appointmentTime}`), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(patient.status, patient)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {t('patientFlow.table.view')}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <CalendarDays className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {t('patientFlow.empty.future')}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
