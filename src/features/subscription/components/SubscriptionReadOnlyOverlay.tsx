import React from 'react';
import { cn } from '@/lib/utils';
import { useSubscriptionReadOnly } from '../hooks/useSubscriptionReadOnly';

interface Props {
    children: React.ReactNode;
    featureLabel?: string;
    className?: string;
}

/**
 * Blanket grey-out + click-to-upsell wrapper for an entire section — dims the subtree and
 * intercepts any click with the shared upsell modal, instead of gating every write handler
 * inside it individually. Content stays visible (dimmed, not hidden) so viewing still works;
 * only pointer interaction is blocked. Wrap a whole tab/section's content, not individual
 * buttons — for a single button, useSubscriptionReadOnly()'s disabled/blockAction pair is
 * still the right tool.
 */
export const SubscriptionReadOnlyOverlay: React.FC<Props> = ({ children, featureLabel, className }) => {
    const { isReadOnly, blockAction } = useSubscriptionReadOnly();

    if (!isReadOnly) return <>{children}</>;

    return (
        <div className={cn('relative', className)}>
            <div className="pointer-events-none opacity-60 grayscale-[30%] select-none">
                {children}
            </div>
            <button
                type="button"
                aria-label="Upgrade to use this feature"
                onClick={() => blockAction(featureLabel)}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent"
            />
        </div>
    );
};
