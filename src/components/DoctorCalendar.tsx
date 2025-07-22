import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  Video,
  User,
  Stethoscope,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mic
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, eachWeekOfInterval, startOfDay } from 'date-fns';

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  type: 'New' | 'Follow-up' | 'Surgery' | 'Emergency';
  mode: 'In-Person' | 'Teleconsult' | 'Surgery';
  startTime: string;
  endTime: string;
  date: string;
  doctor: string;
  reason: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientName: 'John Doe',
    patientId: 'P001',
    type: 'New',
    mode: 'In-Person',
    startTime: '09:00',
    endTime: '09:30',
    date: format(new Date(), 'yyyy-MM-dd'),
    doctor: 'Dr. Smith',
    reason: 'General checkup',
    duration: 30,
    status: 'confirmed'
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    patientId: 'P002',
    type: 'Follow-up',
    mode: 'Teleconsult',
    startTime: '10:00',
    endTime: '10:30',
    date: format(new Date(), 'yyyy-MM-dd'),
    doctor: 'Dr. Johnson',
    reason: 'Diabetes follow-up',
    duration: 30,
    status: 'confirmed'
  }
];

export const DoctorCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'New': return 'bg-green-100 text-green-800 border-green-200';
      case 'Follow-up': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Surgery': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Emergency': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModeIcon = (mode: Appointment['mode']) => {
    switch (mode) {
      case 'Teleconsult': return <Video className="h-3 w-3" />;
      case 'Surgery': return <Stethoscope className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getMonthWeeks = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachWeekOfInterval({ start, end });
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDoctor = filterDoctor === 'all' || apt.doctor === filterDoctor;
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchesType = filterType === 'all' || apt.type === filterType;
    
    return matchesSearch && matchesDoctor && matchesStatus && matchesType;
  });

  const renderDayView = () => {
    const dayAppointments = filteredAppointments.filter(
      apt => apt.date === format(currentDate, 'yyyy-MM-dd')
    );

    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-[100px_1fr] gap-4">
          <div className="space-y-4">
            {timeSlots.map(time => (
              <div key={time} className="h-16 flex items-center justify-end pr-4 text-sm text-muted-foreground">
                {time}
              </div>
            ))}
          </div>
          <div className="relative">
            {timeSlots.map(time => (
              <div key={time} className="h-16 border-b border-border/20" />
            ))}
            {dayAppointments.map(appointment => {
              const startIndex = timeSlots.indexOf(appointment.startTime);
              const duration = appointment.duration / 30;
              return (
                <TooltipProvider key={appointment.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute left-2 right-2 p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getTypeColor(appointment.type)}`}
                        style={{
                          top: `${startIndex * 64 + 4}px`,
                          height: `${duration * 64 - 8}px`
                        }}
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getModeIcon(appointment.mode)}
                          <span className="font-medium text-xs">{appointment.patientName}</span>
                        </div>
                        <div className="text-xs opacity-80">{appointment.reason}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p><strong>Patient:</strong> {appointment.patientName} ({appointment.patientId})</p>
                        <p><strong>Time:</strong> {appointment.startTime} - {appointment.endTime}</p>
                        <p><strong>Doctor:</strong> {appointment.doctor}</p>
                        <p><strong>Reason:</strong> {appointment.reason}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1">
        <div></div>
        {weekDays.map(day => (
          <div key={day.toISOString()} className="p-3 text-center border-b">
            <div className="font-medium">{format(day, 'EEE')}</div>
            <div className={`text-sm ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {timeSlots.map(time => (
          <React.Fragment key={time}>
            <div className="h-16 flex items-center justify-end pr-4 text-sm text-muted-foreground border-b border-border/20">
              {time}
            </div>
            {weekDays.map(day => {
              const dayAppointments = filteredAppointments.filter(
                apt => apt.date === format(day, 'yyyy-MM-dd') && apt.startTime === time
              );
              
              return (
                <div key={`${day.toISOString()}-${time}`} className="h-16 border-b border-r border-border/20 p-1">
                  {dayAppointments.map(appointment => (
                    <TooltipProvider key={appointment.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-full h-full rounded p-1 cursor-pointer hover:shadow-sm transition-all text-xs ${getTypeColor(appointment.type)}`}
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getModeIcon(appointment.mode)}
                              <span className="font-medium truncate">{appointment.patientName}</span>
                            </div>
                            <div className="text-xs opacity-80 truncate">{appointment.reason}</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p><strong>Patient:</strong> {appointment.patientName} ({appointment.patientId})</p>
                            <p><strong>Time:</strong> {appointment.startTime} - {appointment.endTime}</p>
                            <p><strong>Doctor:</strong> {appointment.doctor}</p>
                            <p><strong>Reason:</strong> {appointment.reason}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    const weeks = getMonthWeeks();
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center font-medium border-b">
            {day}
          </div>
        ))}
        
        {weeks.map(week => {
          const days = eachDayOfInterval({ start: week, end: addDays(week, 6) });
          return days.map(day => {
            const dayAppointments = filteredAppointments.filter(
              apt => apt.date === format(day, 'yyyy-MM-dd')
            );
            
            return (
              <div key={day.toISOString()} className="h-24 border border-border/20 p-1">
                <div className={`text-sm mb-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map(appointment => (
                    <div
                      key={appointment.id}
                      className={`text-xs p-1 rounded cursor-pointer ${getTypeColor(appointment.type)}`}
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      {appointment.patientName}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Doctor Calendar</h1>
            <p className="text-muted-foreground">Manage appointments and schedules</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Tabs value={view} onValueChange={(value: any) => setView(value)}>
                  <TabsList>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    <SelectItem value="Dr. Smith">Dr. Smith</SelectItem>
                    <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Surgery">Surgery</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Appointment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Schedule New Appointment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="patient">Patient Name</Label>
                        <Input id="patient" placeholder="Enter patient name" />
                      </div>
                      <div>
                        <Label htmlFor="doctor">Doctor</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                            <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="date">Date</Label>
                          <Input id="date" type="date" />
                        </div>
                        <div>
                          <Label htmlFor="time">Time</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="type">Appointment Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea id="reason" placeholder="Enter reason for visit" />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1">Schedule</Button>
                        <Button variant="outline" className="gap-2">
                          <Mic className="h-4 w-4" />
                          Voice
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-auto">
              {view === 'day' && renderDayView()}
              {view === 'week' && renderWeekView()}
              {view === 'month' && renderMonthView()}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient</Label>
                    <p className="font-medium">{selectedAppointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.patientId}</p>
                  </div>
                  <div>
                    <Label>Doctor</Label>
                    <p className="font-medium">{selectedAppointment.doctor}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date & Time</Label>
                    <p className="font-medium">{format(new Date(selectedAppointment.date), 'MMM dd, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Badge className={getTypeColor(selectedAppointment.type)}>{selectedAppointment.type}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <p className="font-medium">{selectedAppointment.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Reschedule</Button>
                  <Button variant="outline" className="flex-1">Cancel</Button>
                  <Button className="flex-1">Start Consultation</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};