import React, { useState } from 'react';
import { IpdDashboard } from './screens/IpdDashboard';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { BedBoardScreen } from './screens/BedBoardScreen';

type View =
    | { name: 'dashboard' }
    | { name: 'bedboard' };

/**
 * IPD workspace — two real screens: the dashboard (admitted-patient list) and the live Bed Board
 * (its own screen, kept separate so it can stay a focused, animated visual board rather than a
 * secondary widget on the dashboard). The old mock PatientWorkspace/DischargeFlow (and the
 * earlier Reception/Doctor/Nurse persona screens) are no longer routed from here — they were a
 * backend-agnostic prototype that predates the real admission/bed-board wiring. Left as
 * unrouted files rather than deleted, same treatment as the persona screens before them.
 */
export const IpdWorkflowApp: React.FC = () => {
    const [view, setView] = useState<View>({ name: 'dashboard' });
    const [admitOpen, setAdmitOpen] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            {view.name === 'dashboard' && (
                <IpdDashboard
                    onAdmit={() => setAdmitOpen(true)}
                    onOpenBedBoard={() => setView({ name: 'bedboard' })}
                    refreshSignal={refreshTick}
                />
            )}

            {view.name === 'bedboard' && (
                <BedBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            <AdmitPatientSheet
                open={admitOpen}
                onOpenChange={setAdmitOpen}
                onAdmitted={() => { setAdmitOpen(false); setView({ name: 'dashboard' }); setRefreshTick(t => t + 1); }}
            />
        </div>
    );
};

export default IpdWorkflowApp;
