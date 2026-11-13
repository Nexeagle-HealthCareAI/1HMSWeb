import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/services/axiosClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
const DAYS: Array<{ code: DayCode; label: string }> = [
  { code: 'MON', label: 'Mon' }, { code: 'TUE', label: 'Tue' }, { code: 'WED', label: 'Wed' }, { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' }, { code: 'SAT', label: 'Sat' }, { code: 'SUN', label: 'Sun' },
];

interface Settings { weeklyOffDays: DayCode[]; weeklyOffPayable: boolean; holidayPayable: boolean }
interface Holiday { hrHolidayId: string; holidayDate: string; name: string }
interface SettingsResponse { settings: Settings; holidays: Holiday[] }

const base = '/api/v1/hr';

/**
 * Hospital payroll calendar policy: which weekdays are the weekly off, and whether weekly offs and
 * declared holidays are PAID days. Defaults (nothing configured) are Sunday off, both paid. Applies
 * to the next payroll run; past runs are never recalculated.
 */
export const PayrollSettingsCard: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const key = ['hr', 'payroll-settings', hospitalId, year];

  const { data } = useQuery<SettingsResponse>({
    queryKey: key,
    queryFn: () => apiClient.get(`${base}/payroll-settings?hospitalId=${hospitalId}&year=${year}`),
    enabled: !!hospitalId,
  });

  const [form, setForm] = useState<Settings>({ weeklyOffDays: ['SUN'], weeklyOffPayable: true, holidayPayable: true });
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  const fail = (e: unknown) =>
    toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });

  const save = useMutation({
    mutationFn: () => apiClient.put(`${base}/payroll-settings?hospitalId=${hospitalId}`, form),
    onSuccess: () => { toast({ title: 'Payroll settings saved', description: 'They apply to the next payroll run.' }); qc.invalidateQueries({ queryKey: key }); },
    onError: fail,
  });
  const addHoliday = useMutation({
    mutationFn: () => apiClient.post(`${base}/holidays?hospitalId=${hospitalId}`, { holidayDate, name: holidayName }),
    onSuccess: () => { setHolidayDate(''); setHolidayName(''); qc.invalidateQueries({ queryKey: key }); },
    onError: fail,
  });
  const removeHoliday = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${base}/holidays/${id}?hospitalId=${hospitalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: fail,
  });

  const toggleDay = (code: DayCode) =>
    setForm(f => ({ ...f, weeklyOffDays: f.weeklyOffDays.includes(code) ? f.weeklyOffDays.filter(d => d !== code) : [...f.weeklyOffDays, code] }));

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-5">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/30"><CalendarOff className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Weekly offs &amp; holidays</h3>
          <p className="text-xs text-gray-500">Controls which non-working days are paid in payroll. Default: paid.</p>
        </div>
      </header>

      <div className="space-y-2">
        <Label>Weekly off days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => {
            const on = form.weeklyOffDays.includes(d.code);
            return (
              <button
                key={d.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.code)}
                className={`h-11 min-w-[3.25rem] rounded-xl border text-sm font-semibold transition-colors ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={form.weeklyOffPayable} onCheckedChange={v => setForm(f => ({ ...f, weeklyOffPayable: v === true }))} />
          Weekly offs are paid days
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={form.holidayPayable} onCheckedChange={v => setForm(f => ({ ...f, holidayPayable: v === true }))} />
          Declared holidays are paid days
        </label>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="h-11">
        {save.isPending ? 'Saving…' : 'Save settings'}
      </Button>

      <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        <Label>Holiday calendar {year}</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} className="sm:w-44" aria-label="Holiday date" />
          <Input value={holidayName} onChange={e => setHolidayName(e.target.value)} maxLength={120} placeholder="Holiday name (e.g. Diwali)" aria-label="Holiday name" />
          <Button
            variant="outline"
            onClick={() => addHoliday.mutate()}
            disabled={!holidayDate || !holidayName.trim() || addHoliday.isPending}
            className="h-11 gap-1"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {(data?.holidays?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">No holidays declared for {year}.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
            {data!.holidays.map(h => (
              <li key={h.hrHolidayId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span><span className="font-semibold">{h.holidayDate}</span> · {h.name}</span>
                <Button variant="ghost" size="icon" onClick={() => removeHoliday.mutate(h.hrHolidayId)} aria-label={`Remove ${h.name}`}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default PayrollSettingsCard;
