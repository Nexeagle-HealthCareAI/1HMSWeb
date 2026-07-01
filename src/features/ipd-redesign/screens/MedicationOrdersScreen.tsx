import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Pill, Plus, Loader2, X, Trash2, RefreshCw } from 'lucide-react';
import { medicationOrderApi, type MedicationOrderItem, type MedicationOrderLineInput } from '../services/medicationOrderApi';
import { ipdBillingService, type ChargeMaster } from '@/features/billing/services/ipdBillingService';
import type { ActiveAdmissionItem } from '../services/admissionApi';

interface Props {
    admission: ActiveAdmissionItem;
    onBack: () => void;
}

const EMPTY_LINE: MedicationOrderLineInput = { drugName: '', dose: '', route: '', frequency: '', durationDays: undefined, instructions: '', qty: 1 };

/**
 * CPOE — medication orders for one admission. Placing an order posts a charge event per
 * chargeable line immediately (charge-on-event, handled server-side); this screen just shows
 * the resulting billed/unbilled state per line. Free-text drugs (no ChargeMaster item picked)
 * are allowed and simply aren't billed.
 */
export const MedicationOrdersScreen: React.FC<Props> = ({ admission, onBack }) => {
    const { toast } = useToast();
    const [orders, setOrders] = useState<MedicationOrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pharmacyItems, setPharmacyItems] = useState<ChargeMaster[]>([]);

    const [newOpen, setNewOpen] = useState(false);
    const [lines, setLines] = useState<MedicationOrderLineInput[]>([{ ...EMPTY_LINE }]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [discontinuing, setDiscontinuing] = useState<{ orderLineId: string; drugName: string } | null>(null);
    const [discontinueReason, setDiscontinueReason] = useState('');
    const [discontinueBusy, setDiscontinueBusy] = useState(false);

    const load = () => {
        setLoading(true);
        medicationOrderApi.getOrders(admission.admissionId)
            .then(setOrders)
            .catch(() => toast({ title: 'Could not load medication orders', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admission.admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        ipdBillingService.listChargeMasters({ pageSize: 500 })
            .then(r => setPharmacyItems(r.items.filter(c => c.isActive && (c.appliesTo === 'PHARMACY' || c.categoryCode === 'PHARMACY'))))
            .catch(() => setPharmacyItems([]));
    }, []);

    const openNew = () => { setLines([{ ...EMPTY_LINE }]); setNotes(''); setNewOpen(true); };
    const addLine = () => setLines(ls => [...ls, { ...EMPTY_LINE }]);
    const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
    const setLine = (i: number, patch: Partial<MedicationOrderLineInput>) =>
        setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

    const pickPharmacyItem = (i: number, chargeId: string) => {
        const item = pharmacyItems.find(p => p.chargeId === chargeId);
        setLine(i, { chargeId: chargeId || undefined, drugName: item?.displayName ?? lines[i].drugName });
    };

    const canSubmit = lines.length > 0 && lines.every(l => l.drugName.trim().length > 0);

    const submit = async () => {
        if (!canSubmit || submitting) {
            toast({ title: 'Incomplete', description: 'Every line needs a drug name.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await medicationOrderApi.placeOrder(admission.admissionId, lines, notes || undefined);
            toast({ title: 'Medication order placed.' });
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
        setDiscontinueBusy(true);
        try {
            await medicationOrderApi.discontinueLine(discontinuing.orderLineId, discontinueReason || undefined);
            toast({ title: `${discontinuing.drugName} discontinued.` });
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
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <Pill className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Medication Orders</h1>
                        <p className="text-xs text-slate-500">{admission.patientName || admission.patientId} · {admission.admissionNo}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button onClick={openNew} className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold">
                        <Plus className="h-4 w-4 mr-1.5" /> New order
                    </Button>
                </div>
            </div>

            {loading && orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders…</div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">No medication orders yet.</div>
            ) : (
                <div className="space-y-3">
                    {orders.map(o => (
                        <div key={o.orderId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">{new Date(o.orderedAt).toLocaleString('en-IN')}</span>
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
                                                <span className={cn('font-semibold text-slate-900', l.statusCode === 'DISCONTINUED' && 'line-through text-slate-400')}>{l.drugName}</span>
                                                {l.statusCode === 'DISCONTINUED' && <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500">DISCONTINUED</Badge>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {[l.dose, l.route, l.frequency, l.durationDays ? `${l.durationDays}d` : null].filter(Boolean).join(' · ') || '—'}
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
                                        {l.statusCode === 'ACTIVE' && (
                                            <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-rose-600 shrink-0"
                                                onClick={() => { setDiscontinuing({ orderLineId: l.orderLineId, drugName: l.drugName || 'this drug' }); setDiscontinueReason(''); }}>
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
                        <DialogTitle>New medication order</DialogTitle>
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
                                        <Label className="text-[11px] font-semibold text-slate-600">Pharmacy item (optional — links billing)</Label>
                                        <select value={line.chargeId ?? ''} onChange={e => pickPharmacyItem(i, e.target.value)}
                                            className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                            <option value="">— Free text drug (no billing link) —</option>
                                            {pharmacyItems.map(p => (
                                                <option key={p.chargeId} value={p.chargeId}>{p.displayName} · ₹{p.defaultRate.toLocaleString('en-IN')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Drug name *</Label>
                                        <Input value={line.drugName} onChange={e => setLine(i, { drugName: e.target.value })} className="h-9 mt-1" placeholder="e.g. Paracetamol" />
                                    </div>
                                </div>
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
                                        <Input value={line.frequency ?? ''} onChange={e => setLine(i, { frequency: e.target.value })} className="h-9 mt-1" placeholder="BD / TDS" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Duration (days)</Label>
                                        <Input type="number" min={0} value={line.durationDays ?? ''} onChange={e => setLine(i, { durationDays: e.target.value ? parseInt(e.target.value, 10) : undefined })} className="h-9 mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Instructions</Label>
                                    <Input value={line.instructions ?? ''} onChange={e => setLine(i, { instructions: e.target.value })} className="h-9 mt-1" placeholder="Optional — e.g. after food" />
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addLine} className="h-9"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add another drug</Button>

                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Order notes</Label>
                            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                            <Button disabled={!canSubmit || submitting} onClick={submit} className="bg-brand-600 hover:bg-brand-700">
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
                                <DialogTitle>Discontinue {discontinuing.drugName}?</DialogTitle>
                                <DialogDescription>Any charge already posted for this line will be voided.</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                                <Textarea rows={2} value={discontinueReason} onChange={e => setDiscontinueReason(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setDiscontinuing(null)}>Cancel</Button>
                                <Button disabled={discontinueBusy} className="bg-rose-600 hover:bg-rose-700" onClick={confirmDiscontinue}>
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
