import React from 'react';
import { ClipboardList, Zap, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { KpiStat } from '@/features/billing/components/KpiStat';

export type PathologyDateMode = 'all' | 'day' | 'range';

export interface PathologyDashboardKpis {
  total: number;
  stat: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface PathologyDashboardOverviewProps {
  kpis: PathologyDashboardKpis;
}

const wholeNumber = (n: number) => Math.round(n).toString();

// KPI strip only -- the date-scope controls that used to live in this component's own header row
// now sit in PathologyWorkspace.tsx's combined filter-tabs + date-filter row instead, so the two
// don't end up duplicated in two places.
export const PathologyDashboardOverview: React.FC<PathologyDashboardOverviewProps> = ({ kpis }) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-0.5">Overview</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KpiStat label="Total Orders" amount={kpis.total} format={wholeNumber} icon={<ClipboardList className="h-5 w-5 text-brand-600" />} tone="from-brand-50 to-brand-100/50 text-brand-900" />
        <KpiStat label="STAT / Urgent" amount={kpis.stat} format={wholeNumber} icon={<Zap className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
        <KpiStat label="Pending" amount={kpis.pending} format={wholeNumber} icon={<Clock className="h-5 w-5 text-amber-600" />} tone="from-amber-50 to-yellow-100/50 text-amber-900" />
        <KpiStat label="In Progress" amount={kpis.inProgress} format={wholeNumber} icon={<Activity className="h-5 w-5 text-sky-600" />} tone="from-sky-50 to-blue-100/50 text-sky-900" />
        <KpiStat label="Completed" amount={kpis.completed} format={wholeNumber} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
      </div>
    </div>
  );
};
