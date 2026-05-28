import React, { useMemo, useState } from 'react';
import { Gift, Users, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// NOTE: Mock data — incentive accrual backend not built yet. Wire to ReferralIncentive API later.
type Referrer = { id: string; name: string; type: string; phone?: string; accrued: number; paid: number };
type Accrual = { id: string; referrerId: string; module: 'OPD' | 'IPD' | 'LAB' | 'RAD'; patient: string; eligible: number; incentive: number; status: 'ACCRUED' | 'PAID'; at: string };

const MODULE_TONE: Record<string, string> = {
    OPD: 'bg-sky-50 text-sky-700 border-sky-200',
    IPD: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    LAB: 'bg-violet-50 text-violet-700 border-violet-200',
    RAD: 'bg-teal-50 text-teal-700 border-teal-200',
};

const MOCK_REFERRERS: Referrer[] = [
    { id: 'r1', name: 'Dr. Anand (External GP)', type: 'REFERRER', phone: '9810011111', accrued: 1300, paid: 4200 },
    { id: 'r2', name: 'CarePlus Diagnostics', type: 'AGENT', phone: '9810022222', accrued: 2640, paid: 1500 },
    { id: 'r3', name: 'Sunrise Polyclinic', type: 'REFERRER', phone: '9810033333', accrued: 0, paid: 900 },
];

const MOCK_ACCRUALS: Accrual[] = [
    { id: 'a1', referrerId: 'r1', module: 'IPD', patient: 'Ramesh Kumar', eligible: 13000, incentive: 1300, status: 'ACCRUED', at: '2026-05-27T10:30:00' },
    { id: 'a2', referrerId: 'r2', module: 'LAB', patient: 'Sita Devi', eligible: 12000, incentive: 1440, status: 'ACCRUED', at: '2026-05-26T16:10:00' },
    { id: 'a3', referrerId: 'r2', module: 'RAD', patient: 'Imran Khan', eligible: 10000, incentive: 1200, status: 'ACCRUED', at: '2026-05-25T12:05:00' },
    { id: 'a4', referrerId: 'r1', module: 'OPD', patient: 'Geeta Sharma', eligible: 4200, incentive: 420, status: 'PAID', at: '2026-05-20T09:00:00' },
];

const inr = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

const KpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <Card className={cn('border p-4 flex items-center gap-3', tone)}>
        <div className="h-10 w-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-xl font-black truncate">{value}</p>
        </div>
    </Card>
);

export const IncentiveTab: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string>(MOCK_REFERRERS[0].id);

    const kpis = useMemo(() => {
        const accrued = MOCK_REFERRERS.reduce((t, r) => t + r.accrued, 0);
        const paid = MOCK_REFERRERS.reduce((t, r) => t + r.paid, 0);
        return { accrued, paid, count: MOCK_REFERRERS.length };
    }, []);

    const selected = MOCK_REFERRERS.find(r => r.id === selectedId)!;
    const selectedAccruals = MOCK_ACCRUALS.filter(a => a.referrerId === selectedId)
        .sort((a, b) => b.at.localeCompare(a.at));

    const mockAction = () => toast({ title: 'Mock UI', description: 'Incentive accrual & payout backend is not built yet.' });

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] px-3 py-1.5">
                Preview — incentive accrual has no backend yet. Internal ledger only; never shown on patient/GST invoices. TDS u/s 194H applies at payout.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiCard label="Payable (Accrued)" value={inr(kpis.accrued)} icon={<Wallet className="h-5 w-5 text-amber-600" />} tone="border-amber-100 bg-amber-50 text-amber-900" />
                <KpiCard label="Paid to Date" value={inr(kpis.paid)} icon={<Gift className="h-5 w-5 text-emerald-600" />} tone="border-emerald-100 bg-emerald-50 text-emerald-900" />
                <KpiCard label="Referrers" value={String(kpis.count)} icon={<Users className="h-5 w-5 text-fuchsia-600" />} tone="border-fuchsia-100 bg-fuchsia-50 text-fuchsia-900" />
            </div>

            <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
                {/* Referrer list */}
                <Card className="col-span-12 md:col-span-4 border-slate-200 bg-white overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Referrers</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-fuchsia-700" onClick={mockAction}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-auto">
                        {MOCK_REFERRERS.map(r => (
                            <button key={r.id} onClick={() => setSelectedId(r.id)} className={cn('w-full text-left px-3 py-2.5 hover:bg-fuchsia-50/40', selectedId === r.id && 'bg-fuchsia-50 border-l-2 border-l-fuchsia-500')}>
                                <p className="font-semibold text-slate-900 text-sm truncate">{r.name}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-slate-500">{r.type}</span>
                                    {r.accrued > 0 && <span className="text-[10px] font-bold text-amber-700">{inr(r.accrued)} due</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Accrual ledger */}
                <Card className="col-span-12 md:col-span-8 border-slate-200 bg-white overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <div>
                            <p className="font-bold text-slate-900">{selected.name}</p>
                            <p className="text-[11px] text-slate-500">{selected.type}{selected.phone ? ` · ${selected.phone}` : ''}</p>
                        </div>
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" disabled={selected.accrued <= 0} onClick={mockAction}>
                            <Wallet className="h-3.5 w-3.5 mr-1" /> Pay {inr(selected.accrued)}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0">
                                <TableRow>
                                    <TableHead className="text-[10px] uppercase tracking-wider text-slate-500">Accrued</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider text-slate-500">Source</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider text-slate-500">Patient</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wider text-slate-500">Eligible</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wider text-slate-500">Incentive</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider text-slate-500">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedAccruals.map(a => (
                                    <TableRow key={a.id} className="border-b border-slate-100">
                                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(a.at), 'd MMM HH:mm')}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold', MODULE_TONE[a.module])}>{a.module}</Badge></TableCell>
                                        <TableCell className="text-xs">{a.patient}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{inr(a.eligible)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-800">{inr(a.incentive)}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold', a.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{a.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {selectedAccruals.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center h-28 text-slate-400 text-xs">No incentives accrued for this referrer.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default IncentiveTab;
