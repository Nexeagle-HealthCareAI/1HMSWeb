import React from 'react';
import { cn } from '@/lib/utils';

export interface BillingSectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    /** Right-aligned actions (buttons, etc.). */
    actions?: React.ReactNode;
    /** Optional left-most slot (e.g. a back button). */
    leading?: React.ReactNode;
    className?: string;
}

// Premium page/section header: translucent surface, gradient icon chip, title + subtitle,
// and an actions slot. Shared by the billing board header and the ledger top bar.
export const BillingSectionHeader: React.FC<BillingSectionHeaderProps> = ({
    icon, title, subtitle, actions, leading, className,
}) => (
    <div className={cn(
        'flex items-center gap-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl px-3 py-3 sm:px-4 shadow-lg shadow-brand-500/5 ring-1 ring-black/5',
        className,
    )}>
        {leading}
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
);

export default BillingSectionHeader;
