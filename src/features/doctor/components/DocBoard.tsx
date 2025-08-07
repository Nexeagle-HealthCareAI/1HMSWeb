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
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ContextualGuide } from './guide/ContextualGuide';
// import { DASHBOARD_GUIDES } from './guide/GuideData';
import { PrescriptionSettings } from './PrescriptionSettings';

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

export const DocBoard: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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
    { id: "A001", patientId: "P001", patientName: "Rahul Sharma", doctorName: "Dr. Patel", appointmentTime: "09:00 AM", tokenNo: 1, vitalsUpdated: true, status: "ready-consultation", phone: "+91-98765-43210" },
    { id: "A002", patientId: "P002", patientName: "Priya Singh", doctorName: "Dr. Kumar", appointmentTime: "09:30 AM", tokenNo: 2, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43211" },
    { id: "A003", patientId: "P003", patientName: "Amit Kumar", doctorName: "Dr. Patel", appointmentTime: "10:00 AM", tokenNo: 3, vitalsUpdated: true, status: "under-consultation", phone: "+91-98765-43212" },
    { id: "A004", patientId: "P004", patientName: "Neha Gupta", doctorName: "Dr. Sharma", appointmentTime: "10:30 AM", tokenNo: 4, vitalsUpdated: true, status: "lab-test-required", phone: "+91-98765-43213" },
    { id: "A005", patientId: "P005", patientName: "Vikram Singh", doctorName: "Dr. Kumar", appointmentTime: "11:00 AM", tokenNo: 5, vitalsUpdated: false, status: "awaiting-reconsultation", phone: "+91-98765-43214" }
  ];

  // Mock future appointments for the "Future" tab
  const mockFutureAppointments: Appointment[] = [
    { id: "F001", patientId: "P006", patientName: "Sita Devi", doctorName: "Dr. Patel", appointmentTime: "02:00 PM", tokenNo: 6, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43215" },
    { id: "F002", patientId: "P007", patientName: "Rajesh Kumar", doctorName: "Dr. Sharma", appointmentTime: "03:00 PM", tokenNo: 7, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43216" },
    { id: "F003", patientId: "P008", patientName: "Meera Singh", doctorName: "Dr. Kumar", appointmentTime: "04:00 PM", tokenNo: 8, vitalsUpdated: false, status: "vitals-required", phone: "+91-98765-43217" }
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
    setSelectedStatus(status);
    // Reset dropdown filters when journey flow button is clicked
    setStatusFilter('all');
  };

  // Get appointments based on selected status
  const getAppointmentsToShow = () => {
    if (selectedStatus === 'future') {
      return mockFutureAppointments;
    }
    return mockAppointments;
  };

  // Handle patient ID click
  const handlePatientIdClick = (patientId: string) => {
    // Navigate to patient details page
    navigate(`/patient/${patientId}`);
  };

  // Filter appointments
  const appointmentsToFilter = getAppointmentsToShow();
  const filteredAppointments = appointmentsToFilter.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Use selectedStatus from patient journey flow as primary filter
    const matchesJourneyStatus = selectedStatus === 'all' || selectedStatus === 'future' || appointment.status === selectedStatus;
    
    // Only apply dropdown filters if no specific journey status is selected
    const matchesDropdownStatus = selectedStatus === 'all' ? (statusFilter === 'all' || appointment.status === statusFilter) : true;
    const matchesDoctor = doctorFilter === 'all' || appointment.doctorName === doctorFilter;
    
    return matchesSearch && matchesJourneyStatus && matchesDropdownStatus && matchesDoctor;
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
        {/* KPI Cards */}
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
                    placeholder="Search patients or appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
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
        {/* Patient Journey Flow */}
        <Card className="bg-card shadow-card rounded-xl border-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
              📊 Patient Journey Dashboard
            </div>
            <p className="text-sm text-muted-foreground">
              Track patient progress through appointment stages
            </p>
          </CardHeader>
          <CardContent>
            {/* Enhanced Patient Journey Navigation Header - Full Screen */}
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
                    }`}
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
                    }`}
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
                    }`}
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
                    }`}
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
                    }`}
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
                    }`}
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
                    }`}
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
          </CardContent>
        </Card>

        

        {/* Appointments Table */}
        <Card className="bg-card shadow-card rounded-xl border-0">
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
                            className="font-mono text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                            onClick={() => handlePatientIdClick(appointment.patientId)}
                          >
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
                            className="font-mono text-blue-600 text-sm cursor-pointer hover:text-blue-800 hover:underline"
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
      </TabsContent>
      
      <TabsContent value="prescription-settings">
        <PrescriptionSettings />
      </TabsContent>
    </Tabs>
  );
}; 