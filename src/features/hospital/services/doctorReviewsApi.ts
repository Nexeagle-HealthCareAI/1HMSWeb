import { apiClient } from '@/services/axiosClient';

export interface AdminReviewItem {
    reviewId: string;
    authorName?: string | null;
    rating: number;
    comment: string;
    helpfulCount: number;
    isHidden: boolean;
    isHospitalResponse: boolean;
    submittedIp?: string | null;
    createdAt: string;
}

export interface GetHospitalDoctorReviewsResponse {
    success: boolean;
    message?: string | null;
    reviews: AdminReviewItem[];
    averageRating: number;
    reviewCount: number;
}

export interface ModerateDoctorReviewResponse {
    success: boolean;
    message?: string | null;
}

export interface SubmitHospitalResponseResponse {
    success: boolean;
    message?: string | null;
    reviewId: string;
}

// Admin moderation surface for the Public Directory doctor reviews dialog — mirrors the
// public NexEagleWebsite review UI, but includes hidden reviews, lets an admin hide/unhide
// one after the fact, and lets the hospital post its own official "Hospital Response".
export const doctorReviewsApi = {
    list: (hospitalId: string, doctorId: string): Promise<GetHospitalDoctorReviewsResponse> =>
        apiClient.get(`/doctors/${encodeURIComponent(doctorId)}/reviews?hospitalId=${encodeURIComponent(hospitalId)}`),

    moderate: (hospitalId: string, doctorId: string, reviewId: string, isHidden: boolean): Promise<ModerateDoctorReviewResponse> =>
        apiClient.patch(
            `/doctors/${encodeURIComponent(doctorId)}/reviews/${encodeURIComponent(reviewId)}/moderate?hospitalId=${encodeURIComponent(hospitalId)}`,
            { isHidden }
        ),

    submitHospitalResponse: (hospitalId: string, doctorId: string, comment: string): Promise<SubmitHospitalResponseResponse> =>
        apiClient.post(
            `/doctors/${encodeURIComponent(doctorId)}/reviews?hospitalId=${encodeURIComponent(hospitalId)}`,
            { comment }
        ),
};
