import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Users, Stethoscope } from 'lucide-react';
import { DepartmentSidebar } from './booking/DepartmentSidebar';
import { DateSelector } from './booking/DateSelector';
import { ShiftTabs } from './booking/ShiftTabs';
import { TimeSlots } from './booking/TimeSlots';
import { PatientForm } from './booking/PatientForm';
import { BookingSuccess } from './booking/BookingSuccess';
import { Button } from './ui/button';
import { Card } from './ui/card';

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
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]);
  const [selectedDoctor, setSelectedDoctor] = useState(departments[0].doctors[0]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState('morning');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  React.useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    setTimeSlots(generateTimeSlots(selectedDoctor.id, dateStr));
  }, [selectedDoctor, selectedDate]);

  const handleDepartmentSelect = (department: Department) => {
    setSelectedDepartment(department);
    setSelectedDoctor(department.doctors[0]);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isBooked) {
      setSelectedSlot(slot);
      setShowPatientForm(true);
    }
  };

  const handleBookingComplete = (patientInfo: any) => {
    const newAppointmentId = `APT${Date.now()}`;
    setAppointmentId(newAppointmentId);
    
    // Update the slot as booked
    setTimeSlots(prev => prev.map(slot => 
      slot.id === selectedSlot?.id 
        ? { ...slot, isBooked: true, patientInfo }
        : slot
    ));
    
    setShowPatientForm(false);
    setShowSuccess(true);
    setSelectedSlot(null);
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <div className="lg:w-80 lg:flex-shrink-0">
          <DepartmentSidebar
            departments={departments}
            selectedDepartment={selectedDepartment}
            selectedDoctor={selectedDoctor}
            onDepartmentSelect={handleDepartmentSelect}
            onDoctorSelect={setSelectedDoctor}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          <Card className="p-4 lg:p-6 shadow-card">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
                Schedule Appointment
              </h2>
              <p className="text-sm lg:text-base text-muted-foreground">
                Selected Doctor: <span className="font-semibold text-healthcare-primary">{selectedDoctor.name}</span>
                <span className="hidden sm:inline">{' '}• {selectedDoctor.specialization}</span>
              </p>
            </div>

            {/* Date Selection */}
            <DateSelector
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {/* Shift Tabs */}
            <ShiftTabs
              selectedShift={selectedShift}
              onShiftSelect={setSelectedShift}
            />

            {/* Time Slots */}
            <TimeSlots
              timeSlots={timeSlots}
              selectedShift={selectedShift}
              onSlotSelect={handleSlotSelect}
              onSlotUpdate={handleSlotUpdate}
              onSlotCancel={handleSlotCancel}
            />
          </Card>
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
    </div>
  );
};