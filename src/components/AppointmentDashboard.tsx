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
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  tokenNo: number;
  vitalsUpdated: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
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
    vitalsUpdated: true,
    status: 'completed',
    phone: '+1234567890'
  },
  {
    id: 'APT002',
    patientId: 'P002',
    patientName: 'Emily Johnson',
    doctorName: 'Dr. Michael Brown',
    appointmentTime: '10:30 AM',
    tokenNo: 2,
    vitalsUpdated: false,
    status: 'ongoing',
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
    status: 'upcoming',
    phone: '+1234567892'
  },
  {
    id: 'APT004',
    patientId: 'P004',
    patientName: 'Maria Garcia',
    doctorName: 'Dr. James Lee',
    appointmentTime: '02:00 PM',
    tokenNo: 4,
    vitalsUpdated: false,
    status: 'upcoming',
    phone: '+1234567893'
  },
  {
    id: 'APT005',
    patientId: 'P005',
    patientName: 'David Wilson',
    doctorName: 'Dr. Michael Brown',
    appointmentTime: '03:30 PM',
    tokenNo: 5,
    vitalsUpdated: true,
    status: 'upcoming',
    phone: '+1234567894'
  }
];

export const AppointmentDashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalToday = mockAppointments.length;
    const vitalsRequired = mockAppointments.filter(apt => !apt.vitalsUpdated).length;
    const doctorFollowUps = mockAppointments.filter(apt => apt.status === 'upcoming').length;
    const labFollowUps = 3; // Mock data
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
      
      return matchesSearch && matchesStatus && matchesDoctor;
    });
  }, [searchTerm, statusFilter, doctorFilter]);

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✅ Completed</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">🔵 Ongoing</Badge>;
      case 'upcoming':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">🟡 Upcoming</Badge>;
      default:
        return null;
    }
  };

  const uniqueDoctors = [...new Set(mockAppointments.map(apt => apt.doctorName))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">📅 Appointment Dashboard</h1>
          </div>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            🔘 Book New Appointment
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">📅 {kpis.totalToday}</div>
              <p className="text-xs text-gray-500 mt-1">Total booked for today</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Vitals Update Required</CardTitle>
              <Heart className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">❤️‍🩹 {kpis.vitalsRequired}</div>
              <p className="text-xs text-gray-500 mt-1">Vitals not yet filled</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Doctor Follow-Ups</CardTitle>
              <UserCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">👨‍⚕️ {kpis.doctorFollowUps}</div>
              <p className="text-xs text-gray-500 mt-1">Follow-up visits today</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Lab Follow-Ups</CardTitle>
              <FlaskConical className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">🧬 {kpis.labFollowUps}</div>
              <p className="text-xs text-gray-500 mt-1">Pending follow-up</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed Today</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">✅ {kpis.completed}</div>
              <p className="text-xs text-gray-500 mt-1">Finished consultations</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="bg-white shadow-lg rounded-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              🔍 Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Patient ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">🟡 Upcoming</SelectItem>
                  <SelectItem value="ongoing">🔵 Ongoing</SelectItem>
                  <SelectItem value="completed">🟢 Completed</SelectItem>
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

        {/* Appointments Table */}
        <Card className="bg-white shadow-lg rounded-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              📊 Appointment Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Patient ID</TableHead>
                    <TableHead className="font-semibold">Patient Name</TableHead>
                    <TableHead className="font-semibold">Doctor Assigned</TableHead>
                    <TableHead className="font-semibold">Appointment Time</TableHead>
                    <TableHead className="font-semibold">Token No.</TableHead>
                    <TableHead className="font-semibold">Vitals Updated</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment, index) => (
                    <TableRow 
                      key={appointment.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}
                    >
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary hover:text-primary/80"
                          onClick={() => {/* Navigate to patient profile */}}
                        >
                          {appointment.patientId}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {appointment.patientName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-gray-500" />
                          {appointment.doctorName}
                        </div>
                      </TableCell>
                      <TableCell>{appointment.appointmentTime}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          #{appointment.tokenNo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {appointment.vitalsUpdated ? (
                          <span className="text-green-600 font-semibold">✅</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {/* Open vitals form */}}
                          >
                            ❌ Update
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-blue-50"
                            onClick={() => {/* View details */}}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {appointment.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-red-50 text-red-600 border-red-200"
                              onClick={() => {/* Cancel appointment */}}
                            >
                              <X className="h-4 w-4 mr-1" />
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
            
            {filteredAppointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No appointments found matching your criteria</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};