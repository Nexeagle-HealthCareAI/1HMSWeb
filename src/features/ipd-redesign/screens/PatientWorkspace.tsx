import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, BedDouble, Pill, LogOut, ArrowLeftRight, Check, Loader2, X, FlaskConical, Scissors, Utensils, HeartPulse, Scan,
    ClipboardList, ClipboardCheck,
} from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { ClinicalOrderPanel } from '../components/ClinicalOrderPanel';

const ACTIVE_STATUSES = ['PRE_ADMIT', 'ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED'];

// Backend timestamps come back naive (no timezone suffix) — treat as UTC before converting to IST.
const toIstDate = (iso: string): Date => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTz ? iso : `${iso}Z`);
};
const formatIstDateTime = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
    const month = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
    const year = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}${month}.${year}, ${time}`;
};

type Section = 'overview' | 'cpoe' | 'mar';
type CpoeTab = 'medications' | 'lab' | 'procedures' | 'dietNursing' | 'radiology';

const CPOE_TABS: { key: CpoeTab; label: string; icon: React.ElementType }[] = [
    { key: 'medications', label: 'Medications', icon: Pill },
    { key: 'lab', label: 'Lab', icon: FlaskConical },
    { key: 'procedures', label: 'Procedures', icon: Scissors },
    { key: 'dietNursing', label: 'Diet & Nursing', icon: Utensils },
    { key: 'radiology', label: 'Radiology', icon: Scan },
];

interface Props {
    admission: ActiveAdmissionItem;
    onBack: () => void;
    onChanged: () => void;
}

/**
 * Real per-admission workspace — bed, CPOE orders, and discharge all in one place, replacing the
 * old separate bed/discharge dialog and the standalone medication-orders screen. A two-level side
 * nav (Overview / CPOE with its 5 order-type children / MAR) keeps the workspace organized as more
 * top-level sections (MAR, later Vitals/Notes/Billing) get added — see patient_workspace_navigation
 * memory. Each order-type view renders the shared ClinicalOrderPanel (components/ClinicalOrderPanel)
 * rather than duplicating order-list/new-order/discontinue UI per type. Read-only for bed/order
 * actions once the admission is no longer in an Active status.
 */
export const PatientWorkspace: React.FC<Props> = ({ admission, onBack, onChanged }) => {
    const { toast } = useToast();
    const [current, setCurrent] = useState<ActiveAdmissionItem>(admission);
    const [activeSection, setActiveSection] = useState<Section>('overview');
    const [activeCpoeTab, setActiveCpoeTab] = useState<CpoeTab>('medications');
    const [dietNursingSubTab, setDietNursingSubTab] = useState<'diet' | 'nursing'>('diet');
    const isActive = ACTIVE_STATUSES.includes(current.statusCode);

    const [freeBeds, setFreeBeds] = useState<BedBoardItem[]>([]);
    const [bedActionMode, setBedActionMode] = useState<'assign' | 'transfer' | null>(null);
    const [pickedBedId, setPickedBedId] = useState('');
    const [bedBusy, setBedBusy] = useState(false);

    const [dischargeOpen, setDischargeOpen] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [dischargeBusy, setDischargeBusy] = useState(false);

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

    // ── Discharge ────────────────────────────────────────────────────────────
    const confirmDischarge = async () => {
        setDischargeBusy(true);
        try {
            await bedBoardApi.dischargeAdmission(current.admissionId, dischargeNotes || undefined);
            toast({ title: 'Patient discharged.' });
            setDischargeOpen(false);
            refreshAfterAction();
        } catch (err) {
            toast({ title: 'Could not discharge', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDischargeBusy(false);
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
                {isActive && (
                    <Button onClick={() => { setDischargeNotes(''); setDischargeOpen(true); }} className="h-10 bg-amber-600 hover:bg-amber-700 font-semibold">
                        <LogOut className="h-4 w-4 mr-2" /> Discharge
                    </Button>
                )}
            </div>

            {/* Side nav + content */}
            <div className="flex items-start gap-5">
                <aside className="w-60 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm p-2 space-y-0.5 sticky top-6">
                    <button type="button" onClick={() => setActiveSection('overview')} className={navItemClass(activeSection === 'overview')}>
                        <BedDouble className="h-4 w-4" /> Overview
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

                    <button type="button" disabled className={navItemClass(false, 'opacity-50 cursor-not-allowed justify-between')}>
                        <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> MAR</span>
                        <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 text-slate-500 border-slate-200">Soon</Badge>
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

                    {/* Consent capture (ConsentRecord, TemplateTypeCode=PROCEDURE) is a separate, already-
                        existing system — deliberately not linked here yet to avoid scope creep; a natural
                        future step would prompt for consent when a procedure order is placed. */}
                    {activeSection === 'cpoe' && activeCpoeTab === 'procedures' && (
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
                </div>
            </div>

            {/* Discharge dialog */}
            <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Discharge {current.patientName || 'patient'}?</DialogTitle>
                        <DialogDescription>
                            This closes the admission to DISCHARGED{current.bedCode ? ` and releases bed ${current.bedCode}` : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                        <Textarea rows={3} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDischargeOpen(false)}>Cancel</Button>
                        <Button disabled={dischargeBusy} className="bg-amber-600 hover:bg-amber-700" onClick={confirmDischarge}>
                            {dischargeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
