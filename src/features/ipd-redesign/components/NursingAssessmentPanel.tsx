import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { nursingAssessmentApi, type NursingAssessmentItem, type RecordNursingAssessmentFields } from '../services/nursingAssessmentApi';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const SELECT_CLASS = 'h-10 mt-1 w-full text-sm border border-slate-205 dark:border-zinc-800 rounded-xl px-3 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer';

const MORSE_FIELDS: { key: keyof RecordNursingAssessmentFields; label: string; options: { value: number; label: string }[] }[] = [
    { key: 'morseHistoryOfFalling', label: 'History of falling', options: [{ value: 0, label: 'No' }, { value: 25, label: 'Yes' }] },
    { key: 'morseSecondaryDiagnosis', label: 'Secondary diagnosis', options: [{ value: 0, label: 'No' }, { value: 15, label: 'Yes' }] },
    { key: 'morseAmbulatoryAid', label: 'Ambulatory aid', options: [{ value: 0, label: 'None / bed rest / nurse assist' }, { value: 15, label: 'Crutches / cane / walker' }, { value: 30, label: 'Furniture' }] },
    { key: 'morseIvHeparinLock', label: 'IV / heparin lock', options: [{ value: 0, label: 'No' }, { value: 20, label: 'Yes' }] },
    { key: 'morseGait', label: 'Gait', options: [{ value: 0, label: 'Normal / bedrest / wheelchair' }, { value: 10, label: 'Weak' }, { value: 20, label: 'Impaired' }] },
    { key: 'morseMentalStatus', label: 'Mental status', options: [{ value: 0, label: 'Oriented to own ability' }, { value: 15, label: 'Forgets limitations' }] },
];

const BRADEN_1_4_LABELS = ['1 — Completely limited', '2 — Very limited', '3 — Slightly limited', '4 — No impairment'];
const BRADEN_FIELDS: { key: keyof RecordNursingAssessmentFields; label: string; max: 3 | 4 }[] = [
    { key: 'bradenSensoryPerception', label: 'Sensory perception', max: 4 },
    { key: 'bradenMoisture', label: 'Moisture', max: 4 },
    { key: 'bradenActivity', label: 'Activity', max: 4 },
    { key: 'bradenMobility', label: 'Mobility', max: 4 },
    { key: 'bradenNutrition', label: 'Nutrition', max: 4 },
    { key: 'bradenFrictionShear', label: 'Friction & shear', max: 3 },
];

const MUST_FIELDS: { key: keyof RecordNursingAssessmentFields; label: string; options: { value: number; label: string }[] }[] = [
    { key: 'mustBmiScore', label: 'BMI score', options: [{ value: 0, label: '>20 (>30 obese)' }, { value: 1, label: '18.5–20' }, { value: 2, label: '<18.5' }] },
    { key: 'mustWeightLossScore', label: 'Unplanned weight loss (3-6mo)', options: [{ value: 0, label: '<5%' }, { value: 1, label: '5–10%' }, { value: 2, label: '>10%' }] },
    { key: 'mustAcuteDiseaseScore', label: 'Acute disease effect', options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes — acutely ill, no intake >5 days' }] },
];

const EMPTY_FORM: RecordNursingAssessmentFields = {
    morseHistoryOfFalling: 0, morseSecondaryDiagnosis: 0, morseAmbulatoryAid: 0, morseIvHeparinLock: 0, morseGait: 0, morseMentalStatus: 0,
    bradenSensoryPerception: 4, bradenMoisture: 4, bradenActivity: 4, bradenMobility: 4, bradenNutrition: 4, bradenFrictionShear: 3,
    mustBmiScore: 0, mustWeightLossScore: 0, mustAcuteDiseaseScore: 0,
};

const riskBadgeClass = (risk: string) => {
    if (risk === 'HIGH' || risk === 'VERY_HIGH') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30 rounded-full';
    if (risk === 'MODERATE' || risk === 'MEDIUM') return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30 rounded-full';
    if (risk === 'LOW' || risk === 'MILD') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-405 dark:border-amber-900/30 rounded-full';
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 rounded-full';
};

export const NursingAssessmentPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [assessments, setAssessments] = useState<NursingAssessmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newOpen, setNewOpen] = useState(false);
    const [form, setForm] = useState<RecordNursingAssessmentFields>({ ...EMPTY_FORM });
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        nursingAssessmentApi.getAssessments(admissionId)
            .then(setAssessments)
            .catch(() => toast({ title: 'Could not load nursing assessments', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const setField = (key: keyof RecordNursingAssessmentFields, value: number) => setForm(f => ({ ...f, [key]: value }));

    const morseTotal = MORSE_FIELDS.reduce((sum, f) => sum + (form[f.key] as number), 0);
    const bradenTotal = BRADEN_FIELDS.reduce((sum, f) => sum + (form[f.key] as number), 0);
    const mustTotal = MUST_FIELDS.reduce((sum, f) => sum + (form[f.key] as number), 0);

    const submit = async () => {
        if (submitting) return;
        if (isSubscriptionReadOnly) { blockAction('Recording nursing assessments'); return; }
        setSubmitting(true);
        try {
            await nursingAssessmentApi.record(admissionId, { ...form, notes: notes || undefined });
            toast({ title: 'Assessment recorded.' });
            setNewOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not record assessment', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Nursing Assessment</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none rounded-xl active:scale-[0.98] transition-all" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold rounded-xl active:scale-[0.98] transition-all" onClick={() => { if (isSubscriptionReadOnly) { blockAction('Recording nursing assessments'); return; } setForm({ ...EMPTY_FORM }); setNotes(''); setNewOpen(true); }} disabled={isSubscriptionReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New assessment
                        </Button>
                    )}
                </div>
            </div>

            {loading && assessments.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : assessments.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No nursing assessments yet.</div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800/60 shadow-sm overflow-hidden">
                    {assessments.map(a => (
                        <div key={a.nursingAssessmentId} className="px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{formatIstDateTime(a.assessedAt)}{a.assessedBy ? ` · ${a.assessedBy}` : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                                <Badge variant="outline" className={cn('text-[10px] font-bold', riskBadgeClass(a.morseRisk))}>Morse {a.morseTotal} · {a.morseRisk}</Badge>
                                <Badge variant="outline" className={cn('text-[10px] font-bold', riskBadgeClass(a.bradenRisk))}>Braden {a.bradenTotal} · {a.bradenRisk}</Badge>
                                <Badge variant="outline" className={cn('text-[10px] font-bold', riskBadgeClass(a.mustRisk))}>MUST {a.mustTotal} · {a.mustRisk}</Badge>
                            </div>
                            {a.notes && <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic mt-1.5">{a.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">New nursing assessment</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">Morse Fall Scale, Braden Pressure-Ulcer Scale, MUST nutrition screen.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-455 dark:text-zinc-550">Morse Fall Scale</h3>
                                <Badge variant="outline" className={cn('text-[10px] font-bold', riskBadgeClass(morseTotal >= 45 ? 'HIGH' : morseTotal >= 25 ? 'LOW' : 'NONE'))}>
                                    Total {morseTotal}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {MORSE_FIELDS.map(f => (
                                    <div key={f.key}>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">{f.label}</Label>
                                        <select value={form[f.key] as number} onChange={e => setField(f.key, parseInt(e.target.value, 10))} className={cn(SELECT_CLASS, "dark:bg-zinc-900")}>
                                            {f.options.map(o => <option key={o.value} value={o.value} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{o.label}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-455 dark:text-zinc-550">Braden Pressure-Ulcer Scale</h3>
                                <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-650 border-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 rounded-full px-2.5 py-0.5">Total {bradenTotal}</Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {BRADEN_FIELDS.map(f => (
                                    <div key={f.key}>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">{f.label}</Label>
                                        <select value={form[f.key] as number} onChange={e => setField(f.key, parseInt(e.target.value, 10))} className={cn(SELECT_CLASS, "dark:bg-zinc-900")}>
                                            {(f.max === 3 ? [1, 2, 3] : [1, 2, 3, 4]).map(v => <option key={v} value={v} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{BRADEN_1_4_LABELS[v - 1]}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-455 dark:text-zinc-550">MUST Nutrition Screen</h3>
                                <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-650 border-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 rounded-full px-2.5 py-0.5">Total {mustTotal}</Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {MUST_FIELDS.map(f => (
                                    <div key={f.key}>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">{f.label}</Label>
                                        <select value={form[f.key] as number} onChange={e => setField(f.key, parseInt(e.target.value, 10))} className={cn(SELECT_CLASS, "dark:bg-zinc-900")}>
                                            {f.options.map(o => <option key={o.value} value={o.value} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{o.label}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Notes</Label>
                            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 transition-all p-3 resize-none w-full dark:bg-zinc-900 dark:text-zinc-150" placeholder="Optional clinical observations..." />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200 dark:border-zinc-800" onClick={() => setNewOpen(false)}>Cancel</Button>
                        <Button disabled={submitting || isSubscriptionReadOnly} onClick={submit} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white shadow-md shadow-brand-500/10">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
