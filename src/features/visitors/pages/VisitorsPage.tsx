import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    UserSquare, Plus, Search, RefreshCw, Loader2, AlertCircle, Save, X,
    LogOut, Clock, Printer, BadgeCheck, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    visitorService,
    type VisitorPassListItem, type IssueVisitorPassRequest,
    type VisitorStatus, type VisitorPurpose, type VisitorIdProof,
} from '../services/visitorService';

const PURPOSES: { value: VisitorPurpose; label: string }[] = [
    { value: 'VISIT',     label: 'Visit' },
    { value: 'ATTENDANT', label: 'Attendant' },
    { value: 'DELIVERY',  label: 'Delivery' },
    { value: 'OTHER',     label: 'Other' },
];

const ID_PROOFS: { value: VisitorIdProof; label: string }[] = [
    { value: 'AADHAAR',  label: 'Aadhaar' },
    { value: 'VOTER_ID', label: 'Voter ID' },
    { value: 'PAN',      label: 'PAN' },
    { value: 'DL',       label: 'Driving licence' },
    { value: 'PASSPORT', label: 'Passport' },
    { value: 'OTHER',    label: 'Other' },
];

const STATUS_TONE: Record<string, string> = {
    ACTIVE:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    CHECKED_OUT: 'bg-slate-100 text-slate-600 border-slate-200',
};

const toLocal = (s?: string) => s ? s.slice(0, 16) : '';
const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

const initialIssue = (): IssueVisitorPassRequest => ({
    visitorName: '',
    purpose: 'VISIT',
});

const fmtMinutes = (m: number) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

// ─── Issue dialog ──────────────────────────────────────────────────────────

const IssueSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onIssued: (passNumber: string, name: string) => void;
}> = ({ open, onOpenChange, onIssued }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<IssueVisitorPassRequest>(initialIssue());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setForm(initialIssue());
    }, [open]);

    const set = <K extends keyof IssueVisitorPassRequest>(k: K, v: IssueVisitorPassRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        if (!form.visitorName.trim()) { toast({ title: 'Visitor name required', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await visitorService.issue(form);
            if (!res.success) throw new Error(res.message ?? 'Could not issue');
            toast({ title: 'Pass issued', description: `${res.passNumber} · ${form.visitorName}` });
            onIssued(res.passNumber ?? '', form.visitorName);
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not issue', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <BadgeCheck className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-base font-bold">Issue visitor pass</SheetTitle>
                            <SheetDescription className="text-xs">A unique pass number is generated and printed on save.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Visitor</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Visitor name *</Label>
                                <Input value={form.visitorName} onChange={e => set('visitorName', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Mobile</Label>
                                <Input value={form.visitorMobile ?? ''} onChange={e => set('visitorMobile', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Relationship</Label>
                                <Input value={form.relationship ?? ''} onChange={e => set('relationship', e.target.value)} className="h-9 mt-1" placeholder="Father / Spouse / Friend…" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">ID proof type</Label>
                                <select value={form.visitorIdProofType ?? ''} onChange={e => set('visitorIdProofType', (e.target.value || undefined) as VisitorIdProof | undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    <option value="">—</option>
                                    {ID_PROOFS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">ID proof #</Label>
                                <Input value={form.visitorIdProofNumber ?? ''} onChange={e => set('visitorIdProofNumber', e.target.value)} className="h-9 mt-1 font-mono" />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Visiting</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Purpose</Label>
                                <select value={form.purpose ?? 'VISIT'} onChange={e => set('purpose', e.target.value as VisitorPurpose)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Expected exit</Label>
                                <Input type="datetime-local" value={toLocal(form.expectedExitAt)} onChange={e => set('expectedExitAt', toIso(e.target.value))} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Patient being visited</Label>
                                <Input value={form.patientName ?? ''} onChange={e => set('patientName', e.target.value)} className="h-9 mt-1" placeholder="Name (or leave blank for non-patient visit)" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Ward</Label>
                                <Input value={form.ward ?? ''} onChange={e => set('ward', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Bed #</Label>
                                <Input value={form.bedNo ?? ''} onChange={e => set('bedNo', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                                <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Issuing…</> : <><Save className="h-4 w-4 mr-2" />Issue pass</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Issued confirmation (with print) ─────────────────────────────────────

const IssuedConfirmation: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    passNumber: string;
    visitorName: string;
}> = ({ open, onOpenChange, passNumber, visitorName }) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-emerald-700">
                    <BadgeCheck className="h-5 w-5" /> Pass issued
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Give pass <span className="font-mono font-bold text-slate-900">{passNumber}</span> to {visitorName}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// ─── Check-out dialog ────────────────────────────────────────────────────

const CheckOutDialog: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    pass: VisitorPassListItem | null;
    onDone: () => void;
}> = ({ open, onOpenChange, pass, onDone }) => {
    const { toast } = useToast();
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { if (open) setNotes(''); }, [open]);

    const submit = async () => {
        if (!pass || submitting) return;
        setSubmitting(true);
        try {
            const res = await visitorService.checkOut({ visitorPassId: pass.visitorPassId, notes: notes.trim() || undefined });
            if (!res.success) throw new Error(res.message ?? 'Could not check out');
            toast({ title: 'Checked out', description: `${pass.passNumber} · ${pass.visitorName}` });
            onDone();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not check out', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-slate-700" /> Check out visitor?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Close pass <span className="font-mono font-bold">{pass?.passNumber}</span> for <span className="font-semibold">{pass?.visitorName}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                    <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Optional" />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={submit} disabled={submitting} className="bg-slate-800 hover:bg-slate-900">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking out…</> : 'Check out'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────

type StatusFilter = 'ACTIVE' | 'CHECKED_OUT' | 'ALL';

const VisitorsPage: React.FC = () => {
    const { toast } = useToast();
    const [items, setItems] = useState<VisitorPassListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');

    const [issueOpen, setIssueOpen] = useState(false);
    const [issuedInfo, setIssuedInfo] = useState<{ passNumber: string; name: string } | null>(null);

    const [checkoutPass, setCheckoutPass] = useState<VisitorPassListItem | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await visitorService.list({ status: statusFilter, take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load visitor passes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(it =>
            it.visitorName.toLowerCase().includes(q)
            || it.passNumber.toLowerCase().includes(q)
            || (it.visitorMobile ?? '').toLowerCase().includes(q)
            || (it.patientName ?? '').toLowerCase().includes(q)
            || (it.ward ?? '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const counts = useMemo(() => {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        let active = 0, overstayed = 0, longStay = 0, issuedToday = 0;
        items.forEach(it => {
            if (it.status === 'ACTIVE') {
                active++;
                if (it.overstayed) overstayed++;
                if (it.insideMinutes >= 120) longStay++;
            }
            if (new Date(it.issuedAt) >= startOfToday) issuedToday++;
        });
        return { active, overstayed, longStay, issuedToday };
    }, [items]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <UserSquare className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Visitors & Attendants</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Front-desk pass register · who's inside · overstay alerts.</p>
                        </div>
                    </div>
                    <Button onClick={() => setIssueOpen(true)} className="h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> Issue pass
                    </Button>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Inside now</p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">{counts.active}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.overstayed > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.overstayed > 0 ? 'text-rose-700' : 'text-slate-400')}>Overstayed</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.overstayed > 0 ? 'text-rose-900' : 'text-slate-700')}>{counts.overstayed}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">In &gt; 2h</p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">{counts.longStay}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Issued today</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.issuedToday}</p>
                    </div>
                </div>

                {/* Filter strip */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pass #, visitor, mobile, patient, ward" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ACTIVE', 'CHECKED_OUT', 'ALL'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                                'h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap',
                                statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}>{s.replace(/_/g, ' ')}</button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {loading && (
                    <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                )}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <UserSquare className="h-10 w-10 text-indigo-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No visitor passes</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Issue the first pass at the front desk.</p>
                        <Button onClick={() => setIssueOpen(true)} className="h-10 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> Issue pass
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">Pass #</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Visitor</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Visiting</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Issued</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Inside</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                    <th className="text-right px-3 py-2.5 font-bold w-px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => (
                                    <tr key={it.visitorPassId} className="border-t border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-3 py-2 font-mono text-xs font-bold text-indigo-700">{it.passNumber}</td>
                                        <td className="px-3 py-2">
                                            <p className="text-sm font-semibold text-slate-900">{it.visitorName}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {it.relationship ? it.relationship : ''}
                                                {it.visitorMobile ? `${it.relationship ? ' · ' : ''}${it.visitorMobile}` : ''}
                                                {!it.relationship && !it.visitorMobile ? '—' : ''}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <p className="text-sm text-slate-800">{it.patientName ?? <span className="text-slate-400 italic">No patient</span>}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {it.ward ?? ''}{it.bedNo ? ` · Bed ${it.bedNo}` : ''}
                                                {!it.ward && !it.bedNo ? <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-600 border-slate-200">{it.purpose}</Badge> : ''}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">{format(parseISO(it.issuedAt), 'd MMM HH:mm')}</td>
                                        <td className={cn('px-3 py-2 text-right text-xs font-bold whitespace-nowrap', it.overstayed ? 'text-rose-700' : it.insideMinutes >= 120 && it.status === 'ACTIVE' ? 'text-amber-700' : 'text-slate-700')}>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3 w-3 opacity-60" />{fmtMinutes(it.insideMinutes)}
                                            </span>
                                            {it.overstayed && (
                                                <div className="text-[10px] text-rose-600 font-semibold mt-0.5 inline-flex items-center gap-0.5 ml-1">
                                                    <AlertTriangle className="h-2.5 w-2.5" /> over
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? '')}>{it.status.replace(/_/g, ' ')}</Badge>
                                            {it.status === 'CHECKED_OUT' && it.checkedOutAt && (
                                                <p className="text-[10px] text-slate-500 mt-0.5">{format(parseISO(it.checkedOutAt), 'd MMM HH:mm')}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap">
                                            {it.status === 'ACTIVE' && (
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setCheckoutPass(it); setCheckoutOpen(true); }}>
                                                    <LogOut className="h-3 w-3 mr-1" /> Check out
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No visitor passes match the current filters</p>
                    </div>
                )}
            </div>

            <IssueSheet
                open={issueOpen}
                onOpenChange={setIssueOpen}
                onIssued={(passNumber, name) => { setIssuedInfo({ passNumber, name }); load(true); }}
            />
            <IssuedConfirmation
                open={!!issuedInfo}
                onOpenChange={(o) => { if (!o) setIssuedInfo(null); }}
                passNumber={issuedInfo?.passNumber ?? ''}
                visitorName={issuedInfo?.name ?? ''}
            />
            <CheckOutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                pass={checkoutPass}
                onDone={() => load(true)}
            />
        </div>
    );
};

export default VisitorsPage;
