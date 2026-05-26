import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookLock, Lock, Unlock, RefreshCw, Loader2, AlertCircle, CheckCircle2,
    Calendar as CalendarIcon, Banknote, CreditCard, Smartphone, Building2, ShieldCheck,
    History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    dayCloseService,
    type DayCloseSummary,
    type DayCloseListItem,
} from '../services/dayCloseService';

const inr = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const todayLocalIso = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ModeTile: React.FC<{ icon: React.ReactNode; label: string; amount: number; tone?: string }> = ({ icon, label, amount, tone }) => (
    <div className={cn('rounded-xl border p-3 bg-white border-slate-100 shadow-sm flex items-center gap-3', tone)}>
        <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{inr(amount)}</p>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <Badge variant="outline" className={cn(
        'text-[10px] font-bold',
        status === 'CLOSED'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        status === 'REOPENED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                 'bg-slate-50 text-slate-600 border-slate-200'
    )}>{status}</Badge>
);

const DayClosePage: React.FC = () => {
    const { toast } = useToast();
    const [date, setDate] = useState(todayLocalIso());
    const [preview, setPreview] = useState<DayCloseSummary | null>(null);
    const [history, setHistory] = useState<DayCloseListItem[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [closeNote, setCloseNote] = useState('');
    const [closeOpen, setCloseOpen] = useState(false);
    const [closing, setClosing] = useState(false);

    const [reopenCtx, setReopenCtx] = useState<DayCloseListItem | null>(null);
    const [reopenReason, setReopenReason] = useState('');
    const [reopening, setReopening] = useState(false);

    const loadPreview = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoadingPreview(true);
        setError(null);
        try {
            const res = await dayCloseService.preview(date);
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setPreview(res);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load preview');
        } finally {
            setLoadingPreview(false);
            setRefreshing(false);
        }
    }, [date]);

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await dayCloseService.list({ take: 60 });
            if (res.success) setHistory(res.items ?? []);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => { loadPreview(); }, [loadPreview]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    const submitClose = async () => {
        if (closing || !preview) return;
        setClosing(true);
        try {
            const res = await dayCloseService.close({ businessDate: date, closingNote: closeNote || undefined });
            if (!res.success) throw new Error(res.message ?? 'Could not close');
            toast({ title: 'Day closed', description: res.message });
            setCloseOpen(false);
            setCloseNote('');
            loadPreview(true);
            loadHistory();
        } catch (e: any) {
            toast({ title: 'Could not close', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setClosing(false);
        }
    };

    const submitReopen = async () => {
        if (reopening || !reopenCtx) return;
        if (!reopenReason.trim()) {
            toast({ title: 'Reason required', variant: 'destructive' });
            return;
        }
        setReopening(true);
        try {
            const res = await dayCloseService.reopen({ dayCloseId: reopenCtx.dayCloseId, reopenReason });
            if (!res.success) throw new Error(res.message ?? 'Could not reopen');
            toast({ title: 'Day reopened', description: `Re-close ${format(parseISO(reopenCtx.businessDate), 'd MMM')} once corrections are done.` });
            setReopenCtx(null);
            setReopenReason('');
            loadPreview(true);
            loadHistory();
        } catch (e: any) {
            toast({ title: 'Could not reopen', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setReopening(false);
        }
    };

    const isClosed = preview?.alreadyClosed && preview.status === 'CLOSED';

    const totals = useMemo(() => preview ? {
        cash: preview.cashAmount,
        upi: preview.upiAmount,
        card: preview.cardAmount,
        bank: preview.bankAmount,
        insurance: preview.insuranceAmount,
        other: preview.otherAmount,
    } : null, [preview]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <BookLock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Day Close · Reconciliation</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Snapshot the day's collections and lock the book. Mode-wise totals are stored for audit.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 w-44" />
                        <Button variant="outline" size="sm" className="h-9" onClick={() => loadPreview(true)} disabled={refreshing}>
                            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Preview card */}
                {loadingPreview ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                ) : preview && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        {isClosed && (
                            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-emerald-900">Day closed</p>
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                        {preview.closedBy ?? '—'} on {preview.closedAt ? format(parseISO(preview.closedAt), 'd MMM HH:mm') : '—'}.
                                        Numbers below are the live re-computation; archived totals are in History.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gross collected</p>
                                <p className="text-2xl font-black text-slate-900 mt-0.5">{inr(preview.grossCollected)}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{preview.paymentCount} receipt{preview.paymentCount === 1 ? '' : 's'}</p>
                            </div>
                            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Refunds</p>
                                <p className="text-2xl font-black text-amber-900 mt-0.5">−{inr(preview.refundsIssued)}</p>
                                <p className="text-[11px] text-amber-700 mt-0.5">{preview.refundCount} refund{preview.refundCount === 1 ? '' : 's'}</p>
                            </div>
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Net</p>
                                <p className="text-2xl font-black text-emerald-900 mt-0.5">{inr(preview.netCollected)}</p>
                                <p className="text-[11px] text-emerald-700 mt-0.5">cash + non-cash</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Invoices finalised</p>
                                <p className="text-2xl font-black text-indigo-900 mt-0.5">{preview.invoiceFinalizedCount}</p>
                            </div>
                        </div>

                        {totals && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <ModeTile icon={<Banknote className="h-4 w-4" />}    label="Cash"      amount={totals.cash} />
                                <ModeTile icon={<Smartphone className="h-4 w-4" />}  label="UPI"       amount={totals.upi} />
                                <ModeTile icon={<CreditCard className="h-4 w-4" />}  label="Card"      amount={totals.card} />
                                <ModeTile icon={<Building2 className="h-4 w-4" />}   label="Bank"      amount={totals.bank} />
                                <ModeTile icon={<ShieldCheck className="h-4 w-4" />} label="Insurance" amount={totals.insurance} />
                                <ModeTile icon={<History className="h-4 w-4" />}     label="Other"     amount={totals.other} />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                            <p className="text-[11px] text-slate-500 mr-auto">
                                Window: {format(parseISO(preview.fromUtc), 'd MMM HH:mm')} → {format(parseISO(preview.toUtc), 'd MMM HH:mm')} UTC
                            </p>
                            {isClosed ? (
                                <p className="text-[11px] text-slate-500">Use History below to reopen.</p>
                            ) : (
                                <Button
                                    onClick={() => setCloseOpen(true)}
                                    disabled={preview.paymentCount === 0 && preview.refundCount === 0}
                                    className="h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold"
                                >
                                    <Lock className="h-4 w-4 mr-2" />
                                    Close Day · {inr(preview.netCollected)}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* History */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-slate-600" /> Recent Day Closes
                    </h3>
                    {loadingHistory ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                            <BookLock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No closes recorded yet</p>
                            <p className="text-xs text-slate-500 mt-1">Closes appear here as you book each business day.</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="text-left px-3 py-2.5 font-bold">Date</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                        <th className="text-right px-3 py-2.5 font-bold">Net</th>
                                        <th className="text-right px-3 py-2.5 font-bold">Cash</th>
                                        <th className="text-right px-3 py-2.5 font-bold">UPI</th>
                                        <th className="text-right px-3 py-2.5 font-bold">Card</th>
                                        <th className="text-right px-3 py-2.5 font-bold">Bank</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Closed by</th>
                                        <th className="text-right px-3 py-2.5 font-bold w-[120px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(it => (
                                        <tr key={it.dayCloseId} className="border-t border-slate-100 hover:bg-slate-50/50">
                                            <td className="px-3 py-2 text-sm font-bold text-slate-900">
                                                {format(parseISO(it.businessDate), 'd MMM yyyy')}
                                            </td>
                                            <td className="px-3 py-2"><StatusBadge status={it.status} /></td>
                                            <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700">{inr(it.netCollected)}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(it.cashAmount)}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(it.upiAmount)}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(it.cardAmount)}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(it.bankAmount)}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600">
                                                {it.closedBy ?? '—'}
                                                <div className="text-[10px] text-slate-400">{format(parseISO(it.closedAt), 'd MMM HH:mm')}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {it.status === 'CLOSED' ? (
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setReopenCtx(it); setReopenReason(''); }}>
                                                        <Unlock className="h-3 w-3 mr-1" /> Reopen
                                                    </Button>
                                                ) : (
                                                    <span className="text-[10px] text-amber-700">awaiting re-close</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Close confirmation */}
            <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Close {format(parseISO(date), 'd MMM yyyy')}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This snapshots all payments + refunds in this business day as the day's reconciliation.
                            New payments after this point will need a reopen + re-close to be included.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Closing note (optional)</Label>
                        <Textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Cash variance, drop-bag deposit slip #, etc." />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={closing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); submitClose(); }} disabled={closing} className="bg-indigo-600 hover:bg-indigo-700">
                            {closing ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Closing…</> : <><Lock className="h-3.5 w-3.5 mr-1.5" /> Close Day</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reopen confirmation */}
            <AlertDialog open={!!reopenCtx} onOpenChange={open => { if (!open) { setReopenCtx(null); setReopenReason(''); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reopen {reopenCtx ? format(parseISO(reopenCtx.businessDate), 'd MMM yyyy') : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Reopening allows corrections to be posted into this business day. You must re-close once corrections are done.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Reason *</Label>
                        <Textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} rows={2} className="text-sm mt-1" placeholder="e.g. Missed receipt #1234 to be added" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={reopening}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); submitReopen(); }} disabled={reopening} className="bg-amber-600 hover:bg-amber-700">
                            {reopening ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Reopening…</> : <><Unlock className="h-3.5 w-3.5 mr-1.5" /> Reopen</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default DayClosePage;
