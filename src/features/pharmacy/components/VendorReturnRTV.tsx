import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { buildPharmacyDebitNoteA4 } from '@/printTemplates/pharmacyDebitNoteA4';
import { openPrintHtml } from '@/utils/printUtils';
import { vendorService, VendorItem } from '@/features/hospital/services/vendorService';
import { pharmacyReturnApi, RtvEligibleBatchRow, VendorReturnRow } from '../services/pharmacyReturnApi';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SelectedBatch extends RtvEligibleBatchRow {
  selected: boolean;
  qtyToReturn: number;
}

export const VendorReturnRTV: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [vendorId, setVendorId] = useState<string>('');
  const [daysWindow, setDaysWindow] = useState(60);
  const [batches, setBatches] = useState<SelectedBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pastReturns, setPastReturns] = useState<VendorReturnRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    vendorService.getVendors(hospitalId).then(setVendors).catch(() => toast.error('Could not load vendors'));
  }, [hospitalId]);

  const loadEligibleBatches = useCallback(async () => {
    if (!hospitalId || !vendorId) return;
    setIsLoadingBatches(true);
    try {
      const rows = await pharmacyReturnApi.getRtvEligibleBatches(vendorId, daysWindow, hospitalId);
      setBatches(rows.map(b => ({ ...b, selected: false, qtyToReturn: b.remainingQty })));
    } catch {
      toast.error('Could not load eligible batches for this vendor.');
    } finally {
      setIsLoadingBatches(false);
    }
  }, [hospitalId, vendorId, daysWindow]);

  const loadHistory = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoadingHistory(true);
    try {
      const rows = await pharmacyReturnApi.getVendorReturns(vendorId || undefined, hospitalId);
      setPastReturns(rows);
    } catch {
      toast.error('Could not load RTV history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [hospitalId, vendorId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { if (vendorId) loadEligibleBatches(); else setBatches([]); }, [vendorId, daysWindow, loadEligibleBatches]);

  const toggleBatch = (batchId: string) => {
    setBatches(prev => prev.map(b => b.batchId === batchId ? { ...b, selected: !b.selected } : b));
  };

  const updateQty = (batchId: string, qty: number) => {
    setBatches(prev => prev.map(b => b.batchId === batchId ? { ...b, qtyToReturn: Math.max(0, Math.min(qty, b.remainingQty)) } : b));
  };

  const selectedBatches = batches.filter(b => b.selected && b.qtyToReturn > 0);
  const totalValue = selectedBatches.reduce((sum, b) => sum + b.qtyToReturn * (b.unitCost ?? 0), 0);
  const selectedVendor = vendors.find(v => v.vendorId === vendorId);

  const printDebitNote = async (returnNoteNo: string, totalQty: number, totalVal: number) => {
    if (!hospitalId || !selectedVendor) return;
    try {
      const hospital = await hospitalApi.getHospitalById(hospitalId);
      const printSettings = buildPrintSettingsFromHospital(hospital);
      const html = buildPharmacyDebitNoteA4(
        {
          returnNoteNo,
          generatedAt: new Date().toISOString(),
          vendorName: selectedVendor.vendorName,
          items: selectedBatches.map((b, idx) => ({
            srNo: idx + 1,
            itemName: b.itemName,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : undefined,
            qty: b.qtyToReturn,
            unitCost: b.unitCost ?? 0,
            lineValue: b.qtyToReturn * (b.unitCost ?? 0),
          })),
          totalQty,
          totalValue: totalVal,
          notes: notes || undefined,
        },
        printSettings,
      );
      openPrintHtml(html);
    } catch {
      toast.error('RTV recorded, but the debit note could not be printed.');
    }
  };

  const handleGenerate = async () => {
    if (selectedBatches.length === 0) {
      toast.error('Select at least one batch with a quantity to return');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await pharmacyReturnApi.createVendorReturn({
        vendorId,
        notes: notes || undefined,
        lines: selectedBatches.map(b => ({ batchId: b.batchId, qty: b.qtyToReturn })),
      }, hospitalId!);
      if (!response.success) {
        toast.error(response.message || 'RTV generation failed');
        return;
      }
      toast.success(`RTV ${response.returnNoteNo} generated — ₹${response.totalValue.toFixed(2)}`);
      await printDebitNote(response.returnNoteNo, response.totalQty, response.totalValue);
      setNotes('');
      loadEligibleBatches();
      loadHistory();
    } catch (error: any) {
      toast.error(error?.message || 'Could not generate the vendor return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-orange-600" />
        <h2 className="font-semibold text-lg">Return to Vendor (RTV)</h2>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Vendor</label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="w-64 mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              {vendors.map(v => <SelectItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Expiry Window (days)</label>
          <Input
            type="number"
            className="w-32 mt-1"
            value={daysWindow}
            onChange={e => setDaysWindow(parseInt(e.target.value) || 60)}
          />
        </div>
      </div>

      {isLoadingBatches ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : vendorId && batches.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No near-expiry batches from this vendor within {daysWindow} days.</div>
      ) : batches.length > 0 ? (
        <>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Return Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(b => (
                  <TableRow key={b.batchId}>
                    <TableCell><Checkbox checked={b.selected} onCheckedChange={() => toggleBatch(b.batchId)} /></TableCell>
                    <TableCell className="font-medium">{b.itemName}</TableCell>
                    <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                    <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell>
                      {b.daysToExpiry != null && (
                        <Badge variant="outline" className={b.daysToExpiry < 30 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                          {b.daysToExpiry}d
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{b.remainingQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={b.remainingQty}
                        className="w-20 h-8"
                        value={b.qtyToReturn}
                        disabled={!b.selected}
                        onChange={e => updateQty(b.batchId, parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {b.selected ? `₹${(b.qtyToReturn * (b.unitCost ?? 0)).toFixed(2)}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500">Notes</label>
              <Input className="mt-1" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Total Debit Value</div>
              <div className="text-xl font-bold text-orange-600">₹{totalValue.toFixed(2)}</div>
            </div>
            <Button onClick={handleGenerate} disabled={isSubmitting || selectedBatches.length === 0} className="h-11">
              <Printer className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Generating...' : 'Generate RTV'}
            </Button>
          </div>
        </>
      ) : null}

      <div className="pt-4 border-t">
        <h3 className="font-medium text-sm text-gray-600 mb-2">Past RTV Notes</h3>
        {isLoadingHistory ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : pastReturns.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No vendor returns generated yet.</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Note #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastReturns.map(r => (
                  <TableRow key={r.vendorReturnId}>
                    <TableCell className="font-mono text-xs">{r.returnNoteNo}</TableCell>
                    <TableCell>{r.vendorName ?? '—'}</TableCell>
                    <TableCell>{new Date(r.generatedAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{r.totalQty}</TableCell>
                    <TableCell className="text-right font-medium">₹{r.totalValue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
