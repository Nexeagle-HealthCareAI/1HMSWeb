import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Siren, Loader2, Check } from 'lucide-react';
import { earlyWarningApi, type EarlyWarningScoreEntry } from '../services/earlyWarningApi';
import { rapidResponseApi, type RapidResponseActivation, type RrtTriggerReason, type RrtOutcome } from '../services/rapidResponseApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
}

/**
 * Surfaces on the Overview tab whenever the latest Early Warning Score is Medium/High risk, or a
 * Rapid Response is currently open for this admission -- the "within-ICU deterioration" and
 * ward-escalation signal from the ICU redesign spec, made visible where staff already look first
 * rather than requiring a trip to the Vitals tab. Renders nothing when there's nothing to flag.
 */
export const DeteriorationAlertBanner: React.FC<Props> = ({ admissionId }) => {
    const { toast } = useToast();
    const [latestEws, setLatestEws] = useState<EarlyWarningScoreEntry | null>(null);
    const [openRrt, setOpenRrt] = useState<RapidResponseActivation | null>(null);
    const [loading, setLoading] = useState(true);

    const [activateOpen, setActivateOpen] = useState(false);
    const [triggerReason, setTriggerReason] = useState<RrtTriggerReason>('HIGH_EWS');
    const [respondingTeam, setRespondingTeam] = useState('');
    const [activateBusy, setActivateBusy] = useState(false);

    const [resolveOpen, setResolveOpen] = useState(false);
    const [outcome, setOutcome] = useState<RrtOutcome>('STABILIZED_ON_WARD');
    const [outcomeNotes, setOutcomeNotes] = useState('');
    const [resolveBusy, setResolveBusy] = useState(false);
    const [arriveBusy, setArriveBusy] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([earlyWarningApi.getHistory(admissionId), rapidResponseApi.getHistory(admissionId)])
            .then(([ews, rrt]) => {
                setLatestEws(ews[0] ?? null);
                setOpenRrt(rrt.find(a => !a.resolvedAt) ?? null);
            })
            .catch(() => { setLatestEws(null); setOpenRrt(null); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const escalationRisk = latestEws && (latestEws.riskBand === 'MEDIUM' || latestEws.riskBand === 'HIGH');
    if (loading || (!escalationRisk && !openRrt)) return null;

    const activate = async () => {
        setActivateBusy(true);
        try {
            await rapidResponseApi.activate(admissionId, triggerReason, latestEws?.totalScore, respondingTeam || undefined);
            toast({ title: 'Rapid Response activated.' });
            setActivateOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not activate Rapid Response', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setActivateBusy(false);
        }
    };

    const markArrived = async () => {
        if (!openRrt) return;
        setArriveBusy(true);
        try {
            await rapidResponseApi.markArrived(openRrt.activationId);
            toast({ title: 'Marked as arrived.' });
            load();
        } catch (err) {
            toast({ title: 'Could not record arrival', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setArriveBusy(false);
        }
    };

    const resolve = async () => {
        if (!openRrt) return;
        setResolveBusy(true);
        try {
            await rapidResponseApi.resolve(openRrt.activationId, outcome, outcomeNotes || undefined);
            toast({ title: 'Rapid Response resolved.' });
            setResolveOpen(false);
            setOutcomeNotes('');
            load();
        } catch (err) {
            toast({ title: 'Could not resolve Rapid Response', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setResolveBusy(false);
        }
    };

    return (
        <div className={cn(
            'rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
            openRrt ? 'border-rose-300 bg-rose-50' : latestEws?.riskBand === 'HIGH' ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50',
        )}>
            <div className="flex items-start gap-2.5">
                {openRrt ? <Siren className="h-5 w-5 text-rose-600 mt-0.5 shrink-0 animate-pulse" /> : <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />}
                <div>
                    {openRrt ? (
                        <>
                            <p className="text-sm font-bold text-rose-800">Rapid Response active</p>
                            <p className="text-xs text-rose-700 mt-0.5">
                                Called {formatIstDateTime(openRrt.calledAt)} by {openRrt.calledBy}
                                {openRrt.respondingTeam ? ` · ${openRrt.respondingTeam}` : ''}
                                {openRrt.arrivedAt ? ` · Arrived ${formatIstDateTime(openRrt.arrivedAt)}` : ' · Awaiting arrival'}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className={cn('text-sm font-bold', latestEws?.riskBand === 'HIGH' ? 'text-rose-800' : 'text-amber-800')}>
                                Early Warning Score {latestEws?.totalScore} — {latestEws?.riskBand.replace('_', ' ')} risk
                            </p>
                            <p className={cn('text-xs mt-0.5', latestEws?.riskBand === 'HIGH' ? 'text-rose-700' : 'text-amber-700')}>
                                Scored {latestEws ? formatIstDateTime(latestEws.scoredAt) : ''} — consider a Rapid Response review.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {openRrt ? (
                    <>
                        {!openRrt.arrivedAt && (
                            <Button size="sm" variant="outline" className="h-9 text-xs" disabled={arriveBusy} onClick={markArrived}>
                                {arriveBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null} Mark arrived
                            </Button>
                        )}
                        <Button size="sm" className="h-9 text-xs bg-rose-600 hover:bg-rose-700" onClick={() => setResolveOpen(true)}>
                            Resolve
                        </Button>
                    </>
                ) : (
                    <Button size="sm" className="h-9 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => { setTriggerReason('HIGH_EWS'); setRespondingTeam(''); setActivateOpen(true); }}>
                        <Siren className="h-3.5 w-3.5 mr-1.5" /> Activate Rapid Response
                    </Button>
                )}
            </div>

            <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Activate Rapid Response</DialogTitle>
                        <DialogDescription>Logs who was called and starts the response-time clock.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Trigger reason</Label>
                        <select value={triggerReason} onChange={e => setTriggerReason(e.target.value as RrtTriggerReason)} className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                            <option value="HIGH_EWS">High Early Warning Score</option>
                            <option value="NURSE_CONCERN">Nurse's clinical concern</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Responding team</Label>
                        <Input value={respondingTeam} onChange={e => setRespondingTeam(e.target.value)} className="h-10 mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setActivateOpen(false)}>Cancel</Button>
                        <Button disabled={activateBusy} className="h-11 sm:h-10 bg-rose-600 hover:bg-rose-700" onClick={activate}>
                            {activateBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Siren className="h-4 w-4 mr-2" />} Activate
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Resolve Rapid Response</DialogTitle>
                        <DialogDescription>Record the outcome of this activation.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Outcome</Label>
                        <select value={outcome} onChange={e => setOutcome(e.target.value as RrtOutcome)} className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                            <option value="STABILIZED_ON_WARD">Stabilized on ward</option>
                            <option value="TRANSFERRED_ICU">Transferred to ICU</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                        <Textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} rows={2} className="mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setResolveOpen(false)}>Cancel</Button>
                        <Button disabled={resolveBusy} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700" onClick={resolve}>
                            {resolveBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Resolve
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
