import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Users, Stethoscope } from 'lucide-react';
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
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [patientData, setPatientData] = useState<any>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Ultra-Compact Sidebar */}
        <div className="w-full lg:w-64 bg-white/90 backdrop-blur-sm border-b lg:border-r border-gray-200/50 shadow-lg lg:shadow-none">
          {/* Combined Department & Doctor Selection */}
          <div className="p-2 lg:p-3">
            <h3 className="text-xs font-semibold mb-2 text-gray-700 flex items-center gap-1">
              🏥 Department & Doctor
            </h3>
            
            {/* Department Pills - Mobile Horizontal */}
            <div className="flex lg:grid lg:grid-cols-1 gap-1 overflow-x-auto pb-2 lg:pb-0 mb-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleDepartmentSelect(dept)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-left transition-all text-xs flex-shrink-0 ${
                    selectedDepartment.id === dept.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <dept.icon className="h-3 w-3" />
                  <span className="font-medium whitespace-nowrap">{dept.name}</span>
                </button>
              ))}
            </div>

            {/* Doctors - Compact */}
            <div className="grid grid-cols-1 gap-1">
              {selectedDepartment.doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className={`w-full p-2 rounded-lg border text-left transition-all text-xs ${
                    selectedDoctor.id === doctor.id
                      ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-blue-600 text-xs">{doctor.name}</div>
                  <div className="text-xs text-gray-500 truncate">{doctor.specialization}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mini Legend */}
          <div className="px-2 lg:px-3 pb-2 lg:pb-3 border-t border-gray-200/50 mt-2">
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                <span className="text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gradient-to-r from-red-400 to-red-500 rounded-full"></div>
                <span className="text-gray-600">Booked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Optimized Grid Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-4 overflow-y-auto">
            <div className="max-w-7xl">
              {/* Compact Header */}
              <div className="mb-4">
                <h1 className="text-lg font-bold text-gray-900 mb-1">Schedule Appointment</h1>
                <p className="text-sm text-gray-600">
                  Dr: <span className="font-semibold text-blue-600">{selectedDoctor.name}</span>
                  <span className="text-gray-400 hidden sm:inline"> • {selectedDoctor.specialization}</span>
                </p>
              </div>

              {/* Date Selection */}
              <div className="mb-3">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  📅 Select Date
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isToday = i === 0;
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`px-3 py-2 rounded-lg border text-center min-w-[70px] flex-shrink-0 transition-all text-xs shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="font-medium">
                          {isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' })}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                          {date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    );
                  })}
                  <button className="px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-center min-w-[70px] text-xs flex-shrink-0 transition-all">
                    <div className="text-gray-500">📅</div>
                    <div className="mt-1 text-gray-600">Other</div>
                  </button>
                </div>
              </div>

              {/* Time Shift Selection */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  ⏰ Select Time Shift
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'morning', label: 'Morning', time: '8AM-12PM', icon: '🌅', gradient: 'from-orange-400 to-yellow-500' },
                    { id: 'afternoon', label: 'Afternoon', time: '12PM-4PM', icon: '☀️', gradient: 'from-yellow-400 to-orange-400' },
                    { id: 'evening', label: 'Evening', time: '4PM-8PM', icon: '🌇', gradient: 'from-orange-500 to-red-500' },
                    { id: 'night', label: 'Night', time: '8PM-11PM', icon: '🌙', gradient: 'from-indigo-500 to-purple-600' }
                  ].map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedShift(shift.id)}
                      className={`p-3 rounded-lg border text-center transition-all text-xs shadow-sm ${
                        selectedShift === shift.id
                          ? `bg-gradient-to-r ${shift.gradient} text-white border-transparent shadow-md scale-105`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-102'
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
                      className={`p-2 rounded-lg border text-center transition-all text-xs min-h-[60px] flex flex-col justify-center shadow-sm hover:shadow-md ${
                        slot.isBooked
                          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-not-allowed opacity-60'
                          : selectedSlot?.id === slot.id
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg scale-105'
                          : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200 hover:border-green-300'
                      }`}
                    >
                      <div className={`font-bold text-xs mb-1 ${
                        selectedSlot?.id === slot.id ? 'text-white' : slot.isBooked ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {slot.time}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        slot.isBooked
                          ? 'bg-red-200 text-red-800'
                          : selectedSlot?.id === slot.id
                          ? 'bg-white/20 text-white'
                          : 'bg-green-200 text-green-800'
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