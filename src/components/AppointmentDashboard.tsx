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
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppointmentBooking } from './AppointmentBooking';

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

export const AppointmentDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalToday = mockAppointments.length;
    const vitalsRequired = mockAppointments.filter(apt => apt.status === 'vitals-required').length;
    const doctorFollowUps = mockAppointments.filter(apt => apt.status === 'awaiting-reconsultation').length;
    const labFollowUps = mockAppointments.filter(apt => apt.status === 'lab-test-required').length;
    const completed = mockAppointments.filter(apt => apt.status === 'completed').length;

    return {
      totalToday,
      vitalsRequired,
      doctorFollowUps,
      labFollowUps,
      completed
    };
  }, []);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return mockAppointments.filter(appointment => {
      const matchesSearch = 
        appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesDoctor = doctorFilter === 'all' || appointment.doctorName === doctorFilter;
      const matchesSelectedStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
      
      return matchesSearch && matchesStatus && matchesDoctor && matchesSelectedStatus;
    });
  }, [searchTerm, statusFilter, doctorFilter, selectedStatus]);

  const getStatusBadge = (status: Appointment['status']) => {
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

  const uniqueDoctors = [...new Set(mockAppointments.map(apt => apt.doctorName))];

  // If booking view is active, show the booking component
  if (showBooking) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header with Back Button */}
        <div className="bg-card border-b border-border px-6 py-4 shadow-card">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowBooking(false)}
              className="group flex items-center gap-2 border-healthcare-primary/20 hover:border-healthcare-primary hover:bg-healthcare-primary/5 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 text-healthcare-primary transition-transform group-hover:-translate-x-1" />
              <span className="text-healthcare-primary font-medium">Back to Dashboard</span>
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold text-foreground">📋 Book New Appointment</h1>
          </div>
        </div>
        
        {/* Booking Component */}
        <AppointmentBooking />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-subtle overflow-hidden">
      <div className="flex-1 flex flex-col p-2 md:p-6 space-y-4 md:space-y-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-healthcare-primary" />
            <h1 className="text-xl md:text-3xl font-bold text-foreground">📅 Appointment Dashboard</h1>
          </div>
          <Button 
            onClick={() => setShowBooking(true)} 
            className="bg-healthcare-primary hover:bg-healthcare-primary/90 text-white px-6 py-3 rounded-lg shadow-card hover:shadow-hover transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            📋 Book New Appointment
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6 flex-shrink-0">
          <Card className="bg-card shadow-card rounded-xl border-0 hover:shadow-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-healthcare-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-healthcare-primary">📅 {kpis.totalToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Total booked for today</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card rounded-xl border-0 hover:shadow-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vitals Update Required</CardTitle>
              <Heart className="h-5 w-5 text-healthcare-error" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-healthcare-error">❤️‍🩹 {kpis.vitalsRequired}</div>
              <p className="text-xs text-muted-foreground mt-1">Vitals not yet filled</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card rounded-xl border-0 hover:shadow-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Doctor Follow-Ups</CardTitle>
              <UserCheck className="h-5 w-5 text-healthcare-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-healthcare-success">👨‍⚕️ {kpis.doctorFollowUps}</div>
              <p className="text-xs text-muted-foreground mt-1">Follow-up visits today</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card rounded-xl border-0 hover:shadow-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lab Follow-Ups</CardTitle>
              <FlaskConical className="h-5 w-5 text-healthcare-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-healthcare-secondary">🧬 {kpis.labFollowUps}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending follow-up</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card rounded-xl border-0 hover:shadow-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
              <CheckCircle className="h-5 w-5 text-healthcare-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-healthcare-success">✅ {kpis.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished consultations</p>
            </CardContent>
          </Card>
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

        {/* Enhanced Appointments Table with Status Navigation */}
        <Card className="bg-card shadow-card rounded-xl border-0 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg md:text-xl">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
              📊 Patient Journey Dashboard
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track patient progress through appointment stages
            </p>
          </CardHeader>

          {/* Status Navigation Tabs - Improved Design */}
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'all'
                    ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl mb-1">📋</span>
                <span className="text-xs font-medium text-center">All</span>
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('vitals-required')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'vitals-required'
                    ? 'bg-red-50 text-red-800 border-red-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:border-red-200'
                }`}
              >
                <span className="text-2xl mb-1">❤️</span>
                <span className="text-xs font-medium text-center">Vitals</span>
                <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'vitals-required').length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('ready-consultation')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'ready-consultation'
                    ? 'bg-green-50 text-green-800 border-green-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-green-50 hover:border-green-200'
                }`}
              >
                <span className="text-2xl mb-1">✅</span>
                <span className="text-xs font-medium text-center">Ready</span>
                <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'ready-consultation').length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('under-consultation')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'under-consultation'
                    ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <span className="text-2xl mb-1">👨‍⚕️</span>
                <span className="text-xs font-medium text-center">Active</span>
                <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'under-consultation').length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('lab-test-required')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'lab-test-required'
                    ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:border-purple-200'
                }`}
              >
                <span className="text-2xl mb-1">🧪</span>
                <span className="text-xs font-medium text-center">Lab Test</span>
                <span className="text-xs bg-purple-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'lab-test-required').length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('awaiting-reconsultation')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'awaiting-reconsultation'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:border-yellow-200'
                }`}
              >
                <span className="text-2xl mb-1">⏳</span>
                <span className="text-xs font-medium text-center">Waiting</span>
                <span className="text-xs bg-yellow-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'awaiting-reconsultation').length}
                </span>
              </button>
              
              <button
                onClick={() => setSelectedStatus('completed')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedStatus === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <span className="text-2xl mb-1">🏁</span>
                <span className="text-xs font-medium text-center">Done</span>
                <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                  {mockAppointments.filter(apt => apt.status === 'completed').length}
                </span>
              </button>
            </div>
          </div>
          <CardContent className="flex-1 overflow-hidden">
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block h-full">
              <div className="h-full border border-border rounded-lg overflow-hidden">
                <div className="h-full overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border shadow-sm">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Patient ID</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Patient Name</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Doctor</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Time</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Token</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Vitals</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Status</TableHead>
                        <TableHead className="font-semibold text-foreground bg-card/95 backdrop-blur-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment, index) => (
                        <TableRow 
                          key={appointment.id} 
                          className={`hover:bg-muted/50 transition-colors border-b border-border/50 ${
                            index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                          }`}
                        >
                          <TableCell className="font-medium">
                            <Button
                              variant="link"
                              className="p-0 h-auto text-healthcare-primary hover:text-healthcare-primary/80 font-mono"
                              onClick={() => {/* Navigate to patient profile */}}
                            >
                              {appointment.patientId}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground font-medium">{appointment.patientName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{appointment.doctorName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground font-medium">{appointment.appointmentTime}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono font-bold text-healthcare-primary">
                              #{appointment.tokenNo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {appointment.vitalsUpdated ? (
                              <div className="flex items-center gap-1">
                                <span className="text-healthcare-success text-lg">✅</span>
                                <span className="text-xs text-healthcare-success font-medium">Updated</span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-healthcare-error border-healthcare-error/30 hover:bg-healthcare-error/10 text-xs"
                                onClick={() => {/* Open vitals form */}}
                              >
                                ❤️ Update
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-healthcare-primary/10 border-healthcare-primary/30 text-xs"
                                onClick={() => {/* View details */}}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              {appointment.status !== 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-healthcare-error/10 text-healthcare-error border-healthcare-error/30 text-xs"
                                  onClick={() => {/* Cancel appointment */}}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden h-full">
              <div className="h-full overflow-auto">
                <div className="space-y-3 pr-2">
                  {filteredAppointments.map((appointment) => (
                    <Card key={appointment.id} className="p-4 shadow-card border border-border/50 rounded-xl bg-card hover:shadow-hover transition-all duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-bold text-healthcare-primary text-base font-mono"
                          >
                            {appointment.patientId}
                          </Button>
                          <h3 className="font-semibold text-foreground text-lg mt-1">{appointment.patientName}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className="font-mono font-bold text-healthcare-primary">
                            #{appointment.tokenNo}
                          </Badge>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground block">Doctor:</span>
                            <div className="flex items-center gap-1 mt-1">
                              <Stethoscope className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-foreground">{appointment.doctorName}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Time:</span>
                            <span className="font-medium text-foreground">{appointment.appointmentTime}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">Vitals Status:</span>
                          {appointment.vitalsUpdated ? (
                            <div className="flex items-center gap-1">
                              <span className="text-healthcare-success text-lg">✅</span>
                              <span className="text-healthcare-success font-semibold text-sm">Updated</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-healthcare-error text-lg">❤️</span>
                              <span className="text-healthcare-error font-semibold text-sm">Pending</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 hover:bg-healthcare-primary/10 border-healthcare-primary/30 font-medium"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {appointment.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover:bg-healthcare-error/10 text-healthcare-error border-healthcare-error/30 font-medium"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            
            {filteredAppointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No appointments found matching your criteria</p>
                <p className="text-muted-foreground/70 text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};