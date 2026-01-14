
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
    trendVsPreviousPeriod?: { percent: number; direction: 'UP' | 'DOWN' | 'FLAT' };
}

export interface AgeDistribution {
    [key: string]: number;
}

export interface GenderStats {
    gender: string; // 'Male' | 'Female' | 'Other'
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

export const MOCK_ANALYTICS_DATA: AnalyticsResponse = {
    success: true,
    message: "OPD analytics retrieved successfully.",
    data: {
        kpis: {
            totalVisits: {
                overall: 12450,
                byBucket: {
                    today: 142,
                    yesterday: 138,
                    last7Days: 985,
                    thisMonth: 4250,
                    thisYear: 12450,
                    prevYear: 10200
                }
            },
            uniquePatients: {
                overall: 8600,
                byBucket: {
                    today: 85,
                    yesterday: 79,
                    last7Days: 520,
                    thisMonth: 2800,
                    thisYear: 8600,
                    prevYear: 7100
                }
            },
            newVsReturningPatients: {
                new: { count: 3765, percent: 30.24 },
                returning: { count: 8685, percent: 69.76 }
            }
        },
        breakdowns: {
            byDoctor: [
                {
                    doctorId: "doc-001",
                    doctorName: "Dr. A. Khan",
                    specialty: "General Medicine",
                    overallVisits: 3850,
                    uniquePatients: 2900,
                    newPatients: { day: 12, week: 85, month: 350, year: 1200 },
                    returningPatients: 2650,
                    firstVisits: 1200,
                    noShow: 150,
                    sharePercent: 30.92
                },
                {
                    doctorId: "doc-002",
                    doctorName: "Dr. S. Gupta",
                    specialty: "Orthopedics",
                    overallVisits: 2600,
                    uniquePatients: 1800,
                    newPatients: { day: 8, week: 60, month: 240, year: 950 },
                    returningPatients: 1650,
                    firstVisits: 950,
                    noShow: 95,
                    sharePercent: 20.88
                },
                {
                    doctorId: "doc-003",
                    doctorName: "Dr. R. Sharma",
                    specialty: "Pediatrics",
                    overallVisits: 2200,
                    uniquePatients: 1950,
                    newPatients: { day: 15, week: 90, month: 400, year: 1300 },
                    returningPatients: 900,
                    firstVisits: 1300,
                    noShow: 80,
                    sharePercent: 17.67
                },
                {
                    doctorId: "doc-004",
                    doctorName: "Dr. M. Das",
                    specialty: "Gynecology",
                    overallVisits: 2100,
                    uniquePatients: 1400,
                    newPatients: { day: 10, week: 70, month: 280, year: 1000 },
                    returningPatients: 1100,
                    firstVisits: 1000,
                    noShow: 75,
                    sharePercent: 16.86
                },
                {
                    doctorId: "doc-005",
                    doctorName: "Dr. K. Singh",
                    specialty: "Cardiology",
                    overallVisits: 1700,
                    uniquePatients: 1100,
                    newPatients: { day: 5, week: 40, month: 150, year: 600 },
                    returningPatients: 1100,
                    firstVisits: 600,
                    noShow: 40,
                    sharePercent: 13.65
                }
            ],
            bySpecialty: [
                {
                    specialtyCode: "MED",
                    specialtyName: "General Medicine",
                    overallVisits: 3850,
                    uniquePatients: 2900,
                    sharePercent: 30.92,
                    trendVsPreviousPeriod: { percent: 5.2, direction: "UP" }
                },
                {
                    specialtyCode: "ORTHO",
                    specialtyName: "Orthopedics",
                    overallVisits: 2600,
                    uniquePatients: 1800,
                    sharePercent: 20.88,
                    trendVsPreviousPeriod: { percent: -2.1, direction: "DOWN" }
                },
                {
                    specialtyCode: "PED",
                    specialtyName: "Pediatrics",
                    overallVisits: 2200,
                    uniquePatients: 1950,
                    sharePercent: 17.67,
                    trendVsPreviousPeriod: { percent: 8.5, direction: "UP" }
                },
                {
                    specialtyCode: "GYN",
                    specialtyName: "Gynecology",
                    overallVisits: 2100,
                    uniquePatients: 1400,
                    sharePercent: 16.86,
                    trendVsPreviousPeriod: { percent: 1.5, direction: "FLAT" }
                },
                {
                    specialtyCode: "CARD",
                    specialtyName: "Cardiology",
                    overallVisits: 1700,
                    uniquePatients: 1100,
                    sharePercent: 13.65,
                    trendVsPreviousPeriod: { percent: 12.3, direction: "UP" }
                }
            ]
        },
        overall: {
            ageDistribution: {
                "0-10": 1850,
                "11-20": 1200,
                "21-30": 2400,
                "31-40": 2850,
                "41-50": 1900,
                "51-60": 1250,
                "61-70": 750,
                "71-100": 250
            },
            noShow: 440,
            cancelled: 310,
            top5City: {
                "Kishanganj": 4500,
                "Purnea": 3200,
                "Siliguri": 1800,
                "Kolkata": 1200,
                "Patna": 800,
                "Darjeeling": 650,
                "Malda": 500,
                "Raiganj": 450
            },
            uniqueCities: ["Kishanganj", "Purnea", "Siliguri", "Kolkata", "Patna", "Darjeeling", "Malda", "Raiganj"]
        },
        genderWise: [
            {
                gender: "Male",
                overallVisits: 5800,
                noShow: 210,
                cancelled: 150,
                ageDistribution: {
                    "0-10": 950,
                    "11-20": 650,
                    "21-30": 1100,
                    "31-40": 1400,
                    "41-50": 950,
                    "51-60": 450,
                    "61-70": 250,
                    "71-100": 50
                }
            },
            {
                gender: "Female",
                overallVisits: 6650,
                noShow: 230,
                cancelled: 160,
                ageDistribution: {
                    "0-10": 900,
                    "11-20": 550,
                    "21-30": 1300,
                    "31-40": 1450,
                    "41-50": 950,
                    "51-60": 800,
                    "61-70": 500,
                    "71-100": 200
                }
            }
        ]
    }
};

export const fetchAnalyticsData = (): Promise<AnalyticsResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_ANALYTICS_DATA);
        }, 800);
    });
};
