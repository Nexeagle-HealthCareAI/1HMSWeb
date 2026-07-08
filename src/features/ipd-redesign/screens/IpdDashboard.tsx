import React, { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, ClipboardList, Wallet, Loader2, Search, RefreshCw, LayoutGrid, Package, Gauge, Stethoscope, CalendarCheck, Check, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PrintDischargeButton } from '../components/PrintDischargeButton';
import { PrintAdmissionButton } from '../components/PrintAdmissionButton';
import { EditAdmissionSheet } from '../components/EditAdmissionSheet';
import { admissionApi, type ActiveAdmissionItem, type AdmissionStatusFilter } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';

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

const STATUS_TONE: Record<string, string> = {
    ADMITTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PRE_ADMIT: 'bg-sky-50 text-sky-700 border-sky-200',
    DISCHARGE_INITIATED: 'bg-amber-50 text-amber-700 border-amber-200',
    DISCHARGE_BILLED: 'bg-amber-50 text-amber-700 border-amber-200',
    DISCHARGED: 'bg-slate-100 text-slate-600 border-slate-200',
};
const statusTone = (status: string) => STATUS_TONE[status] ?? 'bg-rose-50 text-rose-700 border-rose-200';

interface Props {
    onAdmit: () => void;
    onOpenBedBoard: () => void;
    onOpenCssdBoard: () => void;
    onOpenKpiDashboard: () => void;
    onOpenConsultantLedger: () => void;
    onOpenWorkspace: (admission: ActiveAdmissionItem) => void;
    refreshSignal: number;
}

/**
 * IPD dashboard — the admitted-patient list only (the live bed board, CSSD board, and KPI
 * dashboard are their own screens; per-patient management — bed, medications, discharge,
 * surgery — is the Patient Workspace screen, opened by clicking a row). Backed by GET /admission/active.
 * Inventory Management lives in the app's main side nav (/inventory), not here.
 */
export const IpdDashboard: React.FC<Props> = ({ onAdmit, onOpenBedBoard, onOpenCssdBoard, onOpenKpiDashboard, onOpenConsultantLedger, onOpenWorkspace, refreshSignal }) => {
    const { toast } = useToast();
    const [admissions, setAdmissions] = useState<ActiveAdmissionItem[]>([]);
    // KPIs always reflect the current active census, independent of the list's status filter.
    const [activeAdmissions, setActiveAdmissions] = useState<ActiveAdmissionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>('ACTIVE');
    const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 5;

    // Confirm-arrival: a PRE_ADMIT (elective pre-registration) admission has physically arrived.
    const [confirmArrivalTarget, setConfirmArrivalTarget] = useState<ActiveAdmissionItem | null>(null);
    const [arrivalBeds, setArrivalBeds] = useState<BedBoardItem[]>([]);
    const [arrivalBedId, setArrivalBedId] = useState('');
    const [confirmingArrival, setConfirmingArrival] = useState(false);

    const [editingAdmissionTarget, setEditingAdmissionTarget] = useState<ActiveAdmissionItem | null>(null);
    const [cancelAdmissionTarget, setCancelAdmissionTarget] = useState<ActiveAdmissionItem | null>(null);
    const [cancellingAdmission, setCancellingAdmission] = useState(false);

    const load = () => {
        setLoading(true);
        
        if (statusFilter === 'ACTIVE') {
            admissionApi.getActiveAdmissions('ACTIVE')
                .then(active => {
                    setAdmissions(active);
                    setActiveAdmissions(active);
                })
                .catch(() => toast({ title: 'Could not load admissions', variant: 'destructive' }))
                .finally(() => setLoading(false));
        } else {
            Promise.all([
                admissionApi.getActiveAdmissions(statusFilter),
                admissionApi.getActiveAdmissions('ACTIVE'),
            ])
                .then(([list, active]) => {
                    setAdmissions(list);
                    setActiveAdmissions(active);
                })
                .catch(() => toast({ title: 'Could not load admissions', variant: 'destructive' }))
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => { load(); }, [refreshSignal, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const openConfirmArrival = (a: ActiveAdmissionItem) => {
        setConfirmArrivalTarget(a);
        setArrivalBedId('');
        bedBoardApi.getBoard()
            .then(items => setArrivalBeds(items.filter(b => b.isActive && !b.admissionId)))
            .catch(() => setArrivalBeds([]));
    };

    const submitConfirmArrival = async () => {
        if (!confirmArrivalTarget) return;
        setConfirmingArrival(true);
        try {
            const res = await admissionApi.confirmArrival(confirmArrivalTarget.admissionId, arrivalBedId || undefined);
            if (res.success) {
                toast({ title: 'Arrival confirmed.' });
                setConfirmArrivalTarget(null);
                load();
            } else {
                toast({ title: 'Could not confirm arrival', description: res.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Could not confirm arrival', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setConfirmingArrival(false);
        }
    };

    const submitCancelAdmission = async () => {
        if (!cancelAdmissionTarget) return;
        setCancellingAdmission(true);
        try {
            await admissionApi.updateStatus(cancelAdmissionTarget.admissionId, 'CANCELLED');
            toast({ title: 'Admission cancelled.' });
            setCancelAdmissionTarget(null);
            load();
        } catch (err) {
            toast({ title: 'Could not cancel admission', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setCancellingAdmission(false);
        }
    };

    const kpis = useMemo(() => ({
        admittedCount: activeAdmissions.length,
        unassigned: activeAdmissions.filter(a => !a.bedCode).length,
        nonCash: activeAdmissions.filter(a => a.payerType !== 'CASH').length,
    }), [activeAdmissions]);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [search, dateFilter, rangeFrom, rangeTo, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredAdmissions.length / PAGE_SIZE));
    const paginatedAdmissions = filteredAdmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="w-full max-w-full pb-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 px-4 sm:px-8 xl:px-12 py-6 sm:py-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 shadow-lg shadow-brand-900/5 relative overflow-hidden">
                {/* Decorative background flare */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">Inpatient Department</h1>
                    <p className="text-brand-100 text-sm font-medium mt-1 drop-shadow-sm">Click a patient to manage their bed, medications, and discharge.</p>
                </div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center flex-wrap gap-1.5 p-1.5 bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-inner w-full sm:w-auto">
                        <button onClick={onOpenBedBoard} className="flex items-center h-10 px-4 rounded-xl shrink-0 text-sm font-bold text-white hover:bg-white/20 transition-all">
                            <LayoutGrid className="h-4 w-4 mr-2 text-brand-200" /> Live Bed Board
                        </button>
                        <button onClick={onOpenKpiDashboard} className="flex items-center h-10 px-4 rounded-xl shrink-0 text-sm font-bold text-white hover:bg-white/20 transition-all">
                            <Gauge className="h-4 w-4 mr-2 text-brand-200" /> KPI Dashboard
                        </button>
                        <button onClick={onOpenConsultantLedger} className="flex items-center h-10 px-4 rounded-xl shrink-0 text-sm font-bold text-white hover:bg-white/20 transition-all">
                            <Stethoscope className="h-4 w-4 mr-2 text-brand-200" /> Consultant Ledger
                        </button>
                    </div>
                    <button onClick={onAdmit} className="flex items-center justify-center h-11 px-6 rounded-xl shrink-0 text-sm font-bold bg-white text-brand-700 hover:bg-brand-50 hover:scale-[1.02] transition-all shadow-lg shadow-black/10 w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" /> Admit Patient
                    </button>
                </div>
            </div>

            <div className="px-4 sm:px-8 xl:px-12 space-y-6">

            {/* KPI tiles — always the active census, regardless of the list's status filter below */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiTile label="Admitted" value={kpis.admittedCount} icon={<Hotel className="h-4 w-4" />} tone="sky" />
                <KpiTile label="Unassigned" value={kpis.unassigned} icon={<ClipboardList className="h-4 w-4" />} tone="amber" />
                <KpiTile label="Non-cash payer" value={kpis.nonCash} icon={<Wallet className="h-4 w-4" />} tone="rose" />
            </div>

            {/* Admissions list */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admissions</h2>
                    <div className="flex items-center gap-2 flex-wrap w-full">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 shrink-0 border border-slate-200/40">
                            {(['ACTIVE', 'DISCHARGED', 'ALL'] as AdmissionStatusFilter[]).map(s => (
                                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                                    className={cn('h-8 px-4 rounded-lg text-xs font-bold transition-all duration-200',
                                        statusFilter === s ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}>
                                    {s === 'ACTIVE' ? 'Active' : s === 'DISCHARGED' ? 'Discharged' : 'All'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 shrink-0 border border-slate-200/40">
                            {(['TODAY', 'ALL', 'RANGE'] as DateFilterMode[]).map(m => (
                                <button key={m} type="button" onClick={() => setDateFilter(m)}
                                    className={cn('h-8 px-4 rounded-lg text-xs font-bold transition-all duration-200',
                                        dateFilter === m ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}>
                                    {m === 'TODAY' ? 'Today' : m === 'ALL' ? 'All' : 'Range'}
                                </button>
                            ))}
                        </div>
                        {dateFilter === 'RANGE' && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-10 rounded-xl text-xs w-32 sm:w-36 bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20" />
                                <span className="text-slate-400 text-xs font-semibold">to</span>
                                <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-10 rounded-xl text-xs w-32 sm:w-36 bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20" />
                            </div>
                        )}
                        <div className="relative w-full sm:w-auto flex-1 min-w-[200px]">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, UHID, admission #, bed…" className="h-10 rounded-xl text-sm pl-9 w-full bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20 transition-all hover:border-slate-300" />
                        </div>
                        <Button variant="outline" onClick={load} disabled={loading} className="h-10 rounded-xl px-4 shadow-sm shrink-0 border-slate-200/60 hover:bg-slate-50 transition-all text-slate-600 font-semibold">
                            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Refresh
                        </Button>
                    </div>
                </div>

                <div className="md:rounded-2xl md:border md:border-slate-200/60 md:bg-white md:shadow-sm md:overflow-hidden">
                    {/* Mobile Card Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                        {paginatedAdmissions.map(a => (
                            <div key={a.admissionId} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex flex-col gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" onClick={() => onOpenWorkspace(a)}>
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <p className="font-bold text-slate-900 text-base leading-tight">{a.patientName || '—'}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{a.patientId}{a.patientAge != null ? ` · ${a.patientAge}${a.patientSex ?? ''}` : ''}</p>
                                    </div>
                                    <Badge variant="outline" className={cn('text-[10px] font-bold px-2.5 py-0.5 shrink-0 rounded-full',
                                        a.statusCode === 'ADMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            a.statusCode === 'DISCHARGED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                    )}>
                                        {a.statusCode}
                                    </Badge>
                                </div>
                                {a.statusCode === 'ADMITTED' && (
                                    <div className="flex justify-end gap-1.5 mt-1">
                                        <PrintAdmissionButton admission={a} className="h-7 text-[10px]" />
                                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={e => { e.stopPropagation(); setEditingAdmissionTarget(a); }}>
                                            <Pencil className="h-3 w-3 mr-1" /> Edit details
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100" onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                            <X className="h-3 w-3 mr-1" /> Cancel
                                        </Button>
                                    </div>
                                )}
                                {a.statusCode === 'PRE_ADMIT' && (
                                    <div className="flex justify-end gap-1.5 mt-1">
                                        <PrintAdmissionButton admission={a} className="h-7 text-[10px]" />
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100" onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                            <X className="h-3 w-3 mr-1" /> Cancel
                                        </Button>
                                    </div>
                                )}
                                {a.statusCode === 'DISCHARGED' && (
                                    <div className="flex justify-end mt-1">
                                        <PrintDischargeButton admission={a} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Admission #</span>
                                        <span className="font-mono text-brand-700 font-bold">{a.admissionNo}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Bed</span>
                                        <span className="text-slate-800 font-semibold truncate">{a.wardName ? `${a.wardName} - ${a.bedName}` : 'Unassigned'}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Payer</span>
                                        <span className="text-slate-800 font-semibold truncate">{a.payerType} {a.payerName && <span className="text-slate-500 font-medium">({a.payerName})</span>}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Admitted</span>
                                        <span className="text-slate-800 font-semibold truncate">{formatIstDateTime(a.admittedAt).split(',')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredAdmissions.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200 border-dashed">
                                No admissions found matching filters.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table Layout */}
                    <table className="w-full text-sm hidden md:table">
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
                            {paginatedAdmissions.map(a => (
                                <tr key={a.admissionId} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => onOpenWorkspace(a)}>
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
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', statusTone(a.statusCode))}>{a.statusCode}</Badge>
                                            {a.statusCode === 'PRE_ADMIT' && (
                                                <>
                                                    <PrintAdmissionButton admission={a} className="h-6 px-2 text-[10px]" />
                                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                                                        onClick={e => { e.stopPropagation(); openConfirmArrival(a); }}>
                                                        <CalendarCheck className="h-3 w-3 mr-1" /> Confirm arrival
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                                                        onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                                        <X className="h-3 w-3 mr-1" /> Cancel
                                                    </Button>
                                                </>
                                            )}
                                            {a.statusCode === 'ADMITTED' && (
                                                <>
                                                    <PrintAdmissionButton admission={a} className="h-6 px-2 text-[10px]" />
                                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                                                        onClick={e => { e.stopPropagation(); setEditingAdmissionTarget(a); }}>
                                                        <Pencil className="h-3 w-3 mr-1" /> Edit details
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                                                        onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                                        <X className="h-3 w-3 mr-1" /> Cancel
                                                    </Button>
                                                </>
                                            )}
                                            {a.statusCode === 'DISCHARGED' && (
                                                <PrintDischargeButton admission={a} />
                                            )}
                                        </div>
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
                    
                    {/* Pagination Controls */}
                    {filteredAdmissions.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
                            <span className="text-xs font-semibold text-slate-500">
                                Showing <span className="text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * PAGE_SIZE, filteredAdmissions.length)}</span> of <span className="text-slate-800">{filteredAdmissions.length}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-600 disabled:opacity-50"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-bold text-slate-700 px-2 bg-slate-50 h-8 flex items-center rounded-lg border border-slate-200">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-600 disabled:opacity-50"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <Dialog open={!!confirmArrivalTarget} onOpenChange={o => { if (!o) setConfirmArrivalTarget(null); }}>
                <DialogContent className="max-w-sm">
                    {confirmArrivalTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Confirm arrival — {confirmArrivalTarget.patientName || confirmArrivalTarget.patientId}?</DialogTitle>
                                <DialogDescription>Moves this pre-registration to a completed admission. Optionally assign a bed now.</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Bed (optional)</Label>
                                <select value={arrivalBedId} onChange={e => setArrivalBedId(e.target.value)}
                                    className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white">
                                    <option value="">— Assign later —</option>
                                    {arrivalBeds.map(b => (
                                        <option key={b.bedId} value={b.bedId}>{b.wardName ? `${b.wardName} · ` : ''}{b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setConfirmArrivalTarget(null)}>Cancel</Button>
                                <Button disabled={confirmingArrival} className="bg-brand-600 hover:bg-brand-700" onClick={submitConfirmArrival}>
                                    {confirmingArrival ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm arrival
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!cancelAdmissionTarget} onOpenChange={o => { if (!o) setCancelAdmissionTarget(null); }}>
                <DialogContent className="max-w-sm">
                    {cancelAdmissionTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Cancel Admission?</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to cancel the admission for <strong className="text-slate-800">{cancelAdmissionTarget.patientName || cancelAdmissionTarget.patientId}</strong>?
                                    This will release any assigned bed and mark the admission as cancelled. This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="ghost" onClick={() => setCancelAdmissionTarget(null)}>No, keep it</Button>
                                <Button disabled={cancellingAdmission} className="bg-rose-600 hover:bg-rose-700" onClick={submitCancelAdmission}>
                                    {cancellingAdmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />} Yes, cancel admission
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <EditAdmissionSheet
                open={!!editingAdmissionTarget}
                onOpenChange={open => !open && setEditingAdmissionTarget(null)}
                admission={editingAdmissionTarget}
                onUpdated={() => { setEditingAdmissionTarget(null); load(); }}
            />
            </div>
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
        <div className={cn('rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md', tones[tone])}>
            <div className="flex items-center gap-2 opacity-80 mb-2">{icon}<p className="text-[11px] font-bold uppercase tracking-widest">{label}</p></div>
            <p className="text-3xl font-black text-slate-900">{value}</p>
            {sub && <p className="text-xs font-semibold mt-1 opacity-75">{sub}</p>}
        </div>
    );
};
