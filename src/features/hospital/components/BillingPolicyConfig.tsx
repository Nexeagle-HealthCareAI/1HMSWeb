import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Receipt, Settings2, Link as LinkIcon, CheckCircle2, Sparkles, Hash, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { cn } from '@/lib/utils';

type TriggerKey = 'opdConsultTrigger' | 'ipdBedChargeMode';

// Per-module auto-billing rules. onValue = the trigger value that means "auto-post"; 'OFF' = manual.
// Pharmacy/Lab (Path & Rad) triggers are intentionally not listed here — those fields exist on
// BillingPolicy but nothing in the backend reads them to auto-post a charge, so exposing a toggle
// for them would promise automation that doesn't exist.
const AUTO_BILLING_RULES: { key: TriggerKey; label: string; desc: string; onValue: string }[] = [
    { key: 'opdConsultTrigger', label: 'OPD Consultation', desc: 'Post the consult fee automatically when an appointment is booked.', onValue: 'AUTO' },
    { key: 'ipdBedChargeMode', label: 'IPD Bed Charge', desc: 'Post the daily bed charge automatically each midnight.', onValue: 'DAILY_AUTO' },
];

export const BillingPolicyConfig = () => {
    const [config, setConfig] = useState({
        labPathTrigger: 'OFF',
        labRadTrigger: 'OFF',
        pharmacyIpdTrigger: 'OFF',
        opdConsultTrigger: 'OFF',
        ipdBedChargeMode: 'OFF',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    type SequenceType = 'INV' | 'RCPT';
    const [selectedSequence, setSelectedSequence] = useState<SequenceType>('INV');
    const [showSeqAdvanced, setShowSeqAdvanced] = useState(false);
    const [sequenceConfigs, setSequenceConfigs] = useState<Record<SequenceType, { prefix: string, yearFormat: string, separator: string, currentValue: string, padLength: string, isActive: boolean }>>({
        INV: { prefix: 'INV', yearFormat: 'YYYY', separator: '-', currentValue: '1', padLength: '6', isActive: true },
        RCPT: { prefix: 'RCPT', yearFormat: 'YYYY', separator: '-', currentValue: '1', padLength: '6', isActive: true }
    });

    const loadPolicy = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res: any = await ipdBillingService.getPolicy();
            if (res?.success === false) throw new Error(res.message ?? 'Could not load policy');
            const d = res?.data;
            if (d) {
                setConfig({
                    labPathTrigger:    d.labPathTrigger    ?? 'OFF',
                    labRadTrigger:     d.labRadTrigger     ?? 'OFF',
                    pharmacyIpdTrigger: d.pharmacyIpdTrigger ?? 'OFF',
                    opdConsultTrigger: d.opdConsultTrigger ?? 'OFF',
                    ipdBedChargeMode:  d.ipdBedChargeMode  ?? 'OFF',
                });
                const ns = d.numberSeries ?? {};
                const pickSeries = (code: 'INV' | 'RCPT', fallbackPrefix: string) => {
                    // Backend returns keyed by code (lowercase or upper)
                    const found = ns[code] ?? ns[code.toLowerCase()] ?? ns[code.toUpperCase()];
                    if (!found) return { prefix: fallbackPrefix, yearFormat: 'YYYY', separator: '-', currentValue: '1', padLength: '6', isActive: true };
                    return {
                        prefix:       found.prefix ?? fallbackPrefix,
                        yearFormat:   found.yearFormat ?? 'YYYY',
                        separator:    found.separator ?? '-',
                        currentValue: String(found.currentValue ?? '1'),
                        padLength:    String(found.padLength ?? '6'),
                        isActive:     found.isActive ?? true,
                    };
                };
                setSequenceConfigs({
                    INV:  pickSeries('INV',  'INV'),
                    RCPT: pickSeries('RCPT', 'RCPT'),
                });
            }
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load billing policy');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPolicy(); }, [loadPolicy]);

    const handleChange = (key: keyof typeof config, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSequenceChange = (key: keyof typeof sequenceConfigs['INV'], value: string) => {
        setSequenceConfigs(prev => ({
            ...prev,
            [selectedSequence]: {
                ...prev[selectedSequence],
                [key]: value
            }
        }));
    };

    // Restore the selected series to clean defaults (keeps the running Current Value so numbering
    // continues uninterrupted). Persisted on Save — the quick fix for a junk-formatted series.
    const resetSequence = () => {
        setSequenceConfigs(prev => ({
            ...prev,
            [selectedSequence]: {
                ...prev[selectedSequence],
                prefix: selectedSequence === 'INV' ? 'INV' : 'RCPT',
                yearFormat: 'YYYY',
                separator: '-',
                padLength: '6',
            }
        }));
    };

    // The pad-length field is free-text (HTML max= doesn't block typing), so an
    // out-of-range value like 999999999 would make padStart throw "Invalid string
    // length". Clamp to the input's intended 1..10 range wherever the value is used.
    const safePadLength = (raw: string) => Math.min(Math.max(parseInt(raw || '6', 10) || 6, 1), 10);

    // Build the human-readable next-number for a series (used in the auto-numbering summary).
    const previewFor = (cfg: typeof sequenceConfigs['INV']) => {
        const now = new Date();
        const yearPart = cfg.yearFormat === 'YYYY' ? `${now.getFullYear()}`
            : cfg.yearFormat === 'YY' ? `${now.getFullYear()}`.slice(-2)
            : cfg.yearFormat === 'YYYYMM' ? `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`
            : '';
        return `${cfg.prefix}${cfg.separator}${yearPart}${cfg.yearFormat !== 'OFF' ? cfg.separator : ''}${cfg.currentValue.padStart(safePadLength(cfg.padLength), '0')}`;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const seriesItem = (s: typeof sequenceConfigs['INV']) => ({
                prefix: s.prefix,
                yearFormat: s.yearFormat,
                separator: s.separator,
                padLength: safePadLength(s.padLength),
                isActive: s.isActive,
            });
            const req = {
                labPathTrigger: config.labPathTrigger,
                labRadTrigger: config.labRadTrigger,
                pharmacyIpdTrigger: config.pharmacyIpdTrigger,
                opdConsultTrigger: config.opdConsultTrigger,
                ipdBedChargeMode: config.ipdBedChargeMode,
                numberSeries: {
                    invoice: seriesItem(sequenceConfigs.INV),
                    receipt: seriesItem(sequenceConfigs.RCPT),
                },
            };
            const res: any = await ipdBillingService.updatePolicy(req);
            if (res && res.success === false) throw new Error(res.message ?? 'Save failed');

            setShowSuccess(true);

            // Fire confetti
            const duration = 2000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#4f46e5', '#10b981', '#fbbf24']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#4f46e5', '#10b981', '#fbbf24']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();

            toast({
                title: "Boom! Configuration Saved 🚀",
                description: "Your billing policy rules have been successfully updated.",
            });

            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);

        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save configuration.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="max-w-5xl mx-auto p-6 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <span className="flex-1">{loadError}</span>
                <Button size="sm" variant="outline" onClick={loadPolicy}><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
            </div>
        );
    }
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6 max-w-2xl mx-auto px-4 pb-12 sm:px-0"
        >
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-zinc-50">
                        Billing Policy Setup
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        Configure global auto-billing triggers and sequence numbers.
                    </p>
                </div>

                <div className="relative group">
                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: [1, 1.4, 2], opacity: [0.8, 0.4, 0] }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="absolute inset-0 bg-green-400 rounded-xl z-0"
                            />
                        )}
                    </AnimatePresence>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || showSuccess}
                        className={cn(
                            "relative z-10 w-full sm:w-auto h-11 px-6 rounded-xl font-bold transition-all duration-300 shadow-md active:scale-98 border-none text-white",
                            showSuccess
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30'
                                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                        )}
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : showSuccess ? (
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Saved!
                            </motion.span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Save Changes
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Auto-Billing Rules Cards */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-950/40 rounded-lg">
                        <Settings2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Auto-Billing Rules
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                    {AUTO_BILLING_RULES.map((rule) => {
                        const isAuto = !!config[rule.key] && config[rule.key] !== 'OFF';
                        return (
                            <div
                                key={rule.key}
                                className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                                        {rule.label}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                                        {rule.desc}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleChange(rule.key, isAuto ? 'OFF' : rule.onValue)}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2",
                                        isAuto ? "bg-brand-600" : "bg-slate-200 dark:bg-zinc-800"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            isAuto ? "translate-x-5" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Document Sequencing */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                        <Hash className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Document Numbering
                    </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850/80 rounded-2xl p-4.5 shadow-sm space-y-4">
                    {/* Live Preview Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 text-center">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                Invoice series
                            </span>
                            <div className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-zinc-300 mt-1 break-all">
                                {previewFor(sequenceConfigs.INV)}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 text-center">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                Receipt series
                            </span>
                            <div className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-zinc-300 mt-1 break-all">
                                {previewFor(sequenceConfigs.RCPT)}
                            </div>
                        </div>
                    </div>

                    {/* Accordion Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowSeqAdvanced(!showSeqAdvanced)}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-950/50 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl transition-all duration-200 text-left active:scale-[0.99]"
                    >
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            Customize numbering sequence
                        </span>
                        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showSeqAdvanced && "rotate-180")} />
                    </button>

                    {/* Advanced Customization form */}
                    <AnimatePresence>
                        {showSeqAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden space-y-4 pt-1"
                            >
                                {/* Mobile Segment Control */}
                                <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSequence('INV')}
                                        className={cn(
                                            "flex-1 h-9 rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.98]",
                                            selectedSequence === 'INV'
                                                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Invoices (INV)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSequence('RCPT')}
                                        className={cn(
                                            "flex-1 h-9 rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.98]",
                                            selectedSequence === 'RCPT'
                                                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Receipts (RCPT)
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Configure {selectedSequence === 'INV' ? 'Invoice' : 'Receipt'} Series
                                    </span>
                                    <button
                                        type="button"
                                        onClick={resetSequence}
                                        className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Reset default
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Prefix</Label>
                                        <Input
                                            value={sequenceConfigs[selectedSequence].prefix}
                                            onChange={(e) => handleSequenceChange('prefix', e.target.value)}
                                            className="font-mono h-11 rounded-xl"
                                            placeholder="e.g. INV"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Separator</Label>
                                        <Input
                                            value={sequenceConfigs[selectedSequence].separator}
                                            onChange={(e) => handleSequenceChange('separator', e.target.value)}
                                            className="font-mono h-11 rounded-xl"
                                            placeholder="e.g. -"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Year Format</Label>
                                        <Select
                                            value={sequenceConfigs[selectedSequence].yearFormat}
                                            onValueChange={(val) => handleSequenceChange('yearFormat', val)}
                                        >
                                            <SelectTrigger className="font-mono h-11 rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl">
                                                <SelectItem value="YYYY">YYYY (e.g. 2026)</SelectItem>
                                                <SelectItem value="YY">YY (e.g. 26)</SelectItem>
                                                <SelectItem value="YYYYMM">YYYYMM (202602)</SelectItem>
                                                <SelectItem value="OFF">None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Digit Padding</Label>
                                        <Input
                                            type="number"
                                            min="3"
                                            max="10"
                                            value={sequenceConfigs[selectedSequence].padLength}
                                            onChange={(e) => handleSequenceChange('padLength', e.target.value)}
                                            className="font-mono h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Next Sequence Value</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={sequenceConfigs[selectedSequence].currentValue}
                                            onChange={(e) => handleSequenceChange('currentValue', e.target.value)}
                                            className="font-mono h-11 rounded-xl max-w-xs"
                                        />
                                    </div>
                                </div>

                                {/* Advanced Live Preview card */}
                                <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-dashed border-emerald-250 dark:border-emerald-900/40 rounded-xl flex items-center justify-between">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-450">
                                        Active Series Format
                                    </div>
                                    <div className="text-sm font-mono font-bold text-emerald-800 dark:text-emerald-450">
                                        {sequenceConfigs[selectedSequence].prefix}
                                        {sequenceConfigs[selectedSequence].separator}
                                        {sequenceConfigs[selectedSequence].yearFormat === 'YYYY' ? new Date().getFullYear() : sequenceConfigs[selectedSequence].yearFormat === 'YY' ? new Date().getFullYear().toString().slice(-2) : sequenceConfigs[selectedSequence].yearFormat === 'YYYYMM' ? `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}` : ''}
                                        {sequenceConfigs[selectedSequence].yearFormat !== 'OFF' ? sequenceConfigs[selectedSequence].separator : ''}
                                        {sequenceConfigs[selectedSequence].currentValue.padStart(safePadLength(sequenceConfigs[selectedSequence].padLength), '0')}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
