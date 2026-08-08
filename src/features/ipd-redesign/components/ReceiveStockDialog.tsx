import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackagePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardStores: StoreItem[];
    onSuccess: () => void;
}

export const ReceiveStockDialog: React.FC<Props> = ({ open, onOpenChange, boardStores, onSuccess }) => {
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

    const singleStore = boardStores.length === 1 ? boardStores[0] : null;

    useEffect(() => {
        if (!open) return;
        setStoreId(singleStore?.storeId ?? '');
        setInventoryItemId('');
        setQty('');
        setShowDetails(false);
        setBatchNumber('');
        setExpiryDate('');
        setUnitCost('');

        setLoadingItems(true);
        inventoryApi.getItems({ activeOnly: true })
            .then(setItems)
            .catch(() => toast({ title: 'Failed to load items', variant: 'destructive' }))
            .finally(() => setLoadingItems(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                        <PackagePlus className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Receive Stock
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Log a new consignment as it arrives.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!singleStore && (
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Store</Label>
                            <Select value={storeId} onValueChange={setStoreId}>
                                <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                    <SelectValue placeholder="Select store" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl">
                                    {boardStores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item</Label>
                        <Select value={inventoryItemId} onValueChange={setInventoryItemId} disabled={loadingItems}>
                            <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                <SelectValue placeholder={loadingItems ? 'Loading items...' : 'Select item'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-48 overflow-y-auto rounded-xl">
                                {items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>)}
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
                                className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 pr-16 font-mono font-semibold"
                                placeholder="0"
                            />
                            {selectedItem && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase">
                                    {selectedItem.unit}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDetails(v => !v)}
                        className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400"
                    >
                        {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Add batch/expiry details (optional)
                    </button>

                    {showDetails && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/80">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Batch / Lot No.</Label>
                                <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Auto-generated if blank" className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Expiry Date</Label>
                                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm" />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Unit Cost</Label>
                                <Input type="number" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-850">
                        <Button
                            onClick={submit}
                            disabled={busy || !storeId || !inventoryItemId || !qty}
                            className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-[0.98] transition-all px-6"
                        >
                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                            Receive Stock
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
