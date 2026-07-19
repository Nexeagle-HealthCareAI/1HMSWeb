import React, { useMemo, useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity, Calendar, TrendingUp, Users, CheckCircle,
    Clock, Plus, ArrowRight, UserCheck, UserPlus, Scale, Heart, AlertCircle, type LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store';
import { doctorAnalyticsApi, type UI_AnalyticsData, type TimeBucketKey } from '../services/doctorAnalyticsApi';

export const DoctorAnalyticsPage: React.FC = () => {
    const { t } = useTranslation();
    const { doctorId, hospitalId } = useAuthStore();
    const [timeBucket, setTimeBucket] = useState<TimeBucketKey>('thisYear');
    const [analyticsData, setAnalyticsData] = useState<UI_AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isLowBandwidthMode = useAppStore((state) => state.isLowBandwidthMode);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!doctorId || !hospitalId) {
                // If ids are missing, we can't fetch. 
                // In a real app we might redirect or show error.
                // For now, stop loading.
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await doctorAnalyticsApi.getAnalytics(hospitalId, doctorId);
                setAnalyticsData(data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
                // Handle error state if needed
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [doctorId, hospitalId]);


    const activeKPIs = useMemo(() => {
        if (!analyticsData) return null;
        return {
            visits: analyticsData.totalVisits.byBucket[timeBucket],
            visitsOverall: analyticsData.totalVisits.overall,
            patients: analyticsData.uniquePatients.byBucket[timeBucket],
            patientsOverall: analyticsData.uniquePatients.overall,
            newPatients: analyticsData.newVsReturningPatients.new.byBucket[timeBucket],
            returningPatients: analyticsData.newVsReturningPatients.returning.byBucket[timeBucket],
            noShow: analyticsData.noShow.byBucket[timeBucket],
            cancelled: analyticsData.cancelled.byBucket[timeBucket]
        };
    }, [analyticsData, timeBucket]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!analyticsData || !activeKPIs) {
        return (
            <div className="space-y-6 p-4 min-h-screen bg-gray-50/50 dark:bg-slate-950/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-brand-600" />
                            {t('analytics.title')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('analytics.description')}</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 border-dashed">
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-full mb-4">
                        <Activity className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Analytics Data</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md text-center">
                        There is no data available for the selected period. As you treat patients, analytics will appear here.
                    </p>
                </div>
            </div>
        );
    }

    const bpData = [
        { name: 'Normal', value: analyticsData.vitalsDistribution.bp.categoryCounts.NORMAL, color: '#10b981' },
        { name: 'Elevated', value: analyticsData.vitalsDistribution.bp.categoryCounts.ELEVATED, color: '#f59e0b' },
        { name: 'HTN Stage 1', value: analyticsData.vitalsDistribution.bp.categoryCounts.HTN_STAGE_1, color: '#f97316' },
        { name: 'HTN Stage 2', value: analyticsData.vitalsDistribution.bp.categoryCounts.HTN_STAGE_2, color: '#ef4444' },
        { name: 'Hypotension', value: analyticsData.vitalsDistribution.bp.categoryCounts.HYPOTENSION, color: '#3b82f6' }
    ];

    const bmiData = [
        { name: 'Underweight', value: analyticsData.vitalsDistribution.bmi.categoryCounts.UNDERWEIGHT, color: '#3b82f6' },
        { name: 'Normal', value: analyticsData.vitalsDistribution.bmi.categoryCounts.NORMAL, color: '#10b981' },
        { name: 'Overweight', value: analyticsData.vitalsDistribution.bmi.categoryCounts.OVERWEIGHT, color: '#f59e0b' },
        { name: 'Obese I', value: analyticsData.vitalsDistribution.bmi.categoryCounts.OBESE_I, color: '#f97316' },
        { name: 'Obese II', value: analyticsData.vitalsDistribution.bmi.categoryCounts.OBESE_II, color: '#ef4444' },
        { name: 'Obese III', value: analyticsData.vitalsDistribution.bmi.categoryCounts.OBESE_III, color: '#991b1b' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4 min-h-screen bg-gray-50/50 dark:bg-slate-950/50">

            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl' : 'bg-white dark:bg-slate-900'}`}>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3">
                        <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-brand-600" />
                        {t('analytics.title')}
                    </h2>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">{t('analytics.description')}</p>
                </div>

                {/* Mobile Segmented Control */}
                <div className="flex md:hidden w-full overflow-x-auto hide-scrollbar -mx-1 px-1 py-1 gap-2">
                    {[
                        { id: 'today', label: t('analytics.periods.today') },
                        { id: 'yesterday', label: t('analytics.periods.yesterday') },
                        { id: 'last7Days', label: t('analytics.periods.last7Days') },
                        { id: 'thisMonth', label: t('analytics.periods.thisMonth') },
                        { id: 'thisYear', label: t('analytics.periods.thisYear') },
                        { id: 'prevYear', label: t('analytics.periods.prevYear') }
                    ].map((v) => (
                        <button
                            key={v.id}
                            onClick={() => setTimeBucket(v.id as TimeBucketKey)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${timeBucket === v.id
                                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Desktop Select */}
                <div className="hidden md:flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">{t('analytics.timeRange')}:</span>
                    <Select value={timeBucket} onValueChange={(v) => setTimeBucket(v as TimeBucketKey)}>
                        <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 rounded-xl border-gray-200 dark:border-slate-700 shadow-sm">
                            <SelectValue placeholder={t('analytics.periods.thisMonth')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 dark:border-slate-800 shadow-lg">
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

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title={t('analytics.kpis.totalVisits')}
                    value={activeKPIs.visits.count}
                    percentageChange={activeKPIs.visits.percentageChange}
                    icon={Calendar}
                    color="blue"
                    period={t(`analytics.periods.${timeBucket}`)}
                    overallValue={activeKPIs.visitsOverall}
                />

                <KpiCard
                    title={t('analytics.kpis.uniquePatients')}
                    value={activeKPIs.patients.count}
                    icon={UserCheck}
                    color="indigo"
                    period={t(`analytics.periods.${timeBucket}`)}
                    overallValue={activeKPIs.patientsOverall}
                    footerText={t('analytics.kpis.reachInPeriod', { period: t(`analytics.periods.${timeBucket}`) })}
                />

                {/* New vs Returning - Custom KPI Card */}
                <Card className={`relative overflow-hidden group transition-all duration-300 border-0 col-span-1 md:col-span-2 ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg hover:shadow-xl shadow-purple-500/5' : 'bg-white dark:bg-slate-900'}`}>
                    {!isLowBandwidthMode && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="h-24 w-24 text-purple-600" />
                        </div>
                    )}
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
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-full border border-brand-100 dark:border-brand-800">
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
                                    {t('analytics.kpis.newCases', { percentage: Math.round((activeKPIs.newPatients.count / ((activeKPIs.newPatients.count + activeKPIs.returningPatients.count) || 1)) * 100) })}
                                </div>
                            </div>
                            <div className="flex-1 max-w-[240px] h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex ml-4 mb-2">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(activeKPIs.newPatients.count / ((activeKPIs.newPatients.count + activeKPIs.returningPatients.count) || 1)) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-brand-500"
                                    style={{ width: `${(activeKPIs.returningPatients.count / ((activeKPIs.newPatients.count + activeKPIs.returningPatients.count) || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Age Distribution */}
                <Card className={`lg:col-span-1 border-0 rounded-3xl overflow-hidden ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-slate-900'}`}>
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-pink-500" />
                            {t('analytics.demographics.ageGroups')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.ageDistribution} layout="horizontal" margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} strokeOpacity={0.1} />
                                    <XAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
                                    <YAxis type="number" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#6b7280' }} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                                        {analyticsData.ageDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* No-Shows & Cancellations */}
                <Card className={`lg:col-span-1 border-0 rounded-3xl overflow-hidden ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-slate-900'}`}>
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
                                        className="h-full bg-brand-600"
                                        style={{ width: `${Math.round(((activeKPIs.visits.count) / (Math.max(activeKPIs.visits.count + activeKPIs.noShow.count + activeKPIs.cancelled.count, 1))) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* BMI Distribution */}
                <Card className={`lg:col-span-1 border-0 rounded-3xl overflow-hidden ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-slate-900'}`}>
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Scale className="h-5 w-5 text-brand-500" />
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
                <Card className={`shadow-lg border-0 rounded-3xl overflow-hidden ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-slate-900'}`}>
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
                                                    width: `${(item.value / (analyticsData.totalVisits.overall || 1)) * 100}%`
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
                <Card className={`shadow-lg border-0 rounded-3xl overflow-hidden ${!isLowBandwidthMode ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-slate-900'}`}>
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-brand-500" />
                            {t('analytics.vitals.weightDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 px-6">
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.vitalsDistribution.weight.buckets}>
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
                    data={analyticsData.medicalStats.Top5MedicineUse}
                    accentColor="emerald"
                    t={t}
                />

                {/* Top Complains */}
                <StatsTable
                    title={t('analytics.medicalStats.commonComplains')}
                    icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                    data={analyticsData.medicalStats.Top5Complain}
                    accentColor="amber"
                    t={t}
                />

                {/* Top Diagnosis */}
                <StatsTable
                    title={t('analytics.medicalStats.topDiagnosis')}
                    icon={<Activity className="h-5 w-5 text-brand-500" />}
                    data={analyticsData.medicalStats.Top5Diagnosis}
                    accentColor="blue"
                    t={t}
                />

                {/* Top Investigations */}
                <StatsTable
                    title={t('analytics.medicalStats.topInvestigations')}
                    icon={<CheckCircle className="h-5 w-5 text-purple-500" />}
                    data={analyticsData.medicalStats.Top5Investigation}
                    accentColor="purple"
                    t={t}
                />

                {/* Top Examinations */}
                <StatsTable
                    title={t('analytics.medicalStats.topExaminations')}
                    icon={<Clock className="h-5 w-5 text-brand-500" />}
                    data={analyticsData.medicalStats.Top5Examination}
                    accentColor="indigo"
                    className="md:col-span-2 xl:col-span-1"
                    t={t}
                />
            </div>
        </div>
    );
};

// --- Helper Components ---

interface KpiCardProps {
    title: string;
    value: number | string;
    percentageChange?: number;
    icon: LucideIcon;
    color: string;
    period: string;
    footerText?: string;
    trend?: "up" | "down" | "neutral";
    overallValue?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, percentageChange, icon: Icon, color, period, footerText, overallValue }) => {
    const isLowBandwidthMode = useAppStore((state) => state.isLowBandwidthMode);

    // Quick mapping for background/text based on color name
    const colorMap: Record<string, { bg: string, text: string, iconBg: string }> = {
        'blue': { bg: 'bg-brand-50 dark:bg-brand-900/20', text: 'text-brand-600', iconBg: 'bg-brand-50 dark:bg-brand-900/30' },
        'indigo': { bg: 'bg-brand-50 dark:bg-brand-900/20', text: 'text-brand-600', iconBg: 'bg-brand-50 dark:bg-brand-900/30' },
        'emerald': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        'violet': { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600', iconBg: 'bg-violet-50 dark:bg-violet-900/30' },
        'rose': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600', iconBg: 'bg-rose-50 dark:bg-rose-900/30' },
    };

    // Fallback if color not found
    const theme = colorMap[color] || colorMap['blue'];

    return (
        <Card className={`relative overflow-hidden group transition-all duration-300 border-0 ${!isLowBandwidthMode ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg hover:shadow-xl shadow-brand-500/5' : 'bg-white dark:bg-slate-900'} ${theme.bg}`}>
            {!isLowBandwidthMode && (
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Icon className={`h-24 w-24 ${theme.text}`} />
                </div>
            )}
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${theme.iconBg}`}>
                        <Icon className={`h-5 w-5 ${theme.text} dark:${theme.text.replace('600', '400')}`} />
                    </div>
                    {percentageChange !== undefined && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
                            +{percentageChange}%
                        </Badge>
                    )}
                </div>
                <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
                    {overallValue !== undefined && (
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            / {overallValue} <span className="text-xs font-normal">Total</span>
                        </div>
                    )}
                </div>
                <div className={`flex items-center gap-1 mt-2 text-xs ${theme.text} dark:${theme.text.replace('600', '400')} font-medium`}>
                    <span>{footerText || period}</span>
                    {!footerText && <ArrowRight className="h-3 w-3" />}
                </div>
            </CardContent>
        </Card>
    );
};

interface StatsTableProps {
    title: string;
    icon: React.ReactNode;
    data: MedicalStatItem[];
    accentColor: string;
    className?: string;
    t: any;
}

const StatsTable: React.FC<StatsTableProps> = ({ title, icon, data, accentColor, className, t }) => {
    // Mapping accent color to hex for the chart
    const colorMap: Record<string, string> = {
        'emerald': '#10b981',
        'amber': '#f59e0b',
        'blue': '#3b82f6',
        'purple': '#8b5cf6',
        'indigo': '#6366f1'
    };
    const barColor = colorMap[accentColor] || colorMap['blue'];

    return (
        <Card className={`shadow-lg border-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden ${className}`}>
            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/20 dark:bg-slate-900/10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
                <div className="h-[280px]">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    fontSize={11}
                                    width={120}
                                    tick={{ fill: 'currentColor' }}
                                    className="text-gray-600 dark:text-gray-400 font-medium"
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'rgb(255 255 255 / 0.95)'
                                    }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                    formatter={(value: number) => [value, t('analytics.medicalStats.count')]}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} fill={barColor}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={barColor} fillOpacity={1 - (index * 0.15)} />
                                    ))}
                                    <LabelList
                                        dataKey="count"
                                        position="right"
                                        offset={8}
                                        className="fill-gray-900 dark:fill-white font-bold text-[11px]"
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-full mb-3">
                                <Activity className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">No data available</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
