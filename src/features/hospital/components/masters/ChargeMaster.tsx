import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Download, MoreVertical, Database,
    Copy, Pencil, Trash2, CheckCircle2, AlertCircle, X, Zap, Loader2, RefreshCw,
    Stethoscope, FlaskConical, Activity, Syringe, Pill, LayoutGrid
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ipdBillingService, type ChargeMaster as BackendChargeMaster, type UpsertChargeMasterRequest,
    type ChargeMasterPayerRate, type RoomClassRateMultiplier, type PayerType,
} from '@/features/billing/services/ipdBillingService';

// Short code prefix per category — used to auto-generate a default Charge Code (e.g. LAB-001).
const CATEGORY_CODE_PREFIX: Record<string, string> = {
    CONSULT: 'CON', LAB: 'LAB', RAD: 'RAD', PROCEDURE: 'PRO', SERVICE: 'SVC', CONSUMABLE: 'CSM', OTHER: 'GEN',
};

const getCategoryStyles = (category: string) => {
    switch(category) {
        case 'CONSULT': return { color: 'border-emerald-500', icon: Stethoscope, bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
        case 'LAB': return { color: 'border-blue-500', icon: FlaskConical, bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
        case 'RAD': return { color: 'border-purple-500', icon: Activity, bg: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' };
        case 'PROCEDURE': return { color: 'border-rose-500', icon: Syringe, bg: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' };
        case 'CONSUMABLE': return { color: 'border-amber-500', icon: Pill, bg: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' };
        default: return { color: 'border-gray-400', icon: LayoutGrid, bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    }
};

// --- Types ---

export interface ChargeRecord {
    id: string;
    chargeCode: string;
    displayName: string;
    appliesTo: 'OPD' | 'IPD' | 'LAB' | 'RAD' | 'PHARMACY' | 'ANY';
    categoryCode: 'CONSULT' | 'LAB' | 'RAD' | 'PROCEDURE' | 'SERVICE' | 'CONSUMABLE' | 'OTHER';
    subCategoryCode?: string;
    defaultRate: number;
    defaultQty: number;
    maxDiscountPercent: number;
    incentiveAmount: number;
    hsnSacCode?: string;
    isTaxable: boolean;
    gstSlabPercent?: number;
    taxInclusive: boolean;
    isIRDAIPayable: boolean;
    isActive: boolean;
    sortOrder: number;
    notes?: string;
}

const fromBackend = (m: BackendChargeMaster): ChargeRecord => ({
    id: m.chargeId,
    chargeCode: m.chargeCode ?? '',
    displayName: m.displayName ?? '',
    appliesTo: (m.appliesTo as ChargeRecord['appliesTo']) ?? 'ANY',
    categoryCode: (m.categoryCode as ChargeRecord['categoryCode']) ?? 'OTHER',
    subCategoryCode: m.subCategoryCode,
    defaultRate: Number(m.defaultRate ?? 0),
    defaultQty: Number(m.defaultQty ?? 1),
    maxDiscountPercent: Number(m.maxDiscountPercent ?? 0),
    incentiveAmount: Number(m.incentiveAmount ?? 0),
    hsnSacCode: m.hsnSacCode,
    isTaxable: m.isTaxable ?? false,
    gstSlabPercent: m.gstSlabPercent != null ? Number(m.gstSlabPercent) : undefined,
    taxInclusive: m.taxInclusive ?? false,
    isIRDAIPayable: m.isIRDAIPayable ?? true,
    isActive: m.isActive,
    sortOrder: Number(m.sortOrder ?? 0),
    notes: m.notes,
});

export const ChargeMaster = () => {
    // --- State ---
    const [charges, setCharges] = useState<ChargeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAppliesTo, setFilterAppliesTo] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterActive, setFilterActive] = useState<string>('ALL');

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Partial<ChargeRecord> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Rate card state (payer-type override + room-class multiplier)
    const [payerRates, setPayerRates] = useState<ChargeMasterPayerRate[]>([]);
    const [roomMultipliers, setRoomMultipliers] = useState<RoomClassRateMultiplier[]>([]);
    const [rateCardLoading, setRateCardLoading] = useState(true);
    const [newPayerRate, setNewPayerRate] = useState<{ chargeId: string; payerType: PayerType; overrideRate: string }>({ chargeId: '', payerType: 'TPA', overrideRate: '' });
    const [newRoomMultiplier, setNewRoomMultiplier] = useState<{ roomType: string; multiplierPercent: string }>({ roomType: 'ICU', multiplierPercent: '100' });
    const [rateCardSaving, setRateCardSaving] = useState(false);

    const loadRateCard = useCallback(async () => {
        setRateCardLoading(true);
        try {
            const res = await ipdBillingService.getRateCardConfig();
            setPayerRates(res.payerRates ?? []);
            setRoomMultipliers(res.roomMultipliers ?? []);
        } catch {
            setPayerRates([]);
            setRoomMultipliers([]);
        } finally {
            setRateCardLoading(false);
        }
    }, []);

    useEffect(() => { loadRateCard(); }, [loadRateCard]);

    const loadCharges = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await ipdBillingService.listChargeMasters({ pageSize: 500 });
            const items = (res?.items ?? []).map(fromBackend);
            setCharges(items);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load charges');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadCharges(); }, [loadCharges]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('charge-search')?.focus();
            }
            if (!isDrawerOpen && e.key === 'n' && e.target instanceof HTMLBodyElement) {
                e.preventDefault();
                handleOpenDrawer(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawerOpen]);

    // --- Derived Data ---
    const filteredCharges = useMemo(() => {
        return charges.filter(c => {
            const matchesSearch = c.chargeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.displayName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAppliesTo = filterAppliesTo === 'ALL' || c.appliesTo === filterAppliesTo;
            const matchesCategory = filterCategory === 'ALL' || c.categoryCode === filterCategory;
            const matchesActive = filterActive === 'ALL' ||
                (filterActive === 'ACTIVE' && c.isActive) ||
                (filterActive === 'INACTIVE' && !c.isActive);
            return matchesSearch && matchesAppliesTo && matchesCategory && matchesActive;
        }).sort((a, b) => a.sortOrder - b.sortOrder);
    }, [charges, searchTerm, filterAppliesTo, filterCategory, filterActive]);

    // --- Actions ---
    const handleToggleActive = async (id: string) => {
        const current = charges.find(c => c.id === id);
        if (!current || busyId) return;
        const next = !current.isActive;
        // Optimistic flip
        setCharges(prev => prev.map(c => c.id === id ? { ...c, isActive: next } : c));
        setBusyId(id);
        try {
            const res: any = await ipdBillingService.updateChargeMasterStatus(id, next);
            if (res && res.isSucess === false) throw new Error(res.message ?? 'Could not update');
            toast({ title: 'Status Updated', description: `Charge ${next ? 'activated' : 'deactivated'}.` });
        } catch (e: any) {
            // Roll back on failure
            setCharges(prev => prev.map(c => c.id === id ? { ...c, isActive: !next } : c));
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    // Next free Charge Code for a category, e.g. LAB-001, LAB-002… (scans existing codes).
    const nextChargeCode = (categoryCode: string): string => {
        const prefix = CATEGORY_CODE_PREFIX[categoryCode] ?? 'GEN';
        const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
        let max = 0;
        for (const c of charges) {
            const m = (c.chargeCode ?? '').match(re);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return `${prefix}-${String(max + 1).padStart(3, '0')}`;
    };

    const handleOpenDrawer = (record: ChargeRecord | null = null) => {
        if (record) {
            setEditingRecord({ ...record });
        } else {
            setEditingRecord({
                chargeCode: nextChargeCode('CONSULT'), displayName: '', appliesTo: 'OPD', categoryCode: 'CONSULT',
                defaultRate: 0, defaultQty: 1, maxDiscountPercent: 0, incentiveAmount: 0,
                isTaxable: false, taxInclusive: false, isIRDAIPayable: true,
                isActive: true, sortOrder: (charges.length + 1) * 10
            });
        }
        setIsDrawerOpen(true);
    };

    const handleDeleteCharge = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this charge definition? This action cannot be undone.")) return;
        if (busyId) return;
        setBusyId(id);
        try {
            const res: any = await ipdBillingService.deleteChargeMaster(id);
            if (res && res.isSucess === false) throw new Error(res.message ?? 'Could not delete');
            setCharges(prev => prev.filter(c => c.id !== id));
            toast({ title: 'Charge Deleted', description: 'The charge has been removed from the catalog.' });
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveDrawer = async (addAnother = false) => {
        if (!editingRecord?.chargeCode || !editingRecord?.displayName) {
            toast({ title: 'Validation Error', description: 'Code and Name are required.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        const isNew = !editingRecord.id;
        let savedRecord: ChargeRecord;
        try {
            const req: UpsertChargeMasterRequest = {
                chargeId: editingRecord.id,
                chargeCode: editingRecord.chargeCode,
                displayName: editingRecord.displayName!,
                appliesTo: editingRecord.appliesTo ?? 'ANY',
                categoryCode: editingRecord.categoryCode ?? 'OTHER',
                subCategoryCode: editingRecord.subCategoryCode,
                defaultRate: Number(editingRecord.defaultRate ?? 0),
                defaultQty: Number(editingRecord.defaultQty ?? 1),
                maxDiscountPercent: Number(editingRecord.maxDiscountPercent ?? 0),
                incentiveAmount: Number(editingRecord.incentiveAmount ?? 0),
                hsnSacCode: editingRecord.hsnSacCode,
                isTaxable: editingRecord.isTaxable ?? false,
                gstSlabPercent: editingRecord.isTaxable ? Number(editingRecord.gstSlabPercent ?? 0) : undefined,
                taxInclusive: editingRecord.taxInclusive ?? false,
                isIRDAIPayable: editingRecord.isIRDAIPayable ?? true,
                isActive: editingRecord.isActive ?? true,
                sortOrder: Number(editingRecord.sortOrder ?? 0),
                notes: editingRecord.notes,
            };
            const res: any = await ipdBillingService.upsertChargeMaster(req);
            if (res && res.isSucess === false) throw new Error(res.message ?? 'Could not save');
            const newId = res?.chargeId ?? editingRecord.id ?? '';
            savedRecord = { ...(editingRecord as ChargeRecord), id: newId };
            setCharges(prev => {
                if (isNew) return [...prev, savedRecord];
                return prev.map(c => c.id === savedRecord.id ? savedRecord : c);
            });
        } catch (e: any) {
            setIsSaving(false);
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
            return;
        }

        setIsSaving(false);
        setIsSuccess(true);

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#3b82f6', '#10b981', '#8b5cf6'],
            ticks: 200
        });

        toast({ title: 'Success', description: `Charge ${isNew ? 'created' : 'updated'} successfully.` });

        setTimeout(() => {
            setIsSuccess(false);
            if (addAnother) {
                setEditingRecord({
                    chargeCode: nextChargeCode(savedRecord.categoryCode), displayName: '', appliesTo: savedRecord.appliesTo, categoryCode: savedRecord.categoryCode,
                    defaultRate: 0, defaultQty: 1, maxDiscountPercent: 0, incentiveAmount: 0,
                    isTaxable: false, taxInclusive: false, isIRDAIPayable: true,
                    isActive: true, sortOrder: savedRecord.sortOrder + 10
                });
            } else {
                setIsDrawerOpen(false);
                setEditingRecord(null);
            }
        }, 1200);
    };

    const handleAddPayerRate = async () => {
        const rate = Number(newPayerRate.overrideRate);
        if (!newPayerRate.chargeId || !rate || rate <= 0) {
            toast({ title: 'Select a charge and enter a rate', variant: 'destructive' });
            return;
        }
        setRateCardSaving(true);
        try {
            await ipdBillingService.upsertPayerRate({ chargeId: newPayerRate.chargeId, payerType: newPayerRate.payerType, overrideRate: rate, isActive: true });
            toast({ title: 'Payer rate saved.' });
            setNewPayerRate({ chargeId: '', payerType: 'TPA', overrideRate: '' });
            loadRateCard();
        } catch (e: any) {
            toast({ title: 'Could not save payer rate', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setRateCardSaving(false);
        }
    };

    const handleAddRoomMultiplier = async () => {
        const pct = Number(newRoomMultiplier.multiplierPercent);
        if (!newRoomMultiplier.roomType || !pct || pct <= 0) {
            toast({ title: 'Select a room type and enter a multiplier', variant: 'destructive' });
            return;
        }
        setRateCardSaving(true);
        try {
            await ipdBillingService.upsertRoomMultiplier({ roomType: newRoomMultiplier.roomType, multiplierPercent: pct });
            toast({ title: 'Room-class multiplier saved.' });
            loadRateCard();
        } catch (e: any) {
            toast({ title: 'Could not save room multiplier', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setRateCardSaving(false);
        }
    };



    // --- Render ---
    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans relative overflow-hidden">

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-xs shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="charge-search"
                            placeholder="Search charges (Ctrl+K)..."
                            className="pl-9 bg-white dark:bg-slate-900 shadow-sm max-sm:rounded-xl max-sm:h-12 max-sm:border-transparent max-sm:bg-gray-100/80 max-sm:dark:bg-slate-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* DESKTOP DROPDOWNS */}
                    <div className="hidden sm:flex gap-2 text-sm overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                        <Select value={filterAppliesTo} onValueChange={setFilterAppliesTo}>
                            <SelectTrigger className="w-[120px] bg-white dark:bg-slate-900 shadow-sm h-10 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectItem value="ALL">All Modules</SelectItem>
                                <SelectItem value="OPD">OPD</SelectItem>
                                <SelectItem value="IPD">IPD</SelectItem>
                                <SelectItem value="LAB">LAB</SelectItem>
                                <SelectItem value="RAD">RAD</SelectItem>
                                <SelectItem value="PHARMACY">PHARMACY</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900 shadow-sm h-10 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                <SelectItem value="CONSULT">Consultation</SelectItem>
                                <SelectItem value="LAB">Laboratory</SelectItem>
                                <SelectItem value="RAD">Radiology</SelectItem>
                                <SelectItem value="PROCEDURE">Procedure</SelectItem>
                                <SelectItem value="SERVICE">Service</SelectItem>
                                <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterActive} onValueChange={setFilterActive}>
                            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 shadow-sm h-10 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-md">
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* MOBILE HORIZONTAL CHIPS */}
                    <div className="sm:hidden flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-1 -mx-1 snap-x">
                        {['ALL', 'CONSULT', 'LAB', 'RAD', 'PROCEDURE', 'SERVICE', 'CONSUMABLE'].map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFilterCategory(cat)}
                                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wide capitalize snap-center transition-all ${
                                    filterCategory === cat 
                                    ? 'bg-brand-600 text-white shadow-md' 
                                    : 'bg-white dark:bg-zinc-900 text-slate-605 dark:text-zinc-300 shadow-sm border border-slate-200 dark:border-zinc-800'
                                }`}
                            >
                                {cat === 'ALL' ? 'All' : cat.toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => loadCharges(true)} disabled={refreshing || loading} className="gap-1.5 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300 max-sm:hidden">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 max-sm:hidden">
                        <Plus className="h-4 w-4" /> New Charge
                    </Button>
                </div>
            </div>


            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 pb-36 hide-scrollbar relative">
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm max-lg:bg-transparent max-lg:border-0 max-lg:shadow-none">
                    <table className="w-full text-sm text-left max-lg:hidden">
                        <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Display Name</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Module</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Category</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Rate</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Incentive</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-center">Active</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading && Array.from({ length: 4 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    <td colSpan={7} className="px-4 py-3">
                                        <Skeleton className="h-9 w-full" />
                                    </td>
                                </tr>
                            ))}
                            {!loading && loadError && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-rose-600">
                                            <AlertCircle className="h-8 w-8" />
                                            <p className="font-semibold">{loadError}</p>
                                            <Button size="sm" variant="outline" onClick={() => loadCharges(true)} className="mt-2 h-7 text-xs">
                                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && !loadError && filteredCharges.map(charge => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={charge.id}
                                    className="hover:bg-brand-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-2">
                                            {charge.displayName}
                                            {charge.maxDiscountPercent > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 font-mono" title={`Max Discount: ${charge.maxDiscountPercent}%`}>
                                                    Disc {charge.maxDiscountPercent}%
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-semibold border-gray-200 dark:border-gray-700">
                                            {charge.appliesTo}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
                                        {charge.categoryCode}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                                        ₹{charge.defaultRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {charge.incentiveAmount > 0
                                            ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{charge.incentiveAmount.toLocaleString('en-IN')}</span>
                                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={charge.isActive}
                                            onCheckedChange={() => handleToggleActive(charge.id)}
                                            className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800" onClick={() => handleOpenDrawer(charge)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteCharge(charge.id)} title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {!loading && !loadError && filteredCharges.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="font-medium text-base">{charges.length === 0 ? 'No charges configured yet' : 'No charges match your filters'}</p>
                                            <p className="text-sm">{charges.length === 0 ? 'Click "New Charge" to add your first charge definition.' : 'Try tweaking your search or filters.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* MOBILE CARDS */}
                    <div className="lg:hidden flex flex-col gap-3 pb-20 mt-2">
                        {loading && Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={`skm-${i}`} className="h-24 w-full rounded-2xl" />
                        ))}
                        {!loading && loadError && (
                            <div className="flex flex-col items-center gap-2 text-rose-600 py-12">
                                <AlertCircle className="h-8 w-8" />
                                <p className="font-semibold">{loadError}</p>
                            </div>
                        )}
                        {!loading && !loadError && filteredCharges.map(charge => {
                            const catStyle = getCategoryStyles(charge.categoryCode);
                            const Icon = catStyle.icon;
                            return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                whileTap={{ scale: 0.98 }}
                                key={`mob-${charge.id}`}
                                className="bg-white/95 dark:bg-zinc-900/95 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5 relative overflow-hidden active:scale-[0.99] transition-all hover:shadow-md"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 pr-2">
                                        <div className={cn(
                                            "w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-bold shadow-sm",
                                            catStyle.bg
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm leading-snug">
                                                {charge.displayName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-550 uppercase tracking-widest">{charge.categoryCode}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-800"></span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">{charge.appliesTo}</span>
                                                {charge.maxDiscountPercent > 0 && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 font-mono font-black border border-amber-250/10">
                                                        Disc {charge.maxDiscountPercent}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 pt-0.5">
                                        <span className="font-mono font-black text-sm text-slate-800 dark:text-zinc-150">
                                            ₹{charge.defaultRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={charge.isActive}
                                            onCheckedChange={() => handleToggleActive(charge.id)}
                                            className="data-[state=checked]:bg-green-500 scale-75 origin-left"
                                        />
                                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${charge.isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                            {charge.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button variant="ghost" size="icon" className="h-8.5 w-8.5 text-slate-500 hover:text-brand-600 bg-slate-50/50 dark:bg-zinc-850/50 rounded-xl" onClick={() => handleOpenDrawer(charge)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8.5 w-8.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 rounded-xl" onClick={() => handleDeleteCharge(charge.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* RATE CARDS: payer-type override + room-class multiplier */}
                <div className="mt-6 hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm p-4.5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">Payer Rate Overrides</h3>
                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_95px_110px_auto] gap-2.5 mb-4">
                            <Select value={newPayerRate.chargeId} onValueChange={v => setNewPayerRate(p => ({ ...p, chargeId: v }))}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue placeholder="Charge item" /></SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                    {charges.map(c => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={newPayerRate.payerType} onValueChange={v => setNewPayerRate(p => ({ ...p, payerType: v as PayerType }))}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                    <SelectItem value="CASH">CASH</SelectItem>
                                    <SelectItem value="TPA">TPA</SelectItem>
                                    <SelectItem value="SCHEME">SCHEME</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input type="number" min="0" className="h-10 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" placeholder="Rate ₹" value={newPayerRate.overrideRate} onChange={e => setNewPayerRate(p => ({ ...p, overrideRate: e.target.value }))} />
                            <Button size="sm" className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold shadow-sm active:scale-95 transition-all" disabled={rateCardSaving} onClick={handleAddPayerRate}>Save</Button>
                        </div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto hide-scrollbar">
                            {rateCardLoading ? (
                                <Skeleton className="h-8 w-full" />
                            ) : payerRates.length === 0 ? (
                                <div className="flex items-center justify-center gap-1.5 py-3 text-slate-400 dark:text-zinc-550">
                                    <Database className="h-4 w-4" />
                                    <span className="text-[11px] font-bold">No payer overrides — defaulting to standard rates</span>
                                </div>
                            ) : payerRates.map(r => (
                                <div key={r.chargeMasterPayerRateId} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/20 dark:border-zinc-800/30">
                                    <span className="font-semibold text-slate-700 dark:text-zinc-350">{r.chargeDisplayName ?? r.chargeCode}</span>
                                    <span className="font-mono font-bold text-slate-500 dark:text-zinc-450">{r.payerType} · ₹{r.overrideRate.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-gray-200 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm p-4.5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">Room-Class Rate Multipliers</h3>
                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_110px_auto] gap-2.5 mb-4">
                            <Select value={newRoomMultiplier.roomType} onValueChange={v => setNewRoomMultiplier(p => ({ ...p, roomType: v }))}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                    {['GENERAL', 'ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'ICCU', 'PRIVATE', 'SEMI_PRIVATE', 'OTHER'].map(w => (
                                        <SelectItem key={w} value={w}>{w.replace('_', ' ')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input type="number" min="0" className="h-10 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" placeholder="% (100 = default)" value={newRoomMultiplier.multiplierPercent} onChange={e => setNewRoomMultiplier(p => ({ ...p, multiplierPercent: e.target.value }))} />
                            <Button size="sm" className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold shadow-sm active:scale-95 transition-all" disabled={rateCardSaving} onClick={handleAddRoomMultiplier}>Save</Button>
                        </div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto hide-scrollbar">
                            {rateCardLoading ? (
                                <Skeleton className="h-8 w-full" />
                            ) : roomMultipliers.length === 0 ? (
                                <div className="flex items-center justify-center gap-1.5 py-3 text-slate-400 dark:text-zinc-550">
                                    <Activity className="h-4 w-4" />
                                    <span className="text-[11px] font-bold">No room multipliers — standard rates active</span>
                                </div>
                            ) : roomMultipliers.map(r => (
                                <div key={r.roomClassRateMultiplierId} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/20 dark:border-zinc-800/30">
                                    <span className="font-semibold text-slate-700 dark:text-zinc-350">{r.roomType.replace('_', ' ')}</span>
                                    <span className="font-mono font-bold text-slate-500 dark:text-zinc-450">{r.multiplierPercent}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating Action Button (FAB) for Mobile ( sitting above bottom navigation bar ) */}
                <div className="fixed bottom-24 right-4 z-40 sm:hidden">
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        onClick={() => handleOpenDrawer(null)}
                        className="relative h-12 px-5 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-650 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(79,70,229,0.35)] border border-white/20 active:scale-95 transition-all"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        <Plus className="h-5 w-5 relative z-10" strokeWidth={3} />
                        <span className="text-[11.5px] font-black tracking-tight relative z-10 whitespace-nowrap">Add Charge Master</span>
                        {/* Glow halo behind button */}
                        <div className="absolute inset-0 -z-10 bg-indigo-500/10 blur-md rounded-full" />
                    </motion.button>
                </div>
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
                            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[110] flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {editingRecord?.id ? 'Edit Charge' : 'New Charge'}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 max-sm:p-4 space-y-8 max-sm:space-y-6 [&_input]:max-sm:bg-gray-100/80 [&_input]:max-sm:border-transparent [&_input]:max-sm:rounded-xl [&_input]:max-sm:h-12 [&_input]:max-sm:px-4 [&_button[role='combobox']]:max-sm:bg-gray-100/80 [&_button[role='combobox']]:max-sm:border-transparent [&_button[role='combobox']]:max-sm:rounded-xl [&_button[role='combobox']]:max-sm:h-12 [&_textarea]:max-sm:bg-gray-100/80 [&_textarea]:max-sm:border-transparent [&_textarea]:max-sm:rounded-xl [&_textarea]:max-sm:p-4 dark:[&_input]:max-sm:bg-slate-800 dark:[&_button[role='combobox']]:max-sm:bg-slate-800 dark:[&_textarea]:max-sm:bg-slate-800 pb-24">

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Basic Details
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Display Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="name"
                                                className="transition-shadow focus-visible:ring-brand-500"
                                                placeholder="e.g. Complete Blood Count"
                                                value={editingRecord?.displayName || ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, displayName: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Classification
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Applies To</Label>
                                            <Select value={editingRecord?.appliesTo} onValueChange={v => setEditingRecord(p => ({ ...p!, appliesTo: v as any }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="OPD">OPD</SelectItem>
                                                    <SelectItem value="IPD">IPD</SelectItem>
                                                    <SelectItem value="LAB">LAB</SelectItem>
                                                    <SelectItem value="RAD">RAD</SelectItem>
                                                    <SelectItem value="PHARMACY">PHARMACY</SelectItem>
                                                    <SelectItem value="ANY">ANY (All Modules)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Category</Label>
                                            <Select value={editingRecord?.categoryCode} onValueChange={v => setEditingRecord(p => {
                                                if (!p) return p;
                                                const next = { ...p, categoryCode: v as any };
                                                // For NEW items, keep the Charge Code in sync with the category while it's blank or still an auto code.
                                                if (!p.id) {
                                                    const oldPrefix = CATEGORY_CODE_PREFIX[p.categoryCode as string];
                                                    const looksAuto = oldPrefix ? new RegExp(`^${oldPrefix}-\\d+$`, 'i').test(p.chargeCode ?? '') : false;
                                                    if (!p.chargeCode || looksAuto) next.chargeCode = nextChargeCode(v);
                                                }
                                                return next;
                                            })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CONSULT">Consultation</SelectItem>
                                                    <SelectItem value="LAB">Laboratory</SelectItem>
                                                    <SelectItem value="RAD">Radiology</SelectItem>
                                                    <SelectItem value="PROCEDURE">Procedure</SelectItem>
                                                    <SelectItem value="SERVICE">Service</SelectItem>
                                                    <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pricing
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Default Rate (₹) <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="font-mono"
                                                value={editingRecord?.defaultRate || ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, defaultRate: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Default Quantity <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                className="font-mono"
                                                value={editingRecord?.defaultQty || ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, defaultQty: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div className="grid gap-2 col-span-2">
                                            <Label className="flex justify-between">
                                                <span>Max Discount (%)</span>
                                                <span className="text-xs text-muted-foreground font-normal">If blank, global policy applies</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    min="0" max="100"
                                                    className="font-mono pr-8"
                                                    value={editingRecord?.maxDiscountPercent === 0 ? '0' : editingRecord?.maxDiscountPercent || ''}
                                                    onChange={e => setEditingRecord(p => ({ ...p!, maxDiscountPercent: Number(e.target.value) }))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 col-span-2">
                                            <Label className="flex justify-between">
                                                <span>Incentive (₹)</span>
                                                <span className="text-xs text-muted-foreground font-normal">Default per unit · editable at billing · blank/0 = none</span>
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="font-mono pl-7"
                                                    placeholder="0"
                                                    value={editingRecord?.incentiveAmount === 0 ? '0' : editingRecord?.incentiveAmount || ''}
                                                    onChange={e => setEditingRecord(p => ({ ...p!, incentiveAmount: Number(e.target.value) }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Tax &amp; Insurance
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>HSN/SAC Code</Label>
                                            <Input
                                                className="font-mono"
                                                placeholder="e.g. 9993"
                                                value={editingRecord?.hsnSacCode || ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, hsnSacCode: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="flex justify-between">
                                                <span>GST Slab (%)</span>
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0" max="28"
                                                className="font-mono"
                                                disabled={!editingRecord?.isTaxable}
                                                placeholder="0"
                                                value={editingRecord?.gstSlabPercent ?? ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, gstSlabPercent: Number(e.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                        <div>
                                            <Label className="font-semibold cursor-pointer">Taxable</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Otherwise this item is GST-exempt</p>
                                        </div>
                                        <Switch
                                            checked={!!editingRecord?.isTaxable}
                                            onCheckedChange={v => setEditingRecord(p => ({ ...p!, isTaxable: v, gstSlabPercent: v ? p!.gstSlabPercent : undefined }))}
                                            className="data-[state=checked]:bg-green-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                        <div>
                                            <Label className="font-semibold cursor-pointer">Rate is tax-inclusive</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Default Rate above already includes GST</p>
                                        </div>
                                        <Switch
                                            checked={!!editingRecord?.taxInclusive}
                                            onCheckedChange={v => setEditingRecord(p => ({ ...p!, taxInclusive: v }))}
                                            className="data-[state=checked]:bg-green-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                        <div>
                                            <Label className="font-semibold cursor-pointer">TPA/insurance payable</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Off = counted as non-payable in the IRDAI discharge split</p>
                                        </div>
                                        <Switch
                                            checked={editingRecord?.isIRDAIPayable ?? true}
                                            onCheckedChange={v => setEditingRecord(p => ({ ...p!, isIRDAIPayable: v }))}
                                            className="data-[state=checked]:bg-green-500"
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Settings
                                    </h3>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                        <div>
                                            <Label className="font-semibold cursor-pointer" htmlFor="isActiveSwitch">Active Status</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Charge available for billing</p>
                                        </div>
                                        <Switch
                                            id="isActiveSwitch"
                                            checked={editingRecord?.isActive}
                                            onCheckedChange={v => setEditingRecord(p => ({ ...p!, isActive: v }))}
                                            className="data-[state=checked]:bg-green-500"
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Notes
                                    </h3>
                                    <Textarea
                                        placeholder="Internal notes or billing guidelines for this charge..."
                                        className="resize-none h-24"
                                        value={editingRecord?.notes || ''}
                                        onChange={e => setEditingRecord(p => ({ ...p!, notes: e.target.value }))}
                                    />
                                </section>

                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 max-lg:pb-24 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-between items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)} className="text-gray-500">Cancel</Button>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        disabled={isSaving}
                                        onClick={() => handleSaveDrawer(true)}
                                        className="flex-1 sm:flex-none border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-900/30"
                                    >
                                        Save & Add Next
                                    </Button>
                                    <motion.button
                                        disabled={isSaving || isSuccess}
                                        onClick={() => handleSaveDrawer(false)}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-w-[100px] h-10 ${isSuccess
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                                            }`}
                                        animate={isSuccess ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isSaving ? (
                                            "Saving..."
                                        ) : isSuccess ? (
                                            <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                                        ) : (
                                            "Save"
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
