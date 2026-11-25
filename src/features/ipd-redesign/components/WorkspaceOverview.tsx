import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceOverviewData } from '../hooks/useWorkspaceOverview';
import { dischargeReadiness, timeAgo, vitalTiles, type Level } from '../utils/workspaceOverview';
import { formatIstDateTime, formatIstTime } from '../utils/istDate';

interface Props {
    data: WorkspaceOverviewData;
    statusCode: string;
    isActive: boolean;
    onRecordVitals: () => void;
    onOpenMar: () => void;
    onOpenNotes: () => void;
    onOpenOrders: () => void;
    onOpenFluids: () => void;
    onOpenDischarge: () => void;
    onOpenConsent: () => void;
}

const card = 'rounded-2xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm';
const cardTitle = 'text-sm font-bold text-slate-900 dark:text-zinc-100';
const linkBtn = 'text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline';

const LEVEL: Record<Level, { box: string; value: string; note: string }> = {
    ok: { box: 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800', value: 'text-slate-900 dark:text-zinc-100', note: 'text-slate-500' },
    warn: { box: 'bg-amber-50 dark:bg-amber-950/20 border-amber-300', value: 'text-amber-700', note: 'text-amber-700' },
    high: { box: 'bg-rose-50 dark:bg-rose-950/20 border-rose-300', value: 'text-rose-700', note: 'text-rose-700' },
};

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-slate-500 py-2">{children}</p>;

/**
 * What the care team needs this shift, on one screen: latest vitals, medicines due, the last
 * round note, investigation status, today's fluid balance and how close the patient is to
 * discharge. Every card links to the section where the work is actually done.
 */
export const WorkspaceOverview: React.FC<Props> = ({ data, statusCode, isActive, onRecordVitals, onOpenMar, onOpenNotes, onOpenOrders, onOpenFluids, onOpenDischarge, onOpenConsent }) => {
    const tiles = vitalTiles(data.latestVitals);
    const readiness = dischargeReadiness(data.dischargeDraft, statusCode);
    const doneCount = readiness.filter(r => r.done).length;
    const note = data.latestNote;
    const soap = note ? ([['S', note.subjective], ['O', note.objective], ['A', note.assessment], ['P', note.plan]] as const).filter(([, v]) => v?.trim()) : [];

    return (
        <div className="space-y-4">
            {isActive && data.generalConsentMissing && (
                <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3">
                    <p className="flex-1 min-w-[220px] text-sm text-amber-900 dark:text-amber-200">
                        <b>General consent not recorded.</b> Take the signed admission consent and record who signed.
                    </p>
                    <button type="button" onClick={onOpenConsent} className="h-9 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">Record consent</button>
                </div>
            )}
            <section aria-label="Latest vitals" className={card}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h2 className={cardTitle}>Latest vitals</h2>
                    {data.latestVitals && (
                        <span className="text-xs text-slate-500">
                            {formatIstTime(data.latestVitals.recordedAt)} · {timeAgo(data.latestVitals.recordedAt)}{data.latestVitals.recordedBy ? ` · ${data.latestVitals.recordedBy}` : ''}
                        </span>
                    )}
                    {data.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    {isActive && (
                        <Button size="sm" className="ml-auto h-9 rounded-full px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={onRecordVitals}>Record vitals</Button>
                    )}
                </div>
                {tiles.length === 0 ? (
                    <Empty>{data.loading ? 'Loading…' : 'No vitals recorded yet for this stay.'}</Empty>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
                        {tiles.map(t => (
                            <div key={t.key} className={cn('rounded-xl border p-2.5 sm:p-3', LEVEL[t.level].box)}>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.label}</div>
                                <div className={cn('text-lg sm:text-xl font-extrabold leading-tight', LEVEL[t.level].value)}>
                                    {t.value} <span className="text-[11px] font-semibold text-slate-500">{t.unit}</span>
                                </div>
                                <div className={cn('text-[11px]', LEVEL[t.level].note)}>{t.note}</div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                    <section aria-label="Medicines due" className={card}>
                        <div className="flex items-center mb-1">
                            <h2 className={cn(cardTitle, 'flex-1')}>Medicines due</h2>
                            <button type="button" className={linkBtn} onClick={onOpenMar}>Open MAR</button>
                        </div>
                        {data.due.length === 0 ? (
                            <Empty>{data.loading ? 'Loading…' : 'Nothing due in the next 2 hours.'}</Empty>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {data.due.slice(0, 6).map(d => (
                                    <li key={d.key} className="flex items-center gap-3 py-2.5">
                                        <span className={cn('w-12 text-xs font-bold tabular-nums', d.state === 'overdue' ? 'text-rose-700' : d.state === 'due' ? 'text-amber-700' : 'text-slate-700 dark:text-zinc-300')}>{formatIstTime(d.at)}</span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                                {d.name}{d.isHighAlert && <span className="ml-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5 align-middle">High alert</span>}
                                            </span>
                                            <span className={cn('block text-[11px]', d.state === 'overdue' ? 'text-rose-700' : 'text-slate-500')}>
                                                {d.state === 'overdue' ? `Overdue by ${d.lateMinutes} min` : d.state === 'due' ? 'Due now' : 'Coming up'}{d.detail ? ` · ${d.detail}` : ''}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {data.due.length > 6 && <button type="button" className={cn(linkBtn, 'mt-1')} onClick={onOpenMar}>+ {data.due.length - 6} more in MAR</button>}
                    </section>

                    <section aria-label="Latest round note" className={card}>
                        <div className="flex items-center mb-1">
                            <h2 className={cn(cardTitle, 'flex-1')}>Latest round note</h2>
                            <button type="button" className={linkBtn} onClick={onOpenNotes}>{isActive ? 'Add note' : 'All notes'}</button>
                        </div>
                        {!note ? (
                            <Empty>{data.loading ? 'Loading…' : 'No round notes yet.'}</Empty>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500 mb-2">{note.doctorName || 'Doctor'} · {formatIstDateTime(note.notedAt)}</p>
                                <dl className="grid grid-cols-[20px_1fr] gap-x-2 gap-y-1.5 text-sm leading-relaxed">
                                    {soap.map(([k, v]) => (
                                        <React.Fragment key={k}>
                                            <dt className="font-extrabold text-brand-700 dark:text-brand-400">{k}</dt>
                                            <dd className="m-0 text-slate-800 dark:text-zinc-200 whitespace-pre-wrap line-clamp-3">{v}</dd>
                                        </React.Fragment>
                                    ))}
                                </dl>
                            </>
                        )}
                    </section>
                </div>

                <div className="space-y-4">
                    <section aria-label="Lab and imaging" className={card}>
                        <div className="flex items-center mb-1">
                            <h2 className={cn(cardTitle, 'flex-1')}>Lab &amp; imaging</h2>
                            <button type="button" className={linkBtn} onClick={onOpenOrders}>All orders</button>
                        </div>
                        {data.investigations.length === 0 ? (
                            <Empty>{data.loading ? 'Loading…' : 'No tests ordered.'}</Empty>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {data.investigations.slice(0, 6).map(r => (
                                    <li key={r.key} className="flex items-center gap-2 py-2 text-sm">
                                        <span className="flex-1 min-w-0 truncate font-semibold text-slate-900 dark:text-zinc-100">
                                            {r.name}{r.urgent && <span className="ml-1.5 text-[10px] font-bold text-rose-700">URGENT</span>}
                                        </span>
                                        <span className="text-[11px] text-slate-500 hidden sm:inline">{r.kind}</span>
                                        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                                            r.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : r.tone === 'wait' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{r.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-label="Intake and output today" className={card}>
                        <div className="flex items-center mb-2">
                            <h2 className={cn(cardTitle, 'flex-1')}>Intake / output today</h2>
                            <button type="button" className={linkBtn} onClick={onOpenFluids}>Open chart</button>
                        </div>
                        {!data.fluidToday ? (
                            <Empty>{data.loading ? 'Loading…' : 'Nothing charted today.'}</Empty>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl bg-slate-50 dark:bg-zinc-950 p-2.5"><div className="text-lg font-extrabold">{data.fluidToday.totalInMl.toLocaleString('en-IN')}</div><div className="text-[11px] text-slate-500">In (ml)</div></div>
                                <div className="rounded-xl bg-slate-50 dark:bg-zinc-950 p-2.5"><div className="text-lg font-extrabold">{data.fluidToday.totalOutMl.toLocaleString('en-IN')}</div><div className="text-[11px] text-slate-500">Out (ml)</div></div>
                                <div className="rounded-xl bg-brand-50 dark:bg-brand-950/20 p-2.5"><div className="text-lg font-extrabold text-brand-700">{data.fluidToday.balanceMl > 0 ? '+' : ''}{data.fluidToday.balanceMl.toLocaleString('en-IN')}</div><div className="text-[11px] text-slate-500">Balance</div></div>
                            </div>
                        )}
                        {data.latestGlucose && (
                            <p className={cn('text-xs mt-2', data.latestGlucose.isHypo || data.latestGlucose.isHyper ? 'text-rose-700 font-semibold' : 'text-slate-500')}>
                                Last glucose {data.latestGlucose.value} {data.latestGlucose.unit} at {formatIstTime(data.latestGlucose.recordedAt)}
                                {data.latestGlucose.isHypo ? ' — low' : data.latestGlucose.isHyper ? ' — high' : ''}
                            </p>
                        )}
                    </section>

                    <section aria-label="Discharge readiness" className={card}>
                        <div className="flex items-center mb-1">
                            <h2 className={cn(cardTitle, 'flex-1')}>Discharge readiness</h2>
                            <span className={cn('text-xs font-bold', doneCount === readiness.length ? 'text-emerald-700' : 'text-amber-700')}>{doneCount} of {readiness.length} done</span>
                        </div>
                        <ul>
                            {readiness.map(r => (
                                <li key={r.label} className="flex items-center gap-2.5 py-1.5 text-sm">
                                    <span className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', r.done ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300')}>
                                        {r.done && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                                    </span>
                                    <span className={r.done ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400'}>{r.label}</span>
                                </li>
                            ))}
                        </ul>
                        <Button className="mt-2 w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={onOpenDischarge}>
                            {data.dischargeDraft?.isSigned ? 'Open discharge' : data.dischargeDraft?.dischargeSummaryId ? 'Continue discharge summary' : 'Start discharge summary'}
                        </Button>
                    </section>
                </div>
            </div>
        </div>
    );
};
