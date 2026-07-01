import React, { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, BedDouble, ClipboardList, Wallet, ArrowLeftRight, LogOut, Check, Loader2, Search, RefreshCw, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';

type ActionMode = 'menu' | 'assign' | 'transfer' | 'discharge' | null;
type DateFilterMode = 'TODAY' | 'ALL' | 'RANGE';

// Backend timestamps come back naive (no timezone suffix) since the DB stores UTC without an
// offset — treat those as UTC before converting to IST, otherwise the browser's Date parser
// reads them as local time and the displayed time is wrong outside IST-local browsers.
const toIstDate = (iso: string): Date => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTz ? iso : `${iso}Z`);
};

// "24Dec.2026" — day + abbreviated month + period + year, no spaces.
const formatIstDate = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
    const month = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
    const year = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    return `${day}${month}.${year}`;
};

const formatIstDateTime = (iso?: string | null): string => {
    if (!iso) return '';
    const datePart = formatIstDate(iso);
    const d = toIstDate(iso);
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart}, ${time}`;
};

// YYYY-MM-DD in IST — matches the value of a native <input type="date"> for direct comparison.
const istDateKey = (iso: string): string => toIstDate(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const todayIstKey = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

interface Props {
    onAdmit: () => void;
    onOpenBedBoard: () => void;
    refreshSignal: number;
}

/**
 * IPD dashboard — the admitted-patient list only (the live bed board is its own screen,
 * BedBoardScreen). Backed by GET /admission/active; also fetches GET /bed/board (not rendered)
 * just to populate the free-bed picker inside the assign/transfer dialog.
 */
export const IpdDashboard: React.FC<Props> = ({ onAdmit, onOpenBedBoard, refreshSignal }) => {
    const { toast } = useToast();
    const [admissions, setAdmissions] = useState<ActiveAdmissionItem[]>([]);
    const [freeBeds, setFreeBeds] = useState<BedBoardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');

    const [selected, setSelected] = useState<ActiveAdmissionItem | null>(null);
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [pickedBedId, setPickedBedId] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([admissionApi.getActiveAdmissions(), bedBoardApi.getBoard()])
            .then(([admissionItems, beds]) => {
                setAdmissions(admissionItems);
                setFreeBeds(beds.filter(b => b.isActive && !b.admissionId));
            })
            .catch(() => toast({ title: 'Could not load active admissions', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps

    const kpis = useMemo(() => ({
        admittedCount: admissions.length,
        unassigned: admissions.filter(a => !a.bedCode).length,
        nonCash: admissions.filter(a => a.payerType !== 'CASH').length,
    }), [admissions]);

    const filteredAdmissions = useMemo(() => {
        const q = search.trim().toLowerCase();
        return admissions.filter(a => {
            if (dateFilter === 'TODAY' && istDateKey(a.admittedAt) !== todayIstKey()) return false;
            if (dateFilter === 'RANGE') {
                const key = istDateKey(a.admittedAt);
                if (rangeFrom && key < rangeFrom) return false;
                if (rangeTo && key > rangeTo) return false;
            }
            if (!q) return true;
            return (a.patientName ?? '').toLowerCase().includes(q)
                || (a.patientId ?? '').toLowerCase().includes(q)
                || a.admissionNo.toLowerCase().includes(q)
                || (a.bedCode ?? '').toLowerCase().includes(q);
        });
    }, [admissions, search, dateFilter, rangeFrom, rangeTo]);

    const openAdmission = (a: ActiveAdmissionItem) => {
        setSelected(a); setActionMode('menu'); setPickedBedId(''); setNotes('');
    };
    const closeDialog = () => { setSelected(null); setActionMode(null); };

    const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            closeDialog();
            load();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md">
                        <Hotel className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">IPD</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Active admissions — assign a bed, transfer, or discharge.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10" onClick={load} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button onClick={onOpenBedBoard} variant="outline" className="h-10 font-semibold">
                        <LayoutGrid className="h-4 w-4 mr-2" /> Live Bed Board
                    </Button>
                    <Button onClick={onAdmit} className="h-10 bg-brand-600 hover:bg-brand-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> Admit Patient
                    </Button>
                </div>
            </div>

            {/* KPI tiles — derived purely from the admissions list, no bed-board display needed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiTile label="Admitted" value={kpis.admittedCount} icon={<Hotel className="h-4 w-4" />} tone="sky" />
                <KpiTile label="Unassigned" value={kpis.unassigned} icon={<ClipboardList className="h-4 w-4" />} tone="amber" />
                <KpiTile label="Non-cash payer" value={kpis.nonCash} icon={<Wallet className="h-4 w-4" />} tone="rose" />
            </div>

            {/* Active admissions list */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Active Admissions</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
                            {(['TODAY', 'ALL', 'RANGE'] as DateFilterMode[]).map(m => (
                                <button key={m} type="button" onClick={() => setDateFilter(m)}
                                    className={cn('h-7 px-3 rounded-md text-[11px] font-bold transition-all',
                                        dateFilter === m ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                    {m === 'TODAY' ? 'Today' : m === 'ALL' ? 'All' : 'Range'}
                                </button>
                            ))}
                        </div>
                        {dateFilter === 'RANGE' && (
                            <div className="flex items-center gap-1.5">
                                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-9 text-xs w-36 bg-white" />
                                <span className="text-slate-400 text-xs">to</span>
                                <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-9 text-xs w-36 bg-white" />
                            </div>
                        )}
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, UHID, admission #, bed…" className="h-9 text-sm pl-8 w-64 bg-white" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                <th className="text-left px-3 py-2.5 font-bold">Admission #</th>
                                <th className="text-left px-3 py-2.5 font-bold">Type / Payer</th>
                                <th className="text-left px-3 py-2.5 font-bold">Bed</th>
                                <th className="text-left px-3 py-2.5 font-bold">Admitted</th>
                                <th className="text-left px-3 py-2.5 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmissions.map(a => (
                                <tr key={a.admissionId} className="border-t border-slate-100 hover:bg-brand-50/40 cursor-pointer" onClick={() => openAdmission(a)}>
                                    <td className="px-3 py-2">
                                        <p className="font-semibold text-slate-900">{a.patientName || '—'}</p>
                                        <p className="text-[11px] text-slate-500">{a.patientId}{a.patientAge != null ? ` · ${a.patientAge}${a.patientSex ?? ''}` : ''}</p>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs text-brand-700 font-bold">{a.admissionNo}</td>
                                    <td className="px-3 py-2 text-xs text-slate-700">{a.admissionType ?? '—'} · {a.payerType}</td>
                                    <td className="px-3 py-2 text-xs text-slate-700">
                                        {a.bedCode ? <>{a.wardName ? `${a.wardName} · ` : ''}{a.bedCode}</> : <span className="text-amber-600 font-semibold">Unassigned</span>}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{formatIstDateTime(a.admittedAt)}</td>
                                    <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">{a.statusCode}</Badge>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredAdmissions.length === 0 && (
                                <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">No admissions match your filters.</td></tr>
                            )}
                            {loading && admissions.length === 0 && (
                                <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Assign / transfer / discharge dialog */}
            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-md">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selected.patientName || 'Patient'} · {selected.admissionNo}</DialogTitle>
                                <DialogDescription>{selected.bedCode ? `${selected.wardName ?? ''} · ${selected.bedCode}` : 'No bed assigned'} · {selected.payerType}</DialogDescription>
                            </DialogHeader>

                            {actionMode === 'menu' && (
                                <div className="space-y-2">
                                    {selected.bedCode ? (
                                        <Button variant="outline" className="w-full justify-start h-11" onClick={() => setActionMode('transfer')}>
                                            <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer to another bed
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="w-full justify-start h-11" onClick={() => setActionMode('assign')}>
                                            <BedDouble className="h-4 w-4 mr-2" /> Assign a bed
                                        </Button>
                                    )}
                                    <Button className="w-full justify-start h-11 bg-amber-600 hover:bg-amber-700" onClick={() => setActionMode('discharge')}>
                                        <LogOut className="h-4 w-4 mr-2" /> Discharge patient
                                    </Button>
                                </div>
                            )}

                            {(actionMode === 'assign' || actionMode === 'transfer') && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">Bed</Label>
                                        <select value={pickedBedId} onChange={e => setPickedBedId(e.target.value)} className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white">
                                            <option value="">Select a bed…</option>
                                            {freeBeds.map(b => (
                                                <option key={b.bedId} value={b.bedId}>{(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={!pickedBedId || busy} className="bg-brand-600 hover:bg-brand-700"
                                            onClick={() => runAction(
                                                () => actionMode === 'assign'
                                                    ? bedBoardApi.assignBed(selected.admissionId, pickedBedId)
                                                    : bedBoardApi.transferBed(selected.admissionId, pickedBedId),
                                                actionMode === 'assign' ? 'Bed assigned.' : 'Bed transferred.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BedDouble className="h-4 w-4 mr-2" />}
                                            {actionMode === 'assign' ? 'Assign' : 'Transfer'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {actionMode === 'discharge' && (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                                        This closes the admission to DISCHARGED{selected.bedCode ? ` and releases bed ${selected.bedCode}` : ''}.
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                                        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={busy} className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => runAction(() => bedBoardApi.dischargeAdmission(selected.admissionId, notes || undefined), 'Patient discharged.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const KpiTile: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; tone: string; sub?: string }> = ({ label, value, icon, tone, sub }) => {
    const tones: Record<string, string> = {
        indigo: 'bg-brand-50 border-brand-100 text-brand-700',
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        sky: 'bg-sky-50 border-sky-100 text-sky-700',
        rose: 'bg-rose-50 border-rose-100 text-rose-700',
        amber: 'bg-amber-50 border-amber-100 text-amber-700',
    };
    return (
        <div className={cn('rounded-xl border p-4', tones[tone])}>
            <div className="flex items-center gap-1.5 opacity-80">{icon}<p className="text-[10px] font-bold uppercase tracking-widest">{label}</p></div>
            <p className="text-2xl font-black mt-1 text-slate-900">{value}</p>
            {sub && <p className="text-[10px] mt-0.5 opacity-70">{sub}</p>}
        </div>
    );
};
