import React, { useState } from 'react';
import { IpdDashboard } from './screens/IpdDashboard';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { BedBoardScreen } from './screens/BedBoardScreen';
import { CssdBoardScreen } from './screens/CssdBoardScreen';
import { IpdKpiDashboardScreen } from './screens/IpdKpiDashboardScreen';
import { ConsultantLedgerScreen } from './screens/ConsultantLedgerScreen';
import { InventoryBoardScreen } from './screens/InventoryBoardScreen';
import { PatientWorkspace } from './screens/PatientWorkspace';
import type { ActiveAdmissionItem } from './services/admissionApi';

type View =
    | { name: 'dashboard' }
    | { name: 'bedboard' }
    | { name: 'cssdboard' }
    | { name: 'kpidashboard' }
    | { name: 'consultantledger' }
    | { name: 'inventoryboard' }
    | { name: 'workspace'; admission: ActiveAdmissionItem };

/**
 * IPD workspace — real screens backed entirely by the API: the dashboard (admissions list with
 * a status filter), the live Bed Board, and the per-admission Patient Workspace (bed, medication
 * orders, discharge — everything about one patient's stay in one place, opened by clicking a
 * row). The old mock DischargeFlow (and the earlier Reception/Doctor/Nurse persona screens) are
 * no longer routed from here — they were a backend-agnostic prototype that predates the real
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
                    onOpenCssdBoard={() => setView({ name: 'cssdboard' })}
                    onOpenKpiDashboard={() => setView({ name: 'kpidashboard' })}
                    onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
                    onOpenInventoryBoard={() => setView({ name: 'inventoryboard' })}
                    onOpenWorkspace={(admission) => setView({ name: 'workspace', admission })}
                    refreshSignal={refreshTick}
                />
            )}

            {view.name === 'bedboard' && (
                <BedBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'cssdboard' && (
                <CssdBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'kpidashboard' && (
                <IpdKpiDashboardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'consultantledger' && (
                <ConsultantLedgerScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'inventoryboard' && (
                <InventoryBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'workspace' && (
                <PatientWorkspace
                    admission={view.admission}
                    onBack={() => setView({ name: 'dashboard' })}
                    onChanged={() => setRefreshTick(t => t + 1)}
                />
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
