import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, Stethoscope, Loader2, Check, Hotel, LayoutGrid, UserPlus, Plus } from 'lucide-react';
import {
    consultantIncentiveApi, type ConsultantIncentiveDoctorSummary, type ConsultantIncentiveLine, type IncentiveLedgerStatus,
} from '../services/consultantIncentiveApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    onBack: () => void;
    onOpenDashboard?: () => void;
    onOpenBedBoard?: () => void;
    onOpenReferredAdmissions?: () => void;
}

const STATUS_TONE: Record<string, string> = {
    ACCRUED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-500',
};

/**
 * Consultant incentive sub-ledger — hospital-wide, not per-patient, same standalone shape as
 * CssdBoardScreen. Left: per-doctor accrued/paid/cancelled totals. Right: line-level drill-in for
 * the selected doctor, with a "settle" action that marks every currently-ACCRUED line PAID.
 */
export const ConsultantLedgerScreen: React.FC<Props> = ({ onBack, onOpenDashboard, onOpenBedBoard, onOpenReferredAdmissions }) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [doctors, setDoctors] = useState<ConsultantIncentiveDoctorSummary[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<IncentiveLedgerStatus | 'ALL'>('ALL');
    const [lines, setLines] = useState<ConsultantIncentiveLine[]>([]);
    const [totals, setTotals] = useState({ accruedTotal: 0, paidTotal: 0, cancelledTotal: 0 });
    const [loadingLedger, setLoadingLedger] = useState(false);

    const [showSettle, setShowSettle] = useState(false);
    const [payoutRef, setPayoutRef] = useState('');
    const [tdsAmount, setTdsAmount] = useState('');
    const [settleBusy, setSettleBusy] = useState(false);

    const loadSummary = () => {
        setLoadingSummary(true);
        consultantIncentiveApi.getSummary()
            .then(setDoctors)
            .catch(() => toast({ title: 'Could not load the consultant incentive summary', variant: 'destructive' }))
            .finally(() => setLoadingSummary(false));
    };

    useEffect(() => { loadSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadLedger = (doctorId: string, status: IncentiveLedgerStatus | 'ALL') => {
        setLoadingLedger(true);
        consultantIncentiveApi.getLedger(doctorId, status === 'ALL' ? undefined : status)
            .then(r => { setLines(r.lines ?? []); setTotals({ accruedTotal: r.accruedTotal ?? 0, paidTotal: r.paidTotal ?? 0, cancelledTotal: r.cancelledTotal ?? 0 }); })
            .catch(() => toast({ title: 'Could not load the ledger', variant: 'destructive' }))
            .finally(() => setLoadingLedger(false));
    };

    const selectDoctor = (doctorId: string) => {
        setSelectedDoctorId(doctorId);
        setStatusFilter('ALL');
        loadLedger(doctorId, 'ALL');
    };

    useEffect(() => {
        if (selectedDoctorId) loadLedger(selectedDoctorId, statusFilter);
    }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedDoctor = doctors.find(d => d.doctorId === selectedDoctorId);
    const accruedCount = lines.filter(l => l.statusCode === 'ACCRUED').length;

    const submitSettle = async () => {
        if (!selectedDoctorId) return;
        setSettleBusy(true);
        try {
            const amount = tdsAmount ? Number(tdsAmount) : undefined;
            await consultantIncentiveApi.settle(selectedDoctorId, undefined, payoutRef.trim() || undefined, amount);
            toast({ title: 'Incentives settled.' });
            setShowSettle(false);
            setPayoutRef(''); setTdsAmount('');
            loadSummary();
            loadLedger(selectedDoctorId, statusFilter);
        } catch (err) {
            toast({ title: 'Could not settle', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSettleBusy(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-10">
            {/* Header Card (Unified Theme & Layout matching Appointment Dashboard) */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                {/* Decorative flare */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                                <Stethoscope className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Consultant Ledger</h1>
                                <p className="text-[11px] text-brand-100 mt-0.5">Track and settle doctor treating-fee incentives</p>
                            </div>
                        </div>
                        {/* Back to Dashboard button on the right for desktop */}
                        <button 
                            onClick={onBack}
                            className="hidden sm:flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] transition-all shadow-sm shrink-0"
                        >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
                        </button>
                    </div>

                    {/* Navigation Tab Capsule */}
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm">
                        {/* Tab 1: Active Census */}
                        <button 
                            onClick={onOpenDashboard || onBack}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <Hotel className="h-5 w-5 mb-1 opacity-80" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Active<br/>Census</span>
                        </button>

                        {/* Tab 2: Bed Board */}
                        <button 
                            onClick={onOpenBedBoard || onBack}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <LayoutGrid className="h-5 w-5 mb-1 opacity-80" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Bed<br/>Board</span>
                        </button>

                        {/* Tab 3: Referrals */}
                        <button 
                            onClick={onOpenReferredAdmissions || onBack}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <UserPlus className="h-5 w-5 mb-1 opacity-80" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Referred<br/>Admissions</span>
                        </button>

                        {/* Tab 4: Ledger (Selected) */}
                        <div className="bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm rounded-xl py-2 flex flex-col items-center justify-center text-center cursor-default">
                            <Stethoscope className="h-5 w-5 mb-1" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">Consultant<br/>Ledger</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Doctor list */}
                <div className={cn('rounded-[1.5rem] border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 lg:col-span-1 shadow-sm', selectedDoctorId && 'hidden lg:block')}>
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-550 dark:text-zinc-400 mb-3">Doctors</h2>
                    {loadingSummary ? (
                        <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : doctors.length === 0 ? (
                        <p className="text-sm text-slate-400">No incentive activity yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {doctors.map(d => (
                                <button key={d.doctorId} onClick={() => selectDoctor(d.doctorId)}
                                    className={cn('w-full text-left p-3 rounded-xl border transition-all duration-205',
                                        selectedDoctorId === d.doctorId ? 'border-brand-400 dark:border-brand-850 bg-brand-50/50 dark:bg-brand-950/20 shadow-sm' : 'border-zinc-100 dark:border-zinc-800/40 hover:bg-slate-50 dark:hover:bg-zinc-800/30')}>
                                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">{d.doctorName || 'Unknown doctor'}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                                        <span className="font-semibold text-amber-600 dark:text-amber-500">₹{d.accruedTotal.toLocaleString('en-IN')} accrued</span>
                                        <span className="text-slate-400 dark:text-zinc-650">·</span>
                                        <span className="text-emerald-600 dark:text-emerald-500">₹{d.paidTotal.toLocaleString('en-IN')} paid</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={cn('rounded-[1.5rem] border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 lg:col-span-2 shadow-sm', !selectedDoctorId && 'hidden lg:block')}>
                    {!selectedDoctorId ? (
                        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Select a doctor to view their ledger.</div>
                    ) : (
                        <>
                            {/* Mobile drill-in: back to the doctor list */}
                            <button type="button" onClick={() => setSelectedDoctorId(null)}
                                className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-400 mb-3 -mt-1">
                                <ArrowLeft className="h-4 w-4" /> All doctors
                            </button>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">{selectedDoctor?.doctorName || 'Unknown doctor'}</h2>
                                    <div className="grid grid-cols-3 gap-2.5 mt-2.5 max-w-md">
                                        <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/20 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-500">Accrued</p>
                                            <p className="text-sm font-black text-amber-800 dark:text-amber-400">₹{totals.accruedTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/20 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-500">Paid</p>
                                            <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">₹{totals.paidTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50/50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-805 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-zinc-450">Cancelled</p>
                                            <p className="text-sm font-black text-slate-700 dark:text-zinc-300">₹{totals.cancelledTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as IncentiveLedgerStatus | 'ALL')}
                                        className="h-10 sm:h-9 text-xs border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 bg-white dark:bg-zinc-900 flex-1 sm:flex-none min-w-0 outline-none hover:border-slate-300 dark:hover:border-zinc-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-505 transition-all">
                                        <option value="ALL">All statuses</option>
                                        <option value="ACCRUED">Accrued</option>
                                        <option value="PAID">Paid</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                    <Button size="sm" className="h-10 sm:h-9 px-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10 shrink-0" disabled={accruedCount === 0} onClick={() => setShowSettle(o => !o)}>
                                        Settle ({accruedCount})
                                    </Button>
                                </div>
                            </div>

                            {showSettle && (
                                <div className="rounded-xl border border-slate-205 dark:border-zinc-805 bg-slate-50/50 dark:bg-zinc-950/40 p-4 mb-4 space-y-3">
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Marks every currently-accrued line for this doctor as PAID.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div><Label className="text-[11px] font-semibold text-slate-555 dark:text-zinc-400">Payout reference</Label><Input value={payoutRef} onChange={e => setPayoutRef(e.target.value)} className="h-11 sm:h-10 rounded-xl border-slate-205 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 mt-1 bg-white dark:bg-zinc-900" placeholder="Voucher / bank ref" /></div>
                                        <div><Label className="text-[11px] font-semibold text-slate-555 dark:text-zinc-400">TDS amount (194J, total)</Label><Input type="number" min={0} value={tdsAmount} onChange={e => setTdsAmount(e.target.value)} className="h-11 sm:h-10 rounded-xl border-slate-205 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 mt-1 bg-white dark:bg-zinc-900" placeholder="₹" /></div>
                                    </div>
                                    <div className="flex justify-end gap-2.5 pt-1.5">
                                        <Button variant="outline" size="sm" className="h-9 rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowSettle(false)}>Cancel</Button>
                                        <Button size="sm" className="h-9 rounded-full px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={settleBusy} onClick={submitSettle}>
                                            {settleBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Confirm settle
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {loadingLedger ? (
                                <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                            ) : lines.length === 0 ? (
                                <p className="text-sm text-slate-400">No ledger lines for this filter.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {lines.map(l => (
                                        <div key={l.consultantIncentiveLedgerId} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-zinc-150/60 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-900/40 hover:shadow-sm transition-shadow duration-200">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{l.chargeDisplayName || '—'}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-zinc-450 mt-0.5 break-words font-medium">Patient {l.patientId} · Accrued {formatIstDateTime(l.accruedAt)}{l.paidAt ? ` · Paid ${formatIstDateTime(l.paidAt)}` : ''}{l.payoutRef ? ` · Ref ${l.payoutRef}` : ''}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <span className="text-sm font-black text-slate-800 dark:text-zinc-150">₹{l.incentiveAmount.toLocaleString('en-IN')}</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold px-2 py-0.5', STATUS_TONE[l.statusCode ?? ''])}>{l.statusCode}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
