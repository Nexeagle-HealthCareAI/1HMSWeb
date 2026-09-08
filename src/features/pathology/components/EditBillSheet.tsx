import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ipdBillingService, type BillingChargeRow } from '@/features/billing/services/ipdBillingService';
import { EditChargeDialog } from '@/features/billing/components/dialogs/EditChargeDialog';

interface EditBillSheetProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    encounterId: string;
    patientId: string;
    // Fires after any successful edit/remove -- lets the parent table's row (net/discount/
    // balance) refresh, since this sheet only touches its own local charge list.
    onChanged: () => void;
}

// Lists a bill's individual charge lines with per-line Edit/Remove -- the Pathology billing
// table's rows are one-per-encounter rollups, not one-per-charge, so "Edit Bill" needs its own
// drill-in view. Edit reuses EditChargeDialog as-is (already built for BillingPage.tsx's OPD/IPD
// ledger); Remove mirrors that same screen's per-line void confirm (optional reason, takes effect
// immediately) rather than the whole-invoice cancel's required-reason gate.
export const EditBillSheet: React.FC<EditBillSheetProps> = ({ open, onOpenChange, encounterId, patientId, onChanged }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [charges, setCharges] = useState<BillingChargeRow[]>([]);
    const [editTarget, setEditTarget] = useState<{ chargeEventId: string; displayName?: string; qty: number; rate: number; discountAmount: number } | null>(null);
    const [removeTarget, setRemoveTarget] = useState<{ chargeEventId: string; label: string } | null>(null);
    const [removeReason, setRemoveReason] = useState('');
    const [removeBusy, setRemoveBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await ipdBillingService.getEncounterEvents(encounterId, patientId);
            setCharges(res?.success ? (res.data?.charges ?? []) : []);
        } catch {
            setCharges([]);
        } finally {
            setLoading(false);
        }
    }, [encounterId, patientId]);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    const handleRemove = async () => {
        if (!removeTarget || removeBusy) return;
        setRemoveBusy(true);
        try {
            const res = await ipdBillingService.deleteEvent(removeTarget.chargeEventId, 'Charges', patientId, removeReason.trim() || undefined);
            if (res?.success === false) throw new Error(res?.message ?? 'Could not remove charge');
            toast({ title: 'Charge removed' });
            setRemoveTarget(null);
            setRemoveReason('');
            await load();
            onChanged();
        } catch (e: any) {
            toast({ title: 'Could not remove charge', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setRemoveBusy(false);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-lg p-0 gap-0 flex flex-col bg-white dark:bg-slate-950">
                    <div className="px-6 py-5 bg-gradient-to-r from-brand-600 to-brand-700">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                <Pencil className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-white text-lg font-bold">Edit Bill</SheetTitle>
                                <p className="text-brand-50/90 text-xs mt-0.5">Correct or remove a charge line</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                            </div>
                        ) : charges.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
                                <Receipt className="h-8 w-8 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-500">No charges on this bill yet</p>
                            </div>
                        ) : (
                            charges.map((c) => {
                                const isVoid = c.statusCode === 'VOID';
                                return (
                                    <div
                                        key={c.chargeEventId}
                                        className={cn('rounded-xl border p-3', isVoid ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200')}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className={cn('font-semibold text-sm', isVoid ? 'text-slate-400 line-through' : 'text-slate-800')}>
                                                        {c.displayName ?? c.categoryCode ?? 'Charge'}
                                                    </p>
                                                    {isVoid && <Badge variant="outline" className="text-[9px] bg-white text-slate-500 border-slate-200">VOID</Badge>}
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    {c.qty} × ₹{Number(c.rate).toFixed(2)}
                                                    {Number(c.discountAmount) > 0 && <span className="text-rose-600"> · − ₹{Number(c.discountAmount).toFixed(2)}</span>}
                                                </p>
                                            </div>
                                            <p className={cn('font-bold tabular-nums shrink-0 text-sm', isVoid ? 'text-slate-400 line-through' : 'text-slate-800')}>
                                                ₹{Number(c.netAmount).toFixed(2)}
                                            </p>
                                        </div>
                                        {!isVoid && (
                                            <div className="flex justify-end gap-1.5 mt-2">
                                                <Button
                                                    size="sm" variant="outline" className="h-8 text-xs"
                                                    onClick={() => setEditTarget({ chargeEventId: c.chargeEventId, displayName: c.displayName ?? undefined, qty: Number(c.qty), rate: Number(c.rate), discountAmount: Number(c.discountAmount) || 0 })}
                                                >
                                                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                                </Button>
                                                <Button
                                                    size="sm" variant="outline" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                                    onClick={() => setRemoveTarget({ chargeEventId: c.chargeEventId, label: c.displayName ?? 'Charge' })}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </SheetContent>
            </Sheet>

            <EditChargeDialog
                open={!!editTarget}
                onOpenChange={(v) => { if (!v) setEditTarget(null); }}
                charge={editTarget}
                onSaved={async () => { await load(); onChanged(); }}
            />

            <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) { setRemoveTarget(null); setRemoveReason(''); } }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-rose-500 to-rose-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Trash2 className="h-5 w-5 text-white" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold">Remove this charge?</AlertDialogTitle>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        <AlertDialogDescription className="text-sm text-slate-600">
                            Remove <span className="font-semibold text-slate-800">{removeTarget?.label}</span> from this bill. This takes effect immediately.
                        </AlertDialogDescription>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                            <Textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} rows={2} placeholder="Why is this being removed?" className="text-sm" />
                        </div>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={removeBusy} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRemove(); }} disabled={removeBusy} className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20">
                            {removeBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing…</> : <><Trash2 className="h-4 w-4 mr-1.5" />Remove</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default EditBillSheet;
