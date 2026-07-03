import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Table2, LineChart as LineChartIcon } from 'lucide-react';
import { vitalsApi, type VitalReadingItem, type RecordVitalReadingFields } from '../services/vitalsApi';
import { VitalsTrendChart } from './VitalsTrendChart';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const EMPTY_FORM: RecordVitalReadingFields = {};

export const VitalsPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [readings, setReadings] = useState<VitalReadingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'table' | 'chart'>('chart');
    const [newOpen, setNewOpen] = useState(false);
    const [form, setForm] = useState<RecordVitalReadingFields>({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        vitalsApi.getReadings(admissionId)
            .then(setReadings)
            .catch(() => toast({ title: 'Could not load vitals', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const setField = (patch: Partial<RecordVitalReadingFields>) => setForm(f => ({ ...f, ...patch }));
    const num = (v: string) => (v === '' ? undefined : parseFloat(v));

    const hasAnyValue = Object.values(form).some(v => v !== undefined && v !== '');

    const submit = async () => {
        if (!hasAnyValue || submitting) {
            toast({ title: 'Incomplete', description: 'Enter at least one vital value.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await vitalsApi.record(admissionId, form);
            toast({ title: 'Vital reading recorded.' });
            setNewOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not record reading', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Vitals</h2>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
                        <button type="button" onClick={() => setView('chart')}
                            className={cn('h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', view === 'chart' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            <LineChartIcon className="h-3.5 w-3.5" /> Chart
                        </button>
                        <button type="button" onClick={() => setView('table')}
                            className={cn('h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', view === 'table' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            <Table2 className="h-3.5 w-3.5" /> Table
                        </button>
                    </div>
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold" onClick={() => { setForm({ ...EMPTY_FORM }); setNewOpen(true); }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record reading
                        </Button>
                    )}
                </div>
            </div>

            {loading && readings.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading vitals…</div>
            ) : readings.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No vital readings yet.</div>
            ) : view === 'chart' ? (
                <VitalsTrendChart readings={readings} />
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="text-left px-3 py-2">Time</th>
                                <th className="text-left px-3 py-2">Temp</th>
                                <th className="text-left px-3 py-2">Pulse</th>
                                <th className="text-left px-3 py-2">BP</th>
                                <th className="text-left px-3 py-2">RR</th>
                                <th className="text-left px-3 py-2">SpO2</th>
                                <th className="text-left px-3 py-2">Pain</th>
                                <th className="text-left px-3 py-2">GCS</th>
                                <th className="text-left px-3 py-2">Wt/Ht/BMI</th>
                                <th className="text-left px-3 py-2">By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {readings.map(r => (
                                <tr key={r.vitalReadingId}>
                                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-700">{formatIstDateTime(r.recordedAt)}</td>
                                    <td className="px-3 py-2">{r.temperature != null ? `${r.temperature}°${r.temperatureUnit ?? ''}` : '—'}</td>
                                    <td className="px-3 py-2">{r.pulse ?? '—'}</td>
                                    <td className="px-3 py-2">{r.systolicBP != null && r.diastolicBP != null ? `${r.systolicBP}/${r.diastolicBP}` : '—'}</td>
                                    <td className="px-3 py-2">{r.respiratoryRate ?? '—'}</td>
                                    <td className="px-3 py-2">{r.spO2 != null ? `${r.spO2}%` : '—'}</td>
                                    <td className="px-3 py-2">{r.painScore ?? '—'}</td>
                                    <td className="px-3 py-2">{r.gcsTotal ?? '—'}</td>
                                    <td className="px-3 py-2">{[r.weightKg ? `${r.weightKg}kg` : null, r.heightCm ? `${r.heightCm}cm` : null, r.bmi ? `BMI ${r.bmi}` : null].filter(Boolean).join(' / ') || '—'}</td>
                                    <td className="px-3 py-2 text-slate-500">{r.recordedBy ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Record vital reading</DialogTitle>
                        <DialogDescription>Fill in whichever values were taken — at least one is required.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Temperature</Label>
                            <Input type="number" step="0.1" value={form.temperature ?? ''} onChange={e => setField({ temperature: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Unit</Label>
                            <select value={form.temperatureUnit ?? 'F'} onChange={e => setField({ temperatureUnit: e.target.value })}
                                className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                <option value="F">°F</option>
                                <option value="C">°C</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Pulse</Label>
                            <Input type="number" value={form.pulse ?? ''} onChange={e => setField({ pulse: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Systolic BP</Label>
                            <Input type="number" value={form.systolicBP ?? ''} onChange={e => setField({ systolicBP: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Diastolic BP</Label>
                            <Input type="number" value={form.diastolicBP ?? ''} onChange={e => setField({ diastolicBP: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Resp. rate</Label>
                            <Input type="number" value={form.respiratoryRate ?? ''} onChange={e => setField({ respiratoryRate: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">SpO2 %</Label>
                            <Input type="number" step="0.1" value={form.spO2 ?? ''} onChange={e => setField({ spO2: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Pain (0-10)</Label>
                            <Input type="number" min={0} max={10} value={form.painScore ?? ''} onChange={e => setField({ painScore: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Weight (kg)</Label>
                            <Input type="number" step="0.1" value={form.weightKg ?? ''} onChange={e => setField({ weightKg: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Height (cm)</Label>
                            <Input type="number" step="0.1" value={form.heightCm ?? ''} onChange={e => setField({ heightCm: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">GCS Eye (1-4)</Label>
                            <Input type="number" min={1} max={4} value={form.gcsEye ?? ''} onChange={e => setField({ gcsEye: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">GCS Verbal (1-5)</Label>
                            <Input type="number" min={1} max={5} value={form.gcsVerbal ?? ''} onChange={e => setField({ gcsVerbal: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">GCS Motor (1-6)</Label>
                            <Input type="number" min={1} max={6} value={form.gcsMotor ?? ''} onChange={e => setField({ gcsMotor: num(e.target.value) })} className="h-9 mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                        <Input value={form.notes ?? ''} onChange={e => setField({ notes: e.target.value || undefined })} className="h-9 mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                        <Button disabled={!hasAnyValue || submitting} onClick={submit} className="bg-brand-600 hover:bg-brand-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
