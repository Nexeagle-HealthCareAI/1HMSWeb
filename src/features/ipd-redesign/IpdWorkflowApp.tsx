import React, { useState } from 'react';
import { IpdDashboard } from './screens/IpdDashboard';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { BedBoardScreen } from './screens/BedBoardScreen';
import { MedicationOrdersScreen } from './screens/MedicationOrdersScreen';
import type { ActiveAdmissionItem } from './services/admissionApi';

type View =
    | { name: 'dashboard' }
    | { name: 'bedboard' }
    | { name: 'medorders'; admission: ActiveAdmissionItem };

/**
 * IPD workspace — real screens backed entirely by the API: the dashboard (admitted-patient
 * list), the live Bed Board, and per-admission Medication Orders (CPOE). The old mock
 * PatientWorkspace/DischargeFlow (and the earlier Reception/Doctor/Nurse persona screens) are no
 * longer routed from here — they were a backend-agnostic prototype that predates the real
 * admission/bed-board wiring. Left as unrouted files rather than deleted, same treatment as the
 * persona screens before them.
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
                    onOpenMedicationOrders={(admission) => setView({ name: 'medorders', admission })}
                    refreshSignal={refreshTick}
                />
            )}

            {view.name === 'bedboard' && (
                <BedBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'medorders' && (
                <MedicationOrdersScreen admission={view.admission} onBack={() => setView({ name: 'dashboard' })} />
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
