import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { openPrintHtml } from '@/utils/printUtils';
import { buildAdmissionTokenThermal80 } from '@/printTemplates/admissionTokenReceipt';
import { ActiveAdmissionItem } from '../services/admissionApi';

interface Props {
    admission: ActiveAdmissionItem;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    showLabel?: boolean;
}

export const PrintTokenButton: React.FC<Props> = ({ 
    admission, 
    variant = 'outline', 
    size = 'sm', 
    className,
    showLabel = true 
}) => {
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const handlePrint = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!admission.admissionToken) {
            alert('No token assigned to this admission.');
            return;
        }

        const settings = buildPrintSettingsFromHospital(hospitalData);
        
        const html = buildAdmissionTokenThermal80({
            patientId: admission.patientId || '',
            patientName: admission.patientName || admission.patientId || '',
            admissionNo: admission.admissionNo,
            token: admission.admissionToken,
            date: admission.admittedAt,
            doctorName: admission.primaryDoctorName || undefined,
        }, settings);
        
        openPrintHtml(html);
    };

    return (
        <Button 
            variant={variant} 
            size={size} 
            className={className} 
            onClick={handlePrint}
            title={!admission.admissionToken ? "No token assigned" : ""}
        >
            <Printer className={showLabel ? "h-3 w-3 mr-1" : "h-4 w-4"} />
            {showLabel && 'Print Token'}
        </Button>
    );
};
