import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { openPrintHtml } from '@/utils/printUtils';
import { buildSurgeryCaseA4 } from '@/printTemplates/surgeryCaseA4';
import type { SurgeryCasePrintData } from '@/types/print';
import type { ActiveAdmissionItem } from '../services/admissionApi';
import type { SurgeryCaseDetail } from '../services/surgeryCaseApi';
import { WHO_CHECKLIST_PHASES } from './surgeryChecklistItems';
import { useToast } from '@/hooks/use-toast';

interface Props {
    admission: ActiveAdmissionItem;
    detail: SurgeryCaseDetail;
}

export const PrintSurgeryCaseButton: React.FC<Props> = ({ admission, detail }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);
    const [printing, setPrinting] = useState(false);

    const handlePrint = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hospitalData) { toast({ variant: 'destructive', title: 'Error', description: 'Hospital details not loaded yet.' }); return; }

        setPrinting(true);
        try {
            const data: SurgeryCasePrintData = {
                admissionNo: admission.admissionNo,
                patientName: admission.patientName || admission.patientId || '',
                patientId: admission.patientId || '',
                ageGender: admission.patientAge != null ? `${admission.patientAge}${admission.patientSex ?? ''}` : '',
                mobile: admission.mobile || undefined,
                wardBed: admission.wardName ? `${admission.wardName}${admission.bedCode ? ` · ${admission.bedCode}` : ''}` : undefined,
                procedureName: detail.procedureName,
                surgeryType: detail.surgeryType,
                urgency: detail.urgency,
                statusCode: detail.statusCode,
                surgeonName: detail.surgeonName,
                anaesthetistName: detail.anaesthetistName,
                cancelledReason: detail.cancelledReason,
                booking: detail.booking ? {
                    theatreName: detail.booking.theatreName,
                    scheduledStart: detail.booking.scheduledStart,
                    scheduledEnd: detail.booking.scheduledEnd,
                    statusCode: detail.booking.statusCode,
                } : null,
                preOp: detail.latestPreOpAssessment ? {
                    asaGrade: detail.latestPreOpAssessment.asaGrade,
                    npoConfirmed: detail.latestPreOpAssessment.npoConfirmed,
                    allergiesReviewed: detail.latestPreOpAssessment.allergiesReviewed,
                    investigationsReviewed: detail.latestPreOpAssessment.investigationsReviewed,
                    consentConfirmed: detail.latestPreOpAssessment.consentConfirmed,
                    notes: detail.latestPreOpAssessment.notes,
                    assessedBy: detail.latestPreOpAssessment.assessedBy,
                    assessedAt: detail.latestPreOpAssessment.assessedAt,
                } : null,
                checklistPhases: WHO_CHECKLIST_PHASES.map(phase => ({
                    label: phase.label,
                    completedAt: phase.key === 'signIn' ? detail.checklist?.signInCompletedAt : phase.key === 'timeOut' ? detail.checklist?.timeOutCompletedAt : detail.checklist?.signOutCompletedAt,
                    completedBy: phase.key === 'signIn' ? detail.checklist?.signInCompletedBy : phase.key === 'timeOut' ? detail.checklist?.timeOutCompletedBy : detail.checklist?.signOutCompletedBy,
                    items: phase.items.map(item => ({
                        label: item.label,
                        checked: !!(phase.key === 'signIn' ? detail.checklist?.signInItems : phase.key === 'timeOut' ? detail.checklist?.timeOutItems : detail.checklist?.signOutItems)?.[item.key],
                    })),
                })),
                intraOp: detail.intraOpRecord ? {
                    anaesthesiaType: detail.intraOpRecord.anaesthesiaType,
                    surgeryStartAt: detail.intraOpRecord.surgeryStartAt,
                    surgeryEndAt: detail.intraOpRecord.surgeryEndAt,
                    estimatedBloodLossMl: detail.intraOpRecord.estimatedBloodLossMl,
                    findings: detail.intraOpRecord.findings,
                    procedurePerformed: detail.intraOpRecord.procedurePerformed,
                    surgicalTeam: detail.intraOpRecord.surgicalTeam,
                    complicationsNotes: detail.intraOpRecord.complicationsNotes,
                } : null,
                itemsUsed: detail.itemsUsed.map(u => ({
                    itemName: u.itemName, category: u.category, qty: u.qty, lotNumber: u.lotNumber, serialNumber: u.serialNumber,
                })),
            };

            const settings = buildPrintSettingsFromHospital(hospitalData);
            openPrintHtml(buildSurgeryCaseA4(data, settings));
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Button
            size="sm" variant="outline"
            className="h-10 sm:h-8 text-xs shrink-0"
            onClick={handlePrint} disabled={printing}
        >
            {printing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Printer className="h-3.5 w-3.5 mr-1.5" />} Print record
        </Button>
    );
};
