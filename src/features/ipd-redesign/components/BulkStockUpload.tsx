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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 p-6 shadow-md">
                <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-2">Bulk Upload Stock</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-450 mb-6">
                    Paste data directly from Excel. Ensure your columns match this exact order:<br/>
                    <strong>Store Code | Item Code | Batch No | Mfg Date | Exp Date | Unit Cost | Qty</strong>
                </p>

                <textarea
                    className="w-full h-40 p-4 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono text-sm whitespace-pre text-slate-800 dark:text-zinc-200"
                    placeholder="Paste your TSV data here..."
                    value={pastedData}
                    onChange={e => setPastedData(e.target.value)}
                />

                <div className="flex justify-end mt-4">
                    <Button onClick={parseData} disabled={!pastedData.trim()} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-5">
                        <Play className="h-4 w-4 mr-2" /> Preview Data
                    </Button>
                </div>
            </div>

            {result && (
                <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/60 text-green-800 dark:text-green-400 rounded-2xl shadow-sm" : "rounded-2xl shadow-sm"}>
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
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/20">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Preview ({preview.length} rows)</h3>
                        <Button onClick={submit} disabled={loading} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-5">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Submit {preview.length} Rows
                        </Button>
                    </div>
                    <div className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 dark:bg-zinc-950/20">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Store</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Batch</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Mfg Date</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Exp Date</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Cost</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                                {preview.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/10 transition-colors">
                                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-zinc-200">{r.storeCode}</td>
                                        <td className="px-4 py-2.5 text-slate-650 dark:text-zinc-350">{r.itemCode}</td>
                                        <td className="px-4 py-2.5 text-slate-600 dark:text-zinc-400 font-mono">{r.batchNumber}</td>
                                        <td className="px-4 py-2.5 text-slate-550 dark:text-zinc-450">{r.manufactureDate || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-550 dark:text-zinc-450">{r.expiryDate || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-550 dark:text-zinc-450 font-mono">{r.unitCost || '-'}</td>
                                        <td className="px-4 py-2.5 font-bold text-right text-slate-850 dark:text-zinc-150 font-mono">{r.receivedQty}</td>
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
