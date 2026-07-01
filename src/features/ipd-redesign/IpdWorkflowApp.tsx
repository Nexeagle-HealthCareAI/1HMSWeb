import React, { useState } from 'react';
import { IpdDashboard } from './screens/IpdDashboard';
import { PatientWorkspace } from './screens/PatientWorkspace';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { DischargeFlow } from './screens/DischargeFlow';
import { BedBoardScreen } from './screens/BedBoardScreen';

type View =
    | { name: 'dashboard' }
    | { name: 'workspace'; admissionId: string }
    | { name: 'bedboard' };

/**
 * IPD workspace. Role-based persona screens (Reception / Doctor / Nurse) were removed —
 * IPD is a single unified workspace now. Access is governed by the session/permissions.
 */
export const IpdWorkflowApp: React.FC = () => {
    const [view, setView] = useState<View>({ name: 'dashboard' });
    const [admitOpen, setAdmitOpen] = useState(false);
    const [dischargeFor, setDischargeFor] = useState<string | null>(null);

    const openAdmission = (id: string) => setView({ name: 'workspace', admissionId: id });

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            {view.name === 'dashboard' && (
                <IpdDashboard
                    onOpenAdmission={openAdmission}
                    onAdmit={() => setAdmitOpen(true)}
                    onOpenBedBoard={() => setView({ name: 'bedboard' })}
                />
            )}

            {view.name === 'bedboard' && (
                <BedBoardScreen onBack={() => setView({ name: 'dashboard' })} />
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
                onAdmitted={() => { setAdmitOpen(false); setView({ name: 'dashboard' }); }}
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
