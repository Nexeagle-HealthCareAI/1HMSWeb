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
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {showProfileCompletion && (
              <ProfileCompletion onClose={() => setShowProfileCompletion(false)} />
            )}

            {/* Quick Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {navigation.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => setCurrentPage(item.id)}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs text-center">{item.name}</span>
                </Button>
              ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiData.map((kpi, index) => (
                <Card key={index} className="shadow-card hover:shadow-hover transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="text-3xl font-bold text-foreground">
                          {kpi.value}
                        </p>
                        <p className={`text-xs ${
                          kpi.change.startsWith('+') ? 'text-healthcare-success' : 'text-healthcare-error'
                        }`}>
                          {kpi.change} from yesterday
                        </p>
                      </div>
                      <div className={`p-3 rounded-full bg-${kpi.color}/10`}>
                        <kpi.icon className={`h-6 w-6 text-${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Today's Patients Table */}
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Patient ID</th>
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Contact</th>
                        <th className="text-left py-3 px-4 font-semibold">Token</th>
                        <th className="text-left py-3 px-4 font-semibold">Doctor</th>
                        <th className="text-left py-3 px-4 font-semibold">Time</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayPatients.map((patient) => (
                        <tr key={patient.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-medium text-healthcare-primary"
                             onClick={() => setSelectedPatientId(patient.id)}
                            >
                              {patient.id}
                            </Button>
                          </td>
                          <td className="py-3 px-4 font-medium">{patient.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{patient.contact}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{patient.token}</Badge>
                          </td>
                          <td className="py-3 px-4">{patient.doctor}</td>
                          <td className="py-3 px-4">{patient.time}</td>
                          <td className="py-3 px-4">{getStatusBadge(patient.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {todayPatients.map((patient) => (
                    <Card key={patient.id} className="p-4 shadow-sm border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium text-healthcare-primary text-lg"
                            onClick={() => setSelectedPatientId(patient.id)}
                          >
                            {patient.id}
                          </Button>
                          <h3 className="font-semibold text-foreground">{patient.name}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline">{patient.token}</Badge>
                          {getStatusBadge(patient.status)}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contact:</span>
                          <span className="font-medium">{patient.contact}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Doctor:</span>
                          <span className="font-medium">{patient.doctor}</span>
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
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Stethoscope className="h-6 w-6 text-white" />
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
          {navigation.map((item) => (
            <Button
              key={item.id}
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
          ))}
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
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-card border-b px-6 py-4">
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

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-healthcare-error rounded-full"></span>
              </Button>

              {/* Language Switcher */}
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
        <main className="p-6">
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

      {/* Floating AI Chatbot */}
      <FloatingAIChatbot currentPage={currentPage} />
    </div>
  );
};