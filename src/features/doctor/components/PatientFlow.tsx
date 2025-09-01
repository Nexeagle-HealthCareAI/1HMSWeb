import React, { useState, useMemo } from 'react';
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
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

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

// Mock data for demonstration
const mockPatients: Patient[] = [
  {
    id: '1',
    patientId: 'P001',
    patientName: 'John Smith',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '09:00',
    appointmentDate: '2024-01-15',
    tokenNo: 1,
    vitalsUpdated: false,
    status: 'vitals-required',
    phone: '+1-555-0123'
  },
  {
    id: '2',
    patientId: 'P002',
    patientName: 'Emily Davis',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '09:30',
    appointmentDate: '2024-01-15',
    tokenNo: 2,
    vitalsUpdated: true,
    status: 'ready-consultation',
    phone: '+1-555-0124'
  },
  {
    id: '3',
    patientId: 'P003',
    patientName: 'Robert Wilson',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '10:00',
    appointmentDate: '2024-01-15',
    tokenNo: 3,
    vitalsUpdated: true,
    status: 'under-consultation',
    phone: '+1-555-0125'
  },
  {
    id: '4',
    patientId: 'P004',
    patientName: 'Lisa Anderson',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '10:30',
    appointmentDate: '2024-01-15',
    tokenNo: 4,
    vitalsUpdated: true,
    status: 'lab-test-required',
    phone: '+1-555-0126'
  },
  {
    id: '5',
    patientId: 'P005',
    patientName: 'David Brown',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '11:00',
    appointmentDate: '2024-01-15',
    tokenNo: 5,
    vitalsUpdated: true,
    status: 'awaiting-reconsultation',
    phone: '+1-555-0127'
  },
  {
    id: '6',
    patientId: 'P006',
    patientName: 'Maria Garcia',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '11:30',
    appointmentDate: '2024-01-15',
    tokenNo: 6,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0128'
  },
  {
    id: '7',
    patientId: 'P007',
    patientName: 'James Taylor',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '14:00',
    appointmentDate: '2024-01-15',
    tokenNo: 7,
    vitalsUpdated: false,
    status: 'vitals-required',
    phone: '+1-555-0129'
  },
  {
    id: '8',
    patientId: 'P008',
    patientName: 'Jennifer Lee',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '14:30',
    appointmentDate: '2024-01-15',
    tokenNo: 8,
    vitalsUpdated: true,
    status: 'ready-consultation',
    phone: '+1-555-0130'
  }
];

// Mock past patients data
const mockPastPatients: Patient[] = [
  {
    id: '9',
    patientId: 'P009',
    patientName: 'Thomas Martinez',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '09:00',
    appointmentDate: '2024-01-14',
    tokenNo: 1,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0131'
  },
  {
    id: '10',
    patientId: 'P010',
    patientName: 'Amanda White',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '09:30',
    appointmentDate: '2024-01-14',
    tokenNo: 2,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0132'
  },
  {
    id: '11',
    patientId: 'P011',
    patientName: 'Christopher Rodriguez',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '10:00',
    appointmentDate: '2024-01-13',
    tokenNo: 1,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0133'
  },
  {
    id: '12',
    patientId: 'P012',
    patientName: 'Jessica Thompson',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '10:30',
    appointmentDate: '2024-01-13',
    tokenNo: 2,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0134'
  },
  {
    id: '13',
    patientId: 'P013',
    patientName: 'Daniel Lewis',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '11:00',
    appointmentDate: '2024-01-12',
    tokenNo: 1,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1-555-0135'
  }
];

// Mock future patients data
const mockFuturePatients: Patient[] = [
  {
    id: '14',
    patientId: 'P014',
    patientName: 'Nicole Clark',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '09:00',
    appointmentDate: '2024-01-16',
    tokenNo: 1,
    vitalsUpdated: false,
    status: 'ready-consultation',
    phone: '+1-555-0136'
  },
  {
    id: '15',
    patientId: 'P015',
    patientName: 'Kevin Hall',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '09:30',
    appointmentDate: '2024-01-16',
    tokenNo: 2,
    vitalsUpdated: false,
    status: 'ready-consultation',
    phone: '+1-555-0137'
  },
  {
    id: '16',
    patientId: 'P016',
    patientName: 'Rachel Adams',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '10:00',
    appointmentDate: '2024-01-17',
    tokenNo: 1,
    vitalsUpdated: false,
    status: 'ready-consultation',
    phone: '+1-555-0138'
  },
  {
    id: '17',
    patientId: 'P017',
    patientName: 'Steven Baker',
    doctorName: 'Dr. Michael Chen',
    appointmentTime: '10:30',
    appointmentDate: '2024-01-17',
    tokenNo: 2,
    vitalsUpdated: false,
    status: 'ready-consultation',
    phone: '+1-555-0139'
  },
  {
    id: '18',
    patientId: 'P018',
    patientName: 'Michelle Carter',
    doctorName: 'Dr. Sarah Johnson',
    appointmentTime: '11:00',
    appointmentDate: '2024-01-18',
    tokenNo: 1,
    vitalsUpdated: false,
    status: 'ready-consultation',
    phone: '+1-555-0140'
  }
];

export const PatientFlow = () => {
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
    switch (status) {
      case 'vitals-required':
        return (
          <Badge 
            className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200 transition-colors text-xs"
            onClick={() => patient && handleVitalsClick(patient)}
          >
            ❤️ Vitals
          </Badge>
        );
      case 'ready-consultation':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">✅ Ready</Badge>;
      case 'under-consultation':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">👨‍⚕️ Consulting</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">🧪 Lab Test</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">⏳ Follow-up</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">🏁 Done</Badge>;
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
        
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Patient Flow</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage patient consultations efficiently</p>
              </div>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Patient
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Vitals</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Ready</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Consulting</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Lab Tests</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Follow-ups</p>
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
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Completed</p>
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
                      <p className="text-lg font-bold text-purple-600">{filteredPatients.length}</p>
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
                      <p className="text-xl font-bold text-orange-600">{filteredPatients.length}</p>
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
                  Current Patients
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Past Appointments
                </TabsTrigger>
                <TabsTrigger value="future" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Future Patients
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="current" className="p-6">
              {/* Current Patients Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Patients</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage today's patient flow and track progress</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Live Updates</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {kpis.totalToday} Total Today
                    </Badge>
                  </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority Actions:</span>
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
                    
                  </div>
                </div>
              </div>

              {/* Status Navigation */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Patient Journey Status</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Click any status to filter patients
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

              {/* Patients Table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Token</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient ID</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient Name</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Time</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-blue-600">
                              {patient.patientId}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">ID: {patient.patientId}</div>
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
                                  View
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
                                {selectedStatus === 'all' ? 'No patients found' :
                                 `No ${selectedStatus.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} patients found`}
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Past Appointments</h2>
                    <p className="text-gray-600 dark:text-gray-400">View completed patient consultations and historical data</p>
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
              </div>

              {/* Search and Date Range Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
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
                  
                  {/* Date Range Filter */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter by Date Range</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
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
                          Clear
                        </Button>
                      </div>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {dateRange.startDate && dateRange.endDate 
                              ? `Showing appointments from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} to ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
                              : dateRange.startDate 
                                ? `Showing appointments from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} onwards`
                                : `Showing appointments until ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
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
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Token</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient ID</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient Name</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Date</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Time</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-blue-600">
                              {patient.patientId}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">ID: {patient.patientId}</div>
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
                                  View
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
                                No past appointments found for the selected criteria
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Future Appointments</h2>
                    <p className="text-gray-600 dark:text-gray-400">View upcoming patient appointments and scheduled consultations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Upcoming</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {futureStats.readyFuture} Ready
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Search and Date Range Filters */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Future Appointments</label>
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
                  
                  {/* Date Range Filter */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter by Date Range</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
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
                          Clear
                        </Button>
                      </div>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {dateRange.startDate && dateRange.endDate 
                              ? `Showing appointments from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} to ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
                              : dateRange.startDate 
                                ? `Showing appointments from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} onwards`
                                : `Showing appointments until ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
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
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Token</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient ID</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Patient Name</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Date</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Time</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="text-xs font-medium">
                              #{patient.tokenNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-blue-600">
                              {patient.patientId}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{patient.patientName}</div>
                                <div className="text-xs text-gray-500">ID: {patient.patientId}</div>
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
                                  View
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
                                No future appointments found for the selected criteria
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
