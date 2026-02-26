import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, User, Phone, Users, Stethoscope, ChevronDown, CalendarIcon, HelpCircle, ArrowLeft } from 'lucide-react';
import { DepartmentSidebar } from './DepartmentSidebar';
import { DateSelector } from './DateSelector';
import { ShiftTabs } from './ShiftTabs';
import { TimeSlots } from './TimeSlots';
import { PatientForm } from './PatientForm';
import { VitalsForm } from './VitalsForm';
import { TokenPrintModal } from './TokenPrintModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookingQuickGuide } from './BookingQuickGuide';
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
import { Department as ApiDepartment, ApiDoctor } from '../services/appointmentApi';
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

interface AppointmentBookingProps {
  refreshToken?: number;
  onBack?: () => void;
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
    'Night': 'from-gray-500 to-gray-600',
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

export const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ refreshToken, onBack }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const queryClient = useQueryClient();
  // Get userId and authentication status from Zustand auth store
  const userId = useAuthStore((state) => state.userId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storedHospitalId = useAuthStore((state) => state.hospitalId);

  // Fetch hospital user information using the userId from auth store
  const {
    data: hospitalUserResponse,
    isLoading: hospitalUserLoading,
    error: hospitalUserError,
    refetch: refetchHospitalUser
  } = useHospitalUser(userId || '');

  // Get hospital ID from the response
  const hospitalId = hospitalUserResponse?.hospitalId || storedHospitalId || '';
  const shouldShowHospitalLoader = hospitalUserLoading && !storedHospitalId;

  // Finally, fetch departments using the hospital ID
  const { data: departmentsResponse,
    isLoading: departmentsLoading,
    error: departmentsError,
    refetch: refetchDepartments } = useDepartments(hospitalId || '');

  // State declarations
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState('morning');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showTokenPrint, setShowTokenPrint] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [tokenNumber, setTokenNumber] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  const [showTimeSlotsLoading, setShowTimeSlotsLoading] = useState(false);
  const [showBookingQuickGuide, setShowBookingQuickGuide] = useState(false);
  const lastRefreshTokenRef = useRef<number | null>(null);

  // Fetch doctors for the selected department
  const { data: doctorsResponse,
    isLoading: doctorsLoading,
    error: doctorsError,
    refetch: refetchDoctors } = useDoctorsByDepartment(selectedDepartment, hospitalId);

  // Format selected date for API
  const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Fetch doctor slots for the selected doctor and date
  const { data: doctorSlotsResponse,
    isLoading: doctorSlotsLoading,
    error: doctorSlotsError,
    refetch: refetchDoctorSlots } = useDoctorSlots(selectedDoctor?.id || '', hospitalId, formattedDate);

  // Fetch booked slots for the selected doctor and date
  const { data: bookedSlotsResponse,
    isLoading: bookedSlotsLoading,
    error: bookedSlotsError,
    refetch: refetchBookedSlots } = useBookedSlots(selectedDoctor?.id || '', hospitalId, formattedDate);

  useEffect(() => {
    if (!refreshToken) return;
    if (lastRefreshTokenRef.current === refreshToken) return;
    lastRefreshTokenRef.current = refreshToken;

    if (userId) {
      refetchHospitalUser();
    }

    if (hospitalId) {
      refetchDepartments();
    }

    if (selectedDepartment && hospitalId) {
      refetchDoctors();
    }

    if (selectedDoctor?.id && hospitalId && formattedDate) {
      refetchDoctorSlots();
      refetchBookedSlots();
    }
  }, [
    refreshToken,
    userId,
    hospitalId,
    selectedDepartment,
    selectedDoctor?.id,
    formattedDate,
    refetchHospitalUser,
    refetchDepartments,
    refetchDoctors,
    refetchDoctorSlots,
    refetchBookedSlots,
  ]);

  useEffect(() => {
    if (!selectedDepartment || !hospitalId) {
      return;
    }

    refetchHospitalUser();
    refetchDepartments();
    refetchDoctors();
  }, [
    selectedDepartment,
    hospitalId,
    refetchHospitalUser,
    refetchDepartments,
    refetchDoctors,
  ]);

  useEffect(() => {
    if (!selectedDoctor?.id || !hospitalId || !formattedDate) {
      return;
    }

    refetchDoctorSlots();
    refetchBookedSlots();
  }, [
    selectedDoctor?.id,
    hospitalId,
    formattedDate,
    refetchDoctorSlots,
    refetchBookedSlots,
  ]);

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
        specialization: firstDoctor.specializations?.length > 0 ? firstDoctor.specializations.join(', ') : t('appointmentBooking.generalSpecialization'),
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
    let timer: NodeJS.Timeout;
    if (selectedDoctor && doctorSlotsResponse) {
      setShowTimeSlotsLoading(true);
      timer = setTimeout(() => {
        setShowTimeSlotsLoading(false);
      }, 1000);
      // Check if doctor is on time-off
      if (doctorSlotsResponse.isTimeOff) {
        setTimeSlots([]);
        return;
      }
      if (doctorSlotsResponse.shiftInfo?.[0]?.shiftDayDetails) {
        const shiftDayDetails = doctorSlotsResponse.shiftInfo[0].shiftDayDetails;
        const generatedSlots = generateTimeSlotsFromShiftInfo(shiftDayDetails, selectedDoctor.id, formattedDate);
        let timeSlotsWithDuration: TimeSlot[] = generatedSlots.map(slot => {
          const shiftDetail = shiftDayDetails.find(shift => shift.shiftName === slot.shiftName);
          return {
            ...slot,
            slotDurationInMinutes: shiftDetail?.slotDurationInMinutes || 10,
            shiftName: slot.shiftName
          };
        });
        if (bookedSlotsResponse?.bookedSlots) {
          timeSlotsWithDuration = timeSlotsWithDuration.map(slot => {
            const slotTime = slot.time + ':00';
            const isBooked = bookedSlotsResponse.bookedSlots.includes(slotTime);
            return {
              ...slot,
              isBooked: isBooked || slot.isBooked,
              is_available: !(isBooked || slot.isBooked)
            };
          });
        }
        setTimeSlots(timeSlotsWithDuration);
      } else {
        const dateStr = selectedDate.toISOString().split('T')[0];
        setTimeSlots(generateTimeSlots(selectedDoctor.id, dateStr));
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedDoctor, selectedDate, doctorSlotsResponse, bookedSlotsResponse, formattedDate]);

  // Show authentication required message if user is not authenticated
  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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
  if (hospitalUserError && !storedHospitalId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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
  if (shouldShowHospitalLoader || !hospitalId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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
    setShowTokenPrint(true);
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
    setShowTokenPrint(true);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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

  if (departmentsError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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

  if (!departmentsLoading && departments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🏥</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            {t('appointmentBooking.noDepartmentsAvailable')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('appointmentBooking.noDepartmentsAvailableMessage')}
          </p>
        </div>
      </div>
    );
  }

  if (showTokenPrint) {
    return (
      <TokenPrintModal
        open={showTokenPrint}
        onOpenChange={(open) => {
          setShowTokenPrint(open);
          if (!open) {
            setSelectedSlot(null);
            setPatientData(null);
            setAppointmentId('');
            setTokenNumber('');
            // Refresh booked slots data to show updated status
            if (selectedDoctor?.id && formattedDate) {
              queryClient.invalidateQueries({
                queryKey: ['bookedSlots', selectedDoctor.id, formattedDate]
              });
            }
          }
        }}
        tokenData={{
          tokenNumber: tokenNumber,
          patientName: patientData?.name || '',
          patientId: patientData?.patientId || '',
          doctorName: selectedDoctor?.name || '',
          appointmentDate: selectedDate.toISOString(),
          department: selectedDoctor?.department
        }}
      />
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 transition-all duration-300">



      <div className="flex flex-col lg:flex-row items-stretch">

        {/* ═══════════════════════════ SIDEBAR ═══════════════════════════ */}
        <div className="hidden lg:flex flex-col w-80 flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 shadow-sm h-full">


          <div className="flex-1 p-4 space-y-5">
            {/* Department Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px]">🏢</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('appointmentBooking.departmentSelection')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {departments.slice(0, 4).map((dept, i) => (
                  <motion.button
                    key={dept.id}
                    onClick={() => handleDepartmentSelect(dept.id)}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-semibold ${selectedDepartment === dept.id
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
                  >
                    <dept.icon className="h-5 w-5" />
                    <span className="leading-tight">{dept.name}</span>
                  </motion.button>
                ))}
              </div>
              {departments.length > 4 && (
                <div className="mt-2">
                  <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder={t('appointmentBooking.moreDepartments')} />
                    </SelectTrigger>
                    <SelectContent className="z-50">
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
              )}
            </div>

            {/* Doctor Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-[10px]">👨‍⚕️</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{t('appointmentBooking.availableDoctors')}</span>
              </div>
              <div className="space-y-2">
                {doctorsLoading ? (
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 animate-pulse">
                    {t('appointmentBooking.loadingDoctors')}
                  </div>
                ) : doctorsError ? (
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-center text-xs text-red-400">
                    {t('appointmentBooking.errorLoadingDoctors')}
                  </div>
                ) : doctorsResponse?.doctors?.length ? (
                  doctorsResponse.doctors.map((doctor) => (
                    <motion.button
                      key={doctor.doctorId}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        handleDoctorSelect({
                          id: doctor.doctorId,
                          name: doctor.doctorName,
                          department: selectedDepartmentData?.name || '',
                          specialization: doctor.specializations?.length > 0 ? doctor.specializations.join(', ') : t('appointmentBooking.generalSpecialization')
                        });
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all text-xs relative overflow-hidden ${selectedDoctor?.id === doctor.doctorId
                        ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/50 dark:bg-gradient-to-r dark:from-indigo-500/20 dark:to-blue-500/10 shadow-sm'
                        : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-400/30 hover:bg-indigo-50/30 dark:hover:bg-white/10'}`}
                    >
                      {selectedDoctor?.id === doctor.doctorId && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/5 pointer-events-none" />
                      )}
                      <div className="flex items-center gap-2 relative z-10">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${selectedDoctor?.id === doctor.doctorId ? 'bg-indigo-100 dark:bg-indigo-500/30' : 'bg-gray-100 dark:bg-white/10'}`}>
                          👨‍⚕️
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-bold leading-tight truncate ${selectedDoctor?.id === doctor.doctorId ? 'text-indigo-700 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{doctor.doctorName}</div>
                          <div className="text-gray-400 text-[10px] truncate">{doctor.specializations?.join(', ') || t('appointmentBooking.generalSpecialization')}</div>
                          {isDoctorOnTimeOff(doctor.doctorId) && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                              🚫 On Leave
                            </span>
                          )}
                        </div>
                        {selectedDoctor?.id === doctor.doctorId && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500">
                    {t('appointmentBooking.noDoctorsAvailable')}
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Legend</div>
              <div className="space-y-1.5">
                {[
                  { color: 'bg-emerald-400', label: t('appointmentBooking.availableLegend') },
                  { color: 'bg-red-400', label: t('appointmentBooking.bookedLegend') },
                  { color: 'bg-blue-400', label: t('appointmentBooking.selectedLegend') },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer — Help button */}
          <div className="p-4 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={() => setShowBookingQuickGuide(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all text-xs font-medium"
            >
              <HelpCircle className="h-4 w-4 text-blue-400" />
              {t('bookingGuide.button', 'Booking Help')}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════ MAIN CONTENT ═══════════════════════════ */}
        <div className="flex-1 min-w-0">
          <div className="px-4 pb-6 pt-4 lg:px-6">
            <div className="max-w-4xl mx-auto space-y-5">

              {/* Selected Doctor Status */}
              {selectedDoctor && (
                <div className="hidden lg:flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('appointmentBooking.selectedLabel')}{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-300">{selectedDoctor.name}</span>
                    {selectedDoctor.specialization && <span className="text-gray-400"> • {selectedDoctor.specialization}</span>}
                  </p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Doctor Selected</span>
                  </motion.div>
                </div>
              )}


              {/* ── DATE SELECTION ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">{t('appointmentBooking.dateSelection')}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isToday = i === 0;
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    return (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => handleDateSelect(date)}
                        className={`flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-[64px] flex-shrink-0 transition-all text-xs font-semibold ${isSelected
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-transparent shadow-lg shadow-cyan-500/30 scale-105'
                          : 'bg-card border-border hover:border-cyan-400/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-cyan-50 dark:hover:bg-white/5'}`}
                      >
                        <div className="font-black text-[11px] uppercase tracking-wide">
                          {isToday ? 'Today' : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
                        </div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)}
                        </div>
                        {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-cyan-400 mt-1" />}
                      </motion.button>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.button whileTap={{ scale: 0.93 }} className="flex flex-col items-center px-3 py-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-center min-w-[64px] flex-shrink-0 transition-all text-gray-400 hover:text-white">
                        <CalendarIcon className="h-4 w-4 mx-auto mb-0.5" />
                        <div className="text-[10px] font-semibold">{t('appointmentBooking.otherDate')}</div>
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50 bg-slate-800 border-white/20" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && handleDateSelect(date)}
                        disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        className="p-3 pointer-events-auto text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </motion.div>

              {/* ── SHIFT SELECTION ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{t('appointmentBooking.shiftSelection')}</span>
                </div>
                {availableShifts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableShifts.map((shift) => (
                      <motion.button
                        key={shift.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedShift(shift.id)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-semibold overflow-hidden relative ${selectedShift === shift.id
                          ? `bg-gradient-to-br ${shift.gradient} text-white border-transparent shadow-lg`
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      >
                        <div className="text-xl mb-1">{shift.icon}</div>
                        <div className="font-black">{shift.label}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedShift === shift.id ? 'text-white/80' : 'text-gray-500'}`}>{shift.time}</div>
                        {selectedShift === shift.id && (
                          <motion.div
                            layoutId="shiftActive"
                            className="absolute inset-0 bg-white/10 rounded-xl pointer-events-none"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {t('appointmentBooking.noShiftsAvailable')}
                  </div>
                )}
              </motion.div>

              {/* ── TIME SLOTS ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('appointmentBooking.timeSlots')}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-300">
                    {timeSlots.filter(slot => {
                      const selectedShiftData = availableShifts.find(s => s.id === selectedShift);
                      if (!selectedShiftData) return true;
                      const slotHour = parseInt(slot.time.split(':')[0]);
                      const startHour = parseInt(selectedShiftData.startTime.split(':')[0]);
                      const endHour = parseInt(selectedShiftData.endTime.split(':')[0]);
                      return slotHour >= startHour && slotHour < endHour;
                    }).filter(s => !s.isBooked).length} Available
                  </div>
                </div>

                {showTimeSlotsLoading ? (
                  <div className="text-center py-10">
                    <div className="relative w-12 h-12 mx-auto mb-3">
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
                    </div>
                    <p className="text-sm font-semibold text-blue-300">{t('appointmentBooking.loadingSlots')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('appointmentBooking.loadingSlotsMessage')}</p>
                  </div>
                ) : timeSlots.length === 0 && doctorSlotsResponse?.isTimeOff ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">🚫</div>
                    <p className="text-sm font-bold text-red-300">{t('appointmentBooking.noSlotsAvailableTimeOff')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('appointmentBooking.pleaseSelectDifferentDate')}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
                      <AnimatePresence>
                        {timeSlots
                          .filter(slot => {
                            const selectedShiftData = availableShifts.find(s => s.id === selectedShift);
                            if (!selectedShiftData) return true;
                            const slotHour = parseInt(slot.time.split(':')[0]);
                            const startHour = parseInt(selectedShiftData.startTime.split(':')[0]);
                            const endHour = parseInt(selectedShiftData.endTime.split(':')[0]);
                            return slotHour >= startHour && slotHour < endHour;
                          })
                          .map((slot, idx) => (
                            <motion.button
                              key={slot.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              whileTap={!slot.isBooked ? { scale: 0.9 } : {}}
                              onClick={() => !slot.isBooked && handleSlotSelect(slot)}
                              disabled={slot.isBooked}
                              className={`p-2 rounded-xl border text-center transition-all text-[11px] min-h-[52px] flex flex-col items-center justify-center font-bold shadow-sm ${slot.isBooked
                                ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-60 text-red-400 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
                                : selectedSlot?.id === slot.id
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/50 text-white shadow-xl shadow-blue-500/30 scale-110'
                                  : 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-100 text-emerald-700 hover:scale-105 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20 dark:text-emerald-300'}`}
                            >
                              <div className="font-black leading-tight">{slot.time}</div>
                              <div className="text-[9px] mt-0.5 opacity-80">
                                {slot.isBooked ? '✗' : selectedSlot?.id === slot.id ? '✓' : '○'}
                              </div>
                            </motion.button>
                          ))}
                      </AnimatePresence>
                    </div>

                    {/* Time-Off Warning */}
                    {doctorSlotsResponse?.isTimeOff && (
                      <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0">🚫</span>
                          <div>
                            <p className="text-sm font-bold text-red-300">{t('appointmentBooking.doctorUnavailable')}</p>
                            <p className="text-xs text-red-400/80 mt-0.5">{doctorSlotsResponse.timeOffReason || t('appointmentBooking.doctorUnavailableMessage')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booked Slots Status */}
                    {bookedSlotsLoading && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-blue-300 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="w-3 h-3 rounded-full border border-t-blue-400 animate-spin" />
                        {t('appointmentBooking.loadingBookedSlots')}
                      </div>
                    )}
                    {bookedSlotsError && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-yellow-300 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        ⚠️ {t('appointmentBooking.bookedSlotsError')}
                      </div>
                    )}

                    {/* Legend hint */}
                    <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-gray-500">
                      <span>🟢 Available</span>
                      <span>🔴 Booked</span>
                      <span>🔵 Selected</span>
                      <span className="text-gray-600">• Tap any slot to book</span>
                    </div>
                  </>
                )}
              </motion.div>

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
          {console.log('Rendering VitalsForm with:', { patientName: patientData.name, appointmentId, patientId: patientData.patientId })}
          <VitalsForm
            patientName={patientData.name}
            appointmentId={appointmentId}
            patientId={patientData.patientId}
            onSubmit={handleVitalsComplete}
            onCancel={handleVitalsSkip}
          />
        </>
      )}

      <BookingQuickGuide
        open={showBookingQuickGuide}
        onOpenChange={setShowBookingQuickGuide}
      />
    </div>
  );
};
