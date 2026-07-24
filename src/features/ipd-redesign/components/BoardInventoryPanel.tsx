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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-zinc-800 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                        <Package2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        {boardType} Inventory
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-450 mt-0.5">
                        Showing stock for {stores.length} store(s) assigned to {boardType}
                    </p>
                </div>
                <input 
                    type="text" 
                    placeholder="Search items..." 
                    className="w-full sm:w-64 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 px-3 py-2 text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex-1 overflow-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading && stockRows.length === 0 ? (
                    <div className="flex justify-center p-8 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : stores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <ShieldAlert className="h-12 w-12 mb-4 text-slate-300 dark:text-zinc-700" />
                        <h3 className="text-lg font-medium text-slate-650 dark:text-zinc-300 mb-1">No Stores Assigned</h3>
                        <p className="text-sm text-center text-slate-500 dark:text-zinc-450 max-w-md">
                            There are currently no stores assigned to the {boardType} board. You can configure this in the Admin Store Master.
                        </p>
                    </div>
                ) : stockRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <Package2 className="h-12 w-12 mb-4 text-slate-300 dark:text-zinc-700" />
                        <h3 className="text-lg font-medium text-slate-650 dark:text-zinc-300 mb-1">No Stock Available</h3>
                        <p className="text-sm text-slate-505">The assigned stores are currently empty.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards Layout (Hidden on desktop) */}
                        <div className="md:hidden space-y-3 p-4 bg-slate-50/50 dark:bg-zinc-950/10">
                            {filteredRows.map((row, i) => (
                                <div key={`${row.storeId}-${row.inventoryItemId}-${i}`} className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm space-y-2.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">{row.itemName}</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mt-1">{row.storeName}</p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 bg-slate-50/50 dark:bg-zinc-950/20">{row.category}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Stock on Hand</span>
                                        <span className="font-bold text-sm text-slate-900 dark:text-zinc-150">
                                            {row.qtyOnHand.toLocaleString()} <span className="text-slate-400 dark:text-zinc-500 text-xs font-normal ml-0.5">{row.unit}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (Hidden on mobile) */}
                        <table className="hidden md:table w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 sticky top-0 border-b border-slate-200/60 dark:border-zinc-800 shadow-sm z-10">
                                <tr>
                                    <th className="px-4 py-3">Store</th>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Stock on Hand</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                {filteredRows.map((row, i) => (
                                    <tr key={`${row.storeId}-${row.inventoryItemId}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/10">
                                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-350">{row.storeName}</td>
                                        <td className="px-4 py-3 text-slate-800 dark:text-zinc-205">{row.itemName}</td>
                                        <td className="px-4 py-3"><Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/20">{row.category}</Badge></td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {row.qtyOnHand.toLocaleString()} <span className="text-slate-450 dark:text-zinc-500 text-xs ml-1 font-normal">{row.unit}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};
