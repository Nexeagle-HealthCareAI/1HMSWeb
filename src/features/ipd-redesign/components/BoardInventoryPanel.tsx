import React, { useEffect, useState } from 'react';
import { Loader2, Package2, ShieldAlert } from 'lucide-react';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type StockOverviewRow } from '../services/inventoryApi';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const BoardInventoryPanel: React.FC<{ boardType: string }> = ({ boardType }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stockRows, setStockRows] = useState<StockOverviewRow[]>([]);
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const allStores = await storeService.getStores();
                const assignedStores = allStores.filter(s => s.assignedBoard === boardType);
                
                if (mounted) setStores(assignedStores);

                if (assignedStores.length > 0) {
                    const board = await inventoryApi.getBoard();
                    const assignedStoreIds = new Set(assignedStores.map(s => s.storeId));
                    const filteredStock = board.stockByStore.filter(row => assignedStoreIds.has(row.storeId));
                    if (mounted) setStockRows(filteredStock);
                } else {
                    if (mounted) setStockRows([]);
                }
            } catch (e: any) {
                toast({ title: 'Error loading inventory', description: e.message, variant: 'destructive' });
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        
        // Polling
        const interval = setInterval(() => {
            load();
        }, 15000);
        return () => { mounted = false; clearInterval(interval); };
    }, [boardType, toast]);

    const filteredRows = stockRows.filter(r => 
        r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Package2 className="h-5 w-5 text-brand-600" />
                        {boardType} Inventory
                    </h2>
                    <p className="text-sm text-slate-500">
                        Showing stock for {stores.length} store(s) assigned to {boardType}
                    </p>
                </div>
                <input 
                    type="text" 
                    placeholder="Search items..." 
                    className="w-full sm:w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex-1 overflow-auto">
                {loading && stockRows.length === 0 ? (
                    <div className="flex justify-center p-8 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : stores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <ShieldAlert className="h-12 w-12 mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-600 mb-1">No Stores Assigned</h3>
                        <p className="text-sm text-center max-w-md">
                            There are currently no stores assigned to the {boardType} board. You can configure this in the Admin Store Master.
                        </p>
                    </div>
                ) : stockRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <Package2 className="h-12 w-12 mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-600 mb-1">No Stock Available</h3>
                        <p className="text-sm">The assigned stores are currently empty.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 border-b border-slate-200 shadow-sm z-10">
                            <tr>
                                <th className="px-4 py-3">Store</th>
                                <th className="px-4 py-3">Item Name</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Stock on Hand</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRows.map((row, i) => (
                                <tr key={`${row.storeId}-${row.inventoryItemId}-${i}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{row.storeName}</td>
                                    <td className="px-4 py-3">{row.itemName}</td>
                                    <td className="px-4 py-3"><Badge variant="outline" className="font-normal text-slate-600 bg-slate-50">{row.category}</Badge></td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                        {row.qtyOnHand.toLocaleString()} <span className="text-slate-400 text-xs ml-1 font-normal">{row.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
