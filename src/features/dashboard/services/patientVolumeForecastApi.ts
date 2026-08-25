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
    predictedNext7DayAppointments: number;
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

export interface PatientVolumeForecastResponse {
    success: boolean;
    message: string;
    data: {
        predictedNext7DayAppointments: number;
        predictedNext7DayUniquePatients: number;
        avg7DayAppointments: number;
        avg30DayAppointments: number;
        avg7DayUniquePatients: number;
        avg30DayUniquePatients: number;
        monthOverMonthAppointmentChangePercent: number;
        monthOverMonthUniquePatientChangePercent: number;
        outlook: string;
        specialtyTrends: SpecialtyTrendItem[];
        doctorLoadForecast: DoctorLoadForecastItem[];
        anomalies: AnomalyFlagItem[];
        insights: string[];
        historicalTrend: PatientVolumeTrendPoint[];
        projectedTrend: PatientVolumeTrendPoint[];
    } | null;
}

export const fetchPatientVolumeForecast = async (hospitalId: string): Promise<PatientVolumeForecastResponse> => {
    return await apiClient.get<PatientVolumeForecastResponse>(API_ENDPOINTS.HOSPITALS.GET_PATIENT_VOLUME_FORECAST(hospitalId));
};
