import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, User, Phone, Users, Stethoscope, ChevronDown, CalendarIcon } from 'lucide-react';
import { DepartmentSidebar } from './DepartmentSidebar';
import { DateSelector } from './DateSelector';
import { ShiftTabs } from './ShiftTabs';
import { TimeSlots } from './TimeSlots';
import { PatientForm } from './PatientForm';
import { VitalsForm } from './VitalsForm';
import { BookingSuccess } from './BookingSuccess';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
// import { ContextualGuide } from './guide/ContextualGuide';
// import { APPOINTMENT_GUIDES } from './guide/GuideData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDepartments } from '../hooks/useDepartments';
import { useHospitalUser } from '../hooks/useHospitalUser';
import { useDoctorsByDepartment } from '../hooks/useDoctorsByDepartment';
import { useDoctorSlots } from '../hooks/useDoctorSlots';
import { useBookedSlots } from '../hooks/useBookedSlots';
import { Department as ApiDepartment, ApiDoctor, BookedSlotsResponse } from '../services/appointmentApi';
import { useQueryClient } from '@tanstack/react-query';
import { generateTimeSlotsFromShiftInfo } from '../utils/slotGenerator';
import { useAuthStore } from '@/store/authStore';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  is_available?: boolean;
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
  slotDurationInMinutes?: number;
  shiftName?: string;
}

export interface Department {
  id: string;
  name: string;
  icon: any;
  doctors: Doctor[];
}

// Default icons for departments
const getDepartmentIcon = (departmentName: string) => {
  const name = departmentName.toLowerCase();
  if (name.includes('cardio')) return Calendar;
  if (name.includes('neuro')) return Users;
  if (name.includes('urology')) return Phone;
  if (name.includes('general') || name.includes('medicine')) return Stethoscope;
  if (name.includes('dermatology') || name.includes('skin')) return User;
  if (name.includes('ortho') || name.includes('bone')) return Clock;
  return Stethoscope; // default icon
};

// Helper functions for shifts
const getShiftIcon = (shiftName: string): string => {
  const icons: { [key: string]: string } = {
    'Morning': '🌅',
    'Afternoon': '☀️',
    'Evening': '🌇',
    'Night': '🌙',
    'default': '⏰'
  };
  return icons[shiftName] || icons.default;
};

const getShiftGradient = (shiftName: string): string => {
  const gradients: { [key: string]: string } = {
    'Morning': 'from-teal-400 to-cyan-500',
    'Afternoon': 'from-amber-400 to-orange-400',
    'Evening': 'from-blue-400 to-indigo-500',
    'Night': 'from-slate-500 to-gray-600',
    'default': 'from-gray-400 to-gray-500'
  };
  return gradients[shiftName] || gradients.default;
};

const getShiftMedicalType = (shiftName: string): string => {
  const types: { [key: string]: string } = {
    'Morning': 'General Consultation',
    'Afternoon': 'Specialist Care',
    'Evening': 'Follow-up',
    'Night': 'Emergency',
    'default': 'General Care'
  };
  return types[shiftName] || types.default;
};

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
    isBooked: false, // All slots are available by default
    doctorId,
    date,
    slotDurationInMinutes: 10, // Default slot duration
    shiftName: 'Default'
  }));
};

export const AppointmentBooking: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Get userId and authentication status from Zustand auth store
  const userId = useAuthStore((state) => state.userId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Fetch hospital user information using the userId from auth store
  const { 
    data: hospitalUserResponse, 
    isLoading: hospitalUserLoading, 
    error: hospitalUserError 
  } = useHospitalUser(userId || '');
  
  // Get hospital ID from the response
  const hospitalId = hospitalUserResponse?.hospitalId; 
  
  // Finally, fetch departments using the hospital ID
  const { data: departmentsResponse, 
    isLoading: departmentsLoading, 
    error: departmentsError } = useDepartments(hospitalId || '');
  
  // State declarations
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState('morning');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [tokenNumber, setTokenNumber] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  
  // Fetch doctors for the selected department
  const { data: doctorsResponse, 
    isLoading: doctorsLoading, 
    error: doctorsError } = useDoctorsByDepartment(selectedDepartment);
  
  // Format selected date for API
  const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Fetch doctor slots for the selected doctor and date
  const { data: doctorSlotsResponse, 
    isLoading: doctorSlotsLoading, 
    error: doctorSlotsError } = useDoctorSlots(selectedDoctor?.id || '', formattedDate);

  // Fetch booked slots for the selected doctor and date
  const { data: bookedSlotsResponse, 
    isLoading: bookedSlotsLoading, 
    error: bookedSlotsError } = useBookedSlots(selectedDoctor?.id || '', formattedDate) as {
    data: BookedSlotsResponse | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  
  // Transform API departments to match the component interface
  const departments: Department[] = React.useMemo(() => {
    if (!departmentsResponse?.departments) return [];
    
    return departmentsResponse.departments.map((dept: ApiDepartment) => ({
      id: dept.departmentId,
      name: dept.departmentName,
      icon: getDepartmentIcon(dept.departmentName),
      doctors: [] // We'll need to fetch doctors separately or add them to the API response
    }));
  }, [departmentsResponse]);

  // Generate shifts from API response
  const availableShifts = React.useMemo(() => {
    if (!doctorSlotsResponse?.shiftInfo?.[0]?.shiftDayDetails) return [];
    
    return doctorSlotsResponse.shiftInfo[0].shiftDayDetails.map((shift, index) => ({
      id: shift.shiftName.toLowerCase(),
      label: shift.shiftName,
      time: `${shift.startTime.slice(0, 5)}-${shift.endTime.slice(0, 5)}`,
      icon: getShiftIcon(shift.shiftName),
      gradient: getShiftGradient(shift.shiftName),
      medical: getShiftMedicalType(shift.shiftName),
      startTime: shift.startTime,
      endTime: shift.endTime,
      slotDuration: shift.slotDurationInMinutes
    }));
  }, [doctorSlotsResponse]);

  // Set initial department when data loads
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departments[0].id);
    }
  }, [departments]);

  // Set initial doctor when doctors are loaded
  useEffect(() => {
    if (doctorsResponse?.doctors && doctorsResponse.doctors.length > 0 && !selectedDoctor) {
      const firstDoctor = doctorsResponse.doctors[0];
      const newDoctor = {
        id: firstDoctor.doctorId,
        name: firstDoctor.doctorName,       
        specialization: firstDoctor.specializations?.length > 0 ? firstDoctor.specializations.join(', ') : 'General',
        department: selectedDepartment,
        is_available: true
      };
      handleDoctorSelect(newDoctor);
    }
  }, [doctorsResponse, selectedDepartment]);

  // Function to check if a doctor is on time-off for the selected date
  const isDoctorOnTimeOff = (doctorId: string): boolean => {
    if (!doctorSlotsResponse || doctorSlotsResponse.doctorId !== doctorId) {
      return false;
    }
    return doctorSlotsResponse.isTimeOff;
  };

  // Set initial shift when shifts are loaded
  useEffect(() => {
    if (availableShifts.length > 0 && !selectedShift) {
      setSelectedShift(availableShifts[0].id);
    }
  }, [availableShifts]);

  // Generate time slots from API response
  React.useEffect(() => {
    if (selectedDoctor && doctorSlotsResponse) {
      // Check if doctor is on time-off
      if (doctorSlotsResponse.isTimeOff) {
        // Clear time slots when doctor is on time-off
        setTimeSlots([]);
        return;
      }
      
      // Generate slots if doctor is available and has shift info
      if (doctorSlotsResponse.shiftInfo?.[0]?.shiftDayDetails) {
        const shiftDayDetails = doctorSlotsResponse.shiftInfo[0].shiftDayDetails;
        const generatedSlots = generateTimeSlotsFromShiftInfo(shiftDayDetails, selectedDoctor.id, formattedDate);
        
        // Convert GeneratedTimeSlot to TimeSlot with slot duration
        let timeSlotsWithDuration: TimeSlot[] = generatedSlots.map(slot => {
          const shiftDetail = shiftDayDetails.find(shift => shift.shiftName === slot.shiftName);
          return {
            ...slot,
            slotDurationInMinutes: shiftDetail?.slotDurationInMinutes || 10,
            shiftName: slot.shiftName
          };
        });
        
        // Mark booked slots as unavailable if booked slots data is available
        if (bookedSlotsResponse?.bookedSlots) {
          timeSlotsWithDuration = timeSlotsWithDuration.map(slot => {
            const slotTime = slot.time + ':00'; // Convert "08:30" to "08:30:00" to match API format
            const isBooked = bookedSlotsResponse.bookedSlots.includes(slotTime);
            return {
              ...slot,
              isBooked: isBooked || slot.isBooked, // Mark as booked if API shows it's booked OR if it was already locally booked
              is_available: !(isBooked || slot.isBooked)
            };
          });
        }
        
        console.log('Generated time slots:', timeSlotsWithDuration.map(slot => ({
          id: slot.id,
          time: slot.time,
          date: slot.date,
          shiftName: slot.shiftName
        })));
        setTimeSlots(timeSlotsWithDuration);
      } else {
        // Fallback to old generation method if no API data
        const dateStr = selectedDate.toISOString().split('T')[0];
        setTimeSlots(generateTimeSlots(selectedDoctor.id, dateStr));
      }
    }
  }, [selectedDoctor, selectedDate, doctorSlotsResponse, bookedSlotsResponse, formattedDate]);

  // Show authentication required message if user is not authenticated
  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('appointmentBooking.authenticationRequired')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('appointmentBooking.authenticationMessage')}
          </p>
        </div>
      </div>
    );
  }
  
  // Show error if hospital user data is not available
  if (hospitalUserError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('appointmentBooking.failedToLoadHospital')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {hospitalUserError instanceof Error ? hospitalUserError.message : t('appointmentBooking.errorOccurred')}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('appointmentBooking.tryAgain')}
          </button>
        </div>
      </div>
    );
  }
  
  // Show loading if hospital user data is loading
  if (hospitalUserLoading || !hospitalId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('appointmentBooking.loadingHospitalInfo')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('appointmentBooking.loadingHospitalMessage')}
          </p>
        </div>
      </div>
    );
  }

  const selectedDepartmentData = departments.find(d => d.id === selectedDepartment);
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const handleDepartmentSelect = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (department) {
      setSelectedDepartment(departmentId);
      // Clear selected doctor when department changes
      setSelectedDoctor(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isBooked) {
      console.log('Selected slot:', {
        id: slot.id,
        date: slot.date,
        time: slot.time,
        shiftName: slot.shiftName
      });
      setSelectedSlot(slot);
      setShowPatientForm(true);
    }
  };



  const handleBookingComplete = (patientInfo: any) => {
    console.log('handleBookingComplete received:', patientInfo);
    setPatientData(patientInfo);
    // Use the appointmentId and tokenNumber from the API response
    if (patientInfo.appointmentId) {
      setAppointmentId(patientInfo.appointmentId);
    }
    if (patientInfo.tokenNumber) {
      setTokenNumber(patientInfo.tokenNumber);
    }
    console.log('Setting patientData with patientId:', patientInfo.patientId);
    setShowPatientForm(false);
    setShowVitalsForm(true);
  };

  const handleVitalsComplete = (vitalsData: any) => {
    // Update the slot as booked with both patient and vitals data
    setTimeSlots(prev => prev.map(slot => 
      slot.id === selectedSlot?.id 
        ? { ...slot, isBooked: true, patientInfo: { ...patientData, vitals: vitalsData } }
        : slot
    ));
    
    // Refresh booked slots data to reflect the new booking
    if (selectedDoctor?.id && formattedDate) {
      queryClient.invalidateQueries({
        queryKey: ['bookedSlots', selectedDoctor.id, formattedDate]
      });
    }
    
    // Invalidate appointment details queries to refresh dashboard data
    queryClient.invalidateQueries({
      queryKey: ['appointmentDetails']
    });
    
    setShowVitalsForm(false);
    setShowSuccess(true);
    setSelectedSlot(null);
    setPatientData(null);
  };

  const handleVitalsSkip = () => {
    // Update the slot as booked with only patient data
    setTimeSlots(prev => prev.map(slot => 
      slot.id === selectedSlot?.id 
        ? { ...slot, isBooked: true, patientInfo: patientData }
        : slot
    ));
    
    // Refresh booked slots data to reflect the new booking
    if (selectedDoctor?.id && formattedDate) {
      queryClient.invalidateQueries({
        queryKey: ['bookedSlots', selectedDoctor.id, formattedDate]
      });
    }
    
    // Invalidate appointment details queries to refresh dashboard data
    queryClient.invalidateQueries({
      queryKey: ['appointmentDetails']
    });
    
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

  // Custom date selection handler that refreshes booked slots data
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Refresh booked slots data for the new date
    if (selectedDoctor?.id) {
      const newFormattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({
        queryKey: ['bookedSlots', selectedDoctor.id, newFormattedDate]
      });
    }
  };

  // Custom doctor selection handler that refreshes booked slots data
  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Refresh booked slots data for the new doctor
    if (formattedDate) {
      queryClient.invalidateQueries({
        queryKey: ['bookedSlots', doctor.id, formattedDate]
      });
    }
  };

  // Loading state
  if (hospitalUserLoading || departmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {hospitalUserLoading 
              ? t('appointmentBooking.loadingHospitalInfo')
              : t('appointmentBooking.loadingDepartments')
            }
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hospitalUserLoading 
              ? t('appointmentBooking.loadingHospitalMessage')
              : t('appointmentBooking.loadingDepartmentsMessage')
            }
          </p>
        </div>
      </div>
    );
  }



  if (hospitalUserError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Failed to Load Hospital Information</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {hospitalUserError instanceof Error ? hospitalUserError.message : 'An error occurred while loading hospital information'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (departmentsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('appointmentBooking.failedToLoadDepartments')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {departmentsError instanceof Error ? departmentsError.message : t('appointmentBooking.errorOccurredDepartments')}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('appointmentBooking.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <BookingSuccess 
        appointmentId={appointmentId}
        tokenNumber={tokenNumber}
        doctor={selectedDoctor!}
        date={selectedDate}
        timeSlot={selectedSlot}
        onBookAnother={() => {
          setShowSuccess(false);
          setSelectedSlot(null);
        }}
        onClose={() => {
          setShowSuccess(false);
          setSelectedSlot(null);
          // Refresh booked slots data to show updated status
          if (selectedDoctor?.id && formattedDate) {
            queryClient.invalidateQueries({
              queryKey: ['bookedSlots', selectedDoctor.id, formattedDate]
            });
          }
        }}
        open={showSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 transition-all duration-300">
      {/* Mobile-First Layout */}
      <div className="min-h-screen">
        {/* Mobile Header - Fixed Position */}
        <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-primary dark:text-primary">{t('appointmentBooking.title')}</h1>
              <div className="text-xs text-muted-foreground dark:text-gray-400">
                {format(selectedDate, 'MMM dd')}
              </div>
            </div>
            
            {/* Compact Selection Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Department Dropdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground dark:text-gray-400 mb-1 block">{t('appointmentBooking.department')}</label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder={t('appointmentBooking.department')} />
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
                <label className="text-xs font-medium text-muted-foreground dark:text-gray-400 mb-1 block">{t('appointmentBooking.doctor')}</label>
                <Select value={selectedDoctor?.id || ''} onValueChange={(value) => {
                  if (doctorsResponse?.doctors) {
                    const selectedApiDoctor = doctorsResponse.doctors.find(doc => doc.doctorId === value);
                    if (selectedApiDoctor && selectedDepartmentData) {
                      const newDoctor = {
                        id: selectedApiDoctor.doctorId,
                        name: selectedApiDoctor.doctorName,
                        department: selectedDepartmentData.name,
                        specialization: selectedApiDoctor.specializations?.length > 0 ? selectedApiDoctor.specializations.join(', ') : 'General'
                      };
                      handleDoctorSelect(newDoctor);
                    }
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder={doctorsLoading ? t('appointmentBooking.loadingDoctors') : t('appointmentBooking.selectDoctor')} />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {doctorsLoading ? (
                      <SelectItem value="loading" disabled className="text-xs">
                        {t('appointmentBooking.loadingDoctors')}
                      </SelectItem>
                    ) : doctorsError ? (
                      <SelectItem value="error" disabled className="text-xs">
                        {t('appointmentBooking.errorLoadingDoctors')}
                      </SelectItem>
                    ) : doctorsResponse?.doctors && doctorsResponse.doctors.length > 0 ? (
                      doctorsResponse.doctors.map((doctor) => (
                        <SelectItem key={doctor.doctorId} value={doctor.doctorId} className="text-xs">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{doctor.doctorName}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {doctor.qualifications?.length > 0 ? doctor.qualifications.join(', ') : 'MBBS'}
                                </div>
                                <div className="text-xs text-blue-600 truncate">
                                  {doctor.specializations?.length > 0 ? doctor.specializations.join(', ') : 'General'}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {isDoctorOnTimeOff(doctor.doctorId) ? t('appointmentBooking.timeOff') : t('appointmentBooking.available')}
                                </div>
                            </div>
                            {isDoctorOnTimeOff(doctor.doctorId) && (
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 ml-2"></div>
                            )}
                        </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-doctors" disabled className="text-xs">
                        {t('appointmentBooking.noDoctorsAvailable')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                {t('appointmentBooking.departmentSelection')}
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
                    <SelectValue placeholder={t('appointmentBooking.moreDepartments')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg z-50">
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
                <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  👩‍⚕️ Available Doctors
                </h3>
                <div className="space-y-2">
                  {doctorsLoading ? (
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                      Loading doctors...
                    </div>
                  ) : doctorsError ? (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-center text-xs text-red-500">
                      Error loading doctors
                    </div>
                  ) : doctorsResponse?.doctors && doctorsResponse.doctors.length > 0 ? (
                    doctorsResponse.doctors.map((doctor) => (
                    <button
                        key={doctor.doctorId}
                        onClick={() => {
                          const newDoctor = {
                            id: doctor.doctorId,
                            name: doctor.doctorName,
                            department: selectedDepartmentData?.name || '',
                            specialization: doctor.specializations?.length > 0 ? doctor.specializations.join(', ') : 'General'
                          };
                          handleDoctorSelect(newDoctor);
                        }}
                      className={`w-full p-3 rounded-lg border text-left transition-all text-xs relative ${
                          selectedDoctor?.id === doctor.doctorId
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-sm'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                        <div className="font-medium text-blue-600 text-sm">{doctor.doctorName}</div>
                        <div className="text-xs text-gray-600 mb-1">
                          {doctor.qualifications?.length > 0 ? doctor.qualifications.join(', ') : 'MBBS'}
                        </div>
                        <div className="text-xs text-blue-600 mb-1">
                          {doctor.specializations?.length > 0 ? doctor.specializations.join(', ') : 'General'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isDoctorOnTimeOff(doctor.doctorId) ? 'Time Off' : 'Available'}
                        </div>
                        {isDoctorOnTimeOff(doctor.doctorId) && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                    </button>
                    ))
                  ) : (
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                      No doctors available
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="border-t pt-4 mt-4">
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Time Off</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-3 lg:p-4 overflow-y-auto pb-safe">
              <div className="max-w-4xl mx-auto">
                {/* Desktop Header - Compact */}
                <div className="hidden lg:block mb-3">
                  <h1 className="text-xl font-bold text-foreground dark:text-white mb-1">Schedule Appointment</h1>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Selected: <span className="font-semibold text-primary">{selectedDoctor?.name || 'No doctor selected'}</span>
                    <span className="text-muted-foreground/50"> • </span>
                    <span>{selectedDoctor?.specialization || 'Select a department first'}</span>
                  </p>
                </div>

                {/* Date Selection with Calendar - Compact */}
                <div className="mb-3">
                  <h2 className="text-xs font-semibold mb-2 flex items-center gap-1 text-foreground dark:text-white">
                    📅 Select Date
                  </h2>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const isToday = i === 0;
                      const isSelected = selectedDate.toDateString() === date.toDateString();
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleDateSelect(date)}
                          className={`px-2 py-1.5 rounded-md border text-center min-w-[60px] lg:min-w-[70px] flex-shrink-0 transition-all text-xs ${
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
                        <button className="px-2 py-1.5 rounded-md border border-dashed border-border bg-muted hover:bg-accent text-center min-w-[60px] lg:min-w-[70px] text-xs flex-shrink-0 transition-all hover:scale-105">
                          <CalendarIcon className="h-3 w-3 mx-auto text-muted-foreground" />
                          <div className="mt-0.5 text-muted-foreground">Other</div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && handleDateSelect(date)}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Medical-Appropriate Shift Selection - Compact */}
                <div className="mb-3">
                  <h2 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    ⏰ Select Time Shift
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {availableShifts.length > 0 ? (
                      availableShifts.map((shift) => (
                      <button
                        key={shift.id}
                        onClick={() => setSelectedShift(shift.id)}
                        className={`p-2 rounded-md border text-center transition-all text-xs shadow-sm animate-scale-in ${
                          selectedShift === shift.id
                            ? `bg-gradient-to-r ${shift.gradient} text-white border-transparent shadow-md scale-105`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover-scale'
                        }`}
                      >
                        <div className="text-sm mb-0.5">{shift.icon}</div>
                        <div className="font-medium text-xs">{shift.label}</div>
                        <div className={`text-xs mt-0.5 ${
                          selectedShift === shift.id ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {shift.time}
                        </div>
                      </button>
                      ))
                                         ) : (
                       <div className="col-span-full text-center py-4 text-gray-500">
                         No shifts available for this doctor
                       </div>
                     )}
                  </div>
                </div>

                {/* Time Slots - Ultra-Responsive Grid - Compact */}
                <div>
                  <h2 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    🕐 Available Time Slots
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {timeSlots.filter(slot => {
                        const selectedShiftData = availableShifts.find(s => s.id === selectedShift);
                        if (!selectedShiftData) return true;
                        
                        const slotHour = parseInt(slot.time.split(':')[0]);
                        const startHour = parseInt(selectedShiftData.startTime.split(':')[0]);
                        const endHour = parseInt(selectedShiftData.endTime.split(':')[0]);
                        
                        return slotHour >= startHour && slotHour < endHour;
                      }).filter(slot => !slot.isBooked).length} Available
                    </span>
                  </h2>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-13 gap-1.5">
                    {timeSlots.length === 0 && doctorSlotsResponse?.isTimeOff ? (
                      <div className="col-span-full text-center py-8">
                        <div className="text-red-500 text-4xl mb-3">🚫</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          No time slots available - Doctor is on time off
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Please select a different date or doctor
                        </p>
                      </div>
                    ) : timeSlots
                      .filter(slot => {
                        const selectedShiftData = availableShifts.find(s => s.id === selectedShift);
                        if (!selectedShiftData) return true;
                        
                        const slotHour = parseInt(slot.time.split(':')[0]);
                        const startHour = parseInt(selectedShiftData.startTime.split(':')[0]);
                        const endHour = parseInt(selectedShiftData.endTime.split(':')[0]);
                        
                        return slotHour >= startHour && slotHour < endHour;
                      })
                      .map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => !slot.isBooked && handleSlotSelect(slot)}
                        disabled={slot.isBooked}
                        className={`p-1.5 rounded-md border text-center transition-all text-xs min-h-[45px] flex flex-col justify-center shadow-sm hover:shadow-md animate-fade-in ${
                          slot.isBooked
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-not-allowed opacity-60'
                            : selectedSlot?.id === slot.id
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-br from-teal-50 to-emerald-100 border-teal-200 hover:from-teal-100 hover:to-emerald-200 hover:border-teal-300 hover-scale'
                        }`}
                      >
                        <div className={`font-bold text-xs mb-0.5 ${
                          selectedSlot?.id === slot.id ? 'text-white' : slot.isBooked ? 'text-red-700' : 'text-teal-700'
                        }`}>
                          {slot.time}
                        </div>
                        <div className={`text-xs px-1 py-0.5 rounded-full font-medium ${
                          slot.isBooked
                            ? 'bg-red-200 text-red-800'
                            : selectedSlot?.id === slot.id
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-200 text-teal-800'
                        }`}>
                          {slot.isBooked ? '❌' : selectedSlot?.id === slot.id ? '✅' : '✓'}
                        </div>
                        {slot.isBooked && (
                          <div className="flex justify-center gap-0.5 mt-0.5 opacity-60">
                            <span className="text-xs">📋</span>
                            <span className="text-xs">✏️</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Time-Off Message */}
                  {doctorSlotsResponse?.isTimeOff && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                            <span className="text-red-600 dark:text-red-400 text-lg">🚫</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                            Doctor Unavailable - Time Off
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                            {doctorSlotsResponse.timeOffReason || "The doctor is not available on this date."}
                          </p>
                          <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-800/30 p-2 rounded border border-red-200 dark:border-red-700">
                            <strong>What you can do:</strong>
                            <ul className="mt-1 space-y-1">
                              <li>• Select a different date</li>
                              <li>• Choose another doctor from the same department</li>
                              <li>• Contact the hospital for emergency appointments</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booked Slots Loading/Error Messages */}
                  {bookedSlotsLoading && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Loading booked slots information...</span>
                      </div>
                    </div>
                  )}

                  {bookedSlotsError && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm">Unable to load external booking information. Some slots may appear available but could be booked externally.</span>
                      </div>
                    </div>
                  )}



                  {/* Legend - Compact */}
                  <div className="mt-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Slot Types:</div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-teal-200 rounded border border-teal-300"></div>
                        <span className="text-gray-600 dark:text-gray-400">Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-200 rounded border border-red-300"></div>
                        <span className="text-gray-600 dark:text-gray-400">Booked</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded border border-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-400">Selected</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      💡 Tap any available slot to book an appointment.
                    </div>
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
          hospitalId={hospitalId}
          onSubmit={handleBookingComplete}
          onCancel={() => {
            setShowPatientForm(false);
            setSelectedSlot(null);
          }}
        />
      )}

      {/* Vitals Form Modal */}
      {showVitalsForm && patientData && (
        <>
          {console.log('Rendering VitalsForm with:', {
            patientName: patientData.name,
            appointmentId: appointmentId,
            patientId: patientData.patientId
          })}
          <VitalsForm
            patientName={patientData.name}
            appointmentId={appointmentId}
            patientId={patientData.patientId}
            onSubmit={handleVitalsComplete}
            onCancel={handleVitalsSkip}
          />
        </>
      )}


    </div>
  );
};