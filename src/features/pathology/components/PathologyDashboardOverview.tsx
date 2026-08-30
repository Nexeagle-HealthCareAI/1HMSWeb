import React from 'react';
import { Calendar, ClipboardList, Zap, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  scopeLabel: string;
  dateMode: PathologyDateMode;
  onDateModeChange: (mode: PathologyDateMode) => void;
  dayDate: string;
  onDayDateChange: (value: string) => void;
  rangeStart: string;
  onRangeStartChange: (value: string) => void;
  rangeEnd: string;
  onRangeEndChange: (value: string) => void;
}

const wholeNumber = (n: number) => Math.round(n).toString();

// Mirrors RevenueTab.tsx's "Overview" section (label + scope chip + 5-card KpiStat grid,
// Select-driven all/day/range date filter) -- same shape, pathology-specific counts.
export const PathologyDashboardOverview: React.FC<PathologyDashboardOverviewProps> = ({
  kpis, scopeLabel, dateMode, onDateModeChange, dayDate, onDayDateChange, rangeStart, onRangeStartChange, rangeEnd, onRangeEndChange,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Overview</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full shadow-sm">
            <Calendar className="h-3 w-3" /> {scopeLabel}
          </span>
          <Select value={dateMode} onValueChange={(v) => onDateModeChange(v as PathologyDateMode)}>
            <SelectTrigger className="h-9 w-[130px] rounded-xl bg-white text-xs">
              <div className="flex items-center gap-1.5 min-w-0"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><SelectValue /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="day">Single day</SelectItem>
              <SelectItem value="range">Date range</SelectItem>
            </SelectContent>
          </Select>
          {dateMode === 'day' && (
            <Input type="date" value={dayDate} onChange={(e) => onDayDateChange(e.target.value)} className="h-9 w-[150px] rounded-xl bg-white text-xs" />
          )}
          {dateMode === 'range' && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={rangeStart} onChange={(e) => onRangeStartChange(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
              <span className="text-xs text-slate-400 shrink-0">to</span>
              <Input type="date" value={rangeEnd} onChange={(e) => onRangeEndChange(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
            </div>
          )}
        </div>
      </div>
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
