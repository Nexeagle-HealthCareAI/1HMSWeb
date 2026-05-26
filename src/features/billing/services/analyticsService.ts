import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type Granularity = 'DAY' | 'WEEK' | 'MONTH';

export interface AnalyticsKpis {
    grossCollected: number;
    refundsIssued: number;
    netCollected: number;
    paymentCount: number;
    refundCount: number;
    chargedGross: number;
    chargedDiscount: number;
    chargedNet: number;
    chargedTax: number;
    chargeCount: number;
    invoiceFinalizedCount: number;
    averageInvoiceNet: number;
}

export interface RevenueSeriesPoint {
    periodStart: string;
    grossCollected: number;
    refundsIssued: number;
    netCollected: number;
    paymentCount: number;
}

export interface RevenueBucket {
    key: string;
    amount: number;
    count: number;
}

export interface TopServiceItem {
    displayName: string;
    categoryCode?: string;
    netAmount: number;
    chargeCount: number;
}

export interface GetRevenueAnalyticsResponse {
    success: boolean;
    message?: string;
    fromUtc: string;
    toUtc: string;
    granularity: Granularity | string;
    kpis: AnalyticsKpis;
    series: RevenueSeriesPoint[];
    byPaymentMode: RevenueBucket[];
    bySourceModule: RevenueBucket[];
    byCategory: RevenueBucket[];
    topServices: TopServiceItem[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export interface IpdKpis {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyPercent: number;
    currentlyAdmitted: number;
    admissionsInRange: number;
    dischargesInRange: number;
    cancelledInRange: number;
    averageLengthOfStayDays: number;
    medianLengthOfStayDays: number;
    readmittedPatients: number;
    readmissionDenominator: number;
    readmissionPercent: number;
}

export interface WardOccupancyBucket {
    wardCode: string;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyPercent: number;
}

export interface IpdSeriesPoint {
    periodStart: string;
    admissions: number;
    discharges: number;
}

export interface GetIpdAnalyticsResponse {
    success: boolean;
    message?: string;
    fromUtc: string;
    toUtc: string;
    readmissionWindowDays: number;
    kpis: IpdKpis;
    wardOccupancy: WardOccupancyBucket[];
    admissionSeries: IpdSeriesPoint[];
}

export const analyticsService = {
    revenue: (opts?: { fromUtc?: string; toUtc?: string; granularity?: Granularity | string; topServicesLimit?: number; hospitalId?: string }): Promise<GetRevenueAnalyticsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ANALYTICS.REVENUE(hospitalIdOrThrow(opts?.hospitalId), opts)),

    ipd: (opts?: { fromUtc?: string; toUtc?: string; readmissionWindowDays?: number; hospitalId?: string }): Promise<GetIpdAnalyticsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ANALYTICS.IPD(hospitalIdOrThrow(opts?.hospitalId), opts)),
};
