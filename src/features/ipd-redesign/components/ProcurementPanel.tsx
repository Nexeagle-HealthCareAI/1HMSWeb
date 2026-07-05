import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Check, ClipboardList, ShoppingCart, PackageCheck, Trash2 } from 'lucide-react';
import {
    procurementApi, type IndentItem, type PurchaseOrderItem, type GoodsReceiptNoteItem, type PurchaseOrderLineItem,
} from '../services/procurementApi';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { vendorService, type VendorItem } from '@/features/hospital/services/vendorService';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';

const INDENT_TONE: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    SUBMITTED: 'bg-sky-50 text-sky-700 border-sky-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    CONVERTED_TO_PO: 'bg-violet-50 text-violet-700 border-violet-200',
    CANCELLED: 'bg-slate-100 text-slate-500',
};
const PO_TONE: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SENT: 'bg-sky-50 text-sky-700 border-sky-200',
    PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
    RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};
const MATCH_TONE: Record<string, string> = {
    MATCHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MISMATCH: 'bg-rose-50 text-rose-700 border-rose-200',
    PENDING: 'bg-slate-100 text-slate-500',
};

type SubTab = 'indents' | 'pos' | 'grn';
type IndentLineRow = { inventoryItemId: string; qty: string };
type PoLineRow = { inventoryItemId: string; qty: string; rate: string };

export const ProcurementPanel: React.FC = () => {
    const { toast } = useToast();
    const [subTab, setSubTab] = useState<SubTab>('indents');

    const [stores, setStores] = useState<StoreItem[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [vendors, setVendors] = useState<VendorItem[]>([]);

    const [indents, setIndents] = useState<IndentItem[]>([]);
    const [pos, setPos] = useState<PurchaseOrderItem[]>([]);
    const [grns, setGrns] = useState<GoodsReceiptNoteItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAll = () => {
        setLoading(true);
        Promise.all([
            storeService.getStores(),
            inventoryApi.getItems({ activeOnly: true }),
            vendorService.getVendors(),
            procurementApi.getIndents(),
            procurementApi.getPurchaseOrders(),
            procurementApi.getGoodsReceiptNotes(),
        ]).then(([s, i, v, ind, po, grn]) => {
            setStores(s); setItems(i); setVendors(v); setIndents(ind); setPos(po); setGrns(grn);
        }).catch(() => toast({ title: 'Could not load procurement data', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const itemsById = useMemo(() => new Map(items.map(i => [i.inventoryItemId, i])), [items]);

    // --- New Indent dialog ---
    const [showNewIndent, setShowNewIndent] = useState(false);
    const [indentStoreId, setIndentStoreId] = useState('');
    const [indentLines, setIndentLines] = useState<IndentLineRow[]>([{ inventoryItemId: '', qty: '1' }]);
    const [indentBusy, setIndentBusy] = useState(false);

    const submitIndent = async () => {
        const lines = indentLines.filter(l => l.inventoryItemId && Number(l.qty) > 0);
        if (!indentStoreId || lines.length === 0) {
            toast({ title: 'Requesting store and at least one line are required', variant: 'destructive' });
            return;
        }
        setIndentBusy(true);
        try {
            await procurementApi.createIndent({
                requestingStoreId: indentStoreId,
                lines: lines.map(l => ({ inventoryItemId: l.inventoryItemId, qty: Number(l.qty) })),
            });
            toast({ title: 'Indent created' });
            setShowNewIndent(false);
            setIndentStoreId(''); setIndentLines([{ inventoryItemId: '', qty: '1' }]);
            loadAll();
        } catch (err) {
            toast({ title: 'Could not create indent', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setIndentBusy(false);
        }
    };

    const decideIndent = async (indentId: string, approve: boolean) => {
        try {
            await procurementApi.decideIndent(indentId, approve, approve ? undefined : 'Rejected from procurement board');
            toast({ title: approve ? 'Indent approved' : 'Indent rejected' });
            loadAll();
        } catch (err) {
            toast({ title: 'Could not decide indent', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        }
    };

    // --- Convert Indent to PO dialog ---
    const [convertTarget, setConvertTarget] = useState<IndentItem | null>(null);
    const [convertVendorId, setConvertVendorId] = useState('');
    const [convertRates, setConvertRates] = useState<Record<string, string>>({});
    const [convertLines, setConvertLines] = useState<{ indentLineId: string; itemName: string; qty: number; unit: string }[]>([]);
    const [convertBusy, setConvertBusy] = useState(false);

    const openConvert = async (indent: IndentItem) => {
        setConvertTarget(indent);
        setConvertVendorId('');
        try {
            const detail = await procurementApi.getIndentDetail(indent.indentId);
            setConvertLines(detail.lines.map(l => ({ indentLineId: l.indentLineId, itemName: l.itemName, qty: l.qty, unit: l.unit })));
            setConvertRates({});
        } catch {
            setConvertLines([]);
        }
    };

    const submitConvert = async () => {
        if (!convertTarget || !convertVendorId) {
            toast({ title: 'Vendor is required', variant: 'destructive' });
            return;
        }
        setConvertBusy(true);
        try {
            await procurementApi.convertIndentToPo(convertTarget.indentId, {
                vendorId: convertVendorId,
                lines: convertLines.map(l => ({ indentLineId: l.indentLineId, rate: Number(convertRates[l.indentLineId] ?? 0) })),
            });
            toast({ title: 'Purchase order created' });
            setConvertTarget(null);
            loadAll();
        } catch (err) {
            toast({ title: 'Could not convert to PO', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setConvertBusy(false);
        }
    };

    // --- New PO dialog ---
    const [showNewPo, setShowNewPo] = useState(false);
    const [poVendorId, setPoVendorId] = useState('');
    const [poLines, setPoLines] = useState<PoLineRow[]>([{ inventoryItemId: '', qty: '1', rate: '0' }]);
    const [poBusy, setPoBusy] = useState(false);

    const submitPo = async () => {
        const lines = poLines.filter(l => l.inventoryItemId && Number(l.qty) > 0);
        if (!poVendorId || lines.length === 0) {
            toast({ title: 'Vendor and at least one line are required', variant: 'destructive' });
            return;
        }
        setPoBusy(true);
        try {
            await procurementApi.createPurchaseOrder({
                vendorId: poVendorId,
                lines: lines.map(l => ({ inventoryItemId: l.inventoryItemId, qty: Number(l.qty), rate: Number(l.rate) })),
            });
            toast({ title: 'Purchase order created' });
            setShowNewPo(false);
            setPoVendorId(''); setPoLines([{ inventoryItemId: '', qty: '1', rate: '0' }]);
            loadAll();
        } catch (err) {
            toast({ title: 'Could not create purchase order', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setPoBusy(false);
        }
    };

    const poAction = async (fn: () => Promise<unknown>, successMsg: string) => {
        try {
            await fn();
            toast({ title: successMsg });
            loadAll();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        }
    };

    // --- Receive (GRN) dialog ---
    const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderItem | null>(null);
    const [receiveStoreId, setReceiveStoreId] = useState('');
    const [receiveLines, setReceiveLines] = useState<(PurchaseOrderLineItem & { batchNumber: string; expiryDate: string; receiveQty: string })[]>([]);
    const [receiveBusy, setReceiveBusy] = useState(false);

    const openReceive = async (po: PurchaseOrderItem) => {
        setReceiveTarget(po);
        setReceiveStoreId('');
        try {
            const detail = await procurementApi.getPurchaseOrderDetail(po.purchaseOrderId);
            setReceiveLines(detail.lines
                .filter(l => l.receivedQty < l.qty)
                .map(l => ({ ...l, batchNumber: '', expiryDate: '', receiveQty: String(l.qty - l.receivedQty) })));
        } catch {
            setReceiveLines([]);
        }
    };

    const submitReceive = async () => {
        if (!receiveTarget || !receiveStoreId) {
            toast({ title: 'Receiving store is required', variant: 'destructive' });
            return;
        }
        const lines = receiveLines.filter(l => Number(l.receiveQty) > 0 && l.batchNumber.trim());
        if (lines.length === 0) {
            toast({ title: 'Every line needs a batch number and quantity', variant: 'destructive' });
            return;
        }
        setReceiveBusy(true);
        try {
            await procurementApi.createGoodsReceiptNote({
                purchaseOrderId: receiveTarget.purchaseOrderId,
                receivedStoreId: receiveStoreId,
                lines: lines.map(l => ({
                    purchaseOrderLineId: l.purchaseOrderLineId,
                    inventoryItemId: l.inventoryItemId,
                    batchNumber: l.batchNumber.trim(),
                    expiryDate: l.expiryDate || undefined,
                    qty: Number(l.receiveQty),
                    rate: l.rate,
                })),
            });
            toast({ title: 'Goods receipt recorded' });
            setReceiveTarget(null);
            loadAll();
        } catch (err) {
            toast({ title: 'Could not record receipt', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReceiveBusy(false);
        }
    };

    const updateLineRow = <T extends { inventoryItemId: string }>(rows: T[], setRows: (r: T[]) => void, idx: number, patch: Partial<T>) => {
        setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
    };

    return (
        <div className="space-y-4">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button onClick={() => setSubTab('indents')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', subTab === 'indents' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <ClipboardList className="h-3.5 w-3.5" /> Indents
                </button>
                <button onClick={() => setSubTab('pos')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', subTab === 'pos' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <ShoppingCart className="h-3.5 w-3.5" /> Purchase Orders
                </button>
                <button onClick={() => setSubTab('grn')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', subTab === 'grn' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <PackageCheck className="h-3.5 w-3.5" /> Goods Receipts
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <>
                    {subTab === 'indents' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Indents</h2>
                                <Button size="sm" className="h-8 bg-brand-600 hover:bg-brand-700" onClick={() => setShowNewIndent(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> New Indent
                                </Button>
                            </div>
                            {indents.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No indents yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {indents.map(ind => (
                                        <div key={ind.indentId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{ind.indentNumber}</span>
                                                <span className="text-xs text-slate-500">{ind.requestingStoreName} · {ind.lineCount} line(s)</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', INDENT_TONE[ind.status])}>{ind.status.replace(/_/g, ' ')}</Badge>
                                                {ind.isSystemGenerated && <Badge variant="outline" className="text-[9px]">Auto</Badge>}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {ind.status === 'SUBMITTED' && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => decideIndent(ind.indentId, true)}>Approve</Button>
                                                        <Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-600" onClick={() => decideIndent(ind.indentId, false)}>Reject</Button>
                                                    </>
                                                )}
                                                {ind.status === 'APPROVED' && (
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openConvert(ind)}>Convert to PO</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {subTab === 'pos' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Purchase Orders</h2>
                                <Button size="sm" className="h-8 bg-brand-600 hover:bg-brand-700" onClick={() => setShowNewPo(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> New PO
                                </Button>
                            </div>
                            {pos.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No purchase orders yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {pos.map(po => (
                                        <div key={po.purchaseOrderId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{po.poNumber}</span>
                                                <span className="text-xs text-slate-500">{po.vendorName} · {po.lineCount} line(s)</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', PO_TONE[po.status])}>{po.status.replace(/_/g, ' ')}</Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {po.status === 'DRAFT' && (
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => poAction(() => procurementApi.approvePurchaseOrder(po.purchaseOrderId), 'PO approved')}>Approve</Button>
                                                )}
                                                {po.status === 'APPROVED' && (
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => poAction(() => procurementApi.markPurchaseOrderSent(po.purchaseOrderId), 'PO marked sent')}>Mark Sent</Button>
                                                )}
                                                {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openReceive(po)}>Receive</Button>
                                                )}
                                                {['DRAFT', 'APPROVED', 'SENT'].includes(po.status) && (
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-600" onClick={() => poAction(() => procurementApi.cancelPurchaseOrder(po.purchaseOrderId, 'Cancelled from procurement board'), 'PO cancelled')}>Cancel</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {subTab === 'grn' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Goods Receipts</h2>
                            {grns.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No goods receipts yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {grns.map(g => (
                                        <div key={g.grnId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{g.grnNumber}</span>
                                                <span className="text-xs text-slate-500">{g.poNumber} · {g.vendorName} · {g.receivedStoreName}</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', MATCH_TONE[g.matchStatus])}>{g.matchStatus}</Badge>
                                            </div>
                                            <span className="text-[11px] text-slate-500">{new Date(g.receivedAt).toLocaleDateString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* NEW INDENT DIALOG */}
            <Dialog open={showNewIndent} onOpenChange={setShowNewIndent}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Indent</DialogTitle>
                        <DialogDescription>Request stock for a store.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Requesting Store</Label>
                            <Select value={indentStoreId} onValueChange={setIndentStoreId}>
                                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                                <SelectContent>{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Lines</Label>
                            {indentLines.map((line, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Select value={line.inventoryItemId} onValueChange={v => updateLineRow(indentLines, setIndentLines, idx, { inventoryItemId: v })}>
                                        <SelectTrigger className="flex-1"><SelectValue placeholder="Item" /></SelectTrigger>
                                        <SelectContent>{items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Input type="number" min={1} className="w-24" value={line.qty} onChange={e => updateLineRow(indentLines, setIndentLines, idx, { qty: e.target.value })} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setIndentLines(indentLines.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" className="h-8" onClick={() => setIndentLines([...indentLines, { inventoryItemId: '', qty: '1' }])}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                            </Button>
                        </div>
                        <div className="flex justify-end">
                            <Button disabled={indentBusy} onClick={submitIndent} className="bg-brand-600 hover:bg-brand-700">
                                {indentBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Submit Indent
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CONVERT TO PO DIALOG */}
            <Dialog open={!!convertTarget} onOpenChange={(o) => { if (!o) setConvertTarget(null); }}>
                <DialogContent className="max-w-lg">
                    {convertTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Convert {convertTarget.indentNumber} to PO</DialogTitle>
                                <DialogDescription>Pick a vendor and set the rate for each line.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Vendor</Label>
                                    <Select value={convertVendorId} onValueChange={setConvertVendorId}>
                                        <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                                        <SelectContent>{vendors.map(v => <SelectItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    {convertLines.map(l => (
                                        <div key={l.indentLineId} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="flex-1">{l.itemName} <span className="text-slate-400">({l.qty} {l.unit})</span></span>
                                            <Input type="number" min={0} className="w-28" placeholder="Rate" value={convertRates[l.indentLineId] ?? ''} onChange={e => setConvertRates(p => ({ ...p, [l.indentLineId]: e.target.value }))} />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button disabled={convertBusy} onClick={submitConvert} className="bg-brand-600 hover:bg-brand-700">
                                        {convertBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Create PO
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* NEW PO DIALOG */}
            <Dialog open={showNewPo} onOpenChange={setShowNewPo}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Purchase Order</DialogTitle>
                        <DialogDescription>Order stock directly from a vendor.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Vendor</Label>
                            <Select value={poVendorId} onValueChange={setPoVendorId}>
                                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                                <SelectContent>{vendors.map(v => <SelectItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Lines</Label>
                            {poLines.map((line, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Select value={line.inventoryItemId} onValueChange={v => updateLineRow(poLines, setPoLines, idx, { inventoryItemId: v })}>
                                        <SelectTrigger className="flex-1"><SelectValue placeholder="Item" /></SelectTrigger>
                                        <SelectContent>{items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Input type="number" min={1} className="w-20" placeholder="Qty" value={line.qty} onChange={e => updateLineRow(poLines, setPoLines, idx, { qty: e.target.value })} />
                                    <Input type="number" min={0} className="w-24" placeholder="Rate" value={line.rate} onChange={e => updateLineRow(poLines, setPoLines, idx, { rate: e.target.value })} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setPoLines(poLines.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" className="h-8" onClick={() => setPoLines([...poLines, { inventoryItemId: '', qty: '1', rate: '0' }])}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                            </Button>
                        </div>
                        <div className="flex justify-end">
                            <Button disabled={poBusy} onClick={submitPo} className="bg-brand-600 hover:bg-brand-700">
                                {poBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Create PO
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RECEIVE (GRN) DIALOG */}
            <Dialog open={!!receiveTarget} onOpenChange={(o) => { if (!o) setReceiveTarget(null); }}>
                <DialogContent className="max-w-2xl">
                    {receiveTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Receive {receiveTarget.poNumber}</DialogTitle>
                                <DialogDescription>Record batch/expiry for each item received.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Receiving Store</Label>
                                    <Select value={receiveStoreId} onValueChange={setReceiveStoreId}>
                                        <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                                        <SelectContent>{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {receiveLines.map((line, idx) => (
                                        <div key={line.purchaseOrderLineId} className="grid grid-cols-5 gap-2 items-center text-xs border-b border-slate-100 pb-2">
                                            <span className="col-span-1 font-medium truncate">{itemsById.get(line.inventoryItemId)?.itemName ?? 'Item'}</span>
                                            <Input placeholder="Batch #" className="col-span-1 h-8 text-xs" value={line.batchNumber} onChange={e => setReceiveLines(receiveLines.map((l, i) => i === idx ? { ...l, batchNumber: e.target.value } : l))} />
                                            <Input type="date" className="col-span-1 h-8 text-xs" value={line.expiryDate} onChange={e => setReceiveLines(receiveLines.map((l, i) => i === idx ? { ...l, expiryDate: e.target.value } : l))} />
                                            <Input type="number" min={0} max={line.qty - line.receivedQty} className="col-span-1 h-8 text-xs" value={line.receiveQty} onChange={e => setReceiveLines(receiveLines.map((l, i) => i === idx ? { ...l, receiveQty: e.target.value } : l))} />
                                            <span className="col-span-1 text-slate-400">of {line.qty - line.receivedQty} pending</span>
                                        </div>
                                    ))}
                                    {receiveLines.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Nothing pending on this PO.</p>}
                                </div>
                                <div className="flex justify-end">
                                    <Button disabled={receiveBusy || receiveLines.length === 0} onClick={submitReceive} className="bg-brand-600 hover:bg-brand-700">
                                        {receiveBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Record Receipt
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProcurementPanel;
