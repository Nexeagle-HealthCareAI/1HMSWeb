import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Warehouse, Loader2, RefreshCw, AlertTriangle, PackageMinus, Clock, HardDrive, Truck, ShieldAlert, Droplet, Package2, ArrowLeftRight, Camera, Upload, ArrowLeft } from 'lucide-react';
import { inventoryApi, type InventoryBoard, type UnifiedStockVisibility } from '../services/inventoryApi';
import { equipmentApi, type EquipmentItem } from '../services/equipmentApi';
import { ProcurementPanel } from '../components/ProcurementPanel';
import { NarcoticCompliancePanel } from '../components/NarcoticCompliancePanel';
import { ItemMaster } from '@/features/hospital/components/masters/ItemMaster';
import { TransferStockPanel } from '../components/TransferStockPanel';
import { InternalRequestsPanel } from '../components/InternalRequestsPanel';
import { BulkStockUpload } from '../components/BulkStockUpload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';
import { Card } from '@/components/ui/card';

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

type Tab = 'stock' | 'items' | 'transfer' | 'expiry' | 'reorder' | 'equipment' | 'procurement' | 'compliance' | 'bloodbank' | 'cssd' | 'bulk';

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
    const [tab, setTab] = useState<Tab>('stock');

    const load = (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        Promise.all([inventoryApi.getBoard(), equipmentApi.getEquipment({ dueOnly: true })])
            .then(([b, e]) => { setBoard(b); setDueEquipment(e); })
            .catch(() => toast({ title: 'Could not load the inventory board', variant: 'destructive' }))
            .finally(() => { setLoading(false); setRefreshing(false); });
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if ((tab !== 'bloodbank' && tab !== 'cssd') || unifiedLoaded) return;
        setUnifiedLoading(true);
        inventoryApi.getUnifiedStock()
            .then(u => { setUnified(u); setUnifiedLoaded(true); })
            .catch(() => toast({ title: 'Could not load the unified stock view', variant: 'destructive' }))
            .finally(() => setUnifiedLoading(false));
    }, [tab, unifiedLoaded]); // eslint-disable-line react-hooks/exhaustive-deps



    const storeGroups = board.stockByStore.reduce<Record<string, typeof board.stockByStore>>((acc, r) => {
        (acc[r.storeName] ??= []).push(r);
        return acc;
    }, {});    const SIDEBAR_ITEMS: { id: Tab; label: string; icon: React.ElementType; badge?: React.ReactNode }[] = [
        { id: 'stock', label: 'Stock by Store', icon: Warehouse },
        { id: 'items', label: 'Item Master', icon: Package2 },
        { id: 'transfer', label: 'Transfer Stock', icon: ArrowLeftRight },
        { id: 'expiry', label: 'Expiry Alerts', icon: Clock, badge: board.expiryAlerts.length > 0 ? <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-white text-brand-600 border-none">{board.expiryAlerts.length}</Badge> : undefined },
        { id: 'reorder', label: 'Reorder Alerts', icon: PackageMinus, badge: board.reorderAlerts.length > 0 ? <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-white text-brand-600 border-none">{board.reorderAlerts.length}</Badge> : undefined },
        { id: 'equipment', label: 'Equipment Due', icon: HardDrive, badge: dueEquipment.length > 0 ? <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-white text-brand-600 border-none">{dueEquipment.length}</Badge> : undefined },
        { id: 'procurement', label: 'Procurement', icon: Truck },
        { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
        { id: 'bulk', label: 'Bulk Upload', icon: Upload },
        { id: 'bloodbank', label: 'Blood Bank', icon: Droplet },
        { id: 'cssd', label: 'CSSD Instruments', icon: Package2 },
    ];

    const activeTabTitle = SIDEBAR_ITEMS.find(t => t.id === tab)?.label || 'Inventory';

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
                
                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-3 px-2 mt-2">Modules</div>
                    {SIDEBAR_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = tab === item.id;
                        return (
                            <button 
                                key={item.id}
                                onClick={() => setTab(item.id)} 
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                                    isActive 
                                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                                        : 'text-slate-600 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-zinc-800 hover:text-brand-700 dark:hover:text-zinc-200'
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-brand-500/70")} /> 
                                <span className="truncate">{item.label}</span>
                                {item.badge}
                            </button>
                        );
                    })}
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
                    {SIDEBAR_ITEMS.map(item => {
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
                                {item.badge}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/20">
                {/* Header (Desktop Only) */}
                <div className="hidden lg:flex items-center justify-between p-6 bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 text-white shadow-md shadow-brand-500/10 shrink-0 z-10 sticky top-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Inventory Management</h2>
                        <p className="text-xs text-brand-100 mt-0.5">Manage stocks, store transfers, items, and compliance.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold" onClick={() => load(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-4 w-4 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
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
                            {tab === 'stock' && (
                                Object.keys(storeGroups).length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-slate-400 mx-auto w-full max-w-2xl shadow-md">
                                        No stock on hand yet. Receive stock via a batch to see it here.
                                    </div>
                               ) : (
                                    <div className="space-y-4">
                                        {Object.entries(storeGroups).map(([storeName, rows]) => (
                                            <Card key={storeName} className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md hover:shadow-lg transition-all mx-auto w-full max-w-2xl">
                                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-3">{storeName}</h2>
                                                <div className="space-y-1.5">
                                                    {rows.map(r => (
                                                        <div key={`${r.inventoryItemId}-${r.storeId}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm truncate">{r.itemName}</span>
                                                                <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0 rounded-full">{r.category}</Badge>
                                                            </div>
                                                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 shrink-0">{r.qtyOnHand.toLocaleString('en-IN')} {r.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )
                            )}

                            {tab === 'bulk' && <BulkStockUpload onSuccess={() => load(true)} />}

                            {tab === 'items' && (
                                <div className="h-[70vh] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                                    <ItemMaster />
                                </div>
                            )}

                            {tab === 'transfer' && (
                                <Tabs defaultValue="requests" className="space-y-4">
                                    <TabsList>
                                        <TabsTrigger value="requests">Internal Requests</TabsTrigger>
                                        <TabsTrigger value="manual">Manual Transfer</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="requests" className="mt-0">
                                        <InternalRequestsPanel />
                                    </TabsContent>
                                    <TabsContent value="manual" className="mt-0">
                                        <TransferStockPanel stockByStore={board.stockByStore} onSuccess={() => load(true)} />
                                    </TabsContent>
                                </Tabs>
                            )}

                            {tab === 'expiry' && (
                                <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md mx-auto w-full max-w-2xl rounded-2xl">
                                    <div className="mb-3">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Expiry Alerts</h2>
                                    </div>
                                    {board.expiryAlerts.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">No batches expiring within 90 days.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {board.expiryAlerts.map(a => (
                                                <div key={a.batchId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all flex-wrap">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm truncate">{a.itemName}</span>
                                                        <span className="text-xs text-slate-550">Batch {a.batchNumber} &middot; {a.storeName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs text-slate-500">{a.remainingQty.toLocaleString('en-IN')} left</span>
                                                        <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', TIER_TONE[a.tier])}>
                                                            {a.daysToExpiry <= 0 ? 'Expired' : `${a.daysToExpiry}d left`} &middot; {formatIstDateTime(a.expiryDate)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {tab === 'reorder' && (
                                <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md mx-auto w-full max-w-2xl rounded-2xl">
                                    <div className="mb-3">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Reorder Alerts</h2>
                                    </div>
                                    {board.reorderAlerts.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">No items at or below their reorder level.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {board.reorderAlerts.map(a => (
                                                <div key={a.inventoryItemId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all flex-wrap">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <PackageMinus className="h-4 w-4 text-rose-500 shrink-0" />
                                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm truncate">{a.itemName}</span>
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0 rounded-full">{a.category}</Badge>
                                                    </div>
                                                    <div className="text-xs text-slate-550 shrink-0">
                                                        {a.currentStock.toLocaleString('en-IN')} / min {a.minStockLevel.toLocaleString('en-IN')} {a.unit}
                                                        {a.reorderQty > 0 && <span className="ml-1.5 font-semibold text-slate-700 dark:text-zinc-300">&middot; reorder {a.reorderQty.toLocaleString('en-IN')}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {tab === 'equipment' && (
                                <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md mx-auto w-full max-w-2xl rounded-2xl">
                                    <div className="mb-3">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Equipment Due</h2>
                                    </div>
                                    {dueEquipment.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">No equipment due for maintenance/calibration.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {dueEquipment.map(e => (
                                                <div key={e.equipmentId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all flex-wrap">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <HardDrive className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm truncate">{e.name}</span>
                                                        <span className="text-xs text-slate-550">{e.assetCode} {e.department ? `\u00B7 ${e.department}` : ''}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 shrink-0 rounded-full">
                                                        Due {e.nextDueAt ? formatIstDateTime(e.nextDueAt) : ''}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {tab === 'procurement' && <ProcurementPanel />}

                            {tab === 'compliance' && <NarcoticCompliancePanel />}

                            {tab === 'bloodbank' && (
                                unifiedLoading ? (
                                    <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-4">
                                        <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md mx-auto w-full max-w-2xl rounded-2xl">
                                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-3 flex items-center gap-1.5">
                                                <Droplet className="h-4 w-4 text-rose-500" /> Blood Bank Units
                                            </h2>
                                            {unified.bloodByStore.length === 0 ? (
                                                <p className="text-sm text-slate-400 text-center py-4">No blood units recorded.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {unified.bloodByStore.map((r, i) => (
                                                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{r.storeName}</span>
                                                                <Badge variant="outline" className="text-[9px] font-bold rounded-full">{r.component} &middot; {r.bloodGroup.replace('_', ' ')}</Badge>
                                                                <Badge variant="outline" className="text-[9px] font-bold rounded-full">{r.status}</Badge>
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-zinc-100">{r.bagCount} bag(s) &middot; {r.totalVolumeMl.toLocaleString('en-IN')} mL</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                )
                            )}

                            {tab === 'cssd' && (
                                unifiedLoading ? (
                                    <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-4">
                                        <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-md mx-auto w-full max-w-2xl rounded-2xl">
                                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-3 flex items-center gap-1.5">
                                                <Package2 className="h-4 w-4 text-violet-500" /> CSSD Instrument Sets
                                            </h2>
                                            {unified.cssdByStore.length === 0 ? (
                                                <p className="text-sm text-slate-400 text-center py-4">No instrument sets recorded.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {unified.cssdByStore.map((r, i) => (
                                                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/10 hover:border-slate-200 dark:hover:border-zinc-800 transition-all flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{r.storeName}</span>
                                                                <Badge variant="outline" className="text-[9px] font-bold rounded-full">{r.currentStatus.replace('_', ' ')}</Badge>
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-zinc-100">{r.setCount} set(s)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                )
                            )}
                        </SubscriptionReadOnlyOverlay>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryBoardScreen;
