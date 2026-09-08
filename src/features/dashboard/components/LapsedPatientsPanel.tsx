import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles, UserX, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fetchLapsedPatients, type LapsedPatientsResponse } from '../services/lapsedPatientsApi';
import { LoadingState, EmptyState, ErrorState } from '@/features/billing/components/StatePanel';

interface Props {
    hospitalId: string;
}

export const LapsedPatientsPanel: React.FC<Props> = ({ hospitalId }) => {
    const [data, setData] = useState<LapsedPatientsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await fetchLapsedPatients(hospitalId, page);
            if (res?.success === false) throw new Error(res?.message ?? 'Could not load lapsed patients');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load lapsed patients');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hospitalId, page]);

    useEffect(() => { load(); }, [load]);

    const handleCopy = () => {
        if (!data?.suggestedOutreachMessage) return;
        navigator.clipboard.writeText(data.suggestedOutreachMessage).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (loading) return <LoadingState rows={4} />;
    if (error) return <ErrorState message={error} onRetry={() => load(true)} />;
    if (!data) return <EmptyState title="No data available yet" hint="Once patients have a visit history, lapsed patients will show up here." />;

    const totalPages = Math.max(1, Math.ceil(data.totalCount / data.limit));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-600">
                    <Sparkles className="h-4 w-4" /> Nexeagle AI Predictive Analysis — Lapsed Patients
                </div>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl px-3" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            <Card className="border-0 ring-1 ring-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-brand-50">
                <p className="text-sm text-slate-700">{data.outlook}</p>
            </Card>

            {data.suggestedOutreachMessage && (
                <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Suggested outreach message</p>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg px-2.5" onClick={handleCopy}>
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                    <p className="text-sm text-slate-700 italic">"{data.suggestedOutreachMessage}"</p>
                    <p className="text-[11px] text-slate-400 mt-2">AI-generated template -- only send this to patients who've opted in to marketing contact.</p>
                </Card>
            )}

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Lapsed patients ({data.totalCount})</p>
                </div>

                {data.patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <UserX className="h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-500">No lapsed patients right now.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100/70 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">Patient</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">Last Visit</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">Days Since</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">Avg. Visit Gap</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">Consent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.patients.map((p) => (
                                    <tr key={p.patientId} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-700">{p.fullName || p.patientId}</td>
                                        <td className="px-4 py-3 text-center text-gray-600 whitespace-nowrap">{format(new Date(p.lastVisitDate), 'dd MMM yyyy')}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                {p.daysSinceLastVisit} days
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600 whitespace-nowrap">{p.averageGapDays.toFixed(0)} days</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                                p.marketingConsent ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500')}>
                                                {p.marketingConsent ? 'Consented' : 'Not consented'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default LapsedPatientsPanel;
