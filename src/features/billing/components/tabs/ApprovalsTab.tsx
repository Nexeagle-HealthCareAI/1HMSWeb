import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreditApprovalsCard } from '../CreditApprovalsCard';

type FilterValue = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ALL', label: 'All' },
];

// Hospital-wide view of ADVANCE/REFUND/DISCOUNT credit approvals — the same card shown per-visit
// on a patient's billing page, without an encounterId filter, so Admin/AdminDoctor can see
// everything (pending queue or approval history) in one place instead of checking each patient.
export const ApprovalsTab: React.FC = () => {
    const [filter, setFilter] = useState<FilterValue>('PENDING');

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pb-4">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 p-1 w-fit shadow-inner">
                {FILTERS.map(f => (
                    <Button
                        key={f.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setFilter(f.value)}
                        className={cn(
                            'h-7 text-xs rounded-lg px-3',
                            filter === f.value ? 'bg-brand-600 text-white hover:bg-brand-700 hover:text-white' : 'text-slate-600'
                        )}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            <CreditApprovalsCard
                statusFilter={filter === 'ALL' ? undefined : filter}
                hideWhenEmpty={false}
            />
        </div>
    );
};
