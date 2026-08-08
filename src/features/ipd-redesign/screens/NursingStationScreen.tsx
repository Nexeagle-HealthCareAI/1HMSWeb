import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ClipboardList, ThermometerSun, HeartPulse, Pill, AlertTriangle, ChevronRight } from 'lucide-react';
import { nursingStationApi, type NursingStationPatientItem } from '../services/nursingStationApi';
import { useAuthStore } from '@/store/authStore';

const SUMMARY_POLL_MS = 60000;
const VITAL_STALE_HOURS = 6;

const CensusTile: React.FC<{ label: string; value: number; tone: 'rose' | 'amber' | 'slate' }> = ({ label, value, tone }) => {
    const tones: Record<string, string> = {
        rose: 'border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455',
        amber: 'border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-455',
        slate: 'border-zinc-200/60 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400',
    };
    return (
        <div className={cn('rounded-[1.25rem] border p-3.5 sm:p-4.5 flex flex-col justify-between min-h-[82px]', tones[tone])}>
            <p className="text-xl sm:text-2xl font-black leading-none">{value}</p>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-2.5 leading-tight">{label}</p>
        </div>
    );
};

const isStale = (lastVitalAt?: string | null) => {
    if (!lastVitalAt) return true;
    return Date.now() - new Date(lastVitalAt).getTime() > VITAL_STALE_HOURS * 3600 * 1000;
};

const formatVitalAge = (iso?: string | null) => {
    if (!iso) return 'No vitals recorded';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const NursingStationScreen: React.FC = () => {
    const navigate = useNavigate();
    const hospitalId = useAuthStore((state) => state.hospitalId) || '';

    const [summary, setSummary] = useState<{ nurseName?: string | null; hasAssignments: boolean; totalPatients: number; totalMedsDue: number; totalMedsOverdue: number; items: NursingStationPatientItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [wardFilter, setWardFilter] = useState('ALL');
    const [shiftFilter, setShiftFilter] = useState('ALL');

    const load = (silent = false) => {
        if (!hospitalId) return;
        if (!silent) setLoading(true);
        nursingStationApi.getSummary({ shiftCode: shiftFilter === 'ALL' ? undefined : shiftFilter }, hospitalId)
            .then(res => { setSummary(res); setLoadError(null); })
            .catch(e => setLoadError(e?.message ?? 'Could not load the nursing station'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [hospitalId, shiftFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const id = setInterval(() => load(true), SUMMARY_POLL_MS);
        return () => clearInterval(id);
    }, [hospitalId, shiftFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const wards = useMemo(() => Array.from(new Set((summary?.items ?? []).map(i => i.wardName || i.wardCode))), [summary]);

    const visibleItems = useMemo(() => {
        const items = summary?.items ?? [];
        const filtered = wardFilter === 'ALL' ? items : items.filter(i => (i.wardName || i.wardCode) === wardFilter);
        return [...filtered].sort((a, b) => {
            if (b.medsOverdueCount !== a.medsOverdueCount) return b.medsOverdueCount - a.medsOverdueCount;
            if (b.medsDueCount !== a.medsDueCount) return b.medsDueCount - a.medsDueCount;
            const aStale = isStale(a.lastVitalAt) ? 1 : 0;
            const bStale = isStale(b.lastVitalAt) ? 1 : 0;
            return bStale - aStale;
        });
    }, [summary, wardFilter]);

    if (loading && !summary) {
        return (
            <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your patients…
            </div>
        );
    }

    if (loadError) {
        return <div className="py-20 text-center text-sm text-rose-500 flex flex-col items-center gap-2"><AlertTriangle className="h-6 w-6" />{loadError}</div>;
    }

    if (summary && !summary.hasAssignments) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center">
                <ClipboardList className="h-12 w-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
                <p className="font-bold text-lg text-slate-700 dark:text-zinc-300">You're not rostered to a ward yet</p>
                <p className="text-sm text-slate-500 dark:text-zinc-450 mt-1">Ask your admin to assign you to a ward and shift from the Nursing Station roster.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-10">
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                        <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">My Patients</h1>
                        <p className="text-[11px] text-brand-100 mt-0.5">{summary?.nurseName ? `Hi ${summary.nurseName} — ` : ''}your rostered wards, right now</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="grid grid-cols-3 gap-2 flex-1">
                    <CensusTile label="Patients" value={summary?.totalPatients ?? 0} tone="slate" />
                    <CensusTile label="Meds due" value={summary?.totalMedsDue ?? 0} tone="amber" />
                    <CensusTile label="Meds overdue" value={summary?.totalMedsOverdue ?? 0} tone="rose" />
                </div>
                <div className="flex gap-2">
                    <Select value={wardFilter} onValueChange={setWardFilter}>
                        <SelectTrigger className="h-11 sm:h-10 text-sm font-semibold rounded-xl w-full sm:w-[160px] shrink-0"><SelectValue placeholder="All wards" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All wards</SelectItem>
                            {wards.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                        <SelectTrigger className="h-11 sm:h-10 text-sm font-semibold rounded-xl w-full sm:w-[140px] shrink-0"><SelectValue placeholder="All shifts" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All shifts</SelectItem>
                            <SelectItem value="MORNING">Morning</SelectItem>
                            <SelectItem value="EVENING">Evening</SelectItem>
                            <SelectItem value="NIGHT">Night</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {visibleItems.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No patients on this ward right now.</div>
            ) : (
                <div className="space-y-2.5">
                    {visibleItems.map(item => {
                        const stale = isStale(item.lastVitalAt);
                        return (
                            <motion.button
                                key={item.admissionId}
                                layout
                                onClick={() => navigate(`/ipd-workspace/patient/${item.admissionId}`)}
                                className="w-full text-left rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-slate-900 dark:text-zinc-100 truncate">{item.patientName ?? 'Unnamed patient'}</p>
                                        <span className="text-[11px] text-slate-450 dark:text-zinc-400 font-medium">
                                            {item.patientAge ?? ''}{item.patientSex ?? ''} · Bed {item.bedCode ?? '—'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-450 dark:text-zinc-400 mt-0.5 truncate">
                                        {item.wardName ?? item.wardCode}{item.primaryDoctorName ? ` · Dr. ${item.primaryDoctorName}` : ''}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        <span className={cn('flex items-center gap-1 text-[11px] font-semibold', stale ? 'text-amber-600' : 'text-slate-500 dark:text-zinc-400')}>
                                            <HeartPulse className="h-3.5 w-3.5" /> {formatVitalAge(item.lastVitalAt)}
                                        </span>
                                        {item.lastTemperature != null && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                <ThermometerSun className="h-3.5 w-3.5" /> {item.lastTemperature}°
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.medsOverdueCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-800">
                                            <Pill className="h-3 w-3 mr-1" /> {item.medsOverdueCount} overdue
                                        </Badge>
                                    )}
                                    {item.medsDueCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800">
                                            <Pill className="h-3 w-3 mr-1" /> {item.medsDueCount} due
                                        </Badge>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-slate-350" />
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NursingStationScreen;
