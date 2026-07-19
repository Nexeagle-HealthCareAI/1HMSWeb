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
    MessageSquare, Send, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { admissionReferralApi, AdmissionReferralItem, AdmissionReferralCommentItem, CaseType, ReferralStatus } from '../services/admissionReferralApi';
import { useAppStore } from '@/store/appStore';
import { STATUS_TONE, STATUS_LABEL, ALL_STATUSES, CASE_TONE, CASE_LABEL, ALL_CASE_TYPES } from '../utils/referralStatus';
import { formatIstDateTime } from '../utils/istDate';
import { cn } from '@/lib/utils';

interface Props {
    onBack: () => void;
    onAdmitReferral: (referral: AdmissionReferralItem) => void;
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
export const ReferredAdmissionBoard: React.FC<Props> = ({ onBack, onAdmitReferral }) => {
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Button variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 shrink-0" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shrink-0">
                        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">Referred Admissions</h1>
                        <p className="text-xs text-slate-500 hidden sm:block">Patients doctors have advised for admission, from prescription board.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-9 px-3 shrink-0 self-start sm:self-auto" onClick={() => load(true)} disabled={refreshing || loading}>
                    <RefreshCw className={cn('h-4 w-4 sm:mr-1.5', refreshing && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {/* KPI tiles — informational, read-only summary of every status (including zero counts) */}
            {/* KPI tiles — horizontal scroll on mobile */}
            <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
                <div className={cn('rounded-[1.25rem] border border-slate-200 p-4 min-w-[140px] sm:min-w-0 snap-start shrink-0 flex flex-col justify-center',
                    !isLowBandwidthMode ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-white')}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">All</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{totalReferrals}</p>
                </div>
                {ALL_STATUSES.map(s => (
                    <div key={s} className={cn('rounded-[1.25rem] border p-4 min-w-[140px] sm:min-w-0 snap-start shrink-0 flex flex-col justify-center', STATUS_TONE[s],
                        !isLowBandwidthMode ? 'bg-opacity-80 backdrop-blur-xl shadow-sm' : '')}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{STATUS_LABEL[s]}</p>
                        <p className="text-3xl font-black mt-1">{statusCounts[s] ?? 0}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search current page…" className="pl-9 h-11 sm:h-9 bg-white/80 backdrop-blur-sm rounded-xl border-slate-200/60" value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Status</span>
                    <button type="button" onClick={() => changeStatusFilter('ALL')}
                        className={cn('h-10 sm:h-9 px-4 sm:px-3 rounded-full text-sm sm:text-xs font-bold border transition-all shrink-0',
                            statusFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white/80 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-white')}>
                        All · {totalReferrals}
                    </button>
                    {ALL_STATUSES.map(s => (
                        <button key={s} type="button" onClick={() => changeStatusFilter(s)}
                            className={cn('h-10 sm:h-9 px-4 sm:px-3 rounded-full text-sm sm:text-xs font-bold border transition-all shrink-0',
                                statusFilter === s ? STATUS_TONE[s] + ' ring-2 ring-offset-1 ring-current shadow-md' : 'bg-white/80 backdrop-blur-md text-slate-500 border-slate-200 hover:bg-white')}>
                            {STATUS_LABEL[s]} · {statusCounts[s] ?? 0}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">Case</span>
                    <button type="button" onClick={() => changeCaseTypeFilter('ALL')}
                        className={cn('h-10 sm:h-9 px-4 sm:px-3 rounded-full text-sm sm:text-xs font-bold border transition-all shrink-0',
                            caseTypeFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white/80 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-white')}>
                        All
                    </button>
                    {ALL_CASE_TYPES.map(c => (
                        <button key={c} type="button" onClick={() => changeCaseTypeFilter(c)}
                            className={cn('h-10 sm:h-9 px-4 sm:px-3 rounded-full text-sm sm:text-xs font-bold border transition-all shrink-0',
                                caseTypeFilter === c ? CASE_TONE[c] + ' ring-2 ring-offset-1 ring-current shadow-md' : 'bg-white/80 backdrop-blur-md text-slate-500 border-slate-200 hover:bg-white')}>
                            {CASE_LABEL[c]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Card list */}
            {loading ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading referred admissions…</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No referred admissions match these filters.</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const commentsExpanded = openComments.has(r.referralId);
                        const comments = commentsByReferral[r.referralId] ?? [];
                        return (
                            <div key={r.referralId} className={cn('rounded-[1.5rem] border p-4 sm:p-5 transition-all',
                                !isLowBandwidthMode ? 'bg-white/90 backdrop-blur-xl shadow-lg border-white/40' : 'bg-white border-slate-200')}>
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
                                            <Button size="sm" className="h-10 sm:h-9 gap-1.5 bg-brand-600 hover:bg-brand-700" onClick={() => onAdmitReferral(r)}>
                                                <BedDouble className="h-3.5 w-3.5" /> Admit
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 sm:h-9 gap-1.5" onClick={() => { setFollowUpTarget(r); setFollowUpDate(r.followUpDate?.slice(0, 10) ?? ''); setFollowUpNotes(r.followUpNotes ?? ''); }}>
                                                <CalendarClock className="h-3.5 w-3.5" /> Follow Up
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 sm:h-9 gap-1.5 text-red-600 hover:text-red-700" onClick={() => { setNotAdmittedTarget(r); setNotAdmittedReason(''); }}>
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
                                                        <li key={c.commentId} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                                                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{c.commentText}</p>
                                                            <p className="text-[11px] text-slate-400 mt-1">{c.createdBy ?? '—'} · {formatIstDateTime(c.createdAt)}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <Textarea
                                                    value={commentDrafts[r.referralId] ?? ''}
                                                    onChange={e => setCommentDrafts(prev => ({ ...prev, [r.referralId]: e.target.value }))}
                                                    placeholder="Add a comment…"
                                                    className="resize-none h-16 text-sm flex-1"
                                                />
                                                <Button size="sm" className="h-10 sm:h-9 sm:self-end bg-brand-600 hover:bg-brand-700"
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark as not admitted</DialogTitle>
                        <DialogDescription>{notAdmittedTarget?.patientName ?? notAdmittedTarget?.patientId}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label>Reason <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="e.g. Patient declined surgery, opted for another hospital…"
                            value={notAdmittedReason}
                            onChange={e => setNotAdmittedReason(e.target.value)}
                            className="resize-none h-24"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setNotAdmittedTarget(null)} disabled={busy}>Cancel</Button>
                        <Button className="h-11 sm:h-10" onClick={handleMarkNotAdmitted} disabled={busy || !notAdmittedReason.trim()}>
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Follow Up */}
            <Dialog open={!!followUpTarget} onOpenChange={(open) => !open && setFollowUpTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule a follow-up</DialogTitle>
                        <DialogDescription>{followUpTarget?.patientName ?? followUpTarget?.patientId}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <Label>Follow-up date <span className="text-red-500">*</span></Label>
                            <Input type="date" className="h-11 sm:h-10" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="e.g. Will come after discussing with family, expected in 2 days…"
                                value={followUpNotes}
                                onChange={e => setFollowUpNotes(e.target.value)}
                                className="resize-none h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setFollowUpTarget(null)} disabled={busy}>Cancel</Button>
                        <Button className="h-11 sm:h-10" onClick={handleScheduleFollowUp} disabled={busy || !followUpDate}>
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReferredAdmissionBoard;
