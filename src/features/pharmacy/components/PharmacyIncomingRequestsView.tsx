import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, PackageCheck, XCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { procurementApi, IndentItem, IndentDetail } from '@/features/ipd-redesign/services/procurementApi';
import { inventoryApi, BatchItem } from '@/features/ipd-redesign/services/inventoryApi';
import { cn } from '@/lib/utils';

const INDENT_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-sky-50 text-sky-700 border-sky-200',
  PARTIALLY_ISSUED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

// Pharmacy's own incoming-requests queue — the dispatch side of the Indent workflow already used
// hospital-wide (InternalRequestsPanel). Unlike that generic panel, this never lets the viewer pick
// which store they're acting as: the caller (PharmacyRetailDashboard) already resolves the
// hospital's Pharmacy store once for the whole screen, so pharmacy staff only ever see requests
// actually targeting them, with no second store lookup here.
export const PharmacyIncomingRequestsView: React.FC<{ pharmacyStoreId: string | null }> = ({ pharmacyStoreId }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [issueTarget, setIssueTarget] = useState<IndentItem | null>(null);
  const [issueDetail, setIssueDetail] = useState<IndentDetail | null>(null);
  const [issueLines, setIssueLines] = useState<{ indentLineId: string; batchId: string; qty: number }[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Record<string, BatchItem[]>>({});
  const [issueBusy, setIssueBusy] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<IndentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  const loadIndents = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const fresh = await procurementApi.getIndents(undefined, hospitalId);
      setIndents(fresh);
    } catch {
      toast.error('Could not load incoming requests');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { loadIndents(); }, [loadIndents]);

  const incoming = useMemo(
    () => indents.filter(i => i.targetStoreId === pharmacyStoreId),
    [indents, pharmacyStoreId]
  );
  const pendingCount = useMemo(
    () => incoming.filter(i => i.status === 'SUBMITTED' || i.status === 'PARTIALLY_ISSUED').length,
    [incoming]
  );

  const openIssue = async (indent: IndentItem) => {
    if (!hospitalId || !pharmacyStoreId) return;
    setIssueTarget(indent);
    setIssueDetail(null);
    setIssueLines([]);
    setAvailableBatches({});
    try {
      const detail = await procurementApi.getIndentDetail(indent.indentId, hospitalId);
      setIssueDetail(detail);

      const batchLists = await Promise.all(
        detail.lines.map(line => inventoryApi.getBatches(line.inventoryItemId, { storeId: pharmacyStoreId }, hospitalId))
      );
      const batchesMap: Record<string, BatchItem[]> = {};
      detail.lines.forEach((line, idx) => { batchesMap[line.inventoryItemId] = batchLists[idx]; });
      setAvailableBatches(batchesMap);

      const remainingLines = detail.lines.filter(l => l.qty > l.issuedQty);
      setIssueLines(remainingLines.map(l => ({ indentLineId: l.indentLineId, batchId: '', qty: l.qty - l.issuedQty })));
    } catch {
      toast.error('Could not load request details');
      setIssueTarget(null);
    }
  };

  const handleIssue = async () => {
    if (!issueTarget || !hospitalId) return;
    if (issueLines.some(l => !l.batchId || l.qty <= 0)) {
      toast.error('Select a batch and a valid quantity for every item');
      return;
    }
    setIssueBusy(true);
    try {
      await procurementApi.issueIndent(issueTarget.indentId, issueLines, hospitalId);
      toast.success('Stock dispatched to the requesting department');
      setIssueTarget(null);
      loadIndents();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not dispatch stock');
    } finally {
      setIssueBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !hospitalId) return;
    if (!rejectReason.trim()) {
      toast.error('A reason is required to reject a request');
      return;
    }
    setRejectBusy(true);
    try {
      await procurementApi.decideIndent(rejectTarget.indentId, false, rejectReason.trim(), hospitalId);
      toast.success('Request rejected');
      setRejectTarget(null);
      setRejectReason('');
      loadIndents();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not reject request');
    } finally {
      setRejectBusy(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!pharmacyStoreId) {
    return (
      <div className="p-6">
        <div className="text-center py-10 text-muted-foreground text-sm bg-amber-50 border border-amber-200 rounded-lg">
          No active pharmacy store is configured for this hospital — incoming requests can't be resolved without one.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 text-primary">
        <Inbox className="h-5 w-5" />
        <h2 className="font-semibold text-lg">Incoming Requests</h2>
        {pendingCount > 0 && <Badge className="bg-sky-600 hover:bg-sky-600">{pendingCount} pending</Badge>}
      </div>

      {incoming.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
          No stock requests from OT, ICU, or other departments yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {incoming.map(req => (
            <div key={req.indentId} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{req.indentNumber}</span>
                  <Badge variant="outline" className={cn('text-[10px] font-bold', INDENT_TONE[req.status] || INDENT_TONE.DRAFT)}>
                    {req.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Requested by: <span className="font-semibold">{req.requestingStoreName || 'Unknown'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {req.lineCount} item{req.lineCount === 1 ? '' : 's'} · {new Date(req.requestedAt).toLocaleString()}
                </div>
              </div>
              {(req.status === 'SUBMITTED' || req.status === 'PARTIALLY_ISSUED') && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRejectTarget(req)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => openIssue(req)}>
                    <PackageCheck className="h-4 w-4 mr-1.5" /> Dispatch
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dispatch dialog */}
      <Dialog open={!!issueTarget} onOpenChange={o => !o && setIssueTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch Request</DialogTitle>
            <DialogDescription>Request #{issueTarget?.indentNumber} from {issueTarget?.requestingStoreName}</DialogDescription>
          </DialogHeader>
          {!issueDetail ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {issueDetail.lines.filter(l => l.qty > l.issuedQty).map(line => {
                const batches = availableBatches[line.inventoryItemId] || [];
                const idx = issueLines.findIndex(il => il.indentLineId === line.indentLineId);
                const current = issueLines[idx];
                if (!current) return null;
                const remaining = line.qty - line.issuedQty;

                return (
                  <div key={line.indentLineId} className="p-3 border rounded-lg bg-gray-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{line.itemName}</span>
                      <span className="text-xs text-muted-foreground">Requested: {line.qty} · Issued: {line.issuedQty} · Remaining: {remaining} {line.unit}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Batch</Label>
                        <Select value={current.batchId} onValueChange={v => {
                          const copy = [...issueLines];
                          copy[idx] = { ...copy[idx], batchId: v };
                          setIssueLines(copy);
                        }}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select batch..." /></SelectTrigger>
                          <SelectContent>
                            {batches.map(b => (
                              <SelectItem key={b.batchId} value={b.batchId}>
                                {b.batchNumber} (Stock: {b.remainingQty}){b.expiryDate ? ` · Exp ${new Date(b.expiryDate).toLocaleDateString('en-IN')}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number" min={1} max={remaining} className="h-9"
                          value={current.qty || ''}
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIssueTarget(null)}>Cancel</Button>
                <Button onClick={handleIssue} disabled={issueBusy}>
                  {issueBusy ? 'Dispatching...' : 'Dispatch Stock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Request #{rejectTarget?.indentNumber} from {rejectTarget?.requestingStoreName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Reason (required)</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Out of stock" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectBusy}>
              {rejectBusy ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
