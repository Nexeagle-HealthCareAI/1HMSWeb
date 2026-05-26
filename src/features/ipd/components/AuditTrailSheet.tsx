import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RefreshCw, Loader2, AlertCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { auditService, type AuditLogItem } from '../services/auditService';

interface AuditTrailSheetProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    admissionId: string;
    patientId?: string;
    patientName?: string;
}

const ACTION_TONE: Record<string, string> = {
    INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

// EF entity name → friendly label
const ENTITY_LABEL: Record<string, string> = {
    Admission: 'Admission',
    BedAssignment: 'Bed Assignment',
    RoundNote: 'Round Note',
    VitalReading: 'Vital Reading',
    DischargeSummary: 'Discharge Summary',
    ConsentRecord: 'Consent',
    ConsentTemplate: 'Consent Template',
    FluidEntry: 'Fluid Entry',
    GlucoseReading: 'Glucose',
    NursingAssessment: 'Nursing Assessment',
    MedicationOrder: 'Medication Order',
    MedicationAdministration: 'Medication Dose',
    PatientAllergy: 'Allergy',
    BillingChargeEvent: 'Billing Charge',
    BillingInvoice: 'Invoice',
    BillingPayment: 'Payment',
};

const friendlyEntity = (name: string) => ENTITY_LABEL[name] ?? name;

interface ChangeRow { field: string; old?: unknown; new?: unknown; }

const parseChanges = (raw?: string): { rows: ChangeRow[]; rawSnapshot?: unknown } => {
    if (!raw) return { rows: [] };
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            // diff shape: { Field: { old, new } } — UPDATE
            const rows: ChangeRow[] = [];
            let isDiff = true;
            for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
                if (v && typeof v === 'object' && ('old' in (v as object) || 'new' in (v as object))) {
                    const obj = v as { old?: unknown; new?: unknown };
                    rows.push({ field: k, old: obj.old, new: obj.new });
                } else {
                    isDiff = false;
                    break;
                }
            }
            if (isDiff) return { rows };
            return { rows: [], rawSnapshot: parsed };
        }
        return { rows: [], rawSnapshot: parsed };
    } catch {
        return { rows: [] };
    }
};

const formatValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v.toString();
    if (typeof v === 'string') {
        // ISO timestamp heuristic
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
            try { return format(parseISO(v), 'd MMM yyyy HH:mm'); } catch { return v; }
        }
        return v.length > 80 ? v.slice(0, 80) + '…' : v;
    }
    try { return JSON.stringify(v); } catch { return String(v); }
};

const EntryRow: React.FC<{ entry: AuditLogItem }> = ({ entry }) => {
    const [open, setOpen] = useState(false);
    const tone = ACTION_TONE[entry.action] ?? 'bg-slate-50 text-slate-600 border-slate-200';
    const { rows, rawSnapshot } = useMemo(() => parseChanges(entry.changes), [entry.changes]);
    const hasDetail = rows.length > 0 || !!rawSnapshot;

    return (
        <div className="rounded-lg border border-slate-200 bg-white">
            <button
                type="button"
                onClick={() => hasDetail && setOpen(o => !o)}
                className={cn('w-full text-left p-3 flex items-start gap-3', hasDetail ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default')}
            >
                <div className="shrink-0 mt-0.5">
                    {hasDetail ? (open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />) : <span className="block h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{entry.action}</Badge>
                        <p className="text-sm font-bold text-slate-900">{friendlyEntity(entry.entityName)}</p>
                        {rows.length > 0 && (
                            <span className="text-[11px] text-slate-500">· {rows.length} field{rows.length === 1 ? '' : 's'} changed</span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {entry.userName ?? 'System'} · {format(parseISO(entry.createdAt), 'd MMM HH:mm:ss')} ({formatDistanceToNowStrict(parseISO(entry.createdAt))} ago)
                    </p>
                </div>
            </button>

            {open && hasDetail && (
                <div className="border-t border-slate-100 p-3 bg-slate-50/50">
                    {rows.length > 0 ? (
                        <div className="space-y-1.5">
                            {rows.map(r => (
                                <div key={r.field} className="text-xs">
                                    <span className="font-semibold text-slate-700">{r.field}</span>
                                    <span className="text-slate-400 mx-1.5">·</span>
                                    <span className="text-rose-600 line-through">{formatValue(r.old)}</span>
                                    <span className="text-slate-400 mx-1.5">→</span>
                                    <span className="text-emerald-700 font-semibold">{formatValue(r.new)}</span>
                                </div>
                            ))}
                        </div>
                    ) : rawSnapshot ? (
                        <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all max-h-60 overflow-auto font-mono">
                            {JSON.stringify(rawSnapshot, null, 2)}
                        </pre>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export const AuditTrailSheet: React.FC<AuditTrailSheetProps> = ({ open, onOpenChange, admissionId, patientId, patientName }) => {
    const [items, setItems] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await auditService.logs({ admissionId, take: 300 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load audit trail');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId]);

    useEffect(() => { if (open) load(); }, [open, load]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return items;
        return items.filter(it => (
            it.action.toLowerCase().includes(q) ||
            friendlyEntity(it.entityName).toLowerCase().includes(q) ||
            it.entityName.toLowerCase().includes(q) ||
            (it.userName ?? '').toLowerCase().includes(q) ||
            (it.changes ?? '').toLowerCase().includes(q)
        ));
    }, [items, filter]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                            <History className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Audit Trail</SheetTitle>
                            <SheetDescription className="text-xs">
                                Every write on this admission{patientName && <> · {patientName}</>}{patientId && <> · {patientId}</>}.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filter by entity, user, field, value…"
                            className="h-8 text-xs pl-8"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                    {loading && (
                        <div className="space-y-2">
                            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                            <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No audit entries yet</p>
                            <p className="text-xs text-slate-500 mt-1">Every change on this admission will appear here automatically.</p>
                        </div>
                    )}

                    {!loading && !error && items.length > 0 && filtered.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                            <p className="text-sm font-semibold text-slate-700">No entries match "{filter}"</p>
                        </div>
                    )}

                    {!loading && !error && filtered.map(it => <EntryRow key={it.auditLogId} entry={it} />)}
                </div>

                <div className="shrink-0 px-6 py-3 bg-white border-t border-slate-100 text-[11px] text-slate-500">
                    Showing {filtered.length} of {items.length} · newest first · capped at 300 entries
                </div>
            </SheetContent>
        </Sheet>
    );
};
