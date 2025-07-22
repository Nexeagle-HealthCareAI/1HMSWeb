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
import { ContextualGuide } from './guide/ContextualGuide';
import { APPOINTMENT_GUIDES } from './guide/GuideData';

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
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Department Selection */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Select Department</h3>
            <div className="space-y-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleDepartmentSelect(dept)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedDepartment.id === dept.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <dept.icon className="h-5 w-5" />
                  <span className="font-medium">{dept.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Available Doctors */}
          <div className="flex-1 p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Available Doctors</h3>
            <div className="space-y-3">
              {selectedDepartment.doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedDoctor.id === doctor.id
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-blue-600">{doctor.name}</div>
                  <div className="text-sm text-gray-600">{doctor.specialization}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slot Legend */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Slot Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span className="text-sm text-gray-600">Booked</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-200 rounded"></div>
                <span className="text-sm text-gray-600">Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-6xl">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule Appointment</h1>
                <p className="text-gray-600">
                  Selected Doctor: <span className="font-semibold text-blue-600">{selectedDoctor.name}</span>
                  <span className="text-gray-400"> • </span>
                  <span>{selectedDoctor.specialization}</span>
                </p>
              </div>

              {/* Date Selection */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Select Date</h2>
                <div className="flex gap-3">
                  {Array.from({ length: 5 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isToday = i === 0;
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`px-6 py-4 rounded-lg border text-center min-w-[100px] transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">
                          {isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })}
                        </div>
                        <div className="text-sm mt-1">
                          {date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    );
                  })}
                  <button className="px-6 py-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 text-center min-w-[100px]">
                    <div className="text-gray-600">📅</div>
                    <div className="text-sm mt-1">Other Date</div>
                  </button>
                </div>
                <div className="mt-3 text-sm text-blue-600">
                  Selected Date: <span className="font-medium">{selectedDate.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {/* Time Shift Selection */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Select Time Shift</h2>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { id: 'morning', label: 'Morning', time: '8AM - 12PM', icon: '🌅', color: 'orange' },
                    { id: 'afternoon', label: 'Afternoon', time: '12PM - 4PM', icon: '☀️', color: 'yellow' },
                    { id: 'evening', label: 'Evening', time: '4PM - 8PM', icon: '🌇', color: 'orange' },
                    { id: 'night', label: 'Night', time: '8PM - 11PM', icon: '🌙', color: 'blue' }
                  ].map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedShift(shift.id)}
                      className={`p-6 rounded-lg border text-center transition-all ${
                        selectedShift === shift.id
                          ? `border-${shift.color}-300 bg-${shift.color}-50`
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{shift.icon}</div>
                      <div className="font-medium text-gray-900">{shift.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{shift.time}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Time Slots */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Available Time Slots</h2>
                <div className="grid grid-cols-4 gap-4">
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
                      className={`p-6 rounded-lg border text-center transition-all ${
                        slot.isBooked
                          ? 'bg-red-50 border-red-200 cursor-not-allowed'
                          : selectedSlot?.id === slot.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      <div className={`text-2xl mb-2 ${
                        slot.isBooked ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {slot.isBooked ? '🕐' : '🕐'}
                      </div>
                      <div className="font-medium">{slot.time}</div>
                      <div className={`text-sm px-3 py-1 rounded-full mt-2 ${
                        slot.isBooked
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {slot.isBooked ? 'Booked' : 'Available'}
                      </div>
                      {slot.isBooked && (
                        <div className="flex justify-center gap-2 mt-3">
                          <button className="p-1 text-gray-400 hover:text-gray-600">📋</button>
                          <button className="p-1 text-gray-400 hover:text-gray-600">✏️</button>
                          <button className="p-1 text-gray-400 hover:text-gray-600">❌</button>
                        </div>
                      )}
                    </button>
                  ))}
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
    </div>
  );
};