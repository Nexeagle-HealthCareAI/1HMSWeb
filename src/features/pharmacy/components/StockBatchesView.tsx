import React, { useEffect, useState, useCallback } from 'react';
import { inventoryApi, BatchItem } from '@/features/ipd-redesign/services/inventoryApi';
import { storeService, StoreItem } from '@/features/hospital/services/storeService';
import { useAuthStore } from '@/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE_CLASS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  EXHAUSTED: 'bg-gray-100 text-gray-600 border-gray-200',
  EXPIRED: 'bg-red-100 text-red-700 border-red-200',
  QUARANTINED: 'bg-amber-100 text-amber-700 border-amber-200',
  RECALLED: 'bg-red-100 text-red-700 border-red-200',
};

// Flat, hospital-wide "everything currently in stock" view — for browsing/verifying what's already
// there before or after a bulk import, unlike Medicine Catalog (item-level aggregate stock only) or
// Near Expiry (batch-level, but scoped to a 90-day expiry window).
export const StockBatchesView: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [storeId, setStoreId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    storeService.getStores(hospitalId).then(setStores).catch(() => {});
  }, [hospitalId]);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const data = await inventoryApi.getAllBatches({
        storeId: storeId === 'ALL' ? undefined : storeId,
        search: search.trim() || undefined,
      }, hospitalId);
      setBatches(data);
    } catch {
      toast.error('Could not load stock batches');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, storeId, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 text-primary">
          <Package className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Stock / Batches</h2>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search item, code or batch no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Stores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No stock batches found.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Mfg Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map(b => (
                <TableRow key={b.batchId}>
                  <TableCell>
                    <div className="font-medium">{b.itemName ?? '—'}</div>
                    {b.itemCode && <div className="text-xs text-gray-500">{b.itemCode}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                  <TableCell>{b.storeName ?? '—'}</TableCell>
                  <TableCell>{b.manufactureDate ? new Date(b.manufactureDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{b.receivedQty}</TableCell>
                  <TableCell>{b.remainingQty}</TableCell>
                  <TableCell>{b.unitCost != null ? `₹${b.unitCost.toFixed(2)}` : '—'}</TableCell>
                  <TableCell>{b.mrp != null ? `₹${b.mrp.toFixed(2)}` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[b.status] ?? ''}>{b.status}</Badge>
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
