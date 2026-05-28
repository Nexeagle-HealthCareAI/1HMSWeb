import React, { useMemo, useState } from 'react';
import { HeartPulse, Activity, Pill, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useIpdStore } from '../store';

type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';
const SHIFTS: Shift[] = ['MORNING', 'AFTERNOON', 'NIGHT'];

interface Props { onOpenAdmission: (admissionId: string) => void; }

export const NurseDashboard: React.FC<Props> = ({ onOpenAdmission }) => {
    const wards = useIpdStore(s => s.wards);
    const admissionViews = useIpdStore(s => s.admissionViews);
    const medications = useIpdStore(s => s.medications);
    const vitals = useIpdStore(s => s.vitals);
    const [wardId, setWardId] = useState(wards[0]?.wardId ?? '');
    const [shift, setShift] = useState<Shift>('MORNING');

    const wardPatients = useMemo(
        () => admissionViews().filter(v => v.wardId === wardId),
        [admissionViews, wardId]
    );

    const taskRows = wardPatients.map(v => {
        const meds = medications.filter(m => m.admissionId === v.admissionId);
        const medsDue = meds.filter(m => m.status === 'DUE').length;
        const medsOverdue = meds.filter(m => m.status === 'DUE' && new Date(m.scheduledAt).getTime() < Date.now()).length;
        const lastVital = vitals.filter(x => x.admissionId === v.admissionId).slice(-1)[0];
        const vitalsStaleHrs = lastVital ? Math.round((Date.now() - new Date(lastVital.recordedAt).getTime()) / 3600_000) : 99;
        const vitalsDue = vitalsStaleHrs >= 4; // general ward = 4-hourly
        return { v, medsDue, medsOverdue, vitalsDue, vitalsStaleHrs };
    }).sort((a, b) => (b.medsOverdue + (b.vitalsDue ? 1 : 0)) - (a.medsOverdue + (a.vitalsDue ? 1 : 0)));

    const totalDue = taskRows.reduce((t, r) => t + r.medsDue + (r.vitalsDue ? 1 : 0), 0);
    const totalOverdue = taskRows.reduce((t, r) => t + r.medsOverdue, 0);

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-md"><HeartPulse className="h-6 w-6 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Ward Worklist</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Tasks due this shift for your ward · vitals & medications.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select value={wardId} onChange={e => setWardId(e.target.value)} className="h-10 text-sm border border-slate-200 rounded-md px-3 bg-white font-semibold">
                        {wards.map(w => <option key={w.wardId} value={w.wardId}>{w.wardName}</option>)}
                    </select>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {SHIFTS.map(s => (
                            <button key={s} onClick={() => setShift(s)} className={cn('h-8 px-3 rounded-md text-xs font-semibold', shift === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{s[0] + s.slice(1).toLowerCase()}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shift summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Patients</p><p className="text-2xl font-black text-slate-900 mt-0.5">{wardPatients.length}</p></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Tasks due</p><p className="text-2xl font-black text-amber-900 mt-0.5">{totalDue}</p></div>
                <div className={cn('rounded-xl border p-4', totalOverdue > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50')}><p className={cn('text-[10px] font-bold uppercase tracking-widest', totalOverdue > 0 ? 'text-rose-700' : 'text-slate-400')}>Overdue</p><p className={cn('text-2xl font-black mt-0.5', totalOverdue > 0 ? 'text-rose-900' : 'text-slate-700')}>{totalOverdue}</p></div>
            </div>

            {/* Task list */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="text-left px-3 py-2.5 font-bold">Bed · Patient</th>
                            <th className="text-left px-3 py-2.5 font-bold">Diagnosis</th>
                            <th className="text-left px-3 py-2.5 font-bold">Vitals</th>
                            <th className="text-left px-3 py-2.5 font-bold">Medications</th>
                            <th className="w-px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskRows.map(({ v, medsDue, medsOverdue, vitalsDue, vitalsStaleHrs }) => (
                            <tr key={v.admissionId} className="border-t border-slate-100 hover:bg-rose-50/30 cursor-pointer" onClick={() => onOpenAdmission(v.admissionId)}>
                                <td className="px-3 py-2">
                                    <p className="font-semibold text-slate-900">{v.bed.bedCode} · {v.patient.name}</p>
                                    <p className="text-[11px] text-slate-500">{v.patient.age}{v.patient.sex}{v.patient.allergies?.length ? ' · ⚠ allergy' : ''}</p>
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px] truncate">{v.provisionalDiagnosis}</td>
                                <td className="px-3 py-2">
                                    {vitalsDue
                                        ? <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200"><Activity className="h-3 w-3 mr-0.5" /> Due ({vitalsStaleHrs}h ago)</Badge>
                                        : <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Up to date</Badge>}
                                </td>
                                <td className="px-3 py-2">
                                    {medsOverdue > 0
                                        ? <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200"><AlertTriangle className="h-3 w-3 mr-0.5" /> {medsOverdue} overdue</Badge>
                                        : medsDue > 0
                                            ? <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200"><Pill className="h-3 w-3 mr-0.5" /> {medsDue} due</Badge>
                                            : <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">None pending</Badge>}
                                </td>
                                <td className="px-2 py-2 text-right"><ChevronRight className="h-4 w-4 text-slate-300" /></td>
                            </tr>
                        ))}
                        {taskRows.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">No patients in this ward.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
