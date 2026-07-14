import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { dischargeSummaryApi } from '../services/dischargeSummaryApi';
import { irdaiDischargeApi } from '../services/irdaiDischargeApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { openPrintHtml } from '@/utils/printUtils';
import { buildDischargeSummaryA4 } from '@/printTemplates/dischargeSummaryA4';
import type { ActiveAdmissionItem } from '../services/admissionApi';
import { useToast } from '@/hooks/use-toast';
import { dischargeSettingsApi } from '../services/dischargeSettingsApi';
import { DischargePreviewModal } from '@/components/shared/discharge-preview/components/DischargePreviewModal';
import type { DischargeTemplateBoundOptions } from '@/components/shared/discharge-preview/services/dischargePreviewRenderer';
import { useDischargeFieldLayout } from '../hooks/useDischargeFieldLayout';
import { useEffect } from 'react';

interface Props {
    admission: ActiveAdmissionItem;
}

export const PrintDischargeButton: React.FC<Props> = ({ admission }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);
    const [printing, setPrinting] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewOptions, setPreviewOptions] = useState<DischargeTemplateBoundOptions | null>(null);
    // Scoped to the admission's assigned doctor, not whoever is currently logged in — any staff
    // member printing from the dashboard must see the same letterhead the assigned doctor would.
    const { fields: layoutFields, doctorId: layoutDoctorId } = useDischargeFieldLayout(admission.primaryDoctorId || undefined);

    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    useEffect(() => {
        const raw = localStorage.getItem(`discharge-custom-fields:${admission.admissionId}`);
        setCustomFieldValues(raw ? JSON.parse(raw) : {});
    }, [admission.admissionId]);

    const handlePrint = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hospitalData) return;

        setPrinting(true);
        try {
            // 1. Fetch draft
            const draft = await dischargeSummaryApi.getDraft(admission.admissionId, hospitalId);
            if (!draft) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find discharge summary.' });
                return;
            }

            // 2. Fetch clocks/IRDAI info if non-cash
            let physicalDischargeAt = undefined;
            let tpaSplitData = undefined;
            const isCash = admission.payerType === 'CASH';

            try {
                const info = await irdaiDischargeApi.getDischargeInfo(admission.admissionId, hospitalId);
                if (info) {
                    physicalDischargeAt = info.clocks?.milestones.find(m => m.key === 'PHYSICAL_DISCHARGE')?.at;
                    tpaSplitData = info.tpaSplit;
                }
            } catch (err) {
                console.warn('Could not fetch IRDAI info for print:', err);
            }

            // 3. Build data
            const printData = {
                admissionNo: admission.admissionNo,
                patientName: admission.patientName || admission.patientId || '',
                patientId: admission.patientId || '',
                ageGender: admission.patientAge != null ? `${admission.patientAge}${admission.patientSex ?? ''}` : '',
                mobile: admission.mobile || '',
                patientAddress: admission.patientAddress || undefined,
                admittedAt: admission.admittedAt,
                dischargedAt: physicalDischargeAt || draft.signedAt || new Date().toISOString(),
                referredBy: admission.referralName || undefined,
                admittingDiagnosis: draft.admittingDiagnosis || undefined,
                finalDiagnosis: draft.finalDiagnosis || undefined,
                finalDiagnosisIcd10Code: draft.finalDiagnosisIcd10Code || undefined,
                finalDiagnosisIcd10Name: draft.finalDiagnosisIcd10Name || undefined,
                chiefComplaint: draft.chiefComplaint || undefined,
                historyOfPresentIllness: draft.historyOfPresentIllness || undefined,
                courseInHospital: draft.courseInHospital || undefined,
                proceduresPerformed: draft.proceduresPerformed || undefined,
                conditionAtDischarge: draft.conditionAtDischarge || 'STABLE',
                dischargeMedications: draft.dischargeMedications || undefined,
                followUpInstructions: draft.followUpInstructions || undefined,
                followUpDate: draft.followUpDate || undefined,
                dietInstructions: draft.dietInstructions || undefined,
                activityRestrictions: draft.activityRestrictions || undefined,
                additionalNotes: draft.additionalNotes || undefined,
                signedByDoctorName: draft.signedByDoctorName ?? undefined,
                signedAt: draft.signedAt ?? undefined,
                tpaSplit: tpaSplitData && !isCash ? {
                    payableTotal: tpaSplitData.payableTotal,
                    nonPayableTotal: tpaSplitData.nonPayableTotal,
                    unclassifiedTotal: tpaSplitData.unclassifiedTotal,
                    nonPayableLines: tpaSplitData.lines.filter(l => l.isIRDAIPayable === false).map(l => ({ displayName: l.displayName || '—', netAmount: l.netAmount })),
                } : undefined,
            };

            // Check for custom letterhead
            let options: DischargeTemplateBoundOptions | null = null;
            if (layoutDoctorId && hospitalId) {
                const settings = await dischargeSettingsApi.getDischargeSettings(layoutDoctorId, hospitalId);
                if (settings?.uri) {
                    const templateFile = await dischargeSettingsApi.fetchTemplateFile(settings.uri);
                    if (templateFile) {
                        const formatDateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined);
                        
                        options = {
                            templateFile,
                            margins: {
                                top: settings.headerHeight ?? 20,
                                bottom: settings.footerHeight ?? 20,
                                left: settings.contentLeftMargin ?? 20,
                                right: settings.contentRightMargin ?? 20,
                            },
                            overflowStrategy: settings.overFlowPage === false ? 'blank' : 'reuse-template',
                            typography: {
                                family: (settings.fontFamily as 'Helvetica' | 'Times' | 'Courier' | 'Arial' | 'Georgia') ?? 'Helvetica',
                                size: settings.fontSize ?? 11,
                                weight: (settings.fontWeight as 'regular' | 'medium' | 'bold') ?? 'regular',
                                color: settings.textColour ?? '#111827',
                            },
                            payload: {
                                admissionNo: printData.admissionNo,
                                patientName: printData.patientName,
                                patientId: printData.patientId,
                                ageGender: printData.ageGender,
                                admittedAt: printData.admittedAt,
                                dischargedAt: printData.dischargedAt,
                                referredBy: printData.referredBy,
                                conditionAtDischarge: printData.conditionAtDischarge,
                                signedByDoctorName: printData.signedByDoctorName,
                                signedAt: printData.signedAt,
                                fields: {
                                    admittingDiagnosis: printData.admittingDiagnosis,
                                    finalDiagnosis: printData.finalDiagnosis,
                                    finalDiagnosisIcd10: printData.finalDiagnosisIcd10Code
                                        ? `${printData.finalDiagnosisIcd10Code} — ${printData.finalDiagnosisIcd10Name ?? ''}`
                                        : undefined,
                                    chiefComplaint: printData.chiefComplaint,
                                    historyOfPresentIllness: printData.historyOfPresentIllness,
                                    courseInHospital: printData.courseInHospital,
                                    proceduresPerformed: printData.proceduresPerformed,
                                    dischargeMedications: printData.dischargeMedications,
                                    followUpInstructions: printData.followUpInstructions,
                                    followUpDate: formatDateOnly(printData.followUpDate),
                                    dietInstructions: printData.dietInstructions,
                                    activityRestrictions: printData.activityRestrictions,
                                    additionalNotes: printData.additionalNotes,
                                },
                                customFieldValues,
                                tpaSplit: printData.tpaSplit,
                            },
                            printFields: layoutFields.map(f => ({ key: f.key, label: f.label, showInPrint: f.showInPrint })),
                        };
                    }
                }
            }

            if (options) {
                setPreviewOptions(options);
                setPreviewOpen(true);
            } else {
                const settings = buildPrintSettingsFromHospital(hospitalData);
                openPrintHtml(buildDischargeSummaryA4(printData, settings));
            }

        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate print.' });
        } finally {
            setPrinting(false);
        }
    };

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] font-bold rounded-lg shadow-sm bg-white hover:bg-slate-50 transition-all shrink-0 hover:shadow-md hover:border-slate-300" onClick={handlePrint} disabled={printing}>
                {printing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-slate-500" /> : <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-600" />} Print Summary
            </Button>
            {previewOptions && (
                <DischargePreviewModal
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    options={previewOptions}
                />
            )}
        </>
    );
};
