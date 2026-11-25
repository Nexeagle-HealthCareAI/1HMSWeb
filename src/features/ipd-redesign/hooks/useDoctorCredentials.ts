import { useEffect, useState } from 'react';
import { doctorApi } from '@/features/doctor/services/doctorApi';

export interface DoctorCredentials {
    /** Degrees as on the doctor's profile, e.g. "MBBS, MD (Medicine)". */
    qualification?: string;
    /** Speciality, falling back to the department. */
    speciality?: string;
    /** Medical council registration number. */
    registration?: string;
}

/** Builds the printable credentials from a doctor profile; blank values are left out. */
export const credentialsFromProfile = (profile: {
    qualifications?: string[] | null; primaryMedicalSpecialityName?: string | null; primaryDepartmentName?: string | null; licenseNumber?: string | null;
} | null | undefined): DoctorCredentials => {
    const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
    const degrees = (profile?.qualifications ?? []).map(q => q?.trim()).filter(Boolean).join(', ');
    return {
        qualification: clean(degrees),
        speciality: clean(profile?.primaryMedicalSpecialityName) ?? clean(profile?.primaryDepartmentName),
        registration: clean(profile?.licenseNumber),
    };
};

/**
 * The treating doctor's degree, speciality and registration number for the discharge printout.
 * Loaded once per doctor; if the profile cannot be read the printout simply shows the name alone.
 */
export const useDoctorCredentials = (doctorId?: string | null): DoctorCredentials => {
    const [credentials, setCredentials] = useState<DoctorCredentials>({});
    useEffect(() => {
        setCredentials({});
        if (!doctorId) return;
        let cancelled = false;
        doctorApi.getDoctorProfile(doctorId)
            .then(profile => { if (!cancelled) setCredentials(credentialsFromProfile(profile)); })
            .catch(() => { /* name alone still prints */ });
        return () => { cancelled = true; };
    }, [doctorId]);
    return credentials;
};
