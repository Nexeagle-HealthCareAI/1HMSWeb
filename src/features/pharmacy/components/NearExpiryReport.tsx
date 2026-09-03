import React, { useEffect, useState, useCallback } from 'react';
import { inventoryApi, NearExpiryBatch, ExpiryBucket } from '@/features/ipd-redesign/services/inventoryApi';
import { storeService, StoreItem } from '@/features/hospital/services/storeService';
import { useAuthStore } from '@/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET_LABEL: Record<ExpiryBucket, string> = {
  GREEN: 'Safe (>180d)',
  YELLOW: 'Moderate (90-180d)',
  ORANGE: 'Near Expiry (30-90d)',
  RED: 'Expired/Critical (<30d)',
};

const BUCKET_BADGE_CLASS: Record<ExpiryBucket, string> = {
  GREEN: 'bg-green-100 text-green-700 border-green-200',
  YELLOW: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ORANGE: 'bg-orange-100 text-orange-700 border-orange-200',
  RED: 'bg-red-100 text-red-700 border-red-200',
};

export const NearExpiryReport: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [batches, setBatches] = useState<NearExpiryBatch[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [storeId, setStoreId] = useState<string>('ALL');
  const [bucket, setBucket] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    storeService.getStores(hospitalId).then(setStores).catch(() => {});
  }, [hospitalId]);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const data = await inventoryApi.getNearExpiryReport({
        storeId: storeId === 'ALL' ? undefined : storeId,
        bucket: bucket === 'ALL' ? undefined : bucket,
      }, hospitalId);
      setBatches(data);
    } catch {
      toast.error('Could not load the near-expiry report');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, storeId, bucket]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Near-Expiry Report</h2>
        </div>
        <div className="flex space-x-2">
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Stores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bucket} onValueChange={setBucket}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All Buckets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Buckets</SelectItem>
              {(Object.keys(BUCKET_LABEL) as ExpiryBucket[]).map(b => (
                <SelectItem key={b} value={b}>{BUCKET_LABEL[b]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No batches within the 180-day expiry watch window.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map(b => (
                <TableRow key={b.batchId}>
                  <TableCell>
                    <div className="font-medium">{b.itemName}</div>
                    {b.genericName && <div className="text-xs text-gray-500">{b.genericName}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                  <TableCell>{b.storeName}</TableCell>
                  <TableCell>{b.vendorName ?? '—'}</TableCell>
                  <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{b.daysToExpiry ?? '—'}</TableCell>
                  <TableCell>{b.remainingQty}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={BUCKET_BADGE_CLASS[b.bucket]}>{BUCKET_LABEL[b.bucket]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
