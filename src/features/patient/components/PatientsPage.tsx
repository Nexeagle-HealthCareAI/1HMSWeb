import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Sparkles,
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CheckCircle2,
  Circle,
  Clock,
  Phone,
  Stethoscope,
  FlaskConical,
  UserCheck,
  Heart,
  MoreVertical,
  Search,
  ArrowUpDown,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { mockCurrentAppointments, StatusTransitionStep } from '../utils/mockCurrentAppointments';
import { mockPatientListResponse } from '../utils/mockPatientList';

type Tab = 'today' | 'patient360';


export const PatientsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [patient360Page, setPatient360Page] = useState(1);
  const patient360ItemsPerPage = 10;
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedPatient, setSelectedPatient] = useState<typeof mockPatientListResponse.Patient[0] | null>(null);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [patient360SearchQuery, setPatient360SearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof mockPatientListResponse.Patient[0] | 'RegistrationDate', direction: 'asc' | 'desc' } | null>(null);
  const [todaySortConfig, setTodaySortConfig] = useState<{ key: 'patientName' | 'contact' | 'doctorName' | 'currentStatus', direction: 'asc' | 'desc' } | null>(null);

  const handleTodaySort = (key: 'patientName' | 'contact' | 'doctorName' | 'currentStatus') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (todaySortConfig && todaySortConfig.key === key && todaySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setTodaySortConfig({ key, direction });
  };

  const handleSort = (key: keyof typeof mockPatientListResponse.Patient[0] | 'RegistrationDate') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Compute Doctor Counts
  const doctorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    mockCurrentAppointments.forEach(apt => {
      if (apt.doctorName) {
        stats[apt.doctorName] = (stats[apt.doctorName] || 0) + 1;
      }
    });
    return stats;
  }, []);

  // Compute Overall Stats
  const dashboardStats = useMemo(() => {
    return {
      totalPatients: mockCurrentAppointments.length,
      activeDoctors: Object.keys(doctorStats).length,
      pendingVitals: mockCurrentAppointments.filter(a => a.currentStatus === 'VITALS_REQUIRED').length,
      underConsult: mockCurrentAppointments.filter(a => a.currentStatus === 'UNDER_CONSULT').length,
      completed: mockCurrentAppointments.filter(a => a.currentStatus === 'COMPLETED').length,
      cancelled: mockCurrentAppointments.filter(a => a.currentStatus === 'CANCELLED').length
    };
  }, [doctorStats]);

  const patientStats = useMemo(() => {
    const patients = mockPatientListResponse.Patient;
    return {
      total: patients.length,
      males: patients.filter(p => p.Sex.toLowerCase() === 'male').length,
      females: patients.filter(p => p.Sex.toLowerCase() === 'female').length,
      cities: new Set(patients.map(p => p.City)).size
    };
  }, []);

  // Advanced Analytics
  const patientAnalytics = useMemo(() => {
    const patients = mockPatientListResponse.Patient;

    // Age band distribution
    const ageBands = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '60+': 0
    };

    patients.forEach(p => {
      const age = parseInt(p.Age);
      if (age <= 18) ageBands['0-18']++;
      else if (age <= 30) ageBands['19-30']++;
      else if (age <= 45) ageBands['31-45']++;
      else if (age <= 60) ageBands['46-60']++;
      else ageBands['60+']++;
    });

    // Gender-specific age distribution
    const maleAgeBands = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    const femaleAgeBands = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };

    patients.forEach(p => {
      const age = parseInt(p.Age);
      const bands = p.Sex.toLowerCase() === 'male' ? maleAgeBands : femaleAgeBands;
      if (age <= 18) bands['0-18']++;
      else if (age <= 30) bands['19-30']++;
      else if (age <= 45) bands['31-45']++;
      else if (age <= 60) bands['46-60']++;
      else bands['60+']++;
    });

    // Top cities and pincodes
    const cityCount: Record<string, number> = {};
    const pincodeCount: Record<string, number> = {};

    patients.forEach(p => {
      cityCount[p.City] = (cityCount[p.City] || 0) + 1;
      pincodeCount[p.PinCode] = (pincodeCount[p.PinCode] || 0) + 1;
    });

    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topPincodes = Object.entries(pincodeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Data completeness score
    let totalFields = 0;
    let filledFields = 0;

    patients.forEach(p => {
      const fields = [p.PatientId, p.Name, p.Age, p.Sex, p.Contact, p.AddressLine, p.City, p.State, p.Country, p.PinCode];
      totalFields += fields.length;
      filledFields += fields.filter(f => f && f.trim() !== '').length;
    });

    const completenessScore = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    // Registration statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const registrationStats = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0
    };

    patients.forEach(p => {
      const regDate = new Date(p.RegistrationDate);
      if (regDate >= today) registrationStats.today++;
      if (regDate >= startOfWeek) registrationStats.thisWeek++;
      if (regDate >= startOfMonth) registrationStats.thisMonth++;
      if (regDate >= startOfYear) registrationStats.thisYear++;
    });

    return {
      ageBands,
      maleAgeBands,
      femaleAgeBands,
      topCities,
      topPincodes,
      completenessScore,
      registrationStats
    };
  }, []);

  const navItems = [
    {
      id: 'today' as Tab,
      label: 'Today Appointment',
      icon: CalendarDays,
    },
    {
      id: 'patient360' as Tab,
      label: 'Patient 360',
      icon: Users,
    },
  ];

  const getStatusIcon = (status: StatusTransitionStep['status']) => {
    switch (status) {
      case 'VITALS_REQUIRED':
        return Heart;
      case 'READY':
        return UserCheck;
      case 'UNDER_CONSULT':
        return Stethoscope;
      case 'LAB_REQUIRED':
        return FlaskConical;
      case 'AWAITING_RECONSULT':
        return Clock;
      case 'COMPLETED':
        return CheckCircle2;
      case 'CANCELLED':
        return Circle; // Or XCircle
      default:
        return Circle;
    }
  };

  const getStepColor = (step: StatusTransitionStep) => {
    if (step.isCompleted) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (step.isCurrent) return 'text-blue-600 bg-blue-50 border-blue-200 ring-2 ring-blue-100';
    return 'text-gray-400 bg-gray-50 border-gray-200';
  };

  const getLineColor = (step: StatusTransitionStep, nextStep?: StatusTransitionStep) => {
    if (step.isCompleted) return 'bg-emerald-500';
    return 'bg-gray-200';
  };

  const filteredAndSortedAppointments = useMemo(() => {
    let result = [...mockCurrentAppointments];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(apt =>
        apt.patientName.toLowerCase().includes(query) ||
        apt.patientId.toLowerCase().includes(query) ||
        apt.contact.includes(query)
      );
    }

    // Filter by Doctor
    if (selectedDoctor && selectedDoctor !== 'all') {
      result = result.filter(apt => apt.doctorName === selectedDoctor);
    }

    // Sort
    // Sort
    if (todaySortConfig) {
      result.sort((a, b) => {
        const aValue = a[todaySortConfig.key];
        const bValue = b[todaySortConfig.key];

        if (aValue < bValue) {
          return todaySortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return todaySortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort (fallback to time or existing sortBy if you want to keep legacy support, 
      // but usually column sort replaces generic sort)
      // Keeping simple default time sort if no column selected
      result.sort((a, b) => 0);
    }

    return result;
  }, [searchQuery, selectedDoctor, todaySortConfig]);




  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-3 top-6 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Sidebar Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Workspace</span>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                  isSidebarCollapsed ? "justify-center" : "gap-3"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                )} />

                {!isSidebarCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                )}

                {isActive && !isSidebarCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20 p-4 lg:p-6">
        {activeTab === 'today' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Appointments</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage and track patient flows effectively.</p>
              </div>

            </div>

            {/* Admin Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-lg shadow-blue-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Total Patients</p>
                    <h3 className="text-3xl font-bold">{dashboardStats.totalPatients}</h3>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Completed</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.completed}</h3>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Cancelled</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.cancelled}</h3>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                    <Circle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">In Consultation</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.underConsult}</h3>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                    <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Pending Vitals</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardStats.pendingVitals}</h3>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
                    <Heart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operations Bar */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patient, ID or phone..."
                  className="pl-9 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 focus-visible:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                {/* Doctor Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline">Doctor:</span>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-full sm:w-[220px] bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                      <div className="flex items-center gap-2 truncate">
                        <Stethoscope className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <SelectValue placeholder="All Doctors" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center justify-between gap-2 w-full">
                          <span>All Doctors</span>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-600">
                            {mockCurrentAppointments.length}
                          </Badge>
                        </span>
                      </SelectItem>
                      {Object.entries(doctorStats).map(([docName, count]) => (
                        <SelectItem key={docName} value={docName}>
                          <span className="flex items-center justify-between gap-2 w-full min-w-[140px]">
                            <span className="truncate max-w-[120px]" title={docName}>{docName}</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                              {count}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableHead
                      className="w-[250px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                      onClick={() => handleTodaySort('patientName')}
                    >
                      <div className="flex items-center gap-1">
                        Patient
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                      onClick={() => handleTodaySort('contact')}
                    >
                      <div className="flex items-center gap-1">
                        Contact
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                      onClick={() => handleTodaySort('doctorName')}
                    >
                      <div className="flex items-center gap-1">
                        Doctor
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                      onClick={() => handleTodaySort('currentStatus')}
                    >
                      <div className="flex items-center gap-1">
                        CurrStatus
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead>Workflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const totalPages = Math.ceil(filteredAndSortedAppointments.length / itemsPerPage);
                    const paginatedAppointments = filteredAndSortedAppointments.slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    );

                    return paginatedAppointments.length > 0 ? (
                      paginatedAppointments.map((appointment) => (
                        <TableRow key={appointment.appointmentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {appointment.patientId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="h-3.5 w-3.5" />
                              {appointment.contact}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{appointment.doctorName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "capitalize",
                              appointment.currentStatus === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                appointment.currentStatus === 'CANCELLED' ? "bg-red-50 text-red-700 border-red-200" :
                                  "bg-blue-50 text-blue-700 border-blue-200"
                            )}>
                              {appointment.currentStatus.replace(/_/g, ' ').toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2 max-w-[300px]" title="Workflow Progress">
                              {appointment.statusTransition.map((step, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && (
                                    <ArrowRight className="h-3 w-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                  )}
                                  <div
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors",
                                      step.isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        step.isCurrent ? "bg-blue-50 text-blue-700 border-blue-200" :
                                          "bg-gray-50 text-gray-400 border-gray-100"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        step.isCompleted ? "bg-emerald-500" :
                                          step.isCurrent ? "bg-blue-600 animate-pulse" :
                                            "bg-gray-300"
                                      )}
                                    />
                                    <span>{step.label}</span>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Search className="h-8 w-8 mb-2 opacity-20" />
                            <p>No appointments found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {filteredAndSortedAppointments.length > 0 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedAppointments.length)}</span> of <span className="font-medium">{filteredAndSortedAppointments.length}</span> results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">
                      Page {currentPage} of {Math.ceil(filteredAndSortedAppointments.length / itemsPerPage)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAndSortedAppointments.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(filteredAndSortedAppointments.length / itemsPerPage)}
                      className="h-8 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>



          </div>
        )
        }

        {activeTab === 'patient360' && (
          <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
            <div className="flex items-center justify-between px-1 shrink-0">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Patient 360</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Comprehensive view of all registered patients.</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Search name, ID or phone..."
                  className="pl-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                  value={patient360SearchQuery}
                  onChange={(e) => setPatient360SearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
              {/* Total Patients */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-md">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium mb-1 uppercase tracking-wide">Total Patients</p>
                    <h3 className="text-3xl font-bold">{patientStats.total}</h3>
                  </div>
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Male Patients */}
              <Card
                className={cn(
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-blue-300 transition-colors",
                  selectedGender === 'male' && "ring-2 ring-blue-500 border-transparent"
                )}
                onClick={() => setSelectedGender(selectedGender === 'male' ? 'all' : 'male')}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide">Male</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{patientStats.males}</h3>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Female Patients */}
              <Card
                className={cn(
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-pink-300 transition-colors",
                  selectedGender === 'female' && "ring-2 ring-pink-500 border-transparent"
                )}
                onClick={() => setSelectedGender(selectedGender === 'female' ? 'all' : 'female')}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide">Female</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{patientStats.females}</h3>
                  </div>
                  <div className="bg-pink-100 dark:bg-pink-900/30 p-2.5 rounded-lg">
                    <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Cities */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide">Cities</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{patientStats.cities}</h3>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-lg">
                    <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
              {/* Main Content: Table (Left) */}
              <div className="col-span-12 xl:col-span-9 flex flex-col h-full overflow-hidden order-2 xl:order-1">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">
                        <TableRow className="hover:bg-transparent">
                          <TableHead
                            className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                            onClick={() => handleSort('Name')}
                          >
                            <div className="flex items-center gap-1">
                              Patient
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                            onClick={() => handleSort('Age')}
                          >
                            <div className="flex items-center gap-1">
                              Demographics
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                            onClick={() => handleSort('Contact')}
                          >
                            <div className="flex items-center gap-1">
                              Contact
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                            onClick={() => handleSort('RegistrationDate')}
                          >
                            <div className="flex items-center gap-1">
                              Registered On
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                            onClick={() => handleSort('AddressLine')}
                          >
                            <div className="flex items-center gap-1">
                              Address
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          let filteredPatients = mockPatientListResponse.Patient.filter(p =>
                            p.Name.toLowerCase().includes(patient360SearchQuery.toLowerCase()) ||
                            p.PatientId.toLowerCase().includes(patient360SearchQuery.toLowerCase()) ||
                            p.Contact.includes(patient360SearchQuery)
                          );

                          let sortedPatients = [...filteredPatients];
                          if (sortConfig !== null) {
                            sortedPatients.sort((a, b) => {
                              if (sortConfig.key === 'Age') {
                                return sortConfig.direction === 'asc'
                                  ? parseInt(a.Age) - parseInt(b.Age)
                                  : parseInt(b.Age) - parseInt(a.Age);
                              }
                              if (a[sortConfig.key] < b[sortConfig.key]) {
                                return sortConfig.direction === 'asc' ? -1 : 1;
                              }
                              if (a[sortConfig.key] > b[sortConfig.key]) {
                                return sortConfig.direction === 'asc' ? 1 : -1;
                              }
                              return 0;
                            });
                          }

                          const startIndex = (patient360Page - 1) * patient360ItemsPerPage;
                          const endIndex = startIndex + patient360ItemsPerPage;
                          const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

                          if (paginatedPatients.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                  No patients found matching your search.
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return paginatedPatients.map((patient) => (
                            <TableRow key={patient.PatientId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{patient.Name}</span>
                                  <button
                                    onClick={() => {
                                      setSelectedPatient(patient);
                                      setIsPatientDialogOpen(true);
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer hover:underline transition-colors w-fit"
                                  >
                                    <Users className="h-3 w-3" />
                                    {patient.PatientId}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  {patient.Age} yrs / {patient.Sex}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Phone className="h-3.5 w-3.5" />
                                  {patient.Contact}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(patient.RegistrationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ').replace(/(?<=\w) (?=\d{4})/, ', ')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={patient.AddressLine}>
                                  {patient.AddressLine}, {patient.PinCode}
                                </div>
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls - Fixed at Bottom */}
                  {mockPatientListResponse.Patient.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-medium">{(patient360Page - 1) * patient360ItemsPerPage + 1}</span> to <span className="font-medium">{Math.min(patient360Page * patient360ItemsPerPage, mockPatientListResponse.Patient.length)}</span> of <span className="font-medium">{mockPatientListResponse.Patient.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPatient360Page(p => Math.max(1, p - 1))}
                          disabled={patient360Page === 1}
                          className="h-8 text-xs"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          Prev
                        </Button>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">
                          {patient360Page} / {Math.ceil(mockPatientListResponse.Patient.length / patient360ItemsPerPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPatient360Page(p => Math.min(Math.ceil(mockPatientListResponse.Patient.length / patient360ItemsPerPage), p + 1))}
                          disabled={patient360Page === Math.ceil(mockPatientListResponse.Patient.length / patient360ItemsPerPage)}
                          className="h-8 text-xs"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: KPIs & Analytics (Right) */}
              <div className="col-span-12 xl:col-span-3 h-full overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-2 order-1 xl:order-2">

                {/* New Reg - Full Width */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none text-white shadow-md">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide text-emerald-100">
                        New Registrations
                      </CardTitle>
                      <Select value={selectedTimePeriod} onValueChange={(value: any) => setSelectedTimePeriod(value)}>
                        <SelectTrigger className="w-[80px] h-6 bg-white/20 border-white/30 text-white hover:bg-white/30 text-[10px] px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold">
                        {selectedTimePeriod === 'today' ? patientAnalytics.registrationStats.today :
                          selectedTimePeriod === 'week' ? patientAnalytics.registrationStats.thisWeek :
                            selectedTimePeriod === 'month' ? patientAnalytics.registrationStats.thisMonth :
                              patientAnalytics.registrationStats.thisYear}
                      </h3>
                      <p className="text-emerald-100 text-xs">
                        {selectedTimePeriod === 'today' ? 'Today' :
                          selectedTimePeriod === 'week' ? 'This Week' :
                            selectedTimePeriod === 'month' ? 'This Month' :
                              'This Year'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics - Stacked */}

                {/* Age Band */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Age Distribution ({selectedGender === 'all' ? 'All' : selectedGender === 'male' ? 'M' : 'F'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {Object.entries(
                      selectedGender === 'male' ? patientAnalytics.maleAgeBands :
                        selectedGender === 'female' ? patientAnalytics.femaleAgeBands :
                          patientAnalytics.ageBands
                    ).map(([band, count]) => (
                      <div key={band} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">{band}</span>
                        <div className="flex items-center gap-2 flex-1 mx-2">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(count / patientStats.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Top Cities */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Cities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {patientAnalytics.topCities.slice(0, 5).map(([city, count]) => (
                      <div key={city} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{city}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Data Quality */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Completeness</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{patientAnalytics.completenessScore}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${patientAnalytics.completenessScore}%` }}
                      />
                    </div>

                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Top Pincodes</p>
                    <div className="grid grid-cols-3 gap-1">
                      {patientAnalytics.topPincodes.slice(0, 3).map(([pincode, count]) => (
                        <div key={pincode} className="bg-gray-50 dark:bg-gray-800/50 rounded px-1.5 py-1 text-center">
                          <div className="text-[10px] font-bold text-gray-900 dark:text-gray-100">{pincode}</div>
                          <div className="text-[9px] text-gray-500">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )
        }
      </main >

      {/* Patient Details Dialog */}
      <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Patient Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedPatient?.Name}
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Patient ID and Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient ID</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.PatientId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.Name}</p>
                </div>
              </div>

              {/* Demographics */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Demographics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Age</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.Age} years</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sex</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.Sex}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Date</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {new Date(selectedPatient.RegistrationDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                  <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.Contact}</p>
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Street Address</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.AddressLine}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                      <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.City}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                      <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.State}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PIN Code</label>
                      <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.PinCode}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Country</label>
                    <p className="text-base text-gray-900 dark:text-gray-100">{selectedPatient.Country}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};