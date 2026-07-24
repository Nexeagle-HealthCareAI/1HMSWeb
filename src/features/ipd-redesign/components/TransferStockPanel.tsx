import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeftRight, AlertCircle, Package2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type StockOverviewRow, type BatchItem } from '../services/inventoryApi';
import { Textarea } from '@/components/ui/textarea';

interface Props {
    stockByStore: StockOverviewRow[];
    onSuccess: () => void;
}

export const TransferStockPanel: React.FC<Props> = ({ stockByStore, onSuccess }) => {
    const { toast } = useToast();
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [fromStoreId, setFromStoreId] = useState('');
    const [toStoreId, setToStoreId] = useState('');
    const [inventoryItemId, setInventoryItemId] = useState('');
    const [batchId, setBatchId] = useState('');
    const [qty, setQty] = useState('');
    const [notes, setNotes] = useState('');
    
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [transferring, setTransferring] = useState(false);

    useEffect(() => {
        storeService.getStores().then(setStores).finally(() => setLoading(false));
    }, []);

    // Filter available items based on selected Source Store
    const availableItems = useMemo(() => {
        if (!fromStoreId) return [];
        return stockByStore.filter(s => s.storeId === fromStoreId);
    }, [fromStoreId, stockByStore]);

    // When an item is selected, load its batches in the source store
    useEffect(() => {
        setBatchId('');
        if (!inventoryItemId || !fromStoreId) {
            setBatches([]);
            return;
        }
        setLoadingBatches(true);
        inventoryApi.getBatches(inventoryItemId, { storeId: fromStoreId, activeOnly: true })
            .then(b => {
                // Only allow transferring batches that have > 0 qty
                setBatches(b.filter(x => x.remainingQty > 0));
                // Auto-select if there's only 1 batch
                if (b.filter(x => x.remainingQty > 0).length === 1) {
                    setBatchId(b.filter(x => x.remainingQty > 0)[0].batchId);
                }
            })
            .catch(() => toast({ title: 'Failed to load batches', variant: 'destructive' }))
            .finally(() => setLoadingBatches(false));
    }, [inventoryItemId, fromStoreId, toast]);

    const selectedItemDetail = availableItems.find(i => i.inventoryItemId === inventoryItemId);
    const selectedBatchDetail = batches.find(b => b.batchId === batchId);

    const maxTransferQty = selectedBatchDetail ? selectedBatchDetail.remainingQty : (selectedItemDetail?.qtyOnHand ?? 0);

    const handleTransfer = async () => {
        if (!fromStoreId || !toStoreId || !inventoryItemId || !qty) return;
        const transferQty = parseInt(qty, 10);
        if (isNaN(transferQty) || transferQty <= 0) {
            toast({ title: 'Quantity must be a positive number', variant: 'destructive' });
            return;
        }
        if (transferQty > maxTransferQty) {
            toast({ title: `Cannot transfer more than ${maxTransferQty}`, variant: 'destructive' });
            return;
        }
        if (fromStoreId === toStoreId) {
            toast({ title: 'Source and destination store must be different', variant: 'destructive' });
            return;
        }

        setTransferring(true);
        try {
            await inventoryApi.transferStock({
                fromStoreId,
                toStoreId,
                inventoryItemId,
                batchId: batchId || undefined,
                qty: transferQty,
                notes: notes.trim()
            });
            toast({ title: 'Stock Transferred Successfully' });
            setFromStoreId('');
            setToStoreId('');
            setInventoryItemId('');
            setBatchId('');
            setQty('');
            setNotes('');
            onSuccess(); // Refresh the board
        } catch (e: any) {
            toast({ title: 'Transfer failed', description: e.message, variant: 'destructive' });
        } finally {
            setTransferring(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></div>;
    }

    return (
        <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden flex flex-col md:flex-row mx-auto w-full max-w-4xl">
            {/* Left side: Form */}
            <div className="flex-1 p-6 space-y-6 bg-slate-50/50 dark:bg-zinc-950/10">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
                    <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Inter-Store Transfer</h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-450 mt-0.5">Move stock between internal locations.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-1.5 block">From Store</Label>
                        <Select value={fromStoreId} onValueChange={(val) => { setFromStoreId(val); setInventoryItemId(''); }}>
                            <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                <SelectValue placeholder="Select source store" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {stores.filter(s => s.isActive).map(s => (
                                    <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-1.5 block">To Store</Label>
                        <Select value={toStoreId} onValueChange={setToStoreId}>
                            <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                <SelectValue placeholder="Select destination store" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {stores.filter(s => s.isActive && s.storeId !== fromStoreId).map(s => (
                                    <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item to Transfer</Label>
                    <Select value={inventoryItemId} onValueChange={setInventoryItemId} disabled={!fromStoreId || availableItems.length === 0}>
                        <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                            <SelectValue placeholder={!fromStoreId ? "Select source store first" : availableItems.length === 0 ? "Store has no stock" : "Select item"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {availableItems.map(i => (
                                <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>
                                    {i.itemName} <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px] ml-1">({i.qtyOnHand} {i.unit} available)</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {inventoryItemId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Batch (Optional)</Label>
                            <Select value={batchId} onValueChange={setBatchId} disabled={loadingBatches || batches.length === 0}>
                                <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                    <SelectValue placeholder={loadingBatches ? "Loading..." : batches.length === 0 ? "No active batches" : "Select batch"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {batches.map(b => (
                                        <SelectItem key={b.batchId} value={b.batchId}>
                                            {b.batchNumber} <span className="text-slate-400 dark:text-zinc-500 text-[10px] ml-1">({b.remainingQty} left)</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Transfer Quantity</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    min="1" 
                                    max={maxTransferQty}
                                    value={qty} 
                                    onChange={e => setQty(e.target.value)} 
                                    className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all pr-16 font-mono font-semibold text-slate-900 dark:text-zinc-100" 
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase">
                                    {selectedItemDetail?.unit || 'UNITS'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Notes (Optional)</Label>
                    <Textarea 
                        placeholder="Reason for transfer..." 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        className="h-20 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all p-3 resize-none w-full text-sm text-slate-800 dark:text-zinc-200" 
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <Button 
                        onClick={handleTransfer} 
                        disabled={transferring || !fromStoreId || !toStoreId || !inventoryItemId || !qty}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 rounded-xl active:scale-[0.98] transition-all w-full sm:w-auto px-6 shadow-md shadow-brand-500/10"
                    >
                        {transferring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />}
                        Execute Transfer
                    </Button>
                </div>
            </div>

            {/* Right side: Instructions/Rules */}
            <div className="w-full md:w-64 bg-slate-50 dark:bg-zinc-900/40 p-6 md:border-l border-t md:border-t-0 border-slate-200/60 dark:border-zinc-800 text-sm text-slate-650 dark:text-zinc-400 space-y-4 shrink-0">
                <h3 className="font-bold text-slate-850 dark:text-zinc-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Package2 className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> Transfer Rules
                </h3>
                <ul className="space-y-3 list-disc pl-4 text-xs text-slate-500 dark:text-zinc-450">
                    <li>Transfers are <b>atomic</b>. The system will immediately issue stock from the source store and receive it in the destination store.</li>
                    <li>If a batch is selected, the stock will be moved under the <b>exact same batch number</b> and expiry date.</li>
                    <li>Ensure physical movement of goods occurs simultaneously with this digital transfer.</li>
                </ul>
                <div className="mt-6 p-3 bg-brand-50/50 dark:bg-zinc-950/20 border border-brand-100/50 dark:border-zinc-800/80 rounded-xl text-brand-850 dark:text-brand-350 text-xs flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Both stores' ledgers are updated instantly, maintaining a clean audit trail.</p>
                </div>
            </div>
        </div>
    );
};
