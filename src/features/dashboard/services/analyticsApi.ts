import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface AnalyticsKPI {
    overall: number;
    byBucket: {
        today: number;
        yesterday: number;
        last7Days: number;
        thisMonth: number;
        thisYear: number;
        prevYear: number;
    };
}

export interface NewVsReturning {
    new: { count: number; percent: number };
    returning: { count: number; percent: number };
}

export interface DoctorBreakdown {
    doctorId: string;
    doctorName: string;
    specialty: string;
    overallVisits: number;
    uniquePatients: number;
    newPatients: {
        day: number;
        week: number;
        month: number;
        year: number;
    };
    returningPatients: number;
    firstVisits: number;
    noShow: number;
    sharePercent: number;
}

export interface SpecialtyBreakdown {
    specialtyCode?: string;
    specialtyName: string;
    overallVisits: number;
    uniquePatients: number;
    sharePercent: number;
    trendVsPreviousPeriod?: { percent: number; direction: string };
}

export interface AgeDistribution {
    [key: string]: number;
}

export interface GenderStats {
    gender: string;
    overallVisits: number;
    noShow: number;
    cancelled: number;
    ageDistribution: AgeDistribution;
}

export interface OverallStats {
    ageDistribution: AgeDistribution;
    noShow: number;
    cancelled: number;
    top5City: Record<string, number>;
    uniqueCities: string[];
}

export interface AnalyticsResponse {
    success: boolean;
    message: string;
    data: {
        kpis: {
            totalVisits: AnalyticsKPI;
            uniquePatients: AnalyticsKPI;
            newVsReturningPatients: NewVsReturning;
        };
        breakdowns: {
            byDoctor: DoctorBreakdown[];
            bySpecialty: SpecialtyBreakdown[];
        };
        overall: OverallStats;
        genderWise: GenderStats[];
    };
}

export const fetchAnalyticsData = async (hospitalId: string): Promise<AnalyticsResponse> => {
    return await apiClient.get<AnalyticsResponse>(API_ENDPOINTS.HOSPITALS.GET_ANALYSIS(hospitalId));
};
