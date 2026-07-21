import React, { useEffect, useMemo, useState } from 'react';
import { Hotel, Plus, ClipboardList, Wallet, Loader2, Search, RefreshCw, LayoutGrid, Package, Gauge, Stethoscope, CalendarCheck, Check, Pencil, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { PrintDischargeButton } from '../components/PrintDischargeButton';
import { PrintAdmissionButton } from '../components/PrintAdmissionButton';
import { PrintTokenButton } from '../components/PrintTokenButton';
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
    onOpenReferredAdmissions: () => void;
    onOpenWorkspace: (admission: ActiveAdmissionItem) => void;
    refreshSignal: number;
}

/**
 * IPD dashboard — the admitted-patient list only (the live bed board, CSSD board, and KPI
 * dashboard are their own screens; per-patient management — bed, medications, discharge,
 * surgery — is the Patient Workspace screen, opened by clicking a row). Backed by GET /admission/active.
 * Inventory Management lives in the app's main side nav (/inventory), not here.
 */
export const IpdDashboard: React.FC<Props> = ({ onAdmit, onOpenBedBoard, onOpenCssdBoard, onOpenKpiDashboard, onOpenConsultantLedger, onOpenReferredAdmissions, onOpenWorkspace, refreshSignal }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const isMobile = useIsMobile();
    // Reactive (not a one-off getHospitalId() grab) so that if this screen mounts before the
    // persisted auth store finishes hydrating hospitalId, load() below re-runs automatically the
    // moment it becomes available instead of throwing synchronously and crashing the dashboard.
    const { hospitalId } = useAuthStore();
    const { isLowBandwidthMode } = useAppStore();
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
        // hospitalId isn't ready yet (e.g. auth store still hydrating on first mount) — skip for
        // now; the effect below re-runs load() automatically once hospitalId becomes available.
        if (!hospitalId) return;
        setLoading(true);

        if (statusFilter === 'ACTIVE') {
            admissionApi.getActiveAdmissions('ACTIVE', hospitalId)
                .then(active => {
                    setAdmissions(active);
                    setActiveAdmissions(active);
                })
                .catch(() => toast({ title: 'Could not load admissions', variant: 'destructive' }))
                .finally(() => setLoading(false));
        } else {
            Promise.all([
                admissionApi.getActiveAdmissions(statusFilter, hospitalId),
                admissionApi.getActiveAdmissions('ACTIVE', hospitalId),
            ])
                .then(([list, active]) => {
                    setAdmissions(list);
                    setActiveAdmissions(active);
                })
                .catch(() => toast({ title: 'Could not load admissions', variant: 'destructive' }))
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => { load(); }, [refreshSignal, statusFilter, hospitalId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 pt-2 pb-28 sm:pb-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
            {/* Header Card (Unified Theme & Layout matching Appointment Dashboard) */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                {/* Decorative flare */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                                <Hotel className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Inpatient Department</h1>
                                <p className="text-[11px] text-brand-100 mt-0.5 animate-pulse">Manage active census, beds & referrals</p>
                            </div>
                        </div>
                        {/* Admit button on the right for desktop */}
                        <button 
                            onClick={() => { if (isSubscriptionReadOnly) { blockAction('Admitting patients'); return; } onAdmit(); }} 
                            className="hidden sm:flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold bg-white text-brand-700 hover:bg-brand-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-black/5"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Admit Patient
                        </button>
                    </div>

                    {/* Navigation Tab Capsule */}
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm">
                        {/* Tab 1: Active Census (Selected) */}
                        <div className="bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm rounded-xl py-2 flex flex-col items-center justify-center text-center cursor-default">
                            <Hotel className="h-5 w-5 mb-1" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">Active<br/>Census</span>
                        </div>

                        {/* Tab 2: Bed Board */}
                        <button 
                            onClick={onOpenBedBoard}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <LayoutGrid className="h-5 w-5 mb-1 opacity-80 group-hover:opacity-100" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Bed<br/>Board</span>
                        </button>

                        {/* Tab 3: Referrals */}
                        <button 
                            onClick={onOpenReferredAdmissions}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <UserPlus className="h-5 w-5 mb-1 opacity-80 group-hover:opacity-100" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Referred<br/>Admissions</span>
                        </button>

                        {/* Tab 4: Ledger */}
                        <button 
                            onClick={onOpenConsultantLedger}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <Stethoscope className="h-5 w-5 mb-1 opacity-80 group-hover:opacity-100" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Consultant<br/>Ledger</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-8 xl:px-12 space-y-6">

            {/* KPI tiles — always the active census, regardless of the list's status filter below */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <KpiTile label="Admitted" value={kpis.admittedCount} icon={<Hotel className="h-4 w-4" />} tone="sky" />
                <KpiTile label="Unassigned" value={kpis.unassigned} icon={<ClipboardList className="h-4 w-4" />} tone="amber" />
                <KpiTile label="Non-cash" value={kpis.nonCash} icon={<Wallet className="h-4 w-4" />} tone="rose" />
            </div>

            {/* Admissions list */}
            <section className="space-y-3">
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admissions</h2>
                        <Button variant="outline" onClick={load} disabled={loading} className="h-9 rounded-xl px-3 shadow-sm shrink-0 border-slate-200/60 hover:bg-slate-50 transition-all text-slate-600 font-semibold">
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-2 lg:flex-wrap">
                        {/* Search — full width on mobile, flexes on desktop */}
                        <div className="relative w-full lg:flex-1 lg:min-w-[220px]">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isMobile ? 'Search name, UHID, bed…' : 'Search name, UHID, admission #, bed…'} className="h-11 sm:h-10 rounded-xl text-sm pl-9 w-full bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20 transition-all hover:border-slate-300" />
                        </div>

                        {/* Segmented filters — wrap onto their own rows on small screens */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-zinc-900/80 shrink-0 border border-slate-200/40 dark:border-zinc-800">
                                {(['ACTIVE', 'DISCHARGED', 'ALL'] as AdmissionStatusFilter[]).map(s => (
                                    <button key={s} type="button" onClick={() => setStatusFilter(s)}
                                        className={cn('h-8 px-4 rounded-full text-xs font-extrabold transition-all duration-200 shrink-0',
                                            statusFilter === s ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50')}>
                                        {s === 'ACTIVE' ? 'Active' : s === 'DISCHARGED' ? 'Discharged' : 'All'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-zinc-900/80 shrink-0 border border-slate-200/40 dark:border-zinc-800">
                                {(['TODAY', 'ALL', 'RANGE'] as DateFilterMode[]).map(m => (
                                    <button key={m} type="button" onClick={() => setDateFilter(m)}
                                        className={cn('h-8 px-4 rounded-full text-xs font-extrabold transition-all duration-200 shrink-0',
                                            dateFilter === m ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50')}>
                                        {m === 'TODAY' ? 'Today' : m === 'ALL' ? 'All' : 'Range'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dateFilter === 'RANGE' && (
                            <div className="flex items-center gap-1.5 lg:shrink-0">
                                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-11 sm:h-10 rounded-xl text-xs flex-1 lg:flex-none lg:w-36 bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20" />
                                <span className="text-slate-400 text-xs font-semibold shrink-0">to</span>
                                <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-11 sm:h-10 rounded-xl text-xs flex-1 lg:flex-none lg:w-36 bg-white shadow-sm border-slate-200/60 focus:ring-brand-500/20" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:rounded-2xl md:border md:border-slate-200/60 md:bg-white md:shadow-sm md:overflow-hidden">
                    {/* Mobile Card Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                        {paginatedAdmissions.map(a => (
                            <div key={a.admissionId} className={cn("border border-slate-200/60 dark:border-zinc-800/85 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 cursor-pointer transition-all active:scale-[0.98]",
                                !isLowBandwidthMode ? "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg shadow-brand-500/5 hover:shadow-xl hover:shadow-brand-500/10" : "bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md"
                            )} onClick={() => onOpenWorkspace(a)}>
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-zinc-50 text-base leading-tight">{a.patientName || '—'}</p>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">{a.patientId}{a.patientAge != null ? ` · ${a.patientAge}${a.patientSex ?? ''}` : ''}</p>
                                    </div>
                                    <Badge variant="outline" className={cn('text-[10px] font-bold px-2.5 py-0.5 shrink-0 rounded-full',
                                        a.statusCode === 'ADMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' :
                                            a.statusCode === 'DISCHARGED' ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' :
                                                'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
                                    )}>
                                        {a.statusCode}
                                    </Badge>
                                </div>
                                {a.statusCode === 'ADMITTED' && (
                                    <div className="flex flex-wrap justify-end gap-2 mt-1">
                                        <span onClick={e => e.stopPropagation()}><PrintTokenButton admission={a} className="h-9 text-xs px-3.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-0 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors" /></span>
                                        <span onClick={e => e.stopPropagation()}><PrintAdmissionButton admission={a} className="h-9 text-xs px-3.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-0 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors" /></span>
                                        <Button size="sm" variant="outline" className="h-9 text-xs px-3.5 rounded-full bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 border-0 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors" onClick={e => { e.stopPropagation(); setEditingAdmissionTarget(a); }}>
                                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-9 text-xs px-3.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-0 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors" onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                                        </Button>
                                    </div>
                                )}
                                {a.statusCode === 'PRE_ADMIT' && (
                                    <div className="flex flex-wrap justify-end gap-2 mt-1">
                                        <span onClick={e => e.stopPropagation()}><PrintTokenButton admission={a} className="h-9 text-xs px-3.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-0 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors" /></span>
                                        <span onClick={e => e.stopPropagation()}><PrintAdmissionButton admission={a} className="h-9 text-xs px-3.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-0 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors" /></span>
                                        <Button size="sm" variant="outline" className="h-9 text-xs px-3.5 rounded-full bg-brand-600 text-white border-0 hover:bg-brand-700 transition-colors shadow-sm" onClick={e => { e.stopPropagation(); openConfirmArrival(a); }}>
                                            <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Confirm arrival
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-9 text-xs px-3.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-450 border-0 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors" onClick={e => { e.stopPropagation(); setCancelAdmissionTarget(a); }}>
                                            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                                        </Button>
                                    </div>
                                )}
                                {a.statusCode === 'DISCHARGED' && (
                                    <div className="flex justify-end mt-1" onClick={e => e.stopPropagation()}>
                                        <PrintDischargeButton admission={a} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs bg-slate-50 dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-zinc-850">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Admission #</span>
                                        <span className="font-mono text-brand-700 dark:text-brand-400 font-bold">{a.admissionNo}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Bed</span>
                                        <span className={cn('font-semibold truncate', a.bedCode ? 'text-slate-800 dark:text-zinc-200' : 'text-amber-600 dark:text-amber-400')}>{a.bedCode ? `${a.wardName ? a.wardName + ' · ' : ''}${a.bedCode}` : 'Unassigned'}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Payer</span>
                                        <span className="text-slate-800 dark:text-zinc-200 font-semibold truncate">{a.payerType} {a.payerName && <span className="text-slate-500 dark:text-zinc-450 font-medium">({a.payerName})</span>}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Admitted</span>
                                        <span className="text-slate-800 dark:text-zinc-200 font-semibold truncate">{formatIstDateTime(a.admittedAt).split(',')[0]}</span>
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
                                                    <PrintTokenButton admission={a} className="h-6 px-2 text-[10px]" />
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
                                                    <PrintTokenButton admission={a} className="h-6 px-2 text-[10px]" />
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

            {/* Mobile-only Extended FAB */}
            <div className="sm:hidden fixed bottom-20 right-4 z-40 pointer-events-auto">
                <button onClick={() => { if (isSubscriptionReadOnly) { blockAction('Admitting patients'); return; } onAdmit(); }} className="h-14 px-5 flex items-center justify-center rounded-full text-sm font-black bg-brand-600 text-white shadow-xl shadow-brand-600/40 active:scale-95 hover:scale-[1.02] transition-all gap-1.5 border border-brand-500/20">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                    <span>Admit Patient</span>
                </button>
            </div>
        </div>
    );
};

const KpiTile: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; tone: string; sub?: string }> = ({ label, value, icon, tone, sub }) => {
    const { isLowBandwidthMode } = useAppStore();
    const tones: Record<string, string> = {
        indigo: 'bg-brand-50/70 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border-brand-100/50 dark:border-brand-800/30',
        emerald: 'bg-emerald-50/70 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-800/30',
        sky: 'bg-sky-50/70 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100/50 dark:border-sky-800/30',
        rose: 'bg-rose-50/70 dark:bg-rose-900/20 text-rose-700 dark:text-rose-450 border-rose-100/50 dark:border-rose-800/30',
        amber: 'bg-amber-50/70 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100/50 dark:border-amber-800/30',
    };
    
    // Fallback simple colors for low bandwidth
    const fallbackTones: Record<string, string> = {
        indigo: 'bg-brand-50 border-brand-100 text-brand-700',
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        sky: 'bg-sky-50 border-sky-100 text-sky-700',
        rose: 'bg-rose-50 border-rose-100 text-rose-700',
        amber: 'bg-amber-50 border-amber-100 text-amber-700',
    };

    return (
        <div className={cn(
            'rounded-[1.5rem] border p-3.5 sm:p-5 transition-all overflow-hidden relative group flex flex-col justify-between min-h-[92px]',
            !isLowBandwidthMode ? 'backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-0.5' : 'shadow-sm',
            !isLowBandwidthMode ? tones[tone] : fallbackTones[tone]
        )}>
            {!isLowBandwidthMode && (
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    {icon}
                </div>
            )}
            <div className="flex flex-col gap-0.5">
                <p className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5 leading-tight">{label}</p>
            </div>
            {sub && <p className="text-[9px] font-semibold mt-1 opacity-75">{sub}</p>}
        </div>
    );
};
