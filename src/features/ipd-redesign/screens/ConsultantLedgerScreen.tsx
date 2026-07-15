import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, Stethoscope, Loader2, Check } from 'lucide-react';
import {
    consultantIncentiveApi, type ConsultantIncentiveDoctorSummary, type ConsultantIncentiveLine, type IncentiveLedgerStatus,
} from '../services/consultantIncentiveApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    onBack: () => void;
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
export const ConsultantLedgerScreen: React.FC<Props> = ({ onBack }) => {
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
            <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 shrink-0" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow shrink-0">
                    <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Consultant Incentive Ledger</h1>
                    <p className="text-xs text-slate-500 hidden sm:block">Per-doctor treating-fee incentive accrual &amp; payout.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Doctor list — on mobile this is the "master" list; it hides once a doctor is
                    picked (drill-in), and the ledger detail takes over. Both show side-by-side on lg. */}
                <div className={cn('rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1', selectedDoctorId && 'hidden lg:block')}>
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Doctors</h2>
                    {loadingSummary ? (
                        <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : doctors.length === 0 ? (
                        <p className="text-sm text-slate-400">No incentive activity yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {doctors.map(d => (
                                <button key={d.doctorId} onClick={() => selectDoctor(d.doctorId)}
                                    className={cn('w-full text-left p-2.5 rounded-lg border transition-colors',
                                        selectedDoctorId === d.doctorId ? 'border-brand-300 bg-brand-50' : 'border-slate-100 hover:bg-slate-50')}>
                                    <p className="text-sm font-bold text-slate-800">{d.doctorName || 'Unknown doctor'}</p>
                                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                                        <span className="font-semibold text-amber-600">₹{d.accruedTotal.toLocaleString('en-IN')} accrued</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-emerald-600">₹{d.paidTotal.toLocaleString('en-IN')} paid</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={cn('rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2', !selectedDoctorId && 'hidden lg:block')}>
                    {!selectedDoctorId ? (
                        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Select a doctor to view their ledger.</div>
                    ) : (
                        <>
                            {/* Mobile drill-in: back to the doctor list */}
                            <button type="button" onClick={() => setSelectedDoctorId(null)}
                                className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-brand-700 mb-3 -mt-1">
                                <ArrowLeft className="h-4 w-4" /> All doctors
                            </button>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-slate-900">{selectedDoctor?.doctorName || 'Unknown doctor'}</h2>
                                    <div className="grid grid-cols-3 gap-2 mt-2 max-w-md">
                                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-amber-600">Accrued</p>
                                            <p className="text-sm font-black text-amber-800">₹{totals.accruedTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-emerald-600">Paid</p>
                                            <p className="text-sm font-black text-emerald-800">₹{totals.paidTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                                            <p className="text-[9px] font-bold uppercase text-slate-500">Cancelled</p>
                                            <p className="text-sm font-black text-slate-700">₹{totals.cancelledTotal.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as IncentiveLedgerStatus | 'ALL')}
                                        className="h-10 sm:h-9 text-xs border border-slate-200 rounded-lg px-2 bg-white flex-1 sm:flex-none min-w-0">
                                        <option value="ALL">All statuses</option>
                                        <option value="ACCRUED">Accrued</option>
                                        <option value="PAID">Paid</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                    <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700 shrink-0" disabled={accruedCount === 0} onClick={() => setShowSettle(o => !o)}>
                                        Settle ({accruedCount})
                                    </Button>
                                </div>
                            </div>

                            {showSettle && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 space-y-2">
                                    <p className="text-xs text-slate-600">Marks every currently-accrued line for this doctor as PAID.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div><Label className="text-[11px] font-semibold text-slate-600">Payout reference</Label><Input value={payoutRef} onChange={e => setPayoutRef(e.target.value)} className="h-10 sm:h-9 mt-1" placeholder="Voucher / bank ref" /></div>
                                        <div><Label className="text-[11px] font-semibold text-slate-600">TDS amount (194J, total)</Label><Input type="number" min={0} value={tdsAmount} onChange={e => setTdsAmount(e.target.value)} className="h-10 sm:h-9 mt-1" placeholder="₹" /></div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowSettle(false)}>Cancel</Button>
                                        <Button size="sm" className="h-8 bg-brand-600 hover:bg-brand-700" disabled={settleBusy} onClick={submitSettle}>
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
                                        <div key={l.consultantIncentiveLedgerId} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{l.chargeDisplayName || '—'}</p>
                                                <p className="text-[11px] text-slate-500 break-words">Patient {l.patientId} · Accrued {formatIstDateTime(l.accruedAt)}{l.paidAt ? ` · Paid ${formatIstDateTime(l.paidAt)}` : ''}{l.payoutRef ? ` · Ref ${l.payoutRef}` : ''}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-sm font-black text-slate-800">₹{l.incentiveAmount.toLocaleString('en-IN')}</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[l.statusCode ?? ''])}>{l.statusCode}</Badge>
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
