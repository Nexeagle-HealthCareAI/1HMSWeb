import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { VitalReadingItem } from '../services/vitalsApi';
import { formatIstTime } from '../utils/istDate';

interface Props {
    readings: VitalReadingItem[];
}

// Fixed categorical order (dataviz skill's validated default palette) — slot 1/2, never cycled.
const SERIES_BLUE = '#2a78d6';
const SERIES_AQUA = '#1baf7a';
const GRID = '#e1e0d9';
const AXIS_INK = '#898781';

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e1e0d9', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

interface Point {
    ts: string;
    time: string;
    temperature?: number;
    pulse?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    spO2?: number;
}

const MiniChart: React.FC<{
    title: string;
    unit?: string;
    data: Point[];
    lines: { key: keyof Point; color: string; name: string }[];
    domain?: [number | 'auto', number | 'auto'];
}> = ({ title, unit, data, lines }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-bold text-slate-600 mb-1">{title}{unit ? <span className="font-normal text-slate-400"> ({unit})</span> : null}</p>
        <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={34} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 700, color: '#0b0b0b' }} />
                {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={12} />}
                {lines.map(l => (
                    <Line key={String(l.key)} type="monotone" dataKey={l.key} name={l.name} stroke={l.color}
                        strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
);

/**
 * Small multiples — each vital sign gets its own single-axis chart rather than combining
 * temperature/BP/RR/SpO2 onto one shared or dual axis (they're on wildly different scales).
 * Blood Pressure is the one genuinely two-series chart (Systolic/Diastolic), using the fixed
 * categorical slot order; every other panel is single-series (title names it, no legend needed).
 */
export const VitalsTrendChart: React.FC<Props> = ({ readings }) => {
    // readings arrive newest-first from the API; charts read left-to-right chronologically.
    const data: Point[] = [...readings].reverse().map(r => ({
        ts: r.recordedAt,
        time: formatIstTime(r.recordedAt),
        temperature: r.temperature ?? undefined,
        pulse: r.pulse ?? undefined,
        systolicBP: r.systolicBP ?? undefined,
        diastolicBP: r.diastolicBP ?? undefined,
        respiratoryRate: r.respiratoryRate ?? undefined,
        spO2: r.spO2 ?? undefined,
    }));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MiniChart title="Temperature" unit="°" data={data} lines={[{ key: 'temperature', color: SERIES_BLUE, name: 'Temp' }]} />
            <MiniChart title="Heart Rate" unit="bpm" data={data} lines={[{ key: 'pulse', color: SERIES_BLUE, name: 'Pulse' }]} />
            <MiniChart title="Blood Pressure" unit="mmHg" data={data} lines={[
                { key: 'systolicBP', color: SERIES_BLUE, name: 'Systolic' },
                { key: 'diastolicBP', color: SERIES_AQUA, name: 'Diastolic' },
            ]} />
            <MiniChart title="Respiratory Rate" unit="/min" data={data} lines={[{ key: 'respiratoryRate', color: SERIES_BLUE, name: 'RR' }]} />
            <MiniChart title="SpO2" unit="%" data={data} lines={[{ key: 'spO2', color: SERIES_BLUE, name: 'SpO2' }]} />
        </div>
    );
};
