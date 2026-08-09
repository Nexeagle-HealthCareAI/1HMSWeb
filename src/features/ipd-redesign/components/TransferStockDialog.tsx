import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeftRight } from 'lucide-react';
import type { StoreItem } from '@/features/hospital/services/storeService';
import type { StockOverviewRow } from '../services/inventoryApi';
import { TransferStockPanel } from './TransferStockPanel';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardStores: StoreItem[];
    stockByStore: StockOverviewRow[];
    onSuccess: () => void;
}

export const TransferStockDialog: React.FC<Props> = ({ open, onOpenChange, boardStores, stockByStore, onSuccess }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-0 shadow-xl bg-transparent">
            <DialogHeader className="sr-only">
                <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> Transfer Stock</DialogTitle>
                <DialogDescription>Move stock out of this board's store.</DialogDescription>
            </DialogHeader>
            <TransferStockPanel
                stockByStore={stockByStore}
                restrictFromStores={boardStores}
                lockedFromStoreId={boardStores.length === 1 ? boardStores[0].storeId : undefined}
                onSuccess={() => { onSuccess(); onOpenChange(false); }}
            />
        </DialogContent>
    </Dialog>
);
