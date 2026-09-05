import React, { useEffect, useState, useCallback } from 'react';
import { inventoryApi, ReorderThresholdSuggestion } from '@/features/ipd-redesign/services/inventoryApi';
import { storeService, StoreItem } from '@/features/hospital/services/storeService';
import { useAuthStore } from '@/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const ReorderThresholdSuggestions: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [suggestions, setSuggestions] = useState<ReorderThresholdSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  // Which store this reorder request is for -- Indent.RequestingStoreId is mandatory, and this
  // screen's suggestions are hospital-wide (item-level), so the store has to be picked explicitly
  // rather than inferred. Defaults to the sole store if there's only one.
  const [requestingStoreId, setRequestingStoreId] = useState('');

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const [data, storeList] = await Promise.all([
        inventoryApi.getReorderThresholdSuggestions({}, hospitalId),
        storeService.getStores(hospitalId),
      ]);
      setSuggestions(data);
      setStores(storeList);
      setRequestingStoreId(prev => prev || (storeList.length === 1 ? storeList[0].storeId : ''));
    } catch {
      toast.error('Could not load reorder threshold suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (s: ReorderThresholdSuggestion) => {
    if (!hospitalId) return;
    setAcceptingId(s.inventoryItemId);
    try {
      const response = await inventoryApi.acceptThresholdSuggestion({
        inventoryItemId: s.inventoryItemId,
        minStockLevel: s.suggestedMinStockLevel,
        maxStockLevel: s.suggestedMaxStockLevel,
        requestingStoreId: requestingStoreId || undefined,
      }, hospitalId);
      toast.success(response.message || `Updated Min/Max for ${s.itemName}`);
      setSuggestions(prev => prev.filter(x => x.inventoryItemId !== s.inventoryItemId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update thresholds');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 text-blue-700">
          <TrendingUp className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Reorder Threshold Suggestions</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Request stock for:</span>
          <Select value={requestingStoreId} onValueChange={setRequestingStoreId}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Select store" /></SelectTrigger>
            <SelectContent>
              {stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Suggested Min/Max computed from trailing 4-week consumption. Accepting updates the thresholds
        and, when stock is below the new max, raises a draft stock request (Indent) for the selected
        store — reviewable under Stock Moves &amp; Requests before it's submitted.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No items with recent consumption history yet.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>4-Week Issued</TableHead>
                <TableHead>Weekly Avg</TableHead>
                <TableHead>Current Min / Max</TableHead>
                <TableHead>Suggested Min / Max</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map(s => (
                <TableRow key={s.inventoryItemId} className={s.isBelowSuggestedMin ? 'bg-red-50' : ''}>
                  <TableCell>
                    <div className="font-medium">{s.itemName}</div>
                    {s.isBelowSuggestedMin && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 mt-1">Below suggested min</Badge>}
                  </TableCell>
                  <TableCell>{s.trailing4WeekIssuedQty} {s.unit}</TableCell>
                  <TableCell>{s.weeklyAverageConsumption} {s.unit}/wk</TableCell>
                  <TableCell>{s.currentMinStockLevel} / {s.currentMaxStockLevel ?? '—'}</TableCell>
                  <TableCell className="font-medium">{s.suggestedMinStockLevel} / {s.suggestedMaxStockLevel}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(s)}
                      disabled={acceptingId === s.inventoryItemId}
                      title={requestingStoreId ? 'Updates thresholds and raises a draft stock request if needed' : 'Updates thresholds only — pick a store above to also raise a stock request'}
                    >
                      {acceptingId === s.inventoryItemId ? 'Saving...' : requestingStoreId ? 'Accept & Request' : 'Accept'}
                    </Button>
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
