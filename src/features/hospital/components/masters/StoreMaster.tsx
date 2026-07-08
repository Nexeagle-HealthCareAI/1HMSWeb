import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, Warehouse, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { storeService, type StoreItem, type StoreType, type UpsertStoreInput } from '@/features/hospital/services/storeService';

const STORE_TYPE_LABELS: Record<StoreType, string> = {
    MAIN: 'Main Store',
    SUB: 'Sub Store',
    DEPARTMENT: 'Department',
    OT: 'Operation Theatre',
    PHARMACY: 'Pharmacy',
    COLD_CHAIN: 'Cold Chain',
    NARCOTIC: 'Narcotic Safe',
    BLOOD_BANK: 'Blood Bank',
    CSSD: 'CSSD',
};

const ASSIGNED_BOARD_LABELS: Record<string, string> = {
    OT: 'OT Board',
    ICU: 'ICU Board',
    WARD: 'Ward Board',
};

const STORE_TYPE_COLORS: Record<StoreType, string> = {
    MAIN: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    SUB: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    DEPARTMENT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    OT: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    PHARMACY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    COLD_CHAIN: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    NARCOTIC: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    BLOOD_BANK: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-800',
    CSSD: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

type EditingStore = Partial<UpsertStoreInput> & { storeId?: string };

type StoreErrors = { storeCode?: string; storeName?: string };
const validateStore = (rec: EditingStore | null): StoreErrors => {
    const e: StoreErrors = {};
    if (!rec) return e;
    if (!String(rec.storeCode ?? '').trim()) e.storeCode = 'Store code is required';
    if (!String(rec.storeName ?? '').trim()) e.storeName = 'Store name is required';
    return e;
};

export const StoreMaster: React.FC = () => {
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<EditingStore | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const loadStores = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await storeService.getStores(undefined, true);
            setStores(res);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load stores');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadStores(); }, [loadStores]);

    const filteredStores = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return stores;
        return stores.filter(s =>
            s.storeName.toLowerCase().includes(q) ||
            s.storeCode.toLowerCase().includes(q) ||
            (s.parentStoreName ?? '').toLowerCase().includes(q));
    }, [stores, searchTerm]);

    const handleOpenDrawer = (store: StoreItem | null = null) => {
        if (store) {
            setEditingStore({
                storeId: store.storeId,
                storeCode: store.storeCode,
                storeName: store.storeName,
                storeType: store.storeType,
                assignedBoard: store.assignedBoard ?? undefined,
                parentStoreId: store.parentStoreId ?? undefined,
                minTempCelsius: store.minTempCelsius ?? undefined,
                maxTempCelsius: store.maxTempCelsius ?? undefined,
                isActive: store.isActive,
            });
        } else {
            setEditingStore({ storeCode: '', storeName: '', storeType: 'SUB', isActive: true });
        }
        setIsDrawerOpen(true);
    };

    const formErrors = validateStore(editingStore);
    const isValid = Object.keys(formErrors).length === 0;

    const handleSave = async () => {
        const errs = validateStore(editingStore);
        const firstErr = errs.storeCode || errs.storeName;
        if (firstErr || !editingStore) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const res: any = await storeService.upsertStore({
                storeId: editingStore.storeId,
                storeCode: editingStore.storeCode!.trim(),
                storeName: editingStore.storeName!.trim(),
                storeType: (editingStore.storeType ?? 'SUB') as StoreType,
                assignedBoard: editingStore.assignedBoard || null,
                parentStoreId: editingStore.parentStoreId || null,
                minTempCelsius: editingStore.minTempCelsius ?? null,
                maxTempCelsius: editingStore.maxTempCelsius ?? null,
                isActive: editingStore.isActive ?? true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not save store');
            toast({ title: editingStore.storeId ? 'Store updated' : 'Store created', description: editingStore.storeName });
            setIsDrawerOpen(false);
            await loadStores(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Candidate parents: everything except the store currently being edited (a store can't be its own parent).
    const parentCandidates = stores.filter(s => s.storeId !== editingStore?.storeId);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search store name, code..."
                        className="pl-9 bg-gray-50 dark:bg-slate-950"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadStores(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Store
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadStores(true)} className="mt-2">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredStores.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredStores.map(s => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={s.storeId}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${!s.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold font-mono text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <Warehouse className="h-4 w-4 text-gray-400" />
                                                    {s.storeName}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                    {s.storeCode} {s.parentStoreName ? `• under ${s.parentStoreName}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex gap-1.5 ml-2">
                                                {s.assignedBoard && (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider shrink-0 bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                                        {ASSIGNED_BOARD_LABELS[s.assignedBoard] || s.assignedBoard}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${STORE_TYPE_COLORS[s.storeType]}`}>
                                                    {STORE_TYPE_LABELS[s.storeType]}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="mt-auto flex items-end justify-between">
                                            {(s.minTempCelsius != null || s.maxTempCelsius != null) ? (
                                                <div className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400">
                                                    <Thermometer className="h-3.5 w-3.5" />
                                                    {s.minTempCelsius ?? '—'}° – {s.maxTempCelsius ?? '—'}°C
                                                </div>
                                            ) : <span />}
                                            {!s.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-gray-100 dark:border-gray-800" onClick={() => handleOpenDrawer(s)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{stores.length === 0 ? 'No stores configured yet' : 'No stores match your search'}</p>
                            <p className="text-sm mt-1 max-w-sm">{stores.length === 0 ? 'A Main Store is created automatically — click "Add Store" to add wards, OT, pharmacy, or other sub-stores.' : 'Try a different search.'}</p>
                        </div>
                    )
                )}
            </div>

            <AnimatePresence>
                {isDrawerOpen && editingStore && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <Warehouse className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">
                                        {editingStore.storeId ? 'Edit Store' : 'Add Store'}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Store Code <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. WARD-3B"
                                            className={formErrors.storeCode ? 'border-red-500' : ''}
                                            value={editingStore.storeCode ?? ''}
                                            onChange={e => setEditingStore(p => ({ ...p!, storeCode: e.target.value }))}
                                        />
                                        {formErrors.storeCode && <p className="text-[10px] text-red-500">{formErrors.storeCode}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Store Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Ward 3B Sub-Store"
                                            className={formErrors.storeName ? 'border-red-500' : ''}
                                            value={editingStore.storeName ?? ''}
                                            onChange={e => setEditingStore(p => ({ ...p!, storeName: e.target.value }))}
                                        />
                                        {formErrors.storeName && <p className="text-[10px] text-red-500">{formErrors.storeName}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Store Type</Label>
                                        <Select value={editingStore.storeType ?? 'SUB'} onValueChange={v => setEditingStore(p => ({ ...p!, storeType: v as StoreType }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(STORE_TYPE_LABELS) as StoreType[]).map(t => (
                                                    <SelectItem key={t} value={t}>{STORE_TYPE_LABELS[t]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Parent Store <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Select value={editingStore.parentStoreId ?? 'NONE'} onValueChange={v => setEditingStore(p => ({ ...p!, parentStoreId: v === 'NONE' ? undefined : v }))}>
                                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">None</SelectItem>
                                                {parentCandidates.map(s => (
                                                    <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Assigned Board <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Select value={editingStore.assignedBoard ?? 'NONE'} onValueChange={v => setEditingStore(p => ({ ...p!, assignedBoard: v === 'NONE' ? undefined : v }))}>
                                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">None</SelectItem>
                                                {Object.entries(ASSIGNED_BOARD_LABELS).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Min Temp (°C) <span className="text-xs text-muted-foreground font-normal">(Cold chain)</span></Label>
                                        <Input
                                            type="number"
                                            value={editingStore.minTempCelsius ?? ''}
                                            onChange={e => setEditingStore(p => ({ ...p!, minTempCelsius: e.target.value ? Number(e.target.value) : null }))}
                                        />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Max Temp (°C) <span className="text-xs text-muted-foreground font-normal">(Cold chain)</span></Label>
                                        <Input
                                            type="number"
                                            value={editingStore.maxTempCelsius ?? ''}
                                            onChange={e => setEditingStore(p => ({ ...p!, maxTempCelsius: e.target.value ? Number(e.target.value) : null }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-slate-900/40">
                                    <div>
                                        <Label htmlFor="storeActive" className="cursor-pointer font-semibold">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive stores are hidden from stock-movement pickers.</p>
                                    </div>
                                    <Switch id="storeActive" checked={editingStore.isActive} onCheckedChange={v => setEditingStore(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingStore.storeId ? 'Save' : 'Create Store')}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoreMaster;
