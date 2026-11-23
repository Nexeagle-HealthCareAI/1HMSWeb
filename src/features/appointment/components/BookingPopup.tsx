import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Stethoscope, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PatientForm } from './PatientForm';
import { VitalsForm } from './VitalsForm';
import { TokenPrintModal } from './TokenPrintModal';
import { useDepartments } from '../hooks/useDepartments';
import { useDoctorsByDepartment } from '../hooks/useDoctorsByDepartment';
import { useDoctorSlots } from '../hooks/useDoctorSlots';
import { useBookedSlots } from '../hooks/useBookedSlots';
import { generateTimeSlotsFromShiftInfo } from '../utils/slotGenerator';

// F6: the Book Appointment pop-up on the appointment board. One centered pop-up with the ABHA strip
// on top and three tiles (Doctor and date, Patient, Address). The patient and address tiles are the
// existing PatientForm; this component supplies the first tile and assigns the time itself:
// the first free slot of the chosen doctor on the chosen date (no slot grid, no time dropdown).
// After a booking the existing steps follow, as before: vitals, then the print token screen.

interface PopupDoctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  is_available?: boolean;
}

interface PopupSlot {
  id: string;
  time: string;
  isBooked: boolean;
  doctorId: string;
  date: string;
  slotDurationInMinutes?: number;
  shiftName?: string;
}

// Same fallback grid the booking page uses when a doctor has no shift set up for the day.
const FALLBACK_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
];

interface BookingPopupProps {
  hospitalId: string;
  onClose: () => void;
}

export const BookingPopup: React.FC<BookingPopupProps> = ({ hospitalId, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [departmentId, setDepartmentId] = useState('');
  const [doctor, setDoctor] = useState<PopupDoctor | null>(null);
  const [date, setDate] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  // After booking: vitals, then the print token screen (same order as the old booking page).
  const [stage, setStage] = useState<'form' | 'vitals' | 'token'>('form');
  const [booked, setBooked] = useState<{ patient: any; doctorName: string; department: string; date: string } | null>(null);

  // Local date, not toISOString(): after midnight in India that would read as the day before.
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: departmentsResponse, isLoading: departmentsLoading, error: departmentsError } = useDepartments(hospitalId);
  const departments = departmentsResponse?.departments ?? [];
  const departmentName = departments.find((d) => d.departmentId === departmentId)?.departmentName || '';

  const { data: doctorsResponse, isLoading: doctorsLoading, error: doctorsError } = useDoctorsByDepartment(departmentId, hospitalId);
  const doctors = doctorsResponse?.doctors ?? [];

  const { data: slotsResponse, isLoading: slotsLoading, isFetching: slotsFetching, error: slotsError, refetch: refetchSlots } = useDoctorSlots(doctor?.id || '', hospitalId, dateStr);
  const { data: bookedResponse, isLoading: bookedLoading, isFetching: bookedFetching, refetch: refetchBooked } = useBookedSlots(doctor?.id || '', hospitalId, dateStr);

  // Always read fresh slots when the doctor or date changes: another receptionist may have booked
  // since the cached copy was taken, and the time is chosen for the user.
  useEffect(() => {
    if (doctor?.id && hospitalId) {
      refetchSlots();
      refetchBooked();
    }
  }, [doctor?.id, hospitalId, dateStr]);

  // First department, then the first doctor of the chosen department. The doctor is kept while the
  // department changes so a half-filled patient form is not lost; it is replaced once the new list loads.
  useEffect(() => {
    if (!departmentId && departments.length > 0) setDepartmentId(departments[0].departmentId);
  }, [departments, departmentId]);

  useEffect(() => {
    if (doctorsLoading || !departmentId || doctors.length === 0) return;
    if (!doctor || !doctors.some((d) => d.doctorId === doctor.id)) {
      const first = doctors[0];
      setDoctor({
        id: first.doctorId,
        name: first.doctorName,
        department: departmentName,
        specialization: first.specializations?.length > 0 ? first.specializations.join(', ') : t('appointmentBooking.generalSpecialization', { defaultValue: 'General' }),
        is_available: true,
      });
    }
  }, [doctors, doctorsLoading, departmentId, departmentName, doctor, t]);

  // The first free slot for this doctor and date. For today, slots that have already passed are
  // skipped when a later one is free.
  const { slot, blockedReason } = useMemo<{ slot: PopupSlot | null; blockedReason: string }>(() => {
    if (doctorsLoading) return { slot: null, blockedReason: t('bookingPopup.loading', { defaultValue: 'Loading…' }) };
    if (!departmentId || doctors.length === 0) {
      return { slot: null, blockedReason: t('bookingPopup.noDoctors', { defaultValue: 'No doctors available in this department.' }) };
    }
    if (!doctor) return { slot: null, blockedReason: t('bookingPopup.chooseDoctor', { defaultValue: 'Choose a doctor.' }) };
    if (slotsLoading || bookedLoading || slotsFetching || bookedFetching) return { slot: null, blockedReason: t('bookingPopup.findingSlot', { defaultValue: 'Finding the first free slot…' }) };
    if (slotsError || !slotsResponse) {
      return { slot: null, blockedReason: t('bookingPopup.slotsError', { defaultValue: 'Could not load this doctor’s slots. Please try again.' }) };
    }
    if (slotsResponse.isTimeOff) {
      return { slot: null, blockedReason: t('bookingPopup.onLeave', { defaultValue: 'This doctor is on leave on the chosen date.' }) };
    }

    const shiftDayDetails = slotsResponse.shiftInfo?.[0]?.shiftDayDetails;
    let slots: PopupSlot[];
    if (shiftDayDetails && shiftDayDetails.length > 0) {
      slots = generateTimeSlotsFromShiftInfo(shiftDayDetails, doctor.id, dateStr).map((s) => ({
        ...s,
        slotDurationInMinutes: shiftDayDetails.find((shift) => shift.shiftName === s.shiftName)?.slotDurationInMinutes || 10,
      }));
    } else {
      slots = FALLBACK_TIMES.map((time) => ({
        id: `${doctor.id}-${dateStr}-${time}`,
        time,
        isBooked: false,
        doctorId: doctor.id,
        date: dateStr,
        slotDurationInMinutes: 10,
        shiftName: 'Default',
      }));
    }

    const booked = bookedResponse?.bookedSlots ?? [];
    const free = slots.filter((s) => !booked.includes(s.time + ':00') && !s.isBooked);
    if (free.length === 0) {
      return { slot: null, blockedReason: t('bookingPopup.noFreeSlot', { defaultValue: 'No free slot left for this doctor on this date.' }) };
    }
    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
    const nowTime = format(new Date(), 'HH:mm');
    const pick = (isToday ? free.find((s) => s.time >= nowTime) : undefined) ?? free[0];
    return { slot: pick, blockedReason: '' };
  }, [doctor, doctors.length, doctorsLoading, departmentId, slotsResponse, slotsLoading, slotsFetching, slotsError, bookedResponse, bookedLoading, bookedFetching, dateStr, t]);

  const refreshAfterBooking = () => {
    queryClient.invalidateQueries({ queryKey: ['bookedSlots'] });
    queryClient.invalidateQueries({ queryKey: ['appointmentDetails'] });
  };

  const handleBooked = (patientInfo: any) => {
    setBooked({ patient: patientInfo, doctorName: doctor?.name || '', department: doctor?.department || '', date: dateStr });
    setStage('vitals');
  };

  const handleVitalsDone = () => {
    refreshAfterBooking();
    setStage('token');
  };

  if (stage === 'vitals' && booked) {
    return (
      <VitalsForm
        patientName={booked.patient.name}
        appointmentId={booked.patient.appointmentId}
        patientId={booked.patient.patientId}
        onSubmit={handleVitalsDone}
        onCancel={handleVitalsDone}
      />
    );
  }

  if (stage === 'token' && booked) {
    return (
      <TokenPrintModal
        open
        onOpenChange={(open) => {
          if (!open) {
            refreshAfterBooking();
            onClose();
          }
        }}
        tokenData={{
          tokenNumber: booked.patient.tokenNumber,
          patientName: booked.patient.name || '',
          patientId: booked.patient.patientId || '',
          doctorName: booked.doctorName,
          appointmentDate: new Date(booked.date).toISOString(),
          department: booked.department,
          age: booked.patient.age,
          ageUnit: booked.patient.ageUnit,
          gender: booked.patient.gender,
          referrerName: booked.patient.referrerName,
          referrerType: booked.patient.referrerType,
          guardianName: booked.patient.guardianName,
          guardianRelation: booked.patient.guardianRelation,
        }}
      />
    );
  }

  // Nothing to book into yet: hospital data is still loading, or there are no departments at all.
  if (!doctor) {
    const failed = !!departmentsError || !!doctorsError;
    const empty = !departmentsLoading && !failed && departments.length === 0;
    const noDoctors = !!departmentId && !doctorsLoading && !failed && doctors.length === 0;
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('bookingPopup.title', { defaultValue: 'Book Appointment' })}</DialogTitle>
            <DialogDescription>
              {failed
                ? t('bookingPopup.loadFailed', { defaultValue: 'Could not load departments and doctors. Please close and try again.' })
                : empty
                  ? t('appointmentBooking.noDepartmentsAvailableMessage', { defaultValue: 'No departments are set up yet.' })
                  : noDoctors
                    ? t('bookingPopup.noDoctors', { defaultValue: 'No doctors available in this department.' })
                    : t('bookingPopup.loading', { defaultValue: 'Loading…' })}
            </DialogDescription>
          </DialogHeader>
          {!failed && !empty && !noDoctors && (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('patientForm.actions.cancel', { defaultValue: 'Cancel' })}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const doctorDateTile = (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold text-base md:text-lg text-foreground dark:text-white flex items-center gap-2">
        <Stethoscope className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
        {t('bookingPopup.doctorAndDate', { defaultValue: 'Doctor and date' })}
      </h3>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium dark:text-gray-300">{t('bookingPopup.department', { defaultValue: 'Department' })}</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="h-10 bg-background" aria-label={t('bookingPopup.department', { defaultValue: 'Department' })}>
            <SelectValue placeholder={t('appointmentBooking.moreDepartments', { defaultValue: 'Select department' })} />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {departments.map((d) => (
              <SelectItem key={d.departmentId} value={d.departmentId}>{d.departmentName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium dark:text-gray-300">{t('bookingPopup.doctor', { defaultValue: 'Doctor' })}</Label>
        <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2" role="group" aria-label={t('bookingPopup.doctor', { defaultValue: 'Doctor' })}>
          {doctorsLoading ? (
            <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 animate-pulse">
              {t('appointmentBooking.loadingDoctors', { defaultValue: 'Loading doctors…' })}
            </div>
          ) : (
            doctors.map((d) => {
              const selected = doctor.id === d.doctorId;
              return (
                <button
                  key={d.doctorId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDoctor({
                    id: d.doctorId,
                    name: d.doctorName,
                    department: departmentName,
                    specialization: d.specializations?.length > 0 ? d.specializations.join(', ') : t('appointmentBooking.generalSpecialization', { defaultValue: 'General' }),
                    is_available: true,
                  })}
                  className={`w-full p-3 rounded-xl border text-left transition-all text-sm ${selected
                    ? 'border-brand-200 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10 shadow-sm'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 hover:border-brand-300 hover:bg-brand-50/30'}`}
                >
                  <div className="font-semibold text-foreground dark:text-white">{d.doctorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.specializations?.length > 0 ? d.specializations.join(', ') : t('appointmentBooking.generalSpecialization', { defaultValue: 'General' })}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium dark:text-gray-300">{t('bookingPopup.date', { defaultValue: 'Date' })}</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full h-10 justify-start gap-2 font-medium">
              <CalendarIcon className="h-4 w-4 text-brand-600" />
              {format(date, 'EEE, d MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100]" align="start">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false); } }}
              disabled={(d) => d < startOfToday}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          {t('bookingPopup.autoTime', { defaultValue: 'Time is set automatically to the first free slot.' })}
        </p>
      </div>
    </div>
  );

  const popupSlot: PopupSlot = slot ?? {
    id: 'no-slot',
    time: '',
    isBooked: true,
    doctorId: doctor.id,
    date: dateStr,
  };

  return (
    <PatientForm
      selectedSlot={popupSlot}
      doctor={doctor}
      hospitalId={hospitalId}
      doctorDateTile={doctorDateTile}
      submitBlockedReason={blockedReason || undefined}
      onSubmit={handleBooked}
      onCancel={onClose}
    />
  );
};
