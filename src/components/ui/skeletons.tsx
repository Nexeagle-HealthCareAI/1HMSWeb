import React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

/**
 * Reusable skeleton placeholders that preserve layout while data loads — used instead of blocking
 * spinners or blank screens so the page never "surges" (Performance requirement).
 */

/** A vertical list of row placeholders (e.g. an appointments board, a ledger). */
export const RowSkeletonList: React.FC<{ rows?: number; className?: string; rowClassName?: string }> = ({
    rows = 5, className, rowClassName,
}) => (
    <div className={cn('space-y-2', className)}>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className={cn('h-8 w-20 rounded-lg shrink-0', rowClassName)} />
            </div>
        ))}
    </div>
);

/** A grid of stat-card placeholders. */
export const StatCardsSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 4, className }) => (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-7 w-1/2" />
            </div>
        ))}
    </div>
);

/** A simple block of card placeholders. */
export const CardSkeleton: React.FC<{ className?: string; lines?: number }> = ({ className, lines = 3 }) => (
    <div className={cn('rounded-2xl border border-slate-100 bg-white p-4 space-y-3', className)}>
        <Skeleton className="h-4 w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
        ))}
    </div>
);
