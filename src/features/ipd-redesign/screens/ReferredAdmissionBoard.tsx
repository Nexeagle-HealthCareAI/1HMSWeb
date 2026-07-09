import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Loader2, RefreshCw, BedDouble, XCircle, CalendarClock, Search } from 'lucide-react';
import { admissionReferralApi, AdmissionReferralItem, CaseType, ReferralStatus } from '../services/admissionReferralApi';

interface Props {
    onBack: () => void;
    onAdmitReferral: (referral: AdmissionReferralItem) => void;
}

const STATUS_TONE: Record<ReferralStatus, string> = {
    PENDING: 'border-sky-200 bg-sky-50 text-sky-700',
    CONVERTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    NOT_ADMITTED: 'border-slate-200 bg-slate-100 text-slate-500',
    FOLLOW_UP: 'border-amber-200 bg-amber-50 text-amber-700',
};
const STATUS_LABEL: Record<ReferralStatus, string> = {
    PENDING: 'Pending', CONVERTED: 'Converted', NOT_ADMITTED: 'Not Admitted', FOLLOW_UP: 'Follow-up',
};
const CASE_TONE: Record<CaseType, string> = {
    EMERGENCY: 'border-rose-200 bg-rose-50 text-rose-700',
    URGENT: 'border-amber-200 bg-amber-50 text-amber-700',
    PLANNED: 'border-slate-200 bg-slate-50 text-slate-600',
};

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
 */
export const ReferredAdmissionBoard: React.FC<Props> = ({ onBack, onAdmitReferral }) => {
    const { toast } = useToast();
    const [referrals, setReferrals] = useState<AdmissionReferralItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'ALL'>('PENDING');
    const [caseTypeFilter, setCaseTypeFilter] = useState<CaseType | 'ALL'>('ALL');

    const [notAdmittedTarget, setNotAdmittedTarget] = useState<AdmissionReferralItem | null>(null);
    const [notAdmittedReason, setNotAdmittedReason] = useState('');
    const [followUpTarget, setFollowUpTarget] = useState<AdmissionReferralItem | null>(null);
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const res = await admissionReferralApi.list({ statusCode: statusFilter === 'ALL' ? undefined : statusFilter });
            setReferrals(res?.referrals ?? []);
        } catch (e: any) {
            toast({ title: 'Could not load referred admissions', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [statusFilter]);

    const filtered = useMemo(() => {
        return referrals.filter(r => {
            const matchesCaseType = caseTypeFilter === 'ALL' || r.caseType === caseTypeFilter;
            const q = search.trim().toLowerCase();
            const matchesSearch = !q ||
                (r.patientName ?? '').toLowerCase().includes(q) ||
                (r.patientId ?? '').toLowerCase().includes(q) ||
                (r.procedureName ?? '').toLowerCase().includes(q) ||
                (r.referringDoctorName ?? '').toLowerCase().includes(q);
            return matchesCaseType && matchesSearch;
        });
    }, [referrals, caseTypeFilter, search]);

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

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Referred Admissions</h1>
                        <p className="text-xs text-slate-500">Patients doctors have advised for admission, from prescription board.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing || loading} className="gap-1.5">
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search patient, doctor, procedure…" className="pl-9 h-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ReferralStatus | 'ALL')}>
                    <SelectTrigger className="w-[150px] h-9 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                        <SelectItem value="CONVERTED">Converted</SelectItem>
                        <SelectItem value="NOT_ADMITTED">Not Admitted</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={caseTypeFilter} onValueChange={v => setCaseTypeFilter(v as CaseType | 'ALL')}>
                    <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All case types</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading referred admissions…</div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No referred admissions match these filters.</div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Patient</th>
                                <th className="px-4 py-3">Referring Doctor</th>
                                <th className="px-4 py-3">Procedure / Plan</th>
                                <th className="px-4 py-3">Case Type</th>
                                <th className="px-4 py-3">Probable Date</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(r => (
                                <tr key={r.referralId} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-900">{r.patientName ?? r.patientId}</div>
                                        <div className="text-xs text-slate-400">{r.patientId}{r.patientMobile ? ` · ${r.patientMobile}` : ''}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{r.referringDoctorName ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-slate-700">{r.procedureName ?? '—'}</div>
                                        {r.otPlanName && <div className="text-xs text-slate-400">{r.otPlanName}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={`text-[10px] font-bold ${CASE_TONE[r.caseType]}`}>{r.caseType}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{formatDate(r.probableAdmissionDate)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={`text-[10px] font-bold ${STATUS_TONE[r.statusCode]}`}>{STATUS_LABEL[r.statusCode]}</Badge>
                                        {r.statusCode === 'NOT_ADMITTED' && r.notAdmittedReason && (
                                            <div className="text-[11px] text-slate-400 mt-0.5">{r.notAdmittedReason}</div>
                                        )}
                                        {r.statusCode === 'FOLLOW_UP' && r.followUpDate && (
                                            <div className="text-[11px] text-slate-400 mt-0.5">on {formatDate(r.followUpDate)}</div>
                                        )}
                                        {r.sourceAppointmentCancelled && (
                                            <Badge variant="outline" className="mt-1 text-[10px] font-semibold text-amber-700 border-amber-300 bg-amber-50">
                                                Source appointment cancelled
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {(r.statusCode === 'PENDING' || r.statusCode === 'FOLLOW_UP') && (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button size="sm" className="h-8 gap-1.5 bg-brand-600 hover:bg-brand-700" onClick={() => onAdmitReferral(r)}>
                                                    <BedDouble className="h-3.5 w-3.5" /> Admit
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setFollowUpTarget(r); setFollowUpDate(r.followUpDate?.slice(0, 10) ?? ''); setFollowUpNotes(r.followUpNotes ?? ''); }}>
                                                    <CalendarClock className="h-3.5 w-3.5" /> Follow Up
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700" onClick={() => { setNotAdmittedTarget(r); setNotAdmittedReason(''); }}>
                                                    <XCircle className="h-3.5 w-3.5" /> Not Admitted
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                        <Button variant="ghost" onClick={() => setNotAdmittedTarget(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={handleMarkNotAdmitted} disabled={busy || !notAdmittedReason.trim()}>
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
                            <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
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
                        <Button variant="ghost" onClick={() => setFollowUpTarget(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={handleScheduleFollowUp} disabled={busy || !followUpDate}>
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReferredAdmissionBoard;
