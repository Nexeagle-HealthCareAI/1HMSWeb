import { ipdBillingService } from '@/features/billing/services/ipdBillingService';

// Resolves the billing encounter a doctor-placed OPD lab order should attach to: the patient's
// current (non-finalized) OPD visit if one exists, else reuses an open Lab visit, else creates one
// -- mirrors PathologyNewOrderModal.tsx's own OPD-visit lookup + Lab-visit fallback (see that
// file's patient-selection effect and submitOrder) so a doctor-initiated order (from the
// prescription pad) bills exactly the same way a pharmacist-initiated one does, including the
// "OPD with no open visit still bills, via a Lab visit" fix already shipped for that flow.
export async function resolveOpdBillingEncounterId(patientId: string): Promise<string | undefined> {
  try {
    const res: any = await ipdBillingService.getPatientEvents(patientId);
    const encounters = res?.data?.encounters ?? [];
    const deriveCurrentId = (typeCode: string): string | undefined => {
      const list = encounters
        .filter((e: any) => (e.encounterTypeCode ?? '').toUpperCase() === typeCode && !e.isCancelled)
        .map((e: any) => ({ encounterId: e.encounterId as string, status: e.status ?? 'OPEN', invoiceDate: e.invoiceDate ?? '' }))
        .sort((a: any, b: any) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
      const current = list.find((e: any) => (e.status ?? '').toUpperCase() !== 'FINALIZED') ?? list[0];
      return current?.encounterId;
    };

    const opdEncounterId = deriveCurrentId('OPD');
    if (opdEncounterId) return opdEncounterId;

    const labEncounterId = deriveCurrentId('LAB');
    if (labEncounterId) return labEncounterId;

    const encRes = await ipdBillingService.createEncounter({ patientId, encounterType: 'LAB' });
    if (encRes?.success && encRes.data?.encounterId) return encRes.data.encounterId;
  } catch {
    // Falls through to undefined -- caller (CreatePathologyOrderHandler) still places the order
    // without a billing encounter and surfaces a billingWarning rather than failing the order.
  }
  return undefined;
}
