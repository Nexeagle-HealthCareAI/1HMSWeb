import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Check, Clock, Loader2, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useDoctorSlots } from '../hooks/useDoctorSlots';
import { useBookedSlots } from '../hooks/useBookedSlots';
import { generateTimeSlotsFromShiftInfo, type GeneratedTimeSlot } from '../utils/slotGenerator';
import { appointmentApi, type AppointmentDetail } from '../services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ConfirmPreAppointmentDialogProps {
  appointment: AppointmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ConfirmPreAppointmentDialog: React.FC<ConfirmPreAppointmentDialogProps> = ({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();

  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointment.startAt ? new Date(appointment.startAt) : new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ tokenNumber?: number; status?: string } | null>(null);
  const autoSelectedRef = useRef(false);

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

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
    formattedDate
  );

  // Reset state whenever the drawer opens for a (possibly different) appointment.
  useEffect(() => {
    if (open) {
      setSelectedDate(appointment.startAt ? new Date(appointment.startAt) : new Date());
      setSelectedTime(null);
      setShowSuccess(false);
      setSuccessInfo(null);
      autoSelectedRef.current = false;
    }
  }, [open, appointment]);

  const slots: GeneratedTimeSlot[] = useMemo(() => {
    if (!doctorSlotsResponse?.shiftInfo?.[0]?.shiftDayDetails) return [];
    if (doctorSlotsResponse.isTimeOff) return [];

    const generated = generateTimeSlotsFromShiftInfo(
      doctorSlotsResponse.shiftInfo[0].shiftDayDetails,
      appointment.doctorId,
      formattedDate
    );
    const booked = new Set(bookedSlotsResponse?.bookedSlots || []);
    return generated.map((slot) => ({
      ...slot,
      isBooked: booked.has(`${slot.time}:00`),
    }));
  }, [doctorSlotsResponse, bookedSlotsResponse, appointment.doctorId, formattedDate]);

  // Default the initially-selected slot to match the patient's preferred time if it's open;
  // otherwise leave it for the receptionist to pick any open slot.
  useEffect(() => {
    if (!open || autoSelectedRef.current || slots.length === 0) return;
    const preferredTime = appointment.startAt ? format(new Date(appointment.startAt), 'HH:mm') : null;
    const match = preferredTime ? slots.find((s) => s.time === preferredTime && !s.isBooked) : null;
    if (match) {
      setSelectedTime(match.time);
    }
    autoSelectedRef.current = true;
  }, [open, slots, appointment.startAt]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
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
        slotTimeInMinutes: 15,
      });

      setSuccessInfo({ tokenNumber: response?.tokenNumber, status: response?.status });
      setShowSuccess(true);
    } catch (error) {
      console.error('Confirm pre-appointment failed', error);
      toast({
        variant: 'destructive',
        title: 'Confirmation Failed',
        description: 'Could not confirm this appointment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    onSuccess();
    onOpenChange(false);
  };

  const isTimeOff = !!doctorSlotsResponse?.isTimeOff;
  const slotsLoading = doctorSlotsLoading || bookedSlotsLoading;

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
                        {t('appointmentDashboard.confirmPreAppointmentTitle', { defaultValue: 'Confirm Pre-Appointment' })}
                      </>
                    )}
                  </h3>
                  {!showSuccess && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Pick a real time slot to allocate a token for this patient.
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
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      {/* Patient Requested Summary */}
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase mb-1">Patient Requested</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Patient: </span>
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px] flex items-center gap-1">
                              <User className="h-3 w-3 opacity-60" />
                              {appointment.patientFullName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Doctor: </span>
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{appointment.doctorName || 'Dr. Unknown'}</span>
                          </div>
                          {appointment.startAt && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Preferred Date: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Preferred Time: </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {format(new Date(appointment.startAt), 'HH:mm')}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-4">
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
                  </div>
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
                    disabled={!selectedDate || !selectedTime || isSubmitting}
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
