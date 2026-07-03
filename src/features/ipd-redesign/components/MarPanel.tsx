import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Loader2, Check, ShieldAlert, Clock3, Plus } from 'lucide-react';
import { marApi, type MarLineItem, type MarSlotItem, type MedicationActionStatus } from '../services/marApi';
import { formatIstTime, formatIstDayLabel, istDateKey, istDayStartUtc } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
    patientName?: string | null;
}

const ACTIONS: { key: MedicationActionStatus; label: string }[] = [
    { key: 'ADMINISTERED', label: 'Administered' },
    { key: 'HELD', label: 'Held' },
    { key: 'REFUSED', label: 'Refused' },
    { key: 'PATIENT_NOT_AVAILABLE', label: 'Patient not available' },
];

const slotStyles = (status: MarSlotItem['status']): string => {
    switch (status) {
        case 'ADMINISTERED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'DUE': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'OVERDUE': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'MISSED': return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'HELD': case 'REFUSED': case 'PATIENT_NOT_AVAILABLE': return 'bg-slate-100 text-slate-600 border-slate-200';
        default: return 'bg-slate-50 text-slate-500 border-slate-200';   // PENDING
    }
};

// A nurse can act on a computed slot that's due/overdue/missed, or on a pending one ahead of
// time (e.g. giving a dose slightly early) — but not re-act on one already resolved.
const isActionable = (status: MarSlotItem['status']): boolean =>
    ['PENDING', 'DUE', 'OVERDUE', 'MISSED'].includes(status);

/**
 * MAR — nurse-side dose recording for this admission's MEDICATION CPOE orders. Not built on top
 * of ClinicalOrderPanel (the day-grid-of-slots shape is different enough from an order-entry-and-
 * list panel to not force a shared abstraction). One IST calendar day at a time; missed-dose
 * status is computed server-side purely from viewing the grid — nothing is persisted until a
 * nurse actually acts (see GetMarGridHandler/MarScheduleCalculator).
 */
export const MarPanel: React.FC<Props> = ({ admissionId, isActive, patientName }) => {
    const { toast } = useToast();
    const [dayKey, setDayKey] = useState(() => istDateKey(new Date()));
    const [lines, setLines] = useState<MarLineItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [acting, setActing] = useState<{ line: MarLineItem; slot: MarSlotItem | null } | null>(null);
    const [actionStatus, setActionStatus] = useState<MedicationActionStatus>('ADMINISTERED');
    const [administeredDose, setAdministeredDose] = useState('');
    const [administeredRoute, setAdministeredRoute] = useState('');
    const [administrationSite, setAdministrationSite] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [fiveRightsConfirmed, setFiveRightsConfirmed] = useState(false);
    const [witnessName, setWitnessName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        const dayStartUtc = istDayStartUtc(dayKey).toISOString();
        marApi.getGrid(admissionId, dayStartUtc)
            .then(setLines)
            .catch(() => toast({ title: 'Could not load MAR', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const shiftDay = (delta: number) => {
        const d = istDayStartUtc(dayKey);
        d.setUTCDate(d.getUTCDate() + delta);
        setDayKey(istDateKey(d));
    };

    const openAdminister = (line: MarLineItem, slot: MarSlotItem | null) => {
        setActing({ line, slot });
        setActionStatus('ADMINISTERED');
        setAdministeredDose(line.dose ?? '');
        setAdministeredRoute(line.route ?? '');
        setAdministrationSite('');
        setReason('');
        setNotes('');
        setFiveRightsConfirmed(false);
        setWitnessName('');
    };

    const needsWitness = !!acting?.line.isHighAlert;
    const canSubmit = !!acting
        && fiveRightsConfirmed
        && (!needsWitness || witnessName.trim().length > 0)
        && (actionStatus === 'ADMINISTERED' || reason.trim().length > 0);

    const submit = async () => {
        if (!acting || !canSubmit || submitting) return;
        setSubmitting(true);
        try {
            const scheduledFor = acting.slot ? acting.slot.scheduledForUtc : new Date().toISOString();
            await marApi.record(acting.line.orderLineId, scheduledFor, actionStatus, {
                administeredDose: administeredDose || undefined,
                administeredRoute: administeredRoute || undefined,
                administrationSite: administrationSite || undefined,
                reason: reason || undefined,
                notes: notes || undefined,
                fiveRightsConfirmed,
                witnessName: needsWitness ? witnessName : undefined,
            });
            toast({ title: `${acting.line.itemName ?? 'Dose'} recorded.` });
            setActing(null);
            load();
        } catch (err) {
            toast({ title: 'Could not record', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const dayLabel = formatIstDayLabel(istDayStartUtc(dayKey));
    const isToday = dayKey === istDateKey(new Date());

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Medication Administration</h2>
                <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className={cn('text-xs font-bold px-2', isToday ? 'text-brand-700' : 'text-slate-600')}>{dayLabel}{isToday ? ' · Today' : ''}</span>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            {loading && lines.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading MAR…</div>
            ) : lines.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No active medication orders for this day.</div>
            ) : (
                <div className="space-y-3">
                    {lines.map(line => (
                        <div key={line.orderLineId} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={cn('font-semibold text-slate-900', line.orderLineStatusCode === 'DISCONTINUED' && 'line-through text-slate-400')}>{line.itemName}</span>
                                        {line.isHighAlert && <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200"><ShieldAlert className="h-3 w-3 mr-1" />HIGH ALERT</Badge>}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        {[line.dose, line.route, line.frequency].filter(Boolean).join(' · ') || '—'}
                                    </p>
                                    {line.instructions && <p className="text-[11px] text-slate-400 italic mt-0.5">{line.instructions}</p>}
                                </div>
                                {isActive && line.isAdHocOnly && (
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openAdminister(line, null)}>
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Log PRN dose
                                    </Button>
                                )}
                            </div>

                            {line.slots.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {line.slots.map((slot, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={!isActive || !isActionable(slot.status)}
                                            onClick={() => openAdminister(line, slot)}
                                            className={cn(
                                                'h-8 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors',
                                                slotStyles(slot.status),
                                                isActive && isActionable(slot.status) ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                                            )}
                                            title={slot.actedBy ? `${slot.status} by ${slot.actedBy}` : slot.status}
                                        >
                                            <Clock3 className="h-3 w-3" /> {formatIstTime(slot.scheduledForUtc)} · {slot.status}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Administer dialog */}
            <Dialog open={!!acting} onOpenChange={(o) => { if (!o) setActing(null); }}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    {acting && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{acting.line.itemName}</DialogTitle>
                                <DialogDescription>
                                    {acting.slot ? `Scheduled ${formatIstTime(acting.slot.scheduledForUtc)} IST` : 'Ad-hoc / PRN dose, now'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
                                <p><span className="font-bold text-slate-500">Patient</span> — {patientName || '—'}</p>
                                <p><span className="font-bold text-slate-500">Drug</span> — {acting.line.itemName}{acting.line.saltName ? ` (${acting.line.saltName})` : ''}</p>
                                <p><span className="font-bold text-slate-500">Dose</span> — {acting.line.dose || '—'}</p>
                                <p><span className="font-bold text-slate-500">Route</span> — {acting.line.route || '—'}</p>
                                <p><span className="font-bold text-slate-500">Time</span> — {acting.slot ? formatIstTime(acting.slot.scheduledForUtc) : 'Now'}</p>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <input type="checkbox" checked={fiveRightsConfirmed} onChange={e => setFiveRightsConfirmed(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                I have verified all 5 rights above
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                {ACTIONS.map(a => (
                                    <button key={a.key} type="button" onClick={() => setActionStatus(a.key)}
                                        className={cn('h-9 rounded-lg border text-xs font-bold transition-colors',
                                            actionStatus === a.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>

                            {actionStatus === 'ADMINISTERED' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Dose given</Label>
                                        <Input value={administeredDose} onChange={e => setAdministeredDose(e.target.value)} className="h-9 mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Route</Label>
                                        <Input value={administeredRoute} onChange={e => setAdministeredRoute(e.target.value)} className="h-9 mt-1" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-[11px] font-semibold text-slate-600">Site (optional)</Label>
                                        <Input value={administrationSite} onChange={e => setAdministrationSite(e.target.value)} className="h-9 mt-1" placeholder="e.g. Left forearm" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Reason *</Label>
                                    <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} className="text-sm mt-1" placeholder="Required" />
                                </div>
                            )}

                            {needsWitness && (
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Witness name * (high-alert medication)</Label>
                                    <Input value={witnessName} onChange={e => setWitnessName(e.target.value)} className="h-9 mt-1" placeholder="Second nurse verifying this dose" />
                                </div>
                            )}

                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                                <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="outline" onClick={() => setActing(null)}>Cancel</Button>
                                <Button disabled={!canSubmit || submitting} onClick={submit} className="bg-brand-600 hover:bg-brand-700">
                                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Record
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
