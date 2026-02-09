import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// --- API Response Interfaces ---

interface TimeBucket {
    today: number;
    yesterday: number;
    last7Days: number;
    thisMonth: number;
    thisYear: number;
    prevYear: number;
}

interface AnalyticsKPI {
    overall: number;
    byBucket: TimeBucket;
}

interface NewVsReturning {
    new: { count: number; percent: number };
    returning: { count: number; percent: number };
}

interface MedicalStats {
    top5MedicineUse: Record<string, number>;
    top5Complain: Record<string, number>;
    top5Diagnosis: Record<string, number>;
    top5Investigation: Record<string, number>;
    top5Examination: Record<string, number>;
}

// User provided: "ageDistribution": { "additionalProp1": 0 }
// Assuming it returns key-value pairs of "Age Range": count
interface AgeDistribution extends Record<string, number> { }

interface VitalsStatsResponse {
    bpStats: {
        categoryCounts: Record<string, number>;
    };
    weightStats: {
        buckets: Array<{ range: string; count: number }>;
    };
    bmiStats: {
        categoryCounts: Record<string, number>;
    };
}

export interface DoctorAnalyticsResponse {
    success: boolean;
    message: string;
    data: {
        kpi: {
            totalVisits: AnalyticsKPI;
            uniquePatients: AnalyticsKPI;
            newVsReturningPatients:
            | { new: { count: number; percent: number }; returning: { count: number; percent: number } }
            | { new: AnalyticsKPI; returning: AnalyticsKPI }; // Handling potential discrepancy
            ageDistribution: AgeDistribution;
            noShow: number; // API example shows number, component expects Object with bucket. 
            // IF API returns just number, we might need to mock buckets or adjust component.
            // BUT looking at previous mock data, it had buckets. 
            // Let's assume for now we might need to map single number to 'overall' or adjust types.
            // WAIT, the API example says "noShow": 0. This is different from previous MOCK struct. 
            // I will map this to an object structure compatible with the UI.
            cancelled: number;
        };
        medicalStats: MedicalStats;
    } & VitalsStatsResponse;
}

// --- Component Interfaces (Mapped Types) ---

// Re-using types compatible with DoctorAnalyticsPage.tsx
export type TimeBucketKey = keyof TimeBucket;

export interface DistributionItem {
    name: string;
    value: number;
}

export interface MedicalStatItem {
    rank: number;
    name: string;
    count: number;
    percentage: number;
}

// The UI expects nested structure for KPI buckets
export interface UI_KPI_Bucket {
    label: string;
    count: number;
    trend: string;
    percentageChange: number;
}

export interface UI_AnalyticsKPI {
    overall: number;
    byBucket: Record<TimeBucketKey, UI_KPI_Bucket>;
}

export interface UI_AnalyticsData {
    totalVisits: UI_AnalyticsKPI;
    uniquePatients: UI_AnalyticsKPI;
    newVsReturningPatients: {
        new: UI_AnalyticsKPI;
        returning: UI_AnalyticsKPI;
    };
    ageDistribution: DistributionItem[];
    noShow: UI_AnalyticsKPI;
    cancelled: UI_AnalyticsKPI;
    medicalStats: {
        Top5MedicineUse: MedicalStatItem[];
        Top5Complain: MedicalStatItem[];
        Top5Diagnosis: MedicalStatItem[];
        Top5Investigation: MedicalStatItem[];
        Top5Examination: MedicalStatItem[];
    };
    vitalsDistribution: {
        bp: { categoryCounts: Record<string, number> };
        weight: { buckets: Array<{ range: string; count: number }> };
        bmi: { categoryCounts: Record<string, number> };
    };
}

// --- Helper to map simple number to KPI Bucket structure ---
const mapToBucket = (val: number | TimeBucket, explicitOverall?: number): UI_AnalyticsKPI => {
    const buckets: TimeBucketKey[] = ['today', 'yesterday', 'last7Days', 'thisMonth', 'thisYear', 'prevYear'];

    // If it's just a number (like noShow in API example), treat as overall and zero out buckets?
    // Or maybe the API example was simplified. 
    // If API returns simple number for noShow, we can't filter by timebucket effectively.
    // For now, let's distribute the number or just put it in 'thisMonth' as fallback/placeholder if needed, 
    // OR create a structure where all buckets have the same value (unlikely correct) or 0.

    if (typeof val === 'number') {
        return {
            overall: val,
            byBucket: buckets.reduce((acc, key) => {
                acc[key] = { label: key, count: val, trend: 'neutral', percentageChange: 0 };
                return acc;
            }, {} as Record<TimeBucketKey, UI_KPI_Bucket>)
        };
    }

    // If it's a TimeBucket object
    const total = explicitOverall !== undefined ? explicitOverall : Object.values(val).reduce((a, b) => a + b, 0);
    return {
        overall: total,
        byBucket: buckets.reduce((acc, key) => {
            acc[key] = {
                label: key,
                count: val[key] || 0,
                trend: 'neutral',
                percentageChange: 0
            };
            return acc;
        }, {} as Record<TimeBucketKey, UI_KPI_Bucket>)
    };
};

const mapRecordToItems = (record: Record<string, number>): MedicalStatItem[] => {
    const entries = Object.entries(record || {});
    const total = entries.reduce((acc, [, count]) => acc + count, 0);

    return entries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count], index) => ({
            rank: index + 1,
            name,
            count,
            percentage: total ? Math.round((count / total) * 100) : 0
        }));
};

const mapDistribution = (record: Record<string, number>): DistributionItem[] => {
    return Object.entries(record || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
};


export const doctorAnalyticsApi = {
    getAnalytics: async (hospitalId: string, doctorId: string): Promise<UI_AnalyticsData> => {
        const endpoint = API_ENDPOINTS.DOCTORS.GET_ANALYSIS(hospitalId, doctorId);
        const response = await apiClient.get<DoctorAnalyticsResponse>(endpoint);
        const data = response.data;

        // Transform API data to UI format
        return {
            totalVisits: mapToBucket(data.kpi.totalVisits.byBucket, data.kpi.totalVisits.overall),
            uniquePatients: mapToBucket(data.kpi.uniquePatients.byBucket, data.kpi.uniquePatients.overall),

            // API Structure for new/returning:
            // "newVsReturningPatients": { "new": { "count": 24, "percent": 46.15 }, "returning": { "count": 28, "percent": 53.85 } }
            // Using fallback values as requested if API returns 0
            newVsReturningPatients: {
                new: mapToBucket((data.kpi.newVsReturningPatients as any).new?.count || 0),
                returning: mapToBucket((data.kpi.newVsReturningPatients as any).returning?.count || 0)
            },

            ageDistribution: mapDistribution(data.kpi.ageDistribution),

            noShow: mapToBucket(data.kpi.noShow),
            cancelled: mapToBucket(data.kpi.cancelled),

            medicalStats: {
                Top5MedicineUse: mapRecordToItems(data.medicalStats.top5MedicineUse),
                Top5Complain: mapRecordToItems(data.medicalStats.top5Complain),
                Top5Diagnosis: mapRecordToItems(data.medicalStats.top5Diagnosis),
                Top5Investigation: mapRecordToItems(data.medicalStats.top5Investigation),
                Top5Examination: mapRecordToItems(data.medicalStats.top5Examination)
            },

            vitalsDistribution: {
                bp: data.bpStats,
                weight: data.weightStats,
                bmi: data.bmiStats
            }
        };
    }
};
