import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, BedDouble, Pill, LogOut, ArrowLeftRight, Check, Loader2, X, FlaskConical, Scissors, Utensils, HeartPulse, Scan,
    ClipboardList, ClipboardCheck, Activity, Droplets, Droplet, ShieldAlert, ListChecks, ShieldOff, FileText, MessageSquareText, FileCheck2, Siren,
    AlertTriangle, FileBadge2, Files, MoreHorizontal, Stethoscope,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem, type AdmissionDoctorHistoryItem, type AdmissionReferrerHistoryItem } from '../services/admissionApi';
import { ReferrerPicker, REFERRER_LABEL } from '../components/ReferrerPicker';
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
import { AdmissionDocumentsPanel } from '../components/AdmissionDocumentsPanel';
import { DeteriorationAlertBanner } from '../components/DeteriorationAlertBanner';
import { formatIstDateTime } from '../utils/istDate';
import { useWorkspaceOverview } from '../hooks/useWorkspaceOverview';
import { WorkspaceOverview } from '../components/WorkspaceOverview';
import { DISCHARGE_STAGE_LABELS, dayOfStay, dischargeStage } from '../utils/workspaceOverview';

const ACTIVE_STATUSES = ['PRE_ADMIT', 'ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED'];
const STATUS_LABEL: Record<string, string> = {
    PRE_ADMIT: 'Pre-admit — not arrived', ADMITTED: 'Admitted', DISCHARGE_INITIATED: 'Discharge started', DISCHARGE_BILLED: 'Bill settled',
    DISCHARGED: 'Discharged', LAMA: 'Left against advice', CANCELLED: 'Cancelled',
};

// The menu, grouped. Same sections as before; only the grouping and two plainer labels are new.
const NAV_GROUPS: { heading?: string; items: Section[] }[] = [
    { items: ['overview'] },
    { heading: 'Care', items: ['cpoe', 'mar', 'nursing', 'roundNotes', 'sbarHandover'] },
    { heading: 'Records', items: ['admissionDetails', 'consent', 'documents'] },
    { heading: 'Specialty', items: ['criticalCare', 'surgery', 'bloodBank'] },
    { heading: 'Finish', items: ['discharge'] },
];
// The sections used most on a phone get one-tap buttons; the rest stay in the full list.
const MOBILE_QUICK: Section[] = ['overview', 'cpoe', 'mar', 'nursing', 'roundNotes', 'discharge'];
const MOBILE_SHORT: Partial<Record<Section, string>> = { cpoe: 'Orders', mar: 'MAR', roundNotes: 'Notes' };

export type Section = 'overview' | 'admissionDetails' | 'cpoe' | 'mar' | 'nursing' | 'roundNotes' | 'sbarHandover' | 'consent' | 'documents' | 'bloodBank' | 'surgery' | 'criticalCare' | 'discharge';
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

// Drives the mobile section-picker sheet (see below) — a single source of truth for every
// top-level nav item's icon/label so the picker doesn't hand-duplicate the desktop sidebar's JSX.
const SECTION_LIST: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BedDouble },
    { key: 'admissionDetails', label: 'Admission Details', icon: FileBadge2 },
    { key: 'cpoe', label: 'Orders', icon: ClipboardList },
    { key: 'mar', label: 'MAR — medicines', icon: ClipboardCheck },
    { key: 'nursing', label: 'Nursing', icon: HeartPulse },
    { key: 'roundNotes', label: 'Round Notes', icon: FileText },
    { key: 'sbarHandover', label: 'SBAR Handover', icon: MessageSquareText },
    { key: 'consent', label: 'Consent', icon: FileCheck2 },
    { key: 'documents', label: 'Documents', icon: Files },
    { key: 'bloodBank', label: 'Blood Bank', icon: Droplet },
    { key: 'surgery', label: 'Surgery', icon: Scissors },
    { key: 'criticalCare', label: 'Critical Care', icon: Siren },
    { key: 'discharge', label: 'Discharge', icon: LogOut },
];

interface Props {
    admission: ActiveAdmissionItem;
    onBack: () => void;
    onChanged: () => void;
    // Opens directly into a given section instead of Overview -- used by the OT/ICU board deep
    // links (?tab=surgery / ?tab=criticalCare) so clicking a card lands straight on the relevant
    // tab instead of making the user navigate there manually.
    initialSection?: Section;
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
export const PatientWorkspace: React.FC<Props> = ({ admission, onBack, onChanged, initialSection }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const [current, setCurrent] = useState<ActiveAdmissionItem>(admission);
    const [activeSection, setActiveSection] = useState<Section>(initialSection ?? 'overview');
    const [activeCpoeTab, setActiveCpoeTab] = useState<CpoeTab>('medications');
    const [dietNursingSubTab, setDietNursingSubTab] = useState<'diet' | 'nursing'>('diet');
    const [activeNursingTab, setActiveNursingTab] = useState<NursingTab>('vitals');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const isActive = ACTIVE_STATUSES.includes(current.statusCode);

    // Overview data, also used for the menu's counts and the header's allergy chip.
    const overview = useWorkspaceOverview(current.admissionId, current.patientId, hospitalId);
    useEffect(() => { if (activeSection === 'overview') overview.reload(); }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps
    const stage = dischargeStage(current.statusCode);
    const dischargedAt = (current as { dischargedAt?: string | null }).dischargedAt;
    const navBadge = (key: Section): { text: string; warn: boolean } | null => {
        if (key === 'mar' && overview.dueCount > 0) return { text: `${overview.dueCount} due`, warn: true };
        if (key === 'cpoe' && overview.pendingInvestigations > 0) return { text: `${overview.pendingInvestigations} pending`, warn: false };
        if (key === 'discharge' && stage > 0) return { text: DISCHARGE_STAGE_LABELS[stage], warn: stage < 3 };
        if (key === 'discharge' && overview.dischargeDraft?.isSigned) return { text: 'Signed', warn: false };
        return null;
    };

    const currentSectionMeta = SECTION_LIST.find(s => s.key === activeSection)!;
    const currentSubLabel = activeSection === 'cpoe'
        ? CPOE_TABS.find(t => t.key === activeCpoeTab)?.label
        : activeSection === 'nursing'
            ? NURSING_TABS.find(t => t.key === activeNursingTab)?.label
            : undefined;

    const [freeBeds, setFreeBeds] = useState<BedBoardItem[]>([]);
    const [bedActionMode, setBedActionMode] = useState<'assign' | 'transfer' | null>(null);
    const [pickedBedId, setPickedBedId] = useState('');
    const [bedBusy, setBedBusy] = useState(false);

    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);
    const [doctorActionMode, setDoctorActionMode] = useState<'change' | null>(null);
    const [pickedDoctorId, setPickedDoctorId] = useState('');
    const [doctorBusy, setDoctorBusy] = useState(false);
    const [doctorHistoryOpen, setDoctorHistoryOpen] = useState(false);
    const [doctorHistory, setDoctorHistory] = useState<AdmissionDoctorHistoryItem[]>([]);
    const [doctorHistoryLoading, setDoctorHistoryLoading] = useState(false);

    const [referrerActionMode, setReferrerActionMode] = useState<'change' | null>(null);
    const [pickedReferralSource, setPickedReferralSource] = useState<'SELF' | 'DOCTOR' | 'OTHER'>('SELF');
    const [pickedReferrerId, setPickedReferrerId] = useState('');
    const [pickedReferrerName, setPickedReferrerName] = useState('');
    const [pickedReferrerType, setPickedReferrerType] = useState('');
    const [referrerBusy, setReferrerBusy] = useState(false);
    const [referrerHistoryOpen, setReferrerHistoryOpen] = useState(false);
    const [referrerHistory, setReferrerHistory] = useState<AdmissionReferrerHistoryItem[]>([]);
    const [referrerHistoryLoading, setReferrerHistoryLoading] = useState(false);

    const refreshAdmission = async () => {
        try {
            const list = await admissionApi.getActiveAdmissions('ALL');
            const found = list.find(a => a.admissionId === admission.admissionId);
            if (found) setCurrent(found);
        } catch { /* keep last known state on failure */ }
    };

    const loadFreeBeds = () => {
        bedBoardApi.getBoard().then(beds => setFreeBeds(beds.filter(b => b.isActive && !b.admissionId && (b.statusCode ?? 'AVAILABLE') === 'AVAILABLE'))).catch(() => setFreeBeds([]));
    };

    const loadDoctors = () => {
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
    };

    const loadDoctorHistory = () => {
        setDoctorHistoryLoading(true);
        admissionApi.getDoctorHistory(current.admissionId)
            .then(setDoctorHistory)
            .catch(() => setDoctorHistory([]))
            .finally(() => setDoctorHistoryLoading(false));
    };

    const loadReferrerHistory = () => {
        setReferrerHistoryLoading(true);
        admissionApi.getReferrerHistory(current.admissionId)
            .then(setReferrerHistory)
            .catch(() => setReferrerHistory([]))
            .finally(() => setReferrerHistoryLoading(false));
    };

    useEffect(() => {
        refreshAdmission();
        loadFreeBeds();
        loadDoctors();
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

    // ── Doctor actions ───────────────────────────────────────────────────────
    const runDoctorAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setDoctorBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            setDoctorActionMode(null);
            setPickedDoctorId('');
            refreshAfterAction();
            if (doctorHistoryOpen) loadDoctorHistory();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDoctorBusy(false);
        }
    };

    const toggleDoctorHistory = () => {
        setDoctorHistoryOpen(open => {
            const next = !open;
            if (next) loadDoctorHistory();
            return next;
        });
    };

    // ── Referrer actions ─────────────────────────────────────────────────────
    const runReferrerAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setReferrerBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            setReferrerActionMode(null);
            refreshAfterAction();
            if (referrerHistoryOpen) loadReferrerHistory();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReferrerBusy(false);
        }
    };

    const toggleReferrerHistory = () => {
        setReferrerHistoryOpen(open => {
            const next = !open;
            if (next) loadReferrerHistory();
            return next;
        });
    };

    const startChangeReferrer = () => {
        setReferrerActionMode('change');
        const source = current.referralSource === 'DOCTOR' || current.referralSource === 'OTHER' ? current.referralSource : 'SELF';
        setPickedReferralSource(source);
        setPickedReferrerId(source === 'SELF' ? '' : current.referredByReferrerId ?? '');
        setPickedReferrerName(source === 'SELF' ? '' : current.referralName ?? '');
        setPickedReferrerType('');
    };

    const releaseBed = async () => {
        if (isSubscriptionReadOnly) { blockAction('Releasing beds'); return; }
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

    // Desktop-sidebar-only now — the mobile equivalent lives in the SECTION_LIST-driven sheet
    // picker above (aside is `hidden` below lg), so these no longer need mobile-pill fallback styles.
    const navItemClass = (isCurrent: boolean, extra?: string) => cn(
        'group w-full min-h-10 px-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2.5 outline-none',
        isCurrent
            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5',
        extra,
    );

    const subNavItemClass = (isCurrent: boolean) => cn(
        'group relative w-full h-9 pl-4 pr-2.5 rounded-r-lg text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 outline-none border-l-2',
        isCurrent
            ? 'border-brand-500 bg-brand-50/50 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 hover:border-slate-300',
    );

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Patient banner: same brand gradient, one compact block. Who, where, how long, and the
                next step on the way out. */}
            <div className="relative rounded-3xl bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 px-4 py-3.5 sm:px-5 text-white shadow-lg shadow-brand-600/15">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <Button variant="outline" size="sm" aria-label="Back to roster" className="h-10 w-10 sm:w-auto p-0 sm:px-3.5 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shrink-0" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Roster</span>
                    </Button>

                    <div className="flex items-center gap-3 flex-1 min-w-0 sm:min-w-[15rem]">
                        <div className="hidden sm:flex h-11 w-11 rounded-full bg-white/15 items-center justify-center text-sm font-black shrink-0 border border-white/20">
                            {(current.patientName || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h1 className="text-base sm:text-xl font-extrabold capitalize tracking-tight truncate max-w-[70vw] sm:max-w-md mr-1">
                                    {current.patientName || current.patientId}
                                </h1>
                                {(current.patientAge != null || current.patientSex) && (
                                    <span className="text-[11px] font-bold bg-white/15 px-2 py-0.5 rounded-full">{[current.patientAge, current.patientSex].filter(v => v != null && v !== '').join(' ')}</span>
                                )}
                                <span className="text-[11px] font-bold bg-white text-brand-700 px-2 py-0.5 rounded-full">
                                    {current.bedCode ? current.bedCode : isActive ? 'No bed yet' : 'No bed'} · Day {dayOfStay(current.admittedAt)}
                                </span>
                                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', isActive ? 'bg-emerald-500/25 text-emerald-50' : 'bg-white/15')}>
                                    {STATUS_LABEL[current.statusCode] ?? current.statusCode.replace(/_/g, ' ')}
                                </span>
                                {overview.allergies && (
                                    <span className="text-[11px] font-bold bg-rose-500/40 text-white px-2 py-0.5 rounded-full max-w-[16rem] truncate" title={overview.allergies}>Allergy: {overview.allergies}</span>
                                )}
                                {(current.otPlanProcedureNameSnapshot || current.packageCode) && (
                                    <span className="text-[11px] font-bold bg-violet-400/30 px-2 py-0.5 rounded-full max-w-[14rem] truncate">Plan: {current.otPlanProcedureNameSnapshot || current.packageCode}</span>
                                )}
                                {current.packageTypeNameSnapshot && (
                                    <span className="text-[11px] font-bold bg-amber-400/30 px-2 py-0.5 rounded-full">{current.packageTypeNameSnapshot}</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-brand-100 leading-relaxed line-clamp-2 sm:line-clamp-none">
                                {[
                                    current.patientId,
                                    current.admissionNo,
                                    current.primaryDoctorName,
                                    `${current.payerType}${current.payerName ? ` (${current.payerName})` : ''}`,
                                    current.admittedAt ? `admitted ${formatIstDateTime(current.admittedAt)}` : null,
                                    current.expectedDischargeAt && isActive ? `expected discharge ${formatIstDateTime(current.expectedDischargeAt).split(',')[0]}` : null,
                                    dischargedAt ? `discharged ${formatIstDateTime(dischargedAt)}` : null,
                                    current.referralName ? `referred by ${current.referralName}` : null,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
                        <div className="hidden sm:block text-right" aria-label={`Discharge stage: ${DISCHARGE_STAGE_LABELS[stage]}`}>
                            <div className="text-[11px] text-brand-100">{DISCHARGE_STAGE_LABELS[stage]}</div>
                            <div className="grid grid-cols-4 gap-1 mt-1 w-24">
                                {[0, 1, 2, 3].map(i => <span key={i} className={cn('h-1.5 rounded-full', i <= stage ? 'bg-amber-300' : 'bg-white/25')} />)}
                            </div>
                        </div>
                        {activeSection !== 'discharge' && (
                            <Button className="h-10 px-4 w-full sm:w-auto rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-bold shadow-sm" onClick={() => setActiveSection('discharge')}>
                                {!isActive ? 'Open discharge' : overview.dischargeDraft?.dischargeSummaryId || stage > 0 ? 'Continue discharge' : 'Start discharge'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Early-warning / rapid-response alert: visible on every section, not only Overview. */}
            <DeteriorationAlertBanner admissionId={current.admissionId} />

            {/* Side nav + content */}
            <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-5">
                {/* Phone: one-tap buttons for the sections used most, plus "More" for the full list
                    (the bottom sheet below). Replaces the single "Sections" dropdown. */}
                <nav aria-label="Patient sections" className="lg:hidden w-full sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur">
                    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {MOBILE_QUICK.map(key => {
                            const meta = SECTION_LIST.find(x => x.key === key)!;
                            const badge = navBadge(key);
                            const isCurrent = activeSection === key;
                            return (
                                <button key={key} type="button" onClick={() => setActiveSection(key)} aria-current={isCurrent ? 'page' : undefined}
                                    className={cn('h-11 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 border transition-colors',
                                        isCurrent ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800')}>
                                    <meta.icon className="h-3.5 w-3.5" /> {MOBILE_SHORT[key] ?? meta.label}
                                    {badge && key === 'mar' && <span className={cn('ml-0.5 rounded-full px-1.5 text-[10px]', isCurrent ? 'bg-white/25' : 'bg-amber-100 text-amber-800')}>{overview.dueCount}</span>}
                                </button>
                            );
                        })}
                        <button type="button" onClick={() => setMobileNavOpen(true)}
                            className={cn('h-11 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 border',
                                !MOBILE_QUICK.includes(activeSection) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800')}>
                            <MoreHorizontal className="h-3.5 w-3.5" /> {!MOBILE_QUICK.includes(activeSection) ? `${currentSectionMeta.label}${currentSubLabel ? ` · ${currentSubLabel}` : ''}` : 'More'}
                        </button>
                    </div>
                </nav>

                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetContent side="bottom" className="lg:hidden max-h-[80vh] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0 rounded-t-[2rem] border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-zinc-800/80 sticky top-0 bg-white dark:bg-zinc-950 z-10">
                            <SheetTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">Jump to section</SheetTitle>
                        </SheetHeader>
                        <div className="p-3 pb-6 space-y-1">
                            {SECTION_LIST.map(({ key, label, icon: Icon }) => (
                                <React.Fragment key={key}>
                                    <button
                                        type="button"
                                        onClick={() => { setActiveSection(key); setMobileNavOpen(false); }}
                                        className={cn(
                                            'w-full h-12 px-3.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors',
                                            activeSection === key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/50',
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" /> {label}
                                    </button>
                                    {key === 'cpoe' && (
                                        <div className="pl-4 space-y-1">
                                            {CPOE_TABS.map(({ key: tabKey, label: tabLabel, icon: TabIcon }) => (
                                                <button
                                                    key={tabKey}
                                                    type="button"
                                                    onClick={() => { setActiveSection('cpoe'); setActiveCpoeTab(tabKey); setMobileNavOpen(false); }}
                                                    className={cn(
                                                        'w-full h-11 pl-4 pr-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-2.5 border-l-2 transition-colors',
                                                        activeSection === 'cpoe' && activeCpoeTab === tabKey
                                                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                                                            : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900/30',
                                                    )}
                                                >
                                                    <TabIcon className="h-3.5 w-3.5 shrink-0" /> {tabLabel}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {key === 'nursing' && (
                                        <div className="pl-4 space-y-1">
                                            {NURSING_TABS.map(({ key: tabKey, label: tabLabel, icon: TabIcon }) => (
                                                <button
                                                    key={tabKey}
                                                    type="button"
                                                    onClick={() => { setActiveSection('nursing'); setActiveNursingTab(tabKey); setMobileNavOpen(false); }}
                                                    className={cn(
                                                        'w-full h-11 pl-4 pr-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-2.5 border-l-2 transition-colors',
                                                        activeSection === 'nursing' && activeNursingTab === tabKey
                                                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                                                            : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900/30',
                                                    )}
                                                >
                                                    <TabIcon className="h-3.5 w-3.5 shrink-0" /> {tabLabel}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>

                <aside className="hidden lg:flex lg:w-60 shrink-0 lg:rounded-3xl bg-white dark:bg-zinc-900 lg:border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm p-3 flex-col sticky top-6 z-10 space-y-0.5">
                    {NAV_GROUPS.map((group, gi) => (
                        <React.Fragment key={gi}>
                            {group.heading && <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">{group.heading}</p>}
                            {group.items.map(key => {
                                const meta = SECTION_LIST.find(x => x.key === key)!;
                                const badge = navBadge(key);
                                const isCurrent = activeSection === key;
                                const subTabs = key === 'cpoe' ? CPOE_TABS : key === 'nursing' ? NURSING_TABS : null;
                                return (
                                    <React.Fragment key={key}>
                                        {/* Discharge stays reachable after the admission closes — staff reopen a
                                            signed summary and re-download the PDF. */}
                                        <button type="button" onClick={() => setActiveSection(key)} aria-current={isCurrent ? 'page' : undefined} className={navItemClass(isCurrent)}>
                                            <meta.icon className="h-4 w-4 shrink-0" />
                                            <span className="flex-1 text-left truncate">{meta.label}</span>
                                            {badge && (
                                                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                                                    isCurrent ? 'bg-white/20 text-white' : badge.warn ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{badge.text}</span>
                                            )}
                                        </button>
                                        {isCurrent && subTabs && (
                                            <div className="flex flex-col ml-4 pl-2 border-l-2 border-slate-100 dark:border-zinc-800 space-y-0.5 my-1 py-1">
                                                {key === 'cpoe' && CPOE_TABS.map(({ key: k, label, icon: Icon }) => (
                                                    <button key={k} type="button" onClick={() => setActiveCpoeTab(k)} className={subNavItemClass(activeCpoeTab === k)}>
                                                        <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="whitespace-nowrap">{label}</span>
                                                    </button>
                                                ))}
                                                {key === 'nursing' && NURSING_TABS.map(({ key: k, label, icon: Icon }) => (
                                                    <button key={k} type="button" onClick={() => setActiveNursingTab(k)} className={subNavItemClass(activeNursingTab === k)}>
                                                        <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="whitespace-nowrap">{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </aside>

                <SubscriptionReadOnlyOverlay featureLabel="Managing this patient" className="flex-1 min-w-0 space-y-5">
                    {activeSection === 'cpoe' && (
                        <div className="lg:hidden flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/40 dark:border-zinc-800 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full mb-3">
                            {CPOE_TABS.map(({ key, label, icon: Icon }) => {
                                const isCurrent = activeCpoeTab === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActiveCpoeTab(key)}
                                        className={cn(
                                            'h-9 px-4 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 shrink-0 outline-none',
                                            isCurrent
                                                ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                                                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30'
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {activeSection === 'nursing' && (
                        <div className="lg:hidden flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/40 dark:border-zinc-800 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full mb-3">
                            {NURSING_TABS.map(({ key, label, icon: Icon }) => {
                                const isCurrent = activeNursingTab === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActiveNursingTab(key)}
                                        className={cn(
                                            'h-9 px-4 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 shrink-0 outline-none',
                                            isCurrent
                                                ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                                                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30'
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {activeSection === 'overview' && (
                        <div className="space-y-4">
                        <WorkspaceOverview
                            data={overview}
                            statusCode={current.statusCode}
                            isActive={isActive}
                            onRecordVitals={() => { setActiveSection('nursing'); setActiveNursingTab('vitals'); }}
                            onOpenMar={() => setActiveSection('mar')}
                            onOpenNotes={() => setActiveSection('roundNotes')}
                            onOpenOrders={() => { setActiveSection('cpoe'); setActiveCpoeTab('lab'); }}
                            onOpenFluids={() => { setActiveSection('nursing'); setActiveNursingTab('intakeOutput'); }}
                            onOpenDischarge={() => setActiveSection('discharge')}
                            onOpenConsent={() => setActiveSection('consent')}
                        />
                        <h2 className="pt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Stay — bed, doctor and referrer</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-2">Bed</h2>
                                {current.bedCode ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <p className="font-semibold text-slate-900 dark:text-zinc-100">{current.wardName ? `${current.wardName} · ` : ''}{current.bedCode}</p>
                                        {isActive && (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-slate-205 hover:bg-slate-50 dark:border-zinc-850 dark:hover:bg-zinc-800/50 font-bold gap-1.5 active:scale-[0.98] transition-all" onClick={() => { setBedActionMode('transfer'); setPickedBedId(''); }}>
                                                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Transfer
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-slate-205 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 dark:border-zinc-855 dark:hover:bg-rose-950/20 font-bold gap-1.5 active:scale-[0.98] transition-all" onClick={releaseBed} disabled={bedBusy || isSubscriptionReadOnly}>
                                                    <X className="h-3.5 w-3.5 mr-1.5" /> Release
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <p className="text-amber-600 font-semibold text-sm">{isActive ? 'Unassigned' : 'No bed'}</p>
                                        {isActive && (
                                            <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 font-bold gap-1.5 active:scale-[0.98] transition-all" onClick={() => { setBedActionMode('assign'); setPickedBedId(''); }}>
                                                <BedDouble className="h-3.5 w-3.5 mr-1.5" /> Assign a bed
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {bedActionMode && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-2 sm:flex-wrap">
                                        <div className="min-w-0 sm:flex-1 sm:min-w-[220px]">
                                            <Label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">{bedActionMode === 'assign' ? 'Bed to assign' : 'New bed'}</Label>
                                            <Select value={pickedBedId} onValueChange={setPickedBedId}>
                                                <SelectTrigger className="h-11 sm:h-10 mt-1 w-full rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-left">
                                                    <SelectValue placeholder="Select a bed…" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[250px] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-955 shadow-lg">
                                                    {freeBeds.map(b => (
                                                        <SelectItem key={b.bedId} value={b.bedId} className="rounded-xl focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">
                                                            {(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all" onClick={() => setBedActionMode(null)}>Cancel</Button>
                                            <Button size="sm" disabled={!pickedBedId || bedBusy} className="h-10 rounded-full px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all"
                                                onClick={() => runBedAction(
                                                    () => bedActionMode === 'assign'
                                                        ? bedBoardApi.assignBed(current.admissionId, pickedBedId)
                                                        : bedBoardApi.transferBed(current.admissionId, pickedBedId),
                                                    bedActionMode === 'assign' ? 'Bed assigned.' : 'Bed transferred.')}>
                                                {bedBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                                {bedActionMode === 'assign' ? 'Assign' : 'Transfer'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-2">Admission details</h2>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Admitted</dt><dd className="text-slate-800 dark:text-zinc-200 font-semibold">{formatIstDateTime(current.admittedAt)}</dd></div>
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Type</dt><dd className="text-slate-800 dark:text-zinc-200 font-semibold">{current.admissionType ?? '—'}</dd></div>
                                    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Payer</dt><dd className="text-slate-800 dark:text-zinc-200 font-semibold">{current.payerType}</dd></div>
                                </dl>
                                {(current.admissionReason || current.diagnosis) && (
                                    <p className="text-sm text-slate-700 dark:text-zinc-300 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 font-medium">{current.diagnosis || current.admissionReason}</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Doctor</h2>
                                    <Button variant="ghost" size="sm" className="h-8 sm:h-7 text-[11px] shrink-0 font-bold" onClick={toggleDoctorHistory}>
                                        {doctorHistoryOpen ? 'Hide history' : 'History'}
                                    </Button>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    {current.primaryDoctorName ? (
                                        <p className="font-semibold text-slate-900 dark:text-zinc-100">{current.primaryDoctorName}</p>
                                    ) : (
                                        <p className="text-amber-600 font-semibold text-sm">{isActive ? 'Not assigned' : 'No doctor'}</p>
                                    )}
                                    {isActive && (
                                        <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-slate-205 hover:bg-slate-50 dark:border-zinc-855 dark:hover:bg-zinc-800/50 font-bold gap-1.5 active:scale-[0.98] transition-all" onClick={() => { setDoctorActionMode('change'); setPickedDoctorId(current.primaryDoctorId ?? ''); }}>
                                            <Stethoscope className="h-3.5 w-3.5 mr-1.5" /> Change doctor
                                        </Button>
                                    )}
                                </div>

                                {doctorActionMode && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-2 sm:flex-wrap">
                                        <div className="min-w-0 sm:flex-1 sm:min-w-[220px]">
                                            <Label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Admitting doctor</Label>
                                            <Select value={pickedDoctorId} onValueChange={setPickedDoctorId}>
                                                <SelectTrigger className="h-11 sm:h-10 mt-1 w-full rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-left">
                                                    <SelectValue placeholder="Select a doctor…" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[250px] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-955 shadow-lg">
                                                    {doctors.map(d => (
                                                        <SelectItem key={d.doctorId} value={d.doctorId} className="rounded-xl focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">
                                                            {d.fullName || 'Unnamed'}{d.departmentName ? ` · ${d.departmentName}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all" onClick={() => setDoctorActionMode(null)}>Cancel</Button>
                                            <Button size="sm" disabled={!pickedDoctorId || pickedDoctorId === current.primaryDoctorId || doctorBusy}
                                                className="h-10 rounded-full px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all"
                                                onClick={() => runDoctorAction(() => admissionApi.changeDoctor(current.admissionId, pickedDoctorId), 'Doctor changed.')}>
                                                {doctorBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                                Change
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {doctorHistoryOpen && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                                        {doctorHistoryLoading ? (
                                            <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
                                        ) : doctorHistory.length === 0 ? (
                                            <p className="text-xs text-slate-400">No history yet.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {doctorHistory.map(h => (
                                                    <li key={h.assignmentId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-zinc-150/65 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-900/30 text-xs shadow-sm">
                                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                                                            {h.doctorName ?? '—'}
                                                            {h.statusCode === 'ACTIVE' && <Badge variant="outline" className="ml-1.5 text-[9px] font-bold px-1.5 py-0 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30 rounded-full">Current</Badge>}
                                                        </span>
                                                        <span className="text-slate-550 dark:text-zinc-500 font-medium shrink-0">
                                                            {formatIstDateTime(h.assignedAt)} → {h.unassignedAt ? formatIstDateTime(h.unassignedAt) : 'Present'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Referrer</h2>
                                    <Button variant="ghost" size="sm" className="h-8 sm:h-7 text-[11px] shrink-0 font-bold" onClick={toggleReferrerHistory}>
                                        {referrerHistoryOpen ? 'Hide history' : 'History'}
                                    </Button>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    {current.referralSource === 'SELF' ? (
                                        <p className="font-semibold text-slate-900 dark:text-zinc-100">Self</p>
                                    ) : current.referralName ? (
                                        <p className="font-semibold text-slate-900 dark:text-zinc-100 font-medium">
                                            {current.referralName}
                                            {current.referralSource && <Badge variant="outline" className="ml-1.5 text-[9px] font-bold px-1.5 py-0 bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-slate-205 dark:border-zinc-800 rounded-full">{current.referralSource}</Badge>}
                                        </p>
                                    ) : (
                                        <p className="text-amber-600 font-semibold text-sm">{isActive ? 'Not specified' : 'None'}</p>
                                    )}
                                    {isActive && (
                                        <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-slate-205 hover:bg-slate-50 dark:border-zinc-855 dark:hover:bg-zinc-800/50 font-bold gap-1.5 active:scale-[0.98] transition-all" onClick={startChangeReferrer}>
                                            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Change referrer
                                        </Button>
                                    )}
                                </div>

                                {referrerActionMode && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                                        <div className="flex gap-2">
                                            {(['SELF', 'DOCTOR', 'OTHER'] as const).map(opt => {
                                                const active = pickedReferralSource === opt;
                                                return (
                                                    <button key={opt} type="button"
                                                        onClick={() => { setPickedReferralSource(opt); setPickedReferrerId(''); setPickedReferrerName(''); setPickedReferrerType(''); }}
                                                        className={cn('flex-1 h-10 rounded-full border text-xs font-black transition-all active:scale-[0.98]',
                                                            active ? 'bg-brand-600 text-white border-transparent shadow-sm' : 'bg-slate-55 dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50')}>
                                                        {opt === 'SELF' ? 'Self' : opt === 'DOCTOR' ? 'Doctor' : 'Other'}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {(pickedReferralSource === 'DOCTOR' || pickedReferralSource === 'OTHER') && (
                                            <ReferrerPicker
                                                hospitalId={hospitalId}
                                                referrerId={pickedReferralSource === 'SELF' ? '' : pickedReferrerId}
                                                referrerName={pickedReferralSource === 'SELF' ? '' : pickedReferrerName}
                                                referrerType={pickedReferralSource === 'SELF' ? '' : pickedReferrerType}
                                                lockedType={pickedReferralSource === 'DOCTOR' ? 'DOCTOR' : 'REFERRER'}
                                                onSelect={(id, name, type) => { setPickedReferrerId(id); setPickedReferrerName(name); setPickedReferrerType(type); }}
                                                onClear={() => { setPickedReferrerId(''); setPickedReferrerName(''); setPickedReferrerType(''); }}
                                            />
                                        )}

                                        <div className="flex items-center justify-end gap-2 mt-2">
                                            <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all" onClick={() => setReferrerActionMode(null)}>Cancel</Button>
                                            <Button size="sm"
                                                disabled={(pickedReferralSource !== 'SELF' && !pickedReferrerId) || referrerBusy}
                                                className="h-10 rounded-full px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold flex-1 sm:flex-none active:scale-[0.98] transition-all"
                                                onClick={() => runReferrerAction(() => admissionApi.changeReferrer(current.admissionId, {
                                                    referralSource: pickedReferralSource,
                                                    referrerId: pickedReferralSource === 'SELF' ? null : pickedReferrerId,
                                                    referrerName: pickedReferralSource === 'SELF' ? null : pickedReferrerName,
                                                    referrerType: pickedReferralSource === 'SELF' ? null : pickedReferrerType,
                                                }), 'Referrer changed.')}>
                                                {referrerBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                                                Change
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {referrerHistoryOpen && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                                        {referrerHistoryLoading ? (
                                            <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
                                        ) : referrerHistory.length === 0 ? (
                                            <p className="text-xs text-slate-400">No history yet.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {referrerHistory.map(h => (
                                                    <li key={h.assignmentId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-zinc-150/65 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-900/30 text-xs shadow-sm">
                                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                                                            {h.referralSource === 'SELF' ? 'Self' : h.referrerName ?? '—'}
                                                            {h.referrerType && <span className="ml-1.5 text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">{REFERRER_LABEL[h.referrerType] ?? h.referrerType}</span>}
                                                            {h.statusCode === 'ACTIVE' && <Badge variant="outline" className="ml-1.5 text-[9px] font-bold px-1.5 py-0 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-444 border-emerald-250 dark:border-emerald-900/30 rounded-full">Current</Badge>}
                                                        </span>
                                                        <span className="text-slate-550 dark:text-zinc-500 font-medium shrink-0">
                                                            {formatIstDateTime(h.assignedAt)} → {h.unassignedAt ? formatIstDateTime(h.unassignedAt) : 'Present'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    )}

                    {activeSection === 'admissionDetails' && (
                        <AdmissionDetailsPanel admission={current} isActive={isActive} onUpdated={refreshAfterAction} />
                    )}

                    {activeSection === 'cpoe' && activeCpoeTab === 'medications' && (
                        <ClinicalOrderPanel
                            admissionId={current.admissionId}
                            patientId={current.patientId}
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
                                <Button variant="outline" size="sm" className="h-10 sm:h-9" onClick={() => setActiveSection('consent')}>
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
                                    className={cn('h-9 sm:h-8 px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', dietNursingSubTab === 'diet' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                    <Utensils className="h-3.5 w-3.5" /> Diet
                                </button>
                                <button type="button" onClick={() => setDietNursingSubTab('nursing')}
                                    className={cn('h-9 sm:h-8 px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1.5', dietNursingSubTab === 'nursing' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
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

                    {activeSection === 'documents' && (
                        <AdmissionDocumentsPanel admissionId={current.admissionId} />
                    )}

                    {activeSection === 'bloodBank' && (
                        <BloodBankPanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'surgery' && (
                        <SurgeryCasePanel
                            admissionId={current.admissionId}
                            isActive={isActive}
                            otPlanProcedureNameSnapshot={current.otPlanProcedureNameSnapshot}
                            otPlanSuggestedIcuLevel={current.otPlanSuggestedIcuLevel}
                            admission={current}
                        />
                    )}

                    {activeSection === 'criticalCare' && (
                        <IcuCriticalCarePanel admissionId={current.admissionId} isActive={isActive} />
                    )}

                    {activeSection === 'discharge' && (
                        <DischargeSummaryPanel admission={current} isActive={isActive} onDischarged={refreshAfterAction} />
                    )}
                </SubscriptionReadOnlyOverlay>
            </div>
        </div>
    );
};

// Mobile-only compact metadata row (see "Details" above) — icon + label on the left, value
// right-aligned and truncating, one line per field instead of the label-above-value blocks the
// desktop layout uses (which take roughly 2x the vertical space per field).
const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string; strong?: boolean; variant?: 'default' | 'white' }> = ({ icon: Icon, label, value, strong, variant = 'default' }) => (
    <div className="flex items-center gap-2 py-1.5 text-xs sm:text-sm min-w-0">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', variant === 'white' ? 'text-brand-200' : 'text-slate-400')} />
        <span className={cn('shrink-0', variant === 'white' ? 'text-brand-100/90' : 'text-slate-400')}>{label}</span>
        <span className={cn('flex-1 min-w-0 text-left truncate', 
            strong ? 'font-bold' : 'font-semibold',
            variant === 'white' 
              ? 'text-white font-bold' 
              : strong ? 'text-slate-800 dark:text-zinc-150' : 'text-slate-700 dark:text-zinc-300'
        )} title={value}>
            {value}
        </span>
    </div>
);
