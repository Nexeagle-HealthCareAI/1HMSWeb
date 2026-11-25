import { useDischargeCustomFields } from '../hooks/useDischargeCustomFields';
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
import { useDoctorCredentials } from '../hooks/useDoctorCredentials';
import { useEffect } from 'react';
import { generateDefaultLetterheadTemplate } from '@/components/shared/prescription-preview';
import { doctorApi } from '@/features/doctor/services/doctorApi';
import { parseTranslations, hasTranslation, translationLanguage } from '../utils/dischargeSections';

interface Props {
    admission: ActiveAdmissionItem;
}

const SEX_LABEL: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };

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
    const doctorCredentials = useDoctorCredentials(layoutDoctorId);

    // Read-only here: the print button never writes custom fields, it only prints what was saved.
    const { values: customFieldValues } = useDischargeCustomFields(admission.admissionId, true);

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

            // Patient advice in the hospital's second language, if it prints one.
            const prefs = await dischargeSummaryApi.getHospitalPreferences(hospitalId).catch(() => null);
            // English by default; a translation prints (in brackets) only when one was added to this summary.
            const allTranslations = parseTranslations(draft.patientAdviceTranslationsJson);
            const lang = translationLanguage(prefs?.patientLanguage, allTranslations, prefs?.languageOptions ?? []);
            const translated = hasTranslation(allTranslations, lang) ? allTranslations[lang] : undefined;
            const secondLanguage = translated
                ? { code: lang, name: prefs?.languageOptions.find(l => l.code === lang)?.name ?? lang, fields: { ...translated } }
                : undefined;

            // 3. Build data
            const medicationRows = (draft.medications ?? []).filter(m => m.medicineName?.trim()).map(m => ({
                name: m.medicineName!.trim(), dose: m.dosage, route: m.route, frequency: m.frequency, duration: m.durations, instructions: m.instructions,
            }));
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
                // The medicine rows are what staff enter; the legacy text is only a fallback for old summaries.
                dischargeMedications: medicationRows.length
                    ? medicationRows.map(m => [m.name, m.dose, m.route, m.frequency, m.duration, m.instructions].filter(Boolean).join(' — ')).join('\n')
                    : draft.dischargeMedications || undefined,
                medications: medicationRows,
                consultant: admission.primaryDoctorName || undefined,
                wardBed: admission.bedCode ? `${admission.wardName ? `${admission.wardName} · ` : ''}${admission.bedCode}` : undefined,
                payer: admission.payerName ? `${admission.payerName} (${admission.payerType})` : admission.payerType,
                hospitalPhone: buildPrintSettingsFromHospital(hospitalData).phone || undefined,
                doctorQualification: doctorCredentials.qualification,
                doctorSpeciality: doctorCredentials.speciality,
                doctorRegistration: doctorCredentials.registration,
                followUpInstructions: draft.followUpInstructions || undefined,
                followUpDate: draft.followUpDate || undefined,
                dietInstructions: draft.dietInstructions || undefined,
                activityRestrictions: draft.activityRestrictions || undefined,
                additionalNotes: draft.additionalNotes || undefined,
                keyInvestigations: draft.keyInvestigations || undefined,
                warningSigns: draft.warningSigns || undefined,
                secondLanguage,
                signedByDoctorName: draft.signedByDoctorName ?? undefined,
                signedAt: draft.signedAt ?? undefined,
                tpaSplit: tpaSplitData && !isCash ? {
                    payableTotal: tpaSplitData.payableTotal,
                    nonPayableTotal: tpaSplitData.nonPayableTotal,
                    unclassifiedTotal: tpaSplitData.unclassifiedTotal,
                    nonPayableLines: tpaSplitData.lines.filter(l => l.isIRDAIPayable === false).map(l => ({ displayName: l.displayName || '—', netAmount: l.netAmount })),
                } : undefined,
            };

            // Check for a custom or system-default letterhead
            let options: DischargeTemplateBoundOptions | null = null;
            if (layoutDoctorId && hospitalId) {
                // The doctor's own letterhead, else the hospital's.
                const settings = await dischargeSettingsApi.getEffectiveDischargeSettings(layoutDoctorId, hospitalId);
                let templateFile: File | null = null;
                if (settings?.useSystemDefaultLetterhead) {
                    const doctorProfile = await doctorApi.getDoctorProfile(layoutDoctorId).catch(() => null);
                    templateFile = await generateDefaultLetterheadTemplate({
                        layout: {
                            margins: {
                                top: settings.headerHeight ?? 20,
                                bottom: settings.footerHeight ?? 20,
                                left: settings.contentLeftMargin ?? 20,
                                right: settings.contentRightMargin ?? 20,
                            },
                            headerHeight: 0,
                            footerHeight: 0,
                            overflowStrategy: 'reuse-template',
                        },
                        hospital: hospitalData && {
                            name: hospitalData.name,
                            location: hospitalData.location,
                            city: hospitalData.city,
                            state: hospitalData.state,
                            pincode: hospitalData.pincode,
                            contact: hospitalData.contact,
                            alternateContact: hospitalData.alternateContact,
                            email: hospitalData.email,
                            website: hospitalData.website,
                            registrationNumber: hospitalData.registrationNumber,
                            nabhNumber: hospitalData.nabhNumber,
                        },
                        doctor: {
                            name: admission.primaryDoctorName || null,
                            qualification: doctorProfile?.qualifications?.length ? doctorProfile.qualifications.join(', ') : null,
                            specialization: doctorProfile?.primaryMedicalSpecialityName ?? null,
                            department: doctorProfile?.primaryDepartmentName ?? null,
                            registration: doctorProfile?.licenseNumber ?? null,
                            medicalCouncil: doctorProfile?.medicalCouncil ?? null,
                            registrationYear: doctorProfile?.registrationYear ?? null,
                            experienceYears: doctorProfile?.experienceYears ?? null,
                        },
                    });
                } else if (settings?.uri) {
                    templateFile = await dischargeSettingsApi.fetchTemplateFile(settings.uri);
                }
                if (templateFile) {
                        const formatDateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined);

                        options = {
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
                                admissionNo: printData.admissionNo,
                                patientName: printData.patientName,
                                patientId: printData.patientId,
                                patientAge: admission.patientAge,
                                patientSex: admission.patientSex ? (SEX_LABEL[admission.patientSex] ?? admission.patientSex) : undefined,
                                mobile: printData.mobile || undefined,
                                patientAddress: printData.patientAddress,
                                assignedDoctorName: admission.primaryDoctorName || undefined,
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
                                    keyInvestigations: printData.keyInvestigations,
                                    warningSigns: printData.warningSigns,
                                },
                                customFieldValues,
                                medications: printData.medications,
                                wardBed: printData.wardBed,
                                payer: printData.payer,
                                hospitalPhone: printData.hospitalPhone,
                                doctorQualification: printData.doctorQualification,
                                doctorSpeciality: printData.doctorSpeciality,
                                doctorRegistration: printData.doctorRegistration,
                                tpaSplit: printData.tpaSplit,
                                secondLanguage: printData.secondLanguage,
                            },
                            printFields: layoutFields.map(f => ({ key: f.key, label: f.label, showInPrint: f.showInPrint })),
                        };
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
