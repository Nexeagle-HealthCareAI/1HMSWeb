import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Receipt, IndianRupee, FileText, Lock, Unlock,
    Printer, RefreshCw, Loader2, AlertCircle, CheckCircle2, Ban, X,
    User, BedDouble, Calendar, ChevronRight, ListChecks, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    ipdBillingService, type GetEncounterEventsResponse, type BillingChargeRow,
    type BillingPaymentRow, type InvoiceStatus,
} from '../services/ipdBillingService';
import { offlineCachedRead, isReachable } from '@/offline';
import { AddChargesModal } from '../components/AddChargesModal';
import { AddPaymentModal } from '../components/AddPaymentModal';
import { DiscountApprovalsCard } from '../components/DiscountApprovalsCard';
import { CreditApprovalsCard } from '../components/CreditApprovalsCard';

// ─── helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const CHARGE_STATUS_STYLE: Record<string, string> = {
    DRAFT:    'bg-slate-100 text-slate-600 border-slate-200',
    POSTED:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    INVOICED: 'bg-brand-50 text-brand-700 border-brand-200',
    VOID:     'bg-rose-50 text-rose-700 border-rose-200',
};

const INVOICE_STATUS_STYLE: Record<string, string> = {
    DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
    FINALIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ─── small sub-components ────────────────────────────────────────────────────

const KpiTile: React.FC<{
    label: string;
    value: string;
    sub?: string;
    tone?: 'neutral' | 'emerald' | 'amber' | 'rose' | 'blue';
    icon: React.ReactNode;
}> = ({ label, value, sub, tone = 'neutral', icon }) => {
    const tones = {
        neutral: 'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        amber:   'bg-amber-50 border-amber-200',
        rose:    'bg-rose-50 border-rose-200',
        blue:    'bg-brand-50 border-brand-200',
    } as const;
    return (
        <Card className={cn('border', tones[tone])}>
            <CardContent className="p-3.5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="text-xl font-extrabold text-slate-800 mt-1">{value}</p>
                        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
                    </div>
                    <div className="text-slate-400">{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
};

// ─── Page ────────────────────────────────────────────────────────────────────

export const EncounterBillingPage: React.FC = () => {
    const { encounterId } = useParams<{ encounterId: string }>();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId') ?? '';
    const patientName = searchParams.get('patientName') ?? undefined;
    const admissionNo = searchParams.get('admissionNo') ?? undefined;
    const wardBed = searchParams.get('wardBed') ?? undefined;
    const navigate = useNavigate();
    const { toast } = useToast();

    const [data, setData] = useState<GetEncounterEventsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [addChargesOpen, setAddChargesOpen] = useState(false);
    const [addPaymentOpen, setAddPaymentOpen] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const [reopenOpen, setReopenOpen] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [printing, setPrinting] = useState(false);
    const [voidConfirm, setVoidConfirm] = useState<{ kind: 'charge' | 'payment'; id: string; label: string } | null>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidBusy, setVoidBusy] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!encounterId || !patientId) {
            setError('Missing encounter or patient id in URL.');
            setLoading(false);
            return;
        }
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await offlineCachedRead(
                ['billing', 'encounterEvents', encounterId, patientId],
                () => ipdBillingService.getEncounterEvents(encounterId, patientId),
            );
            if (!res.success) throw new Error(res.message ?? 'Failed to load billing');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load billing data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [encounterId, patientId]);

    useEffect(() => { load(); }, [load]);

    const invoice = data?.currentInvoice ?? null;
    const invoiceStatus = (invoice?.statusCode as InvoiceStatus | undefined) ?? null;
    const charges = data?.charges ?? [];
    const payments = data?.payments ?? [];
    const netBalance = data?.netBalance ?? 0;

    const postedUnbilledCount = useMemo(
        () => charges.filter(c => c.statusCode === 'POSTED' && !c.isInvoiced).length,
        [charges],
    );

    // ─── actions ─────────────────────────────────────────────────────────────

    const handleGenerateInvoice = async () => {
        if (!encounterId || !patientId) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Generating an invoice requires an internet connection.', variant: 'destructive' }); return; }
        setGeneratingInvoice(true);
        try {
            const res = await ipdBillingService.createDraftInvoice({ encounterId, patientId });
            if (!res.success) throw new Error(res.message ?? 'Could not generate invoice');
            toast({
                title: res.data?.wasReused ? 'Charges added to existing draft' : 'Draft invoice created',
                description: `${res.data?.invoiceNo} · ${res.data?.linkedChargeCount} item(s) · Net ${inr(res.data?.netAmount)}`,
            });
            await load(true);
        } catch (e: any) {
            toast({ title: 'Invoice failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setGeneratingInvoice(false);
        }
    };

    const handleFinalize = async () => {
        if (!encounterId || !patientId) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Finalizing a bill requires an internet connection.', variant: 'destructive' }); return; }
        setFinalizing(true);
        try {
            const res = await ipdBillingService.finalize('finalize', { encounterId, patientId });
            if (!res.success) throw new Error(res.message ?? 'Could not finalize');
            toast({ title: 'Bill finalized', description: invoice?.invoiceNo ?? '' });
            await load(true);
        } catch (e: any) {
            toast({ title: 'Finalize failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setFinalizing(false);
        }
    };

    const handleReopen = async () => {
        if (!encounterId || !patientId || !reopenReason.trim()) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Reopening a bill requires an internet connection.', variant: 'destructive' }); return; }
        setFinalizing(true);
        try {
            const res = await ipdBillingService.finalize('reopen', { encounterId, patientId, reason: reopenReason.trim() });
            if (!res.success) throw new Error(res.message ?? 'Could not reopen');
            toast({ title: 'Bill reopened' });
            setReopenOpen(false);
            setReopenReason('');
            await load(true);
        } catch (e: any) {
            toast({ title: 'Reopen failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setFinalizing(false);
        }
    };

    const handlePrint = async () => {
        if (!encounterId || !patientId) return;
        setPrinting(true);
        try {
            // Backend returns JSON; print template wiring is Phase 1.8.
            // For now we just fetch to confirm endpoint and toast.
            await ipdBillingService.print(patientId, encounterId);
            toast({ title: 'Bill ready for print', description: 'Print template will land in a follow-up step.' });
        } catch (e: any) {
            toast({ title: 'Print failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setPrinting(false);
        }
    };

    const handleCancelCharge = (row: BillingChargeRow) => {
        setVoidConfirm({ kind: 'charge', id: row.chargeEventId, label: row.displayName ?? 'Charge' });
    };

    const handleDeletePayment = (row: BillingPaymentRow) => {
        setVoidConfirm({ kind: 'payment', id: row.paymentId, label: `${row.paymentType ?? 'Payment'} · ${inr(row.amount)}` });
    };

    const handleVoid = async () => {
        if (!voidConfirm || !patientId || voidBusy) return;
        setVoidBusy(true);
        try {
            const type = voidConfirm.kind === 'charge' ? 'Charges' : 'Payment';
            const res: any = await ipdBillingService.deleteEvent(voidConfirm.id, type, patientId, voidReason.trim() || undefined);
            if (res?.success === false) throw new Error(res.message ?? 'Could not delete');
            toast({ title: voidConfirm.kind === 'charge' ? 'Charge removed' : 'Payment removed' });
            setVoidConfirm(null);
            setVoidReason('');
            await load(true);
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setVoidBusy(false);
        }
    };

    // ─── render ──────────────────────────────────────────────────────────────

    if (!encounterId || !patientId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center space-y-2">
                        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
                        <p className="font-semibold text-slate-700">Open this from the billing ledger</p>
                        <p className="text-xs text-slate-500">
                            This page needs a patient and visit. Pick a patient and visit in the Billing Ledger,
                            then use “Open Encounter View”.
                        </p>
                        <Button onClick={() => navigate('/billing/ledger')} className="mt-3 bg-brand-600 hover:bg-brand-700">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Go to Billing Ledger
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isFinalized = invoiceStatus === 'FINALIZED';
    const canFinalize = !!invoice && invoiceStatus === 'DRAFT';
    const canReopen = isFinalized;

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Sticky header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base font-bold text-slate-900 truncate">
                                {patientName || patientId}
                            </h1>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                {patientId}
                            </Badge>
                            {admissionNo && (
                                <Badge variant="outline" className="text-[10px] bg-brand-50 text-brand-700 border-brand-200">
                                    {admissionNo}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Encounter Billing</span>
                            {wardBed && (
                                <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {wardBed}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            disabled={printing || !invoice}
                            variant="outline"
                            className="h-9 text-xs gap-1"
                        >
                            {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Print</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

                {/* Error */}
                {error && !loading && (
                    <Card className="border-rose-200 bg-rose-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-rose-500" />
                            <div className="flex-1">
                                <p className="font-semibold text-rose-700 text-sm">Could not load billing</p>
                                <p className="text-xs text-rose-600">{error}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {loading ? (
                        <>
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
                        </>
                    ) : (
                        <>
                            <KpiTile
                                label="Billed (gross)"
                                value={inr(data?.totalBilledAmount)}
                                sub={`${charges.filter(c => c.statusCode !== 'VOID').length} item(s)`}
                                icon={<Receipt className="h-5 w-5" />}
                                tone="blue"
                            />
                            <KpiTile
                                label="Received"
                                value={inr(data?.amountReceived)}
                                sub={`${payments.length} payment(s)`}
                                icon={<Wallet className="h-5 w-5" />}
                                tone="emerald"
                            />
                            <KpiTile
                                label="Net Balance"
                                value={inr(Math.max(0, netBalance))}
                                sub={netBalance > 0 ? 'Due from patient' : netBalance < 0 ? `${inr(-netBalance)} credit` : 'Settled'}
                                icon={<IndianRupee className="h-5 w-5" />}
                                tone={netBalance > 0 ? 'amber' : netBalance < 0 ? 'emerald' : 'neutral'}
                            />
                            <KpiTile
                                label="Invoice"
                                value={invoice ? (invoice.invoiceNo ?? '—') : 'Not generated'}
                                sub={invoiceStatus ?? (postedUnbilledCount > 0 ? `${postedUnbilledCount} unbilled` : 'No charges yet')}
                                icon={<FileText className="h-5 w-5" />}
                                tone={isFinalized ? 'emerald' : invoice ? 'amber' : 'neutral'}
                            />
                        </>
                    )}
                </div>

                {/* Action bar */}
                <Card className="border-slate-200">
                    <CardContent className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            className="bg-brand-600 hover:bg-brand-700 gap-1.5"
                            onClick={() => setAddChargesOpen(true)}
                            disabled={isFinalized}
                        >
                            <Plus className="h-4 w-4" /> Add Charges
                        </Button>

                        <Button
                            size="sm"
                            variant={postedUnbilledCount > 0 ? 'default' : 'outline'}
                            className={cn('gap-1.5', postedUnbilledCount > 0 && 'bg-emerald-600 hover:bg-emerald-700')}
                            onClick={handleGenerateInvoice}
                            disabled={generatingInvoice || (postedUnbilledCount === 0 && !!invoice)}
                            title={
                                isFinalized
                                    ? 'Invoice is finalized'
                                    : postedUnbilledCount > 0
                                        ? `Generate / extend draft invoice with ${postedUnbilledCount} unbilled charge(s)`
                                        : invoice ? 'No new charges to bill' : 'No charges to bill yet'
                            }
                        >
                            {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                            {invoice ? `Update Draft (${postedUnbilledCount})` : 'Generate Bill'}
                        </Button>

                        {canFinalize && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setFinalizeOpen(true)}
                                disabled={finalizing}
                            >
                                {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                Finalize
                            </Button>
                        )}

                        {canFinalize && postedUnbilledCount > 0 && (
                            <span className="text-[11px] text-amber-600 font-medium self-center">
                                {postedUnbilledCount} new charge{postedUnbilledCount === 1 ? '' : 's'} not yet on the bill — add them before finalizing.
                            </span>
                        )}

                        {canReopen && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => setReopenOpen(true)}
                            >
                                <Unlock className="h-4 w-4" /> Reopen
                            </Button>
                        )}

                        <div className="flex-1" />

                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
                            onClick={() => setAddPaymentOpen(true)}
                            disabled={!invoice}
                            title={invoice ? '' : 'Generate the bill first to record a payment'}
                        >
                            <Plus className="h-4 w-4" /> Record Payment
                        </Button>
                    </CardContent>
                </Card>

                {/* Charges */}
                <Card>
                    <CardHeader className="pb-2 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-brand-600" /> Charges
                            </CardTitle>
                            {!loading && (
                                <span className="text-xs text-slate-500">{charges.length} total · {postedUnbilledCount} unbilled</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-4 space-y-2">
                                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                            </div>
                        ) : charges.length === 0 ? (
                            <div className="p-10 text-center space-y-2">
                                <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
                                <p className="text-sm font-semibold text-slate-600">No charges yet</p>
                                <p className="text-xs text-slate-400 mb-2">Add charges from your charge master or as one-off lines.</p>
                                <Button size="sm" variant="outline" onClick={() => setAddChargesOpen(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add the first charge
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Date</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Item</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 hidden sm:table-cell">Category</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 text-right">Qty</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 text-right">Rate</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 text-right">Net</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Status</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {charges.map(c => {
                                        const isVoid = c.statusCode === 'VOID';
                                        const canDelete = !isFinalized && !c.isInvoiced && !isVoid;
                                        return (
                                            <TableRow key={c.chargeEventId} className={cn(isVoid && 'opacity-60')}>
                                                <TableCell className="py-2 text-xs text-slate-500">
                                                    {format(new Date(c.createdDateTime), 'dd MMM HH:mm')}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <p className={cn('text-sm font-medium', isVoid ? 'line-through text-slate-400' : 'text-slate-800')}>
                                                        {c.displayName ?? '—'}
                                                    </p>
                                                    {c.sourceModule && c.sourceModule !== 'MANUAL' && (
                                                        <p className="text-[10px] text-slate-400 mt-0.5">via {c.sourceModule}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 hidden sm:table-cell">
                                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                                        {c.categoryCode ?? '—'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 text-right text-xs text-slate-600">{c.qty}</TableCell>
                                                <TableCell className="py-2 text-right text-xs text-slate-600">{inr(c.rate)}</TableCell>
                                                <TableCell className="py-2 text-right text-sm font-bold text-slate-800">{inr(c.netAmount)}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant="outline" className={cn('text-[10px]', CHARGE_STATUS_STYLE[c.statusCode ?? ''] ?? 'bg-slate-50')}>
                                                        {c.statusCode ?? '—'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    {canDelete && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                                                            onClick={() => handleCancelCharge(c)}
                                                            title="Remove this charge"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Discount approvals (only renders if any approvals exist for this encounter) */}
                <DiscountApprovalsCard encounterId={encounterId} pendingOnly={false} />

                {/* Credit approvals (only renders if any approvals exist for this encounter) */}
                <CreditApprovalsCard encounterId={encounterId} pendingOnly={false} />

                {/* Invoice card */}
                {invoice && (
                    <Card>
                        <CardHeader className="pb-2 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-brand-600" /> Invoice {invoice.invoiceNo}
                                </CardTitle>
                                <Badge variant="outline" className={cn('text-[10px]', INVOICE_STATUS_STYLE[invoice.statusCode ?? ''] ?? 'bg-slate-50')}>
                                    {invoice.statusCode}
                                    {invoice.isReopened && ' (reopened)'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Date</p>
                                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                        {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Gross</p>
                                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{inr(invoice.grossAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Discount</p>
                                    <p className="text-sm font-semibold text-amber-700 mt-0.5">−{inr(invoice.discountAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Net</p>
                                    <p className="text-base font-extrabold text-brand-700 mt-0.5">{inr(invoice.netAmount)}</p>
                                </div>
                                {(invoice.taxAmount ?? 0) > 0 && (
                                    <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Taxable</p>
                                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{inr(invoice.taxableAmount)}</p>
                                        </div>
                                        {(invoice.cgstAmount ?? 0) > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">CGST</p>
                                                <p className="text-sm font-semibold text-slate-700 mt-0.5">{inr(invoice.cgstAmount)}</p>
                                            </div>
                                        )}
                                        {(invoice.sgstAmount ?? 0) > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">SGST</p>
                                                <p className="text-sm font-semibold text-slate-700 mt-0.5">{inr(invoice.sgstAmount)}</p>
                                            </div>
                                        )}
                                        {(invoice.igstAmount ?? 0) > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">IGST</p>
                                                <p className="text-sm font-semibold text-slate-700 mt-0.5">{inr(invoice.igstAmount)}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Total Tax</p>
                                            <p className="text-sm font-bold text-brand-700 mt-0.5">{inr(invoice.taxAmount)}</p>
                                        </div>
                                    </div>
                                )}
                                {invoice.finalizedAt && (
                                    <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100">
                                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            Finalized on {format(new Date(invoice.finalizedAt), 'dd MMM yyyy · HH:mm')}
                                            {invoice.finalizedBy && ` · by ${invoice.finalizedBy}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payments */}
                <Card>
                    <CardHeader className="pb-2 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-emerald-600" /> Payments
                            </CardTitle>
                            {!loading && (
                                <span className="text-xs text-slate-500">{payments.length} record(s)</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-4 space-y-2">
                                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <Wallet className="h-8 w-8 text-slate-300 mx-auto" />
                                <p className="text-sm font-semibold text-slate-600">No payments yet</p>
                                {invoice ? (
                                    <Button size="sm" variant="outline" onClick={() => setAddPaymentOpen(true)}>
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Record the first payment
                                    </Button>
                                ) : (
                                    <p className="text-xs text-slate-400">Generate the bill first to record a payment.</p>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Date</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Receipt</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Type</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2">Mode</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 hidden md:table-cell">Description</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 text-right">Amount</TableHead>
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 py-2 w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map(p => (
                                        <TableRow key={p.paymentId}>
                                            <TableCell className="py-2 text-xs text-slate-500">
                                                {format(new Date(p.createdDateTime), 'dd MMM HH:mm')}
                                            </TableCell>
                                            <TableCell className="py-2 text-xs font-semibold text-slate-700">{p.receiptNo ?? '—'}</TableCell>
                                            <TableCell className="py-2">
                                                <Badge variant="outline" className={cn(
                                                    'text-[10px]',
                                                    p.paymentType === 'REFUND' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    p.paymentType === 'ADVANCE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                )}>
                                                    {p.paymentType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-slate-600">{p.paymentMode}</TableCell>
                                            <TableCell className="py-2 text-xs text-slate-500 hidden md:table-cell truncate max-w-[200px]">{p.paymentDescription ?? '—'}</TableCell>
                                            <TableCell className="py-2 text-right text-sm font-bold text-emerald-700">{inr(p.amount)}</TableCell>
                                            <TableCell className="py-2 text-right">
                                                {!isFinalized && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                                                        onClick={() => handleDeletePayment(p)}
                                                        title="Remove this payment"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            <AddChargesModal
                open={addChargesOpen}
                onOpenChange={setAddChargesOpen}
                encounterId={encounterId}
                patientId={patientId}
                appliesToFilter="IPD"
                onCharged={() => load(true)}
            />
            <AddPaymentModal
                open={addPaymentOpen}
                onOpenChange={setAddPaymentOpen}
                encounterId={encounterId}
                patientId={patientId}
                netBalance={netBalance}
                onPaid={() => load(true)}
            />

            {/* Finalize confirm — finalizing locks the bill. */}
            <AlertDialog open={finalizeOpen} onOpenChange={(o) => { if (!o) setFinalizeOpen(false); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
                            <Lock className="h-5 w-5" /> Finalize bill — this locks it
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Finalizing invoice <span className="font-semibold">{invoice?.invoiceNo ?? ''}</span>{' '}
                                    <span className="font-semibold">locks it</span>. Once locked you can no longer:
                                </p>
                                <ul className="list-disc pl-5 space-y-0.5 text-sm">
                                    <li>add charges (e.g. lab tests, procedures), or</li>
                                    <li>record or edit payments against it.</li>
                                </ul>
                                {postedUnbilledCount > 0 ? (
                                    <p className="text-amber-700 font-medium">
                                        {postedUnbilledCount} charge{postedUnbilledCount === 1 ? '' : 's'} {postedUnbilledCount === 1 ? 'is' : 'are'} not on the bill yet.
                                        Use “Update Draft” to add {postedUnbilledCount === 1 ? 'it' : 'them'} before finalizing, or they’ll be left out.
                                    </p>
                                ) : (
                                    <p className="text-slate-600">
                                        If a charge is still pending (e.g. a lab), add it before finalizing. You can “Reopen” later, but it needs a reason and audit.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={finalizing}>Not yet</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); setFinalizeOpen(false); handleFinalize(); }}
                            disabled={finalizing}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                            Finalize & lock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reopen confirm */}
            <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reopen finalized bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Reopening converts the invoice back to DRAFT and reverts charges from INVOICED to POSTED.
                            A reason is required for audit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        placeholder="Reason for reopening…"
                        value={reopenReason}
                        onChange={e => setReopenReason(e.target.value)}
                        rows={3}
                        className="text-sm"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleReopen(); }}
                            disabled={!reopenReason.trim() || finalizing}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                            Reopen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!voidConfirm} onOpenChange={(o) => { if (!o) { setVoidConfirm(null); setVoidReason(''); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove <span className="font-semibold text-slate-800">{voidConfirm?.label}</span> from this visit.
                            This takes effect immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                        <Textarea
                            value={voidReason}
                            onChange={e => setVoidReason(e.target.value)}
                            rows={2}
                            placeholder="Why is this being deleted?"
                            className="text-sm"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={voidBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleVoid(); }}
                            disabled={voidBusy}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            {voidBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default EncounterBillingPage;
