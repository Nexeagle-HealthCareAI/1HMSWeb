import React, { useMemo, useState } from 'react';
import { ArrowLeft, Gift, Plus, Wallet, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useIpdStore } from '../store';
import type { BeneficiaryType, IncentiveStatus, ServiceModule } from '../types';

const STATUS_TONE: Record<IncentiveStatus, string> = {
    ACCRUED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const MODULE_TONE: Record<ServiceModule, string> = {
    OPD: 'bg-sky-50 text-sky-700 border-sky-200',
    IPD: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    LAB: 'bg-violet-50 text-violet-700 border-violet-200',
    RAD: 'bg-teal-50 text-teal-700 border-teal-200',
    PHARMACY: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TYPES: BeneficiaryType[] = ['REFERRER', 'AGENT', 'DOCTOR', 'STAFF', 'DEPARTMENT'];

interface Props { onBack: () => void; }

export const IncentivesScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const beneficiaries = useIpdStore(s => s.beneficiaries);
    const accruals = useIpdStore(s => s.incentiveAccruals);
    const admissionView = useIpdStore(s => s.admissionView);
    const upsertBeneficiary = useIpdStore(s => s.upsertBeneficiary);
    const payoutBeneficiary = useIpdStore(s => s.payoutBeneficiary);

    const [selectedId, setSelectedId] = useState<string | null>(beneficiaries[0]?.beneficiaryId ?? null);
    const [addOpen, setAddOpen] = useState(false);
    const [payoutFor, setPayoutFor] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', type: 'REFERRER' as BeneficiaryType, phone: '', address: '', pan: '', defaultRatePercent: 10 });

    const rollup = useMemo(() => {
        const m: Record<string, { accrued: number; paid: number; count: number }> = {};
        for (const b of beneficiaries) m[b.beneficiaryId] = { accrued: 0, paid: 0, count: 0 };
        for (const a of accruals) {
            const r = m[a.beneficiaryId]; if (!r) continue;
            r.count++;
            if (a.status === 'ACCRUED') r.accrued += a.incentiveAmount;
            if (a.status === 'PAID') r.paid += a.incentiveAmount;
        }
        return m;
    }, [beneficiaries, accruals]);

    const selected = beneficiaries.find(b => b.beneficiaryId === selectedId);
    const selectedAccruals = accruals.filter(a => a.beneficiaryId === selectedId)
        .sort((a, b) => b.accruedAt.localeCompare(a.accruedAt));
    const payable = rollup[selectedId ?? '']?.accrued ?? 0;

    // Per-module breakdown for the selected beneficiary (slice the incentive ledger by department).
    const moduleBreakdown = useMemo(() => {
        const m: Partial<Record<ServiceModule, number>> = {};
        for (const a of selectedAccruals) m[a.sourceModule] = (m[a.sourceModule] ?? 0) + a.incentiveAmount;
        return Object.entries(m) as [ServiceModule, number][];
    }, [selectedAccruals]);

    const totalAccrued = Object.values(rollup).reduce((t, r) => t + r.accrued, 0);
    const totalPaid = Object.values(rollup).reduce((t, r) => t + r.paid, 0);

    const saveBeneficiary = () => {
        if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
        const id = upsertBeneficiary({ name: form.name.trim(), type: form.type, phone: form.phone || undefined, address: form.address || undefined, pan: form.pan || undefined, defaultRatePercent: Number(form.defaultRatePercent) || 0, isActive: true });
        toast({ title: 'Beneficiary added', description: form.name });
        setForm({ name: '', type: 'REFERRER', phone: '', address: '', pan: '', defaultRatePercent: 10 });
        setAddOpen(false);
        setSelectedId(id);
    };

    const doPayout = () => {
        if (!payoutFor) return;
        const r = payoutBeneficiary(payoutFor);
        toast({ title: r.count ? `Paid out ${r.count} accrual${r.count > 1 ? 's' : ''}` : 'Nothing to pay', description: r.count ? `₹${r.total.toLocaleString('en-IN')} marked PAID.` : undefined });
        setPayoutFor(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5"><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="h-12 w-12 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-md"><Gift className="h-6 w-6 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Incentives</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Referral incentives — accrued on payment, paid out per beneficiary. Internal ledger only (never on patient bills).</p>
                    </div>
                </div>
                <Button onClick={() => setAddOpen(true)} className="h-10 bg-fuchsia-600 hover:bg-fuchsia-700 font-semibold"><Plus className="h-4 w-4 mr-2" /> Add Beneficiary</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Beneficiaries</p><p className="text-2xl font-black text-slate-900 mt-0.5">{beneficiaries.length}</p></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Payable (accrued)</p><p className="text-2xl font-black text-amber-900 mt-0.5">₹{totalAccrued.toLocaleString('en-IN')}</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Paid to date</p><p className="text-2xl font-black text-emerald-900 mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</p></div>
                <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accruals</p><p className="text-2xl font-black text-slate-900 mt-0.5">{accruals.length}</p></div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Beneficiary list */}
                <div className="col-span-12 md:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-500" /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Beneficiaries</span></div>
                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-auto">
                        {beneficiaries.map(b => {
                            const r = rollup[b.beneficiaryId];
                            return (
                                <button key={b.beneficiaryId} onClick={() => setSelectedId(b.beneficiaryId)} className={cn('w-full text-left px-3 py-2.5 hover:bg-fuchsia-50/40', selectedId === b.beneficiaryId && 'bg-fuchsia-50 border-l-2 border-l-fuchsia-500')}>
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{b.name}</p>
                                        <Badge variant="outline" className="text-[9px] font-bold bg-slate-50">{b.defaultRatePercent}%</Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] text-slate-500">{b.type}</span>
                                        {r && r.accrued > 0 && <span className="text-[10px] font-bold text-amber-700">₹{r.accrued.toLocaleString('en-IN')} due</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Accrual ledger for selected */}
                <div className="col-span-12 md:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <div>
                            <p className="font-bold text-slate-900">{selected?.name ?? 'Select a beneficiary'}</p>
                            {selected && <p className="text-[11px] text-slate-500">{selected.type}{selected.phone ? ` · ${selected.phone}` : ''}{selected.pan ? ` · PAN ${selected.pan}` : ''} · rate {selected.defaultRatePercent}%</p>}
                            {selected?.address && <p className="text-[11px] text-slate-400">{selected.address}</p>}
                            {moduleBreakdown.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {moduleBreakdown.map(([mod, amt]) => (
                                        <Badge key={mod} variant="outline" className={cn('text-[10px] font-bold', MODULE_TONE[mod])}>{mod} ₹{amt.toLocaleString('en-IN')}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selected && (
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" disabled={payable <= 0} onClick={() => setPayoutFor(selected.beneficiaryId)}>
                                <Wallet className="h-3.5 w-3.5 mr-1" /> Pay ₹{payable.toLocaleString('en-IN')}
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2 font-bold">Accrued</th>
                                    <th className="text-left px-3 py-2 font-bold">Source</th>
                                    <th className="text-left px-3 py-2 font-bold">Patient</th>
                                    <th className="text-right px-3 py-2 font-bold">Eligible</th>
                                    <th className="text-right px-3 py-2 font-bold">Rate</th>
                                    <th className="text-right px-3 py-2 font-bold">Incentive</th>
                                    <th className="text-left px-3 py-2 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAccruals.map(a => {
                                    const av = admissionView(a.admissionId);
                                    return (
                                        <tr key={a.accrualId} className="border-t border-slate-100">
                                            <td className="px-3 py-2 text-xs whitespace-nowrap">{format(parseISO(a.accruedAt), 'd MMM HH:mm')}</td>
                                            <td className="px-3 py-2"><Badge variant="outline" className={cn('text-[10px] font-bold', MODULE_TONE[a.sourceModule])}>{a.sourceModule}</Badge></td>
                                            <td className="px-3 py-2 text-xs">{av?.patient.name ?? a.admissionId}</td>
                                            <td className="px-3 py-2 text-right font-mono text-xs">₹{a.eligibleAmount.toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2 text-right font-mono text-xs">{a.ratePercent}%</td>
                                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">₹{a.incentiveAmount.toLocaleString('en-IN')}</td>
                                            <td className="px-3 py-2"><Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[a.status])}>{a.status}</Badge></td>
                                        </tr>
                                    );
                                })}
                                {selectedAccruals.length === 0 && (
                                    <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-400">No incentives accrued yet. Admit a patient referred by this beneficiary, then record a payment.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add beneficiary */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add beneficiary</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs font-semibold">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 mt-1" /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs font-semibold">Type</Label>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as BeneficiaryType }))} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><Label className="text-xs font-semibold">Rate %</Label><Input type="number" min={0} max={100} value={form.defaultRatePercent} onChange={e => setForm(f => ({ ...f, defaultRatePercent: parseInt(e.target.value || '0', 10) }))} className="h-9 mt-1" /></div>
                            <div><Label className="text-xs font-semibold">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9 mt-1" /></div>
                            <div><Label className="text-xs font-semibold">PAN</Label><Input value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} className="h-9 mt-1 font-mono" /></div>
                            <div className="col-span-2"><Label className="text-xs font-semibold">Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-9 mt-1" placeholder="City / clinic address" /></div>
                        </div>
                        {form.type === 'DOCTOR' && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Note: doctor-to-doctor referral fees are restricted under MCI/NMC Clause 6.4. Use for revenue-share comp, not referral cuts.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={saveBeneficiary} className="bg-fuchsia-600 hover:bg-fuchsia-700"><Check className="h-4 w-4 mr-1" /> Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payout confirm */}
            <AlertDialog open={!!payoutFor} onOpenChange={(o) => { if (!o) setPayoutFor(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pay out incentives?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Mark ₹{payable.toLocaleString('en-IN')} of accrued incentives as PAID for {beneficiaries.find(b => b.beneficiaryId === payoutFor)?.name}. (TDS u/s 194H would apply in the real system.)
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={doPayout} className="bg-emerald-600 hover:bg-emerald-700">Confirm payout</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
