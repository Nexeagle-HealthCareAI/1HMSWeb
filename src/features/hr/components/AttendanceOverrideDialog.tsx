import React, { useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSetAttendanceOverride } from '../hrApi';
import type { AttendanceExceptionDto, AttendanceOverrideStatus } from '../types';

const STATUS_OPTIONS: { value: AttendanceOverrideStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'ON_LEAVE', label: 'On leave' },
];

/** Combines the exception's date with an "HH:mm" time input into a full ISO datetime. */
const toIso = (dateStr: string, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const AttendanceOverrideDialog: React.FC<{ target: AttendanceExceptionDto | null; onClose: () => void }> = ({ target, onClose }) => {
  const { toast } = useToast();
  const setOverride = useSetAttendanceOverride();
  const [status, setStatus] = useState<AttendanceOverrideStatus>('PRESENT');
  const [punchIn, setPunchIn] = useState('');
  const [punchOut, setPunchOut] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  // Re-seed the form whenever a new exception is opened.
  React.useEffect(() => {
    if (!target) return;
    setStatus((target.exceptionType === 'ABSENT' ? 'ABSENT' : 'PRESENT'));
    setPunchIn(target.punchIn ? format(new Date(target.punchIn), 'HH:mm') : '');
    setPunchOut(target.punchOut ? format(new Date(target.punchOut), 'HH:mm') : '');
    setNotes('');
    setReason('');
  }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !reason.trim()) return;
    try {
      const res = await setOverride.mutateAsync({
        employeeId: target.employeeId,
        attendanceDate: format(new Date(target.attendanceDate), 'yyyy-MM-dd'),
        status,
        punchIn: punchIn ? toIso(target.attendanceDate, punchIn) : undefined,
        punchOut: punchOut ? toIso(target.attendanceDate, punchOut) : undefined,
        notes: notes.trim() || undefined,
        reason: reason.trim(),
      });
      if (!res.success) {
        toast({ title: 'Could not save the correction', description: res.message, variant: 'destructive' });
        return;
      }
      toast({ title: res.message || 'Attendance updated' });
      onClose();
    } catch (err) {
      toast({ title: 'Could not save the correction', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct attendance{target ? ` — ${target.employeeName}` : ''}</DialogTitle>
          <DialogDescription>
            {target && `${format(new Date(target.attendanceDate), 'EEEE, d MMM yyyy')}. This is recorded as a manual correction, with your name and reason kept for audit.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as AttendanceOverrideStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="override-in">Punch in</Label>
              <Input id="override-in" type="time" value={punchIn} onChange={e => setPunchIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="override-out">Punch out</Label>
              <Input id="override-out" type="time" value={punchOut} onChange={e => setPunchOut(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">Leave a time blank to keep whatever is already on record.</p>

          <div className="space-y-1.5">
            <Label htmlFor="override-notes">Notes (optional)</Label>
            <Textarea id="override-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything worth noting on the record itself" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Reason for this correction</Label>
            <Textarea id="override-reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. Device was offline; confirmed on-site by the ward supervisor" required />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={setOverride.isPending || !reason.trim()} className="gap-2">
              {setOverride.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
