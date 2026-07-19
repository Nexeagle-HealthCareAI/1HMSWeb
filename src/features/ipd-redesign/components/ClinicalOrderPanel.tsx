import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Trash2, RefreshCw } from 'lucide-react';
import {
    clinicalOrderApi, type ClinicalOrderItem, type ClinicalOrderLineInput, type ClinicalOrderType, type OrderUrgency, type MedicationFrequency,
} from '../services/clinicalOrderApi';
import { ipdBillingService, type ChargeMaster } from '@/features/billing/services/ipdBillingService';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

const EMPTY_LINE: ClinicalOrderLineInput = { itemName: '', dose: '', route: '', frequency: '', durationDays: undefined, instructions: '', urgency: undefined, scheduledAt: undefined, isHighAlert: false, isDailyRecurringCharge: false, qty: 1 };

const URGENCIES: OrderUrgency[] = ['ROUTINE', 'URGENT', 'STAT'];

// Categories where "accrue daily instead of once" makes clinical sense — oxygen therapy and
// continuous monitoring are ongoing services, not one-off items.
const RECURRING_ELIGIBLE_CATEGORIES = ['OXYGEN', 'MONITORING'];

// Fixed dosing frequencies — MEDICATION orders use this dropdown (drives MAR's computed dose
// schedule); every other order type keeps a free-text Frequency input.
const MEDICATION_FREQUENCIES: MedicationFrequency[] = ['STAT', 'OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'SOS'];

interface Props {
    admissionId: string;
    isActive: boolean;
    orderType: ClinicalOrderType;
    itemPickerCategoryCodes: string[];
    itemLabel: string;
    noItemsText: string;
    showMedicationFields?: boolean;
    showUrgency?: boolean;
    showScheduledAt?: boolean;
}

/**
 * One CPOE order-entry panel, reused for every order type (Medication/Lab/Radiology/Procedure/
 * Diet/Nursing) — each tab in PatientWorkspace renders this with different props rather than
 * duplicating the order-list/new-order/discontinue UI per type.
 */
export const ClinicalOrderPanel: React.FC<Props> = ({
    admissionId, isActive, orderType, itemPickerCategoryCodes, itemLabel, noItemsText,
    showMedicationFields, showUrgency, showScheduledAt,
}) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [orders, setOrders] = useState<ClinicalOrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerItems, setPickerItems] = useState<ChargeMaster[]>([]);

    const [newOpen, setNewOpen] = useState(false);
    const [lines, setLines] = useState<ClinicalOrderLineInput[]>([{ ...EMPTY_LINE }]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [discontinuing, setDiscontinuing] = useState<{ orderLineId: string; itemName: string } | null>(null);
    const [discontinueReason, setDiscontinueReason] = useState('');
    const [discontinueBusy, setDiscontinueBusy] = useState(false);

    const load = () => {
        setLoading(true);
        clinicalOrderApi.getOrders(admissionId, orderType)
            .then(setOrders)
            .catch(() => toast({ title: `Could not load ${itemLabel.toLowerCase()} orders`, variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId, orderType]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        ipdBillingService.listChargeMasters({ pageSize: 500 })
            .then(r => setPickerItems(r.items.filter(c => c.isActive
                && itemPickerCategoryCodes.some(code => c.appliesTo === code || c.categoryCode === code))))
            .catch(() => setPickerItems([]));
    }, [itemPickerCategoryCodes]); // eslint-disable-line react-hooks/exhaustive-deps

    const openNew = () => {
        if (isSubscriptionReadOnly) { blockAction('Placing orders'); return; }
        setLines([{ ...EMPTY_LINE }]); setNotes(''); setNewOpen(true);
    };
    const addLine = () => setLines(ls => [...ls, { ...EMPTY_LINE }]);
    const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
    const setLine = (i: number, patch: Partial<ClinicalOrderLineInput>) =>
        setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

    const pickItem = (i: number, chargeId: string) => {
        const item = pickerItems.find(p => p.chargeId === chargeId);
        setLine(i, { chargeId: chargeId || undefined, itemName: item?.displayName ?? lines[i].itemName });
    };

    const canSubmit = lines.length > 0 && lines.every(l => l.itemName.trim().length > 0);

    const submit = async () => {
        if (!canSubmit || submitting) {
            toast({ title: 'Incomplete', description: `Every line needs a ${itemLabel.toLowerCase()}.`, variant: 'destructive' });
            return;
        }
        if (isSubscriptionReadOnly) { blockAction('Placing orders'); return; }
        setSubmitting(true);
        try {
            await clinicalOrderApi.placeOrder(admissionId, orderType, lines, notes || undefined);
            toast({ title: 'Order placed.' });
            setNewOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not place order', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDiscontinue = async () => {
        if (!discontinuing) return;
        if (isSubscriptionReadOnly) { blockAction('Discontinuing orders'); return; }
        setDiscontinueBusy(true);
        try {
            await clinicalOrderApi.discontinueLine(discontinuing.orderLineId, discontinueReason || undefined);
            toast({ title: `${discontinuing.itemName} discontinued.` });
            setDiscontinuing(null);
            setDiscontinueReason('');
            load();
        } catch (err) {
            toast({ title: 'Could not discontinue', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDiscontinueBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{itemLabel} Orders</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={load} disabled={loading}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openNew} disabled={isSubscriptionReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New order
                        </Button>
                    )}
                </div>
            </div>

            {loading && orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders…</div>
            ) : orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">{noItemsText}</div>
            ) : (
                <div className="space-y-3">
                    {orders.map(o => (
                        <div key={o.orderId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">{formatIstDateTime(o.orderedAt)}</span>
                                    {o.orderedBy && <span className="text-[11px] text-slate-500">· {o.orderedBy}</span>}
                                </div>
                                <Badge variant="outline" className={cn('text-[10px] font-bold',
                                    o.statusCode === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500')}>
                                    {o.statusCode}
                                </Badge>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {o.lines.map(l => (
                                    <div key={l.orderLineId} className="px-4 py-3 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn('font-semibold text-slate-900', l.statusCode === 'DISCONTINUED' && 'line-through text-slate-400')}>{l.itemName}</span>
                                                {l.urgency && l.urgency !== 'ROUTINE' && (
                                                    <Badge variant="outline" className={cn('text-[9px] font-bold', l.urgency === 'STAT' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                                        {l.urgency}
                                                    </Badge>
                                                )}
                                                {l.isHighAlert && <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200">HIGH ALERT</Badge>}
                                                {l.isDailyRecurringCharge && <Badge variant="outline" className="text-[9px] font-bold bg-sky-50 text-sky-700 border-sky-200">DAILY CHARGE</Badge>}
                                                {l.statusCode === 'DISCONTINUED' && <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500">DISCONTINUED</Badge>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {[l.dose, l.route, l.frequency, l.durationDays ? `${l.durationDays}d` : null, l.scheduledAt ? `Scheduled ${formatIstDateTime(l.scheduledAt)}` : null].filter(Boolean).join(' · ') || '—'}
                                            </p>
                                            {l.instructions && <p className="text-[11px] text-slate-400 italic mt-0.5">{l.instructions}</p>}
                                            <p className="text-[11px] mt-1">
                                                {l.chargeEventId ? (
                                                    l.chargeVoided
                                                        ? <span className="text-slate-400">Charge voided</span>
                                                        : <span className="text-emerald-700 font-semibold">Charged ₹{l.chargedAmount?.toLocaleString('en-IN')}</span>
                                                ) : <span className="text-slate-400">Not billed</span>}
                                            </p>
                                        </div>
                                        {l.statusCode === 'ACTIVE' && isActive && (
                                            <Button size="sm" variant="ghost" className="h-9 sm:h-8 text-xs text-slate-400 hover:text-rose-600 shrink-0"
                                                onClick={() => { if (isSubscriptionReadOnly) { blockAction('Discontinuing orders'); return; } setDiscontinuing({ orderLineId: l.orderLineId, itemName: l.itemName || 'this item' }); setDiscontinueReason(''); }}>
                                                <X className="h-3.5 w-3.5 mr-1" /> Discontinue
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New order dialog */}
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New {itemLabel.toLowerCase()} order</DialogTitle>
                        <DialogDescription>Chargeable lines are billed to this admission immediately.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {lines.map((line, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2 relative">
                                {lines.length > 1 && (
                                    <button type="button" onClick={() => removeLine(i)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Billed item (optional — links billing)</Label>
                                        <select value={line.chargeId ?? ''} onChange={e => pickItem(i, e.target.value)}
                                            className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                            <option value="">— Free text (no billing link) —</option>
                                            {pickerItems.map(p => (
                                                <option key={p.chargeId} value={p.chargeId}>{p.displayName} · ₹{p.defaultRate.toLocaleString('en-IN')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">{itemLabel} *</Label>
                                        <Input value={line.itemName} onChange={e => setLine(i, { itemName: e.target.value })} className="h-9 mt-1" placeholder={`e.g. ${itemLabel}`} />
                                    </div>
                                </div>

                                {(() => {
                                    const pickedItem = pickerItems.find(p => p.chargeId === line.chargeId);
                                    const recurringEligible = !!pickedItem && RECURRING_ELIGIBLE_CATEGORIES.includes((pickedItem.categoryCode || '').toUpperCase());
                                    if (!recurringEligible) return null;
                                    return (
                                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                            <input type="checkbox" checked={!!line.isDailyRecurringCharge} onChange={e => setLine(i, { isDailyRecurringCharge: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                                            Recurring daily charge (bills once per day this stays active, instead of once now)
                                        </label>
                                    );
                                })()}

                                {showMedicationFields && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-600">Dose</Label>
                                            <Input value={line.dose ?? ''} onChange={e => setLine(i, { dose: e.target.value })} className="h-9 mt-1" placeholder="500 mg" />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-600">Route</Label>
                                            <Input value={line.route ?? ''} onChange={e => setLine(i, { route: e.target.value })} className="h-9 mt-1" placeholder="PO / IV" />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-600">Frequency</Label>
                                            {orderType === 'MEDICATION' ? (
                                                <select value={line.frequency ?? ''} onChange={e => setLine(i, { frequency: e.target.value })}
                                                    className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                                    <option value="">— Select —</option>
                                                    {MEDICATION_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            ) : (
                                                <Input value={line.frequency ?? ''} onChange={e => setLine(i, { frequency: e.target.value })} className="h-9 mt-1" placeholder="BD / TDS" />
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-600">Duration (days)</Label>
                                            <Input type="number" min={0} value={line.durationDays ?? ''} onChange={e => setLine(i, { durationDays: e.target.value ? parseInt(e.target.value, 10) : undefined })} className="h-9 mt-1" />
                                        </div>
                                        <label className="col-span-2 sm:col-span-4 flex items-center gap-2 text-xs font-semibold text-slate-600 mt-1">
                                            <input type="checkbox" checked={!!line.isHighAlert} onChange={e => setLine(i, { isHighAlert: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                                            High-alert (requires witness at administration)
                                        </label>
                                    </div>
                                )}

                                {(showUrgency || showScheduledAt) && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {showUrgency && (
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-600">Urgency</Label>
                                                <select value={line.urgency ?? 'ROUTINE'} onChange={e => setLine(i, { urgency: e.target.value as OrderUrgency })}
                                                    className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                                    {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {showScheduledAt && (
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-600">Scheduled for</Label>
                                                <Input type="datetime-local" value={line.scheduledAt ?? ''} onChange={e => setLine(i, { scheduledAt: e.target.value || undefined })} className="h-9 mt-1" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Instructions</Label>
                                    <Input value={line.instructions ?? ''} onChange={e => setLine(i, { instructions: e.target.value })} className="h-9 mt-1" placeholder="Optional" />
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addLine} className="h-9"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add another {itemLabel.toLowerCase()}</Button>

                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Order notes</Label>
                            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                            <Button variant="outline" className="h-11 sm:h-10" onClick={() => setNewOpen(false)}>Cancel</Button>
                            <Button disabled={!canSubmit || submitting || isSubscriptionReadOnly} onClick={submit} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700">
                                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Place order
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Discontinue confirm */}
            <Dialog open={!!discontinuing} onOpenChange={(o) => { if (!o) setDiscontinuing(null); }}>
                <DialogContent className="max-w-sm">
                    {discontinuing && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Discontinue {discontinuing.itemName}?</DialogTitle>
                                <DialogDescription>Any charge already posted for this line will be voided.</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                                <Textarea rows={2} value={discontinueReason} onChange={e => setDiscontinueReason(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setDiscontinuing(null)}>Cancel</Button>
                                <Button disabled={discontinueBusy || isSubscriptionReadOnly} className="h-11 sm:h-10 bg-rose-600 hover:bg-rose-700" onClick={confirmDiscontinue}>
                                    {discontinueBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />} Discontinue
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
