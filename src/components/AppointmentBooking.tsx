import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Users, Stethoscope, ChevronDown, CalendarIcon } from 'lucide-react';
import { DepartmentSidebar } from './booking/DepartmentSidebar';
import { DateSelector } from './booking/DateSelector';
import { ShiftTabs } from './booking/ShiftTabs';
import { TimeSlots } from './booking/TimeSlots';
import { PatientForm } from './booking/PatientForm';
import { VitalsForm } from './booking/VitalsForm';
import { BookingSuccess } from './booking/BookingSuccess';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ContextualGuide } from './guide/ContextualGuide';
import { APPOINTMENT_GUIDES } from './guide/GuideData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  isBooked: boolean;
  patientInfo?: {
    name: string;
    phone: string;
    age: number;
    gender: string;
  };
  doctorId: string;
  date: string;
}

export interface Department {
  id: string;
  name: string;
  icon: any;
  doctors: Doctor[];
}

const departments: Department[] = [
  {
    id: 'cardiology',
    name: 'Cardiology',
    icon: Calendar,
    doctors: [
      { id: '1', name: 'Dr. Sarah Johnson', department: 'Cardiology', specialization: 'Heart Surgery' },
      { id: '2', name: 'Dr. Michael Chen', department: 'Cardiology', specialization: 'Cardiac Care' }
    ]
  },
  {
    id: 'neurology',
    name: 'Neurology',
    icon: Users,
    doctors: [
      { id: '3', name: 'Dr. Emily Davis', department: 'Neurology', specialization: 'Brain Surgery' },
      { id: '4', name: 'Dr. Robert Wilson', department: 'Neurology', specialization: 'Neurological Care' }
    ]
  },
  {
    id: 'urology',
    name: 'Urology',
    icon: Phone,
    doctors: [
      { id: '7', name: 'Dr. William Thompson', department: 'Urology', specialization: 'Urological Surgery' },
      { id: '8', name: 'Dr. Jennifer Clark', department: 'Urology', specialization: 'Kidney Specialist' }
    ]
  },
  {
    id: 'general',
    name: 'General Medicine',
    icon: Stethoscope,
    doctors: [
      { id: '5', name: 'Dr. Lisa Anderson', department: 'General Medicine', specialization: 'Family Medicine' },
      { id: '6', name: 'Dr. James Brown', department: 'General Medicine', specialization: 'Internal Medicine' }
    ]
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    icon: User,
    doctors: [
      { id: '9', name: 'Dr. Maria Garcia', department: 'Dermatology', specialization: 'Skin Specialist' },
      { id: '10', name: 'Dr. David Kim', department: 'Dermatology', specialization: 'Cosmetic Dermatology' }
    ]
  },
  {
    id: 'orthopedics',
    name: 'Orthopedics',
    icon: Clock,
    doctors: [
      { id: '11', name: 'Dr. John Miller', department: 'Orthopedics', specialization: 'Bone & Joint Surgery' },
      { id: '12', name: 'Dr. Susan Taylor', department: 'Orthopedics', specialization: 'Sports Medicine' }
    ]
  }
];

const generateTimeSlots = (doctorId: string, date: string): TimeSlot[] => {
  const shifts = {
    morning: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
    evening: ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'],
    night: ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30']
  };

  const allTimes = [...shifts.morning, ...shifts.afternoon, ...shifts.evening, ...shifts.night];
  
  return allTimes.map((time, index) => ({
    id: `${doctorId}-${date}-${time}`,
    time,
    isBooked: Math.random() > 0.7, // Random booking for demo
    patientInfo: Math.random() > 0.7 ? {
      name: 'John Doe',
      phone: '+1-555-0123',
      age: 35,
      gender: 'Male'
    } : undefined,
    doctorId,
    date
  }));
};

export const AppointmentBooking: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(departments[0].id);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(departments[0].doctors[0]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState('morning');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [patientData, setPatientData] = useState<any>(null);

  const selectedDepartmentData = departments.find(d => d.id === selectedDepartment);
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  React.useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    setTimeSlots(generateTimeSlots(selectedDoctor.id, dateStr));
  }, [selectedDoctor, selectedDate]);

  const handleDepartmentSelect = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (department) {
      setSelectedDepartment(departmentId);
      setSelectedDoctor(department.doctors[0]);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isBooked) {
      setSelectedSlot(slot);
      setShowPatientForm(true);
    }
  };

  const handleBookingComplete = (patientInfo: any) => {
    setPatientData(patientInfo);
    setShowPatientForm(false);
    setShowVitalsForm(true);
  };

  const handleVitalsComplete = (vitalsData: any) => {
    const newAppointmentId = `APT${Date.now()}`;
    setAppointmentId(newAppointmentId);
    
    // Update the slot as booked with both patient and vitals data
    setTimeSlots(prev => prev.map(slot => 
      slot.id === selectedSlot?.id 
        ? { ...slot, isBooked: true, patientInfo: { ...patientData, vitals: vitalsData } }
        : slot
    ));
    
    setShowVitalsForm(false);
    setShowSuccess(true);
    setSelectedSlot(null);
    setPatientData(null);
  };

  const handleVitalsSkip = () => {
    const newAppointmentId = `APT${Date.now()}`;
    setAppointmentId(newAppointmentId);
    
    // Update the slot as booked with only patient data
    setTimeSlots(prev => prev.map(slot => 
      slot.id === selectedSlot?.id 
        ? { ...slot, isBooked: true, patientInfo: patientData }
        : slot
    ));
    
    setShowVitalsForm(false);
    setShowSuccess(true);
    setSelectedSlot(null);
    setPatientData(null);
  };

  const handleSlotUpdate = (updatedSlot: TimeSlot) => {
    setTimeSlots(prev => prev.map(slot => 
      slot.id === updatedSlot.id ? updatedSlot : slot
    ));
  };

  const handleSlotCancel = (slotId: string) => {
    setTimeSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, isBooked: false, patientInfo: undefined }
        : slot
    ));
  };

  if (showSuccess) {
    return (
      <BookingSuccess 
        appointmentId={appointmentId}
        doctor={selectedDoctor}
        date={selectedDate}
        timeSlot={selectedSlot}
        onBookAnother={() => {
          setShowSuccess(false);
          setSelectedSlot(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Mobile-First Layout */}
      <div className="min-h-screen">
        {/* Mobile Header - Fixed Position */}
        <div className="lg:hidden sticky top-0 z-40 bg-white shadow-sm border-b">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-primary">Book Appointment</h1>
              <div className="text-xs text-muted-foreground">
                {format(selectedDate, 'MMM dd')}
              </div>
            </div>
            
            {/* Compact Selection Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Department Dropdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <dept.icon className="h-3 w-3" />
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Doctor Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Doctor</label>
                <Select value={selectedDoctor.id} onValueChange={(value) => {
                  const doctor = selectedDepartmentData?.doctors.find(d => d.id === value);
                  if (doctor) setSelectedDoctor(doctor);
                }}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Doctor" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {selectedDepartmentData?.doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id} className="text-xs">
                        <div>
                          <div className="font-medium">{doctor.name.split(' ')[1]}</div>
                          <div className="text-xs text-muted-foreground truncate">{doctor.specialization}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200/50 shadow-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                🏥 Department Selection
              </h3>
              
              {/* Department Grid - Desktop */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {departments.slice(0, 4).map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => handleDepartmentSelect(dept.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all text-xs ${
                      selectedDepartment === dept.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                    }`}
                  >
                    <dept.icon className="h-5 w-5" />
                    <span className="font-medium">{dept.name}</span>
                  </button>
                ))}
              </div>

              {/* More Departments Dropdown */}
              <div className="mb-4">
              <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="More Departments..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">
                    {departments.slice(4).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <dept.icon className="h-3 w-3" />
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Selection - Desktop */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  👩‍⚕️ Available Doctors
                </h3>
                <div className="space-y-2">
                  {selectedDepartmentData?.doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      className={`w-full p-3 rounded-lg border text-left transition-all text-xs ${
                        selectedDoctor.id === doctor.id
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-blue-600 text-sm">{doctor.name}</div>
                      <div className="text-xs text-gray-500">{doctor.specialization}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="border-t pt-4 mt-4">
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-red-500 rounded-full"></div>
                    <span className="text-gray-600">Booked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-4 lg:p-6 overflow-y-auto pb-safe">
              <div className="max-w-4xl mx-auto">
                {/* Desktop Header */}
                <div className="hidden lg:block mb-6">
                  <h1 className="text-2xl font-bold text-foreground mb-2">Schedule Appointment</h1>
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-semibold text-primary">{selectedDoctor.name}</span>
                    <span className="text-muted-foreground/50"> • </span>
                    <span>{selectedDoctor.specialization}</span>
                  </p>
                </div>

                {/* Date Selection with Calendar */}
                <div className="mb-4">
                  <h2 className="text-sm lg:text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
                    📅 Select Date
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const isToday = i === 0;
                      const isSelected = selectedDate.toDateString() === date.toDateString();
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(date)}
                          className={`px-3 py-2.5 rounded-lg border text-center min-w-[68px] lg:min-w-[80px] flex-shrink-0 transition-all text-xs lg:text-sm ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                              : 'bg-card border-border hover:border-primary/50 hover:bg-accent hover:scale-105'
                          }`}
                        >
                          <div className="font-medium">
                            {isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Calendar Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="px-3 py-2.5 rounded-lg border border-dashed border-border bg-muted hover:bg-accent text-center min-w-[68px] lg:min-w-[80px] text-xs lg:text-sm flex-shrink-0 transition-all hover:scale-105">
                          <CalendarIcon className="h-4 w-4 mx-auto text-muted-foreground" />
                          <div className="mt-0.5 text-muted-foreground">Other</div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Medical-Appropriate Shift Selection */}
                <div className="mb-4">
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    ⏰ Select Time Shift
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'morning', label: 'Morning', time: '8AM-12PM', icon: '🌅', gradient: 'from-teal-400 to-cyan-500', medical: 'General Consultation' },
                      { id: 'afternoon', label: 'Afternoon', time: '12PM-4PM', icon: '☀️', gradient: 'from-amber-400 to-orange-400', medical: 'Specialist Care' },
                      { id: 'evening', label: 'Evening', time: '4PM-8PM', icon: '🌇', gradient: 'from-blue-400 to-indigo-500', medical: 'Follow-up' },
                      { id: 'night', label: 'Night', time: '8PM-11PM', icon: '🌙', gradient: 'from-slate-500 to-gray-600', medical: 'Emergency' }
                    ].map((shift) => (
                      <button
                        key={shift.id}
                        onClick={() => setSelectedShift(shift.id)}
                        className={`p-3 rounded-lg border text-center transition-all text-xs shadow-sm animate-scale-in ${
                          selectedShift === shift.id
                            ? `bg-gradient-to-r ${shift.gradient} text-white border-transparent shadow-md scale-105`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover-scale'
                        }`}
                      >
                        <div className="text-lg mb-1">{shift.icon}</div>
                        <div className="font-medium">{shift.label}</div>
                        <div className={`text-xs mt-1 ${
                          selectedShift === shift.id ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {shift.time}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots - Ultra-Responsive Grid */}
                <div>
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    🕐 Available Time Slots
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {timeSlots.filter(slot => {
                        if (selectedShift === 'morning') return parseInt(slot.time) < 12;
                        if (selectedShift === 'afternoon') return parseInt(slot.time) >= 12 && parseInt(slot.time) < 16;
                        if (selectedShift === 'evening') return parseInt(slot.time) >= 16 && parseInt(slot.time) < 20;
                        if (selectedShift === 'night') return parseInt(slot.time) >= 20;
                        return true;
                      }).filter(slot => !slot.isBooked).length} Available
                    </span>
                  </h2>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                    {timeSlots
                      .filter(slot => {
                        if (selectedShift === 'morning') return parseInt(slot.time) < 12;
                        if (selectedShift === 'afternoon') return parseInt(slot.time) >= 12 && parseInt(slot.time) < 16;
                        if (selectedShift === 'evening') return parseInt(slot.time) >= 16 && parseInt(slot.time) < 20;
                        if (selectedShift === 'night') return parseInt(slot.time) >= 20;
                        return true;
                      })
                      .map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => !slot.isBooked && handleSlotSelect(slot)}
                        disabled={slot.isBooked}
                        className={`p-2 rounded-lg border text-center transition-all text-xs min-h-[60px] flex flex-col justify-center shadow-sm hover:shadow-md animate-fade-in ${
                          slot.isBooked
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-not-allowed opacity-60'
                            : selectedSlot?.id === slot.id
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-200 hover:from-teal-100 hover:to-emerald-200 hover:border-teal-300 hover-scale'
                        }`}
                      >
                        <div className={`font-bold text-xs mb-1 ${
                          selectedSlot?.id === slot.id ? 'text-white' : slot.isBooked ? 'text-red-700' : 'text-teal-700'
                        }`}>
                          {slot.time}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          slot.isBooked
                            ? 'bg-red-200 text-red-800'
                            : selectedSlot?.id === slot.id
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-200 text-teal-800'
                        }`}>
                          {slot.isBooked ? '❌' : selectedSlot?.id === slot.id ? '✅' : '✓'}
                        </div>
                        {slot.isBooked && (
                          <div className="flex justify-center gap-1 mt-1 opacity-60">
                            <span className="text-xs">📋</span>
                            <span className="text-xs">✏️</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Quick Info */}
                  <div className="mt-3 text-xs text-gray-600 bg-white/50 p-3 rounded-lg border border-gray-200">
                    💡 <strong>Tip:</strong> Tap any green slot to book an appointment. Slots are 30 minutes each.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Form Modal */}
      {showPatientForm && selectedSlot && (
        <PatientForm
          selectedSlot={selectedSlot}
          doctor={selectedDoctor}
          onSubmit={handleBookingComplete}
          onCancel={() => {
            setShowPatientForm(false);
            setSelectedSlot(null);
          }}
        />
      )}

      {/* Vitals Form Modal */}
      {showVitalsForm && patientData && (
        <VitalsForm
          patientName={patientData.name}
          onSubmit={handleVitalsComplete}
          onCancel={handleVitalsSkip}
        />
      )}
    </div>
  );
};