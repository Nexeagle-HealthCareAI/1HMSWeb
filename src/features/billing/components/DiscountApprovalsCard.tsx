import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ShieldAlert, CheckCircle2, X, Loader2, RefreshCw, AlertCircle,
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
import {
    discountApprovalService, type DiscountApprovalItem,
} from '../services/discountApprovalService';

const inr = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const STATUS_TONE: Record<string, string> = {
    PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface Props {
    encounterId?: string;
    /** When true, only PENDING items are loaded by default. */
    pendingOnly?: boolean;
}

export const DiscountApprovalsCard: React.FC<Props> = ({ encounterId, pendingOnly = true }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<DiscountApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [decideCtx, setDecideCtx] = useState<{ item: DiscountApprovalItem; decision: 'APPROVED' | 'REJECTED' } | null>(null);
    const [decideNote, setDecideNote] = useState('');
    const [decideBusy, setDecideBusy] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await discountApprovalService.list({
                encounterId,
                status: pendingOnly ? 'PENDING' : undefined,
                take: 200,
            });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load discount approvals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [encounterId, pendingOnly]);

    useEffect(() => { load(); }, [load]);

    const submitDecision = async () => {
        if (!decideCtx || decideBusy) return;
        if (decideCtx.decision === 'REJECTED' && !decideNote.trim()) {
            toast({ title: 'Reason required', description: 'Document why this discount is being rejected.', variant: 'destructive' });
            return;
        }
        setDecideBusy(true);
        try {
            const res = await discountApprovalService.decide({
                discountApprovalId: decideCtx.item.discountApprovalId,
                decision: decideCtx.decision,
                decisionNote: decideNote || undefined,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not decide');
            toast({
                title: decideCtx.decision === 'APPROVED' ? 'Discount approved' : 'Discount rejected',
                description: `${decideCtx.item.chargeDisplayName ?? 'Charge'} · ${decideCtx.item.requestedDiscountPercent}%`,
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

    if (!loading && !error && items.length === 0) {
        return null;
    }

    return (
        <Card className={cn(pendingCount > 0 && 'border-amber-300 ring-1 ring-amber-200')}>
            <CardHeader className="pb-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert className={cn('h-4 w-4', pendingCount > 0 ? 'text-amber-600' : 'text-slate-500')} />
                        Discount Approvals
                        {pendingCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold ml-1">
                                {pendingCount} PENDING
                            </Badge>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3 w-3 mr-1', refreshing && 'animate-spin')} /> Refresh
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
                        Pending approvals block invoice finalisation. Approve or reject each below.
                    </p>
                )}
                {items.map(it => {
                    const tone = STATUS_TONE[it.status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                    const isPending = it.status === 'PENDING';
                    return (
                        <div
                            key={it.discountApprovalId}
                            className={cn(
                                'rounded-lg border p-2.5 flex items-start gap-3',
                                isPending ? 'border-amber-200 bg-white' : 'border-slate-200 bg-slate-50/50'
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-900">{it.chargeDisplayName ?? 'Charge'}</p>
                                    <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{it.status}</Badge>
                                </div>
                                <p className="text-xs text-slate-700 mt-0.5">
                                    {inr(it.grossAmount)} gross · <strong>{it.requestedDiscountPercent}%</strong> discount = {inr(it.requestedDiscountAmount)}
                                </p>
                                <p className="text-[11px] text-rose-700 mt-0.5">
                                    Over cap by {it.overByPercent}% (cap: {it.capPercent}%)
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
                            {isPending && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                                        onClick={() => { setDecideCtx({ item: it, decision: 'REJECTED' }); setDecideNote(''); }}
                                    >
                                        <X className="h-3 w-3 mr-1" /> Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => { setDecideCtx({ item: it, decision: 'APPROVED' }); setDecideNote(''); }}
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
                            {decideCtx?.decision === 'APPROVED' ? 'Approve discount?' : 'Reject discount?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {decideCtx && (
                                <>
                                    <strong>{decideCtx.item.chargeDisplayName ?? 'Charge'}</strong> · {decideCtx.item.requestedDiscountPercent}% discount on {inr(decideCtx.item.grossAmount)}
                                    {decideCtx.decision === 'REJECTED' && ' — this will VOID the underlying charge.'}
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
                            disabled={decideBusy}
                        >
                            {decideBusy ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</> : (decideCtx?.decision === 'APPROVED' ? 'Approve' : 'Reject')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};
