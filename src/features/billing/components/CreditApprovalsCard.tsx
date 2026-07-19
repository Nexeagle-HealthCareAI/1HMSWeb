import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    PiggyBank, CheckCircle2, X, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import {
    creditApprovalService, type CreditApprovalItem,
} from '../services/creditApprovalService';

const inr = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const paymentTypeLabel = (paymentType: string) =>
    paymentType === 'REFUND' ? 'Refund'
        : paymentType === 'DISCOUNT' ? 'Discount'
            : paymentType === 'DELETE_CHARGE' ? 'Delete Charge'
                : paymentType === 'DELETE_PAYMENT' ? 'Delete Payment'
                    : 'Advance';

const isDeleteType = (paymentType: string) => paymentType === 'DELETE_CHARGE' || paymentType === 'DELETE_PAYMENT';

const STATUS_TONE: Record<string, string> = {
    PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface Props {
    encounterId?: string;
    /** When true, only PENDING items are loaded by default. Ignored when statusFilter is set. */
    pendingOnly?: boolean;
    /** Explicit status to load — overrides pendingOnly. Undefined loads every status. */
    statusFilter?: 'PENDING' | 'APPROVED' | 'REJECTED';
    /** When false, render an empty state instead of nothing — for a standalone approvals view
     *  (hospital-wide, not embedded on a specific patient's billing page). */
    hideWhenEmpty?: boolean;
}

export const CreditApprovalsCard: React.FC<Props> = ({ encounterId, pendingOnly = true, statusFilter, hideWhenEmpty = true }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const userRoles = useAuthStore(s => s.userRoles);
    const canDecide = userRoles?.includes('Admin') || userRoles?.includes('AdminDoctor');

    const [items, setItems] = useState<CreditApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [decideCtx, setDecideCtx] = useState<{ item: CreditApprovalItem; decision: 'APPROVED' | 'REJECTED' } | null>(null);
    const [decideNote, setDecideNote] = useState('');
    const [decideBusy, setDecideBusy] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await creditApprovalService.list({
                encounterId,
                status: statusFilter ?? (pendingOnly ? 'PENDING' : undefined),
                take: 200,
            });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load credit approvals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [encounterId, pendingOnly, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const submitDecision = async () => {
        if (!decideCtx || decideBusy) return;
        if (isSubscriptionReadOnly) { blockAction(decideCtx.decision === 'APPROVED' ? 'Approving credit requests' : 'Rejecting credit requests'); return; }
        if (decideCtx.decision === 'REJECTED' && !decideNote.trim()) {
            toast({ title: 'Reason required', description: 'Document why this credit request is being rejected.', variant: 'destructive' });
            return;
        }
        setDecideBusy(true);
        try {
            const res = await creditApprovalService.decide({
                creditApprovalId: decideCtx.item.creditApprovalId,
                decision: decideCtx.decision,
                decisionNote: decideNote || undefined,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not decide');
            toast({
                title: decideCtx.decision === 'APPROVED' ? 'Credit approved' : 'Credit request rejected',
                description: `${paymentTypeLabel(decideCtx.item.paymentType)} · ${inr(decideCtx.item.requestedAmount)}`,
            });
            setDecideCtx(null);
            setDecideNote('');
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not decide', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setDecideBusy(false);
        }
    };

    const pendingCount = useMemo(() => items.filter(i => i.status === 'PENDING').length, [items]);

    const effectiveStatus = statusFilter ?? (pendingOnly ? 'PENDING' : undefined);

    if (!loading && !error && items.length === 0) {
        if (hideWhenEmpty) return null;
        const emptyText = effectiveStatus === 'PENDING'
            ? 'Nothing is waiting on Admin/AdminDoctor sign-off right now.'
            : effectiveStatus === 'APPROVED'
                ? 'No credit requests have been approved yet.'
                : effectiveStatus === 'REJECTED'
                    ? 'No credit requests have been rejected yet.'
                    : 'No credit approval requests have been raised yet.';
        return (
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                    <PiggyBank className="h-6 w-6 text-slate-300" />
                    <p className="text-sm font-medium">No {effectiveStatus ? effectiveStatus.toLowerCase() : ''} approvals</p>
                    <p className="text-xs">{emptyText}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn(pendingCount > 0 && 'border-amber-300 ring-1 ring-amber-200')}>
            <CardHeader className="pb-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <PiggyBank className={cn('h-4 w-4', pendingCount > 0 ? 'text-amber-600' : 'text-slate-500')} />
                        Credit Approvals
                        {pendingCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold ml-1">
                                {pendingCount} PENDING
                            </Badge>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" className="h-9 sm:h-7 text-xs shrink-0" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3 w-3 sm:mr-1', refreshing && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" /> {error}
                    </div>
                )}
                {pendingCount > 0 && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        Pending requests hold the money uncollected/unrefunded, or keep the charge/payment in place, until an Admin decides.
                        {!canDecide && ' Only Admin/AdminDoctor can approve or reject.'}
                    </p>
                )}
                {items.map(it => {
                    const tone = STATUS_TONE[it.status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                    const isPending = it.status === 'PENDING';
                    return (
                        <div
                            key={it.creditApprovalId}
                            className={cn(
                                'rounded-lg border p-2.5 flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3',
                                isPending ? 'border-amber-200 bg-white' : 'border-slate-200 bg-slate-50/50'
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-900">{paymentTypeLabel(it.paymentType)}</p>
                                    <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{it.status}</Badge>
                                    {it.paymentMode && <span className="text-[11px] text-slate-500">{it.paymentMode}</span>}
                                </div>
                                <p className="text-xs text-slate-700 mt-0.5">
                                    {isDeleteType(it.paymentType)
                                        ? <>Requesting deletion of a {inr(it.requestedAmount)} {it.paymentType === 'DELETE_CHARGE' ? 'charge' : 'payment'}</>
                                        : <>Requested {inr(it.requestedAmount)} · would leave <strong>{inr(it.resultingCreditBalance)}</strong> in credit</>}
                                </p>
                                {it.reason && <p className="text-[11px] text-slate-600 mt-0.5">Reason: {it.reason}</p>}
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Requested by {it.requestedBy ?? '—'} · {format(parseISO(it.requestedAt), 'd MMM HH:mm')}
                                </p>
                                {!isPending && it.decidedAt && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {it.status} by {it.decidedBy ?? '—'} · {format(parseISO(it.decidedAt), 'd MMM HH:mm')}
                                        {it.decisionNote && <> · {it.decisionNote}</>}
                                    </p>
                                )}
                            </div>
                            {isPending && canDecide && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 sm:h-7 flex-1 sm:flex-none text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                                        disabled={isSubscriptionReadOnly}
                                        onClick={() => { if (isSubscriptionReadOnly) { blockAction('Rejecting credit requests'); return; } setDecideCtx({ item: it, decision: 'REJECTED' }); setDecideNote(''); }}
                                    >
                                        <X className="h-3 w-3 mr-1" /> Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-9 sm:h-7 flex-1 sm:flex-none text-xs bg-emerald-600 hover:bg-emerald-700"
                                        disabled={isSubscriptionReadOnly}
                                        onClick={() => { if (isSubscriptionReadOnly) { blockAction('Approving credit requests'); return; } setDecideCtx({ item: it, decision: 'APPROVED' }); setDecideNote(''); }}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>

            <AlertDialog open={!!decideCtx} onOpenChange={open => { if (!open) { setDecideCtx(null); setDecideNote(''); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {decideCtx?.decision === 'APPROVED' ? 'Approve credit request?' : 'Reject credit request?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {decideCtx && isDeleteType(decideCtx.item.paymentType) && (
                                <>
                                    {paymentTypeLabel(decideCtx.item.paymentType)} of {inr(decideCtx.item.requestedAmount)}.
                                    {decideCtx.item.reason && <> Reason given: “{decideCtx.item.reason}”.</>}
                                    {decideCtx.decision === 'APPROVED'
                                        ? ` Approving will permanently remove this ${decideCtx.item.paymentType === 'DELETE_CHARGE' ? 'charge' : 'payment'}.`
                                        : ' Rejecting keeps it in place — nothing is deleted.'}
                                </>
                            )}
                            {decideCtx && !isDeleteType(decideCtx.item.paymentType) && (
                                <>
                                    {paymentTypeLabel(decideCtx.item.paymentType)} of {inr(decideCtx.item.requestedAmount)}
                                    {' — '}would leave {inr(decideCtx.item.resultingCreditBalance)} in credit.
                                    {decideCtx.decision === 'APPROVED'
                                        ? ' Approving will record this as a real payment now.'
                                        : ' Rejecting discards the request — no payment is recorded.'}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Textarea
                            value={decideNote}
                            onChange={e => setDecideNote(e.target.value)}
                            rows={2}
                            placeholder={decideCtx?.decision === 'REJECTED' ? 'Reason for rejection (required)' : 'Optional note'}
                            className="text-sm"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={decideBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={decideCtx?.decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                            onClick={(e) => { e.preventDefault(); submitDecision(); }}
                            disabled={decideBusy || isSubscriptionReadOnly}
                        >
                            {decideBusy ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</> : (decideCtx?.decision === 'APPROVED' ? 'Approve' : 'Reject')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};
