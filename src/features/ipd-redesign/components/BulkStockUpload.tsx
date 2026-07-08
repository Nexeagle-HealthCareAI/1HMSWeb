import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { inventoryApi } from '../services/inventoryApi';
import { AlertCircle, CheckCircle2, Loader2, Play, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const BulkStockUpload: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { toast } = useToast();
    const [pastedData, setPastedData] = useState('');
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; errors: any[] } | null>(null);

    const parseData = () => {
        if (!pastedData.trim()) return;
        const lines = pastedData.trim().split('\n');
        const rows = lines.map(line => {
            const cols = line.split('\t').map(c => c.trim());
            return {
                storeCode: cols[0] || '',
                itemCode: cols[1] || '',
                batchNumber: cols[2] || '',
                manufactureDate: cols[3] || null,
                expiryDate: cols[4] || null,
                unitCost: cols[5] ? parseFloat(cols[5]) : null,
                receivedQty: cols[6] ? parseFloat(cols[6]) : 0,
            };
        }).filter(r => r.storeCode && r.itemCode && r.batchNumber);
        setPreview(rows);
    };

    const submit = async () => {
        if (preview.length === 0) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await inventoryApi.bulkUploadBatches({ rows: preview });
            setResult({ success: true, message: 'Successfully uploaded batches', errors: [] });
            toast({ title: 'Success', description: 'Stock uploaded successfully' });
            setPastedData('');
            setPreview([]);
            onSuccess();
        } catch (e: any) {
            if (e.response?.data?.errors) {
                setResult({ success: false, message: e.response.data.message || 'Upload failed', errors: e.response.data.errors });
            } else {
                toast({ title: 'Upload Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Bulk Upload Stock</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Paste data directly from Excel. Ensure your columns match this exact order:<br/>
                    <strong>Store Code | Item Code | Batch No | Mfg Date | Exp Date | Unit Cost | Qty</strong>
                </p>

                <textarea
                    className="w-full h-40 p-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all font-mono text-sm whitespace-pre"
                    placeholder="Paste your TSV data here..."
                    value={pastedData}
                    onChange={e => setPastedData(e.target.value)}
                />

                <div className="flex justify-end mt-4">
                    <Button onClick={parseData} disabled={!pastedData.trim()}>
                        <Play className="h-4 w-4 mr-2" /> Preview Data
                    </Button>
                </div>
            </div>

            {result && (
                <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-50 border-green-200 text-green-800" : ""}>
                    {result.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{result.success ? 'Success' : 'Upload Failed'}</AlertTitle>
                    <AlertDescription>
                        {result.message}
                        {result.errors.length > 0 && (
                            <ul className="list-disc pl-5 mt-2 text-sm opacity-90">
                                {result.errors.map((e, i) => <li key={i}>Row {e.rowIndex + 1}: {e.errorMessage}</li>)}
                            </ul>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {preview.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Preview ({preview.length} rows)</h3>
                        <Button onClick={submit} disabled={loading} className="bg-brand-600 hover:bg-brand-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Submit {preview.length} Rows
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Store</th>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Batch</th>
                                    <th className="px-4 py-3">Mfg Date</th>
                                    <th className="px-4 py-3">Exp Date</th>
                                    <th className="px-4 py-3">Cost</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {preview.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium">{r.storeCode}</td>
                                        <td className="px-4 py-2">{r.itemCode}</td>
                                        <td className="px-4 py-2 text-slate-600">{r.batchNumber}</td>
                                        <td className="px-4 py-2 text-slate-500">{r.manufactureDate || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500">{r.expiryDate || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500">{r.unitCost || '-'}</td>
                                        <td className="px-4 py-2 font-bold text-right">{r.receivedQty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
