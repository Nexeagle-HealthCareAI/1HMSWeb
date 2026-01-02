import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Activity, Calendar, TrendingUp, Users, AlertTriangle, CheckCircle,
    FileText, DollarSign, Clock, TrendingDown, Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DoctorAnalyticsPage: React.FC = () => {
    const { t } = useTranslation();

    // Mock Data for demonstration
    const visitData = [
        { name: 'Mon', visits: 12 },
        { name: 'Tue', visits: 19 },
        { name: 'Wed', visits: 15 },
        { name: 'Thu', visits: 22 },
        { name: 'Fri', visits: 25 },
        { name: 'Sat', visits: 18 },
        { name: 'Sun', visits: 10 },
    ];

    const appointmentStatusData = [
        { name: 'Completed', value: 65, color: '#10b981' },
        { name: 'Cancelled', value: 15, color: '#ef4444' },
        { name: 'No Show', value: 10, color: '#f59e0b' },
        { name: 'Rescheduled', value: 10, color: '#3b82f6' },
    ];

    const demographicsData = [
        { name: '18-30', value: 20 },
        { name: '31-50', value: 45 },
        { name: '51-70', value: 25 },
        { name: '70+', value: 10 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4">

            <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Analytics</h2>
                <p className="text-gray-500 dark:text-gray-400">Overview of your clinical performance and patient statistics.</p>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-0 bg-blue-50 dark:bg-blue-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">1,230</div>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-0 bg-green-50 dark:bg-green-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">+573</div>
                        <p className="text-xs text-green-600/80 dark:text-green-400">+20% from last month</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-0 bg-purple-50 dark:bg-purple-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Consultation Time</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">18m</div>
                        <p className="text-xs text-purple-600/80 dark:text-purple-400">Avg. duration per patient</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-0 bg-amber-50 dark:bg-amber-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Satisfaction</CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">4.8/5</div>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400">Based on patient feedback</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Patient Visits Chart */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-500" />
                            Weekly Patient Volume
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={visitData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Appointment Status Pie Chart */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            Appointment Outcomes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={appointmentStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {appointmentStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Demographics Area Chart */}
                <Card className="shadow-md lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-pink-500" />
                            Patient Demographics (Age Group)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={demographicsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#ec4899" fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};
