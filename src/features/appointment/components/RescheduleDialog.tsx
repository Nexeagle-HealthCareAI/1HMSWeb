import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, User, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDepartments } from '../hooks/useDepartments';
import { useDoctorsByDepartment } from '../hooks/useDoctorsByDepartment';
import { appointmentApi, type AppointmentDetail } from '../services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface RescheduleDialogProps {
  appointment: AppointmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  disablePastAndToday?: boolean;
  hideDoctorName?: boolean;
  enableDoctorSelection?: boolean;
}

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  appointment,
  open,
  onOpenChange,
  onSuccess,
  disablePastAndToday = false,
  hideDoctorName = false,
  enableDoctorSelection = false
}) => {
  const { t } = useTranslation();
  const { hospitalId } = useAuthStore();

  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointment.startAt ? new Date(appointment.startAt) : new Date()
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(appointment.doctorId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // New success state

  // New: Department and Doctor fetching
  const { data: departmentsResponse, isLoading: departmentsLoading } = useDepartments(hospitalId || '');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const { data: doctorsResponse, isLoading: doctorsLoading } = useDoctorsByDepartment(selectedDepartmentId, hospitalId || '');
  const doctors = doctorsResponse?.doctors || [];

  // Auto-select department on load - SAME AS BEFORE
  useEffect(() => {
    if (open && departmentsResponse?.departments && !selectedDepartmentId) {
      // ... existing logic ...
      // Priority 1: Direct departmentId match
      if (appointment.departmentId) {
        const exactMatch = departmentsResponse.departments.find(d => d.departmentId === appointment.departmentId);
        if (exactMatch) {
          setSelectedDepartmentId(exactMatch.departmentId);
          return;
        }
      }

      // Priority 2: Direct departmentName match
      if (appointment.departmentName) {
        const nameMatch = departmentsResponse.departments.find(d =>
          d.departmentName.toLowerCase() === appointment.departmentName?.toLowerCase()
        );
        if (nameMatch) {
          setSelectedDepartmentId(nameMatch.departmentId);
          return;
        }
      }

      // Priority 3: Fallback to departments array (legacy/derived)
      if (appointment.departments && appointment.departments.length > 0) {
        const matchingDept = departmentsResponse.departments.find(dept =>
          appointment.departments?.includes(dept.departmentName)
        );
        if (matchingDept) {
          setSelectedDepartmentId(matchingDept.departmentId);
        }
      }
    }
  }, [open, departmentsResponse, appointment.departments, appointment.departmentId, appointment.departmentName, selectedDepartmentId]);

  // Handle doctor selection state
  useEffect(() => {
    // ... existing logic ...
    if (enableDoctorSelection && open && selectedDepartmentId && doctors.length > 0) {
      const doctorExists = doctors.some(doc => doc.doctorId === selectedDoctorId);
      if (!doctorExists) {
        if (selectedDoctorId !== appointment.doctorId) {
          setSelectedDoctorId('');
        }
      }
    }
  }, [selectedDepartmentId, doctors, selectedDoctorId, open, enableDoctorSelection, appointment.doctorId]);

  // Initial Setup
  useEffect(() => {
    if (open) {
      // Reset state when opening
      let initialDate: Date;
      if (disablePastAndToday) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        initialDate = tomorrow;
      } else {
        initialDate = appointment.startAt ? new Date(appointment.startAt) : new Date();
      }

      setSelectedDate(initialDate);
      setSelectedDoctorId(appointment.doctorId);
      setShowSuccess(false); // Reset success state
    }
  }, [open, appointment, disablePastAndToday]);

  const handleConfirm = async () => {
    if (!selectedDate || !hospitalId) return;

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      await appointmentApi.registerAppointment(hospitalId, {
        doctorId: selectedDoctorId,
        apptDate: dateStr,
        appointmentId: appointment.appointmentId,
      } as any);

      // Replaced toast with modal view
      setShowSuccess(true);

    } catch (error) {
      console.error("Reschedule failed", error);
      toast({
        variant: "destructive",
        title: "Reschedule Failed",
        description: "Could not reschedule appointment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && showSuccess) {
        handleSuccessClose();
      } else {
        onOpenChange(val);
      }
    }}>
      <DialogContent className={cn("p-6 transition-all duration-300", showSuccess ? "max-w-md" : "max-w-3xl")}>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Success</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Appointment registered successfully
              </p>
            </div>
            <Button onClick={handleSuccessClose} className="w-full mt-4 bg-green-600 hover:bg-green-700">
              OK
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="p-0 mb-3">
              <DialogTitle className="text-base font-bold text-healthcare-primary">
                {t('appointmentDashboard.rescheduleTitle', { defaultValue: 'Reschedule Appointment' })}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">

                {/* Current Appointment Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase mb-1">Current Appointment</p>
                  <div className="space-y-1 text-xs">
                    {!hideDoctorName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Doctor: </span>
                        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{appointment.doctorName || 'Dr. Unknown'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Time: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(appointment.startAt), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hidden Department and Doctor Selection -> We rely on appointment.doctorId */}
                {/* If we needed to show them readonly:
            <div className="space-y-3 opacity-50 pointer-events-none hidden">
               ... Selectors ...
            </div> 
            */}

                {enableDoctorSelection && (
                  <div className="space-y-3">
                    {/* Department Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Department</label>
                      <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={departmentsLoading}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentsResponse?.departments.map((dept: any) => (
                            <SelectItem key={dept.departmentId} value={dept.departmentId} className="text-xs">
                              {dept.departmentName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Doctor Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Specialist</label>
                      <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} disabled={doctorsLoading || !selectedDepartmentId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={!selectedDepartmentId ? "Select Dept First" : "Select Doctor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map(doc => (
                            <SelectItem key={doc.doctorId} value={doc.doctorId} className="text-xs">
                              {doc.doctorName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select New Date</label>
                  <div className="flex justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm p-2">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Start of today

                        if (disablePastAndToday) {
                          // Disable everything < tomorrow if we want to forbid today
                          // However, user said "not allow user to select todays date" implying strictly future.
                          // "Past" is < today. "Today" is == today.
                          // So we want > today. (i.e. >= tomorrow)
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          return date < tomorrow;
                        }

                        // Default behavior: Disable only past dates (before today)
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
                          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors text-xs",
                          "aria-selected:bg-blue-600 aria-selected:text-white aria-selected:hover:bg-blue-700 aria-selected:hover:text-white"
                        ),
                        day_today: "bg-gray-100 text-gray-900 font-semibold",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedDoctorId || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};