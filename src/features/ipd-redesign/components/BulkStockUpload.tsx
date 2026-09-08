import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { inventoryApi } from '../services/inventoryApi';
import { AlertCircle, CheckCircle2, Loader2, Upload, FileDown, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface StockRow {
    storeCode: string;
    itemCode: string;
    batchNumber: string;
    manufactureDate: string | null;
    expiryDate: string | null;
    unitCost: number | null;
    receivedQty: number;
}

export const BulkStockUpload: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { toast } = useToast();
    const [tab, setTab] = useState<'manual' | 'csv'>('manual');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; errors: any[] } | null>(null);

    // --- MANUAL ENTRY STATE ---
    const [manualRows, setManualRows] = useState<StockRow[]>([
        { storeCode: '', itemCode: '', batchNumber: '', manufactureDate: '', expiryDate: '', unitCost: null, receivedQty: 1 }
    ]);

    const addManualRow = () => {
        setManualRows([...manualRows, { storeCode: '', itemCode: '', batchNumber: '', manufactureDate: '', expiryDate: '', unitCost: null, receivedQty: 1 }]);
    };

    const updateManualRow = (index: number, field: keyof StockRow, value: any) => {
        const newRows = [...manualRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setManualRows(newRows);
    };

    const removeManualRow = (index: number) => {
        if (manualRows.length === 1) return;
        setManualRows(manualRows.filter((_, i) => i !== index));
    };

    // --- CSV UPLOAD STATE ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [csvPreview, setCsvPreview] = useState<StockRow[]>([]);

    const downloadTemplate = () => {
        const headers = ['Store Code', 'Item Code', 'Batch No', 'Mfg Date', 'Exp Date', 'Unit Cost', 'Qty'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + "MAIN_STORE,ITEM-001,BATCH-A,,2025-12-31,10.5,100";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "stock_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const parseCSVRow = (text: string) => {
        let result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    result.push(cur.trim());
                    cur = '';
                } else {
                    cur += char;
                }
            }
        }
        result.push(cur.trim());
        return result;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                toast({ title: 'Invalid File', description: 'File is empty or missing data rows.', variant: 'destructive' });
                return;
            }

            const parsedRows: StockRow[] = lines.slice(1).map(line => {
                const cols = parseCSVRow(line);
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

            setCsvPreview(parsedRows);
        };
        reader.readAsText(file);
    };

    const submit = async (data: StockRow[]) => {
        // Validate
        const invalidRows = data.findIndex(r => !r.storeCode || !r.itemCode || !r.batchNumber || r.receivedQty <= 0);
        if (invalidRows !== -1) {
            toast({ title: 'Validation Error', description: `Row ${invalidRows + 1} is missing required fields (Store Code, Item Code, Batch No, or valid Qty > 0).`, variant: 'destructive' });
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            await inventoryApi.bulkUploadBatches({ rows: data });
            setResult({ success: true, message: 'Successfully uploaded batches', errors: [] });
            toast({ title: 'Success', description: 'Stock uploaded successfully' });
            if (tab === 'manual') {
                setManualRows([{ storeCode: '', itemCode: '', batchNumber: '', manufactureDate: '', expiryDate: '', unitCost: null, receivedQty: 1 }]);
            } else {
                setCsvPreview([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
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

            <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
                <TabsList className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-xl shadow-sm h-auto inline-flex mb-6">
                    <TabsTrigger value="manual" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold">
                        Manual Grid Entry
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold">
                        CSV File Upload
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="mt-0 space-y-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/20">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-zinc-200">Manual Entry</h3>
                                <p className="text-xs text-slate-500">Add multiple stock entries quickly like a spreadsheet.</p>
                            </div>
                            <Button onClick={addManualRow} variant="outline" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-brand-600 font-bold">
                                <Plus className="h-4 w-4 mr-1.5" /> Add Row
                            </Button>
                        </div>
                        
                        <div className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-32">Store *</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-40">Item Code *</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-32">Batch No *</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-32">Mfg Date</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-32">Exp Date</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-24">Unit Cost</th>
                                        <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 w-24">Qty *</th>
                                        <th className="px-2 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {manualRows.map((row, i) => (
                                        <tr key={i} className="group">
                                            <td className="px-1 py-1.5">
                                                <Input className="h-8 text-xs font-mono" value={row.storeCode} onChange={e => updateManualRow(i, 'storeCode', e.target.value)} placeholder="MAIN" />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input className="h-8 text-xs font-mono" value={row.itemCode} onChange={e => updateManualRow(i, 'itemCode', e.target.value)} placeholder="ITEM-01" />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input className="h-8 text-xs font-mono" value={row.batchNumber} onChange={e => updateManualRow(i, 'batchNumber', e.target.value)} placeholder="B-100" />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input type="date" className="h-8 text-xs" value={row.manufactureDate || ''} onChange={e => updateManualRow(i, 'manufactureDate', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input type="date" className="h-8 text-xs" value={row.expiryDate || ''} onChange={e => updateManualRow(i, 'expiryDate', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input type="number" min="0" step="0.01" className="h-8 text-xs font-mono" value={row.unitCost ?? ''} onChange={e => updateManualRow(i, 'unitCost', parseFloat(e.target.value))} placeholder="0.00" />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <Input type="number" min="1" className="h-8 text-xs font-mono font-bold" value={row.receivedQty} onChange={e => updateManualRow(i, 'receivedQty', parseFloat(e.target.value))} />
                                            </td>
                                            <td className="px-1 py-1.5 text-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                                                    onClick={() => removeManualRow(i)}
                                                    disabled={manualRows.length === 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 flex justify-end">
                            <Button onClick={() => submit(manualRows)} disabled={loading} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-6">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Submit {manualRows.length} Rows
                            </Button>
                        </div>
                    </div>
                </TabsContent>
                
                <TabsContent value="csv" className="mt-0 space-y-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md p-6">
                        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600" /> Upload CSV File
                                </h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-lg">
                                    Upload a CSV file containing your stock batches. Ensure you use the exact format provided in our template.
                                </p>
                            </div>
                            
                            <Button onClick={downloadTemplate} variant="outline" className="h-10 rounded-xl active:scale-[0.98] transition-all bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold shadow-sm shrink-0">
                                <FileDown className="h-4 w-4 mr-2" /> Download Template
                            </Button>
                        </div>
                        
                        <div className="mt-6">
                            <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleFileUpload} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-4" />
                                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">Click or drag CSV file to upload</h4>
                                <p className="text-xs text-slate-400 mt-1">.csv format only</p>
                            </div>
                        </div>
                    </div>

                    {csvPreview.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/20">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-zinc-200">CSV Preview</h3>
                                    <p className="text-xs text-slate-500">{csvPreview.length} valid rows found</p>
                                </div>
                                <Button onClick={() => submit(csvPreview)} disabled={loading} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-6">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Upload Data
                                </Button>
                            </div>
                            <div className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 dark:bg-zinc-950/20">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Store</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Item Code</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Batch No</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Mfg Date</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Exp Date</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Unit Cost</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                                        {csvPreview.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/10 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-zinc-200 font-mono text-xs">{r.storeCode}</td>
                                                <td className="px-4 py-2.5 text-slate-650 dark:text-zinc-350 font-mono text-xs">{r.itemCode}</td>
                                                <td className="px-4 py-2.5 text-slate-600 dark:text-zinc-400 font-mono text-xs">{r.batchNumber}</td>
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
                </TabsContent>
            </Tabs>
        </div>
    );
};
