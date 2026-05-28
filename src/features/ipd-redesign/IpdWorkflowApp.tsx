import React, { useState } from 'react';
import { Stethoscope, HeartPulse, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IpdDashboard } from './screens/IpdDashboard';
import { DoctorDashboard } from './screens/DoctorDashboard';
import { NurseDashboard } from './screens/NurseDashboard';
import { PatientWorkspace } from './screens/PatientWorkspace';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { DischargeFlow } from './screens/DischargeFlow';
import { IncentivesScreen } from './screens/IncentivesScreen';
import type { UserRole } from './types';

type View =
    | { name: 'dashboard' }
    | { name: 'workspace'; admissionId: string }
    | { name: 'incentives' };

const ROLES: { id: UserRole; label: string; icon: React.ReactNode }[] = [
    { id: 'RECEPTION', label: 'Reception / Admin', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'DOCTOR', label: 'Doctor', icon: <Stethoscope className="h-4 w-4" /> },
    { id: 'NURSE', label: 'Nurse', icon: <HeartPulse className="h-4 w-4" /> },
];

/**
 * Self-contained IPD workflow prototype (UI/UX-first, mock data).
 * Role is a prototype-level switcher (top-right) so you can preview each persona's
 * landing screen without auth. In the real app the role comes from the session.
 */
export const IpdWorkflowApp: React.FC = () => {
    const [role, setRole] = useState<UserRole>('RECEPTION');
    const [view, setView] = useState<View>({ name: 'dashboard' });
    const [admitOpen, setAdmitOpen] = useState(false);
    const [dischargeFor, setDischargeFor] = useState<string | null>(null);

    const openAdmission = (id: string) => setView({ name: 'workspace', admissionId: id });

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            {/* Prototype role switcher */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between sticky top-0 z-30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IPD Prototype · viewing as</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                    {ROLES.map(r => (
                        <button key={r.id} type="button" onClick={() => { setRole(r.id); setView({ name: 'dashboard' }); }}
                            className={cn('h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5',
                                role === r.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            {r.icon}{r.label}
                        </button>
                    ))}
                </div>
            </div>

            {view.name === 'dashboard' && role === 'RECEPTION' && (
                <IpdDashboard onOpenAdmission={openAdmission} onAdmit={() => setAdmitOpen(true)} onOpenIncentives={() => setView({ name: 'incentives' })} />
            )}

            {view.name === 'incentives' && (
                <IncentivesScreen onBack={() => setView({ name: 'dashboard' })} />
            )}
            {view.name === 'dashboard' && role === 'DOCTOR' && (
                <DoctorDashboard onOpenAdmission={openAdmission} />
            )}
            {view.name === 'dashboard' && role === 'NURSE' && (
                <NurseDashboard onOpenAdmission={openAdmission} />
            )}

            {view.name === 'workspace' && (
                <PatientWorkspace
                    admissionId={view.admissionId}
                    onBack={() => setView({ name: 'dashboard' })}
                    onDischarge={() => setDischargeFor(view.admissionId)}
                />
            )}

            <AdmitPatientSheet
                open={admitOpen}
                onOpenChange={setAdmitOpen}
                onAdmitted={(admissionId) => { setAdmitOpen(false); openAdmission(admissionId); }}
            />

            <DischargeFlow
                admissionId={dischargeFor}
                onClose={() => setDischargeFor(null)}
                onDischarged={() => { setDischargeFor(null); setView({ name: 'dashboard' }); }}
            />
        </div>
    );
};

export default IpdWorkflowApp;
