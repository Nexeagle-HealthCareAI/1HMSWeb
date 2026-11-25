import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format, isSameDay } from 'date-fns';
import { CalendarIcon, Stethoscope, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PatientForm } from './PatientForm';
import { VitalsForm } from './VitalsForm';
import { TokenPrintModal } from './TokenPrintModal';
import { BookingDoctorTile } from './BookingDoctorTile';
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
// F7: department and doctor choice lives in BookingDoctorTile (Top doctors, department chips, A to Z doctor list).

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

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// F9: the first free slot of a doctor's day. For today a slot counts only while it has not ended yet
// (a free slot that is running right now can be given; earlier ones never are). For other dates it is
// simply the first free slot. 'passed' = free slots exist today but all have ended; 'full' = none free.
const pickFirstFreeSlot = (
  slotsResponse: any,
  bookedResponse: any,
  doctorId: string,
  dateStr: string,
  now: Date,
): { slot: PopupSlot | null; reason: '' | 'leave' | 'full' | 'passed' } => {
  if (slotsResponse?.isTimeOff) return { slot: null, reason: 'leave' };
  const shiftDayDetails = slotsResponse?.shiftInfo?.[0]?.shiftDayDetails;
  let slots: PopupSlot[];
  if (shiftDayDetails && shiftDayDetails.length > 0) {
    slots = generateTimeSlotsFromShiftInfo(shiftDayDetails, doctorId, dateStr).map((s: any) => ({
      ...s,
      slotDurationInMinutes: shiftDayDetails.find((shift: any) => shift.shiftName === s.shiftName)?.slotDurationInMinutes || 10,
    }));
  } else {
    slots = FALLBACK_TIMES.map((time) => ({
      id: `${doctorId}-${dateStr}-${time}`,
      time,
      isBooked: false,
      doctorId,
      date: dateStr,
      slotDurationInMinutes: 10,
      shiftName: 'Default',
    }));
  }
  const booked: string[] = bookedResponse?.bookedSlots ?? [];
  const free = slots.filter((s) => !booked.includes(s.time + ':00') && !s.isBooked);
  if (free.length === 0) return { slot: null, reason: 'full' };
  if (dateStr !== format(now, 'yyyy-MM-dd')) return { slot: free[0], reason: '' };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const live = free.find((s) => toMinutes(s.time) + (s.slotDurationInMinutes || 10) > nowMin);
  return live ? { slot: live, reason: '' } : { slot: null, reason: 'passed' };
};

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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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

  // The first free slot for this doctor and date (see pickFirstFreeSlot). todayStuck = it is today and
  // nothing usable is left: the receptionist then chooses tomorrow or books today anyway.
  const [bookAnyway, setBookAnyway] = useState(false);
  useEffect(() => { setBookAnyway(false); }, [doctor?.id, dateStr]);

  const { slot, blockedReason, todayStuck } = useMemo<{ slot: PopupSlot | null; blockedReason: string; todayStuck: boolean }>(() => {
    const none = (blockedReason: string) => ({ slot: null, blockedReason, todayStuck: false });
    if (doctorsLoading) return none(t('bookingPopup.loading', { defaultValue: 'Loading…' }));
    if (!departmentId || doctors.length === 0) {
      return none(t('bookingPopup.noDoctors', { defaultValue: 'No doctors available in this department.' }));
    }
    if (!doctor) return none(t('bookingPopup.chooseDoctor', { defaultValue: 'Choose a doctor.' }));
    if (slotsLoading || bookedLoading || slotsFetching || bookedFetching) return none(t('bookingPopup.findingSlot', { defaultValue: 'Finding the first free slot…' }));
    if (slotsError || !slotsResponse) {
      return none(t('bookingPopup.slotsError', { defaultValue: 'Could not load this doctor’s slots. Please try again.' }));
    }
    const r = pickFirstFreeSlot(slotsResponse, bookedResponse, doctor.id, dateStr, new Date());
    if (r.slot) return { slot: r.slot, blockedReason: '', todayStuck: false };
    if (r.reason === 'leave') return none(t('bookingPopup.onLeave', { defaultValue: 'This doctor is on leave on the chosen date.' }));
    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
    if (isToday) {
      return { slot: null, blockedReason: t('bookingPopup.noSlotToday', { defaultValue: 'No free slot left today for this doctor. Choose tomorrow or book today anyway.' }), todayStuck: true };
    }
    return none(t('bookingPopup.noFreeSlot', { defaultValue: 'No free slot left for this doctor on this date.' }));
  }, [doctor, doctors.length, doctorsLoading, departmentId, slotsResponse, slotsLoading, slotsFetching, slotsError, bookedResponse, bookedLoading, bookedFetching, dateStr, t]);

  // "Book today anyway": the doctor agrees to see the patient outside the slot list, so the time is the
  // current time rounded up to 5 minutes.
  const overflowSlot = useMemo<PopupSlot | null>(() => {
    if (!bookAnyway || !todayStuck || !doctor) return null;
    const now = new Date();
    const mins = Math.min(Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5, 23 * 60 + 59);
    const time = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    return { id: `${doctor.id}-${dateStr}-${time}-overflow`, time, isBooked: false, doctorId: doctor.id, date: dateStr, slotDurationInMinutes: 10, shiftName: 'Overflow' };
  }, [bookAnyway, todayStuck, doctor, dateStr]);

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

  // F8: chips for Today and the next 2 days; the calendar covers the rest, up to 90 days ahead.
  const quickDays = [0, 1, 2].map((n) => addDays(startOfToday, n));
  const lastBookableDay = addDays(startOfToday, 90);
  const pickedOutside = !quickDays.some((d) => isSameDay(d, date));

  const doctorDateTile = (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold text-base md:text-lg text-foreground dark:text-white flex items-center gap-2">
        <Stethoscope className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
        {t('bookingPopup.doctorAndDate', { defaultValue: 'Doctor and date' })}
      </h3>

      <BookingDoctorTile
        hospitalId={hospitalId}
        departments={departments}
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
        doctorId={doctor.id}
        onPickDoctor={(d) => {
          // Picking from "Top doctors" can be in another department: follow it so the slot lookups match.
          if (d.departmentId && d.departmentId !== departmentId) setDepartmentId(d.departmentId);
          setDoctor({ id: d.id, name: d.name, department: d.department, specialization: d.specialization, is_available: true });
        }}
      />

      <div className="space-y-1.5">
        <Label className="text-sm font-medium dark:text-gray-300">{t('bookingPopup.date', { defaultValue: 'Date' })}</Label>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('bookingPopup.date', { defaultValue: 'Date' })}>
          {quickDays.map((d, i) => {
            const on = isSameDay(d, date);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => { setDate(d); setCalendarOpen(false); }}
                className={`min-h-[52px] px-1 rounded-xl border flex flex-col items-center justify-center text-xs transition-colors ${on ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-foreground hover:border-brand-300 dark:bg-white/5 dark:border-white/10 dark:text-white'}`}
              >
                <span className="font-bold">{i === 0 ? t('bookingPopup.today', { defaultValue: 'Today' }) : format(d, 'EEE')}</span>
                <span>{format(d, 'd MMM')}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-expanded={calendarOpen}
            aria-pressed={pickedOutside || calendarOpen}
            aria-label={t('bookingPopup.pickDateAria', { defaultValue: 'Pick another date from the calendar' })}
            onClick={() => setCalendarOpen((o) => !o)}
            className={`min-h-[52px] px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${pickedOutside ? 'bg-brand-600 border-brand-600 text-white' : calendarOpen ? 'bg-brand-50 border-brand-400 text-brand-800 dark:bg-brand-900/30 dark:text-white' : 'bg-white border-gray-300 text-foreground hover:border-brand-300 dark:bg-white/5 dark:border-white/10 dark:text-white'}`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="font-bold">{pickedOutside ? format(date, 'EEE d MMM') : t('bookingPopup.pickDate', { defaultValue: 'Pick date' })}</span>
          </button>
        </div>
        {calendarOpen && (
          <div className="rounded-xl border border-border/60 bg-white dark:bg-white/5 p-2">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false); } }}
              disabled={(d) => d < startOfToday || d > lastBookableDay}
              initialFocus
              showOutsideDays={false}
              className="p-1 pointer-events-auto"
              classNames={{
                months: 'flex flex-col w-full',
                month: 'space-y-2 w-full',
                table: 'w-full border-collapse',
                head_row: 'flex w-full',
                head_cell: 'flex-1 text-muted-foreground font-normal text-xs',
                row: 'flex w-full mt-1',
                cell: 'flex-1 h-9 text-center text-sm p-0 relative',
                day: 'h-9 w-full rounded-lg p-0 font-normal text-sm hover:bg-muted aria-selected:opacity-100',
                day_selected: 'bg-brand-600 text-white hover:bg-brand-600 hover:text-white font-bold',
                day_today: 'font-bold text-brand-700',
                day_disabled: 'text-muted-foreground opacity-40 hover:bg-transparent',
              }}
            />
          </div>
        )}
        {todayStuck && !bookAnyway && (
          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-3 flex flex-col gap-2" role="group" aria-label={t('bookingPopup.noSlotTodayTitle', { defaultValue: 'No free slot left today' })}>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{t('bookingPopup.noSlotTodayTitle', { defaultValue: 'No free slot left today' })}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setBookAnyway(true)}>
                {t('bookingPopup.bookTodayAnyway', { defaultValue: 'Book today anyway' })}
              </Button>
            </div>
          </div>
        )}
        {bookAnyway && overflowSlot && (
          <p className="mt-2 text-xs text-amber-900 dark:text-amber-200" role="status">
            {t('bookingPopup.anywayNote', { defaultValue: 'Booking today at {{time}}, outside the doctor’s slots.', time: overflowSlot.time })}{' '}
            <button type="button" className="underline font-semibold" onClick={() => setBookAnyway(false)}>{t('bookingPopup.undo', { defaultValue: 'Undo' })}</button>
          </p>
        )}
      </div>
    </div>
  );

  const popupSlot: PopupSlot = slot ?? overflowSlot ?? {
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
      submitBlockedReason={(overflowSlot ? '' : blockedReason) || undefined}
      onSubmit={handleBooked}
      onCancel={onClose}
    />
  );
};
