import React, { useEffect, useState } from 'react';
import { BedDouble } from 'lucide-react';
import { admissionReferralApi, AdmissionReferralItem } from '@/features/ipd-redesign/services/admissionReferralApi';
import { STATUS_TONE, admissionReferralStatusText } from '@/features/ipd-redesign/utils/referralStatus';

interface Props {
    hospitalId: string;
    patientId: string;
}

/** Shows the current status of the latest "advise admission" a doctor raised for this patient,
 *  e.g. "Advised for Admission: Pending" / "…: Admitted on 12 Jul 2026". Renders nothing if the
 *  patient has never been advised for admission. */
export const AdmissionStatusBanner: React.FC<Props> = ({ hospitalId, patientId }) => {
    const [referral, setReferral] = useState<AdmissionReferralItem | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!hospitalId || !patientId) {
            setReferral(null);
            return;
        }
        admissionReferralApi.list({ hospitalId, patientId })
            .then(res => {
                if (cancelled) return;
                setReferral(res?.referrals?.[0] ?? null);
            })
            .catch(() => { if (!cancelled) setReferral(null); });
        return () => { cancelled = true; };
    }, [hospitalId, patientId]);

    if (!referral) return null;

    return (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${STATUS_TONE[referral.statusCode]}`} style={{ order: -2 }}>
            <BedDouble className="h-4 w-4 shrink-0" />
            <span>{admissionReferralStatusText(referral)}</span>
        </div>
    );
};

export default AdmissionStatusBanner;
