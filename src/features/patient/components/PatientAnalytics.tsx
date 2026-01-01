import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TimelineEventData } from '../services/timelineApi';
import { processAnalytics, AlertTrigger } from '../utils/analyticsUtils';
import {
    Activity, Calendar, TrendingUp, Weight, AlertTriangle, CheckCircle,
    FileText, ClipboardList, Stethoscope, Clock, TrendingDown, Minus, TestTube
} from 'lucide-react';
import { VisitFrequencyChart } from './VisitFrequencyChart';

interface PatientAnalyticsProps {
    timelineEvents: TimelineEventData[];
}

export const PatientAnalytics: React.FC<PatientAnalyticsProps> = ({ timelineEvents }) => {

    const { metrics, charts, alerts } = useMemo(() => processAnalytics(timelineEvents), [timelineEvents]);

    if (!timelineEvents.length) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No analytics data available yet.
            </div>
        );
    }

    // Helper for trend icons
    const TrendIcon = ({ direction }: { direction: string }) => {
        if (direction === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />;
        if (direction === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />;
        return <Minus className="h-4 w-4 text-gray-400" />;
    };

    return (
        <div className="space-y-8 pt-4 pb-12 animate-in fade-in duration-500">

            {/* 1. Alerts Section (Dynamic) */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Clinical Attention & Alerts
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {alerts.map((alert, idx) => (
                            <Alert key={idx} variant={alert.severity === 'high' ? 'destructive' : 'default'} className={`${alert.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-900' : ''}`}>
                                <AlertTriangle className={`h-4 w-4 ${alert.severity === 'medium' ? 'text-amber-600' : ''}`} />
                                <AlertTitle className="capitalize">{alert.type} Alert</AlertTitle>
                                <AlertDescription>{alert.message}</AlertDescription>
                            </Alert>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Key Metrics Row (Care Recency & Utilization) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Last Seen Card */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-blue-900">Last Seen</CardTitle>
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Clock className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-blue-900 mb-1">
                            {(() => {
                                if (metrics.careRecency.lastSeenDays === null) return 'Never';
                                const lastVisitDate = new Date();
                                lastVisitDate.setDate(lastVisitDate.getDate() - metrics.careRecency.lastSeenDays);
                                return lastVisitDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
                            })()}
                        </div>
                        <p className="text-xs font-medium text-blue-700">Last visit date</p>
                    </CardContent>
                </Card>

                {/* Visit Frequency Card */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-emerald-900">Visit Frequency</CardTitle>
                        <div className="p-2 bg-emerald-500 rounded-lg">
                            <Calendar className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-900 mb-1">
                            {metrics.careRecency.visitCounts.last90}
                            <span className="text-sm sm:text-base font-medium text-emerald-700 ml-2">in 90 days</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-emerald-200 rounded-full h-1.5">
                                <div
                                    className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min((metrics.careRecency.visitCounts.last90 / metrics.careRecency.visitCounts.allTime) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                                {metrics.careRecency.visitCounts.allTime} total
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Completion Rate Card */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-amber-900">Completion Rate</CardTitle>
                        <div className="p-2 bg-amber-500 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-amber-900 mb-2">
                            {(metrics.careRecency.rates.completed * 100).toFixed(0)}%
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                <span className="font-medium text-green-700">
                                    Completed {(metrics.careRecency.rates.completed * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                <span className="font-medium text-red-700">
                                    Cancelled {(metrics.careRecency.rates.cancellation * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* 4. Charts - Visit Frequency, Vitals Trends & Appointment Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart 0: Visit Frequency */}
                {(charts.visitFrequency.weekly.length > 0 || charts.visitFrequency.monthly.length > 0 || charts.visitFrequency.yearly.length > 0) && (
                    <Card className="shadow-md border-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between mb-3">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-900">
                                    <div className="p-2 bg-indigo-500 rounded-lg">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    Visit Frequency
                                </CardTitle>
                            </div>
                            <div className="flex gap-2 bg-white/60 backdrop-blur-sm p-1.5 rounded-xl border border-indigo-100 shadow-sm">
                                {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => {
                                            const chartElement = document.getElementById('visit-frequency-chart');
                                            if (chartElement) {
                                                chartElement.setAttribute('data-period', period);
                                                chartElement.dispatchEvent(new Event('periodChange'));
                                            }
                                        }}
                                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${period === 'monthly'
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md transform scale-105'
                                            : 'text-indigo-700 hover:bg-white/80 hover:text-indigo-900'
                                            }`}
                                        id={`period-${period}`}
                                    >
                                        {period.charAt(0).toUpperCase() + period.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                            <VisitFrequencyChart data={charts.visitFrequency} />
                        </CardContent>
                    </Card>
                )}

                {/* Appointment Status Chart */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-teal-900">
                            <div className="p-2 bg-teal-500 rounded-lg">
                                <Calendar className="h-4 w-4 text-white" />
                            </div>
                            Appointment Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                        <div className="h-[250px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.statusDonut}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {charts.statusDonut.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                            <div className="bg-white/60 backdrop-blur-sm p-2 rounded-lg border border-emerald-100">
                                <span className="block text-xs font-medium text-emerald-700">Completed</span>
                                <span className="font-bold text-emerald-600">{metrics.careRecency.rates.completed ? (metrics.careRecency.rates.completed * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm p-2 rounded-lg border border-red-100">
                                <span className="block text-xs font-medium text-red-700">Cancelled</span>
                                <span className="font-bold text-red-500">{metrics.careRecency.rates.cancellation ? (metrics.careRecency.rates.cancellation * 100).toFixed(0) : 0}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Chart 1: Blood Pressure Trend */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-red-900">
                            <div className="p-2 bg-red-500 rounded-lg">
                                <Activity className="h-4 w-4 text-white" />
                            </div>
                            Blood Pressure Trend
                        </CardTitle>
                        <CardDescription className="text-red-700">Systolic & Diastolic analysis with reference lines</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={charts.vitalsTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[60, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                        itemStyle={{ padding: 0 }}
                                        formatter={(value: any, name: any) => [value, name === 'sys' ? 'Systolic' : name === 'dia' ? 'Diastolic' : name]}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                    {/* Reference Lines for Normal Guidelines */}
                                    <ReferenceLine y={120} label={{ position: 'right', value: '120', fill: '#10b981', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
                                    <ReferenceLine y={80} label={{ position: 'right', value: '80', fill: '#10b981', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />

                                    <Line type="monotone" dataKey="sys" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} name="Systolic (mmHg)" />
                                    <Line type="monotone" dataKey="dia" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} name="Diastolic (mmHg)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Chart 2: Weight & BMI Trend */}
                <Card className="shadow-md border-0 bg-gradient-to-br from-purple-50 to-fuchsia-50 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <Weight className="h-4 w-4 text-white" />
                            </div>
                            Weight & BMI Trend
                        </CardTitle>
                        <CardDescription className="text-purple-700">With healthy BMI thresholds</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.vitalsTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: 12 } }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[15, 35]} label={{ value: 'BMI', angle: 90, position: 'insideRight', style: { fill: '#9ca3af', fontSize: 12 } }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                    {/* BMI Thresholds */}
                                    <ReferenceLine yAxisId="right" y={25} label={{ position: 'insideTopLeft', value: 'Overweight (25)', fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="3 3" />
                                    <ReferenceLine yAxisId="right" y={30} label={{ position: 'insideTopLeft', value: 'Obese (30)', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                                    <ReferenceLine yAxisId="right" y={18.5} label={{ position: 'insideBottomLeft', value: 'Underweight (18.5)', fill: '#3b82f6', fontSize: 10 }} stroke="#3b82f6" strokeDasharray="3 3" />

                                    <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#8b5cf6" fill="url(#colorWeight)" strokeWidth={2} name="Weight (kg)" />
                                    <Line yAxisId="right" type="monotone" dataKey="bmi" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="BMI" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Chart 4: Top 5 Diagnoses */}
                {charts.problemList.length > 0 && (
                    <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-green-900">
                                <div className="p-2 bg-green-500 rounded-lg">
                                    <FileText className="h-4 w-4 text-white" />
                                </div>
                                Top 5 Diagnoses
                            </CardTitle>
                            <CardDescription className="text-green-700">Most frequent conditions</CardDescription>
                        </CardHeader>
                        <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={charts.problemList}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {charts.problemList.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [value, 'Occurrences']}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Comorbidity Analysis Chart */}
                {charts.comorbidityList.length > 0 && (
                    <Card className="shadow-md border-0 bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900">
                                <div className="p-2 bg-purple-500 rounded-lg">
                                    <FileText className="h-4 w-4 text-white" />
                                </div>
                                Top 5 Comorbidities
                            </CardTitle>
                            <CardDescription className="text-purple-700">Most frequently recorded comorbid conditions</CardDescription>
                        </CardHeader>
                        <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={charts.comorbidityList}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {charts.comorbidityList.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [value, 'Occurrences']}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>



            {/* 5. Clinical & Treatment Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Symptom Analysis Chart */}
                {charts.symptomDuration.length > 0 && (
                    <Card className="shadow-md border-0 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-orange-900">
                                <div className="p-2 bg-orange-500 rounded-lg">
                                    <ClipboardList className="h-4 w-4 text-white" />
                                </div>
                                Top 5 Symptoms
                            </CardTitle>
                            <CardDescription className="text-orange-700">
                                Most frequently reported symptoms across all visits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={charts.symptomDuration}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {charts.symptomDuration.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [value, 'Occurrences']}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {charts.ordersBreakdown.length > 0 ? (
                    <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-sky-50 hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-900">
                                <div className="p-2 bg-blue-500 rounded-lg">
                                    <TestTube className="h-4 w-4 text-white" />
                                </div>
                                Top 5 Orders & Investigations
                            </CardTitle>
                            <CardDescription className="text-blue-700">Most frequently ordered tests and procedures</CardDescription>
                        </CardHeader>
                        <CardContent className="bg-white/40 backdrop-blur-sm rounded-lg mx-4 mb-4 p-3">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={charts.ordersBreakdown}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {charts.ordersBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [value, 'Times Ordered']}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Orders & Investigations</CardTitle>
                            <CardDescription>Utilization summary</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                            <TestTube className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Investigations</p>
                                            <p className="text-xs text-muted-foreground">Lab tests ordered</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold">{metrics.treatment.investigationsCount}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                                            <Stethoscope className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Procedures</p>
                                            <p className="text-xs text-muted-foreground">Clinical procedures</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold">{metrics.treatment.proceduresCount}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}



            </div>

        </div>
    );
};
