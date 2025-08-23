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
import { PrescriptionSettings } from './PrescriptionSettings';
import { format, subDays } from 'date-fns';

interface KPIData {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface Patient {
  id: string;
  name: string;
  contact: string;
  token: string;
  doctor: string;
  time: string;
  status: 'confirmed' | 'cancelled' | 'no-show';
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
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Clinical Dashboard Modules
  const clinicalModules = [
    { id: 'dashboard', name: 'Clinical Dashboard', icon: Activity, description: 'Overview & Analytics' },
    { id: 'prescription-settings', name: 'Prescription Settings', icon: FileText, description: 'Prescription Templates' },
  ];

  // Mock data
  const kpiData: KPIData[] = [
    {
      title: "Today's Appointments",
      value: "24",
      change: "+12%",
      icon: Calendar,
      color: "healthcare-primary"
    },
    {
      title: "Active Patients",
      value: "156",
      change: "+8%",
      icon: Users,
      color: "healthcare-success"
    },
    {
      title: "Pending Reports",
      value: "8",
      change: "-3%",
      icon: FileText,
      color: "healthcare-warning"
    },
    {
      title: "Revenue Today",
      value: "₹45,200",
      change: "+15%",
      icon: DollarSign,
      color: "healthcare-info"
    }
  ];

  const mockPatients: Patient[] = [
    { id: "P001", name: "Rahul Sharma", contact: "+91-98765-43210", token: "T001", doctor: "Dr. Patel", time: "09:00 AM", status: "confirmed" },
    { id: "P002", name: "Priya Singh", contact: "+91-98765-43211", token: "T002", doctor: "Dr. Kumar", time: "09:30 AM", status: "confirmed" },
    { id: "P003", name: "Amit Kumar", contact: "+91-98765-43212", token: "T003", doctor: "Dr. Patel", time: "10:00 AM", status: "cancelled" },
    { id: "P004", name: "Neha Gupta", contact: "+91-98765-43213", token: "T004", doctor: "Dr. Sharma", time: "10:30 AM", status: "no-show" },
    { id: "P005", name: "Vikram Singh", contact: "+91-98765-43214", token: "T005", doctor: "Dr. Kumar", time: "11:00 AM", status: "confirmed" }
  ];

  const mockAppointments: Appointment[] = [
    { id: "A001", patientId: "P001", patientName: "Rahul Sharma", doctorName: "Dr. Patel", appointmentTime: "09:00 AM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 1, vitalsUpdated: true, status: "ready-consultation", phone: "+91-98765-43210" },
    { id: "A002", patientId: "P002", patientName: "Priya Singh", doctorName: "Dr. Kumar", appointmentTime: "09:30 AM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 2, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43211" },
    { id: "A003", patientId: "P003", patientName: "Amit Kumar", doctorName: "Dr. Patel", appointmentTime: "10:00 AM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 3, vitalsUpdated: true, status: "under-consultation", phone: "+91-98765-43212" },
    { id: "A004", patientId: "P004", patientName: "Neha Gupta", doctorName: "Dr. Sharma", appointmentTime: "10:30 AM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 4, vitalsUpdated: true, status: "lab-test-required", phone: "+91-98765-43213" },
    { id: "A005", patientId: "P005", patientName: "Vikram Singh", doctorName: "Dr. Kumar", appointmentTime: "11:00 AM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 5, vitalsUpdated: false, status: "awaiting-reconsultation", phone: "+91-98765-43214" }
  ];

  // Mock future appointments for the "Future" tab
  const mockFutureAppointments: Appointment[] = [
    { id: "F001", patientId: "P006", patientName: "Sita Devi", doctorName: "Dr. Patel", appointmentTime: "02:00 PM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 6, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43215" },
    { id: "F002", patientId: "P007", patientName: "Rajesh Kumar", doctorName: "Dr. Sharma", appointmentTime: "03:00 PM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 7, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43216" },
    { id: "F003", patientId: "P008", patientName: "Meera Singh", doctorName: "Dr. Kumar", appointmentTime: "04:00 PM", appointmentDate: format(new Date(), 'yyyy-MM-dd'), tokenNo: 8, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43217" }
  ];

  // Past appointments data
  const mockPastAppointments: Appointment[] = [
    { id: "P001", patientId: "P009", patientName: "Alice Johnson", doctorName: "Dr. Patel", appointmentTime: "09:00 AM", appointmentDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), tokenNo: 1, vitalsUpdated: true, status: "completed", phone: "+91-98765-43218" },
    { id: "P002", patientId: "P010", patientName: "Bob Smith", doctorName: "Dr. Kumar", appointmentTime: "10:30 AM", appointmentDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), tokenNo: 2, vitalsUpdated: true, status: "completed", phone: "+91-98765-43219" },
    { id: "P003", patientId: "P011", patientName: "Carol Davis", doctorName: "Dr. Sharma", appointmentTime: "02:00 PM", appointmentDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), tokenNo: 1, vitalsUpdated: true, status: "completed", phone: "+91-98765-43220" },
    { id: "P004", patientId: "P012", patientName: "David Wilson", doctorName: "Dr. Patel", appointmentTime: "11:15 AM", appointmentDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'), tokenNo: 1, vitalsUpdated: true, status: "completed", phone: "+91-98765-43221" },
    { id: "P005", patientId: "P013", patientName: "Eva Garcia", doctorName: "Dr. Kumar", appointmentTime: "03:30 PM", appointmentDate: format(subDays(new Date(), 4), 'yyyy-MM-dd'), tokenNo: 1, vitalsUpdated: true, status: "completed", phone: "+91-98765-43222" }
  ];

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
        return <Badge className="bg-red-100 text-red-800 border-red-300">❤️ Vitals Required</Badge>;
      case 'ready-consultation':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Ready For Consultation</Badge>;
      case 'under-consultation':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">👨‍⚕️ Under Consultation</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">🧪 Lab Test Required</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ Awaiting Reconsultation</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">🏁 Completed</Badge>;
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

  // Calculate past history stats
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4">
        {clinicalModules.map((module) => {
          const isLocked = !isProfileComplete && module.id !== 'dashboard';
          
          return (
            <Card 
              key={module.id}
              className={`cursor-pointer transition-all relative ${
                isLocked 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                  : currentView === module.id 
                    ? 'ring-2 ring-primary bg-primary/5 hover:shadow-lg' 
                    : 'hover:bg-muted/50 hover:shadow-lg'
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
                      ? 'text-gray-400' 
                      : currentView === module.id 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                  }`} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <h3 className={`font-medium text-xs lg:text-sm mb-1 ${
                  isLocked 
                    ? 'text-gray-400' 
                    : currentView === module.id 
                      ? 'text-primary' 
                      : 'text-foreground'
                }`}>
                  {module.name}
                </h3>
                <p className={`text-xs hidden sm:block ${
                  isLocked ? 'text-gray-400' : 'text-muted-foreground'
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
                <Card key={index} className={`shadow-card hover:shadow-hover transition-shadow ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          {kpi.title}
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                          {kpi.value}
                        </p>
                        <p className={`text-xs ${
                          kpi.change.startsWith('+') ? 'text-healthcare-success' : 'text-healthcare-error'
                        }`}>
                          {kpi.change} from yesterday
                        </p>
                      </div>
                      <div className={`p-2 lg:p-3 rounded-full bg-${kpi.color}/10 flex-shrink-0`}>
                        <kpi.icon className={`h-5 w-5 lg:h-6 lg:w-6 text-${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className={`shadow-card hover:shadow-hover transition-shadow ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          Total Past Appointments
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                          {pastStats.totalPast}
                        </p>
                        <p className="text-xs text-gray-600">
                          Historical records
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-gray-100 flex-shrink-0">
                        <History className="h-5 w-5 lg:h-6 lg:w-6 text-gray-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`shadow-card hover:shadow-hover transition-shadow ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          Completed Appointments
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                          {pastStats.completedPast}
                        </p>
                        <p className="text-xs text-green-600">
                          Successfully completed
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-green-100 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`shadow-card hover:shadow-hover transition-shadow ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          Unique Dates
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                          {pastStats.uniqueDates}
                        </p>
                        <p className="text-xs text-blue-600">
                          Different appointment days
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-blue-100 flex-shrink-0">
                        <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`shadow-card hover:shadow-hover transition-shadow ${!isProfileComplete ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          Filtered Results
                        </p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                          {filteredAppointments.length}
                        </p>
                        <p className="text-xs text-purple-600">
                          Current filter results
                        </p>
                      </div>
                      <div className="p-2 lg:p-3 rounded-full bg-purple-100 flex-shrink-0">
                        <Filter className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Filters & Search */}
          <Card className={`bg-card shadow-card rounded-xl border-0 ${!isProfileComplete ? 'opacity-50' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Filter className="h-5 w-5 text-healthcare-primary" />
                🔍 Filters & Search
                {!isProfileComplete && (
                  <Lock className="h-4 w-4 text-red-500 ml-2" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients or appointments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      disabled={!isProfileComplete}
                    />
                  </div>
                </div>
                
                <Select value={doctorFilter} onValueChange={setDoctorFilter} disabled={!isProfileComplete}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {uniqueDoctors.map(doctor => (
                      <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'current'
                  ? 'bg-white text-healthcare-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                Current Appointments
              </div>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'past'
                  ? 'bg-white text-healthcare-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="h-4 w-4" />
                Past History
              </div>
            </button>
          </div>

          {/* Patient Journey Flow */}
          <Card className={`bg-card shadow-card rounded-xl border-0 ${!isProfileComplete ? 'opacity-50' : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                {activeTab === 'current' ? '📊 Patient Journey Dashboard' : '📋 Past Appointments History'}
                {!isProfileComplete && (
                  <Lock className="h-4 w-4 text-red-500 ml-2" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'current' 
                  ? 'Track patient progress through appointment stages'
                  : 'View and filter past appointment records'
                }
              </p>
            </CardHeader>
            <CardContent>
              {/* Enhanced Patient Journey Navigation Header - Full Screen */}
              {activeTab === 'current' && (
                <div className="bg-gradient-to-r from-healthcare-primary/10 to-healthcare-secondary/10 rounded-xl p-6 border border-healthcare-primary/20 mb-6 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-healthcare-primary rounded-full animate-pulse"></div>
                      <h3 className="text-lg font-semibold text-healthcare-primary">Patient Journey Flow</h3>
                    </div>
                    <Badge className="bg-healthcare-primary/20 text-healthcare-primary border-healthcare-primary/30">
                      Live Tracking
                    </Badge>
                  </div>
                  
                  {/* Single Row Navigation with ALL and Future Appointments */}
                  <div className="flex flex-wrap gap-2 justify-start">
                    {/* ALL Tab - First Position */}
                    <button
                      onClick={() => handleJourneyStatusClick('all')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'all'
                          ? 'bg-healthcare-primary text-white border-healthcare-primary shadow-lg shadow-healthcare-primary/25'
                          : 'bg-healthcare-primary/5 text-healthcare-primary border-healthcare-primary/20 hover:bg-healthcare-primary/10 hover:border-healthcare-primary/30'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <List className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">ALL</div>
                        <div className="text-xs opacity-80">{kpis.totalToday} patients</div>
                      </div>
                    </button>

                    {/* Vitals Required */}
                    <button
                      onClick={() => handleJourneyStatusClick('vitals-required')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'vitals-required'
                          ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <Heart className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Vitals</div>
                        <div className="text-xs opacity-80">{kpis.vitalsRequired} patient</div>
                      </div>
                    </button>

                    {/* Ready for Consultation */}
                    <button
                      onClick={() => handleJourneyStatusClick('ready-consultation')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'ready-consultation'
                          ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Ready</div>
                        <div className="text-xs opacity-80">{kpis.readyConsultation} patient</div>
                      </div>
                    </button>

                    {/* Under Consultation */}
                    <button
                      onClick={() => handleJourneyStatusClick('under-consultation')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'under-consultation'
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <Stethoscope className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Consulting</div>
                        <div className="text-xs opacity-80">{kpis.underConsultation} patient</div>
                      </div>
                    </button>

                    {/* Lab Test Required */}
                    <button
                      onClick={() => handleJourneyStatusClick('lab-test-required')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'lab-test-required'
                          ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <FlaskConical className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Lab Test</div>
                        <div className="text-xs opacity-80">{kpis.labFollowUps} patient</div>
                      </div>
                    </button>

                    {/* Awaiting Reconsultation */}
                    <button
                      onClick={() => handleJourneyStatusClick('awaiting-reconsultation')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'awaiting-reconsultation'
                          ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <Clock className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Re-consult</div>
                        <div className="text-xs opacity-80">{kpis.doctorFollowUps} patient</div>
                      </div>
                    </button>

                    {/* Completed */}
                    <button
                      onClick={() => handleJourneyStatusClick('completed')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'completed'
                          ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/25'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Completed</div>
                        <div className="text-xs opacity-80">{kpis.completed} patient</div>
                      </div>
                    </button>

                    {/* Future Appointments Tab - Last Position */}
                    <button
                      onClick={() => handleJourneyStatusClick('future')}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                        selectedStatus === 'future'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                      } ${!isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isProfileComplete}
                    >
                      <CalendarDays className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-xs">Future</div>
                        <div className="text-xs opacity-80">3 upcoming</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Past History Date Filter */}
              {activeTab === 'past' && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 mb-6 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-700">Filter by Date</h3>
                    </div>
                    <Badge className="bg-gray-200 text-gray-700 border-gray-300">
                      Past Records
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Select Date:</label>
                      <Input
                        type="date"
                        value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                        className="w-48"
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    
                    {selectedDate && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(undefined)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear Filter
                      </Button>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      {selectedDate 
                        ? `Showing appointments for ${format(selectedDate, 'MMMM dd, yyyy')}`
                        : 'Showing all past appointments'
                      }
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments Table */}
          <Card className={`bg-card shadow-card rounded-xl border-0 ${!isProfileComplete ? 'opacity-50' : ''}`}>
            <CardContent className="p-6">
              {/* Always Show Table */}
              <div className="w-full">
                {/* Desktop Table */}
                <div className="hidden md:block w-full overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Doctor</TableHead>
                        {activeTab === 'past' && <TableHead>Date</TableHead>}
                        <TableHead>Time</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell 
                              className={`font-mono text-blue-600 cursor-pointer hover:text-blue-800 hover:underline ${!isProfileComplete ? 'cursor-not-allowed opacity-50' : ''}`}
                              onClick={() => handlePatientIdClick(appointment.patientId)}
                            >
                              {appointment.patientId}
                            </TableCell>
                            <TableCell>{appointment.patientName}</TableCell>
                            <TableCell>{appointment.doctorName}</TableCell>
                            {activeTab === 'past' && (
                              <TableCell className="text-gray-600">
                                {format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')}
                              </TableCell>
                            )}
                            <TableCell>{appointment.appointmentTime}</TableCell>
                            <TableCell>
                              <Badge variant="outline">#{appointment.tokenNo}</Badge>
                            </TableCell>
                            <TableCell>{getAppointmentStatusBadge(appointment.status)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" disabled={!isProfileComplete}>
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {selectedStatus === 'future' ? 'No future appointments found' :
                                 selectedStatus === 'all' ? 'No appointments found' :
                                 `No ${selectedStatus.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} appointments found`}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment) => (
                      <Card key={appointment.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p 
                              className={`font-mono text-blue-600 text-sm cursor-pointer hover:text-blue-800 hover:underline ${!isProfileComplete ? 'cursor-not-allowed opacity-50' : ''}`}
                              onClick={() => handlePatientIdClick(appointment.patientId)}
                            >
                              {appointment.patientId}
                            </p>
                            <p className="font-semibold">{appointment.patientName}</p>
                          </div>
                          <Badge variant="outline">#{appointment.tokenNo}</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <p>Doctor: {appointment.doctorName}</p>
                          {activeTab === 'past' && (
                            <p>Date: {format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')}</p>
                          )}
                          <p>Time: {appointment.appointmentTime}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          {getAppointmentStatusBadge(appointment.status)}
                          <Button variant="outline" size="sm" disabled={!isProfileComplete}>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {selectedStatus === 'future' ? 'No future appointments found' :
                           selectedStatus === 'all' ? 'No appointments found' :
                           `No ${selectedStatus.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} appointments found`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prescription Settings Content */}
      {currentView === 'prescription-settings' && (
        <PrescriptionSettings />
      )}
    </div>
  );
}; 