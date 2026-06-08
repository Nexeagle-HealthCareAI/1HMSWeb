import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VisitFrequencyChartProps {
    data: {
        weekly: { name: string; visits: number }[];
        monthly: { name: string; visits: number }[];
        yearly: { name: string; visits: number }[];
    };
}

export const VisitFrequencyChart: React.FC<VisitFrequencyChartProps> = ({ data }) => {
    const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

    // Listen for period changes from buttons
    React.useEffect(() => {
        const handlePeriodChange = () => {
            const chartElement = document.getElementById('visit-frequency-chart');
            const newPeriod = chartElement?.getAttribute('data-period') as 'weekly' | 'monthly' | 'yearly';
            if (newPeriod) {
                setPeriod(newPeriod);

                // Update button styles
                ['weekly', 'monthly', 'yearly'].forEach(p => {
                    const btn = document.getElementById(`period-${p}`);
                    if (btn) {
                        if (p === newPeriod) {
                            btn.className = 'px-3 py-1 text-xs font-medium rounded transition-colors bg-white text-brand-600 shadow-sm';
                        } else {
                            btn.className = 'px-3 py-1 text-xs font-medium rounded transition-colors text-gray-600 hover:text-gray-900';
                        }
                    }
                });
            }
        };

        const chartElement = document.getElementById('visit-frequency-chart');
        chartElement?.addEventListener('periodChange', handlePeriodChange);

        return () => {
            chartElement?.removeEventListener('periodChange', handlePeriodChange);
        };
    }, []);

    const currentData = data[period];

    return (
        <div className="h-[180px] w-full" id="visit-frequency-chart" data-period="monthly">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        angle={period === 'yearly' ? 0 : -45}
                        textAnchor={period === 'yearly' ? 'middle' : 'end'}
                        height={period === 'yearly' ? 30 : 60}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                        formatter={(value: any) => [value, 'Visits']}
                    />
                    <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
