import { apiClient } from '@/services/axiosClient';

// Settings -> Hospital Info -> Patient visit guide (Vita, vision Phase 4). 1HMSAPI VisitGuideController:
// GET/PUT /hospitals/{hospitalId}/visit-guide. Members read; only a hospital admin saves.

export interface VisitGuide {
  landmark?: string | null;
  entranceNote?: string | null;
  opdLocation?: string | null;
  registrationDesk?: string | null;
  parkingNote?: string | null;
  paymentNote?: string | null;
  extraNote?: string | null;
  updatedAt?: string | null;
}

export interface VisitGuideResponse {
  success: boolean;
  message?: string | null;
  guide: VisitGuide;
  hasMapPin: boolean;
}

const path = (hospitalId: string) => `/hospitals/${encodeURIComponent(hospitalId)}/visit-guide`;

export const visitGuideApi = {
  get: (hospitalId: string): Promise<VisitGuideResponse> => apiClient.get(path(hospitalId)),
  save: (hospitalId: string, guide: VisitGuide): Promise<VisitGuideResponse> => apiClient.put(path(hospitalId), guide),
};
