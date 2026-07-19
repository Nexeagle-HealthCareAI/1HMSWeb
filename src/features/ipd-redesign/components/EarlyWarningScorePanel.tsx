import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Check, ActivitySquare } from 'lucide-react';
import { earlyWarningApi, type EarlyWarningScoreEntry, type EwsConsciousnessLevel } from '../services/earlyWarningApi';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const RISK_TONE: Record<string, string> = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LOW_MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-orange-50 text-orange-700 border-orange-200',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** NEWS2-style deterioration score — a general "vitals" capability (mounted here, under the ward
 *  Vitals tab), not ICU-gated: a deteriorating ward patient should be flagged before a crisis, not
 *  only tracked once they reach ICU. See DeteriorationAlertBanner for the escalation surface this
 *  feeds on the Overview tab, and the ICU Board's EWS badge for the at-a-glance version. */
export const EarlyWarningScorePanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [history, setHistory] = useState<EarlyWarningScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const [respiratoryRate, setRespiratoryRate] = useState('');
    const [spo2, setSpo2] = useState('');
    const [supplementalOxygen, setSupplementalOxygen] = useState(false);
    const [systolicBp, setSystolicBp] = useState('');
    const [pulse, setPulse] = useState('');
    const [consciousnessLevel, setConsciousnessLevel] = useState<EwsConsciousnessLevel>('ALERT');
    const [temperatureC, setTemperatureC] = useState('');

    const load = () => {
        setLoading(true);
        earlyWarningApi.getHistory(admissionId)
            .then(setHistory)
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openDialog = () => {
        if (isSubscriptionReadOnly) { blockAction('Recording early warning scores'); return; }
        earlyWarningApi.getAutoFill(admissionId).then(fill => {
            setRespiratoryRate(fill.respiratoryRate != null ? String(fill.respiratoryRate) : '');
            setSpo2(fill.spo2 != null ? String(fill.spo2) : '');
            setSystolicBp(fill.systolicBp != null ? String(fill.systolicBp) : '');
            setPulse(fill.pulse != null ? String(fill.pulse) : '');
            setTemperatureC(fill.temperatureC != null ? String(fill.temperatureC) : '');
        }).catch(() => {});
        setSupplementalOxygen(false);
        setConsciousnessLevel('ALERT');
        setOpen(true);
    };

    const submit = async () => {
        if (isSubscriptionReadOnly) { blockAction('Recording early warning scores'); return; }
        setBusy(true);
        try {
            const res = await earlyWarningApi.recordScore(admissionId, {
                respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
                spo2: spo2 ? Number(spo2) : undefined,
                supplementalOxygen,
                systolicBp: systolicBp ? Number(systolicBp) : undefined,
                pulse: pulse ? Number(pulse) : undefined,
                consciousnessLevel,
                temperatureC: temperatureC ? Number(temperatureC) : undefined,
            });
            toast({
                title: `EWS recorded — ${res.totalScore} (${res.riskBand?.replace('_', ' ')})`,
                variant: res.escalationRecommended ? 'destructive' : 'default',
            });
            setOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not record score', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const latest = history[0];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <ActivitySquare className="h-3.5 w-3.5" /> Early Warning Score
                    </h2>
                    {latest && (
                        <Badge variant="outline" className={cn('text-[10px] font-bold', RISK_TONE[latest.riskBand])}>
                            {latest.totalScore} · {latest.riskBand.replace('_', ' ')}
                        </Badge>
                    )}
                </div>
                {isActive && (
                    <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs self-start" onClick={openDialog} disabled={isSubscriptionReadOnly}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Record score
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="py-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : history.length === 0 ? (
                <p className="text-sm text-slate-400 mt-2">No Early Warning Score recorded yet.</p>
            ) : (
                <div className="mt-3 space-y-1.5">
                    {history.slice(0, 5).map(h => (
                        <div key={h.scoreId} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 text-sm flex-wrap">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('text-[10px] font-bold', RISK_TONE[h.riskBand])}>{h.totalScore}</Badge>
                                <span className="text-slate-600 text-xs">{h.riskBand.replace('_', ' ')}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">{formatIstDateTime(h.scoredAt)} · {h.scoredBy}</span>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Early Warning Score</DialogTitle>
                        <DialogDescription>Pulled from the latest vitals where available — confirm oxygen use and consciousness.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Resp. rate</Label>
                            <Input type="number" value={respiratoryRate} onChange={e => setRespiratoryRate(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">SpO2 %</Label>
                            <Input type="number" step="0.1" value={spo2} onChange={e => setSpo2(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Systolic BP</Label>
                            <Input type="number" value={systolicBp} onChange={e => setSystolicBp(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Pulse</Label>
                            <Input type="number" value={pulse} onChange={e => setPulse(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Temperature (°C)</Label>
                            <Input type="number" step="0.1" value={temperatureC} onChange={e => setTemperatureC(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Consciousness</Label>
                            <select value={consciousnessLevel} onChange={e => setConsciousnessLevel(e.target.value as EwsConsciousnessLevel)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                <option value="ALERT">Alert</option>
                                <option value="VOICE">Responds to voice</option>
                                <option value="PAIN">Responds to pain</option>
                                <option value="UNRESPONSIVE">Unresponsive</option>
                                <option value="CONFUSION_NEW">New confusion</option>
                            </select>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input type="checkbox" checked={supplementalOxygen} onChange={e => setSupplementalOxygen(e.target.checked)} className="h-4 w-4" /> On supplemental oxygen
                    </label>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="ghost" className="h-10 sm:h-9" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button disabled={busy || isSubscriptionReadOnly} onClick={submit} className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700">
                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
