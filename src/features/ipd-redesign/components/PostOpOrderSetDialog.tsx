import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ClipboardList, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { orderSetApi, type OrderSetItem } from '@/features/hospital/services/orderSetApi';
import { clinicalOrderApi, type ClinicalOrderType, type ClinicalOrderLineInput } from '../services/clinicalOrderApi';

type EditableLine = ClinicalOrderLineInput & { orderType: ClinicalOrderType };

const ORDER_TYPE_LABELS: Record<string, string> = {
    MEDICATION: 'Medication orders', LAB: 'Lab orders', RADIOLOGY: 'Radiology orders',
    PROCEDURE: 'Procedure orders', DIET: 'Diet orders', NURSING: 'Nursing instructions',
};

interface Props {
    admissionId: string;
    surgeryCaseId: string;
    onPlaced?: () => void;
}

/** "Write Post-Op Orders": pick a hospital-defined Order Set, review/edit every line grouped by
 *  order type, then place them — reusing the same clinicalOrderApi.placeOrder call a manual
 *  CPOE "New order" makes, once per order type present in the set. */
export const PostOpOrderSetDialog: React.FC<Props> = ({ admissionId, surgeryCaseId, onPlaced }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore((state) => state.hospitalId) || '';

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [orderSets, setOrderSets] = useState<OrderSetItem[]>([]);
    const [selectedSetId, setSelectedSetId] = useState('');
    const [lines, setLines] = useState<EditableLine[]>([]);
    const [placing, setPlacing] = useState(false);

    useEffect(() => {
        if (!open || !hospitalId) return;
        setLoading(true);
        orderSetApi.list({ hospitalId, category: 'POST_OP' })
            .then(res => setOrderSets(res.orderSets ?? []))
            .catch(() => setOrderSets([]))
            .finally(() => setLoading(false));
    }, [open, hospitalId]);

    const selectedSet = orderSets.find(s => s.orderSetId === selectedSetId) || null;

    const pickSet = (id: string) => {
        setSelectedSetId(id);
        const set = orderSets.find(s => s.orderSetId === id);
        setLines((set?.lines ?? []).map(l => ({
            orderType: l.orderType as ClinicalOrderType,
            itemName: l.itemName,
            saltName: l.saltName ?? undefined,
            dose: l.dose ?? undefined,
            route: l.route ?? undefined,
            frequency: l.frequency ?? undefined,
            durationDays: l.durationDays ?? undefined,
            instructions: l.instructions ?? undefined,
            isHighAlert: l.isHighAlert,
            qty: l.qty,
        })));
    };

    const grouped = useMemo(() => {
        const groups = new Map<ClinicalOrderType, EditableLine[]>();
        lines.forEach((l, idx) => {
            const arr = groups.get(l.orderType) ?? [];
            arr.push({ ...l, __idx: idx } as any);
            groups.set(l.orderType, arr);
        });
        return Array.from(groups.entries());
    }, [lines]);

    const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));
    const patchLine = (idx: number, patch: Partial<EditableLine>) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));

    const canPlace = lines.some(l => l.itemName.trim().length > 0);

    const handlePlace = async () => {
        if (!canPlace || placing) return;
        setPlacing(true);
        const byType = new Map<ClinicalOrderType, ClinicalOrderLineInput[]>();
        lines.filter(l => l.itemName.trim()).forEach(l => {
            const { orderType, ...rest } = l;
            const arr = byType.get(orderType) ?? [];
            arr.push(rest);
            byType.set(orderType, arr);
        });

        const placedCounts: string[] = [];
        const failedTypes: string[] = [];
        for (const [orderType, groupLines] of byType.entries()) {
            try {
                await clinicalOrderApi.placeOrder(
                    admissionId, orderType, groupLines,
                    `Applied order set: ${selectedSet?.name ?? ''}`,
                    undefined, hospitalId, surgeryCaseId, selectedSet?.orderSetId, selectedSet?.name,
                );
                placedCounts.push(`${groupLines.length} ${orderType.toLowerCase()}`);
            } catch {
                failedTypes.push(orderType.toLowerCase());
            }
        }
        setPlacing(false);

        if (placedCounts.length > 0) {
            toast({ title: `Placed ${placedCounts.join(', ')} order${placedCounts.length > 1 ? 's' : ''}` + (failedTypes.length ? '' : '.') });
        }
        if (failedTypes.length > 0) {
            toast({ title: `Could not place: ${failedTypes.join(', ')}`, description: 'Try again for the failed group.', variant: 'destructive' });
        }
        if (failedTypes.length === 0) {
            setOpen(false);
            setSelectedSetId('');
            setLines([]);
            onPlaced?.();
        }
    };

    return (
        <>
            <Button size="sm" variant="outline" className="h-10 sm:h-8 text-xs border-brand-200 text-brand-700 hover:bg-brand-50 flex-1 sm:flex-none" onClick={() => setOpen(true)}>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Write Post-Op Orders
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">Write Post-Op Orders</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">Pick a saved order set, review or edit each line, then place them.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading order sets…</div>
                        ) : orderSets.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400">
                                No post-op order sets configured yet — add one from OT Board → Order Sets.
                            </div>
                        ) : (
                            <>
                                <div>
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Order set</Label>
                                    <Select value={selectedSetId} onValueChange={pickSet}>
                                        <SelectTrigger className="h-10 mt-1 w-full rounded-xl"><SelectValue placeholder="Select an order set" /></SelectTrigger>
                                        <SelectContent>
                                            {orderSets.map(s => <SelectItem key={s.orderSetId} value={s.orderSetId}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {grouped.map(([orderType, groupLines]) => (
                                    <div key={orderType} className="space-y-3">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{ORDER_TYPE_LABELS[orderType] ?? orderType}</Badge>
                                        {groupLines.map((line: any) => {
                                            const idx = line.__idx as number;
                                            return (
                                                <div key={idx} className="rounded-2xl border border-slate-200/65 dark:border-zinc-800/80 p-4 space-y-3 relative bg-slate-50/10 dark:bg-zinc-900/10">
                                                    <button type="button" onClick={() => removeLine(idx)} className="absolute top-3 right-3 p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-full hover:bg-rose-100 transition-all">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <div>
                                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Item name *</Label>
                                                        <Input value={line.itemName} onChange={e => patchLine(idx, { itemName: e.target.value })} className="h-10 mt-1 rounded-xl" />
                                                    </div>
                                                    {orderType === 'MEDICATION' && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Dose</Label>
                                                                <Input value={line.dose ?? ''} onChange={e => patchLine(idx, { dose: e.target.value })} className="h-10 mt-1 rounded-xl" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Route</Label>
                                                                <Input value={line.route ?? ''} onChange={e => patchLine(idx, { route: e.target.value })} className="h-10 mt-1 rounded-xl" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Frequency</Label>
                                                                <Input value={line.frequency ?? ''} onChange={e => patchLine(idx, { frequency: e.target.value })} className="h-10 mt-1 rounded-xl" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Duration (days)</Label>
                                                                <Input type="number" min={0} value={line.durationDays ?? ''} onChange={e => patchLine(idx, { durationDays: e.target.value ? parseInt(e.target.value, 10) : undefined })} className="h-10 mt-1 rounded-xl" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Instructions</Label>
                                                        <Input value={line.instructions ?? ''} onChange={e => patchLine(idx, { instructions: e.target.value })} className="h-10 mt-1 rounded-xl" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                            <Button variant="outline" className="h-11 rounded-xl font-bold" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button disabled={!canPlace || placing} onClick={handlePlace} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white">
                                {placing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Place Orders
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PostOpOrderSetDialog;
