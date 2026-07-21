import React, { useState } from 'react';
import { IpdDashboard } from './screens/IpdDashboard';
import { AdmitPatientSheet } from './screens/AdmitPatientSheet';
import { BedBoardScreen } from './screens/BedBoardScreen';
import { CssdBoardScreen } from './screens/CssdBoardScreen';
import { IpdKpiDashboardScreen } from './screens/IpdKpiDashboardScreen';
import { ConsultantLedgerScreen } from './screens/ConsultantLedgerScreen';
import { ReferredAdmissionBoard } from './screens/ReferredAdmissionBoard';
import { PatientWorkspace } from './screens/PatientWorkspace';
import type { ActiveAdmissionItem } from './services/admissionApi';
import type { AdmissionReferralItem } from './services/admissionReferralApi';

type View =
    | { name: 'dashboard' }
    | { name: 'bedboard' }
    | { name: 'cssdboard' }
    | { name: 'kpidashboard' }
    | { name: 'consultantledger' }
    | { name: 'referredadmissions' }
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
    // Set when "Admit" is clicked from a Referred Admissions row — threaded into AdmitPatientSheet
    // so it opens pre-filled with that referral's patient/doctor/plan.
    const [admitReferralContext, setAdmitReferralContext] = useState<AdmissionReferralItem | null>(null);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            {view.name === 'dashboard' && (
                <IpdDashboard
                    onAdmit={() => setAdmitOpen(true)}
                    onOpenBedBoard={() => setView({ name: 'bedboard' })}
                    onOpenCssdBoard={() => setView({ name: 'cssdboard' })}
                    onOpenKpiDashboard={() => setView({ name: 'kpidashboard' })}
                    onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
                    onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
                    onOpenWorkspace={(admission) => setView({ name: 'workspace', admission })}
                    refreshSignal={refreshTick}
                />
            )}

            {view.name === 'referredadmissions' && (
                <ReferredAdmissionBoard
                    onBack={() => setView({ name: 'dashboard' })}
                    onAdmitReferral={(referral) => { setAdmitReferralContext(referral); setAdmitOpen(true); }}
                    onOpenDashboard={() => setView({ name: 'dashboard' })}
                    onOpenBedBoard={() => setView({ name: 'bedboard' })}
                    onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
                />
            )}

            {view.name === 'bedboard' && (
                <BedBoardScreen 
                    onBack={() => setView({ name: 'dashboard' })} 
                    onOpenDashboard={() => setView({ name: 'dashboard' })}
                    onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
                    onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
                />
            )}

            {view.name === 'cssdboard' && (
                <CssdBoardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'kpidashboard' && (
                <IpdKpiDashboardScreen onBack={() => setView({ name: 'dashboard' })} />
            )}

            {view.name === 'consultantledger' && (
                <ConsultantLedgerScreen 
                    onBack={() => setView({ name: 'dashboard' })} 
                    onOpenDashboard={() => setView({ name: 'dashboard' })}
                    onOpenBedBoard={() => setView({ name: 'bedboard' })}
                    onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
                />
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
                onOpenChange={(open) => { setAdmitOpen(open); if (!open) setAdmitReferralContext(null); }}
                onAdmitted={() => { setAdmitOpen(false); setAdmitReferralContext(null); setView({ name: 'dashboard' }); setRefreshTick(t => t + 1); }}
                initialPatientId={admitReferralContext?.patientId}
                initialDoctorId={admitReferralContext?.referringDoctorId}
                initialOtPlanId={admitReferralContext?.otPlanId}
                referralId={admitReferralContext?.referralId}
            />
        </div>
    );
};

export default IpdWorkflowApp;
