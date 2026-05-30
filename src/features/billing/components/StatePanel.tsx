import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Consistent loading skeleton block for billing lists/tables.
export const LoadingState: React.FC<{ rows?: number; className?: string }> = ({ rows = 4, className }) => (
    <div className={cn('p-3 space-y-2', className)}>
        {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
    </div>
);

// Consistent empty state: icon + title + optional hint.
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; className?: string }> = ({
    icon, title, hint, className,
}) => (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 px-6 text-center', className)}>
        {icon && <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">{icon}</div>}
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        {hint && <p className="text-xs text-slate-400 max-w-xs">{hint}</p>}
    </div>
);

// Consistent error state with an optional retry.
export const ErrorState: React.FC<{ message: string; onRetry?: () => void; retryLabel?: string; className?: string }> = ({
    message, onRetry, retryLabel = 'Retry', className,
}) => (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 px-6 text-center', className)}>
        <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-rose-600">{message}</p>
        {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="h-8 text-xs gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> {retryLabel}
            </Button>
        )}
    </div>
);
