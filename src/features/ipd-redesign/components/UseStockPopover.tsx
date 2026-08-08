import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { inventoryApi, type StockOverviewRow } from '../services/inventoryApi';

export interface BoardPatientOption {
    encounterId: string;
    patientId: string;
    patientName?: string | null;
}

interface Props {
    item: StockOverviewRow;
    onSuccess: () => void;
    // When provided (ICU board today), lets staff optionally attribute this usage to a patient so
    // it gets billed, not just deducted from stock. Omit to keep today's plain-deduct behavior
    // (e.g. OT board, whose patient list isn't wired up here yet).
    patients?: BoardPatientOption[];
}

export const UseStockPopover: React.FC<Props> = ({ item, onSuccess, patients }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [qty, setQty] = useState('1');
    const [encounterId, setEncounterId] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const useQty = parseFloat(qty);
        if (isNaN(useQty) || useQty <= 0) {
            toast({ title: 'Quantity must be a positive number', variant: 'destructive' });
            return;
        }
        if (useQty > item.qtyOnHand) {
            toast({ title: `Only ${item.qtyOnHand} ${item.unit} available`, variant: 'destructive' });
            return;
        }
        const patient = patients?.find(p => p.encounterId === encounterId);
        setBusy(true);
        try {
            if (patient) {
                const result = await inventoryApi.useAndBillStock({
                    storeId: item.storeId,
                    inventoryItemId: item.inventoryItemId,
                    qty: useQty,
                    encounterId: patient.encounterId,
                    patientId: patient.patientId,
                });
                toast({
                    title: `Used ${useQty} ${item.unit} of ${item.itemName}`,
                    description: result.noChargeConfigured ? 'No charge is configured for this item, so nothing was billed.' : `Billed to ${patient.patientName ?? 'patient'}.`,
                });
            } else {
                await inventoryApi.recordMovement({
                    movementType: 'ISSUE',
                    storeId: item.storeId,
                    inventoryItemId: item.inventoryItemId,
                    qty: useQty,
                });
                toast({ title: `Used ${useQty} ${item.unit} of ${item.itemName}` });
            }
            setOpen(false);
            setQty('1');
            setEncounterId('');
            onSuccess();
        } catch (e: any) {
            toast({ title: 'Could not record usage', description: e.response?.data?.Message ?? e.response?.data?.message ?? e.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-slate-205 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 active:scale-[0.98] transition-all shrink-0"
                >
                    <MinusCircle className="h-3.5 w-3.5 mr-1" /> Use
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-4 space-y-3">
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{item.itemName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mt-0.5">
                        {item.qtyOnHand.toLocaleString()} {item.unit} available at {item.storeName}
                    </p>
                </div>
                {patients && patients.length > 0 && (
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Bill to patient</Label>
                        <Select value={encounterId} onValueChange={setEncounterId}>
                            <SelectTrigger className="w-full h-9 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                                <SelectValue placeholder="General use — no billing" />
                            </SelectTrigger>
                            <SelectContent className="max-h-48 overflow-y-auto rounded-xl">
                                {patients.map(p => (
                                    <SelectItem key={p.encounterId} value={p.encounterId}>{p.patientName ?? 'Unknown patient'}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Quantity used</Label>
                    <Input
                        type="number"
                        min="1"
                        max={item.qtyOnHand}
                        autoFocus
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500"
                    />
                </div>
                <Button
                    onClick={submit}
                    disabled={busy}
                    className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-[0.98] transition-all"
                >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Use'}
                </Button>
            </PopoverContent>
        </Popover>
    );
};
