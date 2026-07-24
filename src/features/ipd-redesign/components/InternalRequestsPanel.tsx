import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, ArrowRight, PackageCheck } from 'lucide-react';
import { procurementApi, type IndentItem, type IndentDetail } from '../services/procurementApi';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type InventoryItem, type BatchItem } from '../services/inventoryApi';
import { cn } from '@/lib/utils';

const INDENT_TONE: Record<string, string> = {
    DRAFT: 'bg-slate-105 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    SUBMITTED: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30',
    PARTIALLY_ISSUED: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
    ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30',
};

export const InternalRequestsPanel: React.FC = () => {
    const { toast } = useToast();
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [myStoreId, setMyStoreId] = useState('');
    const [indents, setIndents] = useState<IndentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my-requests');

    // New Request State
    const [createOpen, setCreateOpen] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [targetStoreId, setTargetStoreId] = useState('');
    const [newLines, setNewLines] = useState<{ inventoryItemId: string; itemName: string; qty: number }[]>([]);
    const [createBusy, setCreateBusy] = useState(false);

    // Issue State
    const [issueTarget, setIssueTarget] = useState<IndentItem | null>(null);
    const [issueDetail, setIssueDetail] = useState<IndentDetail | null>(null);
    const [issueLines, setIssueLines] = useState<{ indentLineId: string; batchId: string; qty: number }[]>([]);
    const [availableBatches, setAvailableBatches] = useState<Record<string, BatchItem[]>>({});
    const [issueBusy, setIssueBusy] = useState(false);

    useEffect(() => {
        Promise.all([
            storeService.getStores(),
            inventoryApi.getItems()
        ]).then(([sRes, iRes]) => {
            setStores(sRes);
            setItems(iRes);
            if (sRes.length > 0) setMyStoreId(sRes[0].storeId);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!myStoreId) return;
        setLoading(true);
        procurementApi.getIndents().then(res => {
            setIndents(res);
        }).catch(err => {
            toast({ title: 'Error', description: 'Failed to load requests.', variant: 'destructive' });
        }).finally(() => setLoading(false));
    }, [myStoreId, toast]);

    const myRequests = useMemo(() => indents.filter(i => i.requestingStoreId === myStoreId && i.targetStoreId != null), [indents, myStoreId]);
    const toFulfill = useMemo(() => indents.filter(i => i.targetStoreId === myStoreId), [indents, myStoreId]);

    const handleCreate = async () => {
        if (!targetStoreId || newLines.length === 0) {
            toast({ title: 'Validation', description: 'Please select a target store and add items.', variant: 'destructive' });
            return;
        }
        setCreateBusy(true);
        try {
            await procurementApi.createIndent({
                requestingStoreId: myStoreId,
                targetStoreId: targetStoreId,
                lines: newLines.map(l => ({ inventoryItemId: l.inventoryItemId, qty: l.qty }))
            });
            toast({ title: 'Success', description: 'Internal request created.' });
            setCreateOpen(false);
            setNewLines([]);
            setTargetStoreId('');
            
            const fresh = await procurementApi.getIndents();
            setIndents(fresh);
        } catch (e: any) {
            toast({ title: 'Error', description: e.response?.data?.Message || e.message, variant: 'destructive' });
        } finally {
            setCreateBusy(false);
        }
    };

    const openIssue = async (indent: IndentItem) => {
        setIssueTarget(indent);
        setIssueDetail(null);
        setIssueLines([]);
        setAvailableBatches({});
        try {
            const detail = await procurementApi.getIndentDetail(indent.indentId);
            setIssueDetail(detail);
            
            // Load batches for each item in my store
            const batchesMap: Record<string, BatchItem[]> = {};
            for (const line of detail.lines) {
                const b = await inventoryApi.getBatches(line.inventoryItemId, { storeId: myStoreId });
                batchesMap[line.inventoryItemId] = b;
            }
            setAvailableBatches(batchesMap);
            
            // Filter out lines that are already fully issued
            const remainingLines = detail.lines.filter(l => l.qty > l.issuedQty);
            setIssueLines(remainingLines.map(l => ({ indentLineId: l.indentLineId, batchId: '', qty: l.qty - l.issuedQty })));
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load details.', variant: 'destructive' });
            setIssueTarget(null);
        }
    };

    const handleIssue = async () => {
        if (!issueTarget) return;
        if (issueLines.some(l => !l.batchId || l.qty <= 0)) {
            toast({ title: 'Validation', description: 'Please select a batch and valid quantity for all lines.', variant: 'destructive' });
            return;
        }
        setIssueBusy(true);
        try {
            await procurementApi.issueIndent(issueTarget.indentId, issueLines);
            toast({ title: 'Success', description: 'Stock issued successfully.' });
            setIssueTarget(null);
            const fresh = await procurementApi.getIndents();
            setIndents(fresh);
        } catch (e: any) {
            toast({ title: 'Error', description: e.response?.data?.message || e.message, variant: 'destructive' });
        } finally {
            setIssueBusy(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">Internal Requests</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550 shrink-0">My Store (View As):</Label>
                    <Select value={myStoreId} onValueChange={setMyStoreId}>
                        <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
                            {stores.map(s => (
                                <SelectItem key={s.storeId} value={s.storeId} className="rounded-lg focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">{s.storeName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <TabsList className="bg-black/10 dark:bg-black/25 backdrop-blur-sm rounded-full p-1 h-auto flex max-w-sm w-full">
                        <TabsTrigger value="my-requests" className="flex-1 rounded-full text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm">My Requests ({myRequests.length})</TabsTrigger>
                        <TabsTrigger value="to-fulfill" className="flex-1 rounded-full text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm">To Fulfill ({toFulfill.length})</TabsTrigger>
                    </TabsList>
                    {activeTab === 'my-requests' && (
                        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-4">
                            <Plus className="h-4 w-4 mr-2" /> New Request
                        </Button>
                    )}
                </div>

                <TabsContent value="my-requests" className="mt-4 space-y-4">
                    {myRequests.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 dark:text-zinc-500 bg-slate-55 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-850">No requests found.</div>
                    ) : (
                        <div className="grid gap-3">
                            {myRequests.map(req => (
                                <div key={req.indentId} className="flex items-center justify-between p-4 border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{req.indentNumber}</span>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border-none rounded-full px-2.5 py-0.5", INDENT_TONE[req.status] || INDENT_TONE.DRAFT)}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-zinc-450 mt-1">
                                            Requested from: <span className="font-semibold text-slate-700 dark:text-zinc-355">{req.targetStoreName || 'Unknown'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 dark:text-zinc-550 mt-1 font-medium">
                                            {req.lineCount} items &middot; {new Date(req.requestedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="to-fulfill" className="mt-4 space-y-4">
                    {toFulfill.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 dark:text-zinc-500 bg-slate-55 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-850">No requests to fulfill.</div>
                    ) : (
                        <div className="grid gap-3">
                            {toFulfill.map(req => (
                                <div key={req.indentId} className="flex items-center justify-between p-4 border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{req.indentNumber}</span>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border-none rounded-full px-2.5 py-0.5", INDENT_TONE[req.status] || INDENT_TONE.DRAFT)}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-zinc-450 mt-1">
                                            Requested by: <span className="font-semibold text-slate-700 dark:text-zinc-355">{req.requestingStoreName || 'Unknown'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 dark:text-zinc-550 mt-1 font-medium">
                                            {req.lineCount} items &middot; {new Date(req.requestedAt).toLocaleString()}
                                        </div>
                                    </div>
                                    {(req.status === 'SUBMITTED' || req.status === 'PARTIALLY_ISSUED') && (
                                        <Button size="sm" onClick={() => openIssue(req)} className="h-9 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-3.5">
                                            <PackageCheck className="h-4 w-4 mr-2" /> Fulfill
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50">New Internal Request</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">Request stock from another store/department.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Request From (Target Store)</Label>
                            <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                                <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150">
                                    <SelectValue placeholder="Select store..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                    {stores.filter(s => s.storeId !== myStoreId).map(s => (
                                        <SelectItem key={s.storeId} value={s.storeId} className="rounded-lg cursor-pointer">{s.storeName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Items to Request</Label>
                            <div className="flex gap-2 mb-2">
                                <Select
                                    onValueChange={v => {
                                        const item = items.find(i => i.inventoryItemId === v);
                                        if (item && !newLines.some(l => l.inventoryItemId === v)) {
                                            setNewLines([...newLines, { inventoryItemId: item.inventoryItemId, itemName: item.itemName, qty: 1 }]);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150">
                                        <SelectValue placeholder="Add item..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-48 overflow-y-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                        {items.map(i => (
                                            <SelectItem key={i.inventoryItemId} value={i.inventoryItemId} className="rounded-lg cursor-pointer">{i.itemName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {newLines.length > 0 && (
                                <div className="border border-slate-100 dark:border-zinc-800/80 rounded-2xl divide-y divide-slate-100 dark:divide-zinc-800/80 max-h-[300px] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {newLines.map((line, idx) => (
                                        <div key={line.inventoryItemId} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                            <div className="flex-1 text-sm font-semibold text-slate-800 dark:text-zinc-200">{line.itemName}</div>
                                            <div className="w-24 shrink-0">
                                                <Input 
                                                    type="number" 
                                                    min="1"
                                                    value={line.qty} 
                                                    onChange={e => {
                                                        const copy = [...newLines];
                                                        copy[idx].qty = Number(e.target.value);
                                                        setNewLines(copy);
                                                    }}
                                                    className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono dark:text-zinc-150"
                                                />
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-xl active:scale-[0.98] transition-all px-3" onClick={() => setNewLines(newLines.filter((_, i) => i !== idx))}>
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <Button variant="ghost" className="h-10 rounded-xl active:scale-[0.98] transition-all text-slate-655 dark:text-zinc-350 hover:bg-slate-50 dark:hover:bg-zinc-850" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createBusy} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 shadow-md shadow-brand-500/10">
                            {createBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Submit Request
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Issue Dialog */}
            <Dialog open={!!issueTarget} onOpenChange={o => !o && setIssueTarget(null)}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50">Fulfill Request</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Request #{issueTarget?.indentNumber} from {issueTarget?.requestingStoreName}
                        </DialogDescription>
                    </DialogHeader>
                    {!issueDetail ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl divide-y divide-slate-100 dark:divide-zinc-800 max-h-[350px] overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {issueDetail.lines.filter(l => l.qty > l.issuedQty).map((line) => {
                                    const batches = availableBatches[line.inventoryItemId] || [];
                                    const lineIndex = issueLines.findIndex(il => il.indentLineId === line.indentLineId);
                                    const currentLine = issueLines[lineIndex];
                                    if (!currentLine) return null;
                                    
                                    const remainingQty = line.qty - line.issuedQty;

                                    return (
                                        <div key={line.indentLineId} className="p-4 space-y-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                <div className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{line.itemName}</div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-405 dark:text-zinc-550">
                                                        Requested: {line.qty} | Issued: {line.issuedQty}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-bold text-brand-700 dark:text-brand-400 bg-brand-50/50 dark:bg-zinc-950/20 border-brand-200 dark:border-brand-900 rounded-full px-2.5 py-0.5">
                                                        Remaining: {remainingQty} {line.unit}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                <div className="flex-1">
                                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550 block mb-1.5">Issue From Batch</Label>
                                                    <Select
                                                        value={currentLine.batchId || ''}
                                                        onValueChange={v => {
                                                            const copy = [...issueLines];
                                                            copy[lineIndex] = { ...copy[lineIndex], batchId: v };
                                                            setIssueLines(copy);
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all text-xs dark:text-zinc-150">
                                                            <SelectValue placeholder="Select batch..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-48 overflow-y-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                                            {batches.map(b => (
                                                                <SelectItem key={b.batchId} value={b.batchId} className="rounded-lg cursor-pointer text-xs">
                                                                    {b.batchNumber} (Stock: {b.remainingQty}) - Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-full sm:w-28 shrink-0">
                                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550 block mb-1.5">Issue Qty</Label>
                                                    <Input 
                                                        className="h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono dark:text-zinc-150"
                                                        type="number"
                                                        min="1"
                                                        max={remainingQty}
                                                        value={currentLine.qty || ''}
                                                        onChange={e => {
                                                            const copy = [...issueLines];
                                                            copy[lineIndex] = { ...copy[lineIndex], qty: Number(e.target.value) };
                                                            setIssueLines(copy);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" className="h-10 rounded-xl active:scale-[0.98] transition-all text-slate-655 dark:text-zinc-350 hover:bg-slate-50 dark:hover:bg-zinc-850" onClick={() => setIssueTarget(null)}>Cancel</Button>
                                <Button onClick={handleIssue} disabled={issueBusy} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 shadow-md shadow-brand-500/10">
                                    {issueBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Issue Stock
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
