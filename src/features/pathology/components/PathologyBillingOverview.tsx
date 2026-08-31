import React from 'react';
import { Calendar, Receipt, IndianRupee, Wallet, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KpiStat } from '@/features/billing/components/KpiStat';
import { inr } from '@/features/billing/utils/money';

export type PathologyBillingDateMode = 'all' | 'day' | 'range';

export interface PathologyBillingKpis {
  transactionCount: number;
  totalBilled: number;
  collected: number;
  pendingDue: number;
}

interface PathologyBillingOverviewProps {
  kpis: PathologyBillingKpis;
  scopeLabel: string;
  dateMode: PathologyBillingDateMode;
  onDateModeChange: (mode: PathologyBillingDateMode) => void;
  dayDate: string;
  onDayDateChange: (value: string) => void;
  rangeStart: string;
  onRangeStartChange: (value: string) => void;
  rangeEnd: string;
  onRangeEndChange: (value: string) => void;
}

const wholeNumber = (n: number) => Math.round(n).toString();

// Mirrors PathologyDashboardOverview.tsx's Overview section (same Select-driven all/day/range date
// filter, same KpiStat grid shape) -- lab-billing totals instead of order counts.
export const PathologyBillingOverview: React.FC<PathologyBillingOverviewProps> = ({
  kpis, scopeLabel, dateMode, onDateModeChange, dayDate, onDayDateChange, rangeStart, onRangeStartChange, rangeEnd, onRangeEndChange,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Billing Overview</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full shadow-sm">
            <Calendar className="h-3 w-3" /> {scopeLabel}
          </span>
          <Select value={dateMode} onValueChange={(v) => onDateModeChange(v as PathologyBillingDateMode)}>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KpiStat label="Transactions" amount={kpis.transactionCount} format={wholeNumber} icon={<Receipt className="h-5 w-5 text-brand-600" />} tone="from-brand-50 to-brand-100/50 text-brand-900" />
        <KpiStat label="Billed" amount={kpis.totalBilled} format={(n) => inr(n)} icon={<IndianRupee className="h-5 w-5 text-sky-600" />} tone="from-sky-50 to-blue-100/50 text-sky-900" />
        <KpiStat label="Collected" amount={kpis.collected} format={(n) => inr(n)} icon={<Wallet className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
        <KpiStat label="Pending Due" amount={kpis.pendingDue} format={(n) => inr(n)} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
      </div>
    </div>
  );
};
