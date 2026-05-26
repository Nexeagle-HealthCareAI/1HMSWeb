import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Receipt, Calculator, Settings2, Link as LinkIcon, CheckCircle2, Sparkles, Hash, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';

export const BillingPolicyConfig = () => {
    const [config, setConfig] = useState({
        requirePostBeforeInvoice: true,
        maxAutoDiscountPercent: '10.00',
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
                    requirePostBeforeInvoice: !!d.requirePostBeforeInvoice,
                    maxAutoDiscountPercent: String(d.maxAutoDiscountPercent ?? '10.00'),
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

    const handleToggle = (key: keyof typeof config) => {
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const seriesItem = (s: typeof sequenceConfigs['INV']) => ({
                prefix: s.prefix,
                yearFormat: s.yearFormat,
                separator: s.separator,
                padLength: parseInt(s.padLength || '6', 10),
                isActive: s.isActive,
            });
            const req = {
                requirePostBeforeInvoice: config.requirePostBeforeInvoice,
                maxAutoDiscountPercent: parseFloat(config.maxAutoDiscountPercent || '0'),
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
            className="space-y-6 max-w-5xl mx-auto"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Billing Policy Setup</h2>
                    <p className="text-muted-foreground mt-1">Configure global billing rules, discounts, and integration triggers.</p>
                </div>

                <div className="relative group">
                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: [1, 1.4, 2], opacity: [0.8, 0.4, 0] }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="absolute inset-0 bg-green-400 rounded-md z-0"
                            />
                        )}
                    </AnimatePresence>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || showSuccess}
                        className={`relative z-10 transition-all duration-300 shadow-lg ${showSuccess
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-none text-white scale-105 shadow-green-500/40'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none text-white hover:scale-[1.02] shadow-blue-500/30 group-hover:shadow-blue-500/50'
                            }`}
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : showSuccess ? (
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2 font-bold"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Saved!
                            </motion.span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Save Settings
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Core Rules & Discounts */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300">
                        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Core Rules & limits</CardTitle>
                                    <CardDescription>Fundamental policies and discount limits</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">

                            <div className="flex items-center justify-between group/item">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">Finalize Charges Before Billing</Label>
                                    <div className="text-sm text-muted-foreground">All patient charges must be finalized before a bill can be generated.</div>
                                </div>
                                <Switch
                                    checked={config.requirePostBeforeInvoice}
                                    onCheckedChange={() => handleToggle('requirePostBeforeInvoice')}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                <Label className="text-base font-semibold flex items-center gap-2 mb-3 mt-2">
                                    Maximum Auto-Discount (%)
                                </Label>
                                <div className="relative max-w-[200px]">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={config.maxAutoDiscountPercent}
                                        onChange={(e) => handleChange('maxAutoDiscountPercent', e.target.value)}
                                        className="pl-3 pr-8 font-mono focus-visible:ring-blue-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Simple cap without approval flow (v1)</p>
                            </div>

                        </CardContent>
                    </Card>
                </motion.div>

                {/* Integration Triggers */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300">
                        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                                    <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="flex-1 flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            Integration Triggers
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50">
                                                Coming Soon
                                            </span>
                                        </CardTitle>
                                        <CardDescription>Automated charge triggers for clinical modules</CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6 opacity-50 pointer-events-none select-none grayscale-[0.5]">

                            <div className="grid grid-cols-[1fr_140px] items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 p-2 -mx-2 rounded-lg transition-colors">
                                <div>
                                    <Label className="font-semibold text-gray-900 dark:text-gray-100">Pathology Trigger</Label>
                                    <div className="text-xs text-muted-foreground">Triggers charge based on lab sample flow</div>
                                </div>
                                <Select disabled value={config.labPathTrigger} onValueChange={(val) => handleChange('labPathTrigger', val)}>
                                    <SelectTrigger className="font-medium bg-white dark:bg-gray-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ORDERED">ORDERED</SelectItem>
                                        <SelectItem value="RELEASED">RELEASED</SelectItem>
                                        <SelectItem value="OFF">OFF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-[1fr_140px] items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 p-2 -mx-2 rounded-lg transition-colors">
                                <div>
                                    <Label className="font-semibold text-gray-900 dark:text-gray-100">Radiology Trigger</Label>
                                    <div className="text-xs text-muted-foreground">Triggers charge based on radiology flow</div>
                                </div>
                                <Select disabled value={config.labRadTrigger} onValueChange={(val) => handleChange('labRadTrigger', val)}>
                                    <SelectTrigger className="font-medium bg-white dark:bg-gray-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ORDERED">ORDERED</SelectItem>
                                        <SelectItem value="RELEASED">RELEASED</SelectItem>
                                        <SelectItem value="OFF">OFF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-[1fr_140px] items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 p-2 -mx-2 rounded-lg transition-colors">
                                <div>
                                    <Label className="font-semibold text-gray-900 dark:text-gray-100">IPD Pharmacy Trigger</Label>
                                    <div className="text-xs text-muted-foreground">Triggers charge based on med issuance</div>
                                </div>
                                <Select disabled value={config.pharmacyIpdTrigger} onValueChange={(val) => handleChange('pharmacyIpdTrigger', val)}>
                                    <SelectTrigger className="font-medium bg-white dark:bg-gray-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ORDERED">ORDERED</SelectItem>
                                        <SelectItem value="ISSUED">ISSUED</SelectItem>
                                        <SelectItem value="OFF">OFF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-[1fr_140px] items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 p-2 -mx-2 rounded-lg transition-colors border-t border-gray-100 dark:border-gray-800 mt-2 pt-4">
                                <div>
                                    <Label className="font-semibold text-gray-900 dark:text-gray-100">OPD Consult Trigger</Label>
                                    <div className="text-xs text-muted-foreground">Controls OPD standard charges</div>
                                </div>
                                <Select disabled value={config.opdConsultTrigger} onValueChange={(val) => handleChange('opdConsultTrigger', val)}>
                                    <SelectTrigger className="font-medium bg-white dark:bg-gray-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AUTO">AUTO</SelectItem>
                                        <SelectItem value="OFF">OFF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-[1fr_140px] items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 p-2 -mx-2 rounded-lg transition-colors">
                                <div>
                                    <Label className="font-semibold text-gray-900 dark:text-gray-100">IPD Bed Charge Mode</Label>
                                    <div className="text-xs text-muted-foreground">Controls automated midnight bed charges</div>
                                </div>
                                <Select disabled value={config.ipdBedChargeMode} onValueChange={(val) => handleChange('ipdBedChargeMode', val)}>
                                    <SelectTrigger className="font-medium bg-white dark:bg-gray-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AUTO">AUTO</SelectItem>
                                        <SelectItem value="OFF">OFF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </CardContent>
                    </Card>
                </motion.div>

            </div>

            {/* Document Sequencing */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 relative">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                                <Hash className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-lg">Document Sequencing</CardTitle>
                                <CardDescription>Configure numbering formats for bills and receipts</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Sequence Selector */}
                            <div className="w-full md:w-1/4 space-y-4 border-r border-gray-100 dark:border-gray-800 pr-6">
                                <div>
                                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">Series Code</Label>
                                    <div className="flex flex-col gap-2">
                                        {(['INV', 'RCPT'] as SequenceType[]).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedSequence(type)}
                                                className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${selectedSequence === type
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                                                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                    }`}
                                            >
                                                <div className="font-semibold text-sm">{type === 'INV' ? 'Invoices' : 'Receipts'}</div>
                                                <div className="text-xs text-muted-foreground font-mono mt-1">{type}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Configuration Fields */}
                            <div className="w-full md:w-3/4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-2">
                                        <Label>Prefix</Label>
                                        <Input
                                            value={sequenceConfigs[selectedSequence].prefix}
                                            onChange={(e) => handleSequenceChange('prefix', e.target.value)}
                                            className="font-mono"
                                            placeholder="e.g. INV"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year Format</Label>
                                        <Select value={sequenceConfigs[selectedSequence].yearFormat} onValueChange={(val) => handleSequenceChange('yearFormat', val)}>
                                            <SelectTrigger className="font-mono">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="YYYY">YYYY (e.g. 2026)</SelectItem>
                                                <SelectItem value="YY">YY (e.g. 26)</SelectItem>
                                                <SelectItem value="YYYYMM">YYYYMM (e.g. 202602)</SelectItem>
                                                <SelectItem value="OFF">None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Separator</Label>
                                        <Input
                                            value={sequenceConfigs[selectedSequence].separator}
                                            onChange={(e) => handleSequenceChange('separator', e.target.value)}
                                            className="font-mono"
                                            placeholder="e.g. -"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pad Length</Label>
                                        <Input
                                            type="number"
                                            min="3"
                                            max="10"
                                            value={sequenceConfigs[selectedSequence].padLength}
                                            onChange={(e) => handleSequenceChange('padLength', e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Current Value (Next Number)</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={sequenceConfigs[selectedSequence].currentValue}
                                            onChange={(e) => handleSequenceChange('currentValue', e.target.value)}
                                            className="font-mono max-w-[200px]"
                                        />
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Live Preview</div>
                                    <div className="text-2xl font-mono tracking-wider font-bold text-gray-900 dark:text-white">
                                        {sequenceConfigs[selectedSequence].prefix}
                                        {sequenceConfigs[selectedSequence].separator}
                                        {sequenceConfigs[selectedSequence].yearFormat === 'YYYY' ? new Date().getFullYear() : sequenceConfigs[selectedSequence].yearFormat === 'YY' ? new Date().getFullYear().toString().slice(-2) : sequenceConfigs[selectedSequence].yearFormat === 'YYYYMM' ? `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}` : ''}
                                        {sequenceConfigs[selectedSequence].yearFormat !== 'OFF' ? sequenceConfigs[selectedSequence].separator : ''}
                                        {sequenceConfigs[selectedSequence].currentValue.padStart(Number(sequenceConfigs[selectedSequence].padLength) || 6, '0')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

        </motion.div>
    );
};
