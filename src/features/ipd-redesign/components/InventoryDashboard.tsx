import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { PackageMinus, Clock, HardDrive, Package2, ArrowRight } from 'lucide-react';
import type { InventoryBoard } from '../services/inventoryApi';
import type { EquipmentItem } from '../services/equipmentApi';
import { cn } from '@/lib/utils';

interface Props {
    board: InventoryBoard;
    dueEquipment: EquipmentItem[];
    onNavigate: (tab: any) => void;
}

export const InventoryDashboard: React.FC<Props> = ({ board, dueEquipment, onNavigate }) => {
    
    const uniqueItems = useMemo(() => {
        const itemIds = new Set<string>();
        board.stockByStore.forEach(s => itemIds.add(s.inventoryItemId));
        return itemIds.size;
    }, [board.stockByStore]);

    const cards = [
        {
            title: 'Current Stock',
            value: uniqueItems,
            subtitle: 'Unique items in stock',
            icon: Package2,
            color: 'text-brand-600',
            bg: 'bg-brand-50 dark:bg-brand-950/50',
            tab: 'stock'
        },
        {
            title: 'Low Stock',
            value: board.reorderAlerts.length,
            subtitle: 'Items below minimum',
            icon: PackageMinus,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-950/50',
            tab: 'alerts'
        },
        {
            title: 'Expiring Soon',
            value: board.expiryAlerts.length,
            subtitle: 'Within 90 days',
            icon: Clock,
            color: 'text-rose-600',
            bg: 'bg-rose-50 dark:bg-rose-950/50',
            tab: 'alerts'
        },
        {
            title: 'Equipment Due',
            value: dueEquipment.length,
            subtitle: 'Maintenance required',
            icon: HardDrive,
            color: 'text-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-950/50',
            tab: 'equipment'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div
                            key={c.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card 
                                className="p-6 flex flex-col justify-between h-full cursor-pointer hover:shadow-lg transition-all border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 group"
                                onClick={() => onNavigate(c.tab)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", c.bg, c.color)}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 dark:text-zinc-700 group-hover:text-brand-500 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                                </div>
                                <div className="mt-4">
                                    <p className="text-4xl font-black tracking-tight text-slate-800 dark:text-zinc-100">{c.value}</p>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mt-1">{c.title}</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">{c.subtitle}</p>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {/* Future expansions can go here, like recent requests or a chart */}
                <Card className="p-6 border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <PackageMinus className="h-5 w-5 text-amber-500" /> Critical Low Stock
                    </h3>
                    {board.reorderAlerts.length === 0 ? (
                        <p className="text-sm text-slate-500">No critical low stock alerts.</p>
                    ) : (
                        <div className="space-y-3">
                            {board.reorderAlerts.slice(0, 5).map(a => (
                                <div key={a.inventoryItemId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{a.itemName}</p>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-wider">{a.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-amber-600">{a.currentStock} <span className="text-[10px] text-amber-600/70">{a.unit}</span></p>
                                        <p className="text-[10px] text-slate-400">Min: {a.minStockLevel}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-6 border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-rose-500" /> Expiring Within 30 Days
                    </h3>
                    {board.expiryAlerts.filter(a => a.daysUntilExpiry <= 30).length === 0 ? (
                        <p className="text-sm text-slate-500">No items expiring within 30 days.</p>
                    ) : (
                        <div className="space-y-3">
                            {board.expiryAlerts.filter(a => a.daysUntilExpiry <= 30).slice(0, 5).map(a => (
                                <div key={`${a.inventoryItemId}-${a.batchNumber}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{a.itemName}</p>
                                        <p className="text-[11px] text-slate-500">Batch: {a.batchNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-rose-600">{a.daysUntilExpiry} days</p>
                                        <p className="text-[10px] text-slate-400">Qty: {a.qtyRemaining}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
};
