import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { glucoseReadingApi, type GlucoseReadingItem, type GlucoseUnit } from '../services/glucoseReadingApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const MEAL_TAGS = ['FASTING', 'POST_PRANDIAL', 'RANDOM', 'BEDTIME'];

export const GlucoseChartPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [readings, setReadings] = useState<GlucoseReadingItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [newOpen, setNewOpen] = useState(false);
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState<GlucoseUnit>('mg/dL');
    const [mealTag, setMealTag] = useState('RANDOM');
    const [insulinGiven, setInsulinGiven] = useState(false);
    const [insulinUnits, setInsulinUnits] = useState('');
    const [insulinType, setInsulinType] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        glucoseReadingApi.getReadings(admissionId)
            .then(setReadings)
            .catch(() => toast({ title: 'Could not load glucose readings', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openNew = () => {
        setValue(''); setUnit('mg/dL'); setMealTag('RANDOM'); setInsulinGiven(false); setInsulinUnits(''); setInsulinType('');
        setNewOpen(true);
    };

    const submit = async () => {
        const v = parseFloat(value);
        if (!v || v <= 0 || submitting) {
            toast({ title: 'Incomplete', description: 'Enter a valid glucose value.', variant: 'destructive' });
            return;
        }
        if (insulinGiven && (!insulinUnits || parseFloat(insulinUnits) <= 0)) {
            toast({ title: 'Incomplete', description: 'Enter insulin units given.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const result = await glucoseReadingApi.record(admissionId, v, unit, {
                mealTag,
                insulinGiven,
                insulinUnits: insulinGiven ? parseFloat(insulinUnits) : undefined,
                insulinType: insulinGiven ? (insulinType || undefined) : undefined,
            });
            toast({
                title: 'Glucose reading recorded.',
                description: result.isHypo ? 'Hypoglycaemia — please review.' : result.isHyper ? 'Hyperglycaemia — please review.' : undefined,
                variant: result.isHypo || result.isHyper ? 'destructive' : undefined,
            });
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Glucose &amp; Insulin</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openNew}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record reading
                        </Button>
                    )}
                </div>
            </div>

            {loading && readings.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : readings.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No glucose readings yet.</div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {readings.map(r => (
                        <div key={r.glucoseReadingId} className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900">{r.value} {r.unit}</span>
                                {r.isHypo && <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200">HYPO</Badge>}
                                {r.isHyper && <Badge variant="outline" className="text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200">HYPER</Badge>}
                                {r.mealTag && <span className="text-[11px] text-slate-500">{r.mealTag.replace('_', ' ')}</span>}
                                {r.insulinGiven && <span className="text-[11px] text-brand-700 font-semibold">Insulin {r.insulinUnits}u {r.insulinType ?? ''}</span>}
                            </div>
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatIstDateTime(r.recordedAt)}</span>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Record glucose reading</DialogTitle>
                        <DialogDescription>Hypo/hyper flags are computed automatically.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Value</Label>
                            <Input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} className="h-9 mt-1" autoFocus />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Unit</Label>
                            <select value={unit} onChange={e => setUnit(e.target.value as GlucoseUnit)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                <option value="mg/dL">mg/dL</option>
                                <option value="mmol/L">mmol/L</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Meal tag</Label>
                        <select value={mealTag} onChange={e => setMealTag(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                            {MEAL_TAGS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input type="checkbox" checked={insulinGiven} onChange={e => setInsulinGiven(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                        Insulin given
                    </label>
                    {insulinGiven && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Units</Label>
                                <Input type="number" step="0.5" value={insulinUnits} onChange={e => setInsulinUnits(e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Type</Label>
                                <Input value={insulinType} onChange={e => setInsulinType(e.target.value)} className="h-9 mt-1" placeholder="e.g. Regular" />
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="outline" className="h-11 sm:h-10" onClick={() => setNewOpen(false)}>Cancel</Button>
                        <Button disabled={!value || submitting} onClick={submit} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
