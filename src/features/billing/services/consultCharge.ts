import { ipdBillingService, type PaymentMode } from './ipdBillingService';
import { doctorFeeService } from '@/features/hospital/services/doctorFeeService';

// The booking popup uses lowercase payment modes; the payments API expects uppercase.
export const toPaymentMode = (mode?: string): PaymentMode => {
    switch ((mode ?? '').toLowerCase()) {
        case 'upi': return 'UPI';
        case 'card': return 'CARD';
        case 'bank': return 'BANK';
        case 'insurance': return 'INSURANCE';
        case 'cash':
        default: return 'CASH';
    }
};

export interface OpdConsultContext {
    autoConsult: boolean;   // Billing Policy OPD consult trigger = AUTO
    fee: number;            // selected doctor's OPD consult fee (0 if none configured)
}

// Decides whether the OPD consult fee section should appear for a given doctor:
// only when the policy trigger is AUTO and the doctor has a consult fee.
export const getOpdConsultContext = async (
    doctorId: string,
    hospitalId?: string,
): Promise<OpdConsultContext> => {
    try {
        const [policy, fees] = await Promise.all([
            ipdBillingService.getPolicy(hospitalId),
            doctorFeeService.list(hospitalId),
        ]);
        const trigger = String(policy?.data?.opdConsultTrigger ?? policy?.opdConsultTrigger ?? '');
        const autoConsult = trigger.toUpperCase() === 'AUTO';
        const row = (fees?.items ?? []).find(f => f.doctorId === doctorId);
        const fee = Number(row?.opdConsultFee ?? 0);
        return { autoConsult, fee };
    } catch {
        return { autoConsult: false, fee: 0 };
    }
};

export interface PostOpdConsultResult {
    posted: boolean;          // a consult charge was posted on this call
    alreadyCharged: boolean;  // a consult charge already existed (idempotent reuse)
    alreadyPaid: boolean;     // the consult was already fully paid before this call (no payment made)
    consultFee: number;
    encounterId?: string;
    paymentRecorded: boolean;
    invoiceNo?: string | null;
    receiptNo?: string | null;
}

// Creates the OPD encounter (which auto-posts the consult charge when policy = AUTO and the
// visit is chargeable). When marked paid it then GENERATES AN INVOICE and records the payment:
//   createEncounter -> createDraftInvoice -> finalize (best-effort) -> addPayment.
// addPayment requires an invoice to exist, so the invoice step is mandatory, not optional.
// Throws with the backend message when invoice/payment fails (e.g. number series not configured)
// so the caller can surface it. The backend is idempotent on the charge, but callers should only
// pass markPaid when the consult is not already paid (addPayment would otherwise allow a 2nd pay).
export const postOpdConsult = async (
    patientId: string,
    opts: { markPaid: boolean; paymentMode?: string; hospitalId?: string; appointmentId?: string },
): Promise<PostOpdConsultResult> => {
    const enc = await ipdBillingService.createChargeEvent({
        patientId,
        encounterType: 'OPD',
        hospitalId: opts.hospitalId,
        appointmentId: opts.appointmentId,
    });

    const d = enc?.data;
    const posted = !!(d?.consultChargePosted ?? (d as any)?.ConsultChargePosted);
    const alreadyCharged = !!(d?.consultAlreadyCharged ?? (d as any)?.ConsultAlreadyCharged);
    const alreadyPaid = !!(d?.consultPaid ?? (d as any)?.ConsultPaid);
    const consultFee = Number((d?.consultFee ?? (d as any)?.ConsultFee) ?? 0);
    const encounterId = d?.encounterId ?? (d as any)?.EncounterId;

    const result: PostOpdConsultResult = {
        posted, alreadyCharged, alreadyPaid, consultFee, encounterId, paymentRecorded: false,
        invoiceNo: null, receiptNo: d?.receiptNo ?? null,
    };

    // Guard against double payment: if the backend reports the consult is already fully paid,
    // never record another payment — surface the existing receipt instead.
    const hasCharge = (posted || alreadyCharged) && consultFee > 0 && !!encounterId;
    if (!opts.markPaid || !hasCharge || alreadyPaid) return result;

    // 1) Generate the invoice (draft) for the encounter's posted charge(s).
    const inv = await ipdBillingService.createDraftInvoice({ patientId, encounterId: encounterId!, hospitalId: opts.hospitalId });
    if (inv?.success === false) throw new Error(inv?.message ?? 'Could not create invoice.');
    result.invoiceNo = inv?.data?.invoiceNo ?? null;
    const netAmount = Number(inv?.data?.netAmount ?? (inv?.data as any)?.NetAmount ?? consultFee) || consultFee;

    // 2) Finalize it (best-effort — ignore "already finalized"; a draft still accepts payment).
    try {
        await ipdBillingService.finalize('finalize', { patientId, encounterId: encounterId!, hospitalId: opts.hospitalId });
    } catch { /* non-fatal */ }

    // 3) Record the payment against the invoice.
    const pay = await ipdBillingService.addPayment({
        patientId,
        encounterId: encounterId!,
        hospitalId: opts.hospitalId,
        payment: {
            paymentType: 'PAYMENT',
            paymentMode: toPaymentMode(opts.paymentMode),
            amount: netAmount,
            description: 'OPD consultation fee',
        },
    });
    if (pay?.success || (pay as any)?.Success) {
        result.paymentRecorded = true;
        result.receiptNo = pay.data?.receiptNo ?? (pay.data as any)?.ReceiptNo ?? result.receiptNo;
    } return result;
};
