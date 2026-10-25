import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The same page frame the other 1HMS screens use (IPD, Appointments): a centred column and a gradient header card with the
 * title, a short line, the actions on the right and, when there are tabs, a capsule of them underneath.
 */
export function HealthWikiPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl space-y-4 px-3 pb-28 pt-2 sm:space-y-6 sm:px-4 sm:pb-6 lg:px-6', className)}>{children}</div>;
}

export const headerPrimaryBtn =
  'inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-brand-700 shadow-md shadow-black/5 transition hover:scale-[1.02] hover:bg-brand-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60';
export const headerGhostBtn =
  'inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60';

interface HeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  back?: { label: string; onClick: () => void };
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function HealthWikiHeader({ icon: Icon, title, subtitle, back, actions, children }: HeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 p-5 text-white shadow-lg dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80">
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-5">
        {back && (
          <button type="button" onClick={back.onClick} className="-mb-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-100 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {back.label}
          </button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <Icon className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight tracking-tight">{title}</h1>
              {subtitle && <p className="mt-0.5 text-[11px] text-brand-100">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export interface CapsuleTab {
  key: string;
  label: string;
  sub: string;
  count: number;
}

/** The tab capsule of the IPD header: the chosen tab is a white pill, the count and label centred. */
export function HealthWikiTabs({ tabs, active, onChange, label }: { tabs: CapsuleTab[]; active: string; onChange: (key: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid grid-cols-2 gap-1 rounded-2xl bg-black/15 p-1 backdrop-blur-sm dark:bg-black/30">
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.key)}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white',
              on ? 'bg-white text-brand-600 shadow-sm dark:bg-zinc-900 dark:text-brand-400' : 'text-brand-50 hover:bg-white/10',
            )}
          >
            <span className="text-2xl font-bold tabular-nums leading-none">{t.count}</span>
            <span className="mt-1 text-[11px] font-bold leading-tight tracking-wide">{t.label}</span>
            <span className={cn('text-[10px] leading-tight', on ? 'text-slate-500 dark:text-zinc-400' : 'text-brand-100')}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
