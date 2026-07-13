import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BedDouble } from 'lucide-react';
import { AdmissionReferralItem } from '@/features/ipd-redesign/services/admissionReferralApi';
import { STATUS_TONE, admissionReferralStatusText } from '@/features/ipd-redesign/utils/referralStatus';

interface Props {
    referral?: AdmissionReferralItem | null;
}

/** Compact, presentational-only badge showing a patient's admission-advice status (e.g. "Admitted
 *  on 12 Jul 2026"). Takes the referral as a prop rather than self-fetching — the caller is
 *  expected to bulk-fetch referrals for a whole list and pass the right one per row. Renders
 *  nothing when there is no referral to show. */
export const AdmissionStatusBadge: React.FC<Props> = ({ referral }) => {
    if (!referral) return null;

    return (
        <Badge variant="outline" className={`text-[10px] font-semibold gap-1 whitespace-nowrap ${STATUS_TONE[referral.statusCode]}`}>
            <BedDouble className="h-3 w-3 shrink-0" />
            {admissionReferralStatusText(referral).replace('Advised for Admission: ', '')}
        </Badge>
    );
};

export default AdmissionStatusBadge;
