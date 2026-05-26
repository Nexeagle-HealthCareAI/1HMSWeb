import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ShieldAlert, Plus, RefreshCw, Loader2, AlertCircle, X, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    nursingService,
    type NursingAssessment,
    type RecordNursingAssessmentRequest,
} from '../services/nursingService';

// ─── Scale definitions ──────────────────────────────────────────────────────

interface ScaleOption { label: string; value: number; }
interface ScaleField<K extends string> { key: K; label: string; options: ScaleOption[]; }

const MORSE_FIELDS: ScaleField<keyof Pick<RecordNursingAssessmentRequest,
    'morseHistoryOfFalling' | 'morseSecondaryDiagnosis' | 'morseAmbulatoryAid' |
    'morseIvHeparinLock' | 'morseGait' | 'morseMentalStatus'>>[] = [
    { key: 'morseHistoryOfFalling',   label: 'History of falling (past 3 months)', options: [{ label: 'No', value: 0 }, { label: 'Yes', value: 25 }] },
    { key: 'morseSecondaryDiagnosis', label: 'Secondary diagnosis',                options: [{ label: 'No', value: 0 }, { label: 'Yes', value: 15 }] },
    { key: 'morseAmbulatoryAid',      label: 'Ambulatory aid',                     options: [
        { label: 'None / Bedrest / Nurse assist', value: 0 },
        { label: 'Crutches / Cane / Walker',      value: 15 },
        { label: 'Furniture',                     value: 30 },
    ] },
    { key: 'morseIvHeparinLock',      label: 'IV / Heparin lock',                  options: [{ label: 'No', value: 0 }, { label: 'Yes', value: 20 }] },
    { key: 'morseGait',               label: 'Gait / Transferring',                options: [
        { label: 'Normal / Bedrest / Wheelchair', value: 0 },
        { label: 'Weak',                          value: 10 },
        { label: 'Impaired',                      value: 20 },
    ] },
    { key: 'morseMentalStatus',       label: 'Mental status',                       options: [
        { label: 'Knows own limit',           value: 0 },
        { label: 'Overestimates / Forgets',   value: 15 },
    ] },
];

const BRADEN_FIELDS: ScaleField<keyof Pick<RecordNursingAssessmentRequest,
    'bradenSensoryPerception' | 'bradenMoisture' | 'bradenActivity' |
    'bradenMobility' | 'bradenNutrition' | 'bradenFrictionShear'>>[] = [
    { key: 'bradenSensoryPerception', label: 'Sensory Perception', options: [
        { label: '1 · Completely limited', value: 1 },
        { label: '2 · Very limited',       value: 2 },
        { label: '3 · Slightly limited',   value: 3 },
        { label: '4 · No impairment',      value: 4 },
    ] },
    { key: 'bradenMoisture', label: 'Moisture', options: [
        { label: '1 · Constantly moist',  value: 1 },
        { label: '2 · Often moist',       value: 2 },
        { label: '3 · Occasionally moist', value: 3 },
        { label: '4 · Rarely moist',      value: 4 },
    ] },
    { key: 'bradenActivity', label: 'Activity', options: [
        { label: '1 · Bedfast',     value: 1 },
        { label: '2 · Chairfast',   value: 2 },
        { label: '3 · Walks occasionally', value: 3 },
        { label: '4 · Walks frequently',   value: 4 },
    ] },
    { key: 'bradenMobility', label: 'Mobility', options: [
        { label: '1 · Completely immobile', value: 1 },
        { label: '2 · Very limited',        value: 2 },
        { label: '3 · Slightly limited',    value: 3 },
        { label: '4 · No limitation',       value: 4 },
    ] },
    { key: 'bradenNutrition', label: 'Nutrition', options: [
        { label: '1 · Very poor',    value: 1 },
        { label: '2 · Probably inadequate', value: 2 },
        { label: '3 · Adequate',     value: 3 },
        { label: '4 · Excellent',    value: 4 },
    ] },
    { key: 'bradenFrictionShear', label: 'Friction / Shear', options: [
        { label: '1 · Problem',          value: 1 },
        { label: '2 · Potential problem', value: 2 },
        { label: '3 · No apparent problem', value: 3 },
    ] },
];

const MUST_FIELDS: ScaleField<keyof Pick<RecordNursingAssessmentRequest,
    'mustBmiScore' | 'mustWeightLossScore' | 'mustAcuteDiseaseScore'>>[] = [
    { key: 'mustBmiScore', label: 'BMI score', options: [
        { label: '0 · BMI ≥ 20',         value: 0 },
        { label: '1 · BMI 18.5–20',      value: 1 },
        { label: '2 · BMI < 18.5',       value: 2 },
    ] },
    { key: 'mustWeightLossScore', label: 'Unplanned weight loss past 3–6 months', options: [
        { label: '0 · < 5%',   value: 0 },
        { label: '1 · 5–10%',  value: 1 },
        { label: '2 · > 10%',  value: 2 },
    ] },
    { key: 'mustAcuteDiseaseScore', label: 'Acute disease — likely no nutritional intake >5 days', options: [
        { label: 'No',  value: 0 },
        { label: 'Yes', value: 2 },
    ] },
];

// ─── Risk tone helpers ───────────────────────────────────────────────────────

const MORSE_RISK_TONE: Record<string, { bg: string; label: string }> = {
    NONE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'No risk' },
    LOW:  { bg: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Low risk' },
    HIGH: { bg: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'High risk' },
};
const BRADEN_RISK_TONE: Record<string, { bg: string; label: string }> = {
    NONE:      { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'No risk' },
    MILD:      { bg: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Mild' },
    MODERATE:  { bg: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Moderate' },
    HIGH:      { bg: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'High' },
    VERY_HIGH: { bg: 'bg-rose-100 text-rose-800 border-rose-300',         label: 'Very high' },
};
const MUST_RISK_TONE: Record<string, { bg: string; label: string }> = {
    LOW:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Low' },
    MEDIUM: { bg: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Medium' },
    HIGH:   { bg: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'High' },
};

// ─── Sub-component: a scale section (heading + grid of radio chips + total tile) ─

interface ScaleSectionProps<K extends string> {
    title: string;
    subtitle: string;
    fields: ScaleField<K>[];
    values: Record<K, number>;
    onChange: (key: K, value: number) => void;
    total: number;
    riskBadge: { label: string; bg: string };
    maxTotal?: number;
}

function ScaleSection<K extends string>({ title, subtitle, fields, values, onChange, total, riskBadge, maxTotal }: ScaleSectionProps<K>) {
    return (
        <div className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-base font-extrabold text-slate-900">
                        {total}{maxTotal ? <span className="text-slate-400 font-normal">/{maxTotal}</span> : null}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px] font-bold ml-1', riskBadge.bg)}>
                        {riskBadge.label}
                    </Badge>
                </div>
            </div>

            <div className="space-y-2">
                {fields.map(f => (
                    <div key={f.key}>
                        <Label className="text-xs font-semibold text-slate-700">{f.label}</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {f.options.map(o => {
                                const selected = values[f.key] === o.value;
                                return (
                                    <button
                                        key={`${f.key}-${o.value}`}
                                        type="button"
                                        onClick={() => onChange(f.key, o.value)}
                                        className={cn(
                                            'px-2.5 h-8 rounded-md border text-xs font-medium transition-all',
                                            selected
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        )}
                                    >
                                        {o.label} <span className="text-[10px] opacity-70 ml-1">·{o.value}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Risk calc helpers (mirror the server logic for live preview) ────────────

const morseRiskOf = (total: number): keyof typeof MORSE_RISK_TONE =>
    total <= 24 ? 'NONE' : total <= 44 ? 'LOW' : 'HIGH';

const bradenRiskOf = (total: number): keyof typeof BRADEN_RISK_TONE =>
    total >= 19 ? 'NONE' :
    total >= 15 ? 'MILD' :
    total >= 13 ? 'MODERATE' :
    total >= 10 ? 'HIGH' : 'VERY_HIGH';

const mustRiskOf = (total: number): keyof typeof MUST_RISK_TONE =>
    total === 0 ? 'LOW' : total === 1 ? 'MEDIUM' : 'HIGH';

// ─── Stat tile (latest snapshot) ─────────────────────────────────────────────

const SnapshotTile: React.FC<{
    label: string;
    total?: number;
    maxTotal: number;
    risk?: string;
    tone: { bg: string; label: string } | undefined;
}> = ({ label, total, maxTotal, risk, tone }) => (
    <Card className={cn('border', tone?.bg ?? 'bg-white border-slate-200')}>
        <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {total ?? '—'}{total != null ? <span className="text-slate-400 font-normal text-base">/{maxTotal}</span> : null}
            </p>
            {tone && risk && (
                <p className="text-[11px] font-bold mt-0.5">{tone.label}</p>
            )}
        </CardContent>
    </Card>
);

// ─── Record sheet ────────────────────────────────────────────────────────────

const initialForm = (): RecordNursingAssessmentRequest => ({
    admissionId: '',
    morseHistoryOfFalling: 0,
    morseSecondaryDiagnosis: 0,
    morseAmbulatoryAid: 0,
    morseIvHeparinLock: 0,
    morseGait: 0,
    morseMentalStatus: 0,
    bradenSensoryPerception: 4,
    bradenMoisture: 4,
    bradenActivity: 4,
    bradenMobility: 4,
    bradenNutrition: 4,
    bradenFrictionShear: 3,
    mustBmiScore: 0,
    mustWeightLossScore: 0,
    mustAcuteDiseaseScore: 0,
});

const RecordAssessmentSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    onRecorded: () => void;
}> = ({ open, onOpenChange, admissionId, onRecorded }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<RecordNursingAssessmentRequest>({ ...initialForm(), admissionId });
    const [notes, setNotes] = useState('');
    const [assessedAt, setAssessedAt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm({ ...initialForm(), admissionId });
        setNotes('');
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        setAssessedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }, [open, admissionId]);

    const set = <K extends keyof RecordNursingAssessmentRequest>(k: K, v: RecordNursingAssessmentRequest[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
    };

    const morseTotal = form.morseHistoryOfFalling + form.morseSecondaryDiagnosis + form.morseAmbulatoryAid
                    + form.morseIvHeparinLock + form.morseGait + form.morseMentalStatus;
    const bradenTotal = form.bradenSensoryPerception + form.bradenMoisture + form.bradenActivity
                     + form.bradenMobility + form.bradenNutrition + form.bradenFrictionShear;
    const mustTotal = form.mustBmiScore + form.mustWeightLossScore + form.mustAcuteDiseaseScore;

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const payload: RecordNursingAssessmentRequest = {
                ...form,
                admissionId,
                notes: notes.trim() || undefined,
                assessedAt: assessedAt ? new Date(assessedAt).toISOString() : undefined,
            };
            const res = await nursingService.record(payload);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            const highRisk = res.morseRisk === 'HIGH' || res.bradenRisk === 'HIGH' || res.bradenRisk === 'VERY_HIGH' || res.mustRisk === 'HIGH';
            toast({
                title: 'Nursing assessment saved',
                description: `Morse ${res.morseTotal} (${res.morseRisk}) · Braden ${res.bradenTotal} (${res.bradenRisk}) · MUST ${res.mustTotal} (${res.mustRisk})`,
                variant: highRisk ? 'destructive' : undefined,
            });
            onRecorded();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldAlert className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Nursing Assessment</SheetTitle>
                            <SheetDescription className="text-xs">Morse fall risk · Braden pressure-ulcer risk · MUST malnutrition.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Assessed At</Label>
                        <input
                            type="datetime-local"
                            value={assessedAt}
                            onChange={e => setAssessedAt(e.target.value)}
                            className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-3"
                        />
                    </div>

                    <ScaleSection
                        title="Morse Fall Scale"
                        subtitle="≤ 24 no risk · 25–44 low · ≥ 45 high"
                        fields={MORSE_FIELDS}
                        values={form}
                        onChange={(k, v) => set(k, v)}
                        total={morseTotal}
                        maxTotal={125}
                        riskBadge={MORSE_RISK_TONE[morseRiskOf(morseTotal)]}
                    />

                    <ScaleSection
                        title="Braden Scale (Pressure Ulcer)"
                        subtitle="≥ 19 no risk · 15–18 mild · 13–14 moderate · 10–12 high · ≤ 9 very high"
                        fields={BRADEN_FIELDS}
                        values={form}
                        onChange={(k, v) => set(k, v)}
                        total={bradenTotal}
                        maxTotal={23}
                        riskBadge={BRADEN_RISK_TONE[bradenRiskOf(bradenTotal)]}
                    />

                    <ScaleSection
                        title="MUST (Malnutrition)"
                        subtitle="0 low · 1 medium · ≥ 2 high"
                        fields={MUST_FIELDS}
                        values={form}
                        onChange={(k, v) => set(k, v)}
                        total={mustTotal}
                        maxTotal={6}
                        riskBadge={MUST_RISK_TONE[mustRiskOf(mustTotal)]}
                    />

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Assessment</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main view ───────────────────────────────────────────────────────────────

export const RiskScoresView: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const [assessments, setAssessments] = useState<NursingAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await nursingService.list(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setAssessments(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load nursing assessments');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId]);

    useEffect(() => { load(); }, [load]);

    const latest = useMemo(() => assessments[0], [assessments]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-indigo-600" /> Nursing Risk Scores
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Morse fall · Braden pressure-ulcer · MUST malnutrition. High risk triggers care-plan adjustments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setSheetOpen(true)} className="h-9 bg-indigo-600 hover:bg-indigo-700 gap-1">
                        <Plus className="h-4 w-4" /> New Assessment
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
                </div>
            ) : (
                <>
                    {/* Latest-snapshot tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <SnapshotTile label="Morse · Fall" total={latest?.morseTotal} maxTotal={125}
                            risk={latest?.morseRisk} tone={latest ? MORSE_RISK_TONE[latest.morseRisk] : undefined} />
                        <SnapshotTile label="Braden · Skin" total={latest?.bradenTotal} maxTotal={23}
                            risk={latest?.bradenRisk} tone={latest ? BRADEN_RISK_TONE[latest.bradenRisk] : undefined} />
                        <SnapshotTile label="MUST · Malnutrition" total={latest?.mustTotal} maxTotal={6}
                            risk={latest?.mustRisk} tone={latest ? MUST_RISK_TONE[latest.mustRisk] : undefined} />
                    </div>

                    {latest && (latest.morseRisk === 'HIGH' || latest.bradenRisk === 'HIGH' || latest.bradenRisk === 'VERY_HIGH' || latest.mustRisk === 'HIGH') && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">High-risk patient — care-plan action required</p>
                                <p className="mt-0.5">
                                    {latest.morseRisk === 'HIGH' && '• Apply fall-risk protocol: bed-rails, signage, call bell within reach. '}
                                    {(latest.bradenRisk === 'HIGH' || latest.bradenRisk === 'VERY_HIGH') && '• Pressure-ulcer protocol: 2-hourly repositioning, skin assessment. '}
                                    {latest.mustRisk === 'HIGH' && '• Dietitian referral; document nutritional plan. '}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {error && !loading && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load assessments</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
                </div>
            )}

            {!loading && assessments.length === 0 && !error && (
                <div className="p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <ShieldAlert className="h-8 w-8 text-indigo-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No assessments yet</p>
                    <p className="text-xs text-slate-500">Recommended at admission and at each shift change.</p>
                    <Button onClick={() => setSheetOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-1" /> Do the first assessment
                    </Button>
                </div>
            )}

            {!loading && assessments.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Time</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">Morse</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">Braden</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">MUST</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden md:table-cell">Risk</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden lg:table-cell">By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assessments.map(a => {
                                const morseTone = MORSE_RISK_TONE[a.morseRisk] ?? MORSE_RISK_TONE.NONE;
                                const bradenTone = BRADEN_RISK_TONE[a.bradenRisk] ?? BRADEN_RISK_TONE.NONE;
                                const mustTone = MUST_RISK_TONE[a.mustRisk] ?? MUST_RISK_TONE.LOW;
                                return (
                                    <TableRow key={a.nursingAssessmentId}>
                                        <TableCell className="py-2 text-xs text-slate-600">{format(new Date(a.assessedAt), 'dd MMM HH:mm')}</TableCell>
                                        <TableCell className="py-2 text-right text-sm font-bold">{a.morseTotal}</TableCell>
                                        <TableCell className="py-2 text-right text-sm font-bold">{a.bradenTotal}</TableCell>
                                        <TableCell className="py-2 text-right text-sm font-bold">{a.mustTotal}</TableCell>
                                        <TableCell className="py-2 hidden md:table-cell">
                                            <div className="flex gap-1 flex-wrap">
                                                <Badge variant="outline" className={cn('text-[10px]', morseTone.bg)}>F: {morseTone.label}</Badge>
                                                <Badge variant="outline" className={cn('text-[10px]', bradenTone.bg)}>S: {bradenTone.label}</Badge>
                                                <Badge variant="outline" className={cn('text-[10px]', mustTone.bg)}>N: {mustTone.label}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 text-[11px] text-slate-400 hidden lg:table-cell truncate max-w-[120px]">{a.assessedBy ?? '—'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RecordAssessmentSheet open={sheetOpen} onOpenChange={setSheetOpen} admissionId={admissionId} onRecorded={() => load(true)} />
        </div>
    );
};

export default RiskScoresView;
