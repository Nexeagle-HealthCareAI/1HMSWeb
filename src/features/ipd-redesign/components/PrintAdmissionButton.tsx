import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { downloadHtmlAsPdf, openPrintHtml } from '@/utils/printUtils';
import { buildAdmissionConfirmationA4 } from '@/printTemplates/admissionConfirmationA4';
import { ActiveAdmissionItem } from '../services/admissionApi';

interface Props {
    admission: ActiveAdmissionItem;
    mode?: 'print' | 'download';
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    showLabel?: boolean;
}

export const PrintAdmissionButton: React.FC<Props> = ({ 
    admission, 
    mode = 'print', 
    variant = 'outline', 
    size = 'sm', 
    className,
    showLabel = true 
}) => {
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const handlePrint = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        const settings = buildPrintSettingsFromHospital(hospitalData);
        
        const html = buildAdmissionConfirmationA4({
            admissionNo: admission.admissionNo,
            admittedAt: admission.admittedAt,
            patientName: admission.patientName || admission.patientId || '',
            patientId: admission.patientId || '',
            ageGender: admission.patientAge != null ? `${admission.patientAge}${admission.patientSex ?? ''}` : '',
            admissionType: admission.admissionType,
            wardBed: admission.bedCode ? `${admission.wardName ? admission.wardName + ' · ' : ''}${admission.bedCode}` : undefined,
            admittingDoctorName: admission.primaryDoctorName || undefined,
            provisionalDiagnosis: admission.diagnosis || admission.admissionReason,
            payerType: admission.payerType,
            depositExpected: admission.depositExpected,
            attendantName: undefined, // Usually grabbed from full patient profile, but not needed on quick print
            attendantPhone: undefined,
        }, settings);
        
        if (mode === 'download') {
            downloadHtmlAsPdf(html, `admission-confirmation-${admission.admissionNo}.pdf`);
        } else {
            openPrintHtml(html);
        }
    };

    const Icon = mode === 'download' ? Download : Printer;

    return (
        <Button variant={variant} size={size} className={className} onClick={handlePrint}>
            <Icon className={showLabel ? "h-3 w-3 mr-1" : "h-4 w-4"} />
            {showLabel && (mode === 'download' ? 'Download' : 'Print form')}
        </Button>
    );
};
