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
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    SUBMITTED: 'bg-sky-50 text-sky-700 border-sky-200',
    ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
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
            
            setIssueLines(detail.lines.map(l => ({ indentLineId: l.indentLineId, batchId: '', qty: l.qty })));
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
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Internal Requests</h3>
                <div className="flex items-center gap-3">
                    <Label>My Store (View As):</Label>
                    <Select value={myStoreId} onValueChange={setMyStoreId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map(s => (
                                <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between border-b pb-2">
                    <TabsList>
                        <TabsTrigger value="my-requests">My Requests ({myRequests.length})</TabsTrigger>
                        <TabsTrigger value="to-fulfill">To Fulfill ({toFulfill.length})</TabsTrigger>
                    </TabsList>
                    {activeTab === 'my-requests' && (
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" /> New Request
                        </Button>
                    )}
                </div>

                <TabsContent value="my-requests" className="mt-4 space-y-4">
                    {myRequests.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">No requests found.</div>
                    ) : (
                        <div className="grid gap-3">
                            {myRequests.map(req => (
                                <div key={req.indentId} className="flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">{req.indentNumber}</span>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border-none", INDENT_TONE[req.status] || INDENT_TONE.DRAFT)}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            Requested from: <span className="font-medium text-slate-700">{req.targetStoreName || 'Unknown'}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {req.lineCount} items • {new Date(req.requestedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="to-fulfill" className="mt-4 space-y-4">
                    {toFulfill.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">No requests to fulfill.</div>
                    ) : (
                        <div className="grid gap-3">
                            {toFulfill.map(req => (
                                <div key={req.indentId} className="flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">{req.indentNumber}</span>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border-none", INDENT_TONE[req.status] || INDENT_TONE.DRAFT)}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            Requested by: <span className="font-medium text-slate-700">{req.requestingStoreName || 'Unknown'}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {req.lineCount} items • {new Date(req.requestedAt).toLocaleString()}
                                        </div>
                                    </div>
                                    {req.status === 'SUBMITTED' && (
                                        <Button size="sm" onClick={() => openIssue(req)} className="bg-brand-600 hover:bg-brand-700">
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
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>New Internal Request</DialogTitle>
                        <DialogDescription>Request stock from another store/department.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Request From (Target Store)</Label>
                            <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select store..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.filter(s => s.storeId !== myStoreId).map(s => (
                                        <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Items to Request</Label>
                            <div className="flex gap-2 mb-2">
                                <Select
                                    onValueChange={v => {
                                        const item = items.find(i => i.inventoryItemId === v);
                                        if (item && !newLines.some(l => l.inventoryItemId === v)) {
                                            setNewLines([...newLines, { inventoryItemId: item.inventoryItemId, itemName: item.itemName, qty: 1 }]);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Add item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map(i => (
                                            <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {newLines.length > 0 && (
                                <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                                    {newLines.map((line, idx) => (
                                        <div key={line.inventoryItemId} className="flex items-center gap-3 p-3">
                                            <div className="flex-1 text-sm font-medium">{line.itemName}</div>
                                            <div className="w-24">
                                                <Input 
                                                    type="number" 
                                                    min="1"
                                                    value={line.qty} 
                                                    onChange={e => {
                                                        const copy = [...newLines];
                                                        copy[idx].qty = Number(e.target.value);
                                                        setNewLines(copy);
                                                    }}
                                                />
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setNewLines(newLines.filter((_, i) => i !== idx))}>
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createBusy}>
                            {createBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Submit Request
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Issue Dialog */}
            <Dialog open={!!issueTarget} onOpenChange={o => !o && setIssueTarget(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Fulfill Request</DialogTitle>
                        <DialogDescription>
                            Request #{issueTarget?.indentNumber} from {issueTarget?.requestingStoreName}
                        </DialogDescription>
                    </DialogHeader>
                    {!issueDetail ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                                {issueDetail.lines.map((line, idx) => {
                                    const batches = availableBatches[line.inventoryItemId] || [];
                                    const currentLine = issueLines[idx];
                                    return (
                                        <div key={line.indentLineId} className="p-4 space-y-3 bg-slate-50/50">
                                            <div className="flex justify-between items-center">
                                                <div className="font-medium">{line.itemName}</div>
                                                <div className="text-sm font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">
                                                    Requested: {line.qty} {line.unit}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Issue From Batch</Label>
                                                    <Select
                                                        value={currentLine?.batchId || ''}
                                                        onValueChange={v => {
                                                            const copy = [...issueLines];
                                                            copy[idx] = { ...copy[idx], batchId: v };
                                                            setIssueLines(copy);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue placeholder="Select batch..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {batches.map(b => (
                                                                <SelectItem key={b.batchId} value={b.batchId}>
                                                                    {b.batchNumber} (Stock: {b.remainingQty}) - Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs">Issue Qty</Label>
                                                    <Input 
                                                        className="h-8 text-sm"
                                                        type="number"
                                                        min="1"
                                                        max={line.qty}
                                                        value={currentLine?.qty || ''}
                                                        onChange={e => {
                                                            const copy = [...issueLines];
                                                            copy[idx] = { ...copy[idx], qty: Number(e.target.value) };
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
                                <Button variant="outline" onClick={() => setIssueTarget(null)}>Cancel</Button>
                                <Button onClick={handleIssue} disabled={issueBusy} className="bg-brand-600 hover:bg-brand-700">
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
