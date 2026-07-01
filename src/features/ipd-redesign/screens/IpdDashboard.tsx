import React, { useMemo, useState } from 'react';
import { Hotel, Plus, BedDouble, Activity, IndianRupee, TrendingUp, Search, ChevronRight, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIpdStore } from '../store';
import type { BedStatus } from '../types';

const BED_TONE: Record<BedStatus, string> = {
    AVAILABLE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    OCCUPIED: 'bg-rose-50 border-rose-200 text-rose-700',
    CLEANING: 'bg-amber-50 border-amber-200 text-amber-700',
    RESERVED: 'bg-sky-50 border-sky-200 text-sky-700',
    BLOCKED: 'bg-slate-100 border-slate-200 text-slate-500',
};

interface Props {
    onOpenAdmission: (admissionId: string) => void;
    onAdmit: () => void;
    onOpenBedBoard: () => void;
}

export const IpdDashboard: React.FC<Props> = ({ onOpenAdmission, onAdmit, onOpenBedBoard }) => {
    const wards = useIpdStore(s => s.wards);
    const beds = useIpdStore(s => s.beds);
    const admissionViews = useIpdStore(s => s.admissionViews);
    const admissionView = useIpdStore(s => s.admissionView);
    const [search, setSearch] = useState('');
    const [wardFilter, setWardFilter] = useState<string>('ALL');

    const views = admissionViews();

    const kpis = useMemo(() => {
        const totalBeds = beds.length;
        const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
        const available = beds.filter(b => b.status === 'AVAILABLE').length;
        const totalDue = views.reduce((t, v) => t + Math.max(0, v.balance), 0);
        return {
            occupancyPct: Math.round((occupied / totalBeds) * 100),
            occupied, available, totalBeds,
            admittedCount: views.length,
            totalDue,
        };
    }, [beds, views]);

    const filteredAdmissions = useMemo(() => {
        const q = search.trim().toLowerCase();
        return views.filter(v => {
            if (wardFilter !== 'ALL' && v.wardId !== wardFilter) return false;
            if (!q) return true;
            return v.patient.name.toLowerCase().includes(q)
                || v.patient.uhid.toLowerCase().includes(q)
                || v.admissionNo.toLowerCase().includes(q)
                || v.bed.bedCode.toLowerCase().includes(q);
        });
    }, [views, search, wardFilter]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md">
                        <Hotel className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">IPD Command Center</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Bed board · active admissions · occupancy & dues at a glance.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={onOpenBedBoard} variant="outline" className="h-10 font-semibold">
                        <LayoutGrid className="h-4 w-4 mr-2" /> Live Bed Board
                    </Button>
                    <Button onClick={onAdmit} className="h-10 bg-brand-600 hover:bg-brand-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> Admit Patient
                    </Button>
                </div>
            </div>

            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiTile label="Occupancy" value={`${kpis.occupancyPct}%`} icon={<Activity className="h-4 w-4" />} tone="indigo" sub={`${kpis.occupied}/${kpis.totalBeds} beds`} />
                <KpiTile label="Available" value={kpis.available} icon={<BedDouble className="h-4 w-4" />} tone="emerald" />
                <KpiTile label="Admitted" value={kpis.admittedCount} icon={<Hotel className="h-4 w-4" />} tone="sky" />
                <KpiTile label="Outstanding" value={`₹${kpis.totalDue.toLocaleString('en-IN')}`} icon={<IndianRupee className="h-4 w-4" />} tone="rose" />
                <KpiTile label="Discharges today" value={views.filter(v => v.status === 'DISCHARGE_INITIATED').length} icon={<TrendingUp className="h-4 w-4" />} tone="amber" />
            </div>

            {/* Bed board (demo data below — use "Live Bed Board" above for the real, backend-wired board) */}
            <section className="space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Bed Board (demo)</h2>
                <div className="space-y-4">
                    {wards.map(ward => {
                        const wardBeds = beds.filter(b => b.wardId === ward.wardId);
                        const occ = wardBeds.filter(b => b.status === 'OCCUPIED').length;
                        return (
                            <div key={ward.wardId} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-slate-900">{ward.wardName}</p>
                                        <p className="text-[11px] text-slate-500">{ward.wardCode} · Floor {ward.floor} · ₹{ward.dailyRate.toLocaleString('en-IN')}/day</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{occ}/{wardBeds.length} occupied</Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {wardBeds.map(bed => {
                                        const av = bed.admissionId ? admissionView(bed.admissionId) : undefined;
                                        return (
                                            <button
                                                key={bed.bedId}
                                                type="button"
                                                disabled={!bed.admissionId}
                                                onClick={() => bed.admissionId && onOpenAdmission(bed.admissionId)}
                                                className={cn(
                                                    'w-32 rounded-lg border-2 p-2 text-left transition-all',
                                                    BED_TONE[bed.status],
                                                    bed.admissionId ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-90'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-[10px] font-bold">{bed.bedCode}</span>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider">{bed.status}</span>
                                                </div>
                                                {av ? (
                                                    <div className="mt-1">
                                                        <p className="text-xs font-bold truncate">{av.patient.name}</p>
                                                        <p className="text-[10px] opacity-80 truncate">{av.patient.age}{av.patient.sex} · {av.lengthOfStayDays}d</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] mt-1 opacity-70">—</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Active admissions list */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Active Admissions</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, UHID, bed…" className="h-9 text-sm pl-8 w-60 bg-white" />
                        </div>
                        <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                            <option value="ALL">All wards</option>
                            {wards.map(w => <option key={w.wardId} value={w.wardId}>{w.wardName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                <th className="text-left px-3 py-2.5 font-bold">Admission #</th>
                                <th className="text-left px-3 py-2.5 font-bold">Ward / Bed</th>
                                <th className="text-left px-3 py-2.5 font-bold">Doctor</th>
                                <th className="text-left px-3 py-2.5 font-bold">Diagnosis</th>
                                <th className="text-right px-3 py-2.5 font-bold">LOS</th>
                                <th className="text-right px-3 py-2.5 font-bold">Balance</th>
                                <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                <th className="w-px"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmissions.map(v => (
                                <tr key={v.admissionId} className="border-t border-slate-100 hover:bg-brand-50/40 cursor-pointer" onClick={() => onOpenAdmission(v.admissionId)}>
                                    <td className="px-3 py-2">
                                        <p className="font-semibold text-slate-900">{v.patient.name}</p>
                                        <p className="text-[11px] text-slate-500">{v.patient.uhid} · {v.patient.age}{v.patient.sex}{v.patient.allergies?.length ? ' · ⚠ allergy' : ''}</p>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs text-brand-700 font-bold">{v.admissionNo}</td>
                                    <td className="px-3 py-2 text-xs text-slate-700">{v.ward.wardCode} · {v.bed.bedCode}</td>
                                    <td className="px-3 py-2 text-xs text-slate-700">{v.attendingDoctor}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600 max-w-[220px] truncate" title={v.provisionalDiagnosis}>{v.finalDiagnosis ?? v.provisionalDiagnosis}</td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">{v.lengthOfStayDays}d</td>
                                    <td className={cn('px-3 py-2 text-right text-xs font-bold', v.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                                        ₹{Math.abs(v.balance).toLocaleString('en-IN')}{v.balance < 0 ? ' CR' : ''}
                                    </td>
                                    <td className="px-3 py-2">
                                        <Badge variant="outline" className={cn('text-[10px] font-bold',
                                            v.status === 'DISCHARGE_INITIATED' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                                            {v.status === 'DISCHARGE_INITIATED' ? 'DISCHARGING' : 'ADMITTED'}
                                        </Badge>
                                    </td>
                                    <td className="px-2 py-2 text-right"><ChevronRight className="h-4 w-4 text-slate-300" /></td>
                                </tr>
                            ))}
                            {filteredAdmissions.length === 0 && (
                                <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-400">No admissions match your filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
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
