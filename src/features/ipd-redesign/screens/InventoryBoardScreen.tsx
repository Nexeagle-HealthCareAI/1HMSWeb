import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Warehouse, Loader2, RefreshCw, AlertTriangle, PackageMinus, Clock, HardDrive, Truck, ShieldAlert, Droplet, Package2, ArrowLeftRight, ArrowLeft, Search, ArrowUpDown } from 'lucide-react';
import { inventoryApi, type InventoryBoard, type UnifiedStockVisibility } from '../services/inventoryApi';
import { equipmentApi, type EquipmentItem } from '../services/equipmentApi';
import { ProcurementPanel } from '../components/ProcurementPanel';
import { NarcoticCompliancePanel } from '../components/NarcoticCompliancePanel';
import { ItemMaster } from '@/features/hospital/components/masters/ItemMaster';
import { TransferStockPanel } from '../components/TransferStockPanel';
import { InternalRequestsPanel } from '../components/InternalRequestsPanel';
import { BulkStockUpload } from '../components/BulkStockUpload';
import { EquipmentMaintenancePanel } from '../components/EquipmentMaintenancePanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';
import { Card } from '@/components/ui/card';
import { formatIstDateTime } from '../utils/istDate';
import { BloodBankManagementPanel } from '../components/BloodBankManagementPanel';
import { InventoryDashboard } from '../components/InventoryDashboard';
import { CssdBoardScreen } from './CssdBoardScreen';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    onBack: () => void;
}

const EMPTY_BOARD: InventoryBoard = { stockByStore: [], expiryAlerts: [], reorderAlerts: [] };
const EMPTY_UNIFIED: UnifiedStockVisibility = { inventoryByStore: [], bloodByStore: [], cssdByStore: [] };

const TIER_TONE: Record<number, string> = {
    30: 'bg-rose-50 text-rose-700 border-rose-200',
    60: 'bg-amber-50 text-amber-700 border-amber-200',
    90: 'bg-sky-50 text-sky-700 border-sky-200',
};

type Tab = 'overview' | 'stock' | 'items' | 'transfer' | 'alerts' | 'equipment' | 'procurement' | 'compliance' | 'bloodbank' | 'cssd';

/**
 * Inventory Management board — hospital-wide, read-only v1 (stock-by-store overview, expiry
 * alerts in 90/60/30-day tiers, reorder alerts). Same shape as BedBoardScreen/CssdBoardScreen:
 * a full-screen board reached from the IPD dashboard's top nav, not buried in Configuration.
 * Store/Item/Vendor masters and the procurement (Indent/PO/GRN) workflow live in later phases,
 * some as tabs here, some in Configuration — this v1 is the live "what's actually in stock" view.
 */
export const InventoryBoardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const [board, setBoard] = useState<InventoryBoard>(EMPTY_BOARD);
    const [dueEquipment, setDueEquipment] = useState<EquipmentItem[]>([]);
    const [unified, setUnified] = useState<UnifiedStockVisibility>(EMPTY_UNIFIED);
    const [unifiedLoaded, setUnifiedLoaded] = useState(false);
    const [unifiedLoading, setUnifiedLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('overview');

    // For the combined Alerts tab
    const [alertTab, setAlertTab] = useState<'lowstock' | 'expiring'>('lowstock');

    // Stock-by-store table: search/filter/sort state.
    const [stockSearch, setStockSearch] = useState('');
    const [stockStoreFilter, setStockStoreFilter] = useState('ALL');
    type StockSortKey = 'itemName' | 'storeName' | 'qtyOnHand';
    const [stockSort, setStockSort] = useState<{ key: StockSortKey; dir: 'asc' | 'desc' }>({ key: 'itemName', dir: 'asc' });
    const toggleStockSort = (key: StockSortKey) => {
        setStockSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const load = (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        Promise.all([inventoryApi.getBoard(), equipmentApi.getEquipment({ dueOnly: true })])
            .then(([b, e]) => { setBoard(b); setDueEquipment(e); })
            .catch(() => toast({ title: 'Could not load the inventory board', variant: 'destructive' }))
            .finally(() => { setLoading(false); setRefreshing(false); });
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (tab !== 'cssd' || unifiedLoaded) return;
        setUnifiedLoading(true);
        inventoryApi.getUnifiedStock()
            .then(u => { setUnified(u); setUnifiedLoaded(true); })
            .catch(() => toast({ title: 'Could not load the unified stock view', variant: 'destructive' }))
            .finally(() => setUnifiedLoading(false));
    }, [tab, unifiedLoaded]); // eslint-disable-line react-hooks/exhaustive-deps



    const stockStoreNames = useMemo(
        () => Array.from(new Set(board.stockByStore.map(r => r.storeName))).sort(),
        [board.stockByStore]
    );
    const lowStockItemIds = useMemo(
        () => new Set(board.reorderAlerts.map(a => a.inventoryItemId)),
        [board.reorderAlerts]
    );
    const filteredSortedStock = useMemo(() => {
        const search = stockSearch.trim().toLowerCase();
        let rows = board.stockByStore.filter(r =>
            (!search || r.itemName.toLowerCase().includes(search) || r.category.toLowerCase().includes(search)) &&
            (stockStoreFilter === 'ALL' || r.storeName === stockStoreFilter)
        );
        rows = [...rows].sort((a, b) => {
            const dir = stockSort.dir === 'asc' ? 1 : -1;
            if (stockSort.key === 'qtyOnHand') return (a.qtyOnHand - b.qtyOnHand) * dir;
            return a[stockSort.key].localeCompare(b[stockSort.key]) * dir;
        });
        return rows;
    }, [board.stockByStore, stockSearch, stockStoreFilter, stockSort]);

    const SIDEBAR_GROUPS = [
        {
            group: 'Overview',
            items: [
                { id: 'overview' as Tab, label: 'Dashboard', icon: Warehouse },
                { id: 'stock' as Tab, label: 'Current Stock', icon: Package2 },
            ]
        },
        {
            group: 'Operations',
            items: [
                { id: 'transfer' as Tab, label: 'Stock Moves & Requests', icon: ArrowLeftRight },
                { id: 'procurement' as Tab, label: 'Purchasing & Vendors', icon: Truck },
                { id: 'items' as Tab, label: 'Catalog & Setup', icon: HardDrive },
            ]
        },
        {
            group: 'Alerts & Maintenance',
            items: [
                { 
                    id: 'alerts' as Tab, 
                    label: 'Alerts & Warnings', 
                    icon: AlertTriangle, 
                    badge: (board.expiryAlerts.length + board.reorderAlerts.length) > 0 ? 
                        <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-rose-50 text-rose-600 border-rose-200">{board.expiryAlerts.length + board.reorderAlerts.length}</Badge> : undefined 
                },
                { 
                    id: 'equipment' as Tab, 
                    label: 'Equipment Maintenance', 
                    icon: Clock, 
                    badge: dueEquipment.length > 0 ? 
                        <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-violet-50 text-violet-600 border-violet-200">{dueEquipment.length}</Badge> : undefined 
                },
            ]
        },
        {
            group: 'Specialized Units',
            items: [
                { id: 'bloodbank' as Tab, label: 'Blood Bank', icon: Droplet },
                { id: 'cssd' as Tab, label: 'Sterile Instruments', icon: PackageMinus },
                { id: 'compliance' as Tab, label: 'Narcotics Log', icon: ShieldAlert },
            ]
        }
    ];

    const allSidebarItems = SIDEBAR_GROUPS.flatMap(g => g.items);
    const activeTabTitle = allSidebarItems.find(t => t.id === tab)?.label || 'Inventory';

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100%+3rem)] w-[calc(100%+3rem)] -m-6 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-20 shadow-sm relative">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                            <Warehouse className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">Inventory</h1>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-brand-600 truncate">Management</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                    {SIDEBAR_GROUPS.map((group, gIdx) => (
                        <div key={group.group}>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-2 px-2">{group.group}</div>
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const Icon = item.icon;
                                    const isActive = tab === item.id;
                                    return (
                                        <button 
                                            key={item.id}
                                            onClick={() => setTab(item.id)} 
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                                                isActive 
                                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm border border-brand-100 dark:border-brand-900/50' 
                                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                                            )}
                                        >
                                            <Icon className={cn("h-4 w-4", isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400")} /> 
                                            <span className="truncate flex-1 text-left">{item.label}</span>
                                            {item.badge}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Header, Action, and Navigation Row (Sticky at top) */}
            <div className="lg:hidden w-full bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-zinc-900 dark:to-zinc-900 text-white p-3.5 flex flex-col gap-3 shrink-0 z-20 sticky top-0 shadow-md">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-white hover:bg-white/10 active:scale-[0.98] transition-all" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Inventory Management</h2>
                            <p className="text-[10px] text-brand-100 font-medium">Manage stocks, transfers &amp; items</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-white hover:bg-white/10 active:scale-[0.98] transition-all" onClick={() => load(true)} disabled={refreshing || loading}>
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </Button>
                </div>
                <div className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex gap-1.5 py-0.5 bg-black/15 dark:bg-black/30 backdrop-blur-sm p-1 rounded-full">
                    {allSidebarItems.map(item => {
                        const Icon = item.icon;
                        const isActive = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap active:scale-[0.98] transition-all shrink-0 border-none shadow-none',
                                    isActive
                                        ? 'bg-white text-brand-600 shadow-sm'
                                        : 'text-white/80 hover:text-white'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.label}</span>
                                {item.badge && <span className="scale-75 origin-left">{item.badge}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/20">
                {/* Header (Desktop Only) */}
                <div className="hidden lg:flex items-center justify-between p-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-zinc-800 shrink-0 z-10 sticky top-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-zinc-100 tracking-tight">{activeTabTitle}</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage and track your hospital's stock and operations.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold" onClick={() => load(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-4 w-4 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-1.5" /> Exit
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
                            <p>Loading Inventory Data...</p>
                        </div>
                    ) : (
                        <SubscriptionReadOnlyOverlay featureLabel="Managing inventory" className="h-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={tab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    {tab === 'overview' && (
                                        <InventoryDashboard board={board} dueEquipment={dueEquipment} onNavigate={setTab} />
                                    )}

                                    {tab === 'stock' && (
                                board.stockByStore.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-slate-400 mx-auto w-full max-w-4xl shadow-md">
                                        No stock on hand yet. Receive stock via a batch to see it here.
                                    </div>
                               ) : (
                                    <Card className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md mx-auto w-full max-w-4xl overflow-hidden">
                                        <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-slate-100 dark:border-zinc-850">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                <Input
                                                    placeholder="Search item or category..."
                                                    value={stockSearch}
                                                    onChange={e => setStockSearch(e.target.value)}
                                                    className="pl-9 h-9 text-sm"
                                                />
                                            </div>
                                            <Select value={stockStoreFilter} onValueChange={setStockStoreFilter}>
                                                <SelectTrigger className="h-9 w-full sm:w-[200px] text-sm"><SelectValue placeholder="Store" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALL">All Stores</SelectItem>
                                                    {stockStoreNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Mobile card list */}
                                        <div className="md:hidden space-y-2 p-3">
                                            {filteredSortedStock.length === 0 ? (
                                                <p className="text-center text-sm text-slate-400 py-6">No items match this search.</p>
                                            ) : filteredSortedStock.map(r => (
                                                <div key={`${r.inventoryItemId}-${r.storeId}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/10">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 truncate">{r.itemName}</span>
                                                            {lowStockItemIds.has(r.inventoryItemId) && (
                                                                <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{r.storeName} · <Badge variant="outline" className="text-[9px] font-bold uppercase rounded-full py-0">{r.category}</Badge></p>
                                                    </div>
                                                    <span className="font-black text-sm text-slate-900 dark:text-zinc-100 font-mono shrink-0">{r.qtyOnHand.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">{r.unit}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Desktop table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            <button className="flex items-center gap-1 font-bold uppercase text-[10px] tracking-wider" onClick={() => toggleStockSort('itemName')}>
                                                                Item <ArrowUpDown className="h-3 w-3" />
                                                            </button>
                                                        </TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead>
                                                            <button className="flex items-center gap-1 font-bold uppercase text-[10px] tracking-wider" onClick={() => toggleStockSort('storeName')}>
                                                                Store <ArrowUpDown className="h-3 w-3" />
                                                            </button>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <button className="flex items-center gap-1 ml-auto font-bold uppercase text-[10px] tracking-wider" onClick={() => toggleStockSort('qtyOnHand')}>
                                                                Qty on Hand <ArrowUpDown className="h-3 w-3" />
                                                            </button>
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSortedStock.length === 0 ? (
                                                        <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-slate-400">No items match this search.</TableCell></TableRow>
                                                    ) : filteredSortedStock.map(r => (
                                                        <TableRow key={`${r.inventoryItemId}-${r.storeId}`}>
                                                            <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">
                                                                <div className="flex items-center gap-1.5">
                                                                    {r.itemName}
                                                                    {lowStockItemIds.has(r.inventoryItemId) && (
                                                                        <span className="relative flex h-2 w-2 shrink-0" title="Low stock hospital-wide (this store may still have plenty)">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase rounded-full">{r.category}</Badge></TableCell>
                                                            <TableCell className="text-slate-600 dark:text-zinc-400">{r.storeName}</TableCell>
                                                            <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-zinc-100">{r.qtyOnHand.toLocaleString('en-IN')} {r.unit}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </Card>
                                )
                            )}

                            {tab === 'items' && (
                                <Tabs defaultValue="master" className="max-w-6xl mx-auto space-y-6">
                                    <TabsList className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-xl shadow-sm h-auto flex flex-wrap gap-1 mb-2">
                                        <TabsTrigger value="master" className="rounded-lg px-4 py-2 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold text-sm flex-1 sm:flex-none">Item Database</TabsTrigger>
                                        <TabsTrigger value="bulk" className="rounded-lg px-4 py-2 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold text-sm flex-1 sm:flex-none">Bulk Upload</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="master" className="mt-0"><ItemMaster /></TabsContent>
                                    <TabsContent value="bulk" className="mt-0"><BulkStockUpload onSuccess={() => load(true)} /></TabsContent>
                                </Tabs>
                            )}

                            {tab === 'transfer' && (
                                <Tabs defaultValue="requests" className="space-y-4">
                                    <TabsList className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-xl shadow-sm h-auto flex flex-wrap gap-1">
                                        <TabsTrigger value="requests" className="rounded-lg px-4 py-2 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold text-sm flex-1 sm:flex-none">Internal Requests</TabsTrigger>
                                        <TabsTrigger value="manual" className="rounded-lg px-4 py-2 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold text-sm flex-1 sm:flex-none">Manual Transfer</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="requests" className="mt-0">
                                        <InternalRequestsPanel />
                                    </TabsContent>
                                    <TabsContent value="manual" className="mt-0">
                                        <TransferStockPanel stockByStore={board.stockByStore} onSuccess={() => load(true)} />
                                    </TabsContent>
                                </Tabs>
                            )}

                                    {tab === 'alerts' && (
                                        <div className="max-w-6xl mx-auto space-y-6">
                                            <Tabs value={alertTab} onValueChange={(v: any) => setAlertTab(v)} className="w-full">
                                                <TabsList className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-xl shadow-sm h-auto inline-flex mb-6">
                                                    <TabsTrigger value="lowstock" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-brand-50 dark:data-[state=active]:bg-brand-950/50 data-[state=active]:text-brand-600 font-bold">
                                                        Low Stock Warnings
                                                    </TabsTrigger>
                                                    <TabsTrigger value="expiring" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-50 dark:data-[state=active]:bg-rose-950/50 data-[state=active]:text-rose-600 font-bold">
                                                        Expiry Alerts
                                                    </TabsTrigger>
                                                </TabsList>
                                                
                                                <TabsContent value="lowstock" className="mt-0">
                                                    <Card className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
                                                        {board.reorderAlerts.length === 0 ? (
                                                            <div className="p-8 text-center text-sm text-slate-400">Stock levels are healthy. No items below minimum.</div>
                                                        ) : (
                                                            <>
                                                                {/* Mobile cards */}
                                                                <div className="md:hidden space-y-2 p-3">
                                                                    {board.reorderAlerts.map(a => (
                                                                        <div key={a.inventoryItemId} className="p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div>
                                                                                    <p className="font-bold text-sm text-slate-800 dark:text-zinc-200">{a.itemName}</p>
                                                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{a.category}</p>
                                                                                </div>
                                                                                <span className="inline-flex items-center bg-amber-100 text-amber-700 font-black px-2.5 py-1 rounded-lg text-sm border border-amber-200/50 shrink-0">
                                                                                    {a.currentStock} {a.unit}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex gap-4 mt-2 pt-2 border-t border-amber-100 dark:border-amber-900/30 text-xs text-slate-500">
                                                                                <span>Min: <strong>{a.minStockLevel} {a.unit}</strong></span>
                                                                                <span>Reorder: <strong>{a.reorderQty} {a.unit}</strong></span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {/* Desktop table */}
                                                                <div className="hidden md:block overflow-x-auto">
                                                                    <Table>
                                                                        <TableHeader className="bg-slate-50/50 dark:bg-zinc-950/50">
                                                                            <TableRow className="border-b border-slate-100 dark:border-zinc-800">
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase">Item</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase text-right">Current</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase text-right">Minimum</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase text-right">Reorder Qty</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {board.reorderAlerts.map(a => (
                                                                                <TableRow key={a.inventoryItemId} className="border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900">
                                                                                    <TableCell>
                                                                                        <div className="font-bold text-slate-800 dark:text-zinc-200">{a.itemName}</div>
                                                                                        <div className="text-[10px] text-slate-400 mt-0.5">{a.category}</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <span className="inline-flex items-center justify-center bg-amber-50 text-amber-700 font-black px-2.5 py-1 rounded-lg text-sm border border-amber-200/50">
                                                                                            {a.currentStock} {a.unit}
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-slate-600">{a.minStockLevel} {a.unit}</TableCell>
                                                                                    <TableCell className="text-right text-slate-500">{a.reorderQty} {a.unit}</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </>
                                                        )}
                                                    </Card>
                                                </TabsContent>
                                                
                                                <TabsContent value="expiring" className="mt-0">
                                                    <Card className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
                                                        {board.expiryAlerts.length === 0 ? (
                                                            <div className="p-8 text-center text-sm text-slate-400">No expiring items found in the upcoming 90 days.</div>
                                                        ) : (
                                                            <>
                                                                {/* Mobile cards */}
                                                                <div className="md:hidden space-y-2 p-3">
                                                                    {board.expiryAlerts.map(a => (
                                                                        <div key={`${a.inventoryItemId}-${a.batchNumber}`} className={cn("p-3 rounded-xl border", TIER_TONE[a.tierDays])}>
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="min-w-0">
                                                                                    <p className="font-bold text-sm truncate">{a.itemName}</p>
                                                                                    <p className="text-[10px] mt-0.5 opacity-70">{a.storeName} · Batch: {a.batchNumber}</p>
                                                                                    <p className="text-[10px] opacity-60">Exp: {formatIstDateTime(a.expiryDate).split(' ')[0]}</p>
                                                                                </div>
                                                                                <div className="text-right shrink-0">
                                                                                    <Badge variant="outline" className={cn("text-xs font-bold", TIER_TONE[a.tierDays])}>{a.daysUntilExpiry}d</Badge>
                                                                                    <p className="text-[10px] mt-1 opacity-70">Qty: {a.qtyRemaining}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {/* Desktop table */}
                                                                <div className="hidden md:block overflow-x-auto">
                                                                    <Table>
                                                                        <TableHeader className="bg-slate-50/50 dark:bg-zinc-950/50">
                                                                            <TableRow className="border-b border-slate-100 dark:border-zinc-800">
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase">Item</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase">Store</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase">Batch</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase text-right">Qty</TableHead>
                                                                                <TableHead className="font-bold text-slate-600 text-xs uppercase text-right">Expires In</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {board.expiryAlerts.map(a => (
                                                                                <TableRow key={`${a.inventoryItemId}-${a.batchNumber}`} className="border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900">
                                                                                    <TableCell className="font-bold text-slate-800 dark:text-zinc-200">{a.itemName}</TableCell>
                                                                                    <TableCell className="text-slate-600">{a.storeName}</TableCell>
                                                                                    <TableCell>
                                                                                        <div className="font-medium">{a.batchNumber}</div>
                                                                                        <div className="text-[10px] text-slate-400">Exp: {formatIstDateTime(a.expiryDate).split(' ')[0]}</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-slate-600">{a.qtyRemaining}</TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <Badge variant="outline" className={cn("px-2 py-0.5", TIER_TONE[a.tierDays])}>
                                                                                            {a.daysUntilExpiry} days
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </>
                                                        )}
                                                    </Card>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    )}


                            {tab === 'equipment' && <EquipmentMaintenancePanel />}


                            {tab === 'procurement' && <ProcurementPanel />}

                            {tab === 'compliance' && <NarcoticCompliancePanel />}

                            {tab === 'bloodbank' && <BloodBankManagementPanel />}

                            {tab === 'cssd' && <CssdBoardScreen embedded />}
                                </motion.div>
                            </AnimatePresence>
                        </SubscriptionReadOnlyOverlay>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryBoardScreen;
