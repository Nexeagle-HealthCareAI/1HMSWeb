import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { inventoryApi, BulkImportPreviewRow } from '@/features/ipd-redesign/services/inventoryApi';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { UploadCloud, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ isOpen, onClose, onImported }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [rows, setRows] = useState<BulkImportPreviewRow[]>([]);
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

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
      setRows(result.rows);
      setUnrecognizedColumns(result.unrecognizedColumns);
      toast.success(result.message || 'File parsed');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not parse the file');
    } finally {
      setIsParsing(false);
    }
  }, [hospitalId]);

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
        rows: validRows.map(r => ({
          storeCode: r.storeCode,
          itemCode: r.itemCode,
          batchNumber: r.batchNumber,
          manufactureDate: r.manufactureDate,
          expiryDate: r.expiryDate,
          unitCost: r.unitCost,
          mrp: r.mrp,
          barcodeValue: r.barcodeValue,
          receivedQty: r.receivedQty,
        })),
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Stock Import (Excel / CSV)</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" />{validRows.length} valid</span>
                {invalidCount > 0 && <span className="flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" />{invalidCount} need correction</span>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setRows([])}>Upload a different file</Button>
            </div>
            {unrecognizedColumns.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Not found in this file: {unrecognizedColumns.join(', ')} — rows relying on these were left blank for those fields.
              </p>
            )}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.rowIndex} className={r.isValid ? '' : 'bg-red-50'}>
                      <TableCell className="text-xs">{r.rowIndex + 1}</TableCell>
                      <TableCell className="text-xs">{r.storeCode || '—'}</TableCell>
                      <TableCell className="text-xs">{r.itemCode || '—'}</TableCell>
                      <TableCell className="text-xs">{r.batchNumber || '—'}</TableCell>
                      <TableCell className="text-xs">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell className="text-xs">{r.receivedQty}</TableCell>
                      <TableCell className="text-xs">{r.unitCost ?? '—'}</TableCell>
                      <TableCell className="text-xs text-red-700">{r.errorMessage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {rows.length > 0 && (
            <Button onClick={handleCommit} disabled={validRows.length === 0 || isCommitting}>
              {isCommitting ? 'Importing...' : `Import ${validRows.length} Valid Row${validRows.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
