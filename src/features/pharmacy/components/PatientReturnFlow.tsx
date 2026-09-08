import React, { useState } from 'react';
import { useAuthStore } from '@/store';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { buildPharmacyCreditNoteA4 } from '@/printTemplates/pharmacyCreditNoteA4';
import { openPrintHtml } from '@/utils/printUtils';
import { pharmacyApi } from '../services/pharmacyApi';
import { pharmacyReturnApi, ReturnableLineRow } from '../services/pharmacyReturnApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface SelectedLine extends ReturnableLineRow {
  selected: boolean;
  qtyToReturn: number;
}

export const PatientReturnFlow: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState<{ invoiceNo: string; patientId?: string; invoiceDate: string } | null>(null);
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [refundMode, setRefundMode] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scan = async () => {
    if (!invoiceNo.trim()) {
      toast.error('Enter an invoice number');
      return;
    }
    setIsScanning(true);
    setLines([]);
    setInvoiceInfo(null);
    try {
      const result = await pharmacyReturnApi.getReturnableInvoiceLines(invoiceNo.trim());
      if (!result.found) {
        toast.error(result.message || 'Invoice not found');
        return;
      }
      if (result.lines.length === 0) {
        toast.error(result.message || 'No returnable lines on this invoice.');
      }
      setInvoiceInfo({ invoiceNo: result.invoiceNo, patientId: result.patientId, invoiceDate: result.invoiceDate });
      setLines(result.lines.map(l => ({ ...l, selected: false, qtyToReturn: l.returnableQty })));
    } catch {
      toast.error('Could not scan the invoice.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleLine = (batchId: string, chargeEventId: string) => {
    setLines(prev => prev.map(l => (l.batchId === batchId && l.chargeEventId === chargeEventId) ? { ...l, selected: !l.selected } : l));
  };

  const updateQty = (batchId: string, chargeEventId: string, qty: number) => {
    setLines(prev => prev.map(l => {
      if (l.batchId !== batchId || l.chargeEventId !== chargeEventId) return l;
      const clamped = Math.max(0, Math.min(qty, l.returnableQty));
      return { ...l, qtyToReturn: clamped };
    }));
  };

  const selectedLines = lines.filter(l => l.selected && l.qtyToReturn > 0);
  const totalRefund = selectedLines.reduce((sum, l) => sum + l.qtyToReturn * l.unitPrice, 0);

  const printCreditNote = async (returnNo: string, returnedAt: string, totalRefundAmount: number) => {
    if (!hospitalId || !invoiceInfo) return;
    try {
      const [hospital, pharmacySettings] = await Promise.all([
        hospitalApi.getHospitalById(hospitalId),
        pharmacyApi.getPrintSettings(hospitalId),
      ]);
      const printSettings = buildPrintSettingsFromHospital(hospital);
      const html = buildPharmacyCreditNoteA4(
        {
          returnNo,
          returnedAt,
          invoiceNo: invoiceInfo.invoiceNo,
          patientId: invoiceInfo.patientId,
          items: selectedLines.map((l, idx) => ({
            srNo: idx + 1,
            itemName: l.itemName,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : undefined,
            returnedQty: l.qtyToReturn,
            unitPrice: l.unitPrice,
            refundAmount: l.qtyToReturn * l.unitPrice,
          })),
          totalRefundAmount,
          refundMode,
          notes: notes || undefined,
        },
        printSettings,
        {
          tradeName: pharmacySettings.tradeName,
          dl20BNumber: pharmacySettings.dl20BNumber,
          dl21BNumber: pharmacySettings.dl21BNumber,
          fssaiNumber: pharmacySettings.fssaiNumber,
          returnPolicyText: pharmacySettings.returnPolicyText,
        },
      );
      openPrintHtml(html);
    } catch {
      toast.error('Return recorded, but the credit note could not be printed.');
    }
  };

  const handleSubmit = async () => {
    if (selectedLines.length === 0) {
      toast.error('Select at least one line with a quantity to return');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await pharmacyReturnApi.createReturn({
        invoiceNo: invoiceNo.trim(),
        refundMode,
        notes: notes || undefined,
        lines: selectedLines.map(l => ({
          chargeEventId: l.chargeEventId,
          inventoryItemId: l.inventoryItemId,
          batchId: l.batchId,
          returnedQty: l.qtyToReturn,
          unitPrice: l.unitPrice,
        })),
      });
      if (!response.success) {
        toast.error(response.message || 'Return failed');
        return;
      }
      toast.success(`Return ${response.returnNo} recorded — refund ₹${response.totalRefundAmount.toFixed(2)}`);
      await printCreditNote(response.returnNo, new Date().toISOString(), response.totalRefundAmount);
      setInvoiceNo('');
      setInvoiceInfo(null);
      setLines([]);
      setNotes('');
    } catch (error: any) {
      toast.error(error?.message || 'Could not record the return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-red-600" />
        <h2 className="font-semibold text-lg">Patient Return</h2>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Invoice number (e.g. INV-2026-000062)"
          value={invoiceNo}
          onChange={e => setInvoiceNo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
        />
        <Button onClick={scan} disabled={isScanning}>
          <Search className="h-4 w-4 mr-2" />
          Scan
        </Button>
      </div>

      {invoiceInfo && (
        <div className="text-sm text-muted-foreground">
          Invoice <b>{invoiceInfo.invoiceNo}</b> · {new Date(invoiceInfo.invoiceDate).toLocaleDateString('en-IN')}
          {invoiceInfo.patientId && <> · Patient {invoiceInfo.patientId}</>}
        </div>
      )}

      {lines.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Dispensed</TableHead>
                <TableHead>Already Returned</TableHead>
                <TableHead>Returnable</TableHead>
                <TableHead>Return Qty</TableHead>
                <TableHead className="text-right">Refund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => (
                <TableRow key={`${l.chargeEventId}-${l.batchId}`}>
                  <TableCell>
                    <Checkbox checked={l.selected} onCheckedChange={() => toggleLine(l.batchId, l.chargeEventId)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{l.itemName}</div>
                    {l.isExpired && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 mt-1">Expired</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.batchNumber}</TableCell>
                  <TableCell>{l.dispensedQty}</TableCell>
                  <TableCell>{l.alreadyReturnedQty}</TableCell>
                  <TableCell>{l.returnableQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={l.returnableQty}
                      className="w-20 h-8"
                      value={l.qtyToReturn}
                      disabled={!l.selected}
                      onChange={e => updateQty(l.batchId, l.chargeEventId, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {l.selected ? `₹${(l.qtyToReturn * l.unitPrice).toFixed(2)}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
          <div>
            <label className="text-xs font-medium text-gray-500">Refund Mode</label>
            <Select value={refundMode} onValueChange={setRefundMode}>
              <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <Input className="mt-1" placeholder="Reason for return (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-500">Total Refund</div>
            <div className="text-xl font-bold text-red-600">₹{totalRefund.toFixed(2)}</div>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedLines.length === 0} className="h-11">
            <Printer className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Processing...' : 'Process Return'}
          </Button>
        </div>
      )}
    </div>
  );
};
