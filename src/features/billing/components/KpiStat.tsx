import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Lightweight count-up: animates 0 → target over ~700ms when `amount` is provided.
const useCountUp = (target: number | undefined, enabled: boolean) => {
    const [value, setValue] = useState(enabled ? 0 : (target ?? 0));
    const raf = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled || target == null || !Number.isFinite(target)) {
            setValue(target ?? 0);
            return;
        }
        const start = performance.now();
        const duration = 700;
        const from = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setValue(from + (target - from) * eased);
            if (t < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [target, enabled]);

    return value;
};

export interface KpiStatProps {
    label: string;
    icon: React.ReactNode;
    /** Gradient + text tone classes, e.g. "from-brand-50 to-brand-100/60 text-brand-900". */
    tone: string;
    /** Pre-formatted display value (used when `amount`/`format` are not provided). */
    value?: string;
    /** Numeric value to count up to (with `format`). */
    amount?: number;
    format?: (n: number) => string;
    /** Optional secondary line under the value. */
    hint?: string;
    className?: string;
}

// Premium gradient KPI card with an icon chip, a soft decorative flare, and an optional count-up.
export const KpiStat: React.FC<KpiStatProps> = ({ label, icon, tone, value, amount, format, hint, className }) => {
    const animate = amount != null && typeof format === 'function';
    const counted = useCountUp(amount, animate);
    const display = animate ? format!(counted) : (value ?? '');

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <Card className={cn(
                'relative overflow-hidden border-0 ring-1 ring-black/5 p-4 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br shadow-lg shadow-brand-500/5',
                tone,
                className,
            )}>
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/30 blur-2xl pointer-events-none" />
                <div className="relative h-11 w-11 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center shrink-0 shadow-sm">
                    {icon}
                </div>
                <div className="relative min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
                    <p className="text-xl font-black tabular-nums truncate">{display}</p>
                    {hint && <p className="text-[10px] font-medium opacity-60 truncate">{hint}</p>}
                </div>
            </Card>
        </motion.div>
    );
};

export default KpiStat;
