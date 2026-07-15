import { apiClient } from '@/services/axiosClient';

export interface AdminReviewItem {
    reviewId: string;
    authorName?: string | null;
    rating: number;
    comment: string;
    helpfulCount: number;
    isHidden: boolean;
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

// Admin moderation surface for the Public Directory tile editor's "Reviews" panel — mirrors
// the public NexEagleWebsite review UI, but includes hidden reviews and lets an admin
// hide/unhide one after the fact.
export const doctorReviewsApi = {
    list: (hospitalId: string, doctorId: string): Promise<GetHospitalDoctorReviewsResponse> =>
        apiClient.get(`/doctors/${encodeURIComponent(doctorId)}/reviews?hospitalId=${encodeURIComponent(hospitalId)}`),

    moderate: (hospitalId: string, doctorId: string, reviewId: string, isHidden: boolean): Promise<ModerateDoctorReviewResponse> =>
        apiClient.patch(
            `/doctors/${encodeURIComponent(doctorId)}/reviews/${encodeURIComponent(reviewId)}/moderate?hospitalId=${encodeURIComponent(hospitalId)}`,
            { isHidden }
        ),
};
