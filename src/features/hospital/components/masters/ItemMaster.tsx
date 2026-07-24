import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, Pill, ShieldAlert, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
    inventoryApi, type InventoryItem, type InventoryCategory, type DrugScheduleClass,
    type StorageCondition, type UpsertInventoryItemInput,
} from '@/features/ipd-redesign/services/inventoryApi';

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
    CONSUMABLE: 'Consumable', DRUG: 'Drug', DISPOSABLE: 'Disposable', SURGICAL: 'Surgical', IMPLANT: 'Implant', OTHER: 'Other',
};

const SCHEDULE_LABELS: Record<DrugScheduleClass, string> = {
    H: 'Schedule H', H1: 'Schedule H1', X: 'Schedule X', NARCOTIC: 'Narcotic',
};

const SCHEDULE_COLORS: Record<DrugScheduleClass, string> = {
    H: 'bg-amber-100 text-amber-800 border-amber-200',
    H1: 'bg-orange-100 text-orange-800 border-orange-200',
    X: 'bg-rose-100 text-rose-800 border-rose-200',
    NARCOTIC: 'bg-red-100 text-red-800 border-red-200',
};

const STORAGE_LABELS: Record<StorageCondition, string> = {
    ROOM: 'Room Temp', COLD_CHAIN: 'Cold Chain (2-8°C)', FROZEN: 'Frozen', CONTROLLED: 'Controlled Safe',
};

type EditingItem = Partial<UpsertInventoryItemInput> & { inventoryItemId?: string };

type ItemErrors = { itemCode?: string; itemName?: string };
const validateItem = (rec: EditingItem | null): ItemErrors => {
    const e: ItemErrors = {};
    if (!rec) return e;
    if (!String(rec.itemCode ?? '').trim()) e.itemCode = 'Item code is required';
    if (!String(rec.itemName ?? '').trim()) e.itemName = 'Item name is required';
    return e;
};

export const ItemMaster: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const loadItems = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await inventoryApi.getItems({ activeOnly: false });
            setItems(res);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load items');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadItems(); }, [loadItems]);

    const filteredItems = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return items.filter(i => {
            const matchesSearch = !q || i.itemName.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q) || (i.genericName ?? '').toLowerCase().includes(q);
            const matchesCategory = filterCategory === 'ALL' || i.category === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, filterCategory]);

    const handleOpenDrawer = (item: InventoryItem | null = null) => {
        if (item) {
            setEditingItem({
                inventoryItemId: item.inventoryItemId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                genericName: item.genericName ?? undefined,
                manufacturer: item.manufacturer ?? undefined,
                category: item.category,
                unit: item.unit,
                defaultRate: item.defaultRate ?? undefined,
                minStockLevel: item.minStockLevel,
                reorderQty: item.reorderQty,
                maxStockLevel: item.maxStockLevel ?? undefined,
                scheduleClass: item.scheduleClass ?? undefined,
                isLasa: item.isLasa,
                isHighAlert: item.isHighAlert,
                storageCondition: item.storageCondition ?? undefined,
                isActive: item.isActive,
            });
        } else {
            setEditingItem({ itemCode: '', itemName: '', category: 'CONSUMABLE', unit: 'PCS', minStockLevel: 0, reorderQty: 0, isActive: true });
        }
        setIsDrawerOpen(true);
    };

    const formErrors = validateItem(editingItem);
    const isValid = Object.keys(formErrors).length === 0;

    const handleSave = async () => {
        const errs = validateItem(editingItem);
        const firstErr = errs.itemCode || errs.itemName;
        if (firstErr || !editingItem) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const res: any = await inventoryApi.upsertItem({
                inventoryItemId: editingItem.inventoryItemId,
                itemCode: editingItem.itemCode!.trim(),
                itemName: editingItem.itemName!.trim(),
                genericName: editingItem.genericName,
                manufacturer: editingItem.manufacturer,
                category: (editingItem.category ?? 'CONSUMABLE') as InventoryCategory,
                unit: editingItem.unit || 'PCS',
                defaultRate: editingItem.defaultRate,
                minStockLevel: Number(editingItem.minStockLevel ?? 0),
                reorderQty: Number(editingItem.reorderQty ?? 0),
                maxStockLevel: editingItem.maxStockLevel,
                scheduleClass: editingItem.scheduleClass || null,
                isLasa: editingItem.isLasa ?? false,
                isHighAlert: editingItem.isHighAlert ?? false,
                storageCondition: editingItem.storageCondition || null,
                isActive: editingItem.isActive ?? true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not save item');
            toast({ title: editingItem.inventoryItemId ? 'Item updated' : 'Item created', description: editingItem.itemName });
            setIsDrawerOpen(false);
            await loadItems(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search item, code, generic name..."
                            className="pl-9 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[160px] h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">All Categories</SelectItem>
                            {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(c => (
                                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadItems(true)} disabled={refreshing || loading} className="gap-1.5 h-10 rounded-xl active:scale-[0.98] transition-all">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadItems(true)} className="mt-2">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredItems.map(i => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={i.inventoryItemId}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${!i.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                                                    <Pill className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <span className="truncate">{i.itemName}</span>
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate">{i.itemCode} {i.genericName ? `• ${i.genericName}` : ''}</p>
                                            </div>
                                            <Badge variant="outline" className="ml-2 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                                {CATEGORY_LABELS[i.category]}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {i.scheduleClass && (
                                                <Badge variant="outline" className={`text-[9px] font-bold uppercase ${SCHEDULE_COLORS[i.scheduleClass]}`}>
                                                    {SCHEDULE_LABELS[i.scheduleClass]}
                                                </Badge>
                                            )}
                                            {i.isLasa && (
                                                <Badge variant="outline" className="text-[9px] font-bold bg-purple-50 text-purple-700 border-purple-200">LASA</Badge>
                                            )}
                                            {i.isHighAlert && (
                                                <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-0.5">
                                                    <ShieldAlert className="h-2.5 w-2.5" /> High Alert
                                                </Badge>
                                            )}
                                            {i.storageCondition && i.storageCondition !== 'ROOM' && (
                                                <Badge variant="outline" className="text-[9px] font-bold bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-0.5">
                                                    <Thermometer className="h-2.5 w-2.5" /> {STORAGE_LABELS[i.storageCondition]}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-auto flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <div className="text-[10px] text-gray-400 uppercase font-semibold">Stock</div>
                                                <div className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                                                    {i.currentStock.toLocaleString('en-IN')} {i.unit}
                                                    {i.currentStock <= i.minStockLevel && (
                                                        <span className="ml-1.5 text-[9px] font-bold text-amber-600 uppercase">Low</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!i.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-gray-100 dark:border-gray-800" onClick={() => handleOpenDrawer(i)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{items.length === 0 ? 'No items configured yet' : 'No items match your filters'}</p>
                            <p className="text-sm mt-1 max-w-sm">{items.length === 0 ? 'Click "Add Item" to set up your first drug, consumable, or implant.' : 'Try a different search or category filter.'}</p>
                        </div>
                    )
                )}
            </div>
            {createPortal(
                <AnimatePresence>
                    {isDrawerOpen && editingItem && (
                        <motion.div
                            key="drawer-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    )}
                    {isDrawerOpen && editingItem && (
                        <motion.div
                            key="drawer-content"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[calc(100%-2rem)] sm:w-[520px] rounded-l-[32px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[60] flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <Pill className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">
                                        {editingItem.inventoryItemId ? 'Edit Item' : 'Add Item'}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15 active:scale-[0.98] transition-all" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Basic Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item Code <span className="text-red-500">*</span></Label>
                                            <Input
                                                placeholder="e.g. DRG-PARA-500"
                                                className={cn("h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all", formErrors.itemCode ? 'border-red-500' : '')}
                                                value={editingItem.itemCode ?? ''}
                                                onChange={e => setEditingItem(p => ({ ...p!, itemCode: e.target.value }))}
                                            />
                                            {formErrors.itemCode && <p className="text-[10px] text-red-500">{formErrors.itemCode}</p>}
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                placeholder="e.g. Paracetamol 500mg"
                                                className={cn("h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all", formErrors.itemName ? 'border-red-500' : '')}
                                                value={editingItem.itemName ?? ''}
                                                onChange={e => setEditingItem(p => ({ ...p!, itemName: e.target.value }))}
                                            />
                                            {formErrors.itemName && <p className="text-[10px] text-red-500">{formErrors.itemName}</p>}
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Generic Name <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                            <Input className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" value={editingItem.genericName ?? ''} onChange={e => setEditingItem(p => ({ ...p!, genericName: e.target.value }))} />
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Manufacturer <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                            <Input className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" value={editingItem.manufacturer ?? ''} onChange={e => setEditingItem(p => ({ ...p!, manufacturer: e.target.value }))} />
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Category</Label>
                                            <Select value={editingItem.category ?? 'CONSUMABLE'} onValueChange={v => setEditingItem(p => ({ ...p!, category: v as InventoryCategory }))}>
                                                <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(c => (
                                                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Unit</Label>
                                            <Input placeholder="PCS / STRIP / BOX" className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" value={editingItem.unit ?? ''} onChange={e => setEditingItem(p => ({ ...p!, unit: e.target.value }))} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Regulatory &amp; Safety
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Drug Schedule <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                            <Select value={editingItem.scheduleClass ?? 'NONE'} onValueChange={v => setEditingItem(p => ({ ...p!, scheduleClass: v === 'NONE' ? null : v as DrugScheduleClass }))}>
                                                <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="None (OTC)" /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="NONE">None (OTC)</SelectItem>
                                                    {(Object.keys(SCHEDULE_LABELS) as DrugScheduleClass[]).map(s => (
                                                        <SelectItem key={s} value={s}>{SCHEDULE_LABELS[s]}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Storage Condition</Label>
                                            <Select value={editingItem.storageCondition ?? 'ROOM'} onValueChange={v => setEditingItem(p => ({ ...p!, storageCondition: v as StorageCondition }))}>
                                                <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {(Object.keys(STORAGE_LABELS) as StorageCondition[]).map(s => (
                                                        <SelectItem key={s} value={s}>{STORAGE_LABELS[s]}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                        <div>
                                            <Label className="font-semibold text-slate-800 dark:text-zinc-200">LASA</Label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Look-Alike Sound-Alike drug — flagged in pickers.</p>
                                        </div>
                                        <Switch checked={editingItem.isLasa ?? false} onCheckedChange={v => setEditingItem(p => ({ ...p!, isLasa: v }))} className="data-[state=checked]:bg-purple-500" />
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                        <div>
                                            <Label className="font-semibold text-slate-800 dark:text-zinc-200">High Alert</Label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">ISMP high-alert medication (electrolytes, insulin, anticoagulants...).</p>
                                        </div>
                                        <Switch checked={editingItem.isHighAlert ?? false} onCheckedChange={v => setEditingItem(p => ({ ...p!, isHighAlert: v }))} className="data-[state=checked]:bg-rose-500" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Stock Levels
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Min Stock Level</Label>
                                            <Input type="number" min={0} value={editingItem.minStockLevel ?? ''} onChange={e => setEditingItem(p => ({ ...p!, minStockLevel: Number(e.target.value) }))} className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono" />
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Reorder Qty</Label>
                                            <Input type="number" min={0} value={editingItem.reorderQty ?? ''} onChange={e => setEditingItem(p => ({ ...p!, reorderQty: Number(e.target.value) }))} className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono" />
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-muted-foreground">Quantity auto-drafted when stock hits Min Stock Level.</p>
                                        </div>
                                        <div className="grid gap-1.5 col-span-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Max Stock Level <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                            <Input type="number" min={0} value={editingItem.maxStockLevel ?? ''} onChange={e => setEditingItem(p => ({ ...p!, maxStockLevel: e.target.value ? Number(e.target.value) : null }))} className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono" />
                                        </div>
                                    </div>
                                </section>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                    <div>
                                        <Label className="cursor-pointer font-semibold text-slate-800 dark:text-zinc-200">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive items are hidden from stock-movement pickers.</p>
                                    </div>
                                    <Switch checked={editingItem.isActive ?? true} onCheckedChange={v => setEditingItem(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex justify-end gap-2 shrink-0">
                                <Button variant="ghost" className="h-10 rounded-xl active:scale-[0.98] transition-all text-slate-650" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold px-5">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingItem.inventoryItemId ? 'Save' : 'Create Item')}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ItemMaster;
