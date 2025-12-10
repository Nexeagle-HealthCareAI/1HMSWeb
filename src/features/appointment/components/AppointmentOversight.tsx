import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  User, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  Filter,
  Search,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Phone,
  MessageSquare,
  Download,
  Plus,
  ChevronDown,
  CalendarX,
  CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  isAvailable: boolean;
}

interface TimeSlot {
  id: string;
  time: string;
  isBlocked: boolean;
  isBooked: boolean;
  doctorId: string;
  date: Date;
}

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: Date;
  time: string;
  status: 'confirmed' | 'cancelled' | 'no-show' | 'completed' | 'rescheduled';
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  appointmentType: 'consultation' | 'follow-up' | 'emergency' | 'surgery';
  priority: 'low' | 'medium' | 'high';
}

const doctors: Doctor[] = [
  { id: 'D001', name: 'Dr. Sarah Johnson', department: 'Cardiology', specialization: 'Interventional Cardiology', isAvailable: true },
  { id: 'D002', name: 'Dr. Michael Chen', department: 'Neurology', specialization: 'Stroke Medicine', isAvailable: true },
  { id: 'D003', name: 'Dr. Emily Davis', department: 'Pediatrics', specialization: 'Pediatric Endocrinology', isAvailable: false },
  { id: 'D004', name: 'Dr. Robert Wilson', department: 'Orthopedics', specialization: 'Joint Replacement', isAvailable: true },
  { id: 'D005', name: 'Dr. Lisa Anderson', department: 'Dermatology', specialization: 'Cosmetic Dermatology', isAvailable: true },
];

const sampleAppointments: Appointment[] = [
  {
    id: 'APT001',
    patientName: 'John Doe',
    patientId: 'P001',
    patientPhone: '+91-9876543210',
    doctorId: 'D001',
    doctorName: 'Dr. Sarah Johnson',
    department: 'Cardiology',
    date: new Date('2024-01-16'),
    time: '09:00 AM',
    status: 'confirmed',
    followUpRequired: true,
    followUpDate: new Date('2024-02-16'),
    appointmentType: 'consultation',
    priority: 'high',
    notes: 'Patient requires cardiac evaluation'
  },
  {
    id: 'APT002',
    patientName: 'Jane Smith',
    patientId: 'P002',
    patientPhone: '+91-9876543211',
    doctorId: 'D002',
    doctorName: 'Dr. Michael Chen',
    department: 'Neurology',
    date: new Date('2024-01-16'),
    time: '10:30 AM',
    status: 'no-show',
    followUpRequired: true,
    appointmentType: 'follow-up',
    priority: 'medium',
    notes: 'Patient missed appointment, needs rescheduling'
  },
  {
    id: 'APT003',
    patientName: 'Robert Wilson',
    patientId: 'P003',
    patientPhone: '+91-9876543212',
    doctorId: 'D004',
    doctorName: 'Dr. Robert Wilson',
    department: 'Orthopedics',
    date: new Date('2024-01-16'),
    time: '02:00 PM',
    status: 'completed',
    followUpRequired: false,
    appointmentType: 'consultation',
    priority: 'low'
  }
];

export const AppointmentOversight: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const [appointments, setAppointments] = useState<Appointment[]>(sampleAppointments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showSlotManagement, setShowSlotManagement] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const { toast } = useToast();

  const [reassignData, setReassignData] = useState({
    newDoctorId: '',
    reason: '',
    notifyPatient: true
  });

  const departments = [...new Set(doctors.map(d => d.department))];

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'all' || appointment.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    const matchesDate = !filterDate || 
      (appointment.date.toDateString() === filterDate.toDateString());

    return matchesSearch && matchesDepartment && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      confirmed: { variant: 'default', icon: CheckCircle, label: t('appointmentOversight.status.confirmed') },
      cancelled: { variant: 'destructive', icon: XCircle, label: t('appointmentOversight.status.cancelled') },
      'no-show': { variant: 'secondary', icon: UserX, label: t('appointmentOversight.status.noShow') },
      completed: { variant: 'outline', icon: CheckCircle, label: t('appointmentOversight.status.completed') },
      rescheduled: { variant: 'secondary', icon: Calendar, label: t('appointmentOversight.status.rescheduled') }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Appointment['priority']) => {
    const priorityConfig = {
      low: { variant: 'outline', label: t('appointmentOversight.priority.low') },
      medium: { variant: 'secondary', label: t('appointmentOversight.priority.medium') },
      high: { variant: 'destructive', label: t('appointmentOversight.priority.high') }
    };
    
    const config = priorityConfig[priority];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const handleReassignDoctor = () => {
    if (!selectedAppointment || !reassignData.newDoctorId) {
      toast({
        title: t('appointmentOversight.toast.missingTitle'),
        description: t('appointmentOversight.toast.missingDescription'),
        variant: "destructive"
      });
      return;
    }

    const newDoctor = doctors.find(d => d.id === reassignData.newDoctorId);
    if (!newDoctor) return;

    setAppointments(prev => prev.map(apt => 
      apt.id === selectedAppointment.id 
        ? { 
            ...apt, 
            doctorId: newDoctor.id, 
            doctorName: newDoctor.name,
            department: newDoctor.department,
            status: 'rescheduled' as const
          }
        : apt
    ));

    toast({
      title: t('appointmentOversight.toast.reassignedTitle'),
      description: t('appointmentOversight.toast.reassignedDescription', {
        doctor: newDoctor.name,
        notified: reassignData.notifyPatient ? t('appointmentOversight.toast.notified') : ''
      }).trim(),
    });

    setShowReassignDialog(false);
    setReassignData({ newDoctorId: '', reason: '', notifyPatient: true });
    setSelectedAppointment(null);
  };

  const handleStatusUpdate = (appointmentId: string, newStatus: Appointment['status']) => {
    const statusKey = newStatus === 'no-show' ? 'noShow' : newStatus;
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId ? { ...apt, status: newStatus } : apt
    ));

    toast({
      title: t('appointmentOversight.toast.statusUpdatedTitle'),
      description: t('appointmentOversight.toast.statusUpdatedDescription', { status: t(`appointmentOversight.status.${statusKey}`) }),
    });
  };

  const handleFollowUpSchedule = (appointmentId: string, followUpDate: Date) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, followUpRequired: true, followUpDate }
        : apt
    ));

    toast({
      title: t('appointmentOversight.toast.followUpScheduledTitle'),
      description: t('appointmentOversight.toast.followUpScheduledDescription', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(followUpDate) }),
    });
  };

  const getStatsCards = () => {
    const today = new Date();
    const todayAppointments = appointments.filter(apt => 
      apt.date.toDateString() === today.toDateString()
    );

    const stats = {
      total: todayAppointments.length,
      confirmed: todayAppointments.filter(apt => apt.status === 'confirmed').length,
      noShows: todayAppointments.filter(apt => apt.status === 'no-show').length,
      completed: todayAppointments.filter(apt => apt.status === 'completed').length,
      followUpsRequired: appointments.filter(apt => apt.followUpRequired).length
    };

    return [
      { title: t('appointmentOversight.stats.today'), value: stats.total, icon: Calendar, color: "healthcare-primary" },
      { title: t('appointmentOversight.status.confirmed'), value: stats.confirmed, icon: CheckCircle, color: "healthcare-success" },
      { title: t('appointmentOversight.stats.noShows'), value: stats.noShows, icon: UserX, color: "healthcare-error" },
      { title: t('appointmentOversight.stats.followUpsRequired'), value: stats.followUpsRequired, icon: AlertTriangle, color: "healthcare-warning" },
    ];
  };

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('appointmentOversight.title')}</h1>
          <p className="text-muted-foreground">{t('appointmentOversight.subtitle')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={showSlotManagement} onOpenChange={setShowSlotManagement}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarX className="h-4 w-4" />
                {t('appointmentOversight.manageSlots')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('appointmentOversight.slotManagement.title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('appointmentOversight.slotManagement.selectDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('appointmentOversight.slotManagement.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>{t('appointmentOversight.slotManagement.selectDoctor')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('appointmentOversight.slotManagement.chooseDoctor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="destructive">
                    <Ban className="h-4 w-4 mr-1" />
                    {t('appointmentOversight.slotManagement.blockSlots')}
                  </Button>
                  <Button className="flex-1">
                    <CalendarCheck className="h-4 w-4 mr-1" />
                    {t('appointmentOversight.slotManagement.openSlots')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            {t('appointmentOversight.exportReport')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getStatsCards().map((stat, index) => (
          <Card key={index} className="shadow-card hover:shadow-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}/10`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('appointmentOversight.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder={t('appointmentOversight.filters.allDepartments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('appointmentOversight.filters.allDepartments')}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('appointmentOversight.filters.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('appointmentOversight.filters.allStatus')}</SelectItem>
                <SelectItem value="confirmed">{t('appointmentOversight.status.confirmed')}</SelectItem>
                <SelectItem value="cancelled">{t('appointmentOversight.status.cancelled')}</SelectItem>
                <SelectItem value="no-show">{t('appointmentOversight.status.noShow')}</SelectItem>
                <SelectItem value="completed">{t('appointmentOversight.status.completed')}</SelectItem>
                <SelectItem value="rescheduled">{t('appointmentOversight.status.rescheduled')}</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {filterDate ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(filterDate) : t('appointmentOversight.filters.filterByDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent 
                  mode="single" 
                  selected={filterDate}
                  onSelect={setFilterDate}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilterDepartment('all');
                setFilterStatus('all');
                setFilterDate(undefined);
              }}
            >
              {t('appointmentOversight.filters.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>{t('appointmentOversight.table.title', { count: filteredAppointments.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.patient')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.doctor')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.dateTime')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.priority')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.followUp')}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t('appointmentOversight.table.headers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{appointment.patientName}</div>
                        <div className="text-sm text-muted-foreground">{appointment.patientId}</div>
                        <div className="text-xs text-muted-foreground">{appointment.patientPhone}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{appointment.doctorName}</div>
                        <div className="text-sm text-muted-foreground">{appointment.department}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(appointment.date)}</div>
                        <div className="text-sm text-muted-foreground">{appointment.time}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(appointment.status)}</td>
                    <td className="py-3 px-4">{getPriorityBadge(appointment.priority)}</td>
                    <td className="py-3 px-4">
                      {appointment.followUpRequired ? (
                        <div className="text-sm">
                          <div className="text-healthcare-warning">{t('appointmentOversight.followUp.required')}</div>
                          {appointment.followUpDate && (
                            <div className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(appointment.followUpDate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t('appointmentOversight.followUp.notRequired')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowReassignDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('appointmentOversight.actions.reassignDoctor')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('appointmentOversight.actions.markCompleted')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusUpdate(appointment.id, 'no-show')}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            {t('appointmentOversight.actions.markNoShow')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            {t('appointmentOversight.actions.callPatient')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('appointmentOversight.actions.sendMessage')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="p-4 shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{appointment.patientName}</h3>
                    <p className="text-sm text-muted-foreground">{appointment.patientId}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(appointment.status)}
                    {getPriorityBadge(appointment.priority)}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('appointmentOversight.table.headers.doctor')}:</span>
                    <span className="font-medium">{appointment.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('appointmentOversight.table.labels.department')}:</span>
                    <span>{appointment.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('appointmentOversight.table.labels.date')}:</span>
                    <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(appointment.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('appointmentOversight.table.labels.time')}:</span>
                    <span>{appointment.time}</span>
                  </div>
                  {appointment.followUpRequired && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('appointmentOversight.table.headers.followUp')}:</span>
                      <span className="text-healthcare-warning">{t('appointmentOversight.followUp.required')}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowReassignDialog(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('appointmentOversight.actions.reassign')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('appointmentOversight.actions.markCompleted')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusUpdate(appointment.id, 'no-show')}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        {t('appointmentOversight.actions.markNoShow')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="h-4 w-4 mr-2" />
                        {t('appointmentOversight.actions.callPatient')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reassign Doctor Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('appointmentOversight.reassignDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppointment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAppointment.patientName}</p>
                <p className="text-sm text-muted-foreground">
                  {t('appointmentOversight.reassignDialog.currentDoctor', { doctor: selectedAppointment.doctorName, department: selectedAppointment.department })}
                </p>
              </div>
            )}
            
            <div>
              <Label>{t('appointmentOversight.reassignDialog.newDoctor')}</Label>
              <Select 
                value={reassignData.newDoctorId} 
                onValueChange={(value) => setReassignData(prev => ({ ...prev, newDoctorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('appointmentOversight.reassignDialog.selectDoctorPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {doctors
                    .filter(d => d.isAvailable && d.id !== selectedAppointment?.doctorId)
                    .map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.department}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">{t('appointmentOversight.reassignDialog.reasonLabel')}</Label>
              <Textarea
                id="reason"
                value={reassignData.reason}
                onChange={(e) => setReassignData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('appointmentOversight.reassignDialog.reasonPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={reassignData.notifyPatient}
                onCheckedChange={(checked) => setReassignData(prev => ({ ...prev, notifyPatient: checked as boolean }))}
              />
              <Label htmlFor="notify">{t('appointmentOversight.reassignDialog.notifyPatient')}</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReassignDoctor} className="flex-1">
                {t('appointmentOversight.reassignDialog.submit')}
              </Button>
              <Button variant="outline" onClick={() => setShowReassignDialog(false)} className="flex-1">
                {t('appointmentOversight.reassignDialog.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};