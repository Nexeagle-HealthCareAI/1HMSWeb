import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
  MapPin,
  Calendar,
  History,
  Share2
} from 'lucide-react';
import { ReferrersPanel } from './ReferrersPanel';
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

import { cn } from '@/lib/utils';

export interface StatusTransitionStep {
  status: 'VITALS_REQUIRED' | 'READY' | 'UNDER_CONSULT' | 'LAB_REQUIRED' | 'COMPLETED' | 'CANCELLED' | 'AWAITING_RECONSULT' | 'NO_SHOW';
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
}


import { appointmentApi, AppointmentDetail } from '@/features/appointment/services/appointmentApi';
import { patientApi, PatientData } from '@/features/patient/services/patientApi';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

import { Patient360Analysis } from './Patient360Analysis';

type Tab = 'today' | 'upcoming' | 'past' | 'patient360' | 'referrers';
type ViewMode = 'list' | 'analysis';

export const PatientsPage: React.FC = () => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female' | 'shared'>('all');
  const [selectedDoctor360, setSelectedDoctor360] = useState<string | null>(null);
  const [patient360Page, setPatient360Page] = useState(1);
  const patient360ItemsPerPage = 10;
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const [patient360SearchQuery, setPatient360SearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'Name' | 'PatientId' | 'RegistrationDate' | 'Age' | 'Contact', direction: 'asc' | 'desc' } | null>(null);
  const [todaySortConfig, setTodaySortConfig] = useState<{ key: 'patientName' | 'contact' | 'doctorName' | 'currentStatus', direction: 'asc' | 'desc' } | null>(null);

  // Date range state for Upcoming Appointments (Default: Tomorrow to +7 days)
  const [upcomingStartDate, setUpcomingStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [upcomingEndDate, setUpcomingEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return format(d, 'yyyy-MM-dd');
  });

  // Date range state for Past Appointments (Default: Last 30 days to Yesterday)
  const [pastStartDate, setPastStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [pastEndDate, setPastEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [pastPage, setPastPage] = useState(1);
  const PAST_ITEMS_PER_PAGE = 5;
  const [pastSearchQuery, setPastSearchQuery] = useState('');
  const [selectedPastDoctor, setSelectedPastDoctor] = useState<string>('all');

  const { hospitalId } = useAuthStore();

  // Fetch Appointments
  const { data: appointmentsResponse, isLoading: isAppointmentsLoading } = useQuery({
    queryKey: ['patientAppointmentDetails', hospitalId, selectedTimePeriod],
    queryFn: async () => {
      if (!hospitalId) return { items: [] };

      const now = new Date();
      // For now, defaulting to today as per requirements, but can be expanded based on selectedTimePeriod if needed
      // ensuring YYYY-MM-DD format
      const todayStr = format(now, 'yyyy-MM-dd');

      const response = await appointmentApi.getAppointmentDetails({
        status: 'All',
        startDate: todayStr,
        endDate: todayStr,
        hospitalId: hospitalId
      });
      return response;
    },
    enabled: !!hospitalId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch Upcoming Appointments (Dynamic Range)
  const { data: upcomingAppointmentsResponse, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ['upcomingAppointmentDetails', hospitalId, upcomingStartDate, upcomingEndDate],
    queryFn: async () => {
      if (!hospitalId) return { items: [] };

      return await appointmentApi.getAppointmentDetails({
        status: 'All',
        startDate: upcomingStartDate,
        endDate: upcomingEndDate,
        hospitalId: hospitalId
      });
    },
    enabled: !!hospitalId && !!upcomingStartDate && !!upcomingEndDate,
    refetchInterval: 30000
  });

  // Fetch Past Appointments
  const { data: pastAppointmentsResponse, isLoading: isPastLoading } = useQuery({
    queryKey: ['pastAppointmentDetails', hospitalId, pastStartDate, pastEndDate],
    queryFn: async () => {
      if (!hospitalId) return { items: [] };

      return await appointmentApi.getAppointmentDetails({
        status: 'All',
        startDate: pastStartDate,
        endDate: pastEndDate,
        hospitalId: hospitalId
      });
    },
    enabled: !!hospitalId && !!pastStartDate && !!pastEndDate,
    refetchInterval: 60000
  });

  // Transform API data to UI format
  const currentAppointments = useMemo(() => {
    if (!appointmentsResponse?.items) return [];

    return appointmentsResponse.items.map((apiAppt: AppointmentDetail) => {
      // Generate status transition steps based on finalStatusCode
      const statusSteps: StatusTransitionStep[] = [
        { status: 'VITALS_REQUIRED', label: 'Vitals', isCompleted: false, isCurrent: false },
        { status: 'READY', label: 'Ready', isCompleted: false, isCurrent: false },
        { status: 'UNDER_CONSULT', label: 'Consult', isCompleted: false, isCurrent: false },
        { status: 'LAB_REQUIRED', label: 'Lab', isCompleted: false, isCurrent: false }, // Optional step visually
        { status: 'COMPLETED', label: 'Done', isCompleted: false, isCurrent: false }
      ];

      // Simple mapping logic for visualization - can be refined based on actual business rules
      let currentStepIndex = -1;
      const status = apiAppt.finalStatusCode as StatusTransitionStep['status'];

      switch (status) {
        case 'VITALS_REQUIRED': currentStepIndex = 0; break;
        case 'READY': currentStepIndex = 1; break;
        case 'UNDER_CONSULT': currentStepIndex = 2; break;
        case 'LAB_REQUIRED': currentStepIndex = 3; break;
        case 'AWAITING_RECONSULT': currentStepIndex = 2; break; // Map back to consult area or add step
        case 'COMPLETED': currentStepIndex = 4; break;
        case 'CANCELLED': currentStepIndex = -1; break;
        case 'NO_SHOW': currentStepIndex = -1; break;
        default: currentStepIndex = 0;
      }

      const transitions = statusSteps.map((step, idx) => ({
        ...step,
        isCompleted: idx < currentStepIndex,
        isCurrent: idx === currentStepIndex
      }));

      return {
        appointmentId: apiAppt.appointmentId,
        patientId: apiAppt.patientId,
        patientName: apiAppt.patientFullName,
        contact: apiAppt.patientMobile,
        doctorName: apiAppt.doctorName || 'Unknown Doctor',
        currentStatus: apiAppt.finalStatusCode as StatusTransitionStep['status'],
        statusTransition: transitions
      };
    });
  }, [appointmentsResponse]);

  // Transform Upcoming Appointments
  const upcomingAppointments = useMemo(() => {
    if (!upcomingAppointmentsResponse?.items) return [];

    return upcomingAppointmentsResponse.items.map((apiAppt: AppointmentDetail) => ({
      appointmentId: apiAppt.appointmentId,
      patientId: apiAppt.patientId,
      patientName: apiAppt.patientFullName,
      contact: apiAppt.patientMobile,
      doctorName: apiAppt.doctorName || 'Unknown Doctor',
      currentStatus: apiAppt.finalStatusCode,
      appointmentDate: apiAppt.appointmentDate // Assuming this field exists or needs to be mapped
    }));
  }, [upcomingAppointmentsResponse]);

  // Transform Past Appointments
  const pastAppointments = useMemo(() => {
    if (!pastAppointmentsResponse?.items) return [];

    let items = pastAppointmentsResponse.items.map((apiAppt: AppointmentDetail) => ({
      appointmentId: apiAppt.appointmentId,
      patientId: apiAppt.patientId,
      patientName: apiAppt.patientFullName,
      contact: apiAppt.patientMobile,
      doctorName: apiAppt.doctorName || 'Unknown Doctor',
      currentStatus: apiAppt.finalStatusCode,
      appointmentDate: apiAppt.appointmentDate
    }));

    // Sort by date DESC
    const sorted = items.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    return sorted;
  }, [pastAppointmentsResponse]);

  const filteredAndSortedPastAppointments = useMemo(() => {
    let result = [...pastAppointments];

    // Filter by Search Query
    if (pastSearchQuery) {
      const query = pastSearchQuery.toLowerCase();
      result = result.filter(apt =>
        apt.patientName.toLowerCase().includes(query) ||
        apt.patientId.toLowerCase().includes(query) ||
        apt.doctorName.toLowerCase().includes(query)
      );
    }

    // Filter by Doctor
    if (selectedPastDoctor && selectedPastDoctor !== 'all') {
      result = result.filter(apt => apt.doctorName === selectedPastDoctor);
    }

    return result;
  }, [pastAppointments, pastSearchQuery, selectedPastDoctor]);

  // New state for 360 view navigation
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const handlePatientClick = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveTab('patient360');
    setViewMode('analysis');
  };

  const handleBackTo360List = () => {
    setViewMode('list');
    setSelectedPatientId(null);
  };


  const handleTodaySort = (key: 'patientName' | 'contact' | 'doctorName' | 'currentStatus') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (todaySortConfig && todaySortConfig.key === key && todaySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setTodaySortConfig({ key, direction });
  };

  const handleSort = (key: 'Name' | 'PatientId' | 'RegistrationDate' | 'Age' | 'Contact') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Compute Doctor Counts with Status Breakdown
  const doctorStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; vitalsRequired: number; cancelled: number; noShow: number }> = {};
    currentAppointments.forEach(apt => {
      if (apt.doctorName) {
        if (!stats[apt.doctorName]) {
          stats[apt.doctorName] = { total: 0, completed: 0, vitalsRequired: 0, cancelled: 0, noShow: 0 };
        }
        stats[apt.doctorName].total += 1;
        if (apt.currentStatus === 'COMPLETED') {
          stats[apt.doctorName].completed += 1;
        }
        if (apt.currentStatus === 'VITALS_REQUIRED') {
          stats[apt.doctorName].vitalsRequired += 1;
        }
        if (apt.currentStatus === 'CANCELLED') {
          stats[apt.doctorName].cancelled += 1;
        }
        if (apt.currentStatus === 'NO_SHOW') {
          stats[apt.doctorName].noShow += 1;
        }
      }
    });
    return stats;
  }, [currentAppointments]);

  // Compute Past Doctor Counts with Status Breakdown
  const pastDoctorStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; vitalsRequired: number; cancelled: number; noShow: number }> = {};
    pastAppointments.forEach(apt => {
      if (apt.doctorName) {
        if (!stats[apt.doctorName]) {
          stats[apt.doctorName] = { total: 0, completed: 0, vitalsRequired: 0, cancelled: 0, noShow: 0 };
        }
        stats[apt.doctorName].total += 1;
        if (apt.currentStatus === 'COMPLETED') {
          stats[apt.doctorName].completed += 1;
        }
        if (apt.currentStatus === 'VITALS_REQUIRED') {
          stats[apt.doctorName].vitalsRequired += 1;
        }
        if (apt.currentStatus === 'CANCELLED') {
          stats[apt.doctorName].cancelled += 1;
        }
        if (apt.currentStatus === 'NO_SHOW') {
          stats[apt.doctorName].noShow += 1;
        }
      }
    });
    return stats;
  }, [pastAppointments]);

  // Compute Overall Stats
  const dashboardStats = useMemo(() => {
    return {
      totalPatients: currentAppointments.length,
      activeDoctors: Object.keys(doctorStats).length,
      pendingVitals: currentAppointments.filter(a => a.currentStatus === 'VITALS_REQUIRED').length,
      underConsult: currentAppointments.filter(a => a.currentStatus === 'UNDER_CONSULT').length,
      completed: currentAppointments.filter(a => a.currentStatus === 'COMPLETED').length,
      cancelled: currentAppointments.filter(a => a.currentStatus === 'CANCELLED').length,
      noShow: currentAppointments.filter(a => a.currentStatus === 'NO_SHOW').length
    };
  }, [doctorStats, currentAppointments]);

  // Fetch Patient 360 Data
  const { data: patient360Response, isLoading: isPatient360Loading } = useQuery({
    queryKey: ['patient360', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return { hospitalId: '', patientsData: [], doctorsData: [], statistics: undefined, success: false, message: '' };
      return patientApi.getAllPatients(hospitalId);
    },
    enabled: !!hospitalId,
  });

  const patientList = useMemo(() => {
    if (!patient360Response?.patientsData) return [];

    return patient360Response.patientsData.map((p: PatientData) => ({
      PatientId: p.patientId,
      Name: p.name,
      Age: p.age.toString(),
      Sex: p.sex,
      Contact: p.contact,
      AddressLine: p.addressLine,
      City: p.city,
      State: p.state,
      Country: p.country,
      PinCode: p.pinCode,
      RegistrationDate: p.registrationDate,
      // Default/Placeholder values for fields not in API yet but required by UI/Sort
      LastVisit: p.registrationDate,
      NextAppointment: null,
      Status: 'Active',
      Avatar: '',
      Doctor: p.doctorNames || 'Dr. Unassigned'
    }));
  }, [patient360Response]);

  const doctorStats360 = useMemo(() => {
    const stats: Record<string, number> = {};
    patientList.forEach(p => {
      // @ts-ignore
      const docName = p.Doctor || 'Unknown';
      stats[docName] = (stats[docName] || 0) + 1;
    });
    return stats;
  }, [patientList]);

  const patientStats = useMemo(() => {
    if (patient360Response?.statistics) {
      return {
        total: patient360Response.statistics.totalPatientCount,
        males: patient360Response.statistics.malePatientCount,
        females: patient360Response.statistics.femalePatientCount,
        shared: patientList.filter(p => {
          // @ts-ignore
          if (!p.Doctor) return false;
          // @ts-ignore
          return p.Doctor.split(',').length > 1;
        }).length,
        cities: new Set(patientList.map(p => p.City)).size
      };
    }
    const patients = patientList;
    return {
      total: patients.length,
      males: patients.filter(p => p.Sex.toLowerCase() === 'male').length,
      females: patients.filter(p => p.Sex.toLowerCase() === 'female').length,
      shared: patients.filter(p => {
        // @ts-ignore
        if (!p.Doctor) return false;
        // @ts-ignore
        return p.Doctor.split(',').length > 1;
      }).length,
      cities: new Set(patients.map(p => p.City)).size
    };
  }, [patientList, patient360Response]);

  // Advanced Analytics
  const patientAnalytics = useMemo(() => {
    const patients = patientList;

    // Age band distribution
    const ageBands = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '60+': 0
    };

    // Initialize Gender Specific Bands
    const maleAgeBands = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    const femaleAgeBands = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };

    patients.forEach(p => {
      const age = parseInt(p.Age);
      if (isNaN(age)) return;

      // Update Total Bands
      if (age <= 18) ageBands['0-18']++;
      else if (age <= 30) ageBands['19-30']++;
      else if (age <= 45) ageBands['31-45']++;
      else if (age <= 60) ageBands['46-60']++;
      else ageBands['60+']++;

      // Update Gender Specific Bands
      const sex = p.Sex?.toLowerCase() || '';

      if (sex === 'male') {
        if (age <= 18) maleAgeBands['0-18']++;
        else if (age <= 30) maleAgeBands['19-30']++;
        else if (age <= 45) maleAgeBands['31-45']++;
        else if (age <= 60) maleAgeBands['46-60']++;
        else maleAgeBands['60+']++;
      } else if (sex === 'female') {
        if (age <= 18) femaleAgeBands['0-18']++;
        else if (age <= 30) femaleAgeBands['19-30']++;
        else if (age <= 45) femaleAgeBands['31-45']++;
        else if (age <= 60) femaleAgeBands['46-60']++;
        else femaleAgeBands['60+']++;
      }
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
  }, [patientList]);

  const navItems = [
    {
      id: 'today' as Tab,
      label: 'Current Appointments',
      icon: CalendarDays,
    },
    {
      id: 'upcoming' as Tab,
      label: 'Upcoming Appointments',
      icon: Calendar,
    },
    {
      id: 'past' as Tab,
      label: 'Past Appointments',
      icon: History,
    },
    {
      id: 'patient360' as Tab,
      label: 'Patient 360',
      icon: Users,
    },
    {
      id: 'referrers' as Tab,
      label: 'Referrers',
      icon: Share2,
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

  // Filter and Sort Patient 360 List
  const filteredAndSortedPatients = useMemo(() => {
    let result = [...patientList];

    if (patient360SearchQuery) {
      const query = patient360SearchQuery.toLowerCase();
      result = result.filter(p =>
        p.Name.toLowerCase().includes(query) ||
        p.PatientId.toLowerCase().includes(query) ||
        p.Contact.includes(query)
      );
    }

    if (selectedDoctor360) {
      // @ts-ignore
      result = result.filter(p => {
        if (!p.Doctor) return false;
        const doctors = p.Doctor.split(',').map((d: string) => d.trim());
        return doctors.includes(selectedDoctor360);
      });
    }

    if (selectedGender !== 'all') {
      if (selectedGender === 'shared') {
        // @ts-ignore
        result = result.filter(p => p.Doctor && p.Doctor.split(',').length > 1);
      } else {
        result = result.filter(p => p.Sex.toLowerCase() === selectedGender);
      }
    }

    if (sortConfig) {
      result.sort((a, b) => {
        // @ts-ignore
        const aValue = a[sortConfig.key];
        // @ts-ignore
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [patientList, patient360SearchQuery, selectedGender, sortConfig, selectedDoctor360]);

  const filteredAndSortedAppointments = useMemo(() => {
    let result = [...currentAppointments];

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
  }, [searchQuery, selectedDoctor, todaySortConfig, currentAppointments]);




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
                onClick={() => {
                  setActiveTab(item.id);
                  // Reset to list view when switching tabs manually
                  if (item.id === 'patient360') {
                    setViewMode('list');
                    setSelectedPatientId(null);
                  }
                }}
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
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20 p-2 sm:p-4 lg:p-6">
        {activeTab === 'referrers' && (
          <ReferrersPanel />
        )}
        {activeTab === 'today' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Current Appointments</h1>
                  <Badge variant="outline" className="gap-1.5 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live
                  </Badge>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage and track patient flows effectively.</p>
              </div>

            </div>

            {/* Admin Stats Grid - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <Card
                className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-md cursor-pointer hover:shadow-lg transition-all active:scale-95"
                onClick={() => {
                  setSelectedDoctor('all');
                  setSearchQuery('');
                }}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium mb-0.5">Total Patients</p>
                    <h3 className="text-xl font-bold">{dashboardStats.totalPatients}</h3>
                  </div>
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Completed */}
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 group backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5 relative z-10">
                  <div className="p-1.5 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Completed</span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-0.5">{dashboardStats.completed}</div>
              </div>

              {/* Doctor Stats Cards - Compact */}
              {Object.entries(doctorStats).map(([doctorName, stats]) => (
                <div
                  key={doctorName}
                  onClick={() => setSelectedDoctor(prev => prev === doctorName ? 'all' : doctorName)}
                  className={cn(
                    "relative overflow-hidden p-3 rounded-xl border shadow-sm transition-all duration-300 group backdrop-blur-sm cursor-pointer hover:shadow-md",
                    selectedDoctor === doctorName
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-900"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5 relative z-10">
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      selectedDoctor === doctorName
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100"
                        : "bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <Stethoscope className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "text-xs font-medium truncate max-w-[80px]",
                      selectedDoctor === doctorName ? "text-blue-900 dark:text-blue-100" : "text-gray-500 dark:text-gray-400"
                    )} title={doctorName}>{doctorName}</span>
                  </div>
                  <div className="relative z-10 ml-0.5">
                    <div className={cn(
                      "text-xl font-bold mb-1",
                      selectedDoctor === doctorName ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"
                    )}>{stats.total}</div>
                    <div className="flex flex-wrap gap-1">
                      {stats.completed > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>{stats.completed}</span>
                        </div>
                      )}
                      {stats.vitalsRequired > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                          <Heart className="h-2.5 w-2.5" />
                          <span>Vitals {stats.vitalsRequired}</span>
                        </div>
                      )}
                      {stats.cancelled > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                          <Circle className="h-2.5 w-2.5" />
                          <span>Cancelled {stats.cancelled}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Cancelled */}
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 group backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5 relative z-10">
                  <div className="p-1.5 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                    <Circle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Cancelled</span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-0.5">{dashboardStats.cancelled}</div>
              </div>


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
                            {currentAppointments.length}
                          </Badge>
                        </span>
                      </SelectItem>
                      {Object.entries(doctorStats).map(([docName, stats]) => (
                        <SelectItem key={docName} value={docName}>
                          <span className="flex items-center justify-between gap-2 w-full min-w-[140px]">
                            <span className="truncate max-w-[120px]" title={docName}>{docName}</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                              {stats.total}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


              </div>
            </div>

            {/* Mobile Card View for Today's Appointments */}
            <div className="block md:hidden space-y-3">
              {filteredAndSortedAppointments.length > 0 ? (
                filteredAndSortedAppointments.map((appointment) => (
                  <div key={appointment.appointmentId} className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{appointment.patientName}</span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          {appointment.patientId}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                        "capitalize text-[10px] px-1.5 py-0.5 h-auto",
                        appointment.currentStatus === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          appointment.currentStatus === 'CANCELLED' ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {appointment.currentStatus.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {appointment.contact}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{appointment.doctorName}</span>
                      </div>
                    </div>

                    {/* Simplified Workflow for Mobile */}
                    <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-1 no-scrollbar">
                      {appointment.statusTransition.map((step, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "h-1.5 w-8 rounded-full flex-shrink-0 transition-colors",
                            step.isCompleted ? "bg-emerald-500" :
                              step.isCurrent ? "bg-blue-600 animate-pulse" :
                                "bg-gray-200 dark:bg-gray-700"
                          )}
                          title={step.label}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Search className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No appointments found</p>
                </div>
              )}
            </div>

            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
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
                              <button
                                onClick={() => handlePatientClick(appointment.patientId)}
                                className="text-xs text-gray-500 flex items-center gap-1 hover:text-blue-600 hover:underline transition-colors focus:outline-none"
                              >
                                <Users className="h-3 w-3" />
                                {appointment.patientId}
                              </button>
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

        {activeTab === 'upcoming' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Appointments</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Scheduled appointments for the upcoming period.</p>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 px-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={upcomingStartDate}
                    onChange={(e) => setUpcomingStartDate(e.target.value)}
                    className="h-8 w-auto min-w-[130px] bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 cursor-pointer"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="date"
                    value={upcomingEndDate}
                    onChange={(e) => setUpcomingEndDate(e.target.value)}
                    className="h-8 w-auto min-w-[130px] bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-lg shadow-blue-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Total Appointments</p>
                    <h3 className="text-3xl font-bold">{upcomingAppointments.length}</h3>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                </CardContent>
              </Card>


            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableHead className="w-[200px]">Date & Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appointment) => (
                      <TableRow key={appointment.appointmentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'MMM dd, yyyy') : 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'h:mm a') : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</span>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {appointment.patientId}
                            </div>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <CalendarDays className="h-8 w-8 mb-2 opacity-20" />
                          <p>No upcoming appointments found for the next 7 days.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )
        }



        {
          activeTab === 'past' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Past Appointments</h1>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">History of patient appointments and visits.</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 px-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search past appointments..."
                        className="pl-9 h-8 w-[200px] bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 focus-visible:ring-indigo-500"
                        value={pastSearchQuery}
                        onChange={(e) => {
                          setPastSearchQuery(e.target.value);
                          setPastPage(1); // Reset to first page on search
                        }}
                      />
                    </div>
                    <Input
                      type="date"
                      value={pastStartDate}
                      onChange={(e) => {
                        setPastPage(1);
                        setPastStartDate(e.target.value);
                      }}
                      className="h-8 w-auto min-w-[130px] bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 cursor-pointer"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="date"
                      value={pastEndDate}
                      onChange={(e) => {
                        setPastPage(1);
                        setPastEndDate(e.target.value);
                      }}
                      className="h-8 w-auto min-w-[130px] bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                <Card
                  className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white shadow-lg shadow-indigo-500/20 cursor-pointer hover:shadow-xl transition-all active:scale-95"
                  onClick={() => {
                    setSelectedPastDoctor('all');
                    setPastSearchQuery('');
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium mb-1">Total Past Visits</p>
                      <h3 className="text-3xl font-bold">{pastAppointments.length}</h3>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl">
                      <History className="h-6 w-6 text-white" />
                    </div>
                  </CardContent>
                </Card>

                {/* Doctor Stats Cards - Compact (Reused for Past) */}
                {Object.entries(pastDoctorStats).map(([doctorName, stats]) => (
                  <div
                    key={doctorName}
                    onClick={() => setSelectedPastDoctor(prev => prev === doctorName ? 'all' : doctorName)}
                    className={cn(
                      "relative overflow-hidden p-3 rounded-xl border shadow-sm transition-all duration-300 group backdrop-blur-sm cursor-pointer hover:shadow-md",
                      selectedPastDoctor === doctorName
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-100 dark:ring-indigo-900"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5 relative z-10">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        selectedPastDoctor === doctorName
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-100"
                          : "bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      )}>
                        <Stethoscope className="h-3.5 w-3.5" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium truncate max-w-[80px]",
                        selectedPastDoctor === doctorName ? "text-indigo-900 dark:text-indigo-100" : "text-gray-500 dark:text-gray-400"
                      )} title={doctorName}>{doctorName}</span>
                    </div>
                    <div className="relative z-10 ml-0.5">
                      <div className={cn(
                        "text-xl font-bold mb-1",
                        selectedPastDoctor === doctorName ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-gray-100"
                      )}>{stats.total}</div>
                      <div className="flex flex-wrap gap-1">
                        {stats.completed > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>{stats.completed}</span>
                          </div>
                        )}
                        {stats.vitalsRequired > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                            <Users className="h-2.5 w-2.5" />
                            <span>No Show {stats.vitalsRequired}</span>
                          </div>
                        )}
                        {stats.cancelled > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                            <Circle className="h-2.5 w-2.5" />
                            <span>Cancelled {stats.cancelled}</span>
                          </div>
                        )}
                        {stats.noShow > 0 && (
                          <div className="flex items-center gap-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                            <Users className="h-2.5 w-2.5" />
                            <span>No-Show {stats.noShow}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableHead className="w-[200px]">Date & Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPastAppointments.length > 0 ? (
                      filteredAndSortedPastAppointments
                        .slice((pastPage - 1) * PAST_ITEMS_PER_PAGE, pastPage * PAST_ITEMS_PER_PAGE)
                        .map((appointment) => (
                          <TableRow key={appointment.appointmentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'MMM dd, yyyy') : 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'h:mm a') : ''}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</span>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {appointment.patientId}
                                </div>
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
                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                  <Stethoscope className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{appointment.doctorName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "capitalize",
                                appointment.currentStatus === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  appointment.currentStatus === 'CANCELLED' ? "bg-red-50 text-red-700 border-red-200" :
                                    "bg-gray-50 text-gray-700 border-gray-200"
                              )}>
                                {appointment.currentStatus.replace(/_/g, ' ').toLowerCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            {pastSearchQuery ? (
                              <>
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p>No past appointments found matching "{pastSearchQuery}".</p>
                                <Button variant="link" onClick={() => setPastSearchQuery('')} className="mt-2 text-indigo-600 h-auto p-0">Clear Search</Button>
                              </>
                            ) : (
                              <>
                                <History className="h-8 w-8 mb-2 opacity-20" />
                                <p>No past appointments found in this range.</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {filteredAndSortedPastAppointments.length > PAST_ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing <span className="font-medium">{(pastPage - 1) * PAST_ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(pastPage * PAST_ITEMS_PER_PAGE, filteredAndSortedPastAppointments.length)}</span> of <span className="font-medium">{filteredAndSortedPastAppointments.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPastPage(p => Math.max(1, p - 1))}
                        disabled={pastPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Page {pastPage} of {Math.ceil(filteredAndSortedPastAppointments.length / PAST_ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPastPage(p => Math.min(Math.ceil(filteredAndSortedPastAppointments.length / PAST_ITEMS_PER_PAGE), p + 1))}
                        disabled={pastPage >= Math.ceil(filteredAndSortedPastAppointments.length / PAST_ITEMS_PER_PAGE)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {
          activeTab === 'patient360' && viewMode === 'analysis' && selectedPatientId && (
            <div className="h-full">
              <Patient360Analysis
                patientId={selectedPatientId}
                onBack={handleBackTo360List}
              />
            </div>
          )
        }

        {
          activeTab === 'patient360' && viewMode === 'list' && (
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

              <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                {/* Total Patients - Premium Gradient */}
                <Card
                  className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none text-white shadow-lg shadow-blue-500/20 flex-shrink-0 min-w-[140px] relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all"
                  onClick={() => {
                    setPatient360SearchQuery('');
                    setSelectedGender('all');
                    setSelectedDoctor360(null);
                  }}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="h-16 w-16 -rotate-12" />
                  </div>
                  <CardContent className="p-4 relative z-10">
                    <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Patients</p>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold">{patientStats.total}</h3>
                    </div>
                  </CardContent>
                </Card>

                {/* Male Patients */}
                <Card
                  className={cn(
                    "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex-shrink-0 min-w-[130px] group",
                    selectedGender === 'male' && "ring-2 ring-blue-500 border-transparent bg-blue-50/50 dark:bg-blue-900/10"
                  )}
                  onClick={() => {
                    if (selectedGender === 'male') {
                      setSelectedGender('all');
                    } else {
                      setSelectedGender('male');
                      setSelectedDoctor360(null);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Male</span>
                      <div className={cn("p-1.5 rounded-md transition-colors", selectedGender === 'male' ? "bg-blue-200 text-blue-700" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform origin-left">{patientStats.males}</h3>
                  </CardContent>
                </Card>

                {/* Female Patients */}
                <Card
                  className={cn(
                    "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex-shrink-0 min-w-[130px] group",
                    selectedGender === 'female' && "ring-2 ring-pink-500 border-transparent bg-pink-50/50 dark:bg-pink-900/10"
                  )}
                  onClick={() => {
                    if (selectedGender === 'female') {
                      setSelectedGender('all');
                    } else {
                      setSelectedGender('female');
                      setSelectedDoctor360(null);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Female</span>
                      <div className={cn("p-1.5 rounded-md transition-colors", selectedGender === 'female' ? "bg-pink-200 text-pink-700" : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400")}>
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform origin-left">{patientStats.females}</h3>
                  </CardContent>
                </Card>

                {/* Shared Patients */}
                <Card
                  className={cn(
                    "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex-shrink-0 min-w-[130px] group",
                    selectedGender === 'shared' && "ring-2 ring-purple-500 border-transparent bg-purple-50/50 dark:bg-purple-900/10"
                  )}
                  onClick={() => {
                    if (selectedGender === 'shared') {
                      setSelectedGender('all');
                    } else {
                      setSelectedGender('shared');
                      setSelectedDoctor360(null);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shared</span>
                      <div className={cn("p-1.5 rounded-md transition-colors", selectedGender === 'shared' ? "bg-purple-200 text-purple-700" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400")}>
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform origin-left">{patientStats.shared}</h3>
                  </CardContent>
                </Card>

                {/* Cities */}


                {/* Vertical Divider */}
                {patient360Response?.doctorsData?.length > 0 && (
                  <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 h-20 self-center"></div>
                )}

                {/* Doctor KPI Cards */}
                {patient360Response?.doctorsData?.map((doctor: any, idx: number) => (
                  <Card
                    key={idx}
                    className={cn(
                      "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex-shrink-0 min-w-[180px] group cursor-pointer",
                      selectedDoctor360 === doctor.doctorName && "ring-2 ring-indigo-500 border-transparent bg-indigo-50/50 dark:bg-indigo-900/10"
                    )}
                    onClick={() => {
                      if (selectedDoctor360 === doctor.doctorName) {
                        setSelectedDoctor360(null);
                      } else {
                        setSelectedDoctor360(doctor.doctorName);
                        setSelectedGender('all');
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-2 items-center overflow-hidden">
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-full shrink-0">
                            <Stethoscope className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Doctor</span>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate w-full group-hover:text-indigo-600 transition-colors" title={doctor.doctorName}>{doctor.doctorName}</h4>
                          </div>
                        </div>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full min-w-[2rem] text-center">
                          {doctor.totalPatientCount}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        {doctor.malePatientCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            <span className="uppercase text-blue-400">M</span> {doctor.malePatientCount}
                          </div>
                        )}
                        {doctor.femalePatientCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                            <span className="uppercase text-pink-400">F</span> {doctor.femalePatientCount}
                          </div>
                        )}
                        {doctor.sharedPatientCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 ml-auto">
                            <span className="uppercase text-purple-400">S</span> {doctor.sharedPatientCount}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Main Content: Table (Left) */}
                <div className="col-span-12 xl:col-span-9 flex flex-col h-full overflow-hidden order-2 xl:order-1">
                  {/* Mobile Card View for Patient 360 List */}
                  <div className="block md:hidden mb-4 space-y-3 pt-2">
                    {(() => {
                      const startIndex = (patient360Page - 1) * patient360ItemsPerPage;
                      const paginatedPatients = filteredAndSortedPatients.slice(startIndex, startIndex + patient360ItemsPerPage);

                      if (paginatedPatients.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-sm">No patients found matches.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {paginatedPatients.map((patient) => (
                            <div key={patient.PatientId} className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">{patient.Name}</span>
                                  <button
                                    onClick={() => handlePatientClick(patient.PatientId)}
                                    className="text-xs text-blue-600 flex items-center gap-1 hover:underline w-fit"
                                  >
                                    <Users className="h-3 w-3" />
                                    {patient.PatientId}
                                  </button>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {patient.Age} / {patient.Sex.charAt(0)}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  {patient.Contact}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="truncate">{patient.AddressLine}, {patient.City}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  <span>Reg: {new Date(patient.RegistrationDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 shadow-sm overflow-auto flex-1">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableHead className="w-[200px] cursor-pointer" onClick={() => handleSort('Name')}>
                            <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('Age')}>
                            <div className="flex items-center gap-1">Age/Sex <ArrowUpDown className="h-3 w-3" /></div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('Contact')}>
                            <div className="flex items-center gap-1">Contact <ArrowUpDown className="h-3 w-3" /></div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('RegistrationDate')}>
                            <div className="flex items-center gap-1">Registered <ArrowUpDown className="h-3 w-3" /></div>
                          </TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const startIndex = (patient360Page - 1) * patient360ItemsPerPage;
                          const paginatedPatients = filteredAndSortedPatients.slice(startIndex, startIndex + patient360ItemsPerPage);

                          if (paginatedPatients.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                  No patients found matching your search{selectedDoctor360 ? ` for doctor ${selectedDoctor360}` : ''}.
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
                                    onClick={() => handlePatientClick(patient.PatientId)}
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
                  {filteredAndSortedPatients.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-medium">{(patient360Page - 1) * patient360ItemsPerPage + 1}</span> to <span className="font-medium">{Math.min(patient360Page * patient360ItemsPerPage, filteredAndSortedPatients.length)}</span> of <span className="font-medium">{filteredAndSortedPatients.length}</span>
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
                          {patient360Page} / {Math.ceil(filteredAndSortedPatients.length / patient360ItemsPerPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPatient360Page(p => Math.min(Math.ceil(filteredAndSortedPatients.length / patient360ItemsPerPage), p + 1))}
                          disabled={patient360Page === Math.ceil(filteredAndSortedPatients.length / patient360ItemsPerPage)}
                          className="h-8 text-xs"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar: KPIs & Analytics (Right) */}
                {/* Sidebar: KPIs & Analytics (Right) */}
                <div className="col-span-12 xl:col-span-3 h-full overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-2 order-1 xl:order-2">

                  {/* New Reg - Full Width - Compact */}
                  <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Users className="h-20 w-20 -rotate-12" />
                    </div>
                    <CardHeader className="p-3 pb-1 relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wide text-emerald-100">
                          <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                            <UserCheck className="h-3.5 w-3.5 text-white" />
                          </div>
                          New Registrations
                        </CardTitle>
                        <Select value={selectedTimePeriod} onValueChange={(value: any) => setSelectedTimePeriod(value)}>
                          <SelectTrigger className="w-auto h-6 bg-black/20 border-white/10 text-white hover:bg-black/30 text-[10px] px-2 rounded-md backdrop-blur-sm transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 relative z-10">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold tracking-tight">
                          {(() => {
                            if (!patient360Response?.statistics?.newRegistrations) return 0;
                            const newReg = patient360Response.statistics.newRegistrations;
                            return selectedTimePeriod === 'today' ? newReg.today :
                              selectedTimePeriod === 'week' ? newReg.thisWeek :
                                selectedTimePeriod === 'month' ? newReg.thisMonth :
                                  newReg.thisYear;
                          })()}
                        </h3>
                        <span className="text-emerald-100 text-xs font-medium bg-white/10 px-1.5 py-0.5 rounded-full">
                          {selectedTimePeriod === 'today' ? 'Today' :
                            selectedTimePeriod === 'week' ? 'this week' :
                              selectedTimePeriod === 'month' ? 'this month' :
                                'this year'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics - Stacked */}

                  {/* Age Distribution Chart - Compact */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                        Age Distribution <span className="text-gray-400 font-normal ml-auto text-[10px]">({selectedGender === 'all' ? 'All' : selectedGender === 'male' ? 'M' : 'F'})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(
                              selectedGender === 'male' ? patientAnalytics.maleAgeBands :
                                selectedGender === 'female' ? patientAnalytics.femaleAgeBands :
                                  patientAnalytics.ageBands
                            ).map(([range, count]) => ({ range, count }))}
                            margin={{ top: 5, right: 0, left: -25, bottom: 0 }}
                            barCategoryGap={2}
                          >
                            <XAxis
                              dataKey="range"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9CA3AF', fontSize: 9 }}
                              dy={5}
                              interval={0}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9CA3AF', fontSize: 9 }}
                            />
                            <Tooltip
                              cursor={{ fill: 'transparent' }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-gray-900 text-white text-[10px] rounded py-1 px-2 shadow-xl border border-gray-800">
                                      <p className="font-semibold">{label}</p>
                                      <p className="text-blue-200">Count: {payload[0].value}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={16}>
                              {Object.entries(
                                selectedGender === 'male' ? patientAnalytics.maleAgeBands :
                                  selectedGender === 'female' ? patientAnalytics.femaleAgeBands :
                                    patientAnalytics.ageBands
                              ).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#60A5FA'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Cities */}


                  {/* Data Quality */}

                </div>
              </div>
            </div>
          )
        }

      </main >
    </div >
  );
};