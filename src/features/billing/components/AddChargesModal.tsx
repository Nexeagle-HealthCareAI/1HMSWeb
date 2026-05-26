import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, IndianRupee, Search, Loader2, X } from 'lucide-react';
import {
    ipdBillingService, type ChargeMaster, type AppliesTo,
} from '../services/ipdBillingService';

interface AddChargesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    encounterId: string;
    patientId: string;
    appliesToFilter?: AppliesTo;
    onCharged: () => void;
}

interface DraftLine {
    key: string;
    chargeId?: string;
    displayName: string;
    categoryCode: string;
    qty: number;
    rate: number;
    discountPercent: number;
}

const newLine = (): DraftLine => ({
    key: Math.random().toString(36).slice(2, 9),
    displayName: '',
    categoryCode: 'OTHER',
    qty: 1,
    rate: 0,
    discountPercent: 0,
});

const calcLineNet = (l: DraftLine) => {
    const gross = (l.qty || 0) * (l.rate || 0);
    const discount = Math.round(gross * ((l.discountPercent || 0) / 100) * 100) / 100;
    return gross - discount;
};

export const AddChargesModal: React.FC<AddChargesModalProps> = ({
    open, onOpenChange, encounterId, patientId, appliesToFilter, onCharged,
}) => {
    const { toast } = useToast();
    const [catalog, setCatalog] = useState<ChargeMaster[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState<DraftLine[]>([newLine()]);
    const [submitting, setSubmitting] = useState(false);

    // Reset on open
    useEffect(() => {
        if (open) {
            setLines([newLine()]);
            setSearch('');
        }
    }, [open]);

    // Fetch catalog when modal opens
    useEffect(() => {
        if (!open || catalog.length > 0) return;
        setLoadingCatalog(true);
        ipdBillingService.listChargeMasters({ pageSize: 500 })
            .then(res => setCatalog(res.items ?? []))
            .catch(() => setCatalog([]))
            .finally(() => setLoadingCatalog(false));
    }, [open, catalog.length]);

    const filteredCatalog = useMemo(() => {
        const q = search.trim().toLowerCase();
        return catalog.filter(c => {
            if (!c.isActive) return false;
            if (appliesToFilter && c.appliesTo !== appliesToFilter && c.appliesTo !== 'ANY') return false;
            if (q && !(c.displayName?.toLowerCase().includes(q) || c.chargeCode?.toLowerCase().includes(q) || c.categoryCode?.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [catalog, search, appliesToFilter]);

    const pickFromCatalog = (c: ChargeMaster, lineKey: string) => {
        setLines(prev => prev.map(l => l.key === lineKey ? {
            ...l,
            chargeId: c.chargeId,
            displayName: c.displayName ?? '',
            categoryCode: c.categoryCode ?? 'OTHER',
            qty: c.defaultQty || 1,
            rate: c.defaultRate || 0,
            discountPercent: 0,
        } : l));
    };

    const updateLine = (key: string, patch: Partial<DraftLine>) => {
        setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
    };

    const removeLine = (key: string) => {
        setLines(prev => prev.length === 1 ? [newLine()] : prev.filter(l => l.key !== key));
    };

    const totalGross = lines.reduce((s, l) => s + (l.qty || 0) * (l.rate || 0), 0);
    const totalDiscount = lines.reduce((s, l) => s + Math.round((l.qty || 0) * (l.rate || 0) * ((l.discountPercent || 0) / 100) * 100) / 100, 0);
    const totalNet = totalGross - totalDiscount;

    const validLines = lines.filter(l => l.displayName.trim() && l.qty > 0 && l.rate >= 0);
    const canSubmit = validLines.length > 0 && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const res = await ipdBillingService.addChargeEvents({
                encounterId,
                patientId,
                charges: validLines.map(l => ({
                    displayName: l.displayName,
                    qty: l.qty,
                    rate: l.rate,
                    discountPercent: l.discountPercent || 0,
                    categoryCode: l.categoryCode || 'OTHER',
                })),
            });
            if (!res.success) {
                throw new Error(res.message ?? 'Could not post charges');
            }
            toast({
                title: `${res.data?.chargeCount ?? validLines.length} charge(s) added`,
                description: `Net ₹${(res.data?.totalNet ?? totalNet).toLocaleString('en-IN')} posted.`,
            });
            onCharged();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: 'Could not post charges',
                description: err?.message ?? 'Try again.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
                    <DialogTitle className="text-base font-bold">Add Charges</DialogTitle>
                    <DialogDescription className="text-xs">
                        Pick from your charge master, or type a one-off line. Charges post as <span className="font-semibold text-emerald-700">POSTED</span> and roll into the next invoice.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-0 flex-1 overflow-hidden">
                    {/* Catalog picker */}
                    <div className="md:col-span-2 border-r border-slate-100 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search charge master…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loadingCatalog && (
                                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                                </div>
                            )}
                            {!loadingCatalog && filteredCatalog.length === 0 && (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    {catalog.length === 0
                                        ? 'No charge items configured. Add some in Billing → Charge Master.'
                                        : 'No matches for your search.'}
                                </div>
                            )}
                            {filteredCatalog.slice(0, 80).map(c => (
                                <button
                                    key={c.chargeId}
                                    type="button"
                                    onClick={() => pickFromCatalog(c, lines[lines.length - 1].key)}
                                    className="w-full text-left rounded-lg p-2.5 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">{c.displayName}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                                    {c.categoryCode}
                                                </Badge>
                                                {c.appliesTo && (
                                                    <span className="text-[10px] text-slate-400">· {c.appliesTo}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-emerald-700 flex items-center justify-end">
                                                <IndianRupee className="h-3 w-3" />{c.defaultRate.toLocaleString('en-IN')}
                                            </p>
                                            <p className="text-[10px] text-slate-400">qty {c.defaultQty}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Editable lines */}
                    <div className="md:col-span-3 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Charges to add</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLines(prev => [...prev, newLine()])}
                                className="h-8 text-xs gap-1"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add row
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {lines.map((l, idx) => {
                                const net = calcLineNet(l);
                                return (
                                    <div key={l.key} className={cn(
                                        'rounded-lg border p-2.5 space-y-2',
                                        l.displayName ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50/60'
                                    )}>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 mt-2 w-4">{idx + 1}</span>
                                            <Input
                                                placeholder="Item name (or pick from catalog →)"
                                                value={l.displayName}
                                                onChange={e => updateLine(l.key, { displayName: e.target.value, chargeId: undefined })}
                                                className="h-8 text-sm flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                                                onClick={() => removeLine(l.key)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 pl-6">
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Qty</Label>
                                                <Input
                                                    type="number" min={0} step="0.5"
                                                    value={l.qty || ''}
                                                    onChange={e => updateLine(l.key, { qty: Number(e.target.value) })}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Rate (₹)</Label>
                                                <Input
                                                    type="number" min={0} step="0.01"
                                                    value={l.rate || ''}
                                                    onChange={e => updateLine(l.key, { rate: Number(e.target.value) })}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Discount %</Label>
                                                <Input
                                                    type="number" min={0} max={100} step="0.5"
                                                    value={l.discountPercent || ''}
                                                    onChange={e => updateLine(l.key, { discountPercent: Math.min(100, Number(e.target.value)) })}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-slate-500">Net</Label>
                                                <div className="h-8 px-2 rounded-md border border-blue-100 bg-blue-50 flex items-center text-xs font-bold text-blue-700">
                                                    ₹{net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="border-t border-slate-100 p-3 bg-slate-50/60 space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Gross</span>
                                <span className="font-semibold">₹{totalGross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Discount</span>
                                <span className="font-semibold text-amber-700">−₹{totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                                <span className="font-bold text-slate-700">Net total</span>
                                <span className="font-extrabold text-blue-700">₹{totalNet.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-5 py-3 border-t border-slate-100 bg-white">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-blue-600 hover:bg-blue-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Posting…</> : `Post ${validLines.length} Charge${validLines.length !== 1 ? 's' : ''}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
