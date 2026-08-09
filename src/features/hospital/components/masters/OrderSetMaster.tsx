import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { orderSetApi, type OrderSetItem, type OrderSetLine } from '@/features/hospital/services/orderSetApi';

const ORDER_TYPES = ['MEDICATION', 'LAB', 'RADIOLOGY', 'PROCEDURE', 'DIET', 'NURSING'] as const;

const ORDER_TYPE_COLORS: Record<string, string> = {
    MEDICATION: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    LAB: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    RADIOLOGY: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    PROCEDURE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    DIET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    NURSING: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-800',
};

const emptyLine = (): OrderSetLine => ({ itemName: '', orderType: 'MEDICATION', dose: '', route: '', frequency: '', durationDays: undefined, instructions: '', isHighAlert: false, qty: 1 });

export const OrderSetMaster: React.FC = () => {
    const hospitalId = useAuthStore((state) => state.hospitalId) || '';

    const [orderSets, setOrderSets] = useState<OrderSetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [lines, setLines] = useState<OrderSetLine[]>([emptyLine()]);
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadAll = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await orderSetApi.list({ hospitalId, category: 'POST_OP', includeInactive: true });
            setOrderSets(res.orderSets ?? []);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load order sets');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hospitalId]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const filteredOrderSets = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return orderSets;
        return orderSets.filter(s => s.name.toLowerCase().includes(q));
    }, [orderSets, searchTerm]);

    const handleOpenDrawer = (set: OrderSetItem | null = null) => {
        if (set) {
            setEditingId(set.orderSetId);
            setName(set.name);
            setLines(set.lines.length > 0 ? set.lines.map(l => ({ ...l })) : [emptyLine()]);
            setIsActive(set.isActive);
        } else {
            setEditingId(null);
            setName('');
            setLines([emptyLine()]);
            setIsActive(true);
        }
        setIsDrawerOpen(true);
    };

    const addLine = () => setLines(ls => [...ls, emptyLine()]);
    const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
    const setLine = (i: number, patch: Partial<OrderSetLine>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

    const isValid = Boolean(name.trim()) && lines.some(l => l.itemName.trim());

    const handleSave = async () => {
        if (!isValid) {
            toast({ title: 'Validation Error', description: 'A name and at least one line with an item name are required.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const cleanLines = lines
                .filter(l => l.itemName.trim())
                .map(l => ({ ...l, itemName: l.itemName.trim(), orderType: l.orderType }));
            await orderSetApi.upsert({
                orderSetId: editingId ?? undefined,
                hospitalId,
                name: name.trim(),
                category: 'POST_OP',
                lines: cleanLines,
                isActive,
            });
            toast({ title: editingId ? 'Order set updated' : 'Order set created' });
            setIsDrawerOpen(false);
            await loadAll(true);
        } catch (e: any) {
            toast({ title: 'Could not save order set', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950/20 font-sans relative overflow-hidden rounded-2xl">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search order sets..."
                        className="pl-9 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadAll(true)} disabled={refreshing || loading} className="h-10 rounded-xl gap-1.5 border-slate-200 text-slate-700 font-bold px-4">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer()} className="h-10 rounded-xl flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Order Set
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/10">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadAll(true)} className="mt-2 rounded-xl">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredOrderSets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredOrderSets.map(set => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={set.orderSetId}
                                    className={`relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md ${!set.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <ClipboardList className="h-4 w-4 text-brand-500/70" /> {set.name}
                                            </h3>
                                            {!set.isActive && <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">Inactive</Badge>}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {Array.from(new Set(set.lines.map(l => l.orderType))).map(t => (
                                                <Badge key={t} variant="outline" className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${ORDER_TYPE_COLORS[t] ?? ''}`}>{t}</Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-450 dark:text-zinc-400 mt-2">{set.lines.length} line{set.lines.length === 1 ? '' : 's'}</p>
                                    </div>
                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-md border border-slate-100 dark:border-zinc-800" onClick={() => handleOpenDrawer(set)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500 dark:text-zinc-450">
                            <Archive className="h-12 w-12 text-slate-350 dark:text-zinc-700 mb-4" />
                            <p className="font-semibold text-lg text-slate-700 dark:text-zinc-305">{orderSets.length === 0 ? 'No order sets configured yet' : 'No order sets match your search'}</p>
                            <p className="text-sm mt-1 max-w-sm">{orderSets.length === 0 ? 'Click "Add Order Set" to define a reusable post-op protocol (e.g. standard analgesia, antibiotics, follow-up labs).' : 'Try a different search.'}</p>
                        </div>
                    )
                )}
            </div>

            {/* ADD/EDIT ORDER SET DRAWER */}
            {createPortal(
                <AnimatePresence>
                    {isDrawerOpen && (
                        <motion.div
                            key="drawer-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    )}
                    {isDrawerOpen && (
                        <motion.div
                            key="drawer-content"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[calc(100%-2rem)] sm:w-[560px] rounded-l-[32px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[60] flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <ClipboardList className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">{editingId ? 'Edit Order Set' : 'Add Order Set'}</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Name <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g. Standard Post-Op Protocol" className="h-10 rounded-xl" value={name} onChange={e => setName(e.target.value)} />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Lines</Label>
                                    {lines.map((line, i) => (
                                        <div key={i} className="rounded-2xl border border-slate-200/65 dark:border-zinc-800/80 p-3.5 space-y-3 relative bg-slate-50/40 dark:bg-zinc-950/20">
                                            {lines.length > 1 && (
                                                <button type="button" onClick={() => removeLine(i)} className="absolute top-2.5 right-2.5 p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-455 rounded-full hover:bg-rose-100 transition-all">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Order type</Label>
                                                    <Select value={line.orderType} onValueChange={v => setLine(i, { orderType: v })}>
                                                        <SelectTrigger className="h-9 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item name *</Label>
                                                    <Input className="h-9 mt-1 rounded-xl" value={line.itemName} onChange={e => setLine(i, { itemName: e.target.value })} placeholder="e.g. Paracetamol" />
                                                </div>
                                            </div>

                                            {line.orderType === 'MEDICATION' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Dose</Label>
                                                        <Input className="h-9 mt-1 rounded-xl" value={line.dose ?? ''} onChange={e => setLine(i, { dose: e.target.value })} placeholder="500mg" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Route</Label>
                                                        <Input className="h-9 mt-1 rounded-xl" value={line.route ?? ''} onChange={e => setLine(i, { route: e.target.value })} placeholder="PO / IV" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Frequency</Label>
                                                        <Input className="h-9 mt-1 rounded-xl" value={line.frequency ?? ''} onChange={e => setLine(i, { frequency: e.target.value })} placeholder="TDS" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Duration (days)</Label>
                                                        <Input type="number" min={0} className="h-9 mt-1 rounded-xl" value={line.durationDays ?? ''} onChange={e => setLine(i, { durationDays: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                                                    </div>
                                                    <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-zinc-400">
                                                        <input type="checkbox" checked={!!line.isHighAlert} onChange={e => setLine(i, { isHighAlert: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                                                        High-alert (requires witness at administration)
                                                    </label>
                                                </div>
                                            )}

                                            <div>
                                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Instructions</Label>
                                                <Input className="h-9 mt-1 rounded-xl" value={line.instructions ?? ''} onChange={e => setLine(i, { instructions: e.target.value })} placeholder="Optional" />
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addLine} className="h-9 rounded-xl border-dashed w-full">
                                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add line
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                    <div>
                                        <Label htmlFor="orderSetActive" className="cursor-pointer font-semibold text-slate-800 dark:text-zinc-200">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive order sets are hidden from the post-op picker.</p>
                                    </div>
                                    <Switch id="orderSetActive" checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-55 dark:bg-zinc-900/60 flex justify-end gap-2 shrink-0">
                                <Button variant="ghost" className="h-10 rounded-xl text-slate-650" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold px-5">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingId ? 'Save' : 'Create Order Set')}
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

export default OrderSetMaster;
