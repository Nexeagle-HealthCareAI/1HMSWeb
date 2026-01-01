import { TimelineEventData } from '../services/timelineApi';

// --- Type Definitions ---

export type VisitStatus = 'Completed' | 'InProgress' | 'Upcoming' | 'Cancelled';

export interface ClinicalEvent extends TimelineEventData {
    visitType: VisitStatus; // Derived status
    dateObj: Date;
}

export interface AnalyticsMetrics {
    careRecency: {
        lastSeenDays: number | null;
        nextAppointmentDate: Date | null;
        visitCounts: {
            last30: number;
            last90: number;
            last365: number;
            allTime: number;
        };
        rates: {
            completed: number;
            cancellation: number;
        };
        stuckVisits: number;
    };
    latestVitals: {
        bp: { sys: number; dia: number } | null;
        pulse: number | null;
        temp: number | null;
        spo2: number | null;
        weight: number | null;
        bmi: number | null;
        date: string | null;
    };
    trends: {
        bpDirection: 'up' | 'down' | 'stable' | 'unknown';
        weightDirection: 'up' | 'down' | 'stable' | 'unknown';
    };
    clinicalComplexity: {
        activeProblemsCount: number;
        symptomLoad: number;
        symptomDurationMax: number;
    };
    treatment: {
        currentMedicationsCount: number;
        investigationsCount: number; // Aggregate (e.g., last 90 days or latest)
        proceduresCount: number;
        medicationRiskAlerts: number;
    };
    dataQuality: {
        clinicalCompleteness: number; // %
        vitalsCompleteness: number; // %
        invalidDataCount: number;
    };
}

export interface ChartDataPoints {
    statusDonut: { name: string; value: number; color: string }[];
    visitFrequency: {
        weekly: { name: string; visits: number }[];
        monthly: { name: string; visits: number }[];
        yearly: { name: string; visits: number }[];
    };
    vitalsTrend: { date: string; sys: number | null; dia: number | null; weight: number | null; bmi: number | null; temp: number | null; spo2: number | null }[];
    symptomDuration: { name: string; value: number; type: 'Duration' | 'Frequency' }[];
    ordersBreakdown: { name: string; value: number }[];
    medicationMix: { name: string; value: number }[];
    problemList: { name: string; value: number }[];
    comorbidityList: { name: string; value: number }[];
}

export interface AlertTrigger {
    type: 'clinical' | 'medication' | 'followup' | 'quality';
    severity: 'high' | 'medium' | 'low';
    message: string;
}

// --- Helper Functions ---

const normalizeStatus = (status: string, date: Date): VisitStatus => {
    const s = status.toUpperCase();
    const now = new Date();

    // Cancelled
    if (s === 'CANCELLED' || s === 'NO-SHOW') return 'Cancelled';

    // Completed
    if (s === 'COMPLETED') return 'Completed';

    // In Progress
    if (['READY', 'VITALS_REQUIRED', 'LAB_REQUIRED', 'CHECK-IN', 'IN-PROGRESS'].includes(s)) return 'InProgress';

    // Upcoming (Explicit FUTURE or date in future and not completed/cancelled)
    if (s === 'FUTURE' || s === 'SCHEDULED' || date > now) return 'Upcoming';

    return 'InProgress';
};

// Helper to parse duration string to days
const parseDurationToDays = (text: string): number | null => {
    // Patterns: "3 days", "1 week", "2 mos"
    const regex = /(\d+)\s*(day|week|month|yr|year)s?/i;
    const match = text.match(regex);
    if (!match) return null;

    const val = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('day')) return val;
    if (unit.startsWith('week')) return val * 7;
    if (unit.startsWith('month')) return val * 30;
    if (unit.startsWith('yr') || unit.startsWith('year')) return val * 365;

    return null;
};

// --- Main Processor ---

export const processAnalytics = (rawData: TimelineEventData[]) => {
    const now = new Date();

    // 1. Normalize Events
    const events: ClinicalEvent[] = rawData.map(d => ({
        ...d,
        dateObj: new Date(d.appDate),
        visitType: normalizeStatus(d.status, new Date(d.appDate))
    })).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()); // Descending order (latest first)

    const completedEvents = events.filter(e => e.visitType === 'Completed');
    const upcomingEvents = events.filter(e => e.visitType === 'Upcoming').sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()); // Ascending (nearest first)

    // 2. Metrics Calculation

    // Care Recency
    const lastCompleted = completedEvents[0];
    const nextAppt = upcomingEvents[0];

    const daysSinceLast = lastCompleted
        ? Math.floor((now.getTime() - lastCompleted.dateObj.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Time Windows
    const countInWindow = (days: number) => events.filter(e => (now.getTime() - e.dateObj.getTime()) <= (days * 24 * 60 * 60 * 1000)).length;

    // Rates
    const totalInWindow = events.length;
    const completedCount = completedEvents.length;
    const cancelledCount = events.filter(e => e.visitType === 'Cancelled').length;

    // Stuck Visits
    const stuckVisits = events.filter(e =>
        e.visitType === 'InProgress' &&
        (now.getTime() - e.dateObj.getTime()) > (24 * 60 * 60 * 1000)
    ).length;

    // Latest Vitals
    const eventWithVitals = events.find(e => e.vitalsJson && (e.vitalsJson.bp?.sys || e.vitalsJson.weightKg));
    const latestVitals = eventWithVitals?.vitalsJson;

    // Complexity
    const allDiagnoses = new Set(completedEvents.filter(e => e.diagnosis).map(e => e.diagnosis));
    const activeProblemsCount = allDiagnoses.size;

    // 3. Alerts Engine
    const alerts: AlertTrigger[] = [];

    // BP Check
    if (latestVitals?.bp?.sys && latestVitals.bp.sys > 140) {
        alerts.push({ type: 'clinical', severity: 'high', message: `Elevated BP (${latestVitals.bp.sys}/${latestVitals.bp.dia}) detected on last visit.` });
    }

    // Stuck Visits Alert
    if (stuckVisits > 0) {
        alerts.push({ type: 'quality', severity: 'medium', message: `${stuckVisits} visits appear stuck in 'In Progress' for > 24h.` });
    }

    // Missing Vitals Alert (Data Quality)
    const incompleteVitalsCount = completedEvents.filter(e => !e.vitalsJson || !e.vitalsJson.bp).length;
    if (incompleteVitalsCount > 0) {
        const pct = Math.round((incompleteVitalsCount / (completedEvents.length || 1)) * 100);
        if (pct > 50) alerts.push({ type: 'quality', severity: 'low', message: `High rate of missing vitals (${pct}% of completed visits).` });
    }

    // 4. Chart Data Generation

    // Status Donut
    const statusCounts = events.reduce((acc, e) => {
        acc[e.visitType] = (acc[e.visitType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const statusDonut = [
        { name: 'Completed', value: statusCounts['Completed'] || 0, color: '#10b981' },
        { name: 'Upcoming', value: statusCounts['Upcoming'] || 0, color: '#3b82f6' },
        { name: 'In Progress', value: statusCounts['InProgress'] || 0, color: '#f59e0b' },
        { name: 'Cancelled', value: statusCounts['Cancelled'] || 0, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Vitals Trend
    const vitalsTrend = [...events]
        .filter(e => e.visitType === 'Completed' && e.vitalsJson)
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .map(e => ({
            date: e.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            sys: e.vitalsJson?.bp?.sys || null,
            dia: e.vitalsJson?.bp?.dia || null,
            weight: e.vitalsJson?.weightKg || null,
            bmi: e.vitalsJson?.bmi || null,
            temp: e.vitalsJson?.tempC || null,
            spo2: e.vitalsJson?.spo2 || null,
        }));

    // Symptom Frequency (Top 5 by occurrence count across all visits)
    const symptomData: { name: string; value: number; type: 'Frequency' }[] = [];

    const freqMap: Record<string, number> = {};
    completedEvents.forEach(evt => {
        if (evt.chiefComplaint) {
            const items = evt.chiefComplaint.split(/[,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
            items.forEach(i => {
                // Normalize: strip duration info for counting
                const name = i.replace(/\s*(for|since)?\s*\d+\s*(day|week|month|yr|year)s?/i, '').trim();
                if (name) freqMap[name] = (freqMap[name] || 0) + 1;
            });
        }
    });

    const sortedSymptoms = Object.entries(freqMap)
        .map(([name, count]) => ({
            name: name.replace(/\b\w/g, c => c.toUpperCase()),
            value: count,
            type: 'Frequency' as const
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    symptomData.push(...sortedSymptoms);

    return {
        metrics: {
            careRecency: {
                lastSeenDays: daysSinceLast,
                nextAppointmentDate: nextAppt ? nextAppt.dateObj : null,
                visitCounts: {
                    last30: countInWindow(30),
                    last90: countInWindow(90),
                    last365: countInWindow(365),
                    allTime: events.length
                },
                rates: {
                    completed: totalInWindow ? (completedCount / totalInWindow) : 0,
                    cancellation: totalInWindow ? (cancelledCount / totalInWindow) : 0,
                },
                stuckVisits,
            },
            latestVitals: {
                bp: latestVitals?.bp || null,
                pulse: latestVitals?.pulse || null,
                temp: latestVitals?.tempC || null,
                spo2: latestVitals?.spo2 || null,
                weight: latestVitals?.weightKg || null,
                bmi: latestVitals?.bmi || null,
                date: eventWithVitals ? eventWithVitals.dateObj.toLocaleDateString() : null
            },
            trends: {
                bpDirection: 'stable',
                weightDirection: 'stable'
            },
            clinicalComplexity: {
                activeProblemsCount,
                symptomLoad: lastCompleted?.chiefComplaint ? lastCompleted.chiefComplaint.split(';').length : 0,
                symptomDurationMax: 0
            },
            treatment: {
                currentMedicationsCount: lastCompleted?.medications?.length || 0,
                investigationsCount: completedEvents.reduce((acc, e) => acc + (e.orders?.investigations?.length || 0), 0),
                proceduresCount: completedEvents.reduce((acc, e) => acc + (e.orders?.procedures?.length || 0), 0),
                medicationRiskAlerts: 0
            },
            dataQuality: {
                clinicalCompleteness: 0,
                vitalsCompleteness: completedEvents.length ? ((completedEvents.length - incompleteVitalsCount) / completedEvents.length) : 0,
                invalidDataCount: 0
            }
        },
        charts: {
            statusDonut,
            visitFrequency: {
                weekly: (() => {
                    const weekMap: Record<string, number> = {};
                    events.forEach(evt => {
                        const weekStart = new Date(evt.dateObj);
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
                        const weekKey = weekStart.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                        weekMap[weekKey] = (weekMap[weekKey] || 0) + 1;
                    });
                    return Object.entries(weekMap)
                        .map(([name, visits]) => ({ name, visits, sortKey: new Date(name) }))
                        .sort((a, b) => a.sortKey.getTime() - b.sortKey.getTime())
                        .map(({ name, visits }) => ({ name, visits }));
                })(),
                monthly: (() => {
                    const monthMap: Record<string, number> = {};
                    events.forEach(evt => {
                        const monthKey = evt.dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                        monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
                    });
                    return Object.entries(monthMap)
                        .map(([name, visits]) => ({ name, visits, sortKey: new Date(name + ' 1') }))
                        .sort((a, b) => a.sortKey.getTime() - b.sortKey.getTime())
                        .map(({ name, visits }) => ({ name, visits }));
                })(),
                yearly: (() => {
                    const yearMap: Record<string, number> = {};
                    events.forEach(evt => {
                        const yearKey = evt.dateObj.getFullYear().toString();
                        yearMap[yearKey] = (yearMap[yearKey] || 0) + 1;
                    });
                    return Object.entries(yearMap)
                        .map(([name, visits]) => ({ name, visits }))
                        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
                })()
            },
            vitalsTrend,
            symptomDuration: symptomData,
            ordersBreakdown: (() => {
                const ordersMap: Record<string, number> = {};
                completedEvents.forEach(evt => {
                    // Collect investigations
                    if (evt.orders?.investigations) {
                        evt.orders.investigations.forEach((inv: any) => {
                            const name = typeof inv === 'string' ? inv : inv.name || inv.test;
                            if (name) {
                                const normalized = name.trim();
                                ordersMap[normalized] = (ordersMap[normalized] || 0) + 1;
                            }
                        });
                    }
                    // Collect procedures
                    if (evt.orders?.procedures) {
                        evt.orders.procedures.forEach((proc: any) => {
                            const name = typeof proc === 'string' ? proc : proc.name || proc.procedure;
                            if (name) {
                                const normalized = name.trim();
                                ordersMap[normalized] = (ordersMap[normalized] || 0) + 1;
                            }
                        });
                    }
                });
                return Object.entries(ordersMap)
                    .map(([name, count]) => ({ name, value: count }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5);
            })(),
            problemList: (() => {
                const diagnosisMap: Record<string, number> = {};
                completedEvents.forEach(evt => {
                    if (evt.diagnosis) {
                        // Split by common delimiters and normalize
                        const diagnoses = evt.diagnosis.split(/[,;]+/).map(d => d.trim()).filter(Boolean);
                        diagnoses.forEach(diag => {
                            const normalized = diag.toLowerCase().trim();
                            if (normalized) {
                                diagnosisMap[normalized] = (diagnosisMap[normalized] || 0) + 1;
                            }
                        });
                    }
                });
                return Object.entries(diagnosisMap)
                    .map(([name, count]) => ({
                        name: name.replace(/\b\w/g, c => c.toUpperCase()),
                        value: count
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5);
            })(),
            comorbidityList: (() => {
                const comorbidityMap: Record<string, number> = {};
                completedEvents.forEach(evt => {
                    if (evt.comorbidity) {
                        const comorbidities = evt.comorbidity.split(/[,;]+/).map(c => c.trim()).filter(Boolean);
                        comorbidities.forEach(comorbid => {
                            const normalized = comorbid.toLowerCase().trim();
                            if (normalized) {
                                comorbidityMap[normalized] = (comorbidityMap[normalized] || 0) + 1;
                            }
                        });
                    }
                });
                return Object.entries(comorbidityMap)
                    .map(([name, count]) => ({
                        name: name.replace(/\b\w/g, c => c.toUpperCase()),
                        value: count
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5);
            })(),
            medicationMix: []
        },
        alerts
    };
};
