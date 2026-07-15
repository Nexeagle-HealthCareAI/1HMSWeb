import React, { useState } from 'react';
import { ArrowLeft, Gift, Users, Wallet, Phone, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { useReferrers } from '@/features/appointment/hooks/useReferrers';
import type { Referrer } from '@/features/appointment/services/referrerApi';
import { KpiStat } from '../KpiStat';
import { LoadingState, EmptyState, ErrorState } from '../StatePanel';

// Real referrer master comes from the referrals API. Incentive ACCRUAL (per-visit incentive
// amounts, payouts) has no backend yet, so those figures are shown as "—" / empty rather than
// fabricated. Wire the accrual ledger here once the ReferralIncentive API exists.
export const IncentiveTab: React.FC = () => {
    const { hospitalId } = useAuthStore();
    const { data, isLoading, isError, refetch } = useReferrers(hospitalId || '');
    // Only list referrers that actually have an incentive configured (a non-zero rate/amount).
    const referrers: Referrer[] = (data?.referrers ?? []).filter(r => (r.defaultRatePercent ?? 0) > 0);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = referrers.find(r => r.referrerId === selectedId) ?? referrers[0] ?? null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] px-3 py-2">
                Incentive accrual & payout engine is not yet available. The referrer master below is live; per-visit accruals and payouts will appear here once the backend is built. (Internal ledger only — never shown on patient/GST invoices; TDS u/s 194H applies at payout.)
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <KpiStat label="Payable (Accrued)" value="—" icon={<Wallet className="h-5 w-5 text-amber-600" />} tone="from-amber-50 to-yellow-100/50 text-amber-900" hint="Accrual engine pending" />
                <KpiStat label="Paid to Date" value="—" icon={<Gift className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" hint="Payout engine pending" />
                <KpiStat label="Referrers" value={isLoading ? '…' : String(referrers.length)} icon={<Users className="h-5 w-5 text-fuchsia-600" />} tone="from-fuchsia-50 to-purple-100/50 text-fuchsia-900" />
            </div>

            <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
                {/* Referrer master (real data) — on mobile this is the "master" list; it hides once a
                    referrer is picked (drill-in), and the detail panel takes over with a back button.
                    Both show side-by-side from md up. */}
                <Card className={cn('col-span-12 md:col-span-4 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-fuchsia-500/5 bg-white overflow-hidden flex flex-col', selectedId && 'hidden md:flex')}>
                    <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Referrers</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {isLoading ? (
                            <LoadingState rows={5} />
                        ) : isError ? (
                            <ErrorState message="Could not load referrers" onRetry={() => refetch()} />
                        ) : referrers.length === 0 ? (
                            <EmptyState icon={<Users className="h-6 w-6" />} title="No referrers with an incentive" hint="Only referrers configured with an incentive rate appear here." />
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {referrers.map(r => {
                                    const active = (selected?.referrerId ?? '') === r.referrerId;
                                    return (
                                        <button
                                            key={r.referrerId}
                                            onClick={() => setSelectedId(r.referrerId)}
                                            className={cn('w-full text-left px-3 py-3 sm:py-2.5 transition-colors hover:bg-fuchsia-50/40 active:bg-fuchsia-50', active && 'bg-fuchsia-50 border-l-2 border-l-fuchsia-500')}
                                        >
                                            <p className="font-semibold text-slate-900 text-sm truncate">{r.referrerName}</p>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-[10px] uppercase tracking-wide text-slate-500">{r.referrerType}</span>
                                                <span className="text-[10px] font-semibold text-fuchsia-700 tabular-nums">{r.defaultRatePercent}%</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Selected referrer + accrual ledger (empty until backend exists) */}
                <Card className={cn('col-span-12 md:col-span-8 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-fuchsia-500/5 bg-white overflow-hidden flex flex-col', !selectedId && 'hidden md:flex')}>
                    {selected ? (
                        <>
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                                <button type="button" onClick={() => setSelectedId(null)}
                                    className="md:hidden flex items-center gap-1.5 text-xs font-bold text-fuchsia-700 mb-2">
                                    <ArrowLeft className="h-4 w-4" /> All referrers
                                </button>
                                <p className="font-bold text-slate-900">{selected.referrerName}</p>
                                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                                    <Badge variant="outline" className="text-[10px] font-bold rounded-full bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">{selected.referrerType}</Badge>
                                    {selected.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {selected.phone}</span>}
                                    <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> {selected.defaultRatePercent}% default</span>
                                    {selected.pan && <span className="font-mono">PAN: {selected.pan}</span>}
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <EmptyState
                                    icon={<Gift className="h-6 w-6" />}
                                    title="No incentive accruals"
                                    hint="Per-visit accruals and payouts for this referrer will appear here once the incentive engine is enabled."
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <EmptyState icon={<Gift className="h-6 w-6" />} title="Select a referrer" hint="Pick a referrer on the left to view their incentive ledger." />
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default IncentiveTab;
