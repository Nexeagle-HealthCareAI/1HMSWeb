import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface PatientVolumeTrendPoint {
    date: string;
    totalAppointments: number;
    uniquePatients: number;
}

export interface SpecialtyTrendItem {
    specialtyName: string;
    changePercent: number;
    isSurging: boolean;
}

export interface DoctorLoadForecastItem {
    doctorId: string;
    doctorName: string;
    predictedTomorrowAppointments: number;
    predictedNext7DayAppointments: number;
    predictedNext30DayAppointments: number;
    monthOverMonthChangePercent: number;
    isOverloaded: boolean;
}

export interface AnomalyFlagItem {
    metricName: string;
    recentValue: number;
    baselineMean: number;
    baselineStdDev: number;
    zScore: number;
    direction: 'UP' | 'DOWN';
}

export interface MonthlySeasonalFactorItem {
    month: number;
    monthName: string;
    index: number;
    isNotable: boolean;
}

export interface PatientVolumeForecastResponse {
    success: boolean;
    message: string;
    data: {
        predictedTomorrowAppointments: number;
        predictedTomorrowUniquePatients: number;
        predictedNext7DayAppointments: number;
        predictedNext7DayUniquePatients: number;
        predictedNext30DayAppointments: number;
        predictedNext30DayUniquePatients: number;
        avg7DayAppointments: number;
        avg30DayAppointments: number;
        avg7DayUniquePatients: number;
        avg30DayUniquePatients: number;
        monthOverMonthAppointmentChangePercent: number;
        monthOverMonthUniquePatientChangePercent: number;
        noShowRate: number;
        expectedAttendingTomorrow: number;
        expectedAttendingNext7Days: number;
        expectedAttendingNext30Days: number;
        outlook: string;
        specialtyTrends: SpecialtyTrendItem[];
        doctorLoadForecast: DoctorLoadForecastItem[];
        anomalies: AnomalyFlagItem[];
        monthlySeasonalFactors: MonthlySeasonalFactorItem[];
        insights: string[];
        historicalTrend: PatientVolumeTrendPoint[];
        projectedTrend: PatientVolumeTrendPoint[];
    } | null;
}

export const fetchPatientVolumeForecast = async (hospitalId: string): Promise<PatientVolumeForecastResponse> => {
    return await apiClient.get<PatientVolumeForecastResponse>(API_ENDPOINTS.HOSPITALS.GET_PATIENT_VOLUME_FORECAST(hospitalId));
};
