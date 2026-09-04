import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackagePlus, ChevronDown, ChevronUp, X, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardStores: StoreItem[];
    onSuccess: () => void;
    /** Pre-select a specific item when opened from Item Master */
    preSelectedItemId?: string;
}

export const ReceiveStockDialog: React.FC<Props> = ({ open, onOpenChange, boardStores, onSuccess, preSelectedItemId }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const [storeId, setStoreId] = useState('');
    const [inventoryItemId, setInventoryItemId] = useState('');
    const [qty, setQty] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [busy, setBusy] = useState(false);
    // Informational only — the backend already merges into a matching batch (same item+store+batch
    // number+expiry) rather than creating a duplicate, so this just previews that outcome.
    const [duplicateBatchNote, setDuplicateBatchNote] = useState<string | null>(null);

    const singleStore = boardStores.length === 1 ? boardStores[0] : null;

    useEffect(() => {
        if (!open) return;
        setStoreId(singleStore?.storeId ?? '');
        setInventoryItemId(preSelectedItemId ?? '');
        setQty('');
        setShowDetails(false);
        setBatchNumber('');
        setExpiryDate('');
        setUnitCost('');
        setDuplicateBatchNote(null);

        setLoadingItems(true);
        inventoryApi.getItems({ activeOnly: true })
            .then(setItems)
            .catch(() => toast({ title: 'Failed to load items', variant: 'destructive' }))
            .finally(() => setLoadingItems(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Preview the merge the backend will do (BatchCommandHandlers) — same item+store+batch
    // number+expiry tops up the existing batch instead of creating a duplicate row.
    useEffect(() => {
        if (!open || !storeId || !inventoryItemId || !batchNumber.trim()) {
            setDuplicateBatchNote(null);
            return;
        }
        const timer = setTimeout(() => {
            inventoryApi.getBatches(inventoryItemId, { storeId })
                .then(batches => {
                    const match = batches.find(b => b.batchNumber.trim().toLowerCase() === batchNumber.trim().toLowerCase());
                    if (!match) { setDuplicateBatchNote(null); return; }
                    const sameExpiry = (match.expiryDate ? match.expiryDate.slice(0, 10) : '') === expiryDate;
                    setDuplicateBatchNote(
                        sameExpiry
                            ? `Batch already exists — ${match.remainingQty} on hand${match.expiryDate ? `, expires ${new Date(match.expiryDate).toLocaleDateString('en-IN')}` : ''}. This will add to it.`
                            : `Batch "${batchNumber.trim()}" already exists with a DIFFERENT expiry (${match.expiryDate ? new Date(match.expiryDate).toLocaleDateString('en-IN') : 'none set'}) — check for a typo.`
                    );
                })
                .catch(() => setDuplicateBatchNote(null));
        }, 400);
        return () => clearTimeout(timer);
    }, [open, storeId, inventoryItemId, batchNumber, expiryDate]);

    const selectedItem = useMemo(() => items.find(i => i.inventoryItemId === inventoryItemId), [items, inventoryItemId]);

    const submit = async () => {
        const receiveQty = parseFloat(qty);
        if (!storeId || !inventoryItemId) return;
        if (isNaN(receiveQty) || receiveQty <= 0) {
            toast({ title: 'Quantity must be a positive number', variant: 'destructive' });
            return;
        }

        setBusy(true);
        try {
            await inventoryApi.quickReceive({
                storeId,
                inventoryItemId,
                qty: receiveQty,
                batchNumber: batchNumber.trim() || undefined,
                expiryDate: expiryDate || undefined,
                unitCost: unitCost ? parseFloat(unitCost) : undefined,
            });
            toast({ title: `Received ${receiveQty} ${selectedItem?.unit ?? ''} of ${selectedItem?.itemName ?? 'item'}` });
            onOpenChange(false);
            onSuccess();
        } catch (e: any) {
            toast({ title: 'Could not receive stock', description: e.response?.data?.Message ?? e.response?.data?.message ?? e.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key="rs-overlay"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                    onClick={() => onOpenChange(false)}
                />
            )}
            {open && (
                <motion.div
                    key="rs-content"
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 right-0 w-[calc(100%-2rem)] sm:w-[480px] rounded-l-[32px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[60] flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                <PackagePlus className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">Receive Stock</h2>
                                <p className="text-xs text-emerald-100 font-medium mt-0.5">Log a new consignment as it arrives</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15 active:scale-[0.98] transition-all" onClick={() => onOpenChange(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {!singleStore && (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Store</Label>
                                <Select value={storeId} onValueChange={setStoreId}>
                                    <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                        <SelectValue placeholder="Select store" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-48 overflow-y-auto rounded-xl">
                                        {boardStores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 flex items-center gap-1.5">
                                <ScanLine className="h-3 w-3" /> Scan Barcode
                            </Label>
                            <Input
                                placeholder="Click here & scan..."
                                className="h-10 rounded-xl border-dashed border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-mono text-emerald-800 dark:text-emerald-300"
                                onChange={e => {
                                    const code = e.target.value.trim();
                                    const found = items.find(i => i.itemCode.toLowerCase() === code.toLowerCase());
                                    if (found) {
                                        setInventoryItemId(found.inventoryItemId);
                                        toast({ title: 'Item Found', description: found.itemName });
                                        e.target.value = ''; // clear for next scan
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item</Label>
                            <Select value={inventoryItemId} onValueChange={setInventoryItemId} disabled={loadingItems}>
                                <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                    <SelectValue placeholder={loadingItems ? 'Loading items...' : 'Select item'} />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl">
                                    {items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName} <span className="text-[9px] text-slate-400">({i.itemCode})</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Quantity Received</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all pr-16 font-mono font-semibold"
                                    placeholder="0"
                                />
                                {selectedItem && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase">
                                        {selectedItem.unit}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowDetails(v => !v)}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                            >
                                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                Add batch/expiry details (optional)
                            </button>

                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/80">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Batch / Lot No.</Label>
                                                <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Auto-generated" className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Expiry Date</Label>
                                                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500" />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Unit Cost (₹)</Label>
                                                <Input type="number" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-mono" />
                                            </div>
                                            {duplicateBatchNote && (
                                                <div className="sm:col-span-2 text-[11px] leading-snug rounded-xl px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                                                    {duplicateBatchNote}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex justify-end gap-2 shrink-0">
                        <Button variant="ghost" className="h-10 rounded-xl active:scale-[0.98] transition-all text-slate-650" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={submit}
                            disabled={busy || !storeId || !inventoryItemId || !qty}
                            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold active:scale-[0.98] transition-all px-6"
                        >
                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                            Receive Stock
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
