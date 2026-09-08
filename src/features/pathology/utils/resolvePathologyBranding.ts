import type { HospitalData } from '@/features/hospital/services/hospitalApi';
import type { LabConfiguration } from '../services/pathologyService';
import type { DefaultLetterheadHospitalInfo } from '@/components/shared/prescription-preview/utils/defaultLetterhead';

// The one place a pathology report's letterhead identity is resolved -- was three duplicated
// hospital-field mapping blocks (buildAllReportsPdf.ts, PathologyOrderDetailPage.tsx,
// useReportDesigner.ts). A lab's LabName/LabAddress/LabRegistrationNumber (LabConfiguration) take
// priority over the hospital's own generic profile when set; everything else (contact/email/
// website/nabhNumber) always comes from the hospital record, since no lab-specific override was
// asked for on those.
export function resolvePathologyBranding(
  hospital: HospitalData | null | undefined,
  labConfig: LabConfiguration | null | undefined,
): DefaultLetterheadHospitalInfo | null {
  if (!hospital) return null;
  const labAddress = labConfig?.labAddress?.trim();
  return {
    name: labConfig?.labName?.trim() || hospital.name,
    // A lab's own address override is one free-text block -- put it in `location` alone (the
    // footer just concatenates location/city/state-pincode into one line anyway) rather than
    // trying to split it back into city/state/pincode.
    location: labAddress || hospital.location,
    city: labAddress ? null : hospital.city,
    state: labAddress ? null : hospital.state,
    pincode: labAddress ? null : hospital.pincode,
    contact: hospital.contact,
    alternateContact: hospital.alternateContact,
    email: hospital.email,
    website: hospital.website,
    registrationNumber: labConfig?.labRegistrationNumber?.trim() || hospital.registrationNumber,
    nabhNumber: hospital.nabhNumber,
  };
}
