import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader2, RefreshCw, Lock, Unlock, AlertCircle, CalendarDays, IndianRupee, CheckCircle2, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ipdBillingService, type AdmissionDayBillsData, type AdmissionDayView } from '../services/ipdBillingService';
import { buildInterimBillA4 } from '@/printTemplates/interimBillA4';
import { openPrintHtml } from '@/utils/printUtils';
import type { PrintSettings } from '@/types/print';

const inr = (n: number) => `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Render an admission-anchored window in IST (treat offset-less timestamps as UTC).
const fmtWindow = (iso: string): string => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : `${iso}Z`);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

export interface AdmissionDayBillsPanelProps {
    admissionId: string;
    hospitalId?: string;
    /** Notified after a successful close/reopen so the parent can refresh the ledger. */
    onChanged?: () => void;
    /** Patient + print settings enable per-day "Print" of the interim bill. */
    patient?: { name: string; patientId: string; ageGender?: string; mobile?: string };
    printSettings?: PrintSettings;
    admissionNo?: string;
}

export const AdmissionDayBillsPanel: React.FC<AdmissionDayBillsPanelProps> = ({ admissionId, hospitalId, onChanged, patient, printSettings, admissionNo }) => {
    const { toast } = useToast();
    const { hospitalId: authHospitalId } = useAuthStore();
    const hid = hospitalId ?? authHospitalId ?? undefined;

    const [data, setData] = useState<AdmissionDayBillsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reopenTarget, setReopenTarget] = useState<AdmissionDayView | null>(null);
    const [reopenReason, setReopenReason] = useState('');

    const load = useCallback(async () => {
        if (!admissionId) { setData(null); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await ipdBillingService.getAdmissionDayBills(admissionId, hid);
            if (res?.success === false) throw new Error(res.message ?? 'Could not load day bills');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load day bills');
        } finally {
            setLoading(false);
        }
    }, [admissionId, hid]);

    useEffect(() => { load(); }, [load]);

    // The open day that can be closed: the current/first not-yet-closed day with charges.
    const openDay = data?.days.find(d => !d.isClosed && d.lines.length > 0) ?? null;
    // Only the latest closed day may be reopened.
    const lastClosedDayNo = data?.days.filter(d => d.isClosed).reduce((m, d) => Math.max(m, d.dayNumber), 0) ?? 0;

    const handleClose = async () => {
        if (!admissionId || busy) return;
        setBusy(true);
        try {
            const res = await ipdBillingService.closeAdmissionDay(admissionId, hid);
            if (res?.success === false) throw new Error(res.message ?? 'Could not close day');
            toast({ title: 'Day closed', description: res.interimBillNo ? `Interim bill ${res.interimBillNo}` : undefined });
            await load();
            onChanged?.();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not close day', description: e?.message ?? '' });
        } finally {
            setBusy(false);
        }
    };

    const handleReopen = async () => {
        if (!reopenTarget?.admissionDayBillId || !reopenReason.trim() || busy) return;
        setBusy(true);
        try {
            const res = await ipdBillingService.reopenAdmissionDay(reopenTarget.admissionDayBillId, reopenReason.trim(), hid);
            if (res?.success === false) throw new Error(res.message ?? 'Could not reopen');
            toast({ title: 'Interim bill reopened' });
            setReopenTarget(null);
            setReopenReason('');
            await load();
            onChanged?.();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not reopen', description: e?.message ?? '' });
        } finally {
            setBusy(false);
        }
    };

    const handlePrintDay = (day: AdmissionDayView) => {
        if (!printSettings || !patient || !data) return;
        const html = buildInterimBillA4({
            interimBillNo: day.interimBillNo ?? '—',
            dayNumber: day.dayNumber,
            fromLabel: fmtWindow(day.fromUtc),
            toLabel: fmtWindow(day.toUtc),
            date: new Date().toISOString(),
            patientName: patient.name,
            patientId: patient.patientId,
            ageGender: patient.ageGender ?? '',
            mobile: patient.mobile ?? '',
            admissionNo,
            lines: day.lines.map((l, i) => ({
                srNo: i + 1,
                description: l.displayName || l.categoryCode || 'Charge',
                serviceDate: fmtWindow(l.serviceDate),
                qty: l.qty,
                rate: l.unitPrice,
                discount: l.discountAmount,
                total: l.netAmount,
            })),
            dayNet: day.netAmount,
            cumulativeNet: day.cumulativeNetAmount,
            advanceReceived: data.totalReceived,
            balanceDue: day.cumulativeNetAmount - data.totalReceived,
        }, printSettings);
        openPrintHtml(html);
    };

    return (
        <Card className="border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-indigo-500/5 bg-white flex flex-col overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-500" /> Day-wise Bills
                </CardTitle>
                <div className="flex items-center gap-2">
                    {openDay && (
                        <Button size="sm" onClick={handleClose} disabled={busy}
                            className="h-8 px-3 rounded-lg text-xs bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white">
                            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
                            Close Day {openDay.dayNumber}
                        </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={load} disabled={loading} title="Refresh">
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-3 space-y-3">
                {loading ? (
                    <div className="p-6 flex items-center justify-center text-slate-400 text-xs gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : error ? (
                    <div className="p-6 text-center text-rose-600 text-xs flex flex-col items-center gap-2">
                        <AlertCircle className="h-5 w-5" /> {error}
                        <Button size="sm" variant="outline" onClick={load} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                    </div>
                ) : !data ? (
                    <div className="p-6 text-center text-xs text-slate-400">No admission selected.</div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl border border-slate-200 p-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Charged</div>
                                <div className="text-sm font-bold tabular-nums text-slate-800">{inr(data.totalCharged)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Received</div>
                                <div className="text-sm font-bold tabular-nums text-emerald-700">{inr(data.totalReceived)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Balance</div>
                                <div className={cn('text-sm font-bold tabular-nums', data.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>{inr(Math.abs(data.balance))} {data.balance < 0 ? 'CR' : ''}</div>
                            </div>
                        </div>

                        {/* Day cards */}
                        <div className="space-y-2">
                            {data.days.map(day => (
                                <div key={day.dayNumber} className={cn('rounded-xl border', day.isClosed ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/30')}>
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-[11px] font-bold">{day.dayNumber}</span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                    Day {day.dayNumber}
                                                    {day.isClosed ? (
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-300"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> {day.interimBillNo}</Badge>
                                                    ) : day.isCurrent ? (
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-amber-50 text-amber-700 border-amber-300">In progress</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-slate-50 text-slate-500 border-slate-300">Open</Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{fmtWindow(day.fromUtc)} → {fmtWindow(day.toUtc)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-bold tabular-nums text-slate-800">{inr(day.netAmount)}</div>
                                            <div className="text-[10px] text-slate-400 tabular-nums">cum {inr(day.cumulativeNetAmount)}</div>
                                        </div>
                                    </div>

                                    {day.lines.length > 0 ? (
                                        <div className="px-3 py-1.5 space-y-1">
                                            {day.lines.map(l => (
                                                <div key={l.chargeEventId} className="flex items-center justify-between gap-2 text-[11px]">
                                                    <span className="flex items-center gap-1.5 min-w-0 text-slate-700">
                                                        <IndianRupee className="h-3 w-3 text-indigo-400 shrink-0" />
                                                        <span className="truncate">{l.displayName || l.categoryCode || '—'}</span>
                                                        <span className="text-slate-400 shrink-0">{l.qty}×{inr(l.unitPrice)}</span>
                                                    </span>
                                                    <span className="tabular-nums font-medium text-slate-800 shrink-0">{inr(l.netAmount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 text-[10px] text-slate-400 italic">No charges in this day yet.</div>
                                    )}

                                    {day.isClosed && (
                                        <div className="px-3 py-1.5 border-t border-slate-100 flex justify-end gap-1">
                                            {printSettings && patient && (
                                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-indigo-700 hover:bg-indigo-50" onClick={() => handlePrintDay(day)}>
                                                    <Printer className="h-3 w-3 mr-1" /> Print
                                                </Button>
                                            )}
                                            {day.dayNumber === lastClosedDayNo && (
                                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-amber-700 hover:bg-amber-50" onClick={() => { setReopenTarget(day); setReopenReason(''); }} disabled={busy}>
                                                    <Unlock className="h-3 w-3 mr-1" /> Reopen
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>

            {/* Reopen reason dialog */}
            <Dialog open={!!reopenTarget} onOpenChange={(o) => { if (!o) setReopenTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reopen interim bill {reopenTarget?.interimBillNo}</DialogTitle>
                        <DialogDescription>
                            This unlocks Day {reopenTarget?.dayNumber}'s charges so they can be edited and re-billed. A reason is required for the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                        <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="e.g. Charge added late / correction needed" rows={3} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReopenTarget(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={handleReopen} disabled={busy || !reopenReason.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Unlock className="h-4 w-4 mr-1" />} Reopen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
