import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Plus, HeartPulse, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import {
    icuApi, type IcuLevel, type IcuLevelOfCareEntry, type ApacheIIScoreEntry, type SofaScoreEntry,
    type ChronicHealthCategory, type VasopressorTier,
} from '../services/icuApi';
import { formatIstDateTime, formatIstTime } from '../utils/istDate';
import { DevicesPanel } from './DevicesPanel';
import { InfectionEventsPanel } from './InfectionEventsPanel';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const LEVEL_LABEL: Record<IcuLevel, string> = {
    LEVEL_1: 'Level 1 — HDU / step-down',
    LEVEL_2: 'Level 2 — single organ support',
    LEVEL_3: 'Level 3 — multi-organ support',
};
const LEVEL_TONE: Record<IcuLevel, string> = {
    LEVEL_1: 'bg-sky-50 text-sky-700 border-sky-200',
    LEVEL_2: 'bg-amber-50 text-amber-700 border-amber-200',
    LEVEL_3: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SERIES_BLUE = '#2a78d6';
const GRID = '#e1e0d9';
const AXIS_INK = '#898781';

export const IcuCriticalCarePanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();

    // Level of care
    const [locHistory, setLocHistory] = useState<IcuLevelOfCareEntry[]>([]);
    const [locLoading, setLocLoading] = useState(true);
    const [locOpen, setLocOpen] = useState(false);
    const [locLevel, setLocLevel] = useState<IcuLevel>('LEVEL_1');
    const [locReason, setLocReason] = useState('');
    const [locBusy, setLocBusy] = useState(false);

    // APACHE II
    const [apacheHistory, setApacheHistory] = useState<ApacheIIScoreEntry[]>([]);
    const [apacheLoading, setApacheLoading] = useState(true);
    const [apacheOpen, setApacheOpen] = useState(false);
    const [apacheFetchingAutofill, setApacheFetchingAutofill] = useState(false);
    const [apacheBusy, setApacheBusy] = useState(false);
    const [apacheForm, setApacheForm] = useState<Record<string, string>>({});
    const [apacheArf, setApacheArf] = useState(false);
    const [apacheChronicHealth, setApacheChronicHealth] = useState<ChronicHealthCategory>('NONE');

    // SOFA
    const [sofaHistory, setSofaHistory] = useState<SofaScoreEntry[]>([]);
    const [sofaLoading, setSofaLoading] = useState(true);
    const [sofaOpen, setSofaOpen] = useState(false);
    const [sofaFetchingAutofill, setSofaFetchingAutofill] = useState(false);
    const [sofaBusy, setSofaBusy] = useState(false);
    const [sofaForm, setSofaForm] = useState<Record<string, string>>({});
    const [sofaRespSupport, setSofaRespSupport] = useState(false);
    const [sofaVasoTier, setSofaVasoTier] = useState<VasopressorTier>('NONE');

    const loadLoc = () => {
        setLocLoading(true);
        icuApi.getLevelOfCareHistory(admissionId).then(setLocHistory).catch(() => setLocHistory([])).finally(() => setLocLoading(false));
    };
    const loadApache = () => {
        setApacheLoading(true);
        icuApi.getApacheHistory(admissionId).then(setApacheHistory).catch(() => setApacheHistory([])).finally(() => setApacheLoading(false));
    };
    const loadSofa = () => {
        setSofaLoading(true);
        icuApi.getSofaHistory(admissionId).then(setSofaHistory).catch(() => setSofaHistory([])).finally(() => setSofaLoading(false));
    };

    useEffect(() => { loadLoc(); loadApache(); loadSofa(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentLevel = locHistory[0]?.level;

    // ── Level of Care ────────────────────────────────────────────────────
    const submitLevelOfCare = async () => {
        setLocBusy(true);
        try {
            await icuApi.recordLevelOfCare(admissionId, locLevel, locReason.trim() || undefined);
            toast({ title: 'Level of care recorded.' });
            setLocOpen(false);
            setLocReason('');
            loadLoc();
        } catch (err) {
            toast({ title: 'Could not record level of care', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setLocBusy(false);
        }
    };

    // ── APACHE II ────────────────────────────────────────────────────────
    const openApache = async () => {
        setApacheOpen(true);
        setApacheArf(false);
        setApacheChronicHealth('NONE');
        setApacheFetchingAutofill(true);
        try {
            const draft = await icuApi.getApacheAutoFill(admissionId);
            setApacheForm({
                temperature: draft.temperature != null ? String(draft.temperature) : '',
                mapValue: draft.mapValue != null ? String(draft.mapValue) : '',
                heartRate: draft.heartRate != null ? String(draft.heartRate) : '',
                respiratoryRate: draft.respiratoryRate != null ? String(draft.respiratoryRate) : '',
                gcsTotal: draft.gcsTotal != null ? String(draft.gcsTotal) : '',
                ageYears: draft.ageYears != null ? String(draft.ageYears) : '',
                fiO2: '', paO2: '', arterialPh: '', serumSodium: '', serumPotassium: '', serumCreatinine: '', hematocrit: '', wbc: '',
            });
        } catch {
            setApacheForm({});
        } finally {
            setApacheFetchingAutofill(false);
        }
    };

    const apacheField = (key: string, label: string, step = '1') => (
        <div>
            <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
            <Input type="number" step={step} value={apacheForm[key] ?? ''} onChange={e => setApacheForm(f => ({ ...f, [key]: e.target.value }))} className="h-9 mt-1" />
        </div>
    );

    const submitApache = async () => {
        setApacheBusy(true);
        const n = (k: string) => (apacheForm[k] ? Number(apacheForm[k]) : undefined);
        try {
            const result = await icuApi.recordApacheScore(admissionId, {
                temperature: n('temperature'), mapValue: n('mapValue'), heartRate: n('heartRate'), respiratoryRate: n('respiratoryRate'),
                fiO2: n('fiO2'), paO2: n('paO2'), arterialPh: n('arterialPh'), serumSodium: n('serumSodium'), serumPotassium: n('serumPotassium'),
                serumCreatinine: n('serumCreatinine'), isAcuteRenalFailure: apacheArf, hematocrit: n('hematocrit'), wbc: n('wbc'),
                gcsTotal: n('gcsTotal'), ageYears: n('ageYears'), chronicHealthCategory: apacheChronicHealth,
            }) as { totalScore?: number };
            toast({ title: `APACHE II score recorded — total ${result.totalScore ?? ''}` });
            setApacheOpen(false);
            loadApache();
        } catch (err) {
            toast({ title: 'Could not record score', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setApacheBusy(false);
        }
    };

    // ── SOFA ─────────────────────────────────────────────────────────────
    const openSofa = async () => {
        setSofaOpen(true);
        setSofaRespSupport(false);
        setSofaVasoTier('NONE');
        setSofaFetchingAutofill(true);
        try {
            const draft = await icuApi.getSofaAutoFill(admissionId);
            setSofaForm({
                mapValue: draft.mapValue != null ? String(draft.mapValue) : '',
                gcsTotal: draft.gcsTotal != null ? String(draft.gcsTotal) : '',
                urineOutputMlPerDay: draft.urineOutputMlPerDay != null ? String(draft.urineOutputMlPerDay) : '',
                paO2FiO2Ratio: '', plateletsCount: '', bilirubinMgDl: '', creatinineMgDl: '',
            });
        } catch {
            setSofaForm({});
        } finally {
            setSofaFetchingAutofill(false);
        }
    };

    const sofaField = (key: string, label: string, step = '1') => (
        <div>
            <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
            <Input type="number" step={step} value={sofaForm[key] ?? ''} onChange={e => setSofaForm(f => ({ ...f, [key]: e.target.value }))} className="h-9 mt-1" />
        </div>
    );

    const submitSofa = async () => {
        setSofaBusy(true);
        const n = (k: string) => (sofaForm[k] ? Number(sofaForm[k]) : undefined);
        try {
            const result = await icuApi.recordSofaScore(admissionId, {
                paO2FiO2Ratio: n('paO2FiO2Ratio'), onRespiratorySupport: sofaRespSupport, plateletsCount: n('plateletsCount'),
                bilirubinMgDl: n('bilirubinMgDl'), mapValue: n('mapValue'), vasopressorTier: sofaVasoTier, gcsTotal: n('gcsTotal'),
                creatinineMgDl: n('creatinineMgDl'), urineOutputMlPerDay: n('urineOutputMlPerDay'),
            }) as { totalScore?: number };
            toast({ title: `SOFA score recorded — total ${result.totalScore ?? ''}` });
            setSofaOpen(false);
            loadSofa();
        } catch (err) {
            toast({ title: 'Could not record score', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSofaBusy(false);
        }
    };

    const sofaTrendData = [...sofaHistory].reverse().map(s => ({ time: formatIstTime(s.scoredAt), total: s.totalScore }));
    // The trend matters more than any single value — flag it as a rising/falling signal right next
    // to the chart rather than making someone eyeball the line. sofaHistory is newest-first.
    const sofaTrend = sofaHistory.length >= 2
        ? sofaHistory[0].totalScore === sofaHistory[1].totalScore ? 'flat' : sofaHistory[0].totalScore > sofaHistory[1].totalScore ? 'rising' : 'falling'
        : null;

    return (
        <div className="space-y-5">
            {/* Level of Care */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Level of Care</h2>
                    {isActive && (
                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs self-start" onClick={() => { setLocOpen(o => !o); setLocLevel(currentLevel ?? 'LEVEL_1'); }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record level
                        </Button>
                    )}
                </div>

                {locLoading ? (
                    <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                ) : currentLevel ? (
                    <Badge variant="outline" className={cn('mt-2 text-[11px] font-bold', LEVEL_TONE[currentLevel])}>{LEVEL_LABEL[currentLevel]}</Badge>
                ) : (
                    <p className="text-sm text-slate-400 mt-2">No level of care recorded yet.</p>
                )}

                {locOpen && isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Level</Label>
                            <select value={locLevel} onChange={e => setLocLevel(e.target.value as IcuLevel)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                {(Object.keys(LEVEL_LABEL) as IcuLevel[]).map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Reason</Label>
                            <Textarea value={locReason} onChange={e => setLocReason(e.target.value)} rows={2} className="mt-1" />
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-10 sm:h-9" onClick={() => setLocOpen(false)}>Cancel</Button>
                            <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700" disabled={locBusy} onClick={submitLevelOfCare}>
                                {locBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save
                            </Button>
                        </div>
                    </div>
                )}

                {locHistory.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {locHistory.slice(1).map(h => (
                            <div key={h.icuLevelOfCareId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-xs text-slate-500">
                                <span>{LEVEL_LABEL[h.level]}{h.reason ? ` — ${h.reason}` : ''}</span>
                                <span className="shrink-0">{formatIstDateTime(h.assessedAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* APACHE II */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">APACHE II</h2>
                    {isActive && (
                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs self-start" onClick={openApache}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New score
                        </Button>
                    )}
                </div>

                {apacheLoading ? (
                    <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                ) : apacheHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 mt-2">No APACHE II score recorded yet.</p>
                ) : (
                    <div className="mt-2 space-y-1.5">
                        {apacheHistory.map((s, i) => (
                            <div key={s.apacheIIScoreId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-sm">
                                <span className={cn('font-bold', i === 0 ? 'text-slate-800' : 'text-slate-500')}>Total: {s.totalScore}</span>
                                <span className="text-[11px] text-slate-500 shrink-0">{s.scoredBy} · {formatIstDateTime(s.scoredAt)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {apacheOpen && isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        {apacheFetchingAutofill ? (
                            <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                        ) : (
                            <>
                                <p className="text-[11px] text-slate-400">Pre-filled from the latest vitals where available — review before saving. Lab values are always manual.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {apacheField('temperature', 'Temp (°C)', '0.1')}
                                    {apacheField('mapValue', 'MAP (mmHg)')}
                                    {apacheField('heartRate', 'Heart rate')}
                                    {apacheField('respiratoryRate', 'Resp. rate')}
                                    {apacheField('paO2', 'PaO2 (mmHg)', '0.1')}
                                    {apacheField('fiO2', 'FiO2 (0-1)', '0.01')}
                                    {apacheField('arterialPh', 'Arterial pH', '0.01')}
                                    {apacheField('gcsTotal', 'GCS total')}
                                    {apacheField('serumSodium', 'Sodium (mmol/L)')}
                                    {apacheField('serumPotassium', 'Potassium (mmol/L)', '0.1')}
                                    {apacheField('serumCreatinine', 'Creatinine (mg/dL)', '0.1')}
                                    {apacheField('hematocrit', 'Hematocrit (%)', '0.1')}
                                    {apacheField('wbc', 'WBC (x10³/µL)', '0.1')}
                                    {apacheField('ageYears', 'Age (years)')}
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input type="checkbox" checked={apacheArf} onChange={e => setApacheArf(e.target.checked)} className="h-4 w-4" />
                                    Acute renal failure (doubles creatinine points)
                                </label>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Chronic health</Label>
                                    <select value={apacheChronicHealth} onChange={e => setApacheChronicHealth(e.target.value as ChronicHealthCategory)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                        <option value="NONE">None</option>
                                        <option value="ELECTIVE_POSTOP">Organ insufficiency/immunocompromise — elective post-op</option>
                                        <option value="NONOPERATIVE_OR_EMERGENCY_POSTOP">Organ insufficiency/immunocompromise — nonoperative or emergency post-op</option>
                                    </select>
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                    <Button variant="ghost" size="sm" className="h-10 sm:h-9" onClick={() => setApacheOpen(false)}>Cancel</Button>
                                    <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700" disabled={apacheBusy} onClick={submitApache}>
                                        {apacheBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save score
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* SOFA */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> SOFA</h2>
                        {sofaTrend === 'rising' && (
                            <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> Rising — deteriorating
                            </Badge>
                        )}
                        {sofaTrend === 'falling' && (
                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> Improving
                            </Badge>
                        )}
                    </div>
                    {isActive && (
                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs self-start" onClick={openSofa}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New score
                        </Button>
                    )}
                </div>

                {sofaLoading ? (
                    <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                ) : sofaHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 mt-2">No SOFA score recorded yet.</p>
                ) : (
                    <div className="mt-2">
                        <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={sofaTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                <CartesianGrid stroke={GRID} vertical={false} />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
                                <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={24} domain={[0, 24]} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e1e0d9' }} labelStyle={{ fontWeight: 700, color: '#0b0b0b' }} />
                                <Line type="monotone" dataKey="total" name="SOFA total" stroke={SERIES_BLUE} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="mt-2 space-y-1.5">
                            {sofaHistory.map((s, i) => (
                                <div key={s.sofaScoreId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-sm">
                                    <span className={cn('font-bold', i === 0 ? 'text-slate-800' : 'text-slate-500')}>
                                        Total: {s.totalScore} <span className="font-normal text-slate-400">(R{s.respiratoryScore} C{s.coagulationScore} L{s.liverScore} CV{s.cardiovascularScore} CNS{s.cnsScore} Rn{s.renalScore})</span>
                                    </span>
                                    <span className="text-[11px] text-slate-500 shrink-0">{s.scoredBy} · {formatIstDateTime(s.scoredAt)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {sofaOpen && isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        {sofaFetchingAutofill ? (
                            <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                        ) : (
                            <>
                                <p className="text-[11px] text-slate-400">Pre-filled from the latest vitals/I-O where available — review before saving.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {sofaField('paO2FiO2Ratio', 'PaO2/FiO2 ratio', '0.1')}
                                    {sofaField('plateletsCount', 'Platelets (x10³/µL)', '0.1')}
                                    {sofaField('bilirubinMgDl', 'Bilirubin (mg/dL)', '0.1')}
                                    {sofaField('mapValue', 'MAP (mmHg)')}
                                    {sofaField('gcsTotal', 'GCS total')}
                                    {sofaField('creatinineMgDl', 'Creatinine (mg/dL)', '0.1')}
                                    {sofaField('urineOutputMlPerDay', 'Urine output (mL/24h)', '1')}
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input type="checkbox" checked={sofaRespSupport} onChange={e => setSofaRespSupport(e.target.checked)} className="h-4 w-4" />
                                    On mechanical ventilation / respiratory support
                                </label>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Vasopressor support</Label>
                                    <select value={sofaVasoTier} onChange={e => setSofaVasoTier(e.target.value as VasopressorTier)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                        <option value="NONE">None</option>
                                        <option value="MAP_LOW">MAP &lt; 70, no vasopressors</option>
                                        <option value="DOPAMINE_LOW_OR_DOBUTAMINE">Dopamine ≤5 or dobutamine (any dose)</option>
                                        <option value="DOPAMINE_MED_OR_EPI_LOW_OR_NOREPI_LOW">Dopamine &gt;5, or epinephrine/norepinephrine ≤0.1</option>
                                        <option value="DOPAMINE_HIGH_OR_EPI_HIGH_OR_NOREPI_HIGH">Dopamine &gt;15, or epinephrine/norepinephrine &gt;0.1</option>
                                    </select>
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                    <Button variant="ghost" size="sm" className="h-10 sm:h-9" onClick={() => setSofaOpen(false)}>Cancel</Button>
                                    <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700" disabled={sofaBusy} onClick={submitSofa}>
                                        {sofaBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save score
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Devices & Infection Prevention */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <DevicesPanel admissionId={admissionId} isActive={isActive} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <InfectionEventsPanel admissionId={admissionId} isActive={isActive} />
            </div>
        </div>
    );
};
