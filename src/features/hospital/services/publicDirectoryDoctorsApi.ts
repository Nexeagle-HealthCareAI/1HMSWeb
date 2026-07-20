import { apiClient } from '@/services/axiosClient';

export interface HospitalDoctorItem {
    doctorId: string;
    fullName?: string | null;
    departmentName?: string | null;
    isPubliclyListed: boolean;
}

export interface GetHospitalDoctorsResponse {
    success: boolean;
    message?: string | null;
    doctors: HospitalDoctorItem[];
}

export interface UpdateDoctorPublicListingResponse {
    success: boolean;
    message?: string | null;
}

// Rich per-doctor shape for the Public Directory tile editor — mirrors
// GetPublicDirectoryDoctorsResponseModel.PublicDirectoryDoctorItem on the backend.
export interface PublicDirectoryDoctorTile {
    doctorId: string;
    userId: string;
    fullName?: string | null;
    photoUrl?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    hospitalDepartmentMappingId?: string | null;
    licenseNumber?: string | null;
    medicalCouncil?: string | null;
    registrationYear?: number | null;
    qualification?: string | null;
    experienceYears?: number | null;
    bio?: string | null;
    specializations: string[];
    languages: string[];
    publicContactEmail?: string | null;
    publicContactPhone?: string | null;
    isPubliclyListed: boolean;
    // Computed from non-hidden DoctorReviews.
    rating?: number | null;
    reviewCount: number;
    // Same dbo.DoctorFees rows Configuration > Doctor Fees edits. IPD/Emergency are read-only
    // here — round-tripped unchanged when saving the OPD fee from this tile so they aren't reset.
    opdConsultFee?: number | null;
    ipdVisitFee?: number | null;
    emergencyFee?: number | null;
}

export interface GetPublicDirectoryDoctorsResponse {
    success: boolean;
    message?: string | null;
    doctors: PublicDirectoryDoctorTile[];
}

export interface UpdateDoctorTileRequest {
    userId: string;
    hospitalId: string;
    hospitalDepartmentMappingId: string;
    licenseNumber?: string;
    medicalCouncil?: string;
    registrationYear?: number;
    qualification?: string[];
    experienceYears?: number;
    bio?: string;
    department?: string;
    specializations?: string[];
    languages?: string[];
    publicContactEmail?: string;
    publicContactPhone?: string;
}

export interface UpdateDoctorTileResponse {
    success: boolean;
    message?: string | null;
    updatedFields?: string[];
    errors?: string[] | null;
}

// Doctor roster for the public-directory toggle list — reuses the same GET doctors/hospital
// endpoint the IPD admitting-consultant picker uses (see admissionApi.ts), now also returning
// isPubliclyListed per doctor.
export const publicDirectoryDoctorsApi = {
    list: (hospitalId: string): Promise<GetHospitalDoctorsResponse> =>
        apiClient.get(`/doctors/hospital?hospitalId=${encodeURIComponent(hospitalId)}`),

    updatePublicListing: (
        hospitalId: string,
        doctorId: string,
        isPubliclyListed: boolean
    ): Promise<UpdateDoctorPublicListingResponse> =>
        apiClient.patch(`/doctors/public-listing?hospitalId=${encodeURIComponent(hospitalId)}`, {
            doctorId,
            isPubliclyListed,
        }),

    // Rich tile grid — separate endpoint from list() above so the simple toggle list never picks
    // up the extra photo/specialization resolution cost this one carries.
    listTiles: (hospitalId: string): Promise<GetPublicDirectoryDoctorsResponse> =>
        apiClient.get(`/doctors/public-directory?hospitalId=${encodeURIComponent(hospitalId)}`),

    // Admin-on-behalf-of edit — same PUT doctors/profile the doctor's own self-service profile
    // form uses, with hospitalId set so the backend's ownership guard (doctor must belong to this
    // hospital) applies.
    updateDoctorTile: (data: UpdateDoctorTileRequest): Promise<UpdateDoctorTileResponse> =>
        apiClient.put('/doctors/profile', data),
};
