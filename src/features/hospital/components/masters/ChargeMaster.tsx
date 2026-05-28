import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Upload, Download, MoreVertical,
    Copy, Pencil, Trash2, CheckCircle2, AlertCircle, X, Zap, Loader2, RefreshCw
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
import { ipdBillingService, type ChargeMaster as BackendChargeMaster, type UpsertChargeMasterRequest } from '@/features/billing/services/ipdBillingService';

// --- Types & Mock Data ---

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

    const handleOpenDrawer = (record: ChargeRecord | null = null) => {
        if (record) {
            setEditingRecord({ ...record });
        } else {
            setEditingRecord({
                chargeCode: '', displayName: '', appliesTo: 'OPD', categoryCode: 'CONSULT',
                defaultRate: 0, defaultQty: 1, maxDiscountPercent: 0, incentiveAmount: 0, isActive: true, sortOrder: (charges.length + 1) * 10
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
                    chargeCode: '', displayName: '', appliesTo: savedRecord.appliesTo, categoryCode: savedRecord.categoryCode,
                    defaultRate: 0, defaultQty: 1, maxDiscountPercent: 0, incentiveAmount: 0, isActive: true, sortOrder: savedRecord.sortOrder + 10
                });
            } else {
                setIsDrawerOpen(false);
                setEditingRecord(null);
            }
        }, 1200);
    };



    // --- Render ---
    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans relative overflow-hidden">

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="charge-search"
                            placeholder="Search charges (Ctrl+K)..."
                            className="pl-9 bg-white dark:bg-slate-900 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 text-sm overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                        <Select value={filterAppliesTo} onValueChange={setFilterAppliesTo}>
                            <SelectTrigger className="w-[120px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Modules</SelectItem>
                                <SelectItem value="OPD">OPD</SelectItem>
                                <SelectItem value="IPD">IPD</SelectItem>
                                <SelectItem value="LAB">LAB</SelectItem>
                                <SelectItem value="RAD">RAD</SelectItem>
                                <SelectItem value="PHARMACY">PHARMACY</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
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
                            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => loadCharges(true)} disabled={refreshing || loading} className="gap-1.5 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button variant="outline" className="hidden lg:flex gap-2 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300">
                        <Upload className="h-4 w-4" /> Import
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20">
                        <Plus className="h-4 w-4" /> New Charge
                    </Button>
                </div>
            </div>


            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 hide-scrollbar relative">
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Code</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Display Name</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Module</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Category</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Rate</th>
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
                                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{charge.chargeCode}</td>
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
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={charge.isActive}
                                            onCheckedChange={() => handleToggleActive(charge.id)}
                                            className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800" onClick={() => handleOpenDrawer(charge)}>
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
                </div>
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
                            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute top-0 right-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {editingRecord?.id ? 'Edit Charge' : 'New Charge'}
                                    </h2>
                                    {editingRecord?.id && (
                                        <p className="text-sm text-muted-foreground font-mono mt-0.5">{editingRecord.chargeCode}</p>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Basic Details
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="code">Charge Code <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="code"
                                                className="font-mono uppercase transition-shadow focus-visible:ring-blue-500"
                                                placeholder="e.g. LAB_CBC"
                                                value={editingRecord?.chargeCode || ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, chargeCode: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Display Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="name"
                                                className="transition-shadow focus-visible:ring-blue-500"
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
                                            <Select value={editingRecord?.categoryCode} onValueChange={v => setEditingRecord(p => ({ ...p!, categoryCode: v as any }))}>
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
                                    <div className="grid gap-2">
                                        <Label>Sort Order</Label>
                                        <Input
                                            type="number"
                                            className="font-mono max-w-[150px]"
                                            value={editingRecord?.sortOrder || ''}
                                            onChange={e => setEditingRecord(p => ({ ...p!, sortOrder: Number(e.target.value) }))}
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
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-between items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)} className="text-gray-500">Cancel</Button>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        disabled={isSaving}
                                        onClick={() => handleSaveDrawer(true)}
                                        className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                                    >
                                        Save & Add Next
                                    </Button>
                                    <motion.button
                                        disabled={isSaving || isSuccess}
                                        onClick={() => handleSaveDrawer(false)}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-w-[100px] h-10 ${isSuccess
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
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
