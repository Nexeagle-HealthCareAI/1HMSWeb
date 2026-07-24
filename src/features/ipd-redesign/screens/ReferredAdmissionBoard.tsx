import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, UserPlus, Loader2, RefreshCw, BedDouble, XCircle, CalendarClock, Search,
    MessageSquare, Send, ChevronLeft, ChevronRight, Hotel, LayoutGrid, Stethoscope, Plus,
} from 'lucide-react';
import { admissionReferralApi, AdmissionReferralItem, AdmissionReferralCommentItem, CaseType, ReferralStatus } from '../services/admissionReferralApi';
import { useAppStore } from '@/store/appStore';
import { STATUS_TONE, STATUS_LABEL, ALL_STATUSES, CASE_TONE, CASE_LABEL, ALL_CASE_TYPES } from '../utils/referralStatus';
import { formatIstDateTime } from '../utils/istDate';
import { cn } from '@/lib/utils';

interface Props {
    onBack: () => void;
    onAdmitReferral: (referral: AdmissionReferralItem) => void;
    onOpenDashboard?: () => void;
    onOpenBedBoard?: () => void;
    onOpenConsultantLedger?: () => void;
}

const PAGE_SIZE = 5;

const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Referred Admissions — every doctor-advised admission (from the prescription board), tracked
 * through PENDING → CONVERTED / NOT_ADMITTED / FOLLOW_UP. Admitting a patient here hands off to
 * the normal Admit Patient wizard (pre-filled); conversion itself is stamped atomically inside
 * AdmitPatientHandler once the admission is actually created, not from this screen directly.
 *
 * Status + case-type filters are both server-side (required for pagination correctness — a
 * client-side filter over one 5-item page can't reflect the true filtered set). Search stays
 * client-side over the current page only, since the backend has no text-search param.
 */
export const ReferredAdmissionBoard: React.FC<Props> = ({ onBack, onAdmitReferral, onOpenDashboard, onOpenBedBoard, onOpenConsultantLedger }) => {
    const { toast } = useToast();
    const { isLowBandwidthMode } = useAppStore();
    const [referrals, setReferrals] = useState<AdmissionReferralItem[]>([]);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'ALL'>('ALL');
    const [caseTypeFilter, setCaseTypeFilter] = useState<CaseType | 'ALL'>('ALL');

    const [notAdmittedTarget, setNotAdmittedTarget] = useState<AdmissionReferralItem | null>(null);
    const [notAdmittedReason, setNotAdmittedReason] = useState('');
    const [followUpTarget, setFollowUpTarget] = useState<AdmissionReferralItem | null>(null);
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [busy, setBusy] = useState(false);

    // ── Comments (lazy-loaded per card, same pattern as the Overview tab's Doctor History) ──
    const [openComments, setOpenComments] = useState<Set<string>>(new Set());
    const [commentsByReferral, setCommentsByReferral] = useState<Record<string, AdmissionReferralCommentItem[]>>({});
    const [commentsLoading, setCommentsLoading] = useState<Set<string>>(new Set());
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [addingComment, setAddingComment] = useState<Set<string>>(new Set());

    const load = async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const res = await admissionReferralApi.list({
                statusCode: statusFilter === 'ALL' ? undefined : statusFilter,
                caseType: caseTypeFilter === 'ALL' ? undefined : caseTypeFilter,
                page,
                pageSize: PAGE_SIZE,
            });
            setReferrals(res?.referrals ?? []);
            setTotalCount(res?.totalCount ?? 0);
            const counts: Record<string, number> = {};
            (res?.statusCounts ?? []).forEach(c => { counts[c.statusCode] = c.count; });
            setStatusCounts(counts);
        } catch (e: any) {
            toast({ title: 'Could not load referred admissions', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [statusFilter, caseTypeFilter, page]);

    const changeStatusFilter = (s: ReferralStatus | 'ALL') => { setStatusFilter(s); setPage(1); };
    const changeCaseTypeFilter = (c: CaseType | 'ALL') => { setCaseTypeFilter(c); setPage(1); };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return referrals;
        return referrals.filter(r =>
            (r.patientName ?? '').toLowerCase().includes(q) ||
            (r.patientId ?? '').toLowerCase().includes(q) ||
            (r.procedureName ?? '').toLowerCase().includes(q) ||
            (r.referringDoctorName ?? '').toLowerCase().includes(q));
    }, [referrals, search]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const totalReferrals = ALL_STATUSES.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);

    const handleMarkNotAdmitted = async () => {
        if (!notAdmittedTarget || !notAdmittedReason.trim()) return;
        setBusy(true);
        try {
            const res = await admissionReferralApi.updateStatus({
                referralId: notAdmittedTarget.referralId, statusCode: 'NOT_ADMITTED', notAdmittedReason: notAdmittedReason.trim(),
            });
            if (!res?.success) throw new Error(res?.message || 'Could not update status.');
            toast({ title: 'Marked as not admitted' });
            setNotAdmittedTarget(null); setNotAdmittedReason('');
            await load(true);
        } catch (e: any) {
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const handleScheduleFollowUp = async () => {
        if (!followUpTarget || !followUpDate) return;
        setBusy(true);
        try {
            const res = await admissionReferralApi.updateStatus({
                referralId: followUpTarget.referralId, statusCode: 'FOLLOW_UP', followUpDate, followUpNotes: followUpNotes.trim() || undefined,
            });
            if (!res?.success) throw new Error(res?.message || 'Could not schedule follow-up.');
            toast({ title: 'Follow-up scheduled' });
            setFollowUpTarget(null); setFollowUpDate(''); setFollowUpNotes('');
            await load(true);
        } catch (e: any) {
            toast({ title: 'Could not schedule follow-up', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const loadComments = async (referralId: string) => {
        setCommentsLoading(prev => new Set(prev).add(referralId));
        try {
            const res = await admissionReferralApi.getComments(referralId);
            setCommentsByReferral(prev => ({ ...prev, [referralId]: res?.comments ?? [] }));
        } catch {
            setCommentsByReferral(prev => ({ ...prev, [referralId]: [] }));
        } finally {
            setCommentsLoading(prev => { const next = new Set(prev); next.delete(referralId); return next; });
        }
    };

    const toggleComments = (referralId: string) => {
        setOpenComments(prev => {
            const next = new Set(prev);
            if (next.has(referralId)) {
                next.delete(referralId);
            } else {
                next.add(referralId);
                loadComments(referralId);
            }
            return next;
        });
    };

    const submitComment = async (referralId: string) => {
        const text = (commentDrafts[referralId] ?? '').trim();
        if (!text) return;
        setAddingComment(prev => new Set(prev).add(referralId));
        try {
            const res = await admissionReferralApi.addComment({ referralId, commentText: text });
            if (!res?.success) throw new Error(res?.message || 'Could not add comment.');
            setCommentDrafts(prev => ({ ...prev, [referralId]: '' }));
            await loadComments(referralId);
            setReferrals(prev => prev.map(r => r.referralId === referralId ? { ...r, commentCount: (r.commentCount ?? 0) + 1 } : r));
        } catch (e: any) {
            toast({ title: 'Could not add comment', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setAddingComment(prev => { const next = new Set(prev); next.delete(referralId); return next; });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
            {/* Header Card (Unified Theme & Layout matching Appointment Dashboard) */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                {/* Decorative flare */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                                <UserPlus className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Referred Admissions</h1>
                                <p className="text-[11px] text-brand-100 mt-0.5">Manage doctor-advised incoming patient referrals</p>
                            </div>
                        </div>
                        {/* Refresh & Back buttons on the right */}
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl hover:bg-white/10 text-white active:scale-[0.98] transition-all shrink-0"
                                onClick={() => load(true)}
                                disabled={refreshing || loading}
                            >
                                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                            </Button>
                            <button 
                                onClick={onBack}
                                className="hidden sm:flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] transition-all shadow-sm shrink-0"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tab Capsule */}
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm">
                        {/* Tab 1: Live Roster */}
                        <button 
                            onClick={onOpenDashboard || onBack}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <Hotel className="h-5 w-5 mb-1 opacity-80" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Live<br/>Roster</span>
                        </button>

                        {/* Tab 2: Bed Board */}
                        <button 
                            onClick={onOpenBedBoard || onBack}
                            className="text-brand-50 hover:bg-white/10 py-2 flex flex-col items-center justify-center text-center rounded-xl transition-all active:scale-[0.97]"
                        >
                            <LayoutGrid className="h-5 w-5 mb-1 opacity-80" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Bed<br/>Board</span>
                        </button>

                        {/* Tab 3: Referrals (Selected) */}
                        <div className="bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm rounded-xl py-2 flex flex-col items-center justify-center text-center cursor-default">
                            <UserPlus className="h-5 w-5 mb-1" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">Referred<br/>Admissions</span>
                        </div>

                        {/* Tab 4: Ledger */}
                        <button 
                            onClick={onOpenConsultantLedger || onBack}
                            className="text-brand-100 dark:text-zinc-300 hover:text-white py-2 flex flex-col items-center justify-center text-center transition-all active:scale-[0.97]"
                        >
                            <Stethoscope className="h-5 w-5 mb-1" />
                            <span className="text-[9px] font-medium tracking-wide leading-tight">Consultant<br/>Ledger</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI tiles — informational, read-only summary of every status (including zero counts) */}
            {/* KPI tiles — horizontal scroll on mobile */}
            <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
                <div className={cn('rounded-[1.5rem] border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 sm:p-4.5 min-w-[120px] sm:min-w-0 snap-start shrink-0 flex flex-col justify-between min-h-[92px]',
                    !isLowBandwidthMode ? 'bg-white/95 dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow' : 'bg-white')}>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-50 leading-none">{totalReferrals}</p>
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-zinc-400 mt-2 leading-tight">All Referred</p>
                </div>
                {ALL_STATUSES.map(s => (
                    <div key={s} className={cn('rounded-[1.5rem] border p-3.5 sm:p-4.5 min-w-[120px] sm:min-w-0 snap-start shrink-0 flex flex-col justify-between min-h-[92px]', STATUS_TONE[s],
                        !isLowBandwidthMode ? 'bg-opacity-80 backdrop-blur-xl shadow-sm' : '')}>
                        <p className="text-2xl sm:text-3xl font-black leading-none">{statusCounts[s] ?? 0}</p>
                        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-70 mt-2 leading-tight">{STATUS_LABEL[s]}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search current page…" className="pl-9 h-11 sm:h-9 bg-white/80 backdrop-blur-sm rounded-xl border-slate-200/60" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 w-full shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-zinc-500 bg-white dark:bg-zinc-950 px-2.5 py-2 rounded-xl border border-slate-200/50 dark:border-zinc-850/50 shadow-sm shrink-0 min-w-[62px] text-center">
                        Status
                    </span>
                    <div className="bg-slate-100/70 dark:bg-zinc-900/60 p-1 rounded-2xl flex items-center gap-1.5 flex-1 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-zinc-800/40">
                        <button
                            type="button"
                            onClick={() => changeStatusFilter('ALL')}
                            className={cn(
                                'h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.96] shrink-0 border border-transparent',
                                statusFilter === 'ALL'
                                    ? 'bg-brand-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.2)]'
                                    : 'bg-transparent text-slate-650 dark:text-zinc-450 hover:bg-white/60 dark:hover:bg-zinc-850/50 hover:text-slate-800 dark:hover:text-zinc-200'
                            )}
                        >
                            All
                        </button>
                        {ALL_STATUSES.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => changeStatusFilter(s)}
                                className={cn(
                                    'h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.96] shrink-0 border',
                                    statusFilter === s
                                        ? s === 'PENDING' ? 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900 shadow-sm' :
                                          s === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 shadow-sm' :
                                          s === 'FOLLOW_UP' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 shadow-sm' :
                                          'bg-slate-200 text-slate-700 border-slate-350 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm'
                                        : 'bg-transparent text-slate-500 dark:text-zinc-400 border-transparent hover:bg-white/60 dark:hover:bg-zinc-850/50 hover:text-slate-800 dark:hover:text-zinc-200'
                                )}
                            >
                                {STATUS_LABEL[s]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-zinc-500 bg-white dark:bg-zinc-950 px-2.5 py-2 rounded-xl border border-slate-200/50 dark:border-zinc-850/50 shadow-sm shrink-0 min-w-[62px] text-center">
                        Case
                    </span>
                    <div className="bg-slate-100/70 dark:bg-zinc-900/60 p-1 rounded-2xl flex items-center gap-1.5 flex-1 overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-zinc-800/40">
                        <button
                            type="button"
                            onClick={() => changeCaseTypeFilter('ALL')}
                            className={cn(
                                'h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.96] shrink-0 border border-transparent',
                                caseTypeFilter === 'ALL'
                                    ? 'bg-brand-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.2)]'
                                    : 'bg-transparent text-slate-650 dark:text-zinc-450 hover:bg-white/60 dark:hover:bg-zinc-850/50 hover:text-slate-800 dark:hover:text-zinc-200'
                            )}
                        >
                            All
                        </button>
                        {ALL_CASE_TYPES.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => changeCaseTypeFilter(c)}
                                className={cn(
                                    'h-8 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.96] shrink-0 border',
                                    caseTypeFilter === c
                                        ? c === 'EMERGENCY' ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 shadow-sm' :
                                          c === 'URGENT' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 shadow-sm' :
                                          'bg-slate-200 text-slate-700 border-slate-350 dark:bg-slate-850 dark:text-slate-300 dark:border-slate-750 shadow-sm'
                                        : 'bg-transparent text-slate-500 dark:text-zinc-400 border-transparent hover:bg-white/60 dark:hover:bg-zinc-850/50 hover:text-slate-800 dark:hover:text-zinc-200'
                                )}
                            >
                                {CASE_LABEL[c]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Card list */}
            {loading ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading referred admissions…</div>
            ) : filtered.length === 0 ? (
                <div className="py-16 px-4 text-center bg-zinc-50/30 dark:bg-zinc-900/30 rounded-[1.5rem] border border-dashed border-zinc-200/80 dark:border-zinc-800/80 max-w-md mx-auto my-8 flex flex-col items-center justify-center shadow-sm">
                    <div className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3.5 shadow-sm">
                        <UserPlus className="h-6 w-6 opacity-60" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">No Admissions Found</p>
                    <p className="text-xs text-slate-550 dark:text-zinc-450 mt-1 max-w-[260px] leading-relaxed">There are no referred admissions matching the selected filters right now.</p>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-full border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 font-semibold hover:bg-zinc-105 mt-4" onClick={() => { setSearch(''); changeStatusFilter('ALL'); changeCaseTypeFilter('ALL'); }}>
                        Reset Filters
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const commentsExpanded = openComments.has(r.referralId);
                        const comments = commentsByReferral[r.referralId] ?? [];
                        return (
                            <div key={r.referralId} className={cn('rounded-[1.5rem] border p-4 sm:p-5 transition-all',
                                !isLowBandwidthMode ? 'bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/80 shadow-sm hover:shadow-md' : 'bg-white border-slate-205')}>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900">{r.patientName ?? r.patientId}</span>
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[r.statusCode])}>{STATUS_LABEL[r.statusCode]}</Badge>
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', CASE_TONE[r.caseType])}>{CASE_LABEL[r.caseType]}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">{r.patientId}{r.patientMobile ? ` · ${r.patientMobile}` : ''}</p>

                                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 text-sm">
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Referring Doctor</dt>
                                                <dd className="text-slate-700">{r.referringDoctorName ?? '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Procedure / Plan</dt>
                                                <dd className="text-slate-700">{r.procedureName ?? '—'}{r.otPlanName ? <span className="block text-xs text-slate-400">{r.otPlanName}</span> : null}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Probable Date</dt>
                                                <dd className="text-slate-700">{formatDate(r.probableAdmissionDate)}</dd>
                                            </div>
                                        </dl>

                                        {r.statusCode === 'NOT_ADMITTED' && r.notAdmittedReason && (
                                            <p className="text-[11px] text-slate-400 mt-2">{r.notAdmittedReason}</p>
                                        )}
                                        {r.statusCode === 'FOLLOW_UP' && r.followUpDate && (
                                            <p className="text-[11px] text-slate-400 mt-2">Follow-up on {formatDate(r.followUpDate)}</p>
                                        )}
                                        {r.sourceAppointmentCancelled && (
                                            <Badge variant="outline" className="mt-2 text-[10px] font-semibold text-amber-700 border-amber-300 bg-amber-50">
                                                Source appointment cancelled
                                            </Badge>
                                        )}
                                    </div>

                                    {(r.statusCode === 'PENDING' || r.statusCode === 'FOLLOW_UP') && (
                                        <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                                            <Button size="sm" className="h-10 sm:h-9 px-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10 transition-all gap-1.5" onClick={() => onAdmitReferral(r)}>
                                                <BedDouble className="h-3.5 w-3.5" /> Admit
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 sm:h-9 px-4 rounded-full border-slate-200 hover:bg-slate-50 dark:border-zinc-850 dark:hover:bg-zinc-800/50 font-bold gap-1.5" onClick={() => { setFollowUpTarget(r); setFollowUpDate(r.followUpDate?.slice(0, 10) ?? ''); setFollowUpNotes(r.followUpNotes ?? ''); }}>
                                                <CalendarClock className="h-3.5 w-3.5" /> Follow Up
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 sm:h-9 px-4 rounded-full border-slate-200 text-rose-600 hover:text-rose-700 dark:border-zinc-850 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 font-bold gap-1.5" onClick={() => { setNotAdmittedTarget(r); setNotAdmittedReason(''); }}>
                                                <XCircle className="h-3.5 w-3.5" /> Not Admitted
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => toggleComments(r.referralId)}>
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {commentsExpanded ? 'Hide comments' : `Comments${r.commentCount ? ` (${r.commentCount})` : ''}`}
                                    </Button>

                                    {commentsExpanded && (
                                        <div className="mt-2 space-y-3">
                                            {commentsLoading.has(r.referralId) ? (
                                                <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
                                            ) : comments.length === 0 ? (
                                                <p className="text-xs text-slate-400">No comments yet.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                     {comments.map(c => (
                                                         <li key={c.commentId} className="rounded-xl bg-slate-50/50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850/60 px-3.5 py-2">
                                                             <p className="text-sm text-slate-805 dark:text-zinc-200 whitespace-pre-wrap">{c.commentText}</p>
                                                             <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">{c.createdBy ?? '—'} · {formatIstDateTime(c.createdAt)}</p>
                                                         </li>
                                                     ))}
                                                 </ul>
                                            )}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <Textarea
                                                    value={commentDrafts[r.referralId] ?? ''}
                                                    onChange={e => setCommentDrafts(prev => ({ ...prev, [r.referralId]: e.target.value }))}
                                                    placeholder="Add a comment…"
                                                    className="resize-none h-16 text-sm flex-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-brand-500/20 focus-visible:ring-2 focus-visible:border-brand-500 transition-all p-3"
                                                />
                                                <Button size="sm" className="h-10 sm:h-9 sm:self-end rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white"
                                                    disabled={!commentDrafts[r.referralId]?.trim() || addingComment.has(r.referralId)}
                                                    onClick={() => submitComment(r.referralId)}>
                                                    {addingComment.has(r.referralId) ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalCount > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-slate-500">
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-10 sm:h-9" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-bold text-slate-600 px-1">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" className="h-10 sm:h-9" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Mark Not Admitted */}
            <Dialog open={!!notAdmittedTarget} onOpenChange={(open) => !open && setNotAdmittedTarget(null)}>
                <DialogContent className="rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl w-[calc(100%-2rem)] sm:w-full">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">Mark as not admitted</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">{notAdmittedTarget?.patientName ?? notAdmittedTarget?.patientId}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Reason <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="e.g. Patient declined surgery, opted for another hospital…"
                            value={notAdmittedReason}
                            onChange={e => setNotAdmittedReason(e.target.value)}
                            className="resize-none h-24 text-sm rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-brand-500/20 focus-visible:ring-2 focus-visible:border-brand-500 transition-all p-3"
                        />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setNotAdmittedTarget(null)} disabled={busy}>Cancel</Button>
                        <Button className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white" onClick={handleMarkNotAdmitted} disabled={busy || !notAdmittedReason.trim()}>
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Follow Up */}
            <Dialog open={!!followUpTarget} onOpenChange={(open) => !open && setFollowUpTarget(null)}>
                <DialogContent className="rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl w-[calc(100%-2rem)] sm:w-full">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">Schedule a follow-up</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">{followUpTarget?.patientName ?? followUpTarget?.patientId}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Follow-up date <span className="text-red-500">*</span></Label>
                            <Input type="date" className="h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white dark:bg-zinc-900 px-3 text-sm" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Notes</Label>
                            <Textarea
                                placeholder="e.g. Will come after discussing with family, expected in 2 days…"
                                value={followUpNotes}
                                onChange={e => setFollowUpNotes(e.target.value)}
                                className="resize-none h-20 text-sm rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-brand-500/20 focus-visible:ring-2 focus-visible:border-brand-500 transition-all p-3"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setFollowUpTarget(null)} disabled={busy}>Cancel</Button>
                        <Button className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white" onClick={handleScheduleFollowUp} disabled={busy || !followUpDate}>
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Schedule
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReferredAdmissionBoard;
