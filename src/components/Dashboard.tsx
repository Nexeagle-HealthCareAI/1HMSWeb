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
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  
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

            {/* Today's Patients Table */}
            <ContextualGuide {...DASHBOARD_GUIDES['patient-table']}>
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="text-xl font-bold">Today's Patients</CardTitle>
                    <div className="flex gap-2 overflow-x-auto">
                      <Button variant="outline" size="sm" className="whitespace-nowrap">Yesterday</Button>
                      <Button variant="default" size="sm" className="whitespace-nowrap">Today</Button>
                      <Button variant="outline" size="sm" className="whitespace-nowrap">Last Month</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Patient ID</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Contact</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Token</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Doctor</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Time</th>
                        <th className="text-left py-3 px-2 lg:px-4 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayPatients.map((patient) => (
                        <tr key={patient.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2 lg:px-4">
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-medium text-healthcare-primary text-sm"
                              onClick={() => setSelectedPatientId(patient.id)}
                            >
                              {patient.id}
                            </Button>
                          </td>
                          <td className="py-3 px-2 lg:px-4 font-medium text-sm">{patient.name}</td>
                          <td className="py-3 px-2 lg:px-4 text-muted-foreground text-sm">{patient.contact}</td>
                          <td className="py-3 px-2 lg:px-4">
                            <Badge variant="outline" className="text-xs">{patient.token}</Badge>
                          </td>
                          <td className="py-3 px-2 lg:px-4 text-sm">{patient.doctor}</td>
                          <td className="py-3 px-2 lg:px-4 text-sm">{patient.time}</td>
                          <td className="py-3 px-2 lg:px-4">{getStatusBadge(patient.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3 lg:space-y-4">
                  {todayPatients.map((patient) => (
                    <Card key={patient.id} className="p-3 lg:p-4 shadow-sm border">
                      <div className="flex justify-between items-start mb-2 lg:mb-3">
                        <div className="min-w-0 flex-1">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium text-healthcare-primary text-base lg:text-lg"
                            onClick={() => setSelectedPatientId(patient.id)}
                          >
                            {patient.id}
                          </Button>
                          <h3 className="font-semibold text-foreground text-sm lg:text-base truncate">{patient.name}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{patient.token}</Badge>
                          {getStatusBadge(patient.status)}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contact:</span>
                          <span className="font-medium truncate ml-2">{patient.contact}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Doctor:</span>
                          <span className="font-medium truncate ml-2">{patient.doctor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">{patient.time}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
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