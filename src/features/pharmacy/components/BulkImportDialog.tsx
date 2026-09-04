import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inventoryApi, BulkImportPreviewRow, BatchItem, InventoryItem } from '@/features/ipd-redesign/services/inventoryApi';
import { storeService, StoreItem } from '@/features/hospital/services/storeService';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { UploadCloud, Loader2, AlertTriangle, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

// One row in the editable review grid, regardless of whether it came from a parsed file or was
// typed in manually — both funnel through the same validation, duplicate-check, and commit path.
interface EditableRow {
  id: string;
  storeId: string;
  inventoryItemId: string;
  batchNumber: string;
  manufactureDate: string; // yyyy-mm-dd, '' if unset
  expiryDate: string;
  unitCost: string;
  mrp: string;
  barcodeValue: string;
  receivedQty: string;
  isValid: boolean;
  errorMessage: string | null;
  existingBatchWarning: string | null;
}

let rowIdCounter = 0;
const newRowId = () => `row-${++rowIdCounter}-${Date.now()}`;

const toDateInputValue = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '');

const blankRow = (): EditableRow => ({
  id: newRowId(),
  storeId: '',
  inventoryItemId: '',
  batchNumber: '',
  manufactureDate: '',
  expiryDate: '',
  unitCost: '',
  mrp: '',
  barcodeValue: '',
  receivedQty: '',
  isValid: false,
  errorMessage: null,
  existingBatchWarning: null,
});

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ isOpen, onClose, onImported }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [mode, setMode] = useState<'file' | 'manual'>('file');
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allBatches, setAllBatches] = useState<BatchItem[]>([]);

  useEffect(() => {
    if (!isOpen || !hospitalId) return;
    setMode('file');
    setRows([]);
    setUnrecognizedColumns([]);
    Promise.all([
      storeService.getStores(hospitalId),
      inventoryApi.getItems({ activeOnly: true }, hospitalId),
      inventoryApi.getAllBatches({}, hospitalId),
    ]).then(([s, i, b]) => {
      setStores(s);
      setItems(i);
      setAllBatches(b);
    }).catch(() => toast.error('Could not load stores/items for the import grid'));
  }, [isOpen, hospitalId]);

  const storeByCode = useMemo(() => new Map(stores.map(s => [s.storeCode.toUpperCase(), s])), [stores]);
  const itemByCode = useMemo(() => new Map(items.map(i => [i.itemCode.toUpperCase(), i])), [items]);

  // Re-run whenever a row's own fields change — mirrors the same required-field rules
  // PreviewBulkImportHandler/BulkBatchCommandHandlers enforce server-side, so a row that passes
  // here won't be rejected at commit.
  const validateRow = useCallback((row: EditableRow): { isValid: boolean; errorMessage: string | null } => {
    const errors: string[] = [];
    if (!row.storeId) errors.push('Store is required.');
    if (!row.inventoryItemId) errors.push('Item is required.');
    if (!row.batchNumber.trim()) errors.push('Batch number is required.');
    const qty = Number(row.receivedQty);
    if (!row.receivedQty || Number.isNaN(qty) || qty <= 0) errors.push('Quantity must be a positive number.');
    return { isValid: errors.length === 0, errorMessage: errors.length > 0 ? errors.join(' ') : null };
  }, []);

  // Non-blocking preview of the merge the backend will do (BatchCommandHandlers/BulkBatchCommandHandlers)
  // — same item+store+batch number+expiry tops up the existing batch instead of creating a duplicate.
  const checkDuplicate = useCallback((row: EditableRow): string | null => {
    if (!row.storeId || !row.inventoryItemId || !row.batchNumber.trim()) return null;
    const match = allBatches.find(b =>
      b.storeId === row.storeId &&
      b.inventoryItemId === row.inventoryItemId &&
      b.batchNumber.trim().toLowerCase() === row.batchNumber.trim().toLowerCase()
    );
    if (!match) return null;
    const sameExpiry = toDateInputValue(match.expiryDate) === row.expiryDate;
    return sameExpiry
      ? `Already exists — ${match.remainingQty} on hand. Will add to it.`
      : `Exists with a DIFFERENT expiry (${match.expiryDate ? new Date(match.expiryDate).toLocaleDateString('en-IN') : 'none'}) — check for a typo.`;
  }, [allBatches]);

  const updateRow = useCallback((id: string, patch: Partial<EditableRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      const { isValid, errorMessage } = validateRow(next);
      next.isValid = isValid;
      next.errorMessage = errorMessage;
      next.existingBatchWarning = checkDuplicate(next);
      return next;
    }));
  }, [validateRow, checkDuplicate]);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const addManualRow = useCallback(() => {
    setRows(prev => [...prev, blankRow()]);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !hospitalId) return;
    setIsParsing(true);
    setRows([]);
    try {
      const result = await inventoryApi.previewBulkImport(file, hospitalId);
      if (!result.success) {
        toast.error(result.message || 'Could not parse the file');
        return;
      }
      const mapped: EditableRow[] = result.rows.map((r: BulkImportPreviewRow) => {
        const store = r.storeCode ? storeByCode.get(r.storeCode.toUpperCase()) : undefined;
        const item = r.itemCode ? itemByCode.get(r.itemCode.toUpperCase()) : undefined;
        const row: EditableRow = {
          id: newRowId(),
          storeId: store?.storeId ?? '',
          inventoryItemId: item?.inventoryItemId ?? '',
          batchNumber: r.batchNumber ?? '',
          manufactureDate: toDateInputValue(r.manufactureDate),
          expiryDate: toDateInputValue(r.expiryDate),
          unitCost: r.unitCost != null ? String(r.unitCost) : '',
          mrp: r.mrp != null ? String(r.mrp) : '',
          barcodeValue: r.barcodeValue ?? '',
          receivedQty: r.receivedQty ? String(r.receivedQty) : '',
          isValid: r.isValid,
          errorMessage: r.errorMessage ?? null,
          existingBatchWarning: r.existingBatchWarning ?? null,
        };
        // The file parser only matched by code text — re-validate against the loaded store/item
        // lists too, so a code that parsed but doesn't resolve to a real store/item still blocks.
        const { isValid, errorMessage } = validateRow(row);
        row.isValid = row.isValid && isValid;
        row.errorMessage = row.errorMessage ?? errorMessage;
        return row;
      });
      setRows(mapped);
      setUnrecognizedColumns(result.unrecognizedColumns);
      toast.success(result.message || 'File parsed');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not parse the file');
    } finally {
      setIsParsing(false);
    }
  }, [hospitalId, storeByCode, itemByCode, validateRow]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false,
  });

  const validRows = rows.filter(r => r.isValid);
  const invalidCount = rows.length - validRows.length;

  const handleCommit = async () => {
    if (!hospitalId || validRows.length === 0) return;
    setIsCommitting(true);
    try {
      const response: any = await inventoryApi.bulkUploadBatches({
        rows: validRows.map(r => {
          const store = stores.find(s => s.storeId === r.storeId);
          const item = items.find(i => i.inventoryItemId === r.inventoryItemId);
          return {
            storeCode: store?.storeCode,
            itemCode: item?.itemCode,
            batchNumber: r.batchNumber.trim(),
            manufactureDate: r.manufactureDate || undefined,
            expiryDate: r.expiryDate || undefined,
            unitCost: r.unitCost ? Number(r.unitCost) : undefined,
            mrp: r.mrp ? Number(r.mrp) : undefined,
            barcodeValue: r.barcodeValue.trim() || undefined,
            receivedQty: Number(r.receivedQty),
          };
        }),
      }, hospitalId);
      if (response?.success !== false) {
        toast.success(response?.message || `Imported ${validRows.length} batches`);
        setRows([]);
        onImported();
        onClose();
      } else {
        toast.error(response?.message || 'Import failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Import failed');
    } finally {
      setIsCommitting(false);
    }
  };

  const showGrid = mode === 'manual' || rows.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Stock Import</DialogTitle>
        </DialogHeader>

        {!showGrid && (
          <div className="flex gap-2 mb-2">
            <Button variant={mode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setMode('file')}>
              Upload File
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setMode('manual'); setRows([blankRow()]); }}>
              Enter Manually
            </Button>
          </div>
        )}

        {!showGrid ? (
          <div
            {...getRootProps()}
            className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-16 cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {isParsing ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium">Drag & drop a .csv or .xlsx file, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Columns recognized: Store Code, Item Code, Batch No, Mfg/Exp Date, Qty, Rate, MRP, Barcode — header spelling is flexible.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" />{validRows.length} valid</span>
                {invalidCount > 0 && <span className="flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" />{invalidCount} need correction</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addManualRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setRows([]); setMode('file'); }}>Start Over</Button>
              </div>
            </div>
            {unrecognizedColumns.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Not found in this file: {unrecognizedColumns.join(', ')} — rows relying on these were left blank for those fields.
              </p>
            )}
            <div className="border border-slate-300 rounded-sm overflow-auto shadow-inner bg-white relative max-h-[60vh] custom-scrollbar">
              <table className="w-full text-sm border-collapse text-slate-800">
                <thead className="bg-slate-100 sticky top-0 z-10 border-b-2 border-slate-300 shadow-sm">
                  <tr className="text-left font-semibold text-slate-600">
                    <th className="border-r border-slate-300 p-2 text-xs w-36 whitespace-nowrap">Store</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-48 whitespace-nowrap">Item</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-32 whitespace-nowrap">Batch No.</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-32 whitespace-nowrap">Mfg Date</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-32 whitespace-nowrap">Expiry</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-20 whitespace-nowrap">Qty</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-24 whitespace-nowrap">Cost</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-24 whitespace-nowrap">MRP</th>
                    <th className="border-r border-slate-300 p-2 text-xs w-32 whitespace-nowrap">Barcode</th>
                    <th className="border-r border-slate-300 p-2 text-xs whitespace-nowrap">Notes</th>
                    <th className="p-2 text-xs w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className={cn(
                      'border-b border-slate-200 transition-colors group',
                      !r.isValid ? 'bg-red-50/80 hover:bg-red-50' : r.existingBatchWarning ? 'bg-amber-50/80 hover:bg-amber-50' : 'hover:bg-blue-50/30'
                    )}>
                      <td className="border-r border-slate-200 p-0 relative">
                        <Select value={r.storeId} onValueChange={v => updateRow(r.id, { storeId: v })}>
                          <SelectTrigger className="h-9 w-full border-0 rounded-none shadow-none focus:ring-2 focus:ring-inset focus:ring-brand-500 bg-transparent px-2 text-xs">
                            <SelectValue placeholder="Store" />
                          </SelectTrigger>
                          <SelectContent>
                            {stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <Select value={r.inventoryItemId} onValueChange={v => updateRow(r.id, { inventoryItemId: v })}>
                          <SelectTrigger className="h-9 w-full border-0 rounded-none shadow-none focus:ring-2 focus:ring-inset focus:ring-brand-500 bg-transparent px-2 text-xs truncate">
                            <SelectValue placeholder="Item" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {items.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName} ({i.itemCode})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 font-mono uppercase" value={r.batchNumber} onChange={e => updateRow(r.id, { batchNumber: e.target.value })} placeholder="Batch" />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input type="date" className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500" value={r.manufactureDate} onChange={e => updateRow(r.id, { manufactureDate: e.target.value })} />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input type="date" className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500" value={r.expiryDate} onChange={e => updateRow(r.id, { expiryDate: e.target.value })} />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input type="number" min="0" className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 text-right font-mono" value={r.receivedQty} onChange={e => updateRow(r.id, { receivedQty: e.target.value })} placeholder="0" />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input type="number" min="0" step="0.01" className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 text-right font-mono" value={r.unitCost} onChange={e => updateRow(r.id, { unitCost: e.target.value })} placeholder="0.00" />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input type="number" min="0" step="0.01" className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 text-right font-mono" value={r.mrp} onChange={e => updateRow(r.id, { mrp: e.target.value })} placeholder="0.00" />
                      </td>
                      <td className="border-r border-slate-200 p-0 relative">
                        <input className="w-full h-9 px-2 text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 font-mono" value={r.barcodeValue} onChange={e => updateRow(r.id, { barcodeValue: e.target.value })} placeholder="Scan" />
                      </td>
                      <td className="border-r border-slate-200 p-2 align-middle bg-slate-50/50">
                        <div className="text-[10px] leading-tight max-w-[200px]">
                          {r.errorMessage && <span className="text-red-600 font-medium">{r.errorMessage}</span>}
                          {r.existingBatchWarning && (
                            <span className="flex items-start gap-1 text-amber-700 mt-0.5">
                              <Info className="h-3 w-3 shrink-0" />
                              {r.existingBatchWarning}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-0 text-center align-middle bg-slate-50/50">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-red-100 hover:text-red-600 opacity-20 group-hover:opacity-100 transition-opacity mx-auto" onClick={() => removeRow(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {showGrid && (
            <Button onClick={handleCommit} disabled={validRows.length === 0 || isCommitting}>
              {isCommitting ? 'Importing...' : `Import ${validRows.length} Valid Row${validRows.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
