import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Layout, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { mockApi } from '@/services/mockApi';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { buildReceiptA4 } from '@/printTemplates/receiptA4';
import { buildReceiptThermal80 } from '@/printTemplates/receiptThermal80';
import { buildBillCumReceiptA4 } from '@/printTemplates/billCumReceiptA4';
import { openPrintHtml } from '@/utils/printUtils';
import { PrintSettings } from '@/types/print';

export const PrintPreviewPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') as 'invoice' | 'receipt' | 'bill-cum-receipt' || 'invoice';
    const id = searchParams.get('id') || '';

    // For receipts, we might need invoiceNo too if it's bill-cum-receipt, 
    // but usually we can fetch by receipt ID or pass both.
    // Let's assume 'id' here handles the main lookup key.

    const [htmlContent, setHtmlContent] = useState<string>('');
    const [template, setTemplate] = useState<string>('A4');
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<PrintSettings | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Mock API is disabled. 
            // In the future, this will fetch from billingService APIs
            console.log(`Preview requested for type ${type} with ID ${id}`);

            // Artificial delay to mimic loading
            await new Promise(resolve => setTimeout(resolve, 500));

            setSettings(null);
            setHtmlContent('<div style="color:gray; font-family:sans-serif; text-align:center; margin-top:100px; padding: 20px;"><h2>Print Preview Unavailable</h2><p>The backend print API is currently not implemented. Print data cannot be loaded yet.</p></div>');

            /*
            // const fetchedSettings = await billingService.getPrintSettings();
            if (type === 'invoice') { ... } 
            else if (type === 'receipt') { ... } 
            else if (type === 'bill-cum-receipt') { ... }
            */
        } catch (error) {
            console.error("Failed to load print data", error);
            setHtmlContent('<div style="color:red; text-align:center; margin-top:50px;">Failed to load data. Please check console.</div>');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, type, template]);

    const handlePrint = () => {
        if (htmlContent) {
            openPrintHtml(htmlContent);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.close()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Printer className="h-5 w-5 text-brand-500" /> Print Preview
                        </h1>
                        <div className="text-xs text-gray-500">
                            ID: {id} • Type: <span className="uppercase">{type}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {type === 'receipt' && (
                        <Select value={template} onValueChange={setTemplate}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Select Template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A4">A4 Standard</SelectItem>
                                <SelectItem value="Thermal80">Thermal 80mm</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    <Button onClick={handlePrint} className="bg-brand-600 hover:bg-brand-700 text-white gap-2">
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-100/50 dark:bg-gray-900/50">
                <div className={`bg-white shadow-2xl transition-all duration-300 ${template === 'Thermal80' ? 'w-[80mm]' : 'w-[210mm]'} min-h-[297mm]`}>
                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center text-gray-400">
                            Loading preview...
                        </div>
                    ) : (
                        <iframe
                            srcDoc={htmlContent}
                            className="w-full h-full min-h-[297mm] border-none"
                            title="Print Preview"
                        // Using iframe to isolate styles
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
