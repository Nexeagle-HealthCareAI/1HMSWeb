import React, { useState } from 'react';
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
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AppointmentBooking } from './AppointmentBooking';
import { PatientsPage } from './PatientsPage';
import { ProfileCompletion } from './ProfileCompletion';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import WelcomeSetup from './WelcomeSetup';
import { Billing } from './Billing';
import { DocAI } from './DocAI';
import { InternalChat } from './InternalChat';
import { BulkMessaging } from './BulkMessaging';
import { UserManagement } from './UserManagement';
import { PatientProfile } from './PatientProfile';
import { FloatingAIChatbot } from './FloatingAIChatbot';
import { DoctorCalendar } from './DoctorCalendar';
import { EPrescription } from './EPrescription';
import { AdminDashboard } from './AdminDashboard';
import { AppointmentDashboard } from './AppointmentDashboard';
import { ContextualGuide } from './guide/ContextualGuide';
import { DASHBOARD_GUIDES } from './guide/GuideData';

interface DashboardProps {
  onLogout: () => void;
}

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
  tokenNo: number;
  vitalsUpdated: boolean;
  status: 'vitals-required' | 'ready-consultation' | 'under-consultation' | 'lab-test-required' | 'awaiting-reconsultation' | 'completed';
  phone: string;
}

const kpiData: KPIData[] = [
  {
    title: "Today's Appointments",
    value: "28",
    change: "+12%",
    icon: Calendar,
    color: "healthcare-primary"
  },
  {
    title: "Cancelled",
    value: "3",
    change: "-8%",
    icon: UserX,
    color: "healthcare-error"
  },
  {
    title: "No Shows",
    value: "2",
    change: "+5%",
    icon: Clock,
    color: "healthcare-warning"
  },
  {
    title: "Today's Earnings",
    value: "₹48,250",
    change: "+18%",
    icon: TrendingUp,
    color: "healthcare-success"
  }
];

const todayPatients: Patient[] = [
  {
    id: "P001",
    name: "John Doe",
    contact: "+91-9876543210",
    token: "T001",
    doctor: "Dr. Sarah Johnson",
    time: "09:00 AM",
    status: "confirmed"
  },
  {
    id: "P002", 
    name: "Jane Smith",
    contact: "+91-9876543211",
    token: "T002",
    doctor: "Dr. Michael Chen",
    time: "09:30 AM",
    status: "confirmed"
  },
  {
    id: "P003",
    name: "Robert Wilson",
    contact: "+91-9876543212", 
    token: "T003",
    doctor: "Dr. Emily Davis",
    time: "10:00 AM",
    status: "cancelled"
  },
  {
    id: "P004",
    name: "Maria Garcia",
    contact: "+91-9876543213",
    token: "T004", 
    doctor: "Dr. Lisa Anderson",
    time: "10:30 AM",
    status: "no-show"
  }
];

// Mock appointment data for dashboard
const mockAppointments: Appointment[] = [
  {
    id: 'APT001',
    patientId: 'P001',
    patientName: 'John Smith',
    doctorName: 'Dr. Sarah Wilson',
    appointmentTime: '09:00 AM',
    tokenNo: 1,
    vitalsUpdated: false,
    status: 'vitals-required',
    phone: '+1234567890'
  },
  {
    id: 'APT002',
    patientId: 'P002',
    patientName: 'Emily Johnson',
    doctorName: 'Dr. Michael Brown',
    appointmentTime: '10:30 AM',
    tokenNo: 2,
    vitalsUpdated: true,
    status: 'ready-consultation',
    phone: '+1234567891'
  },
  {
    id: 'APT003',
    patientId: 'P003',
    patientName: 'Robert Davis',
    doctorName: 'Dr. Sarah Wilson',
    appointmentTime: '11:15 AM',
    tokenNo: 3,
    vitalsUpdated: true,
    status: 'under-consultation',
    phone: '+1234567892'
  },
  {
    id: 'APT004',
    patientId: 'P004',
    patientName: 'Maria Garcia',
    doctorName: 'Dr. James Lee',
    appointmentTime: '02:00 PM',
    tokenNo: 4,
    vitalsUpdated: true,
    status: 'lab-test-required',
    phone: '+1234567893'
  },
  {
    id: 'APT005',
    patientId: 'P005',
    patientName: 'David Wilson',
    doctorName: 'Dr. Sarah Wilson',
    appointmentTime: '03:30 PM',
    tokenNo: 5,
    vitalsUpdated: true,
    status: 'awaiting-reconsultation',
    phone: '+1234567894'
  },
  {
    id: 'APT006',
    patientId: 'P006',
    patientName: 'Lisa Chen',
    doctorName: 'Dr. Michael Brown',
    appointmentTime: '01:00 PM',
    tokenNo: 6,
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1234567895'
  }
];

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  
  // Patient journey dashboard states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Calculate profile completion score
  const calculateProfileScore = () => {
    const setupData = localStorage.getItem('easyHMS_setupData');
    const hasCompletedSetup = localStorage.getItem('easyHMS_setupCompleted');
    const hasSkippedSetup = localStorage.getItem('easyHMS_setupSkipped');
    
    if (hasCompletedSetup && setupData) {
      const data = JSON.parse(setupData);
      const requiredFields = [
        data.hospital?.name,
        data.hospital?.phone,
        data.hospital?.registrationNumber,
        data.hospital?.address,
        data.doctor?.fullName,
        data.doctor?.specialization,
        data.doctor?.licenseNumber,
        data.doctor?.qualification,
      ];
      
      const optionalFields = [
        data.hospital?.email,
        data.doctor?.email,
        data.doctor?.experience,
        data.documents?.license,
        data.documents?.signature,
        data.documents?.clinicPhotos?.length > 0,
      ];
      
      const requiredComplete = requiredFields.filter(field => field && field.toString().trim() !== '').length;
      const optionalComplete = optionalFields.filter(field => field).length;
      
      const requiredProgress = (requiredComplete / requiredFields.length) * 70;
      const optionalProgress = (optionalComplete / optionalFields.length) * 30;
      
      return Math.round(requiredProgress + optionalProgress);
    }
    
    return hasSkippedSetup ? 30 : 0;
  };
  
  const profileScore = calculateProfileScore();

const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'admin', name: 'Admin Panel', icon: Settings },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'appointments', name: 'Appointment Scheduler', icon: Calendar },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'doc-ai', name: 'DocAI', icon: Bot },
    { id: 'chat', name: 'Chat', icon: MessageCircle },
    { id: 'bulk-messaging', name: 'Bulk Messaging', icon: Send }
  ];

  const getNavDescription = (id: string) => {
    switch (id) {
      case 'dashboard': return 'Your main control center with key metrics and today\'s overview.';
      case 'admin': return 'Manage users, system settings, and hospital configuration.';
      case 'calendar': return 'View your schedule and manage appointments efficiently.';
      case 'appointments': return 'Book, reschedule, and manage patient appointments.';
      case 'billing': return 'Handle payments, insurance claims, and financial reports.';
      case 'doc-ai': return 'Get AI-powered medical assistance and clinical insights.';
      case 'chat': return 'Communicate with your team and colleagues instantly.';
      case 'bulk-messaging': return 'Send notifications and messages to multiple patients.';
      default: return 'Navigate to this section for more features.';
    }
  };

  const getNavTips = (id: string) => {
    switch (id) {
      case 'dashboard': return ['View daily statistics', 'Quick access to all modules', 'Monitor hospital performance'];
      case 'admin': return ['User management', 'Role permissions', 'System configuration'];
      case 'calendar': return ['Color-coded appointments', 'Drag & drop scheduling', 'Multiple view modes'];
      case 'appointments': return ['Real-time availability', 'Auto-conflict detection', 'SMS confirmations'];
      case 'billing': return ['Multiple payment methods', 'Insurance processing', 'Automated reports'];
      case 'doc-ai': return ['Medical consultations', 'Drug interactions', 'Diagnosis assistance'];
      case 'chat': return ['Team communication', 'File sharing', 'Real-time messaging'];
      case 'bulk-messaging': return ['Patient notifications', 'Appointment reminders', 'Health campaigns'];
      default: return ['Explore features', 'Easy navigation'];
    }
  };

  const getStatusBadge = (status: Patient['status']) => {
    const statusConfig = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      'no-show': { variant: 'secondary', label: 'No Show' }
    };
    
    const config = statusConfig[status] as any;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Helper functions for appointment dashboard
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

  // Calculate appointment KPIs
  const appointmentKPIs = {
    totalToday: mockAppointments.length,
    vitalsRequired: mockAppointments.filter(apt => apt.status === 'vitals-required').length,
    doctorFollowUps: mockAppointments.filter(apt => apt.status === 'awaiting-reconsultation').length,
    labFollowUps: mockAppointments.filter(apt => apt.status === 'lab-test-required').length,
    completed: mockAppointments.filter(apt => apt.status === 'completed').length
  };

  // Filter appointments
  const filteredAppointments = mockAppointments.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesDoctor = doctorFilter === 'all' || appointment.doctorName === doctorFilter;
    const matchesSelectedStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
    
    return matchesSearch && matchesStatus && matchesDoctor && matchesSelectedStatus;
  });

  const uniqueDoctors = [...new Set(mockAppointments.map(apt => apt.doctorName))];

  const renderContent = () => {
    if (selectedPatientId) {
      return <EPrescription patientId={selectedPatientId} />;
    }

    switch (currentPage) {
      case 'calendar':
        return <DoctorCalendar />;
      case 'admin':
        return <AdminDashboard />;
      case 'appointments':
        return <AppointmentDashboard />;
      case 'billing':
        return <Billing />;
      case 'doc-ai':
        return <DocAI />;
      case 'chat':
        return <InternalChat />;
      case 'bulk-messaging':
        return <BulkMessaging />;
      default:
        return (
          <div className="space-y-4 lg:space-y-6">
            {/* Profile Completion Banner */}
            {profileScore < 90 && !localStorage.getItem('easyHMS_setupCompleted') && (
              <ProfileCompletionBanner
                profileScore={profileScore}
                onOpenSetup={() => setShowSetup(true)}
                onDismiss={() => setShowProfileCompletion(false)}
              />
            )}

            {/* Legacy Profile Completion Card */}
            {showProfileCompletion && localStorage.getItem('easyHMS_setupCompleted') && (
              <ProfileCompletion onClose={() => setShowProfileCompletion(false)} />
            )}

            {/* Quick Navigation */}
            <ContextualGuide {...DASHBOARD_GUIDES['quick-nav']}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4 mb-6">
                {navigation.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-16 sm:h-18 lg:h-20 flex-col gap-1 lg:gap-2 text-xs"
                    onClick={() => setCurrentPage(item.id)}
                  >
                    <item.icon className="h-4 w-4 lg:h-6 lg:w-6" />
                    <span className="text-center leading-tight">{item.name}</span>
                  </Button>
                ))}
              </div>
            </ContextualGuide>

            {/* KPI Cards */}
            <ContextualGuide {...DASHBOARD_GUIDES['kpi-cards']}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {kpiData.map((kpi, index) => (
                  <Card key={index} className="shadow-card hover:shadow-hover transition-shadow">
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
                ))}
              </div>
            </ContextualGuide>

            {/* Filters & Search */}
            <Card className="bg-card shadow-card rounded-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Filter className="h-5 w-5 text-healthcare-primary" />
                  🔍 Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by Patient ID or Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-input focus:border-healthcare-primary focus:ring-healthcare-primary/20"
                      />
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="vitals-required">❤️ Vitals Required</SelectItem>
                      <SelectItem value="ready-consultation">✅ Ready For Consultation</SelectItem>
                      <SelectItem value="under-consultation">👨‍⚕️ Under Consultation</SelectItem>
                      <SelectItem value="lab-test-required">🧪 Lab Test Required</SelectItem>
                      <SelectItem value="awaiting-reconsultation">⏳ Awaiting Reconsultation</SelectItem>
                      <SelectItem value="completed">🏁 Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {uniqueDoctors.map(doctor => (
                        <SelectItem key={doctor} value={doctor}>🧑‍⚕️ {doctor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Patient Journey Dashboard */}
            <ContextualGuide {...DASHBOARD_GUIDES['patient-table']}>
              <Card className="bg-card shadow-card rounded-xl border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-foreground text-lg md:text-xl">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                    📊 Patient Journey Dashboard
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track patient progress through appointment stages
                  </p>
                </CardHeader>

                {/* Patient Journey Navigation */}
                <div className="px-3 md:px-6 pb-4">
                  <div className="bg-gradient-to-r from-healthcare-primary/10 to-healthcare-secondary/10 rounded-xl p-4 border border-healthcare-primary/20">
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
                        onClick={() => setSelectedStatus('all')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'all'
                            ? 'bg-healthcare-primary text-white border-healthcare-primary shadow-lg shadow-healthcare-primary/25'
                            : 'bg-healthcare-primary/5 text-healthcare-primary border-healthcare-primary/20 hover:bg-healthcare-primary/10 hover:border-healthcare-primary/30'
                        }`}
                      >
                        <List className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">ALL</div>
                          <div className="text-xs opacity-80">{appointmentKPIs.totalToday} patients</div>
                        </div>
                      </button>

                      {/* Vitals Required */}
                      <button
                        onClick={() => setSelectedStatus('vitals-required')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'vitals-required'
                            ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
                        }`}
                      >
                        <Heart className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Vitals</div>
                          <div className="text-xs opacity-80">{appointmentKPIs.vitalsRequired} patient</div>
                        </div>
                      </button>

                      {/* Ready for Consultation */}
                      <button
                        onClick={() => setSelectedStatus('ready-consultation')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'ready-consultation'
                            ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Ready</div>
                          <div className="text-xs opacity-80">1 patient</div>
                        </div>
                      </button>

                      {/* Under Consultation */}
                      <button
                        onClick={() => setSelectedStatus('under-consultation')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'under-consultation'
                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                        }`}
                      >
                        <Stethoscope className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Consulting</div>
                          <div className="text-xs opacity-80">1 patient</div>
                        </div>
                      </button>

                      {/* Lab Test Required */}
                      <button
                        onClick={() => setSelectedStatus('lab-test-required')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'lab-test-required'
                            ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                        }`}
                      >
                        <FlaskConical className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Lab Test</div>
                          <div className="text-xs opacity-80">{appointmentKPIs.labFollowUps} patient</div>
                        </div>
                      </button>

                      {/* Awaiting Reconsultation */}
                      <button
                        onClick={() => setSelectedStatus('awaiting-reconsultation')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'awaiting-reconsultation'
                            ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300'
                        }`}
                      >
                        <Clock className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Re-consult</div>
                          <div className="text-xs opacity-80">{appointmentKPIs.doctorFollowUps} patient</div>
                        </div>
                      </button>

                      {/* Completed */}
                      <button
                        onClick={() => setSelectedStatus('completed')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'completed'
                            ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/25'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Completed</div>
                          <div className="text-xs opacity-80">{appointmentKPIs.completed} patient</div>
                        </div>
                      </button>

                      {/* Future Appointments Tab - Last Position */}
                      <button
                        onClick={() => setSelectedStatus('future')}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 min-w-[100px] ${
                          selectedStatus === 'future'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                        }`}
                      >
                        <CalendarDays className="h-5 w-5" />
                        <div className="text-center">
                          <div className="font-semibold text-xs">Future</div>
                          <div className="text-xs opacity-80">3 upcoming</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  {/* Enhanced Appointment Table */}
                  <div className="w-full">
                    {/* Desktop Table */}
                    <div className="hidden md:block w-full overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Patient ID</TableHead>
                            <TableHead>Patient Name</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Token</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-mono text-blue-600">
                                {appointment.patientId}
                              </TableCell>
                              <TableCell>{appointment.patientName}</TableCell>
                              <TableCell>{appointment.doctorName}</TableCell>
                              <TableCell>{appointment.appointmentTime}</TableCell>
                              <TableCell>
                                <Badge variant="outline">#{appointment.tokenNo}</Badge>
                              </TableCell>
                              <TableCell>{getAppointmentStatusBadge(appointment.status)}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {filteredAppointments.map((appointment) => (
                        <Card key={appointment.id} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-mono text-blue-600 text-sm">{appointment.patientId}</p>
                              <p className="font-semibold">{appointment.patientName}</p>
                            </div>
                            <Badge variant="outline">#{appointment.tokenNo}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <p>Doctor: {appointment.doctorName}</p>
                            <p>Time: {appointment.appointmentTime}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            {getAppointmentStatusBadge(appointment.status)}
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ContextualGuide>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <img src="/lovable-uploads/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-bold text-healthcare-primary">NexEagle</h1>
              <p className="text-xs text-muted-foreground">easyHMS</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          <ContextualGuide {...DASHBOARD_GUIDES['sidebar-nav']}>
            <div className="space-y-2">
              {navigation.map((item) => (
                <ContextualGuide
                  key={item.id}
                  id={`nav-${item.id}`}
                  title={`🎯 ${item.name}`}
                  description={getNavDescription(item.id)}
                  tips={getNavTips(item.id)}
                  priority="medium"
                  placement="right"
                  triggerMode="hover"
                >
                  <Button
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => {
                      setCurrentPage(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </ContextualGuide>
              ))}
            </div>
          </ContextualGuide>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-healthcare-error hover:text-healthcare-error hover:bg-healthcare-error/10"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold capitalize">
                {currentPage === 'dashboard' ? 'Dashboard' : navigation.find(n => n.id === currentPage)?.name}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Completion Meter */}
              <ContextualGuide {...DASHBOARD_GUIDES['profile-completion']}>
                <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-300" 
                      style={{ width: '75%' }}
                    />
                  </div>
                  <span className="text-xs font-medium">75%</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-healthcare-primary"
                    onClick={() => setShowProfileCompletion(true)}
                  >
                    Complete Profile
                  </Button>
                </div>
              </ContextualGuide>

              {/* Notifications */}
              <ContextualGuide {...DASHBOARD_GUIDES['notifications']}>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-healthcare-error rounded-full"></span>
                </Button>
              </ContextualGuide>

              {/* Language Switcher */}
              <ContextualGuide {...DASHBOARD_GUIDES['language-switcher']}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Globe className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>English</DropdownMenuItem>
                    <DropdownMenuItem>हिंदी</DropdownMenuItem>
                    <DropdownMenuItem>தமிழ்</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ContextualGuide>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-medium">Dr. Ravi Mehta</p>
                      <p className="text-xs text-muted-foreground">Cardiologist</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowProfileCompletion(true)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Complete Profile (75%)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-healthcare-error">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6">
          {renderContent()}
        </main>
      </div>

      {/* Patient Profile Modal */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}

      {/* Welcome Setup Modal */}
      {showSetup && (
        <WelcomeSetup
          onComplete={(setupData) => {
            localStorage.setItem('easyHMS_setupCompleted', 'true');
            localStorage.setItem('easyHMS_setupData', JSON.stringify(setupData));
            setShowSetup(false);
          }}
          onSkip={() => {
            localStorage.setItem('easyHMS_setupSkipped', 'true');
            setShowSetup(false);
          }}
        />
      )}

      {/* Floating AI Chatbot */}
      <FloatingAIChatbot currentPage={currentPage} />
    </div>
  );
};