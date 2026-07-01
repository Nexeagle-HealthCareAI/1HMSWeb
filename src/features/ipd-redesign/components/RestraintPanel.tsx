import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, ShieldOff, Clock3 } from 'lucide-react';
import { restraintApi, type RestraintOrderItem } from '../services/restraintApi';
import { formatIstDateTime, toIstDate } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const INTERVAL_OPTIONS = [15, 30, 60, 120];

export const RestraintPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [orders, setOrders] = useState<RestraintOrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [startOpen, setStartOpen] = useState(false);
    const [restraintType, setRestraintType] = useState('');
    const [reason, setReason] = useState('');
    const [orderedByDoctorName, setOrderedByDoctorName] = useState('');
    const [monitoringIntervalMins, setMonitoringIntervalMins] = useState(30);
    const [familyNotified, setFamilyNotified] = useState(false);
    const [familyNotificationNotes, setFamilyNotificationNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [releasing, setReleasing] = useState<RestraintOrderItem | null>(null);
    const [releaseReason, setReleaseReason] = useState('');
    const [releaseBusy, setReleaseBusy] = useState(false);

    const load = () => {
        setLoading(true);
        restraintApi.getOrders(admissionId)
            .then(setOrders)
            .catch(() => toast({ title: 'Could not load restraint orders', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openStart = () => {
        setRestraintType(''); setReason(''); setOrderedByDoctorName(''); setMonitoringIntervalMins(30);
        setFamilyNotified(false); setFamilyNotificationNotes('');
        setStartOpen(true);
    };

    const submit = async () => {
        if (!restraintType.trim() || !reason.trim() || !orderedByDoctorName.trim() || submitting) {
            toast({ title: 'Incomplete', description: 'Type, reason and ordering doctor are required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await restraintApi.start(admissionId, {
                restraintType: restraintType.trim(),
                reason: reason.trim(),
                orderedByDoctorName: orderedByDoctorName.trim(),
                monitoringIntervalMins,
                familyNotified,
                familyNotificationNotes: familyNotified ? (familyNotificationNotes || undefined) : undefined,
            });
            toast({ title: 'Restraint started.' });
            setStartOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not start restraint', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const confirmRelease = async () => {
        if (!releasing) return;
        setReleaseBusy(true);
        try {
            await restraintApi.release(releasing.restraintOrderId, releaseReason || undefined);
            toast({ title: 'Restraint released.' });
            setReleasing(null);
            setReleaseReason('');
            load();
        } catch (err) {
            toast({ title: 'Could not release', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReleaseBusy(false);
        }
    };

    const active = orders.find(o => o.statusCode === 'ACTIVE');
    const history = orders.filter(o => o.statusCode !== 'ACTIVE');

    const nextCheckDue = (order: RestraintOrderItem): string => {
        const start = toIstDate(order.startedAt).getTime();
        const intervalMs = order.monitoringIntervalMins * 60 * 1000;
        const elapsed = Date.now() - start;
        const nextDue = start + (Math.floor(elapsed / intervalMs) + 1) * intervalMs;
        return formatIstDateTime(new Date(nextDue).toISOString());
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Restraint</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && !active && (
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openStart}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Start restraint
                        </Button>
                    )}
                </div>
            </div>

            {loading && orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
                <>
                    {active && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <ShieldOff className="h-4 w-4 text-rose-600" />
                                    <span className="font-bold text-rose-800">{active.restraintType}</span>
                                    <Badge variant="outline" className="text-[9px] font-bold bg-rose-100 text-rose-700 border-rose-300">ACTIVE</Badge>
                                </div>
                                {isActive && (
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setReleasing(active); setReleaseReason(''); }}>Release</Button>
                                )}
                            </div>
                            <p className="text-[13px] text-slate-700 mt-2">{active.reason}</p>
                            <p className="text-[11px] text-slate-500 mt-1">Ordered by {active.orderedByDoctorName} · Started {formatIstDateTime(active.startedAt)}</p>
                            <p className="text-[11px] font-semibold text-rose-700 mt-1.5 flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" /> Next check due: {nextCheckDue(active)} (every {active.monitoringIntervalMins} min)
                            </p>
                            {active.familyNotified && <p className="text-[11px] text-slate-500 mt-1">Family notified{active.familyNotificationNotes ? ` — ${active.familyNotificationNotes}` : ''}</p>}
                        </div>
                    )}

                    {!active && !loading && (
                        <div className="py-8 text-center text-sm text-slate-400">No active restraint order.</div>
                    )}

                    {history.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">History</h3>
                            {history.map(o => (
                                <div key={o.restraintOrderId} className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <span className="font-semibold text-slate-800">{o.restraintType}</span>
                                        <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 text-slate-500">RELEASED</Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">{formatIstDateTime(o.startedAt)} → {o.releasedAt ? formatIstDateTime(o.releasedAt) : '—'}</p>
                                    {o.releaseReason && <p className="text-[11px] text-slate-400 italic">{o.releaseReason}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <Dialog open={startOpen} onOpenChange={setStartOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Start restraint</DialogTitle>
                        <DialogDescription>Requires a physician order (NABH).</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Restraint type *</Label>
                        <Input value={restraintType} onChange={e => setRestraintType(e.target.value)} className="h-9 mt-1" placeholder="e.g. Physical - wrist" />
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Reason *</Label>
                        <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} className="text-sm mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Ordering doctor *</Label>
                            <Input value={orderedByDoctorName} onChange={e => setOrderedByDoctorName(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Monitoring interval</Label>
                            <select value={monitoringIntervalMins} onChange={e => setMonitoringIntervalMins(parseInt(e.target.value, 10))} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                {INTERVAL_OPTIONS.map(i => <option key={i} value={i}>{i} min</option>)}
                            </select>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input type="checkbox" checked={familyNotified} onChange={e => setFamilyNotified(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                        Family notified
                    </label>
                    {familyNotified && (
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Notification notes</Label>
                            <Input value={familyNotificationNotes} onChange={e => setFamilyNotificationNotes(e.target.value)} className="h-9 mt-1" placeholder="Optional" />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button>
                        <Button disabled={!restraintType.trim() || !reason.trim() || !orderedByDoctorName.trim() || submitting} onClick={submit} className="bg-rose-600 hover:bg-rose-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Start
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!releasing} onOpenChange={(o) => { if (!o) setReleasing(null); }}>
                <DialogContent className="max-w-sm">
                    {releasing && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Release restraint?</DialogTitle>
                                <DialogDescription>{releasing.restraintType}</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                                <Textarea rows={2} value={releaseReason} onChange={e => setReleaseReason(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setReleasing(null)}>Cancel</Button>
                                <Button disabled={releaseBusy} className="bg-brand-600 hover:bg-brand-700" onClick={confirmRelease}>
                                    {releaseBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Release
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
