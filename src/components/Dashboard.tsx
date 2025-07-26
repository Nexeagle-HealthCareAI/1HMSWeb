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
  Search,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ProfilePage } from './ProfilePage';
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
import { PrescriptionSettings } from './PrescriptionSettings';

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
  const [showProfilePage, setShowProfilePage] = useState(false);
  
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
  const userRole = localStorage.getItem('easyHMS_userRole') || 'doctor';

const navigation = [
    { id: 'dashboard', name: 'DocBoard', icon: Home },
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

  // Show profile page if requested
  if (showProfilePage) {
    return (
      <ProfilePage 
        onBack={() => setShowProfilePage(false)} 
        userType={userRole as any}
      />
    );
  }

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
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-2 bg-muted p-1 h-12">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 text-sm lg:text-base font-medium">
                <Home className="h-4 w-4 lg:h-5 lg:w-5" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="prescription-settings" className="flex items-center gap-2 text-sm lg:text-base font-medium">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5" />
                <span>Prescription Settings</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-4 lg:space-y-6">
              {/* Profile Completion Banner */}
              {profileScore < 90 && !localStorage.getItem('easyHMS_setupCompleted') && (
                <ProfileCompletionBanner
                  profileScore={profileScore}
                  onOpenSetup={() => setShowProfilePage(true)}
                  onDismiss={() => setShowProfileCompletion(false)}
                />
              )}

              {/* Legacy Profile Completion Card */}
              {showProfileCompletion && localStorage.getItem('easyHMS_setupCompleted') && (
                <ProfileCompletion onClose={() => setShowProfileCompletion(false)} />
              )}

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

                    <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by Doctor" />
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

              {/* Patient Journey */}
              <Card className="bg-card shadow-card rounded-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-healthcare-primary" />
                    📊 Patient Journey Dashboard
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Track patient progress through appointment stages
                  </p>
                </CardHeader>
                <CardContent>
                  {/* KPI Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
                    <div className="flex items-center justify-between p-3 lg:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400 font-medium">Total Today</p>
                        <p className="text-lg lg:text-xl font-bold text-blue-800 dark:text-blue-200">{appointmentKPIs.totalToday}</p>
                      </div>
                      <List className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 lg:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div>
                        <p className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">Need Vitals</p>
                        <p className="text-lg lg:text-xl font-bold text-red-800 dark:text-red-200">{appointmentKPIs.vitalsRequired}</p>
                      </div>
                      <Heart className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 lg:p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div>
                        <p className="text-xs lg:text-sm text-yellow-600 dark:text-yellow-400 font-medium">Doc Follow-ups</p>
                        <p className="text-lg lg:text-xl font-bold text-yellow-800 dark:text-yellow-200">{appointmentKPIs.doctorFollowUps}</p>
                      </div>
                      <Stethoscope className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 lg:p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div>
                        <p className="text-xs lg:text-sm text-purple-600 dark:text-purple-400 font-medium">Lab Follow-ups</p>
                        <p className="text-lg lg:text-xl font-bold text-purple-800 dark:text-purple-200">{appointmentKPIs.labFollowUps}</p>
                      </div>
                      <FlaskConical className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 lg:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div>
                        <p className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                        <p className="text-lg lg:text-xl font-bold text-green-800 dark:text-green-200">{appointmentKPIs.completed}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                    </div>
                  </div>

                  {/* Status Navigation */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { id: 'all', label: 'All', count: filteredAppointments.length },
                      { id: 'vitals-required', label: 'Vitals Required', count: filteredAppointments.filter(a => a.status === 'vitals-required').length },
                      { id: 'ready-consultation', label: 'Ready', count: filteredAppointments.filter(a => a.status === 'ready-consultation').length },
                      { id: 'under-consultation', label: 'Consulting', count: filteredAppointments.filter(a => a.status === 'under-consultation').length },
                      { id: 'lab-test-required', label: 'Lab Test', count: filteredAppointments.filter(a => a.status === 'lab-test-required').length },
                      { id: 'awaiting-reconsultation', label: 'Re-consult', count: filteredAppointments.filter(a => a.status === 'awaiting-reconsultation').length },
                      { id: 'completed', label: 'Completed', count: filteredAppointments.filter(a => a.status === 'completed').length }
                    ].map((status) => (
                      <Button
                        key={status.id}
                        variant={selectedStatus === status.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus(status.id)}
                        className="text-xs lg:text-sm"
                      >
                        {status.label} ({status.count})
                      </Button>
                    ))}
                  </div>

                  {/* Appointments Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs lg:text-sm">Token</TableHead>
                          <TableHead className="text-xs lg:text-sm">Patient</TableHead>
                          <TableHead className="hidden sm:table-cell text-xs lg:text-sm">Doctor</TableHead>
                          <TableHead className="text-xs lg:text-sm">Time</TableHead>
                          <TableHead className="text-xs lg:text-sm">Status</TableHead>
                          <TableHead className="hidden lg:table-cell text-xs lg:text-sm">Vitals</TableHead>
                          <TableHead className="text-xs lg:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.slice(0, 10).map((appointment) => (
                          <TableRow key={appointment.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-xs lg:text-sm">
                              #{appointment.tokenNo}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 lg:h-8 lg:w-8">
                                  <AvatarFallback className="text-xs">
                                    {appointment.patientName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-xs lg:text-sm">{appointment.patientName}</div>
                                  <div className="text-xs text-muted-foreground hidden sm:block">ID: {appointment.patientId}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs lg:text-sm">{appointment.doctorName}</TableCell>
                            <TableCell className="text-xs lg:text-sm">{appointment.appointmentTime}</TableCell>
                            <TableCell>{getAppointmentStatusBadge(appointment.status)}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {appointment.vitalsUpdated ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">✓ Updated</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 text-xs">⚠ Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 lg:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedPatientId(appointment.patientId)}
                                  className="text-xs lg:text-sm"
                                >
                                  <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
                                  <span className="hidden lg:inline ml-1">View</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="prescription-settings">
              <PrescriptionSettings />
            </TabsContent>
          </Tabs>
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
                {currentPage === 'dashboard' ? 'DocBoard' : navigation.find(n => n.id === currentPage)?.name}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Completion Meter */}
              <ContextualGuide {...DASHBOARD_GUIDES['profile-completion']}>
                <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-300" 
                      style={{ width: `${profileScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{profileScore}%</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-healthcare-primary"
                    onClick={() => setShowProfilePage(true)}
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
                  <DropdownMenuItem onClick={() => setShowProfilePage(true)}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  {profileScore < 90 && (
                    <DropdownMenuItem onClick={() => setShowProfilePage(true)} className="text-blue-600">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Complete Profile ({profileScore}%)
                    </DropdownMenuItem>
                  )}
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