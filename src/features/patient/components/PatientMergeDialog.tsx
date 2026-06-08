import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    GitMerge, Search, X, Loader2, ArrowRight, AlertTriangle, Check, Crown, RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    patientApi, type MergeSearchItem, type PatientRecordCounts, type MergePatientsResult,
} from '../services/patientApi';

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onMerged?: (canonicalPatientId: string) => void;
}

const initials = (name?: string | null) => {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

/** Search box + results dropdown used to pick each side of the merge. */
const PatientPicker: React.FC<{
    label: string; tone: 'canonical' | 'duplicate'; picked: MergeSearchItem | null;
    onPick: (p: MergeSearchItem) => void; onClear: () => void; excludeId?: string;
}> = ({ label, tone, picked, onPick, onClear, excludeId }) => {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<MergeSearchItem[]>([]);
    const [busy, setBusy] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (picked) return;
        if (timer.current) clearTimeout(timer.current);
        const term = q.trim();
        if (term.length < 2) { setResults([]); setBusy(false); return; }
        setBusy(true);
        timer.current = setTimeout(async () => {
            const items = await patientApi.searchByText(term);
            setResults(items.filter(i => i.patientId !== excludeId));
            setBusy(false);
        }, 300);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [q, picked, excludeId]);

    const ring = tone === 'canonical' ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50';

    return (
        <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1">
                {tone === 'canonical' ? <Crown className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-rose-600" />} {label}
            </p>
            {picked ? (
                <div className={cn('rounded-xl border-2 p-3 flex items-start gap-3', ring)}>
                    <div className="h-10 w-10 rounded-full bg-white text-slate-700 flex items-center justify-center text-sm font-bold shrink-0 border">{initials(picked.fullName)}</div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{picked.fullName || '—'}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                            {picked.patientId}{picked.age != null ? ` · ${picked.age}${picked.sex ?? ''}` : picked.sex ? ` · ${picked.sex}` : ''}{picked.mobile ? ` · ${picked.mobile}` : ''}
                        </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={onClear} className="h-7 text-xs shrink-0"><X className="h-3.5 w-3.5" /></Button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Patient ID, name or mobile…" className="h-10 pl-9 pr-9 rounded-lg" />
                    {busy && <Loader2 className="h-4 w-4 text-brand-400 animate-spin absolute right-3 top-3" />}
                    {q.trim().length >= 2 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 border border-slate-200 rounded-xl bg-white shadow-lg max-h-56 overflow-auto divide-y divide-slate-100">
                            {results.map(r => (
                                <button key={r.patientId} type="button" onClick={() => { onPick(r); setQ(''); setResults([]); }}
                                    className="w-full text-left px-3 py-2 hover:bg-brand-50/60 flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0">{initials(r.fullName)}</div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-slate-900 truncate">{r.fullName || '—'}</p>
                                        <p className="text-[11px] text-slate-500 font-mono truncate">{r.patientId}{r.mobile ? ` · ${r.mobile}` : ''}</p>
                                    </div>
                                </button>
                            ))}
                            {!busy && results.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">No match.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CountRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex items-center justify-between text-xs py-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono font-semibold text-slate-800">{value}</span>
    </div>
);

const CountsCard: React.FC<{ counts: PatientRecordCounts | null; loading: boolean }> = ({ counts, loading }) => {
    if (loading) return <p className="text-xs text-slate-400 flex items-center gap-2 py-3"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading records…</p>;
    if (!counts) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <CountRow label="Admissions" value={counts.admissions} />
            <CountRow label="Appointments" value={counts.appointments} />
            <CountRow label="Invoices" value={counts.invoices} />
            <CountRow label="Payments" value={counts.payments} />
            <CountRow label="Prescriptions" value={counts.prescriptions} />
            <CountRow label="Encounters" value={counts.encounters} />
            <CountRow label="Alerts" value={counts.alerts} />
            <div className="border-t border-slate-100 mt-1 pt-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Total records</span>
                <span className="font-mono font-bold text-brand-700">{counts.total}</span>
            </div>
        </div>
    );
};

export const PatientMergeDialog: React.FC<Props> = ({ open, onOpenChange, onMerged }) => {
    const { toast } = useToast();
    const [canonical, setCanonical] = useState<MergeSearchItem | null>(null);
    const [duplicate, setDuplicate] = useState<MergeSearchItem | null>(null);
    const [canonicalCounts, setCanonicalCounts] = useState<PatientRecordCounts | null>(null);
    const [duplicateCounts, setDuplicateCounts] = useState<PatientRecordCounts | null>(null);
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [merging, setMerging] = useState(false);
    const [done, setDone] = useState<MergePatientsResult | null>(null);

    useEffect(() => {
        let active = true;
        if (!canonical && !duplicate) { setCanonicalCounts(null); setDuplicateCounts(null); return; }
        setLoadingCounts(true);
        Promise.all([
            canonical ? patientApi.getRecordCounts(canonical.patientId) : Promise.resolve(null),
            duplicate ? patientApi.getRecordCounts(duplicate.patientId) : Promise.resolve(null),
        ]).then(([c, d]) => {
            if (!active) return;
            setCanonicalCounts(c); setDuplicateCounts(d); setLoadingCounts(false);
        }).catch(() => { if (active) setLoadingCounts(false); });
        return () => { active = false; };
    }, [canonical, duplicate]);

    const reset = () => {
        setCanonical(null); setDuplicate(null); setCanonicalCounts(null); setDuplicateCounts(null);
        setConfirm(false); setMerging(false); setDone(null);
    };

    const close = () => { reset(); onOpenChange(false); };

    const bothPicked = !!canonical && !!duplicate;
    const canMerge = bothPicked && confirm && !merging;

    const doMerge = async () => {
        if (!canMerge || !canonical || !duplicate) return;
        setMerging(true);
        try {
            const res = await patientApi.mergePatients(canonical.patientId, duplicate.patientId);
            if (res.success) {
                setDone(res);
                toast({ title: 'Patients merged', description: `${res.totalMoved ?? 0} record(s) moved into ${res.canonicalPatientId}.` });
                onMerged?.(canonical.patientId);
            } else {
                toast({ title: 'Merge failed', description: res.message ?? 'Please try again.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Merge failed', description: 'Network or server error. No changes were made.', variant: 'destructive' });
        } finally {
            setMerging(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-br from-brand-600 to-violet-600 text-white flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><GitMerge className="h-5 w-5" /></div>
                    <div>
                        <h2 className="text-base font-bold">Merge duplicate patients</h2>
                        <p className="text-xs text-brand-100">Move every record from a duplicate patient into the one you keep.</p>
                    </div>
                </div>

                {done ? (
                    <div className="px-6 py-10 flex flex-col items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 ring-8 ring-emerald-50 flex items-center justify-center mb-4"><Check className="h-8 w-8 text-emerald-600" /></div>
                        <h3 className="text-lg font-bold text-slate-900">Merge complete</h3>
                        <p className="text-sm text-slate-500 mt-1">{done.totalMoved ?? 0} record(s) moved into <span className="font-mono font-semibold">{done.canonicalPatientId}</span>.</p>
                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" className="h-10" onClick={reset}><RotateCcw className="h-4 w-4 mr-1.5" /> Merge another</Button>
                            <Button className="h-10 bg-brand-600 hover:bg-brand-700" onClick={close}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                            <div className="flex items-stretch gap-3">
                                <PatientPicker label="Keep (canonical)" tone="canonical" picked={canonical}
                                    onPick={setCanonical} onClear={() => setCanonical(null)} excludeId={duplicate?.patientId} />
                                <div className="flex items-center pt-6"><ArrowRight className="h-5 w-5 text-slate-300" /></div>
                                <PatientPicker label="Merge & remove" tone="duplicate" picked={duplicate}
                                    onPick={setDuplicate} onClear={() => setDuplicate(null)} excludeId={canonical?.patientId} />
                            </div>

                            {bothPicked && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Kept</p>
                                            <CountsCard counts={canonicalCounts} loading={loadingCounts} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-rose-600 mb-1.5">Removed → moves in</p>
                                            <CountsCard counts={duplicateCounts} loading={loadingCounts} />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-3">
                                        <div className="flex items-start gap-2.5">
                                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                            <div className="text-xs text-slate-700">
                                                <p className="font-semibold text-slate-900">This cannot be undone.</p>
                                                <p className="mt-0.5">All {duplicateCounts?.total ?? 0} record(s) under <span className="font-mono">{duplicate?.patientId}</span> will move to <span className="font-mono">{canonical?.patientId}</span>, and <span className="font-mono">{duplicate?.patientId}</span> will be retired.</p>
                                            </div>
                                        </div>
                                        <label className="flex items-start gap-2 text-xs text-slate-700 mt-2.5 cursor-pointer">
                                            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-0.5" />
                                            <span>I understand this is permanent and have confirmed these are the <span className="font-semibold">same person</span>.</span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-slate-200 flex items-center gap-3">
                            <Button variant="outline" className="h-10" onClick={close}>Cancel</Button>
                            <div className="flex-1" />
                            <Button onClick={doMerge} disabled={!canMerge} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 font-semibold">
                                {merging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitMerge className="h-4 w-4 mr-2" />} Merge patients
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PatientMergeDialog;
