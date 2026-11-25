import React from 'react';
import { Hotel, LayoutGrid, UserPlus, Gauge, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

export type IpdTab = 'roster' | 'bedboard' | 'referred' | 'kpis' | 'cssd';

const TABS: { key: IpdTab; label: string; short: string; icon: React.ElementType }[] = [
    { key: 'roster', label: 'Live roster', short: 'Roster', icon: Hotel },
    { key: 'bedboard', label: 'Bed board', short: 'Beds', icon: LayoutGrid },
    { key: 'referred', label: 'Referred admissions', short: 'Referred', icon: UserPlus },
    { key: 'kpis', label: 'KPIs', short: 'KPIs', icon: Gauge },
    { key: 'cssd', label: 'CSSD', short: 'CSSD', icon: Package },
];

interface Props {
    active: IpdTab;
    subtitle: string;
    /** Switches screen. Tabs are hidden when this is not given (a screen opened on its own). */
    onNavigate?: (tab: IpdTab) => void;
    /** Shows the Admit Patient button when given. */
    onAdmit?: () => void;
    /** Small counts shown on a tab, e.g. pending referrals. */
    badges?: Partial<Record<IpdTab, number>>;
    /** Extra controls on the right of the title row (refresh, live marker). */
    actions?: React.ReactNode;
}

/**
 * The one header shared by the IPD list screens — roster, bed board and referred admissions — so
 * the tabs sit in the same place on each and moving between them never changes the layout.
 */
export const IpdSectionHeader: React.FC<Props> = ({ active, subtitle, onNavigate, onAdmit, badges, actions }) => {
    const { isReadOnly, blockAction } = useSubscriptionReadOnly();
    const admit = () => { if (isReadOnly) { blockAction('Admitting patients'); return; } onAdmit?.(); };

    return (
        <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 px-4 sm:px-5 py-3.5 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                            <Hotel className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">Inpatient Department</h1>
                            <p className="text-[11px] text-brand-100 mt-0.5 truncate">{subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {actions}
                        {onAdmit && (
                            <button type="button" onClick={admit}
                                className="hidden sm:flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold bg-white text-brand-700 hover:bg-brand-50 active:scale-[0.98] transition-all shadow-md shadow-black/5">
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Admit Patient
                            </button>
                        )}
                    </div>
                </div>

                {onNavigate && (
                    <div role="tablist" aria-label="Inpatient screens" className="flex gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 overflow-x-auto hide-scrollbar">
                        {TABS.map(t => {
                            const Icon = t.icon;
                            const selected = t.key === active;
                            const badge = badges?.[t.key];
                            return (
                                <button key={t.key} type="button" role="tab" aria-selected={selected}
                                    onClick={() => { if (!selected) onNavigate(t.key); }}
                                    className={cn('shrink-0 sm:shrink sm:flex-1 h-10 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs whitespace-nowrap transition-all',
                                        selected
                                            ? 'bg-white dark:bg-zinc-900 text-brand-700 dark:text-brand-300 font-bold shadow-sm cursor-default'
                                            : 'text-brand-50 font-semibold hover:bg-white/10 active:scale-[0.97]')}>
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="hidden md:inline">{t.label}</span>
                                    <span className="md:hidden">{t.short}</span>
                                    {!!badge && (
                                        <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                                            selected ? 'bg-brand-600 text-white' : 'bg-white text-brand-700')}>{badge}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
