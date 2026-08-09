import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CalendarX } from 'lucide-react';
import { useCreateTimeOff } from '../hooks/useCalendar';
import { useToast } from '@/hooks/use-toast';

interface MarkUnavailableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId?: string;
  doctorName?: string;
  hospitalId: string;
  onCreated?: () => void;
}

const QUICK_REASONS = ['Leave', 'Sick', 'Conference', 'Personal'] as const;

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Purpose-built for the "mark this doctor unavailable" quick task — a plain date-range pick +
// reason, no shift/override concepts. Deliberately separate from PersonalizedScheduleModal
// (which mixes shift-hour editing and time-off into one drag-select-driven flow built for a
// doctor's own detailed schedule) so staff get a form that matches the actual task shape.
export const MarkUnavailableModal: React.FC<MarkUnavailableModalProps> = ({
  open,
  onOpenChange,
  doctorId,
  doctorName,
  hospitalId,
  onCreated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [reason, setReason] = useState('');
  const createTimeOff = useCreateTimeOff();

  const resetAndClose = () => {
    setRange(undefined);
    setReason('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!doctorId || !range?.from || !reason.trim()) return;

    createTimeOff.mutate(
      {
        doctorId,
        hospitalId,
        fromDate: toLocalDateStr(range.from),
        toDate: toLocalDateStr(range.to ?? range.from),
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast({
            title: t('doctorCalendar.success'),
            description: t('doctorCalendar.notifications.timeOffScheduled', 'Time off scheduled'),
          });
          onCreated?.();
          resetAndClose();
        },
        onError: () => {
          toast({
            title: t('doctorCalendar.error'),
            description: t('doctorCalendar.errors.failedToScheduleTimeOff'),
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarX className="h-4 w-4 text-[#d93025]" />
            {t('doctorCalendar.markUnavailable.title', 'Mark unavailable')}
            {doctorName ? ` — ${doctorName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
              {t('doctorCalendar.markUnavailable.dates', 'Dates')}
            </Label>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              />
            </div>
            {range?.from && (
              <p className="text-xs text-gray-500 mt-1.5">
                {format(range.from, 'MMM d, yyyy')}
                {range.to && range.to.getTime() !== range.from.getTime() ? ` – ${format(range.to, 'MMM d, yyyy')}` : ''}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
              {t('doctorCalendar.markUnavailable.reason', 'Reason')}
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    reason === r
                      ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('doctorCalendar.markUnavailable.reasonPlaceholder', 'e.g. Annual leave')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            {t('doctorCalendar.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!doctorId || !range?.from || !reason.trim() || createTimeOff.isPending}
            className="bg-[#d93025] hover:bg-[#a50e0e] text-white"
          >
            {createTimeOff.isPending
              ? t('doctorCalendar.markUnavailable.saving', 'Saving…')
              : t('doctorCalendar.markUnavailable.submit', 'Mark unavailable')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
