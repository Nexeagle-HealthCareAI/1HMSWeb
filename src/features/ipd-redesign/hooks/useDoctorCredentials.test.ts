import { describe, expect, it } from 'vitest';
import { credentialsFromProfile } from './useDoctorCredentials';

describe('doctor credentials for the printout', () => {
    it('joins the degrees and uses the speciality', () => {
        expect(credentialsFromProfile({ qualifications: ['MBBS', ' MD (Medicine) ', ''], primaryMedicalSpecialityName: 'General Medicine', primaryDepartmentName: 'Medicine', licenseNumber: ' MMC/123 ' }))
            .toEqual({ qualification: 'MBBS, MD (Medicine)', speciality: 'General Medicine', registration: 'MMC/123' });
    });
    it('falls back to the department when no speciality is set', () => {
        expect(credentialsFromProfile({ qualifications: [], primaryDepartmentName: 'Orthopaedics' })).toEqual({ qualification: undefined, speciality: 'Orthopaedics', registration: undefined });
    });
    it('is empty when there is no profile, so only the name prints', () => {
        expect(credentialsFromProfile(null)).toEqual({ qualification: undefined, speciality: undefined, registration: undefined });
    });
});
