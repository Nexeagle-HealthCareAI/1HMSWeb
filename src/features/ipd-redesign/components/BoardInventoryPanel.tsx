import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Package2, PackagePlus, ArrowLeftRight, ShieldAlert, AlertTriangle, CircleDashed, ScanLine } from 'lucide-react';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type StockOverviewRow, type ExpiryAlertRow, type ReorderAlertRow } from '../services/inventoryApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UseStockPopover, type BoardPatientOption } from './UseStockPopover';
import { ReceiveStockDialog } from './ReceiveStockDialog';
import { TransferStockDialog } from './TransferStockDialog';

export const BoardInventoryPanel: React.FC<{ boardType: string; patients?: BoardPatientOption[] }> = ({ boardType, patients }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stockRows, setStockRows] = useState<StockOverviewRow[]>([]);
    const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertRow[]>([]);
    const [reorderAlerts, setReorderAlerts] = useState<ReorderAlertRow[]>([]);
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const allStores = await storeService.getStores();
            const assignedStores = allStores.filter(s => s.assignedBoard === boardType);

            setStores(assignedStores);

            if (assignedStores.length > 0) {
                const board = await inventoryApi.getBoard();
                const assignedStoreIds = new Set(assignedStores.map(s => s.storeId));
                const filteredStock = board.stockByStore.filter(row => assignedStoreIds.has(row.storeId));
                setStockRows(filteredStock);
                setExpiryAlerts(board.expiryAlerts || []);
                setReorderAlerts(board.reorderAlerts || []);
            } else {
                setStockRows([]);
                setExpiryAlerts([]);
                setReorderAlerts([]);
            }
        } catch (e: any) {
            toast({ title: 'Error loading inventory', description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [boardType, toast]);

    useEffect(() => {
        load();
        const interval = setInterval(() => load(true), 15000);
        return () => clearInterval(interval);
    }, [load]);

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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full sm:w-56 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 px-3 py-2 text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {stores.length > 0 && (
                        <div className="flex gap-2 shrink-0">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => toast({ title: 'Ready to Scan', description: 'Scanner listening...' })}
                                className="h-10 rounded-xl text-xs font-bold shadow-sm transition-all bg-brand-600 hover:bg-brand-700 text-white border-0"
                            >
                                <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Scan
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReceiveOpen(true)}
                                className="h-10 rounded-xl border-slate-205 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 active:scale-[0.98] transition-all"
                            >
                                <PackagePlus className="h-3.5 w-3.5 mr-1.5" /> Receive
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTransferOpen(true)}
                                className="h-10 rounded-xl border-slate-205 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 active:scale-[0.98] transition-all"
                            >
                                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Transfer
                            </Button>
                        </div>
                    )}
                </div>
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
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">{row.itemName}</h3>
                                                {reorderAlerts.some(a => a.inventoryItemId === row.inventoryItemId) && (
                                                    <span className="relative flex h-2 w-2">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                                {expiryAlerts.some(a => a.inventoryItemId === row.inventoryItemId) && (
                                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                                )}
                                            </div>
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
                                    <div className="flex justify-end pt-1">
                                        <UseStockPopover item={row} patients={patients} onSuccess={() => load(true)} />
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
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                {filteredRows.map((row, i) => (
                                    <tr key={`${row.storeId}-${row.inventoryItemId}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/10">
                                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-350">{row.storeName}</td>
                                        <td className="px-4 py-3 text-slate-800 dark:text-zinc-205">
                                            <div className="flex items-center gap-2">
                                                <span>{row.itemName}</span>
                                                {reorderAlerts.some(a => a.inventoryItemId === row.inventoryItemId) && (
                                                    <span className="relative flex h-2 w-2" title="Low Stock">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                                {expiryAlerts.some(a => a.inventoryItemId === row.inventoryItemId) && (
                                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" title="Expiring Soon" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/20">{row.category}</Badge></td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-zinc-200">
                                            {row.qtyOnHand.toLocaleString()} <span className="text-slate-450 dark:text-zinc-500 text-xs ml-1 font-normal">{row.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end">
                                                <UseStockPopover item={row} patients={patients} onSuccess={() => load(true)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <ReceiveStockDialog open={receiveOpen} onOpenChange={setReceiveOpen} boardStores={stores} onSuccess={() => load(true)} />
            <TransferStockDialog open={transferOpen} onOpenChange={setTransferOpen} boardStores={stores} stockByStore={stockRows} onSuccess={() => load(true)} />
        </div>
    );
};
