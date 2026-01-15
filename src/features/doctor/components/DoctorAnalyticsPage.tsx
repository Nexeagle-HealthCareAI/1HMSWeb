import React, { useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity, Calendar, TrendingUp, Users, CheckCircle,
    Clock, Plus, ArrowRight, UserCheck, UserPlus, Scale, Heart, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Types & Interfaces ---

interface TimeBucket {
    label: string;
    count: number;
    trend?: string;
    percentageChange?: number;
}

interface KPIBuckets {
    today: TimeBucket;
    yesterday: TimeBucket;
    last7Days: TimeBucket;
    thisMonth: TimeBucket;
    thisYear: TimeBucket;
    prevYear: TimeBucket;
}

interface AnalyticsKPI {
    overall: number;
    byBucket: KPIBuckets;
}

interface DistributionItem {
    name: string;
    value: number;
}

interface MedicalStatItem {
    rank: number;
    name: string;
    count: number;
    percentage: number;
}

interface BPStatistics {
    categoryCounts: {
        NORMAL: number;
        ELEVATED: number;
        HTN_STAGE_1: number;
        HTN_STAGE_2: number;
        HYPOTENSION: number;
    };
}

interface WeightStatistics {
    buckets: Array<{
        range: string;
        count: number;
    }>;
}

interface BMIStatistics {
    categoryCounts: {
        UNDERWEIGHT: number;
        NORMAL: number;
        OVERWEIGHT: number;
        OBESE_I: number;
        OBESE_II: number;
        OBESE_III: number;
    };
}

interface AnalyticsData {
    totalVisits: AnalyticsKPI;
    uniquePatients: AnalyticsKPI;
    newVsReturningPatients: {
        new: AnalyticsKPI;
        returning: AnalyticsKPI;
    };
    ageDistribution: DistributionItem[];
    noShow: AnalyticsKPI;
    cancelled: AnalyticsKPI;
    medicalStats: {
        Top5MedicineUse: MedicalStatItem[];
        Top5Complain: MedicalStatItem[];
        Top5Diagnosis: MedicalStatItem[];
        Top5Investigation: MedicalStatItem[];
        Top5Examination: MedicalStatItem[];
    };
    vitalsDistribution: {
        bp: BPStatistics;
        weight: WeightStatistics;
        bmi: BMIStatistics;
    };
}

// --- Mock Data ---

const MOCK_ANALYTICS: AnalyticsData = {
    totalVisits: {
        overall: 489,
        byBucket: {
            today: { label: 'Today', count: 12, trend: 'up', percentageChange: 15 },
            yesterday: { label: 'Yesterday', count: 24, trend: 'down', percentageChange: 5 },
            last7Days: { label: 'Last 7 Days', count: 156, trend: 'up', percentageChange: 8 },
            thisMonth: { label: 'This Month', count: 489, trend: 'up', percentageChange: 12 },
            thisYear: { label: 'This Year', count: 1240, trend: 'up', percentageChange: 22 },
            prevYear: { label: 'Previous Year', count: 1100 }
        }
    },
    uniquePatients: {
        overall: 324,
        byBucket: {
            today: { label: 'Today', count: 8 },
            yesterday: { label: 'Yesterday', count: 14 },
            last7Days: { label: 'Last 7 Days', count: 98 },
            thisMonth: { label: 'This Month', count: 324 },
            thisYear: { label: 'This Year', count: 850 },
            prevYear: { label: 'Previous Year', count: 720 }
        }
    },
    newVsReturningPatients: {
        new: {
            overall: 145,
            byBucket: {
                today: { label: 'Today', count: 3 },
                yesterday: { label: 'Yesterday', count: 5 },
                last7Days: { label: 'Last 7 Days', count: 42 },
                thisMonth: { label: 'This Month', count: 145 },
                thisYear: { label: 'This Year', count: 320 },
                prevYear: { label: 'Previous Year', count: 280 }
            }
        },
        returning: {
            overall: 179,
            byBucket: {
                today: { label: 'Today', count: 5 },
                yesterday: { label: 'Yesterday', count: 9 },
                last7Days: { label: 'Last 7 Days', count: 56 },
                thisMonth: { label: 'This Month', count: 179 },
                thisYear: { label: 'This Year', count: 530 },
                prevYear: { label: 'Previous Year', count: 440 }
            }
        }
    },
    ageDistribution: [
        { name: '0-12', value: 45 },
        { name: '13-18', value: 32 },
        { name: '19-35', value: 128 },
        { name: '36-60', value: 210 },
        { name: '60+', value: 74 }
    ],
    noShow: {
        overall: 24,
        byBucket: {
            today: { label: 'Today', count: 1 },
            yesterday: { label: 'Yesterday', count: 2 },
            last7Days: { label: 'Last 7 Days', count: 8 },
            thisMonth: { label: 'This Month', count: 24 },
            thisYear: { label: 'This Year', count: 45 },
            prevYear: { label: 'Previous Year', count: 38 }
        }
    },
    cancelled: {
        overall: 18,
        byBucket: {
            today: { label: 'Today', count: 0 },
            yesterday: { label: 'Yesterday', count: 3 },
            last7Days: { label: 'Last 7 Days', count: 6 },
            thisMonth: { label: 'This Month', count: 18 },
            thisYear: { label: 'This Year', count: 32 },
            prevYear: { label: 'Previous Year', count: 28 }
        }
    },
    medicalStats: {
        Top5MedicineUse: [
            { rank: 1, name: 'Paracetamol 500mg', count: 245, percentage: 82 },
            { rank: 2, name: 'Amoxicillin 250mg', count: 156, percentage: 52 },
            { rank: 3, name: 'Metformin 500mg', count: 124, percentage: 41 },
            { rank: 4, name: 'Aspirin 75mg', count: 98, percentage: 33 },
            { rank: 5, name: 'Ibuprofen 400mg', count: 87, percentage: 29 }
        ],
        Top5Complain: [
            { rank: 1, name: 'Fever', count: 189, percentage: 38 },
            { rank: 2, name: 'Cough', count: 145, percentage: 29 },
            { rank: 3, name: 'Headache', count: 120, percentage: 24 },
            { rank: 4, name: 'Abdominal Pain', count: 95, percentage: 19 },
            { rank: 5, name: 'Back Pain', count: 78, percentage: 16 }
        ],
        Top5Diagnosis: [
            { rank: 1, name: 'Viral Infection', count: 156, percentage: 32 },
            { rank: 2, name: 'Hypertension', count: 132, percentage: 27 },
            { rank: 3, name: 'Type 2 Diabetes', count: 110, percentage: 22 },
            { rank: 4, name: 'Gastroenteritis', count: 89, percentage: 18 },
            { rank: 5, name: 'Upper Respiratory Infection', count: 75, percentage: 15 }
        ],
        Top5Investigation: [
            { rank: 1, name: 'CBC', count: 210, percentage: 43 },
            { rank: 2, name: 'Blood Sugar (F/PP)', count: 185, percentage: 37 },
            { rank: 3, name: 'Urine Routine', count: 124, percentage: 25 },
            { rank: 4, name: 'Chest X-Ray', count: 98, percentage: 20 },
            { rank: 5, name: 'Ultrasound Abdomen', count: 85, percentage: 17 }
        ],
        Top5Examination: [
            { rank: 1, name: 'General Physical Exam', count: 489, percentage: 100 },
            { rank: 2, name: 'BP Monitoring', count: 450, percentage: 92 },
            { rank: 3, name: 'Temperature Check', count: 432, percentage: 88 },
            { rank: 4, name: 'SPO2 Level', count: 410, percentage: 84 },
            { rank: 5, name: 'Heart Rate Monitoring', count: 395, percentage: 81 }
        ]
    },
    vitalsDistribution: {
        bp: {
            categoryCounts: {
                NORMAL: 145,
                ELEVATED: 85,
                HTN_STAGE_1: 56,
                HTN_STAGE_2: 32,
                HYPOTENSION: 12
            }
        },
        weight: {
            buckets: [
                { range: '< 50kg', count: 45 },
                { range: '50-65kg', count: 128 },
                { range: '65-80kg', count: 156 },
                { range: '80-95kg', count: 74 },
                { range: '> 95kg', count: 22 }
            ]
        },
        bmi: {
            categoryCounts: {
                UNDERWEIGHT: 32,
                NORMAL: 156,
                OVERWEIGHT: 110,
                OBESE_I: 45,
                OBESE_II: 18,
                OBESE_III: 8
            }
        }
    }
};

type TimeBucketKey = keyof KPIBuckets;

export const DoctorAnalyticsPage: React.FC = () => {
    const { t } = useTranslation();
    const [timeBucket, setTimeBucket] = useState<TimeBucketKey>('thisMonth');

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

    const activeKPIs = useMemo(() => {
        return {
            visits: MOCK_ANALYTICS.totalVisits.byBucket[timeBucket],
            patients: MOCK_ANALYTICS.uniquePatients.byBucket[timeBucket],
            newPatients: MOCK_ANALYTICS.newVsReturningPatients.new.byBucket[timeBucket],
            returningPatients: MOCK_ANALYTICS.newVsReturningPatients.returning.byBucket[timeBucket],
            noShow: MOCK_ANALYTICS.noShow.byBucket[timeBucket],
            cancelled: MOCK_ANALYTICS.cancelled.byBucket[timeBucket]
        };
    }, [timeBucket]);

    const bpData = [
        { name: 'Normal', value: MOCK_ANALYTICS.vitalsDistribution.bp.categoryCounts.NORMAL, color: '#10b981' },
        { name: 'Elevated', value: MOCK_ANALYTICS.vitalsDistribution.bp.categoryCounts.ELEVATED, color: '#f59e0b' },
        { name: 'HTN Stage 1', value: MOCK_ANALYTICS.vitalsDistribution.bp.categoryCounts.HTN_STAGE_1, color: '#f97316' },
        { name: 'HTN Stage 2', value: MOCK_ANALYTICS.vitalsDistribution.bp.categoryCounts.HTN_STAGE_2, color: '#ef4444' },
        { name: 'Hypotension', value: MOCK_ANALYTICS.vitalsDistribution.bp.categoryCounts.HYPOTENSION, color: '#3b82f6' }
    ];

    const bmiData = [
        { name: 'Underweight', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.UNDERWEIGHT, color: '#3b82f6' },
        { name: 'Normal', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.NORMAL, color: '#10b981' },
        { name: 'Overweight', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.OVERWEIGHT, color: '#f59e0b' },
        { name: 'Obese I', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.OBESE_I, color: '#f97316' },
        { name: 'Obese II', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.OBESE_II, color: '#ef4444' },
        { name: 'Obese III', value: MOCK_ANALYTICS.vitalsDistribution.bmi.categoryCounts.OBESE_III, color: '#991b1b' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4 min-h-screen bg-gray-50/50 dark:bg-slate-950/50">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        {t('analytics.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('analytics.description')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 hidden md:block">{t('analytics.timeRange')}:</span>
                    <Select value={timeBucket} onValueChange={(v) => setTimeBucket(v as TimeBucketKey)}>
                        <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 rounded-xl border-gray-200 dark:border-slate-700">
                            <SelectValue placeholder={t('analytics.periods.thisMonth')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 dark:border-slate-800">
                            <SelectItem value="today">{t('analytics.periods.today')}</SelectItem>
                            <SelectItem value="yesterday">{t('analytics.periods.yesterday')}</SelectItem>
                            <SelectItem value="last7Days">{t('analytics.periods.last7Days')}</SelectItem>
                            <SelectItem value="thisMonth">{t('analytics.periods.thisMonth')}</SelectItem>
                            <SelectItem value="thisYear">{t('analytics.periods.thisYear')}</SelectItem>
                            <SelectItem value="prevYear">{t('analytics.periods.prevYear')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Visits */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-900 shadow-lg shadow-blue-500/5">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calendar className="h-24 w-24 text-blue-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            {activeKPIs.visits.percentageChange && (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
                                    +{activeKPIs.visits.percentageChange}%
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">{t('analytics.kpis.totalVisits')}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">{activeKPIs.visits.count}</div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <span>{t(`analytics.periods.${timeBucket}`)}</span>
                            <ArrowRight className="h-3 w-3" />
                        </div>
                    </CardContent>
                </Card>

                {/* Unique Patients */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-900 shadow-lg shadow-indigo-500/5">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <UserCheck className="h-24 w-24 text-indigo-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">{t('analytics.kpis.uniquePatients')}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">{activeKPIs.patients.count}</div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            <span>{t('analytics.kpis.reachInPeriod', { period: t(`analytics.periods.${timeBucket}`) })}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* New vs Returning */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-900 shadow-lg shadow-purple-500/5 col-span-1 md:col-span-2">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users className="h-24 w-24 text-purple-600" />
                    </div>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                                    <UserPlus className="h-3 w-3" />
                                    {t('analytics.kpis.newPatients')}: {activeKPIs.newPatients.count}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                                    <Clock className="h-3 w-3" />
                                    {t('analytics.kpis.returningPatients')}: {activeKPIs.returningPatients.count}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('analytics.kpis.patientComposition')}</p>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {t('analytics.kpis.newCases', { percentage: Math.round((activeKPIs.newPatients.count / (activeKPIs.patients.count || 1)) * 100) })}
                                </div>
                            </div>
                            <div className="flex-1 max-w-[240px] h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex ml-4 mb-2">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(activeKPIs.newPatients.count / (activeKPIs.patients.count || 1)) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${(activeKPIs.returningPatients.count / (activeKPIs.patients.count || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Age Distribution */}
                <Card className="lg:col-span-1 shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-pink-500" />
                            {t('analytics.demographics.ageGroups')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={MOCK_ANALYTICS.ageDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {MOCK_ANALYTICS.ageDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* No-Shows & Cancellations */}
                <Card className="lg:col-span-1 shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            {t('analytics.kpis.attrition')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
                                        <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-red-900 dark:text-red-200">{t('analytics.kpis.noShows')}</p>
                                        <p className="text-xs text-red-600/80 dark:text-red-400">{t('analytics.kpis.missedAppointments')}</p>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{activeKPIs.noShow.count}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                                        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">{t('analytics.kpis.cancelled')}</p>
                                        <p className="text-xs text-orange-600/80 dark:text-orange-400">{t('analytics.kpis.userInitiated')}</p>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{activeKPIs.cancelled.count}</div>
                            </div>

                            <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40">
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    <span>{t('analytics.kpis.reliabilityRate')}</span>
                                    <span>{Math.round(((activeKPIs.visits.count) / (Math.max(activeKPIs.visits.count + activeKPIs.noShow.count + activeKPIs.cancelled.count, 1))) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600"
                                        style={{ width: `${Math.round(((activeKPIs.visits.count) / (Math.max(activeKPIs.visits.count + activeKPIs.noShow.count + activeKPIs.cancelled.count, 1))) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* BMI Distribution */}
                <Card className="lg:col-span-1 shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Scale className="h-5 w-5 text-indigo-500" />
                            {t('analytics.vitals.bmiDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={bmiData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={80} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {bmiData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vitals Deep Dive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Blood Pressure Distribution */}
                <Card className="shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Heart className="h-5 w-5 text-rose-500" />
                            {t('analytics.vitals.bloodPressure')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-full md:w-1/2 h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={bpData}
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {bpData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full md:w-1/2 space-y-3">
                                {bpData.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
                                            </div>
                                            <span className="text-gray-900 dark:text-white font-bold">{item.value}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    backgroundColor: item.color,
                                                    width: `${(item.value / (MOCK_ANALYTICS.totalVisits.overall || 1)) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Weight Ranges */}
                <Card className="shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            {t('analytics.vitals.weightDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 px-6">
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_ANALYTICS.vitalsDistribution.weight.buckets}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis dataKey="range" axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                                    <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Medical Statistics Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                {/* Top Medicines */}
                <StatsTable
                    title={t('analytics.medicalStats.topMedicines')}
                    icon={<Plus className="h-5 w-5 text-emerald-500" />}
                    data={MOCK_ANALYTICS.medicalStats.Top5MedicineUse}
                    accentColor="emerald"
                    t={t}
                />

                {/* Top Complains */}
                <StatsTable
                    title={t('analytics.medicalStats.commonComplains')}
                    icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                    data={MOCK_ANALYTICS.medicalStats.Top5Complain}
                    accentColor="amber"
                    t={t}
                />

                {/* Top Diagnosis */}
                <StatsTable
                    title={t('analytics.medicalStats.topDiagnosis')}
                    icon={<Activity className="h-5 w-5 text-blue-500" />}
                    data={MOCK_ANALYTICS.medicalStats.Top5Diagnosis}
                    accentColor="blue"
                    t={t}
                />

                {/* Top Investigations */}
                <StatsTable
                    title={t('analytics.medicalStats.topInvestigations')}
                    icon={<CheckCircle className="h-5 w-5 text-purple-500" />}
                    data={MOCK_ANALYTICS.medicalStats.Top5Investigation}
                    accentColor="purple"
                    t={t}
                />

                {/* Top Examinations */}
                <StatsTable
                    title={t('analytics.medicalStats.topExaminations')}
                    icon={<Clock className="h-5 w-5 text-indigo-500" />}
                    data={MOCK_ANALYTICS.medicalStats.Top5Examination}
                    accentColor="indigo"
                    className="md:col-span-2 xl:col-span-1"
                    t={t}
                />
            </div>
        </div>
    );
};

// --- Helper Components ---

interface StatsTableProps {
    title: string;
    icon: React.ReactNode;
    data: MedicalStatItem[];
    accentColor: string;
    className?: string;
    t: any;
}

const StatsTable: React.FC<StatsTableProps> = ({ title, icon, data, accentColor, className, t }) => {
    return (
        <Card className={`shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden ${className}`}>
            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/20 dark:bg-slate-900/10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left w-12">{t('analytics.medicalStats.rank')}</th>
                                <th className="px-4 py-3 text-left">{t('analytics.medicalStats.internalName')}</th>
                                <th className="px-4 py-3 text-right">{t('analytics.medicalStats.count')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-4 font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                                        {item.rank}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-semibold text-gray-900 dark:text-white leading-none">{item.name}</span>
                                            <div className="w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full bg-${accentColor}-500 transition-all duration-700`}
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                                        {item.count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
