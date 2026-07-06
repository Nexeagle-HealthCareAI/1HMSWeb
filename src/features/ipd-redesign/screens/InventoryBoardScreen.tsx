import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Warehouse, Loader2, RefreshCw, AlertTriangle, PackageMinus, Clock, HardDrive, Truck, ShieldAlert, Droplet, Package2 } from 'lucide-react';
import { inventoryApi, type InventoryBoard, type UnifiedStockVisibility } from '../services/inventoryApi';
import { equipmentApi, type EquipmentItem } from '../services/equipmentApi';
import { formatIstDateTime } from '../utils/istDate';
import { ProcurementPanel } from '../components/ProcurementPanel';
import { NarcoticCompliancePanel } from '../components/NarcoticCompliancePanel';

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

type Tab = 'stock' | 'expiry' | 'reorder' | 'equipment' | 'procurement' | 'compliance' | 'allstores';

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

    // Lazy-loaded on first visit — a cross-module summary query, no need to fetch it eagerly.
    useEffect(() => {
        if (tab !== 'allstores' || unifiedLoaded) return;
        setUnifiedLoading(true);
        inventoryApi.getUnifiedStock()
            .then(u => { setUnified(u); setUnifiedLoaded(true); })
            .catch(() => toast({ title: 'Could not load the unified stock view', variant: 'destructive' }))
            .finally(() => setUnifiedLoading(false));
    }, [tab, unifiedLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    const storeGroups = board.stockByStore.reduce<Record<string, typeof board.stockByStore>>((acc, r) => {
        (acc[r.storeName] ??= []).push(r);
        return acc;
    }, {});

    return (
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <Warehouse className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Inventory Management</h1>
                        <p className="text-xs text-slate-500">Stock by store, expiry alerts, reorder alerts.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing || loading}>
                    <RefreshCw className={cn('h-4 w-4 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button onClick={() => setTab('stock')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'stock' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Warehouse className="h-3.5 w-3.5" /> Stock by Store
                </button>
                <button onClick={() => setTab('expiry')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'expiry' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Clock className="h-3.5 w-3.5" /> Expiry Alerts
                    {board.expiryAlerts.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] font-bold bg-white">{board.expiryAlerts.length}</Badge>}
                </button>
                <button onClick={() => setTab('reorder')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'reorder' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <PackageMinus className="h-3.5 w-3.5" /> Reorder Alerts
                    {board.reorderAlerts.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] font-bold bg-white">{board.reorderAlerts.length}</Badge>}
                </button>
                <button onClick={() => setTab('equipment')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'equipment' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <HardDrive className="h-3.5 w-3.5" /> Equipment Due
                    {dueEquipment.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] font-bold bg-white">{dueEquipment.length}</Badge>}
                </button>
                <button onClick={() => setTab('procurement')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'procurement' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Truck className="h-3.5 w-3.5" /> Procurement
                </button>
                <button onClick={() => setTab('compliance')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'compliance' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <ShieldAlert className="h-3.5 w-3.5" /> Compliance
                </button>
                <button onClick={() => setTab('allstores')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', tab === 'allstores' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Package2 className="h-3.5 w-3.5" /> Blood Bank &amp; CSSD (by Store)
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <>
                    {tab === 'stock' && (
                        Object.keys(storeGroups).length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                                No stock on hand yet. Receive stock via a batch to see it here.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(storeGroups).map(([storeName, rows]) => (
                                    <div key={storeName} className="rounded-xl border border-slate-200 bg-white p-5">
                                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">{storeName}</h2>
                                        <div className="space-y-1.5">
                                            {rows.map(r => (
                                                <div key={`${r.inventoryItemId}-${r.storeId}`} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-semibold text-slate-800 text-sm truncate">{r.itemName}</span>
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0">{r.category}</Badge>
                                                    </div>
                                                    <span className="text-sm font-mono font-bold text-slate-900 shrink-0">{r.qtyOnHand.toLocaleString('en-IN')} {r.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {tab === 'expiry' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            {board.expiryAlerts.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">No batches expiring within 90 days.</p>
                            ) : (
                                <div className="space-y-2">
                                    {board.expiryAlerts.map(a => (
                                        <div key={a.batchId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                                <span className="font-semibold text-slate-800 text-sm truncate">{a.itemName}</span>
                                                <span className="text-xs text-slate-500">Batch {a.batchNumber} · {a.storeName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-slate-500">{a.remainingQty.toLocaleString('en-IN')} left</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', TIER_TONE[a.tier])}>
                                                    {a.daysToExpiry <= 0 ? 'Expired' : `${a.daysToExpiry}d left`} · {formatIstDateTime(a.expiryDate)}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'reorder' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            {board.reorderAlerts.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">No items at or below their reorder level.</p>
                            ) : (
                                <div className="space-y-2">
                                    {board.reorderAlerts.map(a => (
                                        <div key={a.inventoryItemId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <PackageMinus className="h-4 w-4 text-rose-500 shrink-0" />
                                                <span className="font-semibold text-slate-800 text-sm truncate">{a.itemName}</span>
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0">{a.category}</Badge>
                                            </div>
                                            <div className="text-xs text-slate-500 shrink-0">
                                                {a.currentStock.toLocaleString('en-IN')} / min {a.minStockLevel.toLocaleString('en-IN')} {a.unit}
                                                {a.reorderQty > 0 && <span className="ml-1.5 font-semibold text-slate-700">· reorder {a.reorderQty.toLocaleString('en-IN')}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'equipment' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            {dueEquipment.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">No equipment due for maintenance/calibration.</p>
                            ) : (
                                <div className="space-y-2">
                                    {dueEquipment.map(e => (
                                        <div key={e.equipmentId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <HardDrive className="h-4 w-4 text-amber-500 shrink-0" />
                                                <span className="font-semibold text-slate-800 text-sm truncate">{e.name}</span>
                                                <span className="text-xs text-slate-500">{e.assetCode} {e.department ? `· ${e.department}` : ''}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                                Due {e.nextDueAt ? formatIstDateTime(e.nextDueAt) : ''}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'procurement' && <ProcurementPanel />}

                    {tab === 'compliance' && <NarcoticCompliancePanel />}

                    {tab === 'allstores' && (
                        unifiedLoading ? (
                            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-5">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Pharmacy/Consumable Stock</h2>
                                    {unified.inventoryByStore.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">No stock recorded.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {unified.inventoryByStore.map(r => (
                                                <div key={r.storeName} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                                                    <span className="font-semibold text-slate-800 text-sm">{r.storeName}</span>
                                                    <span className="text-xs text-slate-500">{r.itemCount} item(s) in stock</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-5">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                                        <Droplet className="h-3.5 w-3.5 text-rose-500" /> Blood Bank
                                    </h2>
                                    {unified.bloodByStore.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">No blood units recorded.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {unified.bloodByStore.map((r, i) => (
                                                <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-800 text-sm">{r.storeName}</span>
                                                        <Badge variant="outline" className="text-[9px] font-bold">{r.component} · {r.bloodGroup.replace('_', ' ')}</Badge>
                                                        <Badge variant="outline" className="text-[9px] font-bold">{r.status}</Badge>
                                                    </div>
                                                    <span className="text-xs text-slate-500">{r.bagCount} bag(s) · {r.totalVolumeMl.toLocaleString('en-IN')} mL</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-5">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                                        <Package2 className="h-3.5 w-3.5 text-violet-500" /> CSSD
                                    </h2>
                                    {unified.cssdByStore.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">No instrument sets recorded.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {unified.cssdByStore.map((r, i) => (
                                                <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-800 text-sm">{r.storeName}</span>
                                                        <Badge variant="outline" className="text-[9px] font-bold">{r.currentStatus.replace('_', ' ')}</Badge>
                                                    </div>
                                                    <span className="text-xs text-slate-500">{r.setCount} set(s)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default InventoryBoardScreen;
