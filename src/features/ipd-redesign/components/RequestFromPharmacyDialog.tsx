import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';
import { procurementApi } from '../services/procurementApi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** This board's own store(s) — the request always comes FROM one of these. */
    boardStores: StoreItem[];
    onSuccess: () => void;
}

// The ward/OT/ICU-side half of the Indent workflow already used hospital-wide
// (InternalRequestsPanel) — simplified to a single action: ask the hospital's Pharmacy store for
// stock. Unlike InternalRequestsPanel's "New Request" dialog, there's no target-store picker here —
// from a ward's perspective there's exactly one place to ask, so it's resolved automatically.
export const RequestFromPharmacyDialog: React.FC<Props> = ({ open, onOpenChange, boardStores, onSuccess }) => {
    const { toast } = useToast();
    const [pharmacyStoreId, setPharmacyStoreId] = useState<string | null>(null);
    const [isResolvingPharmacy, setIsResolvingPharmacy] = useState(true);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [requestingStoreId, setRequestingStoreId] = useState('');
    const [lines, setLines] = useState<{ inventoryItemId: string; itemName: string; qty: number }[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setRequestingStoreId(boardStores.length === 1 ? boardStores[0].storeId : '');
        setLines([]);
        setIsResolvingPharmacy(true);

        Promise.all([storeService.getStores(), inventoryApi.getItems({ activeOnly: true })])
            .then(([allStores, allItems]) => {
                const pharmacyStore = allStores.find(s => s.storeType === 'PHARMACY' && s.isActive);
                setPharmacyStoreId(pharmacyStore?.storeId ?? null);
                setItems(allItems);
            })
            .catch(() => toast({ title: 'Error', description: 'Could not load items.', variant: 'destructive' }))
            .finally(() => setIsResolvingPharmacy(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit = async () => {
        if (!pharmacyStoreId || !requestingStoreId || lines.length === 0) return;
        setBusy(true);
        try {
            await procurementApi.createIndent({
                requestingStoreId,
                targetStoreId: pharmacyStoreId,
                lines: lines.map(l => ({ inventoryItemId: l.inventoryItemId, qty: l.qty })),
            });
            toast({ title: 'Request sent', description: 'Pharmacy will review and dispatch it.' });
            onSuccess();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not send request', description: e.response?.data?.Message ?? e.response?.data?.message ?? e.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Request from Pharmacy</DialogTitle>
                    <DialogDescription>Ask the hospital pharmacy to dispatch stock to this store.</DialogDescription>
                </DialogHeader>

                {isResolvingPharmacy ? (
                    <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !pharmacyStoreId ? (
                    <div className="py-6 text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                        No store is configured as this hospital's Pharmacy yet. Ask an admin to set one up in Store Master before requests can be sent.
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {boardStores.length > 1 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Requesting Store</Label>
                                <Select value={requestingStoreId} onValueChange={setRequestingStoreId}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Select store..." /></SelectTrigger>
                                    <SelectContent>
                                        {boardStores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Items to Request</Label>
                            <Select
                                onValueChange={v => {
                                    const item = items.find(i => i.inventoryItemId === v);
                                    if (item && !lines.some(l => l.inventoryItemId === v)) {
                                        setLines([...lines, { inventoryItemId: item.inventoryItemId, itemName: item.itemName, qty: 1 }]);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-10"><SelectValue placeholder="Add item..." /></SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName} ({i.itemCode})</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {lines.length > 0 && (
                                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto mt-2">
                                    {lines.map((line, idx) => (
                                        <div key={line.inventoryItemId} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-800/50">
                                            <div className="flex-1 text-sm font-medium">{line.itemName}</div>
                                            <Input
                                                type="number" min={1} className="h-9 w-24"
                                                value={line.qty}
                                                onChange={e => {
                                                    const copy = [...lines];
                                                    copy[idx] = { ...copy[idx], qty: Number(e.target.value) };
                                                    setLines(copy);
                                                }}
                                            />
                                            <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    {pharmacyStoreId && (
                        <Button onClick={submit} disabled={busy || !requestingStoreId || lines.length === 0}>
                            {busy ? 'Sending...' : 'Send Request'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
