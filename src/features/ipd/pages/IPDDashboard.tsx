import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus, Search, BedDouble, Activity, Users,
    AlertTriangle, LogOut, Filter,
    ChevronLeft, ChevronRight, RefreshCw,
    LayoutGrid, CheckCircle2, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

import { Admission, Ward, IPDSummaries, AdmissionStatus, AdmissionPriority } from '../types';
import { ipdService } from '../services/ipdService';
import { BedMapView } from '../components/BedMapView';
import { NewAdmissionSheet } from '../components/NewAdmissionSheet';

// ─── Status / Priority Configs ────────────────────────────────────────────────

const STATUS_BADGE: Record<AdmissionStatus, string> = {
    ADMITTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING_ADMISSION: 'bg-amber-100 text-amber-700 border-amber-200',
    DISCHARGED: 'bg-slate-100 text-slate-600 border-slate-200',
    TRANSFERRED: 'bg-blue-100 text-blue-700 border-blue-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_LABEL: Record<AdmissionStatus, string> = {
    ADMITTED: 'Admitted',
    PENDING_ADMISSION: 'Pending',
    DISCHARGED: 'Discharged',
    TRANSFERRED: 'Transferred',
    CANCELLED: 'Cancelled',
};

const PRIORITY_BADGE: Record<AdmissionPriority, string> = {
    ROUTINE: 'bg-slate-100 text-slate-600',
    URGENT: 'bg-amber-100 text-amber-700',
    EMERGENCY: 'bg-rose-100 text-rose-700',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    variant: 'gradient' | 'light-indigo' | 'light-emerald' | 'light-rose';
    loading?: boolean;
}

const KPI_VARIANTS = {
    gradient: {
        card: 'bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg',
        label: 'text-indigo-100 text-sm font-medium',
        value: 'text-3xl sm:text-4xl font-bold text-white',
        sub: 'text-indigo-200 text-xs',
        icon: 'bg-white/20 backdrop-blur-sm',
        iconColor: 'text-white',
    },
    'light-indigo': {
        card: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden',
        label: 'text-indigo-900/70 dark:text-indigo-200/70 text-sm font-medium',
        value: 'text-3xl sm:text-4xl font-bold text-indigo-900 dark:text-indigo-50',
        sub: 'text-indigo-500 dark:text-indigo-300 text-xs',
        icon: 'bg-white dark:bg-indigo-800/50 border border-indigo-100 dark:border-indigo-700/50 shadow-sm',
        iconColor: 'text-indigo-600 dark:text-indigo-300',
    },
    'light-emerald': {
        card: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm relative overflow-hidden',
        label: 'text-emerald-900/70 dark:text-emerald-200/70 text-sm font-medium',
        value: 'text-3xl sm:text-4xl font-bold text-emerald-900 dark:text-emerald-50',
        sub: 'text-emerald-500 dark:text-emerald-300 text-xs',
        icon: 'bg-white dark:bg-emerald-800/50 border border-emerald-100 dark:border-emerald-700/50 shadow-sm',
        iconColor: 'text-emerald-600 dark:text-emerald-300',
    },
    'light-rose': {
        card: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-rose-100 dark:border-rose-900/50 shadow-sm relative overflow-hidden',
        label: 'text-rose-900/70 dark:text-rose-200/70 text-sm font-medium',
        value: 'text-3xl sm:text-4xl font-bold text-rose-900 dark:text-rose-50',
        sub: 'text-rose-400 dark:text-rose-300 text-xs',
        icon: 'bg-white dark:bg-rose-800/50 border border-rose-100 dark:border-rose-700/50 shadow-sm',
        iconColor: 'text-rose-600 dark:text-rose-300',
    },
};

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, variant, loading }) => {
    const v = KPI_VARIANTS[variant];
    return (
        <Card className={cn('border', v.card)}>
            {variant !== 'gradient' && (
                <div className="absolute top-0 right-0 w-28 h-28 bg-current opacity-5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            )}
            <CardContent className="p-4 sm:p-5 relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <p className={v.label}>{title}</p>
                    <div className={cn('p-2.5 rounded-xl', v.icon)}>
                        <span className={v.iconColor}>{icon}</span>
                    </div>
                </div>
                {loading ? (
                    <Skeleton className="h-10 w-20 mt-1" />
                ) : (
                    <h3 className={v.value}>{value}</h3>
                )}
                {subtitle && <p className={cn(v.sub, 'mt-1')}>{subtitle}</p>}
            </CardContent>
        </Card>
    );
};

// ─── Admissions Table ─────────────────────────────────────────────────────────

interface AdmissionsTableProps {
    admissions: Admission[];
    wards: Ward[];
    onRowClick: (a: Admission) => void;
    showDischargeDate?: boolean;
}

const ITEMS_PER_PAGE = 8;

const AdmissionsTable: React.FC<AdmissionsTableProps> = ({ admissions, wards, onRowClick, showDischargeDate }) => {
    const [search, setSearch] = useState('');
    const [wardFilter, setWardFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return admissions.filter(a => {
            const matchSearch = !q ||
                a.patientName.toLowerCase().includes(q) ||
                (a.patientId?.toLowerCase() ?? '').includes(q) ||
                (a.patientMobile ?? '').includes(q) ||
                (a.attendingDoctor.toLowerCase()).includes(q);
            const matchWard = wardFilter === 'ALL' || a.wardId === wardFilter;
            return matchSearch && matchWard;
        });
    }, [admissions, search, wardFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [search, wardFilter]);

    return (
        <div className="space-y-4">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, ID, mobile, doctor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 text-sm border-gray-200 dark:border-slate-700"
                    />
                </div>
                <Select value={wardFilter} onValueChange={setWardFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-52 text-sm border-gray-200 dark:border-slate-700">
                        <Filter className="h-3.5 w-3.5 mr-2 text-gray-400" />
                        <SelectValue placeholder="All Wards" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Wards</SelectItem>
                        {wards.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3">Patient</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3 hidden sm:table-cell">Ward / Bed</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3 hidden md:table-cell">Doctor</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3 hidden lg:table-cell">Diagnosis</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3">
                                {showDischargeDate ? 'Discharged' : 'Admitted'}
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 dark:text-gray-400 py-3">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                                    No admissions found
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map(a => {
                                const dateToShow = showDischargeDate && a.dischargeDate ? new Date(a.dischargeDate) : new Date(a.admissionDate);
                                const los = showDischargeDate && a.dischargeDate
                                    ? differenceInDays(new Date(a.dischargeDate), new Date(a.admissionDate))
                                    : differenceInDays(new Date(), new Date(a.admissionDate));

                                return (
                                    <TableRow
                                        key={a.id}
                                        className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                                        onClick={() => onRowClick(a)}
                                    >
                                        <TableCell className="py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.patientName}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                    {a.age}y / {a.sex} {a.patientId && `• ${a.patientId}`}
                                                </p>
                                                {a.priority === 'EMERGENCY' && (
                                                    <Badge variant="outline" className="mt-1 text-[10px] px-1.5 bg-rose-50 text-rose-600 border-rose-200">
                                                        Emergency
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 hidden sm:table-cell">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{a.wardName}</p>
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">Bed {a.bedNumber}</p>
                                        </TableCell>
                                        <TableCell className="py-3 hidden md:table-cell">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[140px]">{a.attendingDoctor}</p>
                                        </TableCell>
                                        <TableCell className="py-3 hidden lg:table-cell">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{a.diagnosis ?? '—'}</p>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{format(dateToShow, 'dd MMM yy')}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{los}d LOS</p>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn('text-[11px] px-2 py-0.5 font-semibold', STATUS_BADGE[a.status])}
                                            >
                                                {STATUS_LABEL[a.status]}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {filtered.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7 border-gray-200 dark:border-slate-700" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="px-2 font-semibold text-gray-700 dark:text-gray-300">Page {page} / {totalPages}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 border-gray-200 dark:border-slate-700" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type DashboardView = 'admissions' | 'bedmap' | 'discharged';

const IPD_TABS: { id: DashboardView; label: string; description: string; icon: typeof Users }[] = [
    { id: 'admissions', label: 'Active', description: 'Current in-patients', icon: Users },
    { id: 'bedmap', label: 'Bed Map', description: 'Ward & bed occupancy', icon: LayoutGrid },
    { id: 'discharged', label: 'Discharged', description: 'Discharge history', icon: LogOut },
];

const IPDDashboard: React.FC = () => {
    const [summaries, setSummaries] = useState<IPDSummaries | null>(null);
    const [activeAdmissions, setActiveAdmissions] = useState<Admission[]>([]);
    const [dischargedAdmissions, setDischargedAdmissions] = useState<Admission[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState<DashboardView>('admissions');
    const [newAdmissionOpen, setNewAdmissionOpen] = useState(false);
    const navigate = useNavigate();

    const loadData = async () => {
        setLoading(true);
        try {
            const [sums, active, discharged, wardList] = await Promise.all([
                ipdService.getSummaries(),
                ipdService.getActiveAdmissions(),
                ipdService.getDischargedAdmissions(),
                ipdService.getWards(),
            ]);
            setSummaries(sums);
            setActiveAdmissions(active);
            setDischargedAdmissions(discharged);
            setWards(wardList);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleRowClick = (a: Admission) => {
        navigate(`/ipd/patient/${a.id}`);
    };

    const tabCount = (id: DashboardView) => {
        if (loading) return null;
        if (id === 'admissions') return activeAdmissions.length;
        if (id === 'discharged') return dischargedAdmissions.length;
        return null;
    };

    const occupancyColor =
        summaries && summaries.occupancyRate >= 90 ? 'light-rose' :
        summaries && summaries.occupancyRate >= 70 ? 'light-indigo' : 'light-emerald';

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 px-2 sm:px-4 lg:px-6 pb-4 sm:pb-6 pt-1 space-y-4 sm:space-y-6">

            {/* ── Header Nav Bar ─────────────────────────────────────────────── */}
            <section>
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200/70 dark:border-slate-800 rounded-2xl shadow-lg shadow-blue-100/10 dark:shadow-black/20 px-3 py-3 sm:px-6 sm:py-4 ring-1 ring-black/5 dark:ring-white/5">

                    {/* Left: Title + meta */}
                    <div className="flex flex-col gap-1 min-w-0 shrink-0 w-full xl:w-auto">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                IPD Center
                            </h1>
                            {!loading && summaries && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold shadow-sm px-2 py-0.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    {summaries.totalAdmissions} Active
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 pl-1">
                            In-Patient Department Management
                        </p>
                    </div>

                    {/* Right: nav tabs + action buttons */}
                    <div className="flex items-center gap-3 w-full xl:w-auto xl:flex-1 xl:ml-4 min-w-0">
                        {/* Nav tabs */}
                        <nav className="flex-1 flex flex-nowrap overflow-x-auto gap-2 bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-1 shadow-inner shadow-white/60 dark:shadow-black/40 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {IPD_TABS.map(tab => {
                                const isActive = currentView === tab.id;
                                const count = tabCount(tab.id);
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setCurrentView(tab.id)}
                                        aria-pressed={isActive}
                                        className={cn(
                                            'group flex-1 flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 min-w-[80px] sm:min-w-[110px]',
                                            isActive
                                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-xl shadow-blue-500/30'
                                                : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-gray-200 hover:-translate-y-0.5'
                                        )}
                                    >
                                        <div className="flex items-center justify-center sm:justify-start gap-1.5 font-semibold w-full">
                                            <span className={cn('p-1 rounded-lg', isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-800')}>
                                                <tab.icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400')} />
                                            </span>
                                            <span className="hidden sm:inline text-[12px] line-clamp-1">{tab.label}</span>
                                            {count !== null && (
                                                <span className={cn(
                                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto hidden sm:inline-block',
                                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                                                )}>{count}</span>
                                            )}
                                        </div>
                                        <span className="sm:hidden text-[10px] font-medium w-full text-center line-clamp-1 leading-tight">{tab.label}</span>
                                        <p className={cn(
                                            'hidden sm:block text-[10px] leading-snug w-full line-clamp-2 opacity-90 mt-0.5',
                                            isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'
                                        )}>
                                            {tab.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs gap-1.5 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                onClick={loadData}
                                disabled={loading}
                            >
                                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button
                                size="sm"
                                className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-md shadow-blue-500/20"
                                onClick={() => setNewAdmissionOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">New Admission</span>
                                <span className="sm:hidden">Admit</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── KPI Cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Active Admissions"
                    value={summaries?.totalAdmissions ?? 0}
                    subtitle={`${summaries?.todayAdmissions ?? 0} admitted today`}
                    icon={<Users className="h-6 w-6" />}
                    variant="gradient"
                    loading={loading}
                />
                <KPICard
                    title="Bed Occupancy"
                    value={summaries ? `${summaries.occupancyRate}%` : '—'}
                    subtitle="across all wards"
                    icon={<BedDouble className="h-6 w-6" />}
                    variant={occupancyColor as KPICardProps['variant']}
                    loading={loading}
                />
                <KPICard
                    title="Available Beds"
                    value={summaries?.availableBeds ?? 0}
                    subtitle="ready for admission"
                    icon={<Activity className="h-6 w-6" />}
                    variant="light-emerald"
                    loading={loading}
                />
                <KPICard
                    title="Emergency Cases"
                    value={summaries?.emergencyAdmissions ?? 0}
                    subtitle={`${summaries?.pendingDischarges ?? 0} pending discharge`}
                    icon={<AlertTriangle className="h-6 w-6" />}
                    variant="light-rose"
                    loading={loading}
                />
            </div>

            {/* ── Content ────────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {currentView === 'admissions' && (
                        <Card className="border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="pb-4 pt-5 px-5 border-b border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Active Admissions</CardTitle>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {loading ? '—' : `${activeAdmissions.length} patient${activeAdmissions.length !== 1 ? 's' : ''} currently admitted`}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(4)].map((_, i) => (
                                            <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <AdmissionsTable admissions={activeAdmissions} wards={wards} onRowClick={handleRowClick} />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {currentView === 'bedmap' && (
                        <div>
                            <div className="mb-4">
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Ward & Bed Occupancy</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time bed availability across all wards</p>
                            </div>
                            {loading ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {[...Array(4)].map((_, i) => (
                                        <Skeleton key={i} className="h-60 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <BedMapView wards={wards} />
                            )}
                        </div>
                    )}

                    {currentView === 'discharged' && (
                        <Card className="border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="pb-4 pt-5 px-5 border-b border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Discharge History</CardTitle>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {loading ? '—' : `${dischargedAdmissions.length} record${dischargedAdmissions.length !== 1 ? 's' : ''} found`}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <AdmissionsTable admissions={dischargedAdmissions} wards={wards} onRowClick={handleRowClick} showDischargeDate />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ── Sheets ── */}
            <NewAdmissionSheet
                open={newAdmissionOpen}
                onOpenChange={setNewAdmissionOpen}
                wards={wards}
                onAdmissionCreated={loadData}
            />
        </div>
    );
};

export default IPDDashboard;
