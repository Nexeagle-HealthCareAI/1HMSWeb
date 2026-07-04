import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, BedDouble, Pill, LogOut, ArrowLeftRight, Check, Loader2, X, FlaskConical, Scissors, Utensils, HeartPulse, Scan,
    ClipboardList, ClipboardCheck, Activity, Droplets, Droplet, ShieldAlert, ListChecks, ShieldOff, FileText, MessageSquareText, FileCheck2, Siren,
    AlertTriangle, FileBadge2,
} from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { isAboveEntitlement } from '../utils/roomEntitlement';
import { AdmissionDetailsPanel } from '../components/AdmissionDetailsPanel';
import { ClinicalOrderPanel } from '../components/ClinicalOrderPanel';
import { MarPanel } from '../components/MarPanel';
import { VitalsPanel } from '../components/VitalsPanel';
import { IntakeOutputPanel } from '../components/IntakeOutputPanel';
import { GlucoseChartPanel } from '../components/GlucoseChartPanel';
import { NursingAssessmentPanel } from '../components/NursingAssessmentPanel';
import { NursingCarePlanPanel } from '../components/NursingCarePlanPanel';
import { RestraintPanel } from '../components/RestraintPanel';
import { RoundNotePanel } from '../components/RoundNotePanel';
import { ShiftHandoverPanel } from '../components/ShiftHandoverPanel';
import { ConsentPanel } from '../components/ConsentPanel';
import { DischargeSummaryPanel } from '../components/DischargeSummaryPanel';
import { BloodBankPanel } from '../components/BloodBankPanel';
import { SurgeryCasePanel } from '../components/SurgeryCasePanel';
import { IcuCriticalCarePanel } from '../components/IcuCriticalCarePanel';
import { formatIstDateTime } from '../utils/istDate';

const ACTIVE_STATUSES = ['PRE_ADMIT', 'ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED'];

type Section = 'overview' | 'admissionDetails' | 'cpoe' | 'mar' | 'nursing' | 'roundNotes' | 'sbarHandover' | 'consent' | 'bloodBank' | 'surgery' | 'criticalCare' | 'discharge';
type CpoeTab = 'medications' | 'lab' | 'procedures' | 'dietNursing' | 'radiology';
type NursingTab = 'vitals' | 'intakeOutput' | 'assessment' | 'carePlan' | 'restraint';

const CPOE_TABS: { key: CpoeTab; label: string; icon: React.ElementType }[] = [
    { key: 'medications', label: 'Medications', icon: Pill },
    { key: 'lab', label: 'Lab', icon: FlaskConical },
    { key: 'procedures', label: 'Procedures', icon: Scissors },
    { key: 'dietNursing', label: 'Diet & Nursing', icon: Utensils },
    { key: 'radiology', label: 'Radiology', icon: Scan },
];

const NURSING_TABS: { key: NursingTab; label: string; icon: React.ElementType }[] = [
    { key: 'vitals', label: 'Vitals', icon: Activity },
    { key: 'intakeOutput', label: 'I/O & Glucose', icon: Droplets },
    { key: 'assessment', label: 'Assessment', icon: ShieldAlert },
    { key: 'carePlan', label: 'Care Plan', icon: ListChecks },
    { key: 'restraint', label: 'Restraint', icon: ShieldOff },
];

interface Props {
    admission: ActiveAdmissionItem;
    onBack: () => void;
    onChanged: () => void;
}

/**
 * Real per-admission workspace — bed, CPOE orders, MAR, nursing documentation, and discharge all
 * in one place. Two-level side nav: Overview (leaf) / CPOE (parent, 5 order-type children) / MAR
 * (leaf) / Nursing (parent, Vitals+I-O&Glucose+Assessment+Care Plan+Restraint children) / Round
 * Notes (leaf) / SBAR Handover (leaf) / Consent (leaf) — see patient_workspace_navigation memory
 * for the IA rule this follows (new top-level clinical sections get their own sidebar item; only
 * genuinely-same-concept things nest under an existing parent). Each order-type view renders the
 * shared ClinicalOrderPanel rather than duplicating order-list/new-order/discontinue UI per type.
 * Read-only for bed/order/nursing actions once the admission is no longer in an Active status.
 */
export const PatientWorkspace: React.FC<Props> = ({ admission, onBack, onChanged }) => {
    const { toast } = useToast();
    const [current, setCurrent] = useState<ActiveAdmissionItem>(admission);
    const [activeSection, setActiveSection] = useState<Section>('overview');
    const [activeCpoeTab, setActiveCpoeTab] = useState<CpoeTab>('medications');
    const [dietNursingSubTab, setDietNursingSubTab] = useState<'diet' | 'nursing'>('diet');
    const [activeNursingTab, setActiveNursingTab] = useState<NursingTab>('vitals');
    const isActive = ACTIVE_STATUSES.includes(current.statusCode);

    const [freeBeds, setFreeBeds] = useState<BedBoardItem[]>([]);
    const [bedActionMode, setBedActionMode] = useState<'assign' | 'transfer' | null>(null);
    const [pickedBedId, setPickedBedId] = useState('');
    const [bedBusy, setBedBusy] = useState(false);

    const refreshAdmission = async () => {
        try {
            const list = await admissionApi.getActiveAdmissions('ALL');
            const found = list.find(a => a.admissionId === admission.admissionId);
            if (found) setCurrent(found);
        } catch { /* keep last known state on failure */ }
    };

    const loadFreeBeds = () => {
        bedBoardApi.getBoard().then(beds => setFreeBeds(beds.filter(b => b.isActive && !b.admissionId))).catch(() => setFreeBeds([]));
    };

    useEffect(() => {
        refreshAdmission();
        loadFreeBeds();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshAfterAction = () => {
        refreshAdmission();
        loadFreeBeds();
        onChanged();
    };

    // ── Bed actions ──────────────────────────────────────────────────────────
    const runBedAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setBedBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            setBedActionMode(null);
            setPickedBedId('');
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBedBusy(false);
        }
    };

    const releaseBed = async () => {
        setBedBusy(true);
        try {
            await bedBoardApi.releaseBed(current.admissionId);
            toast({ title: 'Bed released.' });
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBedBusy(false);
        }
    };

    const navItemClass = (isCurrent: boolean, extra?: string) => cn(
        'w-full h-10 px-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
        isCurrent ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
        extra,
    );
    const subNavItemClass = (isCurrent: boolean) => cn(
        'w-full h-9 pl-3 pr-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2',
        isCurrent ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
    );

    return (
        <div className="px-6 py-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-11 w-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow">
                        {(current.patientName || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-black text-slate-900">{current.patientName || current.patientId}</h1>
                            <Badge variant="outline" className={cn('text-[10px] font-bold', isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600')}>
                                {current.statusCode}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                            {current.patientId}{current.patientAge != null ? ` · ${current.patientAge}${current.patientSex ?? ''}` : ''} · {current.admissionNo} · {current.admissionType ?? '—'} · {current.payerType}
                        </p>
                    </div>
                </div>
            </div>

            {/* Side nav + content */}
            <div className="flex items-start gap-5">
                <aside className="w-60 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm p-2 space-y-0.5 sticky top-6">
                    <button type="button" onClick={() => setActiveSection('overview')} className={navItemClass(activeSection === 'overview')}>
                        <BedDouble className="h-4 w-4" /> Overview
                    </button>

                    <button type="button" onClick={() => setActiveSection('admissionDetails')} className={navItemClass(activeSection === 'admissionDetails')}>
                        <FileBadge2 className="h-4 w-4" /> Admission Details
                    </button>

                    <button type="button" onClick={() => setActiveSection('cpoe')} className={navItemClass(activeSection === 'cpoe')}>
                        <ClipboardList className="h-4 w-4" /> CPOE
                    </button>
                    {activeSection === 'cpoe' && (
                        <div className="pl-2 space-y-0.5">
                            {CPOE_TABS.map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onClick={() => setActiveCpoeTab(key)} className={subNavItemClass(activeCpoeTab === key)}>
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button type="button" onClick={() => setActiveSection('mar')} className={navItemClass(activeSection === 'mar')}>
                        <ClipboardCheck className="h-4 w-4" /> MAR
                    </button>

                    <button type="button" onClick={() => setActiveSection('nursing')} className={navItemClass(activeSection === 'nursing')}>
                        <HeartPulse className="h-4 w-4" /> Nursing
                    </button>
                    {activeSection === 'nursing' && (
                        <div className="pl-2 space-y-0.5">
                            {NURSING_TABS.map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onClick={() => setActiveNursingTab(key)} className={subNavItemClass(activeNursingTab === key)}>
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button type="button" onClick={() => setActiveSection('roundNotes')} className={navItemClass(activeSection === 'roundNotes')}>
                        <FileText className="h-4 w-4" /> Round Notes
                    </button>

                    <button type="button" onClick={() => setActiveSection('sbarHandover')} className={navItemClass(activeSection === 'sbarHandover')}>
                        <MessageSquareText className="h-4 w-4" /> SBAR Handover
                    </button>

                    <button type="button" onClick={() => setActiveSection('consent')} className={navItemClass(activeSection === 'consent')}>
                        <FileCheck2 className="h-4 w-4" /> Consent
                    </button>

                    <button type="button" onClick={() => setActiveSection('bloodBank')} className={navItemClass(activeSection === 'bloodBank')}>
                        <Droplet className="h-4 w-4" /> Blood Bank
                    </button>

                    <button type="button" onClick={() => setActiveSection('surgery')} className={navItemClass(activeSection === 'surgery')}>
                        <Scissors className="h-4 w-4" /> Surgery
                    </button>

                    <button type="button" onClick={() => setActiveSection('criticalCare')} className={navItemClass(activeSection === 'criticalCare')}>
                        <Siren className="h-4 w-4" /> Critical Care
                    </button>

                    {/* Always visible, unlike every other section — staff need to reopen a signed
                        summary and re-download the PDF after the admission has already closed. */}
                    <button type="button" onClick={() => setActiveSection('discharge')} className={navItemClass(activeSection === 'discharge')}>
                        <LogOut className="h-4 w-4" /> Discharge
                    </button>
                </aside>

                <div className="flex-1 min-w-0 space-y-5">
                    {activeSection === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Bed</h2>
                                {current.bedCode ? (
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <p className="font-semibold text-slate-900">{current.wardName ? `${current.wardName} · ` : ''}{current.bedCode}</p>
                                        {isActive && (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" className="h-9" onClick={() => { setBedActionMode('transfer'); setPickedBedId(''); }}>
                                                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Transfer
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-9 text-slate-500 hover:text-rose-600" onClick={releaseBed} disabled={bedBusy}>
                                                    <X className="h-3.5 w-3.5 mr-1.5" /> Release
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <p className="text-amber-600 font-semibold text-sm">{isActive ? 'Unassigned' : 'No bed'}</p>
                                        {isActive && (
                                            <Button variant="outline" size="sm" className="h-9" onClick={() => { setBedActionMode('assign'); setPickedBedId(''); }}>
                                                <BedDouble className="h-3.5 w-3.5 mr-1.5" /> Assign a bed
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {bedActionMode && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-end gap-2 flex-wrap">
                                        <div className="flex-1 min-w-[220px]">
                                            <Label className="text-[11px] font-semibold text-slate-600">{bedActionMode === 'assign' ? 'Bed to assign' : 'New bed'}</Label>
                                            <select value={pickedBedId} onChange={e => setPickedBedId(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                                <option value="">Select a bed…</option>
                                                {freeBeds.map(b => (
                                                    <option key={b.bedId} value={b.bedId}>{(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                                ))}
                                            </select>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-9" onClick={() => setBedActionMode(null)}>Cancel</Button>
                                        <Button size="sm" disabled={!pickedBedId || bedBusy} className="h-9 bg-brand-600 hover:bg-brand-700"
                                            onClick={() => runBedAction(
                                                () => bedActionMode === 'assign'
                                                    ? bedBoardApi.assignBed(current.admissionId, pickedBedId)
                                                    : bedBoardApi.transferBed(current.admissionId, pickedBedId),
                                                bedActionMode === 'assign' ? 'Bed assigned.' : 'Bed transferred.')}>
                                            {bedBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                            {bedActionMode === 'assign' ? 'Assign' : 'Transfer'}
                                        </Button>
                                        {isAboveEntitlement(freeBeds.find(b => b.bedId === pickedBedId)?.wardType, current.entitledRoomCategory) && (
                                            <div className="w-full flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                                <p className="text-[11px] text-amber-800">
                                                    Patient is entitled to <span className="font-semibold">{current.entitledRoomCategory?.replace('_', ' ')}</span> — this bed is above that. The differential will show as non-payable at discharge unless the patient/family accepts the upgrade.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Admission details</h2>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admitted</dt><dd className="text-slate-800">{formatIstDateTime(current.admittedAt)}</dd></div>
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</dt><dd className="text-slate-800">{current.admissionType ?? '—'}</dd></div>
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payer</dt><dd className="text-slate-800">{current.payerType}</dd></div>
                                </dl>
                                {(current.admissionReason || current.diagnosis) && (
                                    <p className="text-sm text-slate-700 mt-3">{current.diagnosis || current.admissionReason}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'admissionDetails' && (
                        <AdmissionDetailsPanel admission={current} isActive={isActive} onUpdated={refreshAfterAction} />
                    )}

                    {activeSection === 'cpoe' && activeCpoeTab === 'medications' && (
                        <ClinicalOrderPanel
                            admissionId={current.admissionId}
                            isActive={isActive}
                            orderType="MEDICATION"
                            itemPickerCategoryCodes={['PHARMACY']}
                            itemLabel="Drug name"
                            noItemsText="No medication orders yet."
                            showMedicationFields
                        />
                    )}

                    {activeSection === 'cpoe' && activeCpoeTab === 'lab' && (
                        <ClinicalOrderPanel
                            admissionId={current.admissionId}
                            isActive={isActive}
                            orderType="LAB"
                            itemPickerCategoryCodes={['LAB']}
                            itemLabel="Test"
                            noItemsText="No lab orders yet."
                            showUrgency
                        />
                    )}

                    {activeSection === 'cpoe' && activeCpoeTab === 'procedures' && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveSection('consent')}>
                                    <FileCheck2 className="h-3.5 w-3.5 mr-1.5" /> Capture consent
                                </Button>
                            </div>
                            <ClinicalOrderPanel
                                admissionId={current.admissionId}
                                isActive={isActive}
                                orderType="PROCEDURE"
                                itemPickerCategoryCodes={['PROCEDURE']}
                                itemLabel="Procedure"
                                noItemsText="No procedure orders yet."
                                showUrgency
                                showScheduledAt
                            />
                        </div>
                    )}

                    {activeSection === 'cpoe' && activeCpoeTab === 'dietNursing' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 w-fit">
                                <button type="button" onClick={() => setDietNursingSubTab('diet')}
                                    className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', dietNursingSubTab === 'diet' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                    <Utensils className="h-3.5 w-3.5" /> Diet
                                </button>
                                <button type="button" onClick={() => setDietNursingSubTab('nursing')}
                                    className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', dietNursingSubTab === 'nursing' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                    <HeartPulse className="h-3.5 w-3.5" /> Nursing
                                </button>
                            </div>
                            {/* Most diet/nursing orders are free-text with no ChargeMaster link — nursing
                                care and standard diets are usually bundled into the room charge already. */}
                            {dietNursingSubTab === 'diet' ? (
                                <ClinicalOrderPanel
                                    admissionId={current.admissionId}
                                    isActive={isActive}
                                    orderType="DIET"
                                    itemPickerCategoryCodes={['DIET']}
                                    itemLabel="Diet"
                                    noItemsText="No diet orders yet."
                                />
                            ) : (
                                <ClinicalOrderPanel
                                    admissionId={current.admissionId}
                                    isActive={isActive}
                                    orderType="NURSING"
                                    itemPickerCategoryCodes={['NURSING']}
                                    itemLabel="Nursing instruction"
                                    noItemsText="No nursing orders yet."
                                />
                            )}
                        </div>
                    )}

                    {/* Radiology fulfillment (modality worklist, DICOM, reporting) is explicitly out of
                        EasyHMS scope -- lives in an external radiology system (see scope_decisions). This
                        view is order-placement + charge-on-event only, same as every other type here. */}
                    {activeSection === 'cpoe' && activeCpoeTab === 'radiology' && (
                        <ClinicalOrderPanel
                            admissionId={current.admissionId}
                            isActive={isActive}
                            orderType="RADIOLOGY"
                            itemPickerCategoryCodes={['RAD', 'RADIOLOGY']}
                            itemLabel="Study"
                            noItemsText="No radiology orders yet."
                            showUrgency
                        />
                    )}

                    {activeSection === 'mar' && (
                        <MarPanel admissionId={current.admissionId} isActive={isActive} patientName={current.patientName} />
                    )}

                    {activeSection === 'nursing' && activeNursingTab === 'vitals' && (
                        <VitalsPanel admissionId={current.admissionId} isActive={isActive} />
                    )}
                    {activeSection === 'nursing' && activeNursingTab === 'intakeOutput' && (
                        <div className="space-y-5">
                            <IntakeOutputPanel admissionId={current.admissionId} isActive={isActive} />
                            <GlucoseChartPanel admissionId={current.admissionId} isActive={isActive} />
                        </div>
                    )}
                    {activeSection === 'nursing' && activeNursingTab === 'assessment' && (
                        <NursingAssessmentPanel admissionId={current.admissionId} isActive={isActive} />
                    )}
                    {activeSection === 'nursing' && activeNursingTab === 'carePlan' && (
                        <NursingCarePlanPanel admissionId={current.admissionId} isActive={isActive} />
                    )}
                    {activeSection === 'nursing' && activeNursingTab === 'restraint' && (
                        <RestraintPanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'roundNotes' && (
                        <RoundNotePanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'sbarHandover' && (
                        <ShiftHandoverPanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'consent' && (
                        <ConsentPanel admissionId={current.admissionId} isActive={isActive} prefilterTypeCode="PROCEDURE" />
                    )}

                    {activeSection === 'bloodBank' && (
                        <BloodBankPanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'surgery' && (
                        <SurgeryCasePanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'criticalCare' && (
                        <IcuCriticalCarePanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'discharge' && (
                        <DischargeSummaryPanel admission={current} isActive={isActive} onDischarged={refreshAfterAction} />
                    )}
                </div>
            </div>
        </div>
    );
};
