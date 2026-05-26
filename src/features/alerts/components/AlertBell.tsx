import React, { useCallback, useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, X, MoonStar, Loader2, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { alertService, type AlertItem } from '../services/alertService';

const SEVERITY_TONE: Record<string, string> = {
    INFO:     'bg-sky-50 text-sky-700 border-sky-200',
    WARNING:  'bg-amber-50 text-amber-700 border-amber-200',
    CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300',
};

const severityIcon = (sev: string) => {
    switch (sev) {
        case 'CRITICAL': return <AlertCircle className="h-3.5 w-3.5" />;
        case 'WARNING':  return <AlertTriangle className="h-3.5 w-3.5" />;
        default:         return <Info className="h-3.5 w-3.5" />;
    }
};

const POLL_MS = 60_000;

export const AlertBell: React.FC = () => {
    const { toast } = useToast();
    const [counts, setCounts] = useState({ total: 0, critical: 0, warning: 0, info: 0 });
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [evaluating, setEvaluating] = useState(false);

    const loadCounts = useCallback(async () => {
        try {
            const res = await alertService.counts();
            if (res.success) {
                setCounts({
                    total: res.activeTotal,
                    critical: res.activeCritical,
                    warning: res.activeWarning,
                    info: res.activeInfo,
                });
            }
        } catch {
            // silent — header bell shouldn't pop errors
        }
    }, []);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await alertService.list({ status: 'ACTIVE', take: 50 });
            if (res.success) setItems(res.items ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCounts();
        const handle = window.setInterval(loadCounts, POLL_MS);
        return () => window.clearInterval(handle);
    }, [loadCounts]);

    useEffect(() => {
        if (open) loadList();
    }, [open, loadList]);

    const decide = async (alert: AlertItem, action: 'ACK' | 'DISMISS' | 'SNOOZE') => {
        if (busyId) return;
        setBusyId(alert.alertId);
        try {
            const res = action === 'ACK'
                ? await alertService.acknowledge(alert.alertId)
                : action === 'DISMISS'
                    ? await alertService.dismiss(alert.alertId)
                    : await alertService.snooze(alert.alertId, new Date(Date.now() + 60 * 60 * 1000).toISOString());
            if (!res.success) throw new Error(res.message ?? 'Failed');
            toast({
                title: action === 'ACK' ? 'Acknowledged' : action === 'DISMISS' ? 'Dismissed' : 'Snoozed 1h',
                description: alert.title,
            });
            loadCounts();
            loadList();
        } catch (e: any) {
            toast({ title: 'Action failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    const runEvaluator = async () => {
        if (evaluating) return;
        setEvaluating(true);
        try {
            const res = await alertService.evaluate();
            if (!res.success) throw new Error(res.message ?? 'Could not run');
            toast({
                title: 'Operational checks complete',
                description: `${res.alertsRaised} new alerts (EDD ${res.eddBreachRaised} · Deposit ${res.depositLowRaised} · Consent ${res.consentPendingRaised}) · ${res.admissionsScanned} admissions scanned`,
            });
            loadCounts();
            loadList();
        } catch (e: any) {
            toast({ title: 'Could not run checks', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setEvaluating(false);
        }
    };

    const tone = counts.critical > 0
        ? 'bg-rose-600 text-white'
        : counts.warning > 0
            ? 'bg-amber-500 text-white'
            : 'bg-indigo-600 text-white';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 hover:bg-muted/50">
                    <Bell className={cn('h-5 w-5', counts.critical > 0 && 'text-rose-600')} />
                    {counts.total > 0 && (
                        <span className={cn(
                            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center',
                            tone
                        )}>
                            {counts.total > 99 ? '99+' : counts.total}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[420px] p-0 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-indigo-600" />
                            Alerts
                            {counts.total > 0 && <Badge variant="outline" className="text-[10px] font-bold">{counts.total} active</Badge>}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {counts.critical > 0 && <span className="text-rose-700 font-semibold">{counts.critical} critical</span>}
                            {counts.critical > 0 && counts.warning > 0 && <span className="text-slate-400 mx-1">·</span>}
                            {counts.warning > 0 && <span className="text-amber-700 font-semibold">{counts.warning} warning</span>}
                            {counts.total === 0 && 'No active alerts'}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline" size="sm"
                            className="h-7 text-[10px] px-2 font-semibold"
                            onClick={runEvaluator}
                            disabled={evaluating}
                            title="Scan all open admissions for operational alerts (EDD breach, deposit low, consent pending)"
                        >
                            {evaluating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                            Run checks
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => loadList()} disabled={loading}>
                            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="p-3 space-y-2">
                            {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    )}

                    {!loading && items.length === 0 && (
                        <div className="p-8 text-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">All clear</p>
                            <p className="text-xs text-slate-500 mt-1">No active alerts.</p>
                        </div>
                    )}

                    {!loading && items.length > 0 && (
                        <div className="divide-y divide-slate-100">
                            {items.map(a => {
                                const t = SEVERITY_TONE[a.severity] ?? SEVERITY_TONE.INFO;
                                const isCritical = a.severity === 'CRITICAL';
                                return (
                                    <div key={a.alertId} className={cn('p-3', isCritical && 'bg-rose-50/40')}>
                                        <div className="flex items-start gap-2">
                                            <div className={cn('h-7 w-7 rounded-md border flex items-center justify-center shrink-0', t)}>
                                                {severityIcon(a.severity)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 leading-tight">{a.title}</p>
                                                {a.body && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{a.body}</p>}
                                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-mono">{a.alertCode}</span>
                                                    <span>·</span>
                                                    <span>{formatDistanceToNowStrict(parseISO(a.raisedAt))} ago</span>
                                                    {a.raisedBy && <><span>·</span><span>by {a.raisedBy}</span></>}
                                                    {a.dispatchedAt && <><span>·</span><span className="text-emerald-600">SMS sent {format(parseISO(a.dispatchedAt), 'HH:mm')}</span></>}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => decide(a, 'ACK')} disabled={busyId === a.alertId}>
                                                        {busyId === a.alertId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                        Ack
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => decide(a, 'SNOOZE')} disabled={busyId === a.alertId}>
                                                        <MoonStar className="h-3 w-3 mr-1" /> 1h
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-slate-500" onClick={() => decide(a, 'DISMISS')} disabled={busyId === a.alertId}>
                                                        <X className="h-3 w-3 mr-1" /> Dismiss
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
