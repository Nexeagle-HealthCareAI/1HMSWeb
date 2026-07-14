import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Download, Printer, LogOut, Clock3, AlertTriangle, Settings2, Eye, RefreshCcw, Share2, MessageCircle, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { dischargeSummaryApi, type ConditionAtDischarge, type SaveDischargeSummaryFields } from '../services/dischargeSummaryApi';
import { irdaiDischargeApi, type TpaSplit, type IrdaiClocks, type CoverageUtilization } from '../services/irdaiDischargeApi';
import { bedBoardApi } from '../services/bedBoardApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { downloadHtmlAsPdf, openPrintHtml, htmlToPdfBlob } from '@/utils/printUtils';
import { buildDischargeSummaryA4 } from '@/printTemplates/dischargeSummaryA4';
import { API_BASE_URL } from '@/app/api';
import { DischargeNarrativeAssist } from './DischargeNarrativeAssist';
import { LookupAutosuggestField } from './LookupAutosuggestField';
import { Icd10CodePicker } from './Icd10CodePicker';
import { DischargeMedicationsEditor } from './DischargeMedicationsEditor';
import { DischargeFieldLayoutEditor } from './DischargeFieldLayoutEditor';
import { ConsentPanel } from './ConsentPanel';
import { SignaturePad } from './SignaturePad';
import { consentApi } from '../services/consentApi';
import { useDischargeFieldLayout } from '../hooks/useDischargeFieldLayout';
import type { DischargeFieldConfigItem } from '../services/dischargeFieldLayoutApi';
import { dischargeSettingsApi } from '../services/dischargeSettingsApi';
import { DischargePreviewModal } from '@/components/shared/discharge-preview/components/DischargePreviewModal';
import { buildBlankA4TemplateFile, type DischargeTemplateBoundOptions } from '@/components/shared/discharge-preview/services/dischargePreviewRenderer';
import { formatIstDateTime } from '../utils/istDate';
import type { ActiveAdmissionItem } from '../services/admissionApi';

interface Props {
    admission: ActiveAdmissionItem;
    isActive: boolean;
    onDischarged: () => void;
}

const CONDITIONS: ConditionAtDischarge[] = ['STABLE', 'IMPROVED', 'RECOVERED', 'REFERRED', 'LAMA', 'EXPIRED'];
const SEX_LABEL: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };

const EMPTY_FORM: SaveDischargeSummaryFields = {};

export const DischargeSummaryPanel: React.FC<Props> = ({ admission, isActive, onDischarged }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const medicationSearchDoctorId = admission.primaryDoctorId || useAuthStore.getState().doctorId || '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const [loading, setLoading] = useState(true);
    const [isSigned, setIsSigned] = useState(false);
    const [signedByDoctorName, setSignedByDoctorName] = useState<string | null>(null);
    const [signedAt, setSignedAt] = useState<string | null>(null);
    const [form, setForm] = useState<SaveDischargeSummaryFields>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const lastSavedRef = useRef<string>('');
    const [signOpen, setSignOpen] = useState(false);
    const [signing, setSigning] = useState(false);
    const [unsigning, setUnsigning] = useState(false);

    const [dischargeOpen, setDischargeOpen] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [dischargeBusy, setDischargeBusy] = useState(false);

    const [tpaSplit, setTpaSplit] = useState<TpaSplit | null>(null);
    const [clocks, setClocks] = useState<IrdaiClocks | null>(null);
    const [stampingKey, setStampingKey] = useState<'CLAIM_SUBMITTED' | 'INSURER_APPROVAL' | null>(null);

    const [coverageUtilization, setCoverageUtilization] = useState<CoverageUtilization | null>(null);
    const [enhancementMode, setEnhancementMode] = useState<'request' | 'approve' | null>(null);
    const [enhancementAmount, setEnhancementAmount] = useState('');
    const [enhancementBusy, setEnhancementBusy] = useState(false);


    const [lamaOpen, setLamaOpen] = useState(false);
    const [lamaReason, setLamaReason] = useState('');
    const [lamaBusy, setLamaBusy] = useState(false);
    const [lamaTemplateId, setLamaTemplateId] = useState('');
    const [lamaSignedByName, setLamaSignedByName] = useState('');
    const [lamaSignerRelation, setLamaSignerRelation] = useState('Self');
    const [lamaSignatureDataUrl, setLamaSignatureDataUrl] = useState<string | null>(null);

    const [customizeOpen, setCustomizeOpen] = useState(false);
    // Scoped to the admission's assigned doctor, not whoever is currently logged in viewing/
    // editing this discharge summary — a nurse, front-desk user, or a different doctor must see
    // the same field layout and letterhead as the assigned doctor would, not their own (or none).
    const { fields: layoutFields, hasSavedLayout, doctorId: layoutDoctorId } = useDischargeFieldLayout(admission.primaryDoctorId || undefined);
    const layoutByKey = useMemo(() => new Map(layoutFields.map(f => [f.key, f])), [layoutFields]);
    const isVisible = (key: string) => (hasSavedLayout ? layoutByKey.get(key)?.showInPad ?? true : true);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewOptions, setPreviewOptions] = useState<DischargeTemplateBoundOptions | null>(null);

    // Custom field values aren't backed by a DischargeSummary column yet (Phase 1/UI-only pass —
    // real persistence lands with the rest of the backend). Kept per-admission in localStorage
    // purely so a demo doesn't lose data on reload.
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    useEffect(() => {
        const raw = localStorage.getItem(`discharge-custom-fields:${admission.admissionId}`);
        setCustomFieldValues(raw ? JSON.parse(raw) : {});
    }, [admission.admissionId]);
    useEffect(() => {
        localStorage.setItem(`discharge-custom-fields:${admission.admissionId}`, JSON.stringify(customFieldValues));
    }, [customFieldValues, admission.admissionId]);

    const isCash = admission.payerType === 'CASH';
    const isDischarged = admission.statusCode === 'DISCHARGED';

    const load = () => {
        setLoading(true);
        dischargeSummaryApi.getDraft(admission.admissionId)
            .then(draft => {
                if (!draft) return;
                setIsSigned(draft.isSigned);
                setSignedByDoctorName(draft.signedByDoctorName ?? null);
                setSignedAt(draft.signedAt ?? null);
                setForm({
                    admittingDiagnosis: draft.admittingDiagnosis ?? undefined,
                    finalDiagnosis: draft.finalDiagnosis ?? undefined,
                    chiefComplaint: draft.chiefComplaint ?? undefined,
                    historyOfPresentIllness: draft.historyOfPresentIllness ?? undefined,
                    courseInHospital: draft.courseInHospital ?? undefined,
                    proceduresPerformed: draft.proceduresPerformed ?? undefined,
                    conditionAtDischarge: (draft.conditionAtDischarge as ConditionAtDischarge) ?? undefined,
                    dischargeMedications: draft.dischargeMedications ?? undefined,
                    medications: draft.medications ?? [],
                    followUpInstructions: draft.followUpInstructions ?? undefined,
                    followUpDate: draft.followUpDate ?? undefined,
                    dietInstructions: draft.dietInstructions ?? undefined,
                    activityRestrictions: draft.activityRestrictions ?? undefined,
                    additionalNotes: draft.additionalNotes ?? undefined,
                });
            })
            .catch(() => toast({ title: 'Could not load the discharge summary', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admission.admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Snapshot the just-loaded draft as "already saved" once loading settles, so the auto-save
    // effect below doesn't immediately fire for data that just came from the server.
    useEffect(() => {
        if (!loading) lastSavedRef.current = JSON.stringify(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    const reloadCoverageUtilization = () =>
        irdaiDischargeApi.getCoverageUtilization(admission.admissionId).then(setCoverageUtilization).catch(() => setCoverageUtilization(null));

    useEffect(() => {
        if (isCash) return;
        irdaiDischargeApi.getTpaSplit(admission.admissionId).then(setTpaSplit).catch(() => setTpaSplit(null));
        irdaiDischargeApi.getClocks(admission.admissionId).then(setClocks).catch(() => setClocks(null));
        reloadCoverageUtilization();
    }, [admission.admissionId, isCash]); // eslint-disable-line react-hooks/exhaustive-deps

    const setField = (patch: Partial<SaveDischargeSummaryFields>) => setForm(f => ({ ...f, ...patch }));

    const save = async () => {
        setSaving(true);
        try {
            await dischargeSummaryApi.save(admission.admissionId, form);
            lastSavedRef.current = JSON.stringify(form);
            setAutoSaveStatus('saved');
            toast({ title: 'Discharge summary saved.' });
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // Auto-save — same design as the e-prescription pad's AutoSaveHandler (2s debounce, only fires
    // when something actually changed since the last save), reimplemented locally here rather than
    // shared, since EPrescriptionPad's version is hand-rolled around its own data shape.
    useEffect(() => {
        if (loading || isSigned) return;
        const snapshot = JSON.stringify(form);
        if (snapshot === lastSavedRef.current) return;

        const timer = setTimeout(async () => {
            setAutoSaveStatus('saving');
            try {
                await dischargeSummaryApi.save(admission.admissionId, form);
                lastSavedRef.current = snapshot;
                setAutoSaveStatus('saved');
            } catch {
                setAutoSaveStatus('error');
            }
        }, 2000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, loading, isSigned, admission.admissionId]);

    const confirmSign = async () => {
        setSigning(true);
        try {
            await dischargeSummaryApi.save(admission.admissionId, form);
            await dischargeSummaryApi.sign(admission.admissionId);
            toast({ title: 'Discharge summary signed.' });
            setSignOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not sign', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSigning(false);
        }
    };

    const revokeSign = async () => {
        setUnsigning(true);
        try {
            await dischargeSummaryApi.unsign(admission.admissionId);
            toast({ title: 'Signature revoked. The summary is now editable.' });
            load();
        } catch (err) {
            toast({ title: 'Could not revoke signature', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setUnsigning(false);
        }
    };

    const stampMilestone = async (key: 'CLAIM_SUBMITTED' | 'INSURER_APPROVAL') => {
        setStampingKey(key);
        try {
            await irdaiDischargeApi.stampMilestone(admission.admissionId, key);
            toast({ title: 'Milestone recorded.' });
            irdaiDischargeApi.getClocks(admission.admissionId).then(setClocks).catch(() => {});
        } catch (err) {
            toast({ title: 'Could not record milestone', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setStampingKey(null);
        }
    };

    const openEnhancementDialog = (mode: 'request' | 'approve') => {
        setEnhancementMode(mode);
        setEnhancementAmount(mode === 'approve' && coverageUtilization?.enhancedSanctionedAmount != null
            ? String(coverageUtilization.enhancedSanctionedAmount)
            : '');
    };

    const submitEnhancement = async () => {
        if (!enhancementMode) return;
        const amount = enhancementAmount ? Number(enhancementAmount) : undefined;
        if (enhancementMode === 'request' && (!amount || amount <= 0)) {
            toast({ title: 'Enter a valid amount', variant: 'destructive' });
            return;
        }
        setEnhancementBusy(true);
        try {
            if (enhancementMode === 'request') {
                await irdaiDischargeApi.requestEnhancement(admission.admissionId, amount!);
                toast({ title: 'Enhancement request recorded.' });
            } else {
                await irdaiDischargeApi.approveEnhancement(admission.admissionId, amount);
                toast({ title: 'Enhancement approval recorded.' });
            }
            setEnhancementMode(null);
            reloadCoverageUtilization();
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setEnhancementBusy(false);
        }
    };

    const confirmDischarge = async () => {
        setDischargeBusy(true);
        try {
            await bedBoardApi.dischargeAdmission(admission.admissionId, dischargeNotes || undefined);
            toast({ title: 'Patient discharged.' });
            setDischargeOpen(false);
            onDischarged();
        } catch (err) {
            toast({ title: 'Could not discharge', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDischargeBusy(false);
        }
    };

    // Patient left the premises without receiving (or completing) treatment — a distinct exit
    // path from the normal discharge flow. Reuses the existing LAMA status transition (auto-
    // releases the bed, closes the admission) — no separate "zero treatment" concept in the schema.
    const confirmLama = async () => {
        setLamaBusy(true);
        try {
            // Signature capture is best-effort: a missing LAMA consent template (not every
            // hospital has run the seed script yet) or a signing failure never blocks the actual
            // LAMA status transition -- it just falls back to today's reason-only record.
            if (lamaTemplateId && lamaSignedByName.trim()) {
                try {
                    await consentApi.sign(admission.admissionId, lamaTemplateId, {
                        signedByName: lamaSignedByName.trim(),
                        signerRelation: lamaSignerRelation,
                        signatureImageBase64: lamaSignatureDataUrl ?? undefined,
                    });
                } catch {
                    toast({ title: 'Could not record the LAMA consent signature — continuing with the status change.', variant: 'destructive' });
                }
            }
            await bedBoardApi.updateAdmissionStatus(admission.admissionId, 'LAMA', lamaReason || undefined);
            toast({ title: 'Recorded — patient left without treatment.' });
            setLamaOpen(false);
            onDischarged();
        } catch (err) {
            toast({ title: 'Could not record', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setLamaBusy(false);
        }
    };

    // The medication editor writes to `form.medications` (structured rows), not the legacy
    // `form.dischargeMedications` string -- format the rows into print-ready lines here so what the
    // doctor actually entered is what appears on the printed/letterhead summary.
    const formatMedicationsForPrint = (meds?: SaveDischargeSummaryFields['medications']): string | undefined => {
        if (!meds || meds.length === 0) return undefined;
        const lines = meds
            .filter(m => m.medicineName?.trim())
            .map(m => [m.medicineName, m.dosage, m.route, m.frequency, m.durations, m.instructions].filter(Boolean).join(' — '));
        return lines.length > 0 ? lines.join('\n') : undefined;
    };

    const buildPrintData = () => {
        const physicalDischargeAt = clocks?.milestones.find(m => m.key === 'PHYSICAL_DISCHARGE')?.at;
        return {
            admissionNo: admission.admissionNo,
            patientName: admission.patientName || admission.patientId || '',
            patientId: admission.patientId || '',
            ageGender: admission.patientAge != null ? `${admission.patientAge}${admission.patientSex ?? ''}` : '',
            mobile: admission.mobile || '',
            patientAddress: admission.patientAddress || undefined,
            admittedAt: admission.admittedAt,
            dischargedAt: physicalDischargeAt || new Date().toISOString(),
            referredBy: admission.referralName || undefined,
            admittingDiagnosis: form.admittingDiagnosis,
            finalDiagnosis: form.finalDiagnosis,
            finalDiagnosisIcd10Code: form.finalDiagnosisIcd10Code,
            finalDiagnosisIcd10Name: form.finalDiagnosisIcd10Name,
            chiefComplaint: form.chiefComplaint,
            historyOfPresentIllness: form.historyOfPresentIllness,
            courseInHospital: form.courseInHospital,
            proceduresPerformed: form.proceduresPerformed,
            conditionAtDischarge: form.conditionAtDischarge || 'STABLE',
            dischargeMedications: formatMedicationsForPrint(form.medications),
            followUpInstructions: form.followUpInstructions,
            followUpDate: form.followUpDate,
            dietInstructions: form.dietInstructions,
            activityRestrictions: form.activityRestrictions,
            additionalNotes: form.additionalNotes,
            signedByDoctorName: signedByDoctorName ?? undefined,
            signedAt: signedAt ?? undefined,
            tpaSplit: tpaSplit && !isCash ? {
                payableTotal: tpaSplit.payableTotal,
                nonPayableTotal: tpaSplit.nonPayableTotal,
                unclassifiedTotal: tpaSplit.unclassifiedTotal,
                nonPayableLines: tpaSplit.lines.filter(l => l.isIRDAIPayable === false).map(l => ({ displayName: l.displayName || '—', netAmount: l.netAmount })),
            } : undefined,
        };
    };

    // Mints (or refreshes) the same public "view on mobile" link the Share dialog uses, and
    // returns its URL for embedding as a QR directly on the letterhead — always re-uploads so the
    // link reflects the current signed content, not a stale earlier snapshot. Only ever called
    // once signed (see the qrUrl line below), so an unsigned draft never gets a shareable QR baked
    // into it.
    const ensureShareUrl = async (): Promise<string | undefined> => {
        try {
            const settings = buildPrintSettingsFromHospital(hospitalData);
            const html = buildDischargeSummaryA4(buildPrintData(), settings);
            const blob = await htmlToPdfBlob(html);
            const token = await dischargeSummaryApi.uploadPdf(admission.admissionId, blob);
            setShareToken(token);
            return `${API_BASE_URL}/public-discharge/${token}`;
        } catch {
            return undefined;
        }
    };

    // If this doctor+hospital has a Discharge letterhead configured (a template PDF actually
    // uploaded, not just default settings), render through the pdf-lib template-bound renderer —
    // same personalized field layout that drives the workspace form. Without one, allowBlank=true
    // callers (the in-app Preview) still get a real preview drawn on a blank A4 canvas rather than
    // a dead end; allowBlank=false callers (Download/Print) return null so they keep falling back
    // to today's generic hospital-branded HTML print, unchanged.
    const buildLetterheadPreviewOptions = async ({ allowBlank }: { allowBlank: boolean }): Promise<DischargeTemplateBoundOptions | null> => {
        if (!hospitalId) return null;
        const settings = layoutDoctorId ? await dischargeSettingsApi.getDischargeSettings(layoutDoctorId, hospitalId) : null;
        let templateFile = settings?.uri ? await dischargeSettingsApi.fetchTemplateFile(settings.uri) : null;
        if (!templateFile) {
            if (!allowBlank) return null;
            templateFile = await buildBlankA4TemplateFile();
        }

        const data = buildPrintData();
        const formatDateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined);

        return {
            templateFile,
            margins: {
                top: settings?.headerHeight ?? 20,
                bottom: settings?.footerHeight ?? 20,
                left: settings?.contentLeftMargin ?? 20,
                right: settings?.contentRightMargin ?? 20,
            },
            overflowStrategy: settings?.overFlowPage === false ? 'blank' : 'reuse-template',
            typography: {
                family: (settings?.fontFamily as 'Helvetica' | 'Times' | 'Courier' | 'Arial' | 'Georgia') ?? 'Helvetica',
                size: settings?.fontSize ?? 11,
                weight: (settings?.fontWeight as 'regular' | 'medium' | 'bold') ?? 'regular',
                color: settings?.textColour ?? '#111827',
            },
            payload: {
                admissionNo: data.admissionNo,
                patientName: data.patientName,
                patientId: data.patientId,
                patientAge: admission.patientAge,
                patientSex: admission.patientSex ? (SEX_LABEL[admission.patientSex] ?? admission.patientSex) : undefined,
                mobile: data.mobile || undefined,
                patientAddress: data.patientAddress,
                assignedDoctorName: admission.primaryDoctorName || undefined,
                referredBy: data.referredBy,
                admittedAt: data.admittedAt,
                dischargedAt: data.dischargedAt,
                conditionAtDischarge: data.conditionAtDischarge,
                signedByDoctorName: data.signedByDoctorName,
                signedAt: data.signedAt,
                qrUrl: isSigned ? await ensureShareUrl() : undefined,
                fields: {
                    admittingDiagnosis: data.admittingDiagnosis,
                    finalDiagnosis: data.finalDiagnosis,
                    finalDiagnosisIcd10: data.finalDiagnosisIcd10Code
                        ? `${data.finalDiagnosisIcd10Code} — ${data.finalDiagnosisIcd10Name ?? ''}`
                        : undefined,
                    chiefComplaint: data.chiefComplaint,
                    historyOfPresentIllness: data.historyOfPresentIllness,
                    courseInHospital: data.courseInHospital,
                    proceduresPerformed: data.proceduresPerformed,
                    dischargeMedications: data.dischargeMedications,
                    followUpInstructions: data.followUpInstructions,
                    followUpDate: formatDateOnly(data.followUpDate),
                    dietInstructions: data.dietInstructions,
                    activityRestrictions: data.activityRestrictions,
                    additionalNotes: data.additionalNotes,
                },
                customFieldValues,
                tpaSplit: data.tpaSplit,
            },
            printFields: layoutFields.map(f => ({ key: f.key, label: f.label, showInPrint: f.showInPrint })),
        };
    };

    // In-app Preview always shows something — a real letterhead if one's configured, otherwise the
    // same content laid out on a blank A4 canvas (with the configured/default margins applied)
    // rather than a toast-and-nothing dead end.
    const openLetterheadPreview = async () => {
        const options = await buildLetterheadPreviewOptions({ allowBlank: true });
        if (!options) {
            toast({ title: 'Could not load the discharge preview.', variant: 'destructive' });
            return false;
        }
        setPreviewOptions(options);
        setPreviewOpen(true);
        return true;
    };

    // Download/Print only route through the letterhead-bound preview when a real letterhead is
    // configured; without one they keep using today's generic hospital-branded HTML print (nicer
    // for actual output than a blank canvas), unchanged.
    const openLetterheadPreviewIfConfigured = async () => {
        const options = await buildLetterheadPreviewOptions({ allowBlank: false });
        if (!options) return false;
        setPreviewOptions(options);
        setPreviewOpen(true);
        return true;
    };

    const download = async () => {
        if (await openLetterheadPreviewIfConfigured()) return;
        const settings = buildPrintSettingsFromHospital(hospitalData);
        const html = buildDischargeSummaryA4(buildPrintData(), settings);
        await downloadHtmlAsPdf(html, `discharge-summary-${admission.admissionNo}.pdf`);
    };
    const print = async () => {
        if (await openLetterheadPreviewIfConfigured()) return;
        const settings = buildPrintSettingsFromHospital(hospitalData);
        openPrintHtml(buildDischargeSummaryA4(buildPrintData(), settings));
    };

    // "View on mobile" QR + WhatsApp send — uses the standard hospital template (not a doctor's
    // custom letterhead upload, which is an interactive pdf-lib preview flow rather than a byte
    // source this can pull from directly).
    const [shareOpen, setShareOpen] = useState(false);
    const [shareBusy, setShareBusy] = useState(false);
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [whatsAppBusy, setWhatsAppBusy] = useState(false);
    const shareUrl = shareToken ? `${API_BASE_URL}/public-discharge/${shareToken}` : null;

    const openShare = async () => {
        setShareOpen(true);
        if (shareToken) return;
        setShareBusy(true);
        try {
            const settings = buildPrintSettingsFromHospital(hospitalData);
            const html = buildDischargeSummaryA4(buildPrintData(), settings);
            const blob = await htmlToPdfBlob(html);
            const token = await dischargeSummaryApi.uploadPdf(admission.admissionId, blob);
            setShareToken(token);
        } catch (err) {
            toast({ title: 'Could not generate the shareable link', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
            setShareOpen(false);
        } finally {
            setShareBusy(false);
        }
    };

    const sendViaWhatsApp = async () => {
        setWhatsAppBusy(true);
        try {
            await dischargeSummaryApi.sendWhatsApp(admission.admissionId);
            toast({ title: 'Discharge summary sent via WhatsApp.' });
        } catch (err) {
            toast({ title: 'Could not send via WhatsApp', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setWhatsAppBusy(false);
        }
    };

    const copyShareLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Link copied.' });
        } catch {
            toast({ title: 'Could not copy the link', variant: 'destructive' });
        }
    };

    // One case per DEFAULT_DISCHARGE_FIELDS built-in key — visibility/label/order come from the
    // doctor's saved layout (see isVisible/layoutByKey above); what's INSIDE each case is unchanged
    // from before personalization existed.
    const renderBuiltinField = (key: string, label: string): React.ReactNode => {
        switch (key) {
            case 'admittingDiagnosis':
                return <LookupAutosuggestField label={label} value={form.admittingDiagnosis} readOnly={isSigned} onChange={v => setField({ admittingDiagnosis: v })} lookupType="DIAGNOSIS" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} />;
            case 'finalDiagnosis':
                return <LookupAutosuggestField label={`${label} *`} value={form.finalDiagnosis} readOnly={isSigned} onChange={v => setField({ finalDiagnosis: v })} lookupType="DIAGNOSIS" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} />;
            case 'finalDiagnosisIcd10':
                return (
                    <Icd10CodePicker
                        label={label}
                        code={form.finalDiagnosisIcd10Code}
                        name={form.finalDiagnosisIcd10Name}
                        readOnly={isSigned}
                        onSelect={(code, name) => setField({ finalDiagnosisIcd10Code: code, finalDiagnosisIcd10Name: name })}
                        onClear={() => setField({ finalDiagnosisIcd10Code: undefined, finalDiagnosisIcd10Name: undefined })}
                        hospitalId={hospitalId}
                        doctorId={medicationSearchDoctorId}
                    />
                );
            case 'chiefComplaint':
                return <LookupAutosuggestField label={label} value={form.chiefComplaint} readOnly={isSigned} onChange={v => setField({ chiefComplaint: v })} lookupType="CHIEF_COMPLAINT" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} />;
            case 'conditionAtDischarge':
                return (
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">{label} *</Label>
                        {isSigned ? (
                            <p className="text-base mt-1.5 text-slate-800">{form.conditionAtDischarge ?? '—'}</p>
                        ) : (
                            <select value={form.conditionAtDischarge ?? ''} onChange={e => setField({ conditionAtDischarge: e.target.value as ConditionAtDischarge })}
                                className="h-12 mt-1.5 w-full text-base border border-slate-200 rounded-xl px-3 bg-slate-50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow">
                                <option value="">— Select —</option>
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                );
            case 'historyOfPresentIllness':
                return <TextField label={label} value={form.historyOfPresentIllness} readOnly={isSigned} onChange={v => setField({ historyOfPresentIllness: v })} />;
            case 'courseInHospital':
                return (
                    <div>
                        <TextField label={label} value={form.courseInHospital} readOnly={isSigned} onChange={v => setField({ courseInHospital: v })} rows={6} />
                        {!isSigned && <DischargeNarrativeAssist admissionId={admission.admissionId} onApply={v => setField({ courseInHospital: v })} />}
                    </div>
                );
            case 'proceduresPerformed':
                return <LookupAutosuggestField label={label} value={form.proceduresPerformed} readOnly={isSigned} onChange={v => setField({ proceduresPerformed: v })} lookupType="PROCEDURE" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} multiline />;
            case 'dischargeMedications':
                return (
                    <DischargeMedicationsEditor
                        value={form.medications ?? []}
                        onChange={meds => setField({ medications: meds })}
                        hospitalId={hospitalId}
                        doctorId={medicationSearchDoctorId}
                        disabled={isSigned}
                    />
                );
            case 'followUpInstructions':
                return <LookupAutosuggestField label={label} value={form.followUpInstructions} readOnly={isSigned} onChange={v => setField({ followUpInstructions: v })} lookupType="FOLLOW_UP_INSTRUCTIONS" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} multiline rows={2} />;
            case 'followUpDate':
                return (
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
                        <Input type="date" value={form.followUpDate ? form.followUpDate.substring(0, 10) : ''} onChange={e => setField({ followUpDate: e.target.value || undefined })}
                            className="h-12 mt-1.5 text-base bg-slate-50" disabled={isSigned} />
                    </div>
                );
            case 'dietInstructions':
                return <LookupAutosuggestField label={label} value={form.dietInstructions} readOnly={isSigned} onChange={v => setField({ dietInstructions: v })} lookupType="DIET_INSTRUCTIONS" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} multiline rows={2} />;
            case 'activityRestrictions':
                return <LookupAutosuggestField label={label} value={form.activityRestrictions} readOnly={isSigned} onChange={v => setField({ activityRestrictions: v })} lookupType="ACTIVITY_RESTRICTIONS" hospitalId={hospitalId} doctorId={medicationSearchDoctorId} multiline rows={2} />;
            case 'additionalNotes':
                return <TextField label={label} value={form.additionalNotes} readOnly={isSigned} onChange={v => setField({ additionalNotes: v })} rows={2} />;
            default:
                return null;
        }
    };

    const renderCustomField = (f: DischargeFieldConfigItem): React.ReactNode => {
        const value = customFieldValues[f.key] ?? '';
        const setValue = (v: string) => setCustomFieldValues(prev => ({ ...prev, [f.key]: v }));
        if (isSigned) {
            return (
                <div>
                    <Label className="text-[11px] font-semibold text-slate-600">{f.label}</Label>
                    <p className={cn('text-base mt-1.5 text-slate-800 whitespace-pre-wrap', !value && 'text-slate-400')}>{value || '—'}</p>
                </div>
            );
        }
        switch (f.type) {
            case 'paragraph':
                return <TextField label={f.label} value={value} readOnly={false} onChange={setValue} rows={3} />;
            case 'number':
                return <div><Label className="text-[11px] font-semibold text-slate-600">{f.label}</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-12 mt-1.5 text-base bg-slate-50" /></div>;
            case 'date':
                return <div><Label className="text-[11px] font-semibold text-slate-600">{f.label}</Label><Input type="date" value={value} onChange={e => setValue(e.target.value)} className="h-12 mt-1.5 text-base bg-slate-50" /></div>;
            case 'boolean':
                return (
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">{f.label}</Label>
                        <select value={value} onChange={e => setValue(e.target.value)} className="h-12 mt-1.5 w-full text-base border border-slate-200 rounded-xl px-3 bg-slate-50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow">
                            <option value="">— Select —</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                );
            case 'select':
                return (
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">{f.label}</Label>
                        <select value={value} onChange={e => setValue(e.target.value)} className="h-12 mt-1.5 w-full text-base border border-slate-200 rounded-xl px-3 bg-slate-50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow">
                            <option value="">— Select —</option>
                            {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                );
            default:
                return <Field label={f.label} value={value} readOnly={false} onChange={setValue} />;
        }
    };

    const getBuiltInSpan = (key: string) => {
        // Fields that need real room to read/type stay full-width; short, naturally-compact
        // controls (selects, date pickers) pair up two-per-row (grid-flow-row-dense on the
        // container pulls a later compact field up to fill the gap even when it isn't adjacent in
        // the doctor's saved field order) so the form isn't one long column of tiny fields.
        const fullWidth = ['admittingDiagnosis', 'finalDiagnosis', 'chiefComplaint', 'courseInHospital', 'historyOfPresentIllness', 'dischargeMedications', 'proceduresPerformed', 'followUpInstructions', 'dietInstructions', 'activityRestrictions', 'additionalNotes'];
        return fullWidth.includes(key) ? 'col-span-1 md:col-span-2' : 'col-span-1';
    };

    const getCustomSpan = (f: DischargeFieldConfigItem) => {
        return f.type === 'paragraph' ? 'col-span-1 md:col-span-2' : 'col-span-1';
    };

    if (loading) {
        return <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Discharge Summary</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={() => setCustomizeOpen(true)}>
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Customize
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={openLetterheadPreview}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </Button>
                    {isSigned && (
                        <>
                            <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={print}><Printer className="h-3.5 w-3.5 mr-1.5" /> Print</Button>
                            <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={openShare}><Share2 className="h-3.5 w-3.5 mr-1.5" /> Share</Button>
                            <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold" onClick={download}><Download className="h-3.5 w-3.5 mr-1.5" /> Download bundle</Button>
                        </>
                    )}
                </div>
            </div>

            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Share discharge summary</DialogTitle>
                        <DialogDescription>Scan to view as a PDF on any phone, anytime — or send it straight to WhatsApp.</DialogDescription>
                    </DialogHeader>
                    {shareBusy ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" /> Preparing the shareable link…
                        </div>
                    ) : shareUrl ? (
                        <div className="flex flex-col items-center gap-4 py-2">
                            <div className="p-3 rounded-xl border border-slate-200 bg-white">
                                <QRCodeSVG value={shareUrl} size={168} level="H" />
                            </div>
                            <div className="flex items-center gap-2 w-full">
                                <Input value={shareUrl} readOnly className="h-10 text-xs font-mono" />
                                <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={copyShareLink}><Copy className="h-3.5 w-3.5" /></Button>
                            </div>
                            <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-semibold" disabled={whatsAppBusy} onClick={sendViaWhatsApp}>
                                {whatsAppBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />} Send via WhatsApp
                            </Button>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Customize discharge summary fields</DialogTitle>
                        <DialogDescription>Applies to every discharge summary you fill in or print, across all your hospitals.</DialogDescription>
                    </DialogHeader>
                    <DischargeFieldLayoutEditor />
                </DialogContent>
            </Dialog>

            <DischargePreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                options={previewOptions}
                fileName={`discharge-summary-${admission.admissionNo}.pdf`}
            />

            {isSigned && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-emerald-800">Signed by {signedByDoctorName ?? '—'} on {signedAt ? formatIstDateTime(signedAt) : '—'}</span>
                    </div>
                    {isActive && (
                        <Button variant="outline" size="sm" onClick={revokeSign} disabled={unsigning} className="h-9 sm:h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-100 self-start sm:self-auto">
                            {unsigning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />} Edit Again
                        </Button>
                    )}
                </div>
            )}

            <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:grid-flow-row-dense">
                    {layoutFields.filter(f => f.builtIn && f.key !== 'nonPayableAnnexure' && isVisible(f.key)).map(f => (
                        <div key={f.key} style={{ order: f.order }} className={getBuiltInSpan(f.key)}>
                            {renderBuiltinField(f.key, f.label)}
                        </div>
                    ))}
                    {layoutFields.filter(f => !f.builtIn && isVisible(f.key)).map(f => (
                        <div key={f.key} style={{ order: f.order }} className={getCustomSpan(f)}>
                            {renderCustomField(f)}
                        </div>
                    ))}
                </div>

                {!isSigned && isActive && (
                    <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 pt-2 border-t border-slate-100">
                        {!saving && autoSaveStatus === 'saving' && (
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
                        )}
                        {!saving && autoSaveStatus === 'saved' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>
                        )}
                        {!saving && autoSaveStatus === 'error' && (
                            <span className="text-xs text-red-500" title="Could not save. It will retry automatically on your next edit.">Save failed</span>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                            <Button variant="outline" className="h-11 sm:h-10" disabled={saving} onClick={save}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save draft
                            </Button>
                            <Button className="h-11 sm:h-10 bg-amber-600 hover:bg-amber-700" onClick={() => setSignOpen(true)}>
                                <Check className="h-4 w-4 mr-2" /> Sign & finalize
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {!isCash && coverageUtilization?.isApproachingLimit && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">
                                Approaching sanctioned limit — ₹{coverageUtilization.runningTotal.toLocaleString('en-IN')} of ₹{coverageUtilization.effectiveSanctionedAmount.toLocaleString('en-IN')} billed
                                {coverageUtilization.utilizationPercent != null ? ` (${coverageUtilization.utilizationPercent}%)` : ''}.
                            </p>
                            {coverageUtilization.enhancementRequestedAt && !coverageUtilization.enhancementApprovedAt ? (
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                    Enhancement to ₹{coverageUtilization.enhancedSanctionedAmount?.toLocaleString('en-IN')} requested {formatIstDateTime(coverageUtilization.enhancementRequestedAt)} — awaiting approval.
                                </p>
                            ) : (
                                <p className="text-[11px] text-amber-700 mt-0.5">Consider requesting a sanction enhancement from the insurer/TPA.</p>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex gap-2">
                        {coverageUtilization.enhancementRequestedAt && !coverageUtilization.enhancementApprovedAt && (
                            <Button size="sm" variant="outline" className="h-9 sm:h-8 text-[11px] border-amber-300" onClick={() => openEnhancementDialog('approve')}>
                                Mark approved
                            </Button>
                        )}
                        <Button size="sm" className="h-9 sm:h-8 text-[11px] bg-amber-600 hover:bg-amber-700" onClick={() => openEnhancementDialog('request')}>
                            Request enhancement
                        </Button>
                    </div>
                </div>
            )}

            {!isCash && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">IRDAI Discharge Clocks</h3>
                        {clocks?.message && clocks.milestones.length === 0 ? (
                            <p className="text-sm text-slate-400">{clocks.message}</p>
                        ) : (
                            <div className="space-y-2">
                                {(clocks?.milestones ?? []).map(m => (
                                    <div key={m.key} className="flex items-center justify-between gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-slate-700">{m.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                if (m.at) {
                                                    return <span className="text-[11px] text-slate-500">{formatIstDateTime(m.at)}{m.durationFromPreviousMinutes != null ? ` (+${m.durationFromPreviousMinutes}m)` : ''}</span>;
                                                }
                                                const stampableKey = m.key === 'CLAIM_SUBMITTED' || m.key === 'INSURER_APPROVAL' ? m.key : null;
                                                if (stampableKey && isActive) {
                                                    return (
                                                        <Button size="sm" variant="outline" className="h-8 sm:h-7 text-[11px]" disabled={stampingKey === stampableKey} onClick={() => stampMilestone(stampableKey)}>
                                                            {stampingKey === stampableKey ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                                            Mark {stampableKey === 'CLAIM_SUBMITTED' ? 'submitted' : 'approved'}
                                                        </Button>
                                                    );
                                                }
                                                return <span className="text-[11px] text-slate-300">—</span>;
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">TPA Payable / Non-Payable Split</h3>
                        {tpaSplit ? (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                                    <p className="text-[9px] font-bold uppercase text-emerald-600">Payable</p>
                                    <p className="text-sm font-black text-emerald-800">₹{tpaSplit.payableTotal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
                                    <p className="text-[9px] font-bold uppercase text-rose-600">Non-Payable</p>
                                    <p className="text-sm font-black text-rose-800">₹{tpaSplit.nonPayableTotal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                                    <p className="text-[9px] font-bold uppercase text-slate-500">Unclassified</p>
                                    <p className="text-sm font-black text-slate-700">₹{tpaSplit.unclassifiedTotal.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No charges to split yet.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <ConsentPanel admissionId={admission.admissionId} isActive={isActive} prefilterTypeCode="DISCHARGE" />
            </div>

            {isActive && !isDischarged && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-slate-600">Discharge is a separate action from signing the summary — sign whenever ready, discharge when the patient physically leaves.</p>
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 shrink-0">
                        <Button variant="outline" className="h-11 sm:h-10 text-slate-500 hover:text-rose-600" onClick={() => {
                            setLamaReason(''); setLamaTemplateId(''); setLamaSignedByName(''); setLamaSignerRelation('Self'); setLamaSignatureDataUrl(null);
                            setLamaOpen(true);
                            consentApi.getTemplates('LAMA').then(t => setLamaTemplateId(t[0]?.consentTemplateId ?? '')).catch(() => setLamaTemplateId(''));
                        }}>
                            Left without treatment
                        </Button>
                        <Button className="h-11 sm:h-10 bg-amber-600 hover:bg-amber-700 font-semibold" onClick={() => { setDischargeNotes(''); setDischargeOpen(true); }}>
                            <LogOut className="h-4 w-4 mr-2" /> Discharge now
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={signOpen} onOpenChange={setSignOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sign discharge summary?</DialogTitle>
                        <DialogDescription>This locks the summary from further edits. Final diagnosis and condition at discharge are required.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setSignOpen(false)}>Cancel</Button>
                        <Button disabled={signing} className="h-11 sm:h-10 bg-amber-600 hover:bg-amber-700" onClick={confirmSign}>
                            {signing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Sign & finalize
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={enhancementMode !== null} onOpenChange={open => { if (!open) setEnhancementMode(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{enhancementMode === 'approve' ? 'Record enhancement approval' : 'Request sanction enhancement'}</DialogTitle>
                        <DialogDescription>
                            {enhancementMode === 'approve'
                                ? 'Confirm the amount the insurer/TPA sanctioned. Leave as-is if it matches what was requested.'
                                : 'Manual internal tracking only — record the new total sanctioned amount being requested from the insurer/TPA.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">
                            {enhancementMode === 'approve' ? 'Approved sanctioned amount' : 'Requested sanctioned amount'}
                        </Label>
                        <Input type="number" min={0} value={enhancementAmount} onChange={e => setEnhancementAmount(e.target.value)} className="h-9 mt-1" placeholder="₹" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setEnhancementMode(null)}>Cancel</Button>
                        <Button disabled={enhancementBusy} className="h-11 sm:h-10 bg-amber-600 hover:bg-amber-700" onClick={submitEnhancement}>
                            {enhancementBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Discharge {admission.patientName || 'patient'}?</DialogTitle>
                        <DialogDescription>This closes the admission and releases the bed.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                        <Textarea rows={3} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setDischargeOpen(false)}>Cancel</Button>
                        <Button disabled={dischargeBusy} className="h-11 sm:h-10 bg-amber-600 hover:bg-amber-700" onClick={confirmDischarge}>
                            {dischargeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={lamaOpen} onOpenChange={setLamaOpen}>
                <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{admission.patientName || 'Patient'} left without treatment?</DialogTitle>
                        <DialogDescription>Records the admission as LAMA (left against medical advice), closes it, and releases the bed. This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                        <Textarea rows={3} value={lamaReason} onChange={e => setLamaReason(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    {lamaTemplateId ? (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Signed by</Label>
                                    <Input value={lamaSignedByName} onChange={e => setLamaSignedByName(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-600">Relation</Label>
                                    <select value={lamaSignerRelation} onChange={e => setLamaSignerRelation(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                        {['Self', 'Father', 'Mother', 'Spouse', 'Guardian', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <SignaturePad onChange={setLamaSignatureDataUrl} />
                            <p className="text-[11px] text-slate-400">Signature is optional but recommended — it's attached as a LAMA consent record documenting that the risks of leaving early were explained.</p>
                        </>
                    ) : (
                        <p className="text-[11px] text-amber-600">No LAMA consent template is configured for this hospital yet — this will only record the reason above.</p>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setLamaOpen(false)}>Cancel</Button>
                        <Button disabled={lamaBusy} className="h-11 sm:h-10 bg-rose-600 hover:bg-rose-700" onClick={confirmLama}>
                            {lamaBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Field: React.FC<{ label: string; value?: string; readOnly: boolean; onChange: (v: string) => void }> = ({ label, value, readOnly, onChange }) => (
    <div className="flex flex-col h-full">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
        {readOnly ? (
            <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 shadow-sm">
                <p className="text-base text-slate-800 font-medium">{value || '—'}</p>
            </div>
        ) : (
            <Input
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                className="h-12 text-base bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow rounded-xl"
            />
        )}
    </div>
);

const TextField: React.FC<{ label: string; value?: string; readOnly: boolean; onChange: (v: string) => void; rows?: number }> = ({ label, value, readOnly, onChange, rows = 3 }) => (
    <div className="flex flex-col h-full">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
        {readOnly ? (
            <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-xl p-4 shadow-sm">
                <p className={cn('text-base text-slate-800 whitespace-pre-wrap font-medium', !value && 'text-slate-400 italic')}>{value || '—'}</p>
            </div>
        ) : (
            <Textarea
                rows={rows}
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                className="text-base leading-relaxed bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow rounded-xl"
            />
        )}
    </div>
);
