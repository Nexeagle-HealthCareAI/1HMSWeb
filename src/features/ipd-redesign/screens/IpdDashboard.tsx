import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Search, RefreshCw, CalendarCheck, Check, Pencil, X, ChevronLeft, ChevronRight, MoreHorizontal, SlidersHorizontal, ArrowRight, BedDouble, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { PrintDischargeButton } from '../components/PrintDischargeButton';
import { PrintAdmissionButton } from '../components/PrintAdmissionButton';
import { PrintTokenButton } from '../components/PrintTokenButton';
import { EditAdmissionSheet } from '../components/EditAdmissionSheet';
import { IpdSectionHeader, type IpdTab } from '../components/IpdSectionHeader';
import { admissionApi, type ActiveAdmissionItem, type AdmissionStatusFilter } from '../services/admissionApi';
import { admissionReferralApi } from '../services/admissionReferralApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { formatIstDayLabel, formatIstTime, toIstDate } from '../utils/istDate';
import { DISCHARGE_STAGE_LABELS, dischargeStage } from '../utils/workspaceOverview';
import {
    expectedDischarge, filterOptions, filterRoster, groupByWard, payerLabel, rosterTiles, rowAction, statusLabel, stayDay, titleCase,
    type QuickFilter, type RosterTile,
} from '../utils/rosterBoard';
import type { Section } from './PatientWorkspace';

type DateFilterMode = 'TODAY' | 'ALL' | 'RANGE';

const PAGE_SIZES = [25, 50, 100] as const;
const GROUP_KEY = 'ipd-roster-group-by-ward';

const shortDate = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
};

const readGroupPref = (): boolean => { try { return localStorage.getItem(GROUP_KEY) === '1'; } catch { return false; } };
const saveGroupPref = (on: boolean) => { try { localStorage.setItem(GROUP_KEY, on ? '1' : '0'); } catch { /* preference only */ } };

interface Props {
    onAdmit: () => void;
    onNavigate: (tab: IpdTab) => void;
    onOpenWorkspace: (admission: ActiveAdmissionItem, section?: Section) => void;
    refreshSignal: number;
}

/**
 * IPD roster — everyone admitted, one row each, with the stage they are at and the next step.
 * The tiles on top count the current census and double as one-tap filters. Per-patient work
 * (bed, orders, medicines, discharge) is the Patient Workspace, opened by clicking a row.
 * Backed by GET /admission/active.
 */
export const IpdDashboard: React.FC<Props> = ({ onAdmit, onNavigate, onOpenWorkspace, refreshSignal }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    // Reactive (not a one-off getHospitalId() grab) so that if this screen mounts before the
    // persisted auth store finishes hydrating hospitalId, load() below re-runs automatically the
    // moment it becomes available instead of throwing synchronously and crashing the dashboard.
    const { hospitalId } = useAuthStore();
    const [admissions, setAdmissions] = useState<ActiveAdmissionItem[]>([]);
    // Tiles always reflect the current active census, independent of the list's status filter.
    const [activeAdmissions, setActiveAdmissions] = useState<ActiveAdmissionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>('ACTIVE');
    const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [quick, setQuick] = useState<QuickFilter>('ALL');
    const [wardFilter, setWardFilter] = useState('ALL');
    const [doctorFilter, setDoctorFilter] = useState('ALL');
    const [payerFilter, setPayerFilter] = useState('ALL');
    const [groupByWardOn, setGroupByWardOn] = useState(readGroupPref);
    const [filtersOpen, setFiltersOpen] = useState(false);   // phone only — the dropdowns sit behind "Filters"
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
    const [pendingReferrals, setPendingReferrals] = useState(0);

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
            const res = await admissionApi.confirmArrival(confirmArrivalTarget.admissionId, arrivalBedId && arrivalBedId !== 'assign-later' ? arrivalBedId : undefined);
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

    // Pending referrals for the tab badge — a count only, and never worth an error toast.
    useEffect(() => {
        if (!hospitalId) return;
        admissionReferralApi.list({ statusCode: 'PENDING', page: 1, pageSize: 1 })
            .then(res => setPendingReferrals(res?.totalCount ?? 0))
            .catch(() => setPendingReferrals(0));
    }, [hospitalId, refreshSignal]);

    const tiles = useMemo(() => rosterTiles(activeAdmissions), [activeAdmissions]);
    const options = useMemo(() => filterOptions(admissions), [admissions]);

    const filteredAdmissions = useMemo(() => filterRoster(admissions, {
        search, quick, ward: wardFilter, doctor: doctorFilter, payer: payerFilter, dateMode: dateFilter, rangeFrom, rangeTo,
    }), [admissions, search, quick, wardFilter, doctorFilter, payerFilter, dateFilter, rangeFrom, rangeTo]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, dateFilter, rangeFrom, rangeTo, statusFilter, quick, wardFilter, doctorFilter, payerFilter, pageSize]);

    // A filter whose value no longer exists in the loaded list (e.g. after switching to
    // Discharged) would silently hide every row — drop it back to "all".
    useEffect(() => {
        if (wardFilter !== 'ALL' && !options.wards.includes(wardFilter)) setWardFilter('ALL');
        if (doctorFilter !== 'ALL' && !options.doctors.includes(doctorFilter)) setDoctorFilter('ALL');
        if (payerFilter !== 'ALL' && !options.payers.includes(payerFilter)) setPayerFilter('ALL');
    }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalPages = Math.max(1, Math.ceil(filteredAdmissions.length / pageSize));
    const paginatedAdmissions = filteredAdmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const groups = useMemo(
        () => (groupByWardOn ? groupByWard(paginatedAdmissions) : [{ ward: '', rows: paginatedAdmissions }]),
        [groupByWardOn, paginatedAdmissions],
    );

    // The tiles count the active census, so picking one also switches the list to Active.
    const pickTile = (key: QuickFilter) => {
        setQuick(prev => (prev === key ? 'ALL' : key));
        if (statusFilter !== 'ACTIVE') setStatusFilter('ACTIVE');
    };
    const toggleGroup = () => setGroupByWardOn(on => { saveGroupPref(!on); return !on; });

    const extraFilterCount = [wardFilter, doctorFilter, payerFilter].filter(v => v !== 'ALL').length;
    const anyFilter = extraFilterCount > 0 || quick !== 'ALL' || !!search.trim() || dateFilter !== 'ALL';
    const clearFilters = () => { setSearch(''); setQuick('ALL'); setWardFilter('ALL'); setDoctorFilter('ALL'); setPayerFilter('ALL'); setDateFilter('ALL'); };

    const admit = () => { if (isSubscriptionReadOnly) { blockAction('Admitting patients'); return; } onAdmit(); };

    const runRowAction = (a: ActiveAdmissionItem) => {
        const action = rowAction(a);
        if (action.kind === 'CONFIRM_ARRIVAL') openConfirmArrival(a);
        else if (action.kind === 'CONTINUE_DISCHARGE') onOpenWorkspace(a, 'discharge');
        else onOpenWorkspace(a);
    };

    const rowMenu = (a: ActiveAdmissionItem) => (
        <RowMenu
            admission={a}
            onOpen={() => onOpenWorkspace(a)}
            onEdit={a.statusCode === 'ADMITTED' ? () => setEditingAdmissionTarget(a) : undefined}
            onCancel={a.statusCode === 'ADMITTED' || a.statusCode === 'PRE_ADMIT' ? () => setCancelAdmissionTarget(a) : undefined}
        />
    );

    const actionButton = (a: ActiveAdmissionItem, wide = false) => {
        const action = rowAction(a);
        if (action.kind === 'PRINT_DISCHARGE') {
            return <span onClick={e => e.stopPropagation()}><PrintDischargeButton admission={a} /></span>;
        }
        const primary = action.kind === 'CONFIRM_ARRIVAL' || action.kind === 'CONTINUE_DISCHARGE' || action.kind === 'ASSIGN_BED';
        return (
            <Button size="sm" variant={primary ? 'default' : 'outline'}
                className={cn('h-8 rounded-full px-3.5 text-xs font-bold whitespace-nowrap', wide && 'h-10 flex-1',
                    primary ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border-slate-200 text-slate-700 dark:border-zinc-700 dark:text-zinc-200')}
                onClick={e => { e.stopPropagation(); runRowAction(a); }}>
                {action.kind === 'CONFIRM_ARRIVAL' && <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />}
                {action.kind === 'ASSIGN_BED' && <BedDouble className="h-3.5 w-3.5 mr-1.5" />}
                {action.label}
                {(action.kind === 'OPEN' || action.kind === 'VIEW') && <ArrowRight className="h-3.5 w-3.5 ml-1.5" />}
            </Button>
        );
    };

    const selectClass = 'h-10 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 shadow-sm w-full lg:w-[168px] [&>span]:truncate';
    const filterSelect = (label: string, value: string, onChange: (v: string) => void, items: { value: string; label: string }[]) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger aria-label={label} className={cn(selectClass, value !== 'ALL' && 'border-brand-300 text-brand-700 dark:text-brand-300')}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[300px]">
                <SelectItem value="ALL" className="text-xs font-semibold">{label}</SelectItem>
                {items.map(i => <SelectItem key={i.value} value={i.value} className="text-xs font-semibold">{i.label}</SelectItem>)}
            </SelectContent>
        </Select>
    );

    const inHospital = tiles[0]?.value ?? 0;

    return (
        <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 pt-2 pb-28 sm:pb-6 space-y-4 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
            <IpdSectionHeader
                active="roster"
                subtitle={`${formatIstDayLabel(new Date())} · ${inHospital} in hospital`}
                onNavigate={onNavigate}
                onAdmit={onAdmit}
                badges={{ referred: pendingReferrals }}
            />

            {/* Tiles — always the active census; tapping one filters the list below */}
            <div className="flex lg:grid lg:grid-cols-8 gap-2 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-0.5">
                {tiles.map(t => <RosterTileButton key={t.key} tile={t} selected={quick === t.key && (t.key !== 'ALL' || statusFilter === 'ACTIVE')} onClick={() => pickTile(t.key)} />)}
            </div>

            <section className="space-y-3">
                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:flex-wrap">
                    <div className="flex items-center gap-2 w-full lg:flex-1 lg:min-w-[240px]">
                        <div className="relative flex-1 min-w-0">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search admissions"
                                placeholder="Search name, UHID, admission no., bed, doctor…"
                                className="h-11 sm:h-10 rounded-xl text-sm pl-9 w-full bg-white dark:bg-zinc-900 shadow-sm border-slate-200/70 dark:border-zinc-800" />
                        </div>
                        <Button variant="outline" onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen}
                            className={cn('lg:hidden h-11 sm:h-10 rounded-xl px-3.5 text-xs font-bold shrink-0 border-slate-200/70', extraFilterCount > 0 && 'border-brand-300 text-brand-700')}>
                            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Filters{extraFilterCount > 0 ? ` · ${extraFilterCount}` : ''}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                        <Segmented<AdmissionStatusFilter> value={statusFilter} onChange={s => { setStatusFilter(s); if (s !== 'ACTIVE') setQuick('ALL'); }}
                            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'DISCHARGED', label: 'Discharged' }, { value: 'ALL', label: 'All' }]} label="Status" />
                        <Segmented<DateFilterMode> value={dateFilter} onChange={setDateFilter}
                            options={[{ value: 'TODAY', label: 'Today' }, { value: 'ALL', label: 'All dates' }, { value: 'RANGE', label: 'Range' }]} label="Admitted on" />
                        <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh"
                            className="h-10 rounded-full px-3.5 text-xs font-bold shrink-0 border-slate-200/70 text-slate-600 dark:text-zinc-300">
                            <RefreshCw className={cn('h-3.5 w-3.5 sm:mr-1.5', loading && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>

                    {dateFilter === 'RANGE' && (
                        <div className="flex items-center gap-1.5 lg:shrink-0">
                            <Input type="date" aria-label="From date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-10 rounded-xl text-xs flex-1 lg:flex-none lg:w-36 bg-white dark:bg-zinc-900 shadow-sm border-slate-200/70" />
                            <span className="text-slate-400 text-xs font-semibold shrink-0">to</span>
                            <Input type="date" aria-label="To date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-10 rounded-xl text-xs flex-1 lg:flex-none lg:w-36 bg-white dark:bg-zinc-900 shadow-sm border-slate-200/70" />
                        </div>
                    )}
                </div>

                <div className={cn('grid-cols-2 gap-2 lg:flex lg:items-center lg:flex-wrap', filtersOpen ? 'grid' : 'hidden lg:flex')}>
                    {filterSelect('All wards', wardFilter, setWardFilter, options.wards.map(w => ({ value: w, label: w })))}
                    {filterSelect('All consultants', doctorFilter, setDoctorFilter, options.doctors.map(d => ({ value: d, label: d })))}
                    {filterSelect('All payers', payerFilter, setPayerFilter, options.payers.map(p => ({ value: p, label: payerLabel(p) })))}
                    <button type="button" onClick={toggleGroup} aria-pressed={groupByWardOn}
                        className={cn('h-10 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors',
                            groupByWardOn ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300' : 'bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 text-slate-600 dark:text-zinc-300')}>
                        <Rows3 className="h-3.5 w-3.5" /> Group by ward
                    </button>
                    {anyFilter && (
                        <button type="button" onClick={clearFilters} className="h-10 px-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline col-span-2 lg:col-span-1 text-left">
                            Clear filters
                        </button>
                    )}
                    <span className="hidden lg:block ml-auto text-xs font-semibold text-slate-500">
                        {filteredAdmissions.length} {filteredAdmissions.length === 1 ? 'admission' : 'admissions'}
                    </span>
                </div>

                {/* Phone and small tablet: cards */}
                <div className="md:hidden space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admissions · {filteredAdmissions.length}</p>
                    {groups.map(g => (
                        <React.Fragment key={g.ward || 'all'}>
                            {g.ward && <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 pt-1">{g.ward} <span className="text-slate-400 font-semibold">· {g.rows.length}</span></p>}
                            {g.rows.map(a => {
                                const exp = expectedDischarge(a);
                                return (
                                    <div key={a.admissionId} role="button" tabIndex={0}
                                        onClick={() => onOpenWorkspace(a)}
                                        onKeyDown={e => { if (e.key === 'Enter') onOpenWorkspace(a); }}
                                        className="rounded-2xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-3.5 flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-transform">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-zinc-50 text-[15px] leading-tight truncate">{a.patientName || '—'}</p>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 truncate">
                                                    {a.patientId}{a.patientAge != null ? ` · ${a.patientAge}${a.patientSex ?? ''}` : ''}{a.primaryDoctorName ? ` · ${a.primaryDoctorName}` : ''}
                                                </p>
                                            </div>
                                            <BedChip admission={a} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <Fact label="Stay" value={a.statusCode === 'PRE_ADMIT' ? 'Not arrived' : `Day ${stayDay(a)}`} />
                                            <Fact label="Payer" value={payerLabel(a.payerType)} />
                                            <Fact label="Expected out" value={exp.dateKey ? shortDate(a.expectedDischargeAt) : 'Not set'} tone={exp.tone === 'overdue' ? 'rose' : exp.tone === 'today' ? 'brand' : undefined} />
                                        </div>
                                        <StageBar statusCode={a.statusCode} />
                                        <div className="flex items-center gap-2">
                                            {actionButton(a, true)}
                                            {rowMenu(a)}
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                    {!loading && filteredAdmissions.length === 0 && <EmptyState anyFilter={anyFilter} onClear={clearFilters} onAdmit={admit} />}
                    {loading && admissions.length === 0 && <p className="py-10 text-center text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</p>}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block rounded-2xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">Bed</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                    <th className="text-left px-3 py-2.5 font-bold hidden lg:table-cell">Consultant</th>
                                    <th className="text-left px-3 py-2.5 font-bold hidden xl:table-cell">Diagnosis</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Stay</th>
                                    <th className="text-left px-3 py-2.5 font-bold hidden lg:table-cell">Type / Payer</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Stage</th>
                                    <th className="text-left px-3 py-2.5 font-bold whitespace-nowrap">Expected out</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(g => (
                                    <React.Fragment key={g.ward || 'all'}>
                                        {g.ward && (
                                            <tr className="bg-slate-50/70 dark:bg-zinc-950/60 border-t border-slate-100 dark:border-zinc-800">
                                                <td colSpan={9} className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                                                    {g.ward} <span className="text-slate-400 font-semibold">· {g.rows.length} {g.rows.length === 1 ? 'patient' : 'patients'}</span>
                                                </td>
                                            </tr>
                                        )}
                                        {g.rows.map(a => {
                                            const exp = expectedDischarge(a);
                                            return (
                                                <tr key={a.admissionId} tabIndex={0}
                                                    className="border-t border-slate-100 dark:border-zinc-800 hover:bg-brand-50/40 dark:hover:bg-zinc-800/40 focus-visible:bg-brand-50/60 outline-none transition-colors cursor-pointer"
                                                    onClick={() => onOpenWorkspace(a)}
                                                    onKeyDown={e => { if (e.key === 'Enter') onOpenWorkspace(a); }}>
                                                    <td className="px-3 py-2.5 align-top"><BedChip admission={a} stacked={!groupByWardOn} /></td>
                                                    <td className="px-3 py-2.5 align-top max-w-[240px]">
                                                        <p className="font-semibold text-slate-900 dark:text-zinc-50 truncate">{a.patientName || '—'}</p>
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            {a.patientId}{a.patientAge != null ? ` · ${a.patientAge}${a.patientSex ?? ''}` : ''} · <span className="font-mono">{a.admissionNo}</span>
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2.5 align-top text-xs text-slate-700 dark:text-zinc-300 hidden lg:table-cell max-w-[160px] truncate">{a.primaryDoctorName || <span className="text-slate-400">Not set</span>}</td>
                                                    <td className="px-3 py-2.5 align-top text-xs text-slate-700 dark:text-zinc-300 hidden xl:table-cell max-w-[220px]">
                                                        <span className="line-clamp-2" title={a.diagnosis || a.admissionReason || undefined}>{a.diagnosis || a.admissionReason || <span className="text-slate-400">Not recorded</span>}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">{a.statusCode === 'PRE_ADMIT' ? 'Not arrived' : a.statusCode === 'DISCHARGED' ? shortDate(a.admittedAt) : `Day ${stayDay(a)}`}</p>
                                                        <p className="text-[11px] text-slate-500">{a.statusCode === 'DISCHARGED' ? 'admitted' : `${shortDate(a.admittedAt)}, ${formatIstTime(a.admittedAt)}`}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5 align-top hidden lg:table-cell">
                                                        <p className="text-xs text-slate-700 dark:text-zinc-300">{a.admissionType ? titleCase(a.admissionType) : '—'}</p>
                                                        <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{payerLabel(a.payerType)}{a.payerName ? ` · ${a.payerName}` : ''}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5 align-top w-[150px]"><StageBar statusCode={a.statusCode} /></td>
                                                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                                        {exp.dateKey ? (
                                                            <>
                                                                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{shortDate(a.expectedDischargeAt)}</p>
                                                                {exp.note && <p className={cn('text-[11px] font-semibold', exp.tone === 'overdue' ? 'text-rose-600' : exp.tone === 'today' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500')}>{exp.note}</p>}
                                                            </>
                                                        ) : <span className="text-xs text-slate-400">Not set</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 align-top">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {actionButton(a)}
                                                            {rowMenu(a)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                                {!loading && filteredAdmissions.length === 0 && (
                                    <tr><td colSpan={9}><EmptyState anyFilter={anyFilter} onClear={clearFilters} onAdmit={admit} /></td></tr>
                                )}
                                {loading && admissions.length === 0 && (
                                    <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {filteredAdmissions.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAdmissions.length)} of {filteredAdmissions.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-xs font-semibold text-slate-500">Rows per page</span>
                            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                                <SelectTrigger aria-label="Rows per page" className="h-8 w-[70px] rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)} className="text-xs font-semibold">{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" aria-label="Previous page" className="h-8 w-8 p-0 rounded-lg text-slate-600"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 px-2 bg-white dark:bg-zinc-900 h-8 flex items-center rounded-lg border border-slate-200 dark:border-zinc-800">
                                {currentPage} / {totalPages}
                            </span>
                            <Button variant="outline" size="sm" aria-label="Next page" className="h-8 w-8 p-0 rounded-lg text-slate-600"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <Dialog open={!!confirmArrivalTarget} onOpenChange={o => { if (!o) setConfirmArrivalTarget(null); }}>
                <DialogContent className="max-w-sm rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl w-[calc(100%-2rem)] sm:w-full">
                    {confirmArrivalTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">Confirm arrival — {confirmArrivalTarget.patientName || confirmArrivalTarget.patientId}?</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">Moves this pre-registration to a completed admission. Optionally assign a bed now.</DialogDescription>
                            </DialogHeader>
                            <div className="mt-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Bed (optional)</Label>
                                <Select value={arrivalBedId} onValueChange={setArrivalBedId}>
                                    <SelectTrigger className="h-10 mt-1 w-full rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-left">
                                        <SelectValue placeholder="— Assign later —" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px] overflow-y-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
                                        <SelectItem value="assign-later" className="rounded-lg focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">— Assign later —</SelectItem>
                                        {arrivalBeds.map(b => (
                                            <SelectItem key={b.bedId} value={b.bedId} className="rounded-lg focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">
                                                {b.wardName ? `${b.wardName} · ` : ''}{b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                                <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setConfirmArrivalTarget(null)}>Cancel</Button>
                                <Button disabled={confirmingArrival} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white" onClick={submitConfirmArrival}>
                                    {confirmingArrival ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm arrival
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!cancelAdmissionTarget} onOpenChange={o => { if (!o) setCancelAdmissionTarget(null); }}>
                <DialogContent className="max-w-sm rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl w-[calc(100%-2rem)] sm:w-full">
                    {cancelAdmissionTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-550">Cancel Admission?</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                                    Are you sure you want to cancel the admission for <strong className="text-slate-800">{cancelAdmissionTarget.patientName || cancelAdmissionTarget.patientId}</strong>?
                                    This will release any assigned bed and mark the admission as cancelled. This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                                <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setCancelAdmissionTarget(null)}>No, keep it</Button>
                                <Button disabled={cancellingAdmission} className="h-11 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white" onClick={submitCancelAdmission}>
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

            {/* Phone: Admit Patient stays within thumb reach */}
            <div className="sm:hidden fixed bottom-20 right-4 z-40">
                <button type="button" onClick={admit} className="h-14 px-5 flex items-center justify-center rounded-full text-sm font-black bg-brand-600 text-white shadow-xl shadow-brand-600/40 active:scale-95 transition-all gap-1.5 border border-brand-500/20">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                    <span>Admit Patient</span>
                </button>
            </div>
        </div>
    );
};

const TILE_TONE: Record<RosterTile['tone'], string> = {
    brand: 'text-brand-700 dark:text-brand-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    sky: 'text-sky-700 dark:text-sky-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
    slate: 'text-slate-700 dark:text-zinc-200',
};

const RosterTileButton: React.FC<{ tile: RosterTile; selected: boolean; onClick: () => void }> = ({ tile, selected, onClick }) => (
    <button type="button" onClick={onClick} aria-pressed={selected}
        className={cn('min-w-[112px] lg:min-w-0 shrink-0 lg:shrink rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]',
            selected
                ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
                : 'bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 hover:border-slate-300 shadow-sm')}>
        <p className={cn('text-2xl font-black leading-none tabular-nums', tile.value === 0 ? 'text-slate-300 dark:text-zinc-600' : TILE_TONE[tile.tone])}>{tile.value}</p>
        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mt-1.5 leading-tight">{tile.label}</p>
    </button>
);

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
    return (
        <div role="group" aria-label={label} className="flex items-center gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-zinc-900/80 shrink-0 border border-slate-200/40 dark:border-zinc-800">
            {options.map(o => (
                <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
                    className={cn('h-8 px-3.5 rounded-full text-xs font-bold transition-colors shrink-0',
                        value === o.value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50')}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

const BedChip: React.FC<{ admission: ActiveAdmissionItem; stacked?: boolean }> = ({ admission: a, stacked }) => {
    if (!a.bedCode) {
        return <span className="inline-flex shrink-0 items-center h-6 px-2 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 whitespace-nowrap">No bed</span>;
    }
    return (
        <div className="shrink-0">
            <span className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-bold font-mono bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100 whitespace-nowrap">{a.bedCode}</span>
            {stacked && a.wardName && <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">{a.wardName}</p>}
        </div>
    );
};

const Fact: React.FC<{ label: string; value: string; tone?: 'rose' | 'brand' }> = ({ label, value, tone }) => (
    <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className={cn('font-semibold truncate mt-0.5', tone === 'rose' ? 'text-rose-600' : tone === 'brand' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-zinc-200')}>{value}</p>
    </div>
);

/** Four steps from admitted to discharged; anything outside that path (pre-admit, cancelled) is a plain label. */
const StageBar: React.FC<{ statusCode: string }> = ({ statusCode }) => {
    const onPath = ['ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED', 'DISCHARGED', 'LAMA'].includes(statusCode);
    if (!onPath) {
        return (
            <span className={cn('inline-flex items-center h-6 px-2 rounded-full text-[11px] font-bold border whitespace-nowrap',
                statusCode === 'PRE_ADMIT' ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900')}>
                {statusLabel(statusCode)}
            </span>
        );
    }
    const stage = dischargeStage(statusCode);
    const done = stage === 3;
    return (
        <div>
            <div className="flex gap-1" aria-hidden="true">
                {DISCHARGE_STAGE_LABELS.map((l, i) => (
                    <span key={l} className={cn('h-1.5 flex-1 rounded-full', i <= stage ? (done ? 'bg-slate-400' : stage === 0 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-200 dark:bg-zinc-700')} />
                ))}
            </div>
            <p className={cn('text-[11px] font-semibold mt-1 whitespace-nowrap', done ? 'text-slate-500' : stage === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {statusCode === 'LAMA' ? statusLabel(statusCode) : DISCHARGE_STAGE_LABELS[stage]}
            </p>
        </div>
    );
};

const EmptyState: React.FC<{ anyFilter: boolean; onClear: () => void; onAdmit: () => void }> = ({ anyFilter, onClear, onAdmit }) => (
    <div className="px-4 py-12 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">{anyFilter ? 'No admissions match these filters.' : 'No admissions yet.'}</p>
        {anyFilter
            ? <button type="button" onClick={onClear} className="mt-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline">Clear filters</button>
            : <button type="button" onClick={onAdmit} className="mt-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline">Admit a patient</button>}
    </div>
);

/** Everything a row can do besides its one main action. Closes itself after any choice. */
const RowMenu: React.FC<{ admission: ActiveAdmissionItem; onOpen: () => void; onEdit?: () => void; onCancel?: () => void }> = ({ admission, onOpen, onEdit, onCancel }) => {
    const [open, setOpen] = useState(false);
    const item = 'w-full h-9 px-2.5 rounded-lg flex items-center justify-start gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 border-0 shadow-none bg-transparent';
    const run = (fn: () => void) => () => { setOpen(false); fn(); };
    const canPrint = admission.statusCode === 'ADMITTED' || admission.statusCode === 'PRE_ADMIT';
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`More actions for ${admission.patientName || admission.admissionNo}`}
                    className="h-8 w-8 p-0 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5 rounded-xl" onClick={e => e.stopPropagation()}>
                <button type="button" className={item} onClick={run(onOpen)}><ArrowRight className="h-3.5 w-3.5" /> Open workspace</button>
                {canPrint && (
                    <div onClickCapture={() => setOpen(false)}>
                        <PrintTokenButton admission={admission} variant="ghost" className={item} />
                        <PrintAdmissionButton admission={admission} variant="ghost" className={item} />
                    </div>
                )}
                {onEdit && <button type="button" className={item} onClick={run(onEdit)}><Pencil className="h-3.5 w-3.5" /> Edit details</button>}
                {onCancel && (
                    <button type="button" className={cn(item, 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30')} onClick={run(onCancel)}>
                        <X className="h-3.5 w-3.5" /> Cancel admission
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
};
