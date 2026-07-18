import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Check, Clock, Loader2, User, X, Mail, Users, FileText, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useDoctorSlots } from '../hooks/useDoctorSlots';
import { useBookedSlots } from '../hooks/useBookedSlots';
import { generateTimeSlotsFromShiftInfo, type GeneratedTimeSlot } from '../utils/slotGenerator';
import { appointmentApi, type AppointmentDetail } from '../services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ConfirmPreAppointmentDialogProps {
  appointment: AppointmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SlotWithDuration extends GeneratedTimeSlot {
  slotDurationInMinutes: number;
}

// How many days forward to search for an open slot before giving up and asking the receptionist
// to pick manually — a doctor booked solid for two straight weeks is a data problem, not something
// to keep silently paging through.
const MAX_SEARCH_DAYS = 13;

type AutoPickPhase = 'searching' | 'found' | 'exhausted' | 'manual';

export const ConfirmPreAppointmentDialog: React.FC<ConfirmPreAppointmentDialogProps> = ({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();
  const queryClient = useQueryClient();

  const initialDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const preferred = appointment.startAt ? new Date(appointment.startAt) : today;
    return preferred >= today ? preferred : today;
  }, [appointment.startAt]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [autoPickPhase, setAutoPickPhase] = useState<AutoPickPhase>('searching');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ tokenNumber?: number; status?: string } | null>(null);

  const isSearching = autoPickPhase === 'searching';
  const isManual = autoPickPhase === 'manual';
  const isExhausted = autoPickPhase === 'exhausted';

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  // Reuse the same slot-fetching hooks the normal booking flow (AppointmentBooking) uses,
  // so this shows genuinely open slots for the doctor+date.
  const { data: doctorSlotsResponse, isLoading: doctorSlotsLoading } = useDoctorSlots(
    appointment.doctorId,
    hospitalId || '',
    formattedDate
  );
  const { data: bookedSlotsResponse, isLoading: bookedSlotsLoading } = useBookedSlots(
    appointment.doctorId,
    hospitalId || '',
    formattedDate,
    // This appointment's own (still-uncommitted) preferred StartAt would otherwise show as
    // "booked" against itself — see DoctorBookedSlotsHandler.cs — which was silently defeating
    // the exact-preferred-time auto-match below on every single confirmation, always falling
    // through to a different slot even when the patient's own requested time was genuinely free.
    appointment.appointmentId
  );

  // Reset state whenever the drawer opens for a (possibly different) appointment.
  useEffect(() => {
    if (open) {
      setSelectedDate(initialDate);
      setSelectedTime(null);
      setAutoPickPhase('searching');
      setShowSuccess(false);
      setSuccessInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment.appointmentId]);

  const isTimeOff = !!doctorSlotsResponse?.isTimeOff;
  const slotsLoading = doctorSlotsLoading || bookedSlotsLoading;

  const slots: SlotWithDuration[] = useMemo(() => {
    if (!doctorSlotsResponse?.shiftInfo?.[0]?.shiftDayDetails) return [];
    if (isTimeOff) return [];

    const shiftDayDetails = doctorSlotsResponse.shiftInfo[0].shiftDayDetails;
    const generated = generateTimeSlotsFromShiftInfo(shiftDayDetails, appointment.doctorId, formattedDate);
    const booked = new Set(bookedSlotsResponse?.bookedSlots || []);
    return generated.map((slot) => {
      const shiftDetail = shiftDayDetails.find((s) => s.shiftName === slot.shiftName);
      return {
        ...slot,
        isBooked: booked.has(`${slot.time}:00`),
        // Real per-shift duration, not a hardcoded guess — this is what actually gets sent as
        // SlotTimeInMinutes on confirm, so the token/EndAt reflects the doctor's configured slot
        // length instead of always assuming 15 minutes.
        slotDurationInMinutes: shiftDetail?.slotDurationInMinutes || 15,
      };
    });
  }, [doctorSlotsResponse, isTimeOff, bookedSlotsResponse, appointment.doctorId, formattedDate]);

  // Auto-pick the next available slot: try the patient's preferred time on their preferred date
  // first, else the earliest open slot that day, else page forward a day at a time — the
  // receptionist never has to hunt for availability themselves. "Change slot" (below) drops out
  // of this loop into manual picking, same UI as before, if they want to override.
  useEffect(() => {
    if (!open || autoPickPhase !== 'searching' || slotsLoading) return;

    const isFirstDate = formattedDate === format(initialDate, 'yyyy-MM-dd');
    if (isFirstDate && appointment.startAt) {
      const preferredTime = format(new Date(appointment.startAt), 'HH:mm');
      const exactMatch = slots.find((s) => s.time === preferredTime && !s.isBooked);
      if (exactMatch) {
        setSelectedTime(exactMatch.time);
        setAutoPickPhase('found');
        return;
      }
    }

    const firstOpen = !isTimeOff ? slots.find((s) => !s.isBooked) : undefined;
    if (firstOpen) {
      setSelectedTime(firstOpen.time);
      setAutoPickPhase('found');
      return;
    }

    const daysSearched = differenceInCalendarDays(selectedDate, initialDate);
    if (daysSearched >= MAX_SEARCH_DAYS) {
      setAutoPickPhase('exhausted');
      return;
    }
    setSelectedDate((d) => addDays(d, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPickPhase, slotsLoading, slots, isTimeOff, formattedDate]);

  const selectedSlotObj = slots.find((s) => s.time === selectedTime);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleChangeSlot = () => {
    setAutoPickPhase('manual');
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !hospitalId) return;

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startAt = `${dateStr}T${selectedTime}:00`;

      const response = await appointmentApi.confirmPreAppointment({
        appointmentId: appointment.appointmentId,
        hospitalId,
        startAt,
        slotTimeInMinutes: selectedSlotObj?.slotDurationInMinutes || 15,
      });

      setSuccessInfo({ tokenNumber: response?.tokenNumber, status: response?.status });
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Confirm pre-appointment failed', error);
      const message: string | undefined = error?.response?.data?.message;
      const isSlotConflict = message?.toLowerCase().includes('already booked');

      if (isSlotConflict && !isManual) {
        // Someone else took this slot between when it was picked and now — refetch this date's
        // booked slots (staleTime would otherwise keep serving the now-wrong cached list) and
        // let the auto-search effect find a different one, instead of leaving the receptionist
        // stuck staring at a slot that will just fail again if they hit Confirm a second time.
        await queryClient.invalidateQueries({
          queryKey: ['bookedSlots', appointment.doctorId, hospitalId, formattedDate, appointment.appointmentId],
        });
        setSelectedTime(null);
        setAutoPickPhase('searching');
        toast({
          title: 'That slot was just taken',
          description: 'Finding the next available slot for this patient…',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Confirmation Failed',
          description: message || 'Could not confirm this appointment. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (isSubmitting) return;
              if (showSuccess) handleSuccessClose();
              else onOpenChange(false);
            }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
          >
            <div className={`p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 shrink-0 ${showSuccess ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-amber-50/50 dark:bg-amber-900/10'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-semibold flex items-center gap-2 ${showSuccess ? 'text-green-600 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {showSuccess ? (
                      <>
                        <Check className="h-5 w-5" /> Success
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="h-5 w-5" />
                        {t('appointmentDashboard.confirmPreAppointmentTitle', { defaultValue: 'Confirm Appointment' })}
                      </>
                    )}
                  </h3>
                  {!showSuccess && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Review the details below, then confirm to allocate a token.
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (isSubmitting) return;
                    if (showSuccess) handleSuccessClose();
                    else onOpenChange(false);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 self-start shrink-0"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Success</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Appointment confirmed{successInfo?.tokenNumber ? ` — token #${successInfo.tokenNumber}` : ''}
                      {successInfo?.status ? ` (${successInfo.status})` : ''}.
                    </p>
                  </div>
                  <Button onClick={handleSuccessClose} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    OK
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Patient details — everything captured at booking time, not just name/doctor */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-wide">Patient Details</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <DetailRow icon={<User className="h-3 w-3" />} label="Patient" value={appointment.patientFullName} full />
                      <DetailRow label="Age / Sex" value={[appointment.patientAge ? `${appointment.patientAge} ${appointment.patientAgeUnit || 'yrs'}` : null, appointment.patientSex].filter(Boolean).join(' · ') || '—'} />
                      <DetailRow label="Mobile" value={appointment.patientMobile || '—'} />
                      {appointment.patientEmail && <DetailRow icon={<Mail className="h-3 w-3" />} label="Email" value={appointment.patientEmail} full />}
                      {appointment.guardianName && (
                        <DetailRow
                          icon={<Users className="h-3 w-3" />}
                          label="Guardian"
                          value={`${appointment.guardianRelation ? appointment.guardianRelation + ' ' : ''}${appointment.guardianName}`}
                          full
                        />
                      )}
                      <DetailRow label="Doctor" value={appointment.doctorName || 'Dr. Unknown'} full />
                      {appointment.reason && <DetailRow icon={<FileText className="h-3 w-3" />} label="Reason" value={appointment.reason} full />}
                    </div>
                  </div>

                  {/* Slot — auto-assigned by default; "Change" drops into the manual picker below */}
                  {!isManual && (
                    <div className={cn(
                      'p-3.5 rounded-lg border',
                      isExhausted ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                    )}>
                      {isSearching ? (
                        <div className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Finding the next available slot…
                        </div>
                      ) : isExhausted ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            No open slot found in the next {MAX_SEARCH_DAYS + 1} days.
                          </p>
                          <Button size="sm" variant="outline" onClick={handleChangeSlot} className="h-7 text-[11px]">
                            Pick manually
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Auto-assigned slot</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {format(selectedDate, 'EEE, MMM dd, yyyy')} at {selectedTime}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={handleChangeSlot} className="h-7 text-[11px] gap-1 text-slate-500 hover:text-slate-800">
                            <Pencil className="h-3 w-3" /> Change
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual override — same calendar + slot grid as before, only shown on request */}
                  {isManual && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Date</label>
                        <div className="flex justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm p-2">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            initialFocus
                            className="p-0"
                            classNames={{
                              months: "space-y-0",
                              month: "space-y-2",
                              caption: "pt-0 relative items-center justify-center flex mb-2",
                              caption_label: "text-sm font-medium",
                              nav: "space-x-1 flex items-center",
                              nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                              table: "w-full border-collapse space-y-0",
                              head_row: "flex mb-1",
                              head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
                              row: "flex w-full mt-1",
                              cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                              day: cn(
                                "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-amber-50 hover:text-amber-600 rounded-md transition-colors text-xs",
                                "aria-selected:bg-amber-600 aria-selected:text-white aria-selected:hover:bg-amber-700 aria-selected:hover:text-white"
                              ),
                              day_today: "bg-gray-100 text-gray-900 font-semibold",
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Select Time Slot
                        </label>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm p-3">
                          {slotsLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 dark:text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading available slots…
                            </div>
                          ) : isTimeOff ? (
                            <div className="text-center py-6 text-xs font-semibold text-red-500">
                              Doctor is unavailable on this date. Please pick another date.
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-400">
                              No slots configured for this doctor on this date.
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-1">
                              {slots.map((slot) => (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={slot.isBooked}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "px-1.5 py-1.5 rounded-lg border text-[11px] font-bold text-center transition-all",
                                    slot.isBooked
                                      ? "bg-red-50 border-red-200 text-red-400 opacity-60 cursor-not-allowed dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                                      : selectedTime === slot.time
                                        ? "bg-amber-600 border-amber-600 text-white shadow-md"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                                  )}
                                >
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
              {!showSuccess && (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!selectedDate || !selectedTime || isSubmitting || isSearching}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Appointment
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function DetailRow({ icon, label, value, full }: { icon?: React.ReactNode; label: string; value: string; full?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-2', full && 'col-span-2')}>
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}:</span>
      <span className="font-medium text-gray-900 dark:text-white text-right flex items-center gap-1 min-w-0">
        {icon && <span className="opacity-60 shrink-0">{icon}</span>}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

export default ConfirmPreAppointmentDialog;
