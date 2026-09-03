import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive,
    Pill, ShieldAlert, Thermometer, PackagePlus,
    ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
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
import { ReceiveStockDialog } from '@/features/ipd-redesign/components/ReceiveStockDialog';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { pharmacyCatalogApi, type SaltComposition } from '@/features/pharmacy/services/pharmacyCatalogApi';

/* ─────────────────── constants ─────────────────── */

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
    CONSUMABLE: 'Consumable', DRUG: 'Drug', DISPOSABLE: 'Disposable',
    SURGICAL: 'Surgical', IMPLANT: 'Implant', OTHER: 'Other',
};

const SCHEDULE_LABELS: Record<DrugScheduleClass, string> = {
    H: 'Sch H', H1: 'Sch H1', X: 'Sch X', NARCOTIC: 'Narcotic',
};

const SCHEDULE_COLORS: Record<DrugScheduleClass, string> = {
    H: 'bg-amber-100 text-amber-800 border-amber-200',
    H1: 'bg-orange-100 text-orange-800 border-orange-200',
    X: 'bg-rose-100 text-rose-800 border-rose-200',
    NARCOTIC: 'bg-red-100 text-red-800 border-red-200',
};

const STORAGE_LABELS: Record<StorageCondition, string> = {
    ROOM: 'Room Temp', COLD_CHAIN: 'Cold Chain (2-8\u00b0C)', FROZEN: 'Frozen', CONTROLLED: 'Controlled Safe',
};

const PAGE_SIZE = 10;

/* ─────────────────── types ─────────────────── */

type EditingItem = Partial<UpsertInventoryItemInput> & { inventoryItemId?: string };
type SortKey = 'itemCode' | 'itemName' | 'category' | 'unit' | 'currentStock' | 'minStockLevel' | 'defaultRate';
type SortDir = 'asc' | 'desc';

/* ─────────────────── helpers ─────────────────── */

type ItemErrors = { itemCode?: string; itemName?: string };
const validateItem = (rec: EditingItem | null): ItemErrors => {
    const e: ItemErrors = {};
    if (!rec) return e;
    if (!String(rec.itemCode ?? '').trim()) e.itemCode = 'Item code is required';
    if (!String(rec.itemName ?? '').trim()) e.itemName = 'Item name is required';
    return e;
};

/* ─────────────────── sortable header cell ─────────────────── */

const SortTh: React.FC<{
    label: string;
    col: SortKey;
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (col: SortKey) => void;
    className?: string;
}> = ({ label, col, sortKey, sortDir, onSort, className }) => {
    const active = sortKey === col;
    return (
        <th
            onClick={() => onSort(col)}
            className={cn(
                'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider select-none cursor-pointer whitespace-nowrap transition-colors',
                'text-slate-500 dark:text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400',
                active && 'text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/10',
                className,
            )}
        >
            <span className="flex items-center gap-1">
                {label}
                {active
                    ? sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3 text-brand-500" />
                        : <ChevronDown className="h-3 w-3 text-brand-500" />
                    : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                }
            </span>
        </th>
    );
};

/* ─────────────────── component ─────────────────── */

export interface ItemMasterProps {
    fixedCategory?: InventoryCategory;
}

export const ItemMaster: React.FC<ItemMasterProps> = ({ fixedCategory }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>(fixedCategory || 'ALL');

    // Sorting
    const [sortKey, setSortKey] = useState<SortKey>('itemName');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Pagination
    const [page, setPage] = useState(1);

    // Drawer (add/edit)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Receive Stock dialog
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [receiveItemId, setReceiveItemId] = useState<string | undefined>(undefined);
    const [boardStores, setBoardStores] = useState<StoreItem[]>([]);
    const [saltCompositions, setSaltCompositions] = useState<SaltComposition[]>([]);

    useEffect(() => {
        storeService.getStores().then(setBoardStores).catch(() => { /* non-fatal */ });
        pharmacyCatalogApi.getSaltCompositions().then(setSaltCompositions).catch(() => { /* non-fatal */ });
    }, []);

    const handleAddStock = (item: InventoryItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setReceiveItemId(item.inventoryItemId);
        setReceiveDialogOpen(true);
    };

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

    /* ── sort handler ── */
    const handleSort = (col: SortKey) => {
        if (sortKey === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(col);
            setSortDir('asc');
        }
        setPage(1);
    };

    /* ── filtered + sorted ── */
    const filteredItems = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return items.filter(i => {
            const matchesSearch = !q || i.itemName.toLowerCase().includes(q)
                || i.itemCode.toLowerCase().includes(q)
                || (i.genericName ?? '').toLowerCase().includes(q)
                || (i.manufacturer ?? '').toLowerCase().includes(q);
            const matchesCategory = filterCategory === 'ALL' || i.category === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, filterCategory]);

    const sortedItems = useMemo(() => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...filteredItems].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av).localeCompare(String(bv)) * dir;
        });
    }, [filteredItems, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = sortedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Reset to page 1 on filter/search change
    useEffect(() => { setPage(1); }, [searchTerm, filterCategory]);

    /* ── drawer ── */
    const handleOpenDrawer = (item: InventoryItem | null = null) => {
        if (item) {
            setEditingItem({
                inventoryItemId: item.inventoryItemId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                genericName: item.genericName ?? undefined,
                manufacturer: item.manufacturer ?? undefined,
                saltCompositionId: item.saltCompositionId ?? undefined,
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
            setEditingItem({ itemCode: '', itemName: '', category: fixedCategory || 'CONSUMABLE', unit: 'PCS', minStockLevel: 0, reorderQty: 0, isActive: true });
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
                saltCompositionId: editingItem.saltCompositionId,
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

    /* ─────────────────── render ─────────────────── */

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">

            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 sticky top-0 z-10 shadow-sm shrink-0">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-2.5 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search item, code, generic name..."
                            className="pl-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {!fixedCategory && (
                        <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[155px] h-9 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(c => (
                                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Button variant="outline" size="sm" onClick={() => loadItems(true)} disabled={refreshing || loading} className="gap-1.5 h-9 rounded-xl active:scale-[0.98] transition-all text-sm">
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} size="sm" className="flex-1 sm:flex-none gap-1.5 h-9 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 text-sm font-bold">
                        <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>
                </div>
            </div>

            {/* ── Table Area ── */}
            <div className="flex-1 overflow-auto p-4 sm:p-5">

                {/* Loading skeletons */}
                {loading && (
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                    </div>
                )}

                {/* Error */}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadItems(true)} className="mt-2">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}

                {/* Table */}
                {!loading && !loadError && (
                    sortedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">
                                {items.length === 0 ? 'No items configured yet' : 'No items match your filters'}
                            </p>
                            <p className="text-sm mt-1 max-w-sm">
                                {items.length === 0
                                    ? 'Click "Add Item" to set up your first drug, consumable, or implant.'
                                    : 'Try a different search or category filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800">
                                        <tr>
                                            <SortTh label="Code"       col="itemCode"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                                            <SortTh label="Item Name"  col="itemName"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                            <SortTh label="Category"   col="category"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
                                            <SortTh label="Unit"       col="unit"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-20" />
                                            <SortTh label="Stock"      col="currentStock"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
                                            <SortTh label="Min Level"  col="minStockLevel" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
                                            <SortTh label="Rate (\u20b9)"  col="defaultRate"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
                                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 w-28">Flags</th>
                                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 w-32 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                                        {pageItems.map((item, idx) => {
                                            const isLow = item.currentStock <= item.minStockLevel;
                                            return (
                                                <tr
                                                    key={item.inventoryItemId}
                                                    className={cn(
                                                        'group transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40',
                                                        !item.isActive && 'opacity-50',
                                                        idx % 2 !== 0 ? 'bg-slate-50/30 dark:bg-zinc-950/20' : '',
                                                    )}
                                                >
                                                    {/* Code */}
                                                    <td className="px-3 py-2.5">
                                                        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">{item.itemCode}</span>
                                                    </td>

                                                    {/* Name */}
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Pill className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-800 dark:text-zinc-100 truncate text-sm">{item.itemName}</p>
                                                                {item.genericName && (
                                                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{item.genericName}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-3 py-2.5">
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                                                            {CATEGORY_LABELS[item.category]}
                                                        </Badge>
                                                    </td>

                                                    {/* Unit */}
                                                    <td className="px-3 py-2.5">
                                                        <span className="text-xs font-mono text-slate-600 dark:text-zinc-400">{item.unit}</span>
                                                    </td>

                                                    {/* Stock */}
                                                    <td className="px-3 py-2.5">
                                                        <span className={cn(
                                                            'text-sm font-mono font-bold',
                                                            isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-zinc-100',
                                                        )}>
                                                            {item.currentStock.toLocaleString('en-IN')}
                                                        </span>
                                                        {isLow && (
                                                            <span className="ml-1 text-[8px] font-bold text-amber-500 uppercase tracking-wider">Low</span>
                                                        )}
                                                    </td>

                                                    {/* Min Level */}
                                                    <td className="px-3 py-2.5">
                                                        <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">{item.minStockLevel.toLocaleString('en-IN')}</span>
                                                    </td>

                                                    {/* Rate */}
                                                    <td className="px-3 py-2.5">
                                                        <span className="text-xs font-mono text-slate-700 dark:text-zinc-300">
                                                            {item.defaultRate != null
                                                                ? `\u20b9${item.defaultRate.toLocaleString('en-IN')}`
                                                                : <span className="text-slate-300 dark:text-zinc-600">&mdash;</span>}
                                                        </span>
                                                    </td>

                                                    {/* Flags */}
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex flex-wrap gap-0.5">
                                                            {item.scheduleClass && (
                                                                <Badge variant="outline" className={`text-[8px] font-bold uppercase rounded-full ${SCHEDULE_COLORS[item.scheduleClass]}`}>
                                                                    {SCHEDULE_LABELS[item.scheduleClass]}
                                                                </Badge>
                                                            )}
                                                            {item.isLasa && (
                                                                <Badge variant="outline" className="text-[8px] font-bold rounded-full bg-purple-50 text-purple-700 border-purple-200">LASA</Badge>
                                                            )}
                                                            {item.isHighAlert && (
                                                                <Badge variant="outline" className="text-[8px] font-bold rounded-full bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-0.5">
                                                                    <ShieldAlert className="h-2 w-2" /> HA
                                                                </Badge>
                                                            )}
                                                            {item.storageCondition && item.storageCondition !== 'ROOM' && (
                                                                <Badge variant="outline" className="text-[8px] font-bold rounded-full bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-0.5">
                                                                    <Thermometer className="h-2 w-2" /> CC
                                                                </Badge>
                                                            )}
                                                            {!item.isActive && (
                                                                <Badge variant="secondary" className="text-[8px] rounded-full">Off</Badge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {item.isActive && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-[10px] font-bold text-emerald-700 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 hover:scale-105 transition-all gap-1 rounded-lg"
                                                                    onClick={(e) => handleAddStock(item, e)}
                                                                    title="Add stock"
                                                                >
                                                                    <PackagePlus className="h-3 w-3" /> Stock
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800 transition-all hover:scale-105"
                                                                onClick={() => handleOpenDrawer(item)}
                                                                title="Edit item"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Pagination footer ── */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-950/20">
                                <p className="text-xs text-slate-500 dark:text-zinc-500 select-none">
                                    Showing{' '}
                                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                                        {Math.min((currentPage - 1) * PAGE_SIZE + 1, sortedItems.length)}
                                    </span>
                                    {'\u2013'}
                                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                                        {Math.min(currentPage * PAGE_SIZE, sortedItems.length)}
                                    </span>
                                    {' '}of{' '}
                                    <span className="font-bold text-slate-700 dark:text-zinc-300">{sortedItems.length}</span> items
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline" size="sm"
                                        className="h-7 w-7 p-0 rounded-lg text-xs disabled:opacity-40"
                                        disabled={currentPage === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, idx) =>
                                            p === 'ellipsis' ? (
                                                <span key={`e${idx}`} className="text-xs text-slate-400 px-0.5">&hellip;</span>
                                            ) : (
                                                <Button
                                                    key={p}
                                                    variant={currentPage === p ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={cn(
                                                        'h-7 w-7 p-0 rounded-lg text-xs font-bold transition-all',
                                                        currentPage === p
                                                            ? 'bg-brand-600 hover:bg-brand-700 text-white border-brand-600 shadow-sm shadow-brand-500/20'
                                                            : 'hover:border-brand-400 hover:text-brand-600',
                                                    )}
                                                    onClick={() => setPage(p as number)}
                                                >
                                                    {p}
                                                </Button>
                                            )
                                        )
                                    }

                                    <Button
                                        variant="outline" size="sm"
                                        className="h-7 w-7 p-0 rounded-lg text-xs disabled:opacity-40"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* ── Add / Edit Drawer ── */}
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
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Salt Composition <span className="text-[9px] text-muted-foreground font-normal lowercase">(for generic substitution)</span></Label>
                                            <Select value={editingItem.saltCompositionId ?? 'NONE'} onValueChange={v => setEditingItem(p => ({ ...p!, saltCompositionId: v === 'NONE' ? undefined : v }))}>
                                                <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="None" /></SelectTrigger>
                                                <SelectContent className="max-h-64 overflow-y-auto rounded-xl">
                                                    <SelectItem value="NONE">None</SelectItem>
                                                    {saltCompositions.map(sc => (
                                                        <SelectItem key={sc.saltCompositionId} value={sc.saltCompositionId}>{sc.displayName}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Category</Label>
                                            <Select disabled={!!fixedCategory} value={editingItem.category ?? (fixedCategory || 'CONSUMABLE')} onValueChange={v => setEditingItem(p => ({ ...p!, category: v as InventoryCategory }))}>
                                                <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all disabled:opacity-70"><SelectValue /></SelectTrigger>
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
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Look-Alike Sound-Alike drug &mdash; flagged in pickers.</p>
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

            {/* Receive Stock dialog */}
            <ReceiveStockDialog
                open={receiveDialogOpen}
                onOpenChange={setReceiveDialogOpen}
                boardStores={boardStores}
                preSelectedItemId={receiveItemId}
                onSuccess={() => { loadItems(true); }}
            />
        </div>
    );
};

export default ItemMaster;
