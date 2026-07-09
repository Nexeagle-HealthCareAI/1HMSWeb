import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Check, X, Scissors, Calendar, ClipboardCheck, Activity, Package, AlertTriangle } from 'lucide-react';
import {
    surgeryCaseApi, type SurgeryCaseSummary, type SurgeryCaseDetail, type SurgeryStatus,
} from '../services/surgeryCaseApi';
import { otBookingApi, type OperationTheatre } from '../services/otBookingApi';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';
import { cssdApi, type InstrumentSet } from '../services/cssdApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
    // Frozen at admit time from the OT Plan picked in the wizard, if any — pre-fills the new
    // request's procedure name and surfaces an ICU hint. Not a live join (see Admission entity).
    otPlanProcedureNameSnapshot?: string | null;
    otPlanSuggestedIcuLevel?: string | null;
}

const WHO_ITEMS: Record<'signIn' | 'timeOut' | 'signOut', { key: string; label: string }[]> = {
    signIn: [
        { key: 'identity_site_procedure_consent', label: 'Patient has confirmed identity, site, procedure, and consent' },
        { key: 'site_marked', label: 'Site marked / not applicable' },
        { key: 'anaesthesia_safety_check', label: 'Anaesthesia safety check completed' },
        { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning' },
        { key: 'known_allergy', label: 'Known allergy?' },
        { key: 'difficult_airway_risk', label: 'Difficult airway/aspiration risk? If yes, equipment/assistance available' },
        { key: 'blood_loss_risk', label: 'Risk of >500ml blood loss (7ml/kg in children)? If yes, adequate IV access/fluids planned' },
    ],
    timeOut: [
        { key: 'team_introduced', label: 'All team members introduced by name and role' },
        { key: 'verbal_confirmation', label: 'Surgeon/anaesthetist/nurse verbally confirm patient, site, procedure' },
        { key: 'critical_events_surgeon', label: 'Anticipated critical events reviewed — surgeon' },
        { key: 'critical_events_anaesthetist', label: 'Anticipated critical events reviewed — anaesthetist' },
        { key: 'critical_events_nursing', label: 'Anticipated critical events reviewed — nursing team' },
        { key: 'antibiotic_prophylaxis', label: 'Antibiotic prophylaxis given within last 60 minutes? / not applicable' },
        { key: 'imaging_displayed', label: 'Essential imaging displayed? / not applicable' },
    ],
    signOut: [
        { key: 'procedure_name_recorded', label: 'Nurse verbally confirms: name of procedure recorded' },
        { key: 'counts_correct', label: 'Instrument, sponge, and needle counts correct / not applicable' },
        { key: 'specimen_labeled', label: 'Specimen labeled correctly, including patient name' },
        { key: 'equipment_problems', label: 'Equipment problems to be addressed identified' },
        { key: 'recovery_concerns_reviewed', label: 'Surgeon/anaesthetist/nurse review key concerns for recovery and management' },
    ],
};

const statusBadgeClass = (status: string) => cn(
    'text-[10px] font-bold',
    status === 'REQUESTED' && 'bg-slate-100 text-slate-600',
    status === 'SCHEDULED' && 'bg-blue-50 text-blue-700 border-blue-200',
    status === 'PRE_OP' && 'bg-amber-50 text-amber-700 border-amber-200',
    status === 'IN_THEATRE' && 'bg-violet-50 text-violet-700 border-violet-200',
    status === 'POST_OP' && 'bg-cyan-50 text-cyan-700 border-cyan-200',
    status === 'COMPLETED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
    status === 'CANCELLED' && 'bg-rose-50 text-rose-700 border-rose-200',
);

const NEXT_STATUS: Partial<Record<SurgeryStatus, SurgeryStatus>> = {
    SCHEDULED: 'PRE_OP',
    PRE_OP: 'IN_THEATRE',
    IN_THEATRE: 'POST_OP',
    POST_OP: 'COMPLETED',
};
const NEXT_STATUS_LABEL: Partial<Record<SurgeryStatus, string>> = {
    SCHEDULED: 'Move to Pre-Op',
    PRE_OP: 'Move to In-Theatre',
    IN_THEATRE: 'Move to Post-Op',
    POST_OP: 'Complete case',
};

export const SurgeryCasePanel: React.FC<Props> = ({ admissionId, isActive, otPlanProcedureNameSnapshot, otPlanSuggestedIcuLevel }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<SurgeryCaseSummary[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SurgeryCaseDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [showNewRequest, setShowNewRequest] = useState(false);
    const [requestBusy, setRequestBusy] = useState(false);
    const [procedureName, setProcedureName] = useState('');
    const [surgeryType, setSurgeryType] = useState<'ELECTIVE' | 'EMERGENCY'>('ELECTIVE');
    const [urgency, setUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
    const [surgeonName, setSurgeonName] = useState('');
    const [anaesthetistName, setAnaesthetistName] = useState('');

    const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
    const [pickedTheatreId, setPickedTheatreId] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [scheduledEnd, setScheduledEnd] = useState('');
    const [bookBusy, setBookBusy] = useState(false);

    const [asaGrade, setAsaGrade] = useState('');
    const [npoConfirmed, setNpoConfirmed] = useState(false);
    const [allergiesReviewed, setAllergiesReviewed] = useState(false);
    const [investigationsReviewed, setInvestigationsReviewed] = useState(false);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [preOpNotes, setPreOpNotes] = useState('');
    const [preOpBusy, setPreOpBusy] = useState(false);

    const [signInItems, setSignInItems] = useState<Record<string, boolean>>({});
    const [timeOutItems, setTimeOutItems] = useState<Record<string, boolean>>({});
    const [signOutItems, setSignOutItems] = useState<Record<string, boolean>>({});
    const [checklistBusy, setChecklistBusy] = useState<'signIn' | 'timeOut' | 'signOut' | null>(null);

    const [anaesthesiaType, setAnaesthesiaType] = useState('');
    const [surgeryStartAt, setSurgeryStartAt] = useState('');
    const [surgeryEndAt, setSurgeryEndAt] = useState('');
    const [estimatedBloodLossMl, setEstimatedBloodLossMl] = useState('');
    const [findings, setFindings] = useState('');
    const [procedurePerformed, setProcedurePerformed] = useState('');
    const [surgicalTeam, setSurgicalTeam] = useState('');
    const [complicationsNotes, setComplicationsNotes] = useState('');
    const [intraOpBusy, setIntraOpBusy] = useState(false);

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [pickedInventoryItemId, setPickedInventoryItemId] = useState('');
    const [freeItemName, setFreeItemName] = useState('');
    const [itemCategory, setItemCategory] = useState<'CONSUMABLE' | 'IMPLANT'>('CONSUMABLE');
    const [itemQty, setItemQty] = useState('1');
    const [itemLot, setItemLot] = useState('');
    const [itemSerial, setItemSerial] = useState('');
    const [itemBusy, setItemBusy] = useState(false);

    const [instrumentSets, setInstrumentSets] = useState<InstrumentSet[]>([]);
    const [pickedSetId, setPickedSetId] = useState('');
    const [issueBusy, setIssueBusy] = useState(false);

    const [statusBusy, setStatusBusy] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancel, setShowCancel] = useState(false);

    const loadCases = () => {
        setLoading(true);
        surgeryCaseApi.getForAdmission(admissionId)
            .then(list => {
                setCases(list);
                if (list.length > 0 && !selectedCaseId) setSelectedCaseId(list[0].surgeryCaseId);
            })
            .catch(() => setCases([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadCases(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadDetail = () => {
        if (!selectedCaseId) { setDetail(null); return; }
        setDetailLoading(true);
        surgeryCaseApi.getDetail(selectedCaseId)
            .then(d => {
                setDetail(d);
                setAnaesthesiaType(d.intraOpRecord?.anaesthesiaType ?? '');
                setSurgeryStartAt(d.intraOpRecord?.surgeryStartAt?.slice(0, 16) ?? '');
                setSurgeryEndAt(d.intraOpRecord?.surgeryEndAt?.slice(0, 16) ?? '');
                setEstimatedBloodLossMl(d.intraOpRecord?.estimatedBloodLossMl != null ? String(d.intraOpRecord.estimatedBloodLossMl) : '');
                setFindings(d.intraOpRecord?.findings ?? '');
                setProcedurePerformed(d.intraOpRecord?.procedurePerformed ?? '');
                setSurgicalTeam(d.intraOpRecord?.surgicalTeam ?? '');
                setComplicationsNotes(d.intraOpRecord?.complicationsNotes ?? '');
                setSignInItems(d.checklist?.signInItems ?? {});
                setTimeOutItems(d.checklist?.timeOutItems ?? {});
                setSignOutItems(d.checklist?.signOutItems ?? {});
            })
            .catch(() => setDetail(null))
            .finally(() => setDetailLoading(false));
    };

    useEffect(() => { loadDetail(); }, [selectedCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        otBookingApi.getTheatres().then(setTheatres).catch(() => setTheatres([]));
        inventoryApi.getItems({ category: 'SURGICAL' }).then(items =>
            inventoryApi.getItems({ category: 'IMPLANT' }).then(implants => setInventoryItems([...items, ...implants])),
        ).catch(() => setInventoryItems([]));
        cssdApi.getSets('STERILE').then(setInstrumentSets).catch(() => setInstrumentSets([]));
    }, []);

    const submitRequest = async () => {
        if (!procedureName.trim()) { toast({ title: 'Procedure name is required', variant: 'destructive' }); return; }
        setRequestBusy(true);
        try {
            const res = await surgeryCaseApi.requestSurgery({
                admissionId, procedureName: procedureName.trim(), surgeryType, urgency,
                surgeonName: surgeonName.trim() || undefined, anaesthetistName: anaesthetistName.trim() || undefined,
            });
            toast({ title: 'Surgery requested.' });
            setShowNewRequest(false);
            setProcedureName(''); setSurgeonName(''); setAnaesthetistName('');
            setSelectedCaseId(res.surgeryCaseId);
            loadCases();
        } catch (err) {
            toast({ title: 'Could not request surgery', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setRequestBusy(false);
        }
    };

    const submitBooking = async () => {
        if (!detail || !pickedTheatreId || !scheduledStart || !scheduledEnd) {
            toast({ title: 'Theatre, start, and end time are required', variant: 'destructive' });
            return;
        }
        setBookBusy(true);
        try {
            const startIso = new Date(scheduledStart).toISOString();
            const endIso = new Date(scheduledEnd).toISOString();
            if (detail.booking) {
                await otBookingApi.reschedule(detail.booking.otBookingId, pickedTheatreId, startIso, endIso);
                toast({ title: 'Booking rescheduled.' });
            } else {
                await otBookingApi.book(detail.surgeryCaseId, pickedTheatreId, startIso, endIso);
                toast({ title: 'Theatre booked.' });
            }
            loadDetail();
            loadCases();
        } catch (err) {
            toast({ title: 'Could not book the theatre', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBookBusy(false);
        }
    };

    const submitPreOp = async () => {
        if (!detail) return;
        setPreOpBusy(true);
        try {
            await surgeryCaseApi.recordPreOp(detail.surgeryCaseId, {
                asaGrade: asaGrade || undefined, npoConfirmed, allergiesReviewed, investigationsReviewed, consentConfirmed,
                notes: preOpNotes.trim() || undefined,
            });
            toast({ title: 'Pre-op assessment saved.' });
            loadDetail();
        } catch (err) {
            toast({ title: 'Could not save assessment', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setPreOpBusy(false);
        }
    };

    const submitChecklistPhase = async (phase: 'signIn' | 'timeOut' | 'signOut') => {
        if (!detail) return;
        setChecklistBusy(phase);
        try {
            const items = phase === 'signIn' ? signInItems : phase === 'timeOut' ? timeOutItems : signOutItems;
            if (phase === 'signIn') await surgeryCaseApi.recordSignIn(detail.surgeryCaseId, { items });
            else if (phase === 'timeOut') await surgeryCaseApi.recordTimeOut(detail.surgeryCaseId, { items });
            else await surgeryCaseApi.recordSignOut(detail.surgeryCaseId, { items });
            toast({ title: `${phase === 'signIn' ? 'Sign-In' : phase === 'timeOut' ? 'Time-Out' : 'Sign-Out'} recorded.` });
            loadDetail();
        } catch (err) {
            toast({ title: 'Could not record checklist phase', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setChecklistBusy(null);
        }
    };

    const submitIntraOp = async () => {
        if (!detail) return;
        setIntraOpBusy(true);
        try {
            await surgeryCaseApi.saveIntraOp(detail.surgeryCaseId, {
                anaesthesiaType: anaesthesiaType || undefined,
                surgeryStartAt: surgeryStartAt ? new Date(surgeryStartAt).toISOString() : undefined,
                surgeryEndAt: surgeryEndAt ? new Date(surgeryEndAt).toISOString() : undefined,
                estimatedBloodLossMl: estimatedBloodLossMl ? Number(estimatedBloodLossMl) : undefined,
                findings: findings.trim() || undefined,
                procedurePerformed: procedurePerformed.trim() || undefined,
                surgicalTeam: surgicalTeam.trim() || undefined,
                complicationsNotes: complicationsNotes.trim() || undefined,
            });
            toast({ title: 'Intra-op record saved.' });
            loadDetail();
        } catch (err) {
            toast({ title: 'Could not save intra-op record', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setIntraOpBusy(false);
        }
    };

    const submitItemUsage = async () => {
        if (!detail) return;
        const picked = inventoryItems.find(i => i.inventoryItemId === pickedInventoryItemId);
        const itemName = picked?.itemName ?? freeItemName.trim();
        if (!itemName) { toast({ title: 'An item name is required', variant: 'destructive' }); return; }
        if (!itemQty || Number(itemQty) <= 0) { toast({ title: 'Qty must be greater than zero', variant: 'destructive' }); return; }
        setItemBusy(true);
        try {
            await surgeryCaseApi.recordItemUsage(detail.surgeryCaseId, {
                inventoryItemId: picked?.inventoryItemId,
                itemName,
                category: itemCategory,
                qty: Number(itemQty),
                lotNumber: itemLot.trim() || undefined,
                serialNumber: itemSerial.trim() || undefined,
                unitRate: picked?.defaultRate ?? undefined,
            });
            toast({ title: 'Item usage recorded.' });
            setPickedInventoryItemId(''); setFreeItemName(''); setItemQty('1'); setItemLot(''); setItemSerial('');
            loadDetail();
        } catch (err) {
            toast({ title: 'Could not record item usage', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setItemBusy(false);
        }
    };

    const issueInstrumentSet = async () => {
        if (!detail || !pickedSetId) return;
        setIssueBusy(true);
        try {
            await cssdApi.recordMovement(pickedSetId, 'ISSUE_TO_OT', { surgeryCaseId: detail.surgeryCaseId, location: 'Operation Theatre' });
            toast({ title: 'Instrument set issued to OT.' });
            setPickedSetId('');
            cssdApi.getSets('STERILE').then(setInstrumentSets).catch(() => {});
        } catch (err) {
            toast({ title: 'Could not issue the set', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setIssueBusy(false);
        }
    };

    const advanceStatus = async () => {
        if (!detail) return;
        const next = NEXT_STATUS[detail.statusCode];
        if (!next) return;
        setStatusBusy(true);
        try {
            await surgeryCaseApi.updateStatus(detail.surgeryCaseId, next);
            toast({ title: `Case moved to ${next.replace('_', ' ')}.` });
            loadDetail();
            loadCases();
        } catch (err) {
            toast({ title: 'Could not update status', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setStatusBusy(false);
        }
    };

    const submitCancel = async () => {
        if (!detail || !cancelReason.trim()) { toast({ title: 'A reason is required to cancel', variant: 'destructive' }); return; }
        setStatusBusy(true);
        try {
            await surgeryCaseApi.updateStatus(detail.surgeryCaseId, 'CANCELLED', cancelReason.trim());
            toast({ title: 'Case cancelled.' });
            setShowCancel(false); setCancelReason('');
            loadDetail();
            loadCases();
        } catch (err) {
            toast({ title: 'Could not cancel case', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setStatusBusy(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
    }

    return (
        <div className="space-y-5">
            {/* Case list + new request */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Surgery cases</h2>
                    {isActive && (
                        <Button
                            size="sm" variant="outline" className="h-8 text-xs"
                            onClick={() => setShowNewRequest(o => {
                                const next = !o;
                                if (next && !procedureName.trim() && otPlanProcedureNameSnapshot) {
                                    setProcedureName(otPlanProcedureNameSnapshot);
                                }
                                return next;
                            })}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New request
                        </Button>
                    )}
                </div>

                {showNewRequest && isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Procedure name</Label>
                            <Input value={procedureName} onChange={e => setProcedureName(e.target.value)} className="h-9 mt-1" />
                        </div>
                        {otPlanSuggestedIcuLevel && (
                            <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5" /> ICU likely for this plan — {otPlanSuggestedIcuLevel.replace('_', ' ')}. Arrange a bed post-op.
                            </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Surgery type</Label>
                                <select value={surgeryType} onChange={e => setSurgeryType(e.target.value as 'ELECTIVE' | 'EMERGENCY')} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                    <option value="ELECTIVE">Elective</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Urgency</Label>
                                <select value={urgency} onChange={e => setUrgency(e.target.value as 'ROUTINE' | 'URGENT' | 'EMERGENCY')} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                    <option value="ROUTINE">Routine</option>
                                    <option value="URGENT">Urgent</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Surgeon</Label>
                                <Input value={surgeonName} onChange={e => setSurgeonName(e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Anaesthetist</Label>
                                <Input value={anaesthetistName} onChange={e => setAnaesthetistName(e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowNewRequest(false)}>Cancel</Button>
                            <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={requestBusy} onClick={submitRequest}>
                                {requestBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Request
                            </Button>
                        </div>
                    </div>
                )}

                {cases.length === 0 ? (
                    <p className="text-sm text-slate-400 mt-2">No surgery cases yet for this admission.</p>
                ) : (
                    <div className="mt-3 space-y-1.5">
                        {cases.map(c => (
                            <button key={c.surgeryCaseId} type="button" onClick={() => setSelectedCaseId(c.surgeryCaseId)}
                                className={cn('w-full text-left p-2.5 rounded-lg border flex items-center justify-between gap-3 flex-wrap',
                                    selectedCaseId === c.surgeryCaseId ? 'border-brand-300 bg-brand-50' : 'border-slate-100 hover:bg-slate-50')}>
                                <div className="flex items-center gap-2">
                                    <Scissors className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-800">{c.procedureName}</span>
                                    <Badge variant="outline" className={statusBadgeClass(c.statusCode)}>{c.statusCode.replace('_', ' ')}</Badge>
                                </div>
                                <span className="text-[11px] text-slate-500">{c.theatreName ? `${c.theatreName} · ` : ''}{c.scheduledStart ? formatIstDateTime(c.scheduledStart) : formatIstDateTime(c.requestedAt)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {detailLoading && (
                <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}

            {detail && !detailLoading && (
                <>
                    {/* Status bar */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <p className="font-bold text-slate-800">{detail.procedureName}</p>
                            <p className="text-xs text-slate-500">{detail.surgeonName ? `Surgeon: ${detail.surgeonName}` : ''}{detail.anaesthetistName ? ` · Anaesthetist: ${detail.anaesthetistName}` : ''}</p>
                            {detail.statusCode === 'CANCELLED' && detail.cancelledReason && (
                                <p className="text-xs text-rose-600 mt-1">Cancelled: {detail.cancelledReason}</p>
                            )}
                        </div>
                        {isActive && NEXT_STATUS[detail.statusCode] && (
                            <div className="flex items-center gap-2">
                                {!showCancel && (
                                    <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 hover:bg-rose-50" onClick={() => setShowCancel(true)}>
                                        <X className="h-3.5 w-3.5 mr-1.5" /> Cancel case
                                    </Button>
                                )}
                                <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700" disabled={statusBusy} onClick={advanceStatus}>
                                    {statusBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} {NEXT_STATUS_LABEL[detail.statusCode]}
                                </Button>
                            </div>
                        )}
                    </div>

                    {showCancel && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
                            <Label className="text-[11px] font-semibold text-rose-700">Reason for cancellation</Label>
                            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowCancel(false)}>Back</Button>
                                <Button size="sm" className="h-8 bg-rose-600 hover:bg-rose-700" disabled={statusBusy} onClick={submitCancel}>Confirm cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Schedule */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule</h2>
                        {detail.booking && (
                            <p className="text-sm text-slate-700 mb-2">
                                <span className="font-semibold">{detail.booking.theatreName}</span> · {formatIstDateTime(detail.booking.scheduledStart)} – {formatIstDateTime(detail.booking.scheduledEnd)}
                                <Badge variant="outline" className="ml-2 text-[10px]">{detail.booking.statusCode}</Badge>
                            </p>
                        )}
                        {isActive && (
                            <div className="flex items-end gap-2 flex-wrap">
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Theatre</Label>
                                    <select value={pickedTheatreId} onChange={e => setPickedTheatreId(e.target.value)} className="h-9 mt-1 text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                        <option value="">Select…</option>
                                        {theatres.map(t => <option key={t.theatreId} value={t.theatreId}>{t.theatreName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Start</Label>
                                    <Input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">End</Label>
                                    <Input type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={bookBusy} onClick={submitBooking}>
                                    {bookBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} {detail.booking ? 'Reschedule' : 'Book'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Pre-op assessment */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Pre-op assessment</h2>
                        {detail.latestPreOpAssessment && (
                            <p className="text-xs text-slate-500 mb-2">Last assessed by {detail.latestPreOpAssessment.assessedBy} at {formatIstDateTime(detail.latestPreOpAssessment.assessedAt)}</p>
                        )}
                        {isActive && (
                            <div className="space-y-3">
                                <div className="flex items-end gap-3 flex-wrap">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">ASA grade</Label>
                                        <select value={asaGrade} onChange={e => setAsaGrade(e.target.value)} className="h-9 mt-1 text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                            <option value="">—</option>
                                            {['I', 'II', 'III', 'IV', 'V', 'VI'].map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    {[
                                        { label: 'NPO confirmed', val: npoConfirmed, set: setNpoConfirmed },
                                        { label: 'Allergies reviewed', val: allergiesReviewed, set: setAllergiesReviewed },
                                        { label: 'Investigations reviewed', val: investigationsReviewed, set: setInvestigationsReviewed },
                                        { label: 'Consent confirmed', val: consentConfirmed, set: setConsentConfirmed },
                                    ].map(({ label, val, set }) => (
                                        <label key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 h-9">
                                            <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="h-4 w-4" /> {label}
                                        </label>
                                    ))}
                                </div>
                                <Textarea value={preOpNotes} onChange={e => setPreOpNotes(e.target.value)} placeholder="Notes" rows={2} />
                                <div className="flex justify-end">
                                    <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={preOpBusy} onClick={submitPreOp}>
                                        {preOpBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save assessment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* WHO Surgical Safety Checklist */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">WHO Surgical Safety Checklist</h2>
                        {(['signIn', 'timeOut', 'signOut'] as const).map((phase, idx) => {
                            const items = phase === 'signIn' ? signInItems : phase === 'timeOut' ? timeOutItems : signOutItems;
                            const setItems = phase === 'signIn' ? setSignInItems : phase === 'timeOut' ? setTimeOutItems : setSignOutItems;
                            const completedAt = phase === 'signIn' ? detail.checklist?.signInCompletedAt : phase === 'timeOut' ? detail.checklist?.timeOutCompletedAt : detail.checklist?.signOutCompletedAt;
                            const label = phase === 'signIn' ? 'Sign-In (before anaesthesia)' : phase === 'timeOut' ? 'Time-Out (before incision)' : 'Sign-Out (before leaving theatre)';
                            const priorDone = idx === 0 || (phase === 'timeOut' ? detail.checklist?.signInCompletedAt : detail.checklist?.timeOutCompletedAt);
                            return (
                                <div key={phase} className={cn('pt-3 mt-3 border-t border-slate-100 first:pt-0 first:mt-0 first:border-t-0')}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-800">{label}</p>
                                        {completedAt ? (
                                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Completed {formatIstDateTime(completedAt)}</Badge>
                                        ) : !priorDone ? (
                                            <span className="text-[11px] text-slate-400">Complete the previous phase first</span>
                                        ) : null}
                                    </div>
                                    {isActive && !completedAt && priorDone && (
                                        <div className="mt-2 space-y-1.5">
                                            {WHO_ITEMS[phase].map(item => (
                                                <label key={item.key} className="flex items-start gap-2 text-xs text-slate-700">
                                                    <input type="checkbox" checked={!!items[item.key]} onChange={e => setItems({ ...items, [item.key]: e.target.checked })} className="h-4 w-4 mt-0.5" />
                                                    {item.label}
                                                </label>
                                            ))}
                                            <div className="flex justify-end pt-1">
                                                <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700" disabled={checklistBusy === phase} onClick={() => submitChecklistPhase(phase)}>
                                                    {checklistBusy === phase ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Complete {label.split(' ')[0]}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Intra-op record */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Intra-op record</h2>
                        {isActive && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Anaesthesia type</Label>
                                        <select value={anaesthesiaType} onChange={e => setAnaesthesiaType(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                            <option value="">—</option>
                                            {['GA', 'SPINAL', 'EPIDURAL', 'LOCAL', 'SEDATION', 'REGIONAL'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Estimated blood loss (ml)</Label>
                                        <Input type="number" min={0} value={estimatedBloodLossMl} onChange={e => setEstimatedBloodLossMl(e.target.value)} className="h-9 mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Surgery start (incision)</Label>
                                        <Input type="datetime-local" value={surgeryStartAt} onChange={e => setSurgeryStartAt(e.target.value)} className="h-9 mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Surgery end (closure)</Label>
                                        <Input type="datetime-local" value={surgeryEndAt} onChange={e => setSurgeryEndAt(e.target.value)} className="h-9 mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Procedure performed (actual)</Label>
                                    <Input value={procedurePerformed} onChange={e => setProcedurePerformed(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Surgical team</Label>
                                    <Input value={surgicalTeam} onChange={e => setSurgicalTeam(e.target.value)} placeholder="Surgeon, assistant, anaesthetist, scrub nurse, circulating nurse" className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Findings</Label>
                                    <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Complications</Label>
                                    <Textarea value={complicationsNotes} onChange={e => setComplicationsNotes(e.target.value)} rows={2} className="mt-1" />
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={intraOpBusy} onClick={submitIntraOp}>
                                        {intraOpBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items used + instrument set issue */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Consumables & implants used</h2>

                        {detail.itemsUsed.length === 0 ? (
                            <p className="text-sm text-slate-400">No items recorded yet.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {detail.itemsUsed.map(u => (
                                    <div key={u.intraOpItemUsageId} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 text-sm flex-wrap">
                                        <span className="font-semibold text-slate-800">{u.itemName} <span className="text-slate-400 font-normal">× {u.qty}</span></span>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px]">{u.category}</Badge>
                                            {u.lotNumber && <Badge variant="outline" className="text-[10px]">Lot {u.lotNumber}</Badge>}
                                            {u.isStockDeducted && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Deducted</Badge>}
                                            {u.isBilled && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Billed</Badge>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isActive && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                <div className="flex items-end gap-2 flex-wrap">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Inventory item</Label>
                                        <select value={pickedInventoryItemId} onChange={e => {
                                            setPickedInventoryItemId(e.target.value);
                                            const item = inventoryItems.find(i => i.inventoryItemId === e.target.value);
                                            if (item) setItemCategory(item.category === 'IMPLANT' ? 'IMPLANT' : 'CONSUMABLE');
                                        }} className="h-9 mt-1 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[180px]">
                                            <option value="">Free text item…</option>
                                            {inventoryItems.map(i => <option key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName} (stock {i.currentStock})</option>)}
                                        </select>
                                    </div>
                                    {!pickedInventoryItemId && (
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-600">Item name</Label>
                                            <Input value={freeItemName} onChange={e => setFreeItemName(e.target.value)} className="h-9 mt-1" />
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Category</Label>
                                        <select value={itemCategory} onChange={e => setItemCategory(e.target.value as 'CONSUMABLE' | 'IMPLANT')} className="h-9 mt-1 text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                            <option value="CONSUMABLE">Consumable</option>
                                            <option value="IMPLANT">Implant</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Qty</Label>
                                        <Input type="number" min={0.001} step="0.001" value={itemQty} onChange={e => setItemQty(e.target.value)} className="h-9 mt-1 w-20" />
                                    </div>
                                    {itemCategory === 'IMPLANT' && (
                                        <>
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-600">Lot #</Label>
                                                <Input value={itemLot} onChange={e => setItemLot(e.target.value)} className="h-9 mt-1 w-28" />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-600">Serial #</Label>
                                                <Input value={itemSerial} onChange={e => setItemSerial(e.target.value)} className="h-9 mt-1 w-28" />
                                            </div>
                                        </>
                                    )}
                                    <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={itemBusy} onClick={submitItemUsage}>
                                        {itemBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />} Add
                                    </Button>
                                </div>

                                <div className="flex items-end gap-2 flex-wrap pt-2 border-t border-slate-50">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-600">Issue a sterile instrument set to this case</Label>
                                        <select value={pickedSetId} onChange={e => setPickedSetId(e.target.value)} className="h-9 mt-1 text-sm border border-slate-200 rounded-lg px-2 bg-white min-w-[200px]">
                                            <option value="">Select a sterile set…</option>
                                            {instrumentSets.map(s => <option key={s.instrumentSetId} value={s.instrumentSetId}>{s.setCode} — {s.setName}</option>)}
                                        </select>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-9 text-xs" disabled={!pickedSetId || issueBusy} onClick={issueInstrumentSet}>
                                        {issueBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />} Issue to OT
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
