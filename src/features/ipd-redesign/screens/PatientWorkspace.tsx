import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, BedDouble, Pill, LogOut, ArrowLeftRight, Check, Loader2, X, Plus, Trash2, RefreshCw,
} from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { medicationOrderApi, type MedicationOrderItem, type MedicationOrderLineInput } from '../services/medicationOrderApi';
import { ipdBillingService, type ChargeMaster } from '@/features/billing/services/ipdBillingService';

const ACTIVE_STATUSES = ['PRE_ADMIT', 'ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED'];

// Backend timestamps come back naive (no timezone suffix) — treat as UTC before converting to IST.
const toIstDate = (iso: string): Date => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTz ? iso : `${iso}Z`);
};
const formatIstDateTime = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
    const month = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
    const year = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}${month}.${year}, ${time}`;
};

const EMPTY_LINE: MedicationOrderLineInput = { drugName: '', dose: '', route: '', frequency: '', durationDays: undefined, instructions: '', qty: 1 };

type Tab = 'overview' | 'medications';

interface Props {
    admission: ActiveAdmissionItem;
    onBack: () => void;
    onChanged: () => void;
}

/**
 * Real per-admission workspace — bed, medication orders (CPOE), and discharge all in one place,
 * replacing the old separate bed/discharge dialog and the standalone medication-orders screen.
 * Read-only for bed/order actions once the admission is no longer in an Active status.
 */
export const PatientWorkspace: React.FC<Props> = ({ admission, onBack, onChanged }) => {
    const { toast } = useToast();
    const [current, setCurrent] = useState<ActiveAdmissionItem>(admission);
    const [tab, setTab] = useState<Tab>('overview');
    const isActive = ACTIVE_STATUSES.includes(current.statusCode);

    const [freeBeds, setFreeBeds] = useState<BedBoardItem[]>([]);
    const [bedActionMode, setBedActionMode] = useState<'assign' | 'transfer' | null>(null);
    const [pickedBedId, setPickedBedId] = useState('');
    const [bedBusy, setBedBusy] = useState(false);

    const [dischargeOpen, setDischargeOpen] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [dischargeBusy, setDischargeBusy] = useState(false);

    const [orders, setOrders] = useState<MedicationOrderItem[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [pharmacyItems, setPharmacyItems] = useState<ChargeMaster[]>([]);
    const [newOrderOpen, setNewOrderOpen] = useState(false);
    const [lines, setLines] = useState<MedicationOrderLineInput[]>([{ ...EMPTY_LINE }]);
    const [orderNotes, setOrderNotes] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);
    const [discontinuing, setDiscontinuing] = useState<{ orderLineId: string; drugName: string } | null>(null);
    const [discontinueReason, setDiscontinueReason] = useState('');
    const [discontinueBusy, setDiscontinueBusy] = useState(false);

    const refreshAdmission = async () => {
        try {
            const list = await admissionApi.getActiveAdmissions('ALL');
            const found = list.find(a => a.admissionId === admission.admissionId);
            if (found) setCurrent(found);
        } catch { /* keep last known state on failure */ }
    };

    const loadFreeBeds = () => {
        bedBoardApi.getBoard().then(beds => setFreeBeds(beds.filter(b => b.isActive && !b.admissionId))).catch(() => setFreeBeds([]));
    };

    const loadOrders = () => {
        setOrdersLoading(true);
        medicationOrderApi.getOrders(admission.admissionId)
            .then(setOrders)
            .catch(() => toast({ title: 'Could not load medication orders', variant: 'destructive' }))
            .finally(() => setOrdersLoading(false));
    };

    useEffect(() => {
        refreshAdmission();
        loadFreeBeds();
        loadOrders();
        ipdBillingService.listChargeMasters({ pageSize: 500 })
            .then(r => setPharmacyItems(r.items.filter(c => c.isActive && (c.appliesTo === 'PHARMACY' || c.categoryCode === 'PHARMACY'))))
            .catch(() => setPharmacyItems([]));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshAfterAction = () => {
        refreshAdmission();
        loadFreeBeds();
        onChanged();
    };

    // ── Bed actions ──────────────────────────────────────────────────────────
    const runBedAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setBedBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            setBedActionMode(null);
            setPickedBedId('');
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBedBusy(false);
        }
    };

    const releaseBed = async () => {
        setBedBusy(true);
        try {
            await bedBoardApi.releaseBed(current.admissionId);
            toast({ title: 'Bed released.' });
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBedBusy(false);
        }
    };

    // ── Discharge ────────────────────────────────────────────────────────────
    const confirmDischarge = async () => {
        setDischargeBusy(true);
        try {
            await bedBoardApi.dischargeAdmission(current.admissionId, dischargeNotes || undefined);
            toast({ title: 'Patient discharged.' });
            setDischargeOpen(false);
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Could not discharge', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDischargeBusy(false);
        }
    };

    // ── Medication orders ────────────────────────────────────────────────────
    const openNewOrder = () => { setLines([{ ...EMPTY_LINE }]); setOrderNotes(''); setNewOrderOpen(true); };
    const addLine = () => setLines(ls => [...ls, { ...EMPTY_LINE }]);
    const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
    const setLine = (i: number, patch: Partial<MedicationOrderLineInput>) =>
        setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const pickPharmacyItem = (i: number, chargeId: string) => {
        const item = pharmacyItems.find(p => p.chargeId === chargeId);
        setLine(i, { chargeId: chargeId || undefined, drugName: item?.displayName ?? lines[i].drugName });
    };
    const canSubmitOrder = lines.length > 0 && lines.every(l => l.drugName.trim().length > 0);

    const submitOrder = async () => {
        if (!canSubmitOrder || placingOrder) {
            toast({ title: 'Incomplete', description: 'Every line needs a drug name.', variant: 'destructive' });
            return;
        }
        setPlacingOrder(true);
        try {
            await medicationOrderApi.placeOrder(current.admissionId, lines, orderNotes || undefined);
            toast({ title: 'Medication order placed.' });
            setNewOrderOpen(false);
            loadOrders();
        } catch (err) {
            toast({ title: 'Could not place order', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setPlacingOrder(false);
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
            loadOrders();
        } catch (err) {
            toast({ title: 'Could not discontinue', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDiscontinueBusy(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-11 w-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow">
                        {(current.patientName || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-black text-slate-900">{current.patientName || current.patientId}</h1>
                            <Badge variant="outline" className={cn('text-[10px] font-bold', isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600')}>
                                {current.statusCode}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                            {current.patientId}{current.patientAge != null ? ` · ${current.patientAge}${current.patientSex ?? ''}` : ''} · {current.admissionNo} · {current.admissionType ?? '—'} · {current.payerType}
                        </p>
                    </div>
                </div>
                {isActive && (
                    <Button onClick={() => { setDischargeNotes(''); setDischargeOpen(true); }} className="h-10 bg-amber-600 hover:bg-amber-700 font-semibold">
                        <LogOut className="h-4 w-4 mr-2" /> Discharge
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit">
                <button type="button" onClick={() => setTab('overview')}
                    className={cn('h-9 px-4 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5', tab === 'overview' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    <BedDouble className="h-4 w-4" /> Overview
                </button>
                <button type="button" onClick={() => setTab('medications')}
                    className={cn('h-9 px-4 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5', tab === 'medications' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    <Pill className="h-4 w-4" /> Medications
                    {orders.length > 0 && <Badge variant="outline" className="text-[9px] bg-slate-50 ml-0.5">{orders.length}</Badge>}
                </button>
            </div>

            {tab === 'overview' && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Bed</h2>
                        {current.bedCode ? (
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="font-semibold text-slate-900">{current.wardName ? `${current.wardName} · ` : ''}{current.bedCode}</p>
                                {isActive && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="h-9" onClick={() => { setBedActionMode('transfer'); setPickedBedId(''); }}>
                                            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Transfer
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-9 text-slate-500 hover:text-rose-600" onClick={releaseBed} disabled={bedBusy}>
                                            <X className="h-3.5 w-3.5 mr-1.5" /> Release
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-amber-600 font-semibold text-sm">{isActive ? 'Unassigned' : 'No bed'}</p>
                                {isActive && (
                                    <Button variant="outline" size="sm" className="h-9" onClick={() => { setBedActionMode('assign'); setPickedBedId(''); }}>
                                        <BedDouble className="h-3.5 w-3.5 mr-1.5" /> Assign a bed
                                    </Button>
                                )}
                            </div>
                        )}

                        {bedActionMode && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-end gap-2 flex-wrap">
                                <div className="flex-1 min-w-[220px]">
                                    <Label className="text-[11px] font-semibold text-slate-600">{bedActionMode === 'assign' ? 'Bed to assign' : 'New bed'}</Label>
                                    <select value={pickedBedId} onChange={e => setPickedBedId(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                        <option value="">Select a bed…</option>
                                        {freeBeds.map(b => (
                                            <option key={b.bedId} value={b.bedId}>{(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                        ))}
                                    </select>
                                </div>
                                <Button variant="ghost" size="sm" className="h-9" onClick={() => setBedActionMode(null)}>Cancel</Button>
                                <Button size="sm" disabled={!pickedBedId || bedBusy} className="h-9 bg-brand-600 hover:bg-brand-700"
                                    onClick={() => runBedAction(
                                        () => bedActionMode === 'assign'
                                            ? bedBoardApi.assignBed(current.admissionId, pickedBedId)
                                            : bedBoardApi.transferBed(current.admissionId, pickedBedId),
                                        bedActionMode === 'assign' ? 'Bed assigned.' : 'Bed transferred.')}>
                                    {bedBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                    {bedActionMode === 'assign' ? 'Assign' : 'Transfer'}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Admission details</h2>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admitted</dt><dd className="text-slate-800">{formatIstDateTime(current.admittedAt)}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</dt><dd className="text-slate-800">{current.admissionType ?? '—'}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payer</dt><dd className="text-slate-800">{current.payerType}</dd></div>
                        </dl>
                        {(current.admissionReason || current.diagnosis) && (
                            <p className="text-sm text-slate-700 mt-3">{current.diagnosis || current.admissionReason}</p>
                        )}
                    </div>
                </div>
            )}

            {tab === 'medications' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Medication Orders</h2>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9" onClick={loadOrders} disabled={ordersLoading}>
                                <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', ordersLoading && 'animate-spin')} /> Refresh
                            </Button>
                            {isActive && (
                                <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openNewOrder}>
                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New order
                                </Button>
                            )}
                        </div>
                    </div>

                    {ordersLoading && orders.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders…</div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400">No medication orders yet.</div>
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
                                                {l.statusCode === 'ACTIVE' && isActive && (
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
                </div>
            )}

            {/* Discharge dialog */}
            <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Discharge {current.patientName || 'patient'}?</DialogTitle>
                        <DialogDescription>
                            This closes the admission to DISCHARGED{current.bedCode ? ` and releases bed ${current.bedCode}` : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                        <Textarea rows={3} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDischargeOpen(false)}>Cancel</Button>
                        <Button disabled={dischargeBusy} className="bg-amber-600 hover:bg-amber-700" onClick={confirmDischarge}>
                            {dischargeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* New order dialog */}
            <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
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
                            <Textarea rows={2} value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button>
                            <Button disabled={!canSubmitOrder || placingOrder} onClick={submitOrder} className="bg-brand-600 hover:bg-brand-700">
                                {placingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Place order
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
