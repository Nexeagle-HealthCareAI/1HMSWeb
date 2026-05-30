import React, { useMemo, useState } from 'react';
import { Users, Phone, Percent, Search, Share2, AlertCircle, RefreshCw, Pencil, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useReferrers, useUpdateReferrer } from '@/features/appointment/hooks/useReferrers';
import type { Referrer } from '@/features/appointment/services/referrerApi';

const TYPE_TONE: Record<string, string> = {
    REFERRER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DOCTOR: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    STAFF: 'bg-teal-50 text-teal-700 border-teal-200',
    AGENT: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    DEPARTMENT: 'bg-amber-50 text-amber-700 border-amber-200',
};

const TYPES = ['REFERRER', 'DOCTOR', 'STAFF', 'AGENT', 'DEPARTMENT'];

type EditForm = {
    referrerId: string;
    referrerName: string;
    referrerType: string;
    phone: string;
    email: string;
    address: string;
    pan: string;
    defaultRatePercent: string;
    isActive: boolean;
};

export const ReferrersPanel: React.FC = () => {
    const { hospitalId } = useAuthStore();
    const { data, isLoading, isError, refetch, isFetching } = useReferrers(hospitalId || '');
    const updateMut = useUpdateReferrer(hospitalId || '');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<EditForm | null>(null);

    const referrers: Referrer[] = data?.referrers ?? [];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = q
            ? referrers.filter(r =>
                r.referrerName.toLowerCase().includes(q) ||
                (r.phone ?? '').toLowerCase().includes(q) ||
                r.referrerType.toLowerCase().includes(q))
            : referrers;
        return [...rows].sort((a, b) => (b.referredPatientCount ?? 0) - (a.referredPatientCount ?? 0));
    }, [referrers, search]);

    const totalPatients = useMemo(
        () => referrers.reduce((t, r) => t + (r.referredPatientCount ?? 0), 0),
        [referrers],
    );

    const openEdit = (r: Referrer) => setEditing({
        referrerId: r.referrerId,
        referrerName: r.referrerName,
        referrerType: r.referrerType || 'REFERRER',
        phone: r.phone ?? '',
        email: r.email ?? '',
        address: r.address ?? '',
        pan: r.pan ?? '',
        defaultRatePercent: String(r.defaultRatePercent ?? 0),
        isActive: r.isActive,
    });

    const saveEdit = async () => {
        if (!editing) return;
        if (!editing.referrerName.trim()) { toast({ title: 'Referrer name is required', variant: 'destructive' }); return; }
        const rate = parseFloat(editing.defaultRatePercent || '0');
        if (isNaN(rate) || rate < 0 || rate > 100) { toast({ title: 'Rate must be between 0 and 100', variant: 'destructive' }); return; }
        try {
            const res = await updateMut.mutateAsync({
                referrerId: editing.referrerId,
                referrerName: editing.referrerName.trim(),
                referrerType: editing.referrerType,
                phone: editing.phone.trim() || undefined,
                email: editing.email.trim() || undefined,
                address: editing.address.trim() || undefined,
                pan: editing.pan.trim() || undefined,
                defaultRatePercent: rate,
                isActive: editing.isActive,
            });
            if (res && (res as any).success === false) throw new Error(res.message ?? 'Update failed');
            toast({ title: 'Referrer updated', description: editing.referrerName.trim() });
            setEditing(null);
        } catch (e: any) {
            toast({ title: 'Could not update referrer', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/30">
                        <Share2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrers</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Everyone who refers patients, and how many they've sent.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search referrer / phone…" className="pl-9 h-9 text-sm rounded-xl" />
                    </div>
                    <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="relative overflow-hidden border-0 ring-1 ring-black/5 p-4 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-purple-100/50 text-fuchsia-900 shadow-lg shadow-fuchsia-500/5">
                    <div className="h-11 w-11 rounded-xl bg-white/70 flex items-center justify-center"><Users className="h-5 w-5 text-fuchsia-600" /></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Total Referrers</p><p className="text-2xl font-black tabular-nums">{isLoading ? '…' : referrers.length}</p></div>
                </Card>
                <Card className="relative overflow-hidden border-0 ring-1 ring-black/5 p-4 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-100/50 text-indigo-900 shadow-lg shadow-indigo-500/5">
                    <div className="h-11 w-11 rounded-xl bg-white/70 flex items-center justify-center"><Share2 className="h-5 w-5 text-indigo-600" /></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Patients Referred (Total)</p><p className="text-2xl font-black tabular-nums">{isLoading ? '…' : totalPatients}</p></div>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-0 ring-1 ring-black/5 rounded-2xl overflow-hidden bg-white shadow-lg shadow-indigo-500/5">
                {isLoading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
                ) : isError ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center"><AlertCircle className="h-6 w-6" /></div>
                        <p className="text-sm font-semibold text-rose-600">Could not load referrers</p>
                        <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-14 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center"><Users className="h-6 w-6" /></div>
                        <p className="text-sm font-semibold text-slate-600">{referrers.length === 0 ? 'No referrers yet' : 'No referrers match your search'}</p>
                        <p className="text-xs text-slate-400 max-w-xs">{referrers.length === 0 ? 'Referrers added while booking appointments will appear here.' : 'Try a different name or phone.'}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-slate-50/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Referrer</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Type</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Phone</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Address</TableHead>
                                <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Rate</TableHead>
                                <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Patients Sent</TableHead>
                                <TableHead className="w-px" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(r => (
                                <TableRow key={r.referrerId} className="group border-b border-slate-50 transition-colors hover:bg-fuchsia-50/40">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-100 to-purple-100 border border-fuchsia-200 flex items-center justify-center text-xs font-bold text-fuchsia-700">{r.referrerName.charAt(0).toUpperCase()}</div>
                                            <div className="min-w-0">
                                                <span className="font-bold text-slate-900 block truncate">{r.referrerName}</span>
                                                {r.email && <span className="text-[10px] text-slate-400 truncate block">{r.email}</span>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', TYPE_TONE[r.referrerType] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>{r.referrerType}</Badge></TableCell>
                                    <TableCell className="text-slate-600 text-xs">{r.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{r.phone}</span> : '—'}</TableCell>
                                    <TableCell className="text-slate-600 text-xs max-w-[200px]">{r.address ? <span className="inline-flex items-start gap-1"><MapPin className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" /><span className="line-clamp-2">{r.address}</span></span> : '—'}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold text-slate-600 tabular-nums"><span className="inline-flex items-center gap-0.5">{r.defaultRatePercent}<Percent className="h-3 w-3" /></span></TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            'inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-sm font-black tabular-nums',
                                            (r.referredPatientCount ?? 0) > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400',
                                        )}>
                                            {r.referredPatientCount ?? 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-2">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(r)} title="Edit referrer">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Edit dialog */}
            <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5">
                            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/30"><Pencil className="h-4 w-4" /></span>
                            Edit Referrer
                        </DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold">Name</Label>
                                <Input value={editing.referrerName} onChange={(e) => setEditing(f => f && ({ ...f, referrerName: e.target.value }))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Type</Label>
                                <Select value={editing.referrerType} onValueChange={(v) => setEditing(f => f && ({ ...f, referrerType: v }))}>
                                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Rate (%)</Label>
                                <Input type="number" min={0} max={100} step="0.01" value={editing.defaultRatePercent} onChange={(e) => setEditing(f => f && ({ ...f, defaultRatePercent: e.target.value }))} className="h-9 mt-1 font-mono" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Phone</Label>
                                <Input value={editing.phone} onChange={(e) => setEditing(f => f && ({ ...f, phone: e.target.value }))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">PAN</Label>
                                <Input value={editing.pan} onChange={(e) => setEditing(f => f && ({ ...f, pan: e.target.value }))} className="h-9 mt-1 font-mono uppercase" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold">Email</Label>
                                <Input type="email" value={editing.email} onChange={(e) => setEditing(f => f && ({ ...f, email: e.target.value }))} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold">Address</Label>
                                <Textarea value={editing.address} onChange={(e) => setEditing(f => f && ({ ...f, address: e.target.value }))} rows={2} className="text-sm mt-1" placeholder="Referrer address" />
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <input id="ref-active" type="checkbox" checked={editing.isActive} onChange={(e) => setEditing(f => f && ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                                <Label htmlFor="ref-active" className="text-xs font-semibold">Active</Label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)} disabled={updateMut.isPending}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={updateMut.isPending} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white">
                            {updateMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReferrersPanel;
