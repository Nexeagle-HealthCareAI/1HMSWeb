import React, { useMemo, useState } from 'react';
import { Stethoscope, AlertCircle, Clock, CheckCircle2, LogOut, ChevronRight, NotebookPen, FlaskConical, Pill } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useIpdStore } from '../store';

const DOCTORS = ['Dr. Mehta', 'Dr. Rao', 'Dr. Kapoor'];

interface Props { onOpenAdmission: (admissionId: string) => void; }

export const DoctorDashboard: React.FC<Props> = ({ onOpenAdmission }) => {
    const admissionViews = useIpdStore(s => s.admissionViews);
    const hasCriticalVitals = useIpdStore(s => s.hasCriticalVitals);
    const pendingTaskCount = useIpdStore(s => s.pendingTaskCount);
    const [doctor, setDoctor] = useState('Dr. Mehta');

    const myPatients = useMemo(
        () => admissionViews().filter(v => v.attendingDoctor === doctor || v.treatingTeam?.includes(doctor)),
        [admissionViews, doctor]
    );

    const triaged = myPatients.map(v => {
        const critical = hasCriticalVitals(v.admissionId);
        const pending = pendingTaskCount(v.admissionId);
        const tone = critical ? 'critical' : pending > 0 ? 'attention' : 'stable';
        return { v, critical, pending, tone };
    }).sort((a, b) => {
        const order = { critical: 0, attention: 1, stable: 2 } as const;
        return order[a.tone as keyof typeof order] - order[b.tone as keyof typeof order];
    });

    const upcomingDischarges = myPatients.filter(v => v.dueToday || v.status === 'DISCHARGE_INITIATED');

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-md"><Stethoscope className="h-6 w-6 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">My Patients</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Your assigned in-patients across all wards · sorted by acuity.</p>
                    </div>
                </div>
                <select value={doctor} onChange={e => setDoctor(e.target.value)} className="h-10 text-sm border border-slate-200 rounded-md px-3 bg-white font-semibold">
                    {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            {/* Upcoming discharges */}
            {upcomingDischarges.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2"><LogOut className="h-4 w-4 text-amber-600" /><h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Upcoming Discharges</h2></div>
                    <div className="flex flex-wrap gap-2">
                        {upcomingDischarges.map(v => (
                            <button key={v.admissionId} onClick={() => onOpenAdmission(v.admissionId)} className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-semibold text-amber-800 hover:shadow-sm">
                                {v.patient.name} · {v.bed.bedCode} {v.status === 'DISCHARGE_INITIATED' ? '· discharging' : '· EDD today'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Patient cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {triaged.map(({ v, critical, pending, tone }) => (
                    <button key={v.admissionId} onClick={() => onOpenAdmission(v.admissionId)}
                        className={cn('text-left rounded-xl border-2 bg-white p-4 hover:shadow-md transition-all relative',
                            tone === 'critical' ? 'border-rose-300' : tone === 'attention' ? 'border-amber-200' : 'border-emerald-200')}>
                        <span className={cn('absolute top-0 left-0 h-full w-1.5 rounded-l-xl',
                            tone === 'critical' ? 'bg-rose-500' : tone === 'attention' ? 'bg-amber-400' : 'bg-emerald-500')} />
                        <div className="flex items-start justify-between pl-2">
                            <div>
                                <p className="font-bold text-slate-900">{v.patient.name}</p>
                                <p className="text-[11px] text-slate-500">{v.patient.age}{v.patient.sex} · {v.ward.wardCode} · {v.bed.bedCode}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-600 mt-2 pl-2 truncate">{v.icd ? `${v.icd.code} · ` : ''}{v.finalDiagnosis ?? v.provisionalDiagnosis}</p>
                        <div className="flex items-center gap-2 mt-3 pl-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] bg-slate-50">Day {v.lengthOfStayDays}</Badge>
                            {critical && <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200"><AlertCircle className="h-3 w-3 mr-0.5" /> Critical vitals</Badge>}
                            {!critical && pending > 0 && <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-0.5" /> {pending} task{pending > 1 ? 's' : ''} due</Badge>}
                            {!critical && pending === 0 && <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Stable</Badge>}
                        </div>
                    </button>
                ))}
                {triaged.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
                        No patients assigned to {doctor}.
                    </div>
                )}
            </div>
        </div>
    );
};
