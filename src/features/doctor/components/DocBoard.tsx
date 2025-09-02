import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  UserX, 
  TrendingUp, 
  Bell,
  User,
  Globe,
  Menu,
  X,
  LogOut,
  Stethoscope,
  Home,
  UserCheck,
  CreditCard,
  Bot,
  MessageCircle,
  Send,
  Settings,
  Zap,
  Phone,
  DollarSign,
  Activity,
  UserPlus,
  Heart,
  FlaskConical,
  CheckCircle,
  List,
  CalendarDays,
  Eye,
  Filter,
  Search,
  FileText,
  Lock,
  Download,
  ArrowRight,
  History,
  CalendarIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ContextualGuide } from './guide/ContextualGuide';
// import { DASHBOARD_GUIDES } from './guide/GuideData';

import { format, subDays } from 'date-fns';
import { PatientFlow } from './PatientFlow';
import { PatientDetailsModal } from './PatientDetailsModal';

interface KPIData {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  color: string;
}

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
  age?: number;
  gender?: string;
  bloodPressure?: string;
  temperature?: string;
  pulse?: string;
  weight?: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
}

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
  age?: number;
  gender?: string;
  bloodPressure?: string;
  temperature?: string;
  pulse?: string;
  weight?: string;
}

export const ClinicalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const userRole = useAuthStore.getState().getUserRole?.() || 'Doctor';
  const profileTarget = (userRole === 'Doctor' || userRole === 'AdminDoctor') ? '/profile?tab=professional' : '/profile';
  const { completionPercentage: profileCompletion, isLoading: profileLoading, doctorProfileCompletion } = useProfileCompletion();
  
  // Check if profile is 100% complete
  const isProfileComplete = doctorProfileCompletion >= 100;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Clinical Dashboard Modules
  const clinicalModules = [
    { id: 'dashboard', name: 'Clinical Dashboard', icon: Activity, description: 'Overview & Analytics' },
  ];

  // TODO: Replace with actual API data
  const kpiData: KPIData[] = [
    {
      title: 'Total Patients',
      value: '24',
      change: '+12%',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Consultations',
      value: '8',
      change: '+5%',
      icon: Stethoscope,
      color: 'green'
    },
    {
      title: 'Pending Vitals',
      value: '3',
      change: '-2%',
      icon: Heart,
      color: 'red'
    },
    {
      title: 'Completed Today',
      value: '15',
      change: '+8%',
      icon: CheckCircle,
      color: 'emerald'
    }
  ];

  // TODO: Replace with actual API data
  const mockPatients: Patient[] = [];

  // TODO: Replace with actual API data
  const mockAppointments: Appointment[] = mockPatients;

  // TODO: Replace with actual API data
  const mockFutureAppointments: Appointment[] = [];

  // TODO: Replace with actual API data
  const mockPastAppointments: Appointment[] = [];

  const getStatusBadge = (status: Patient['status']) => {
    const statusConfig = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      'no-show': { variant: 'secondary', label: 'No Show' }
    };
    
    const config = statusConfig[status] as any;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAppointmentStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'vitals-required':
        return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600">❤️ Vitals Required</Badge>;
      case 'ready-consultation':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600">✅ Ready For Consultation</Badge>;
      case 'under-consultation':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600">👨‍⚕️ Under Consultation</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600">🧪 Lab Test Required</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600">⏳ Awaiting Reconsultation</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600">🏁 Completed</Badge>;
      default:
        return null;
    }
  };

  // Handle patient journey flow button clicks
  const handleJourneyStatusClick = (status: string) => {
    if (!isProfileComplete) {
      return; // Disable if profile not complete
    }
    setSelectedStatus(status);
    // Reset dropdown filters when journey flow button is clicked
    setStatusFilter('all');
  };

  // Get appointments based on active tab and selected status
  const getAppointmentsToShow = () => {
    if (activeTab === 'past') {
      return mockPastAppointments;
    }
    if (selectedStatus === 'future') {
      return mockFutureAppointments;
    }
    return mockAppointments;
  };



  // Handle patient ID click
  const handlePatientIdClick = (patientId: string) => {
    if (!isProfileComplete) {
      return; // Disable if profile not complete
    }
    // Navigate to patient details page
    navigate(`/patient/${patientId}`);
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  // Handle status update
  const handleStatusUpdate = (patientId: string, status: Patient['status']) => {
    // Update patient status logic here
    console.log(`Updating patient ${patientId} status to ${status}`);
  };

  // Handle vitals update
  const handleVitalsUpdate = (patientId: string, vitals: any) => {
    // Update patient vitals logic here
    console.log(`Updating patient ${patientId} vitals:`, vitals);
  };

  // Handle patient update
  const handlePatientUpdate = (patient: Patient) => {
    // Update patient data logic here
    console.log('Updating patient:', patient);
  };

  // Filter appointments based on active tab
  const appointmentsToFilter = getAppointmentsToShow();
  const filteredAppointments = appointmentsToFilter.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Use selectedStatus from patient journey flow as primary filter (only for current tab)
    const matchesJourneyStatus = activeTab === 'past' ? true : (selectedStatus === 'all' || selectedStatus === 'future' || appointment.status === selectedStatus);
    
    // Only apply dropdown filters if no specific journey status is selected
    const matchesDropdownStatus = selectedStatus === 'all' ? (statusFilter === 'all' || appointment.status === statusFilter) : true;
    const matchesDoctor = doctorFilter === 'all' || appointment.doctorName === doctorFilter;
    
    // Filter by selected date for past appointments
    const matchesDate = !selectedDate || appointment.appointmentDate === format(selectedDate, 'yyyy-MM-dd');
    
    return matchesSearch && matchesJourneyStatus && matchesDropdownStatus && matchesDoctor && matchesDate;
  });

  const uniqueDoctors = [...new Set(mockAppointments.map(apt => apt.doctorName))];

  // Calculate KPIs for patient journey flow
  const kpis = {
    totalToday: mockAppointments.length,
    vitalsRequired: mockAppointments.filter(apt => apt.status === 'vitals-required').length,
    readyConsultation: mockAppointments.filter(apt => apt.status === 'ready-consultation').length,
    underConsultation: mockAppointments.filter(apt => apt.status === 'under-consultation').length,
    labFollowUps: mockAppointments.filter(apt => apt.status === 'lab-test-required').length,
    doctorFollowUps: mockAppointments.filter(apt => apt.status === 'awaiting-reconsultation').length,
    completed: mockAppointments.filter(apt => apt.status === 'completed').length
  };

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

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Doctor Profile Completion Banner - show until 100% */}
      {!isProfileComplete && (userRole === 'Doctor' || userRole === 'AdminDoctor') && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/20 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-slate-900/30">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, #10b981 2px, transparent 2px)`,
              backgroundSize: '24px 24px'
            }}></div>
          </div>
          
          {/* Main content */}
          <div className="relative p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-5">
                {/* Professional icon with gradient background */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl blur-sm opacity-30"></div>
                  <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                    <Stethoscope className="h-8 w-8 text-white drop-shadow-sm" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      Professional Profile Setup
                    </h2>
                    <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                      REQUIRED
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-2xl">
                    Complete your professional credentials and specialization details to access all clinical management features and ensure compliance with medical standards.
                  </p>
                </div>
              </div>
              
              {/* Progress circle */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20">
                  {/* Background circle */}
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(doctorProfileCompletion / 100) * 188.5} 188.5`}
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0d9488" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Percentage text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{doctorProfileCompletion}%</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium uppercase tracking-wider">Complete</span>
              </div>
            </div>
            
            {/* Progress bar section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Setup Progress</span>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{doctorProfileCompletion} of 100%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-700 ease-out relative shadow-sm"
                  style={{ width: `${doctorProfileCompletion}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40 rounded-r-full"></div>
                </div>
              </div>
            </div>
            
            {/* Action section */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Clinical Features Restricted
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Complete setup to unlock patient management & prescriptions
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/profile?tab=professional')} 
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] border-0"
              >
                <UserCheck className="mr-2 h-5 w-5" />
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Clinical Dashboard</h1>
            {isProfileComplete && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-2.5 py-0.5 shadow-sm text-[11px] font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Profile 100%
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Doctor Management Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="today">
            <SelectTrigger className="w-[120px] sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Clinical Navigation Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 transition-all duration-300">
        {clinicalModules.map((module) => {
          const isLocked = !isProfileComplete && module.id !== 'dashboard';
          
          return (
            <Card 
              key={module.id}
              className={`cursor-pointer transition-all relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${
                isLocked 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                  : currentView === module.id 
                    ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 hover:shadow-lg' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-lg'
              }`}
              onClick={() => {
                if (!isLocked) {
                  setCurrentView(module.id);
                }
              }}
            >
              <CardContent className="p-3 lg:p-4 text-center">
                <div className="relative">
                  <module.icon className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${
                    isLocked 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : currentView === module.id 
                        ? 'text-primary' 
                        : 'text-gray-600 dark:text-gray-300'
                  }`} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <h3 className={`font-medium text-xs lg:text-sm mb-1 ${
                  isLocked 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : currentView === module.id 
                      ? 'text-primary' 
                      : 'text-gray-900 dark:text-white'
                }`}>
                  {module.name}
                </h3>
                <p className={`text-xs hidden sm:block ${
                  isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {isLocked ? 'Locked' : module.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dashboard Content */}
      {currentView === 'dashboard' && (
        <div className="space-y-4 lg:space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {activeTab === 'current' ? (
              kpiData.map((kpi, index) => (
                <Card key={index} className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          {kpi.title}
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {kpi.value}
                        </p>
                        <p className={`text-xs ${
                          kpi.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {kpi.change} from yesterday
                        </p>
                      </div>
                      <div className={`p-2 lg:p-3 rounded-full flex-shrink-0 ${
                        kpi.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        kpi.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        kpi.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                        kpi.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        kpi.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        kpi.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <kpi.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${
                          kpi.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          kpi.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          kpi.color === 'red' ? 'text-red-600 dark:text-red-400' :
                          kpi.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                          kpi.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          kpi.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-gray-600 dark:text-gray-300'
                        }`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : activeTab === 'past' ? (
              <>
                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Total Past Appointments
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {pastStats.totalPast}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Historical records
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        <History className="h-5 w-5 lg:h-6 lg:w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Completed Appointments
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {pastStats.completedPast}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Successfully completed
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Unique Dates
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {pastStats.uniqueDates}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Different appointment days
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Filtered Results
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {filteredAppointments.length}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Current filter results
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Filter className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Total Future Appointments
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {futureStats.totalFuture}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Upcoming appointments
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <CalendarDays className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Ready for Consultation
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {futureStats.readyFuture}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Patients ready
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Unique Dates
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {futureStats.uniqueFutureDates}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Different appointment days
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          Filtered Results
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                          {filteredAppointments.length}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Current filter results
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Filter className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Patient Flow Section - Only show when profile is complete */}
      {isProfileComplete && (
        <PatientFlow />
      )}

      {/* Patient Details Modal */}
      <PatientDetailsModal
        patient={selectedPatient}
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onStatusUpdate={handleStatusUpdate}
        onVitalsUpdate={handleVitalsUpdate}
      />

    </div>
  );
}; 