import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Check, ShieldAlert, Thermometer } from 'lucide-react';
import { narcoticComplianceApi, type NarcoticRegisterEntry, type ColdChainReading } from '../services/narcoticComplianceApi';
import { storeService, type StoreItem } from '@/features/hospital/services/storeService';
import { inventoryApi, type InventoryItem } from '../services/inventoryApi';
import { formatIstDateTime } from '../utils/istDate';

type SubTab = 'register' | 'coldchain';

const FORM_TONE: Record<string, string> = {
    '3D': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30',
    '3E': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30',
    '3H': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-405 dark:border-amber-900/30',
};

export const NarcoticCompliancePanel: React.FC = () => {
    const { toast } = useToast();
    const [subTab, setSubTab] = useState<SubTab>('register');

    const [stores, setStores] = useState<StoreItem[]>([]);
    const [narcoticItems, setNarcoticItems] = useState<InventoryItem[]>([]);
    const [register, setRegister] = useState<NarcoticRegisterEntry[]>([]);
    const [readings, setReadings] = useState<ColdChainReading[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAll = () => {
        setLoading(true);
        Promise.all([
            storeService.getStores(),
            inventoryApi.getItems({ activeOnly: true }),
            narcoticComplianceApi.getNarcoticRegister(),
            narcoticComplianceApi.getColdChainReadings(),
        ]).then(([s, items, reg, r]) => {
            setStores(s);
            setNarcoticItems(items.filter(i => i.scheduleClass === 'NARCOTIC'));
            setRegister(reg);
            setReadings(r);
        }).catch(() => toast({ title: 'Could not load compliance data', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Dispense narcotic dialog (two-person witness sign-off, same pattern as BloodBankPanel) ---
    const [showDispense, setShowDispense] = useState(false);
    const [dispenseItemId, setDispenseItemId] = useState('');
    const [dispenseStoreId, setDispenseStoreId] = useState('');
    const [dispenseQty, setDispenseQty] = useState('1');
    const [dispensePrescriber, setDispensePrescriber] = useState('');
    const [dispenseWitness, setDispenseWitness] = useState('');
    const [dispenseBusy, setDispenseBusy] = useState(false);

    const submitDispense = async () => {
        if (!dispenseItemId || !dispenseStoreId || Number(dispenseQty) <= 0) {
            toast({ title: 'Item, store, and a positive quantity are required', variant: 'destructive' });
            return;
        }
        if (!dispensePrescriber.trim()) {
            toast({ title: 'Prescriber reference is required', variant: 'destructive' });
            return;
        }
        if (!dispenseWitness.trim()) {
            toast({ title: 'Witness name is required', variant: 'destructive' });
            return;
        }
        setDispenseBusy(true);
        try {
            await narcoticComplianceApi.dispenseNarcotic({
                inventoryItemId: dispenseItemId,
                storeId: dispenseStoreId,
                qty: Number(dispenseQty),
                prescriberRef: dispensePrescriber.trim(),
                witnessBy: dispenseWitness.trim(),
            });
            toast({ title: 'Narcotic dispensed' });
            setShowDispense(false);
            setDispenseItemId(''); setDispenseStoreId(''); setDispenseQty('1'); setDispensePrescriber(''); setDispenseWitness('');
            loadAll();
        } catch (err) {
            toast({ title: 'Could not dispense', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDispenseBusy(false);
        }
    };

    // --- Record cold-chain reading dialog ---
    const [showReading, setShowReading] = useState(false);
    const [readingStoreId, setReadingStoreId] = useState('');
    const [readingTemp, setReadingTemp] = useState('');
    const [readingBusy, setReadingBusy] = useState(false);

    const submitReading = async () => {
        if (!readingStoreId || readingTemp === '') {
            toast({ title: 'Store and temperature are required', variant: 'destructive' });
            return;
        }
        setReadingBusy(true);
        try {
            const res: any = await narcoticComplianceApi.recordColdChainReading(readingStoreId, Number(readingTemp));
            toast({ title: res?.breachFlag ? 'Reading recorded — breach flagged' : 'Reading recorded', variant: res?.breachFlag ? 'destructive' : undefined });
            setShowReading(false);
            setReadingStoreId(''); setReadingTemp('');
            loadAll();
        } catch (err) {
            toast({ title: 'Could not record reading', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReadingBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="inline-flex rounded-full p-1 bg-black/10 dark:bg-black/25 backdrop-blur-sm shrink-0">
                <button onClick={() => setSubTab('register')} className={cn('px-4 py-2 rounded-full text-xs font-bold active:scale-[0.98] transition-all flex items-center gap-1.5 border-none shadow-none', subTab === 'register' ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-650 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200')}>
                    <ShieldAlert className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Narcotics Register
                </button>
                <button onClick={() => setSubTab('coldchain')} className={cn('px-4 py-2 rounded-full text-xs font-bold active:scale-[0.98] transition-all flex items-center gap-1.5 border-none shadow-none', subTab === 'coldchain' ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-650 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200')}>
                    <Thermometer className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Cold Chain
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <>
                    {subTab === 'register' && (
                        <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Narcotics Register (Forms 3D/3E/3H)</h2>
                                <Button size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10" onClick={() => setShowDispense(true)}>
                                    <Plus className="h-4 w-4 mr-1" /> Dispense Narcotic
                                </Button>
                            </div>
                            {register.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No narcotics register entries yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {register.map(e => (
                                        <div key={e.registerEntryId} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/10 flex-wrap hover:border-slate-200 dark:hover:border-zinc-700 transition-all duration-305">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 dark:text-zinc-250 text-sm">{e.itemName}</span>
                                                <span className="text-xs text-slate-500 dark:text-zinc-450">Batch {e.batchNumber} &middot; {e.storeName}</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', FORM_TONE[e.formType])}>Form {e.formType}</Badge>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', e.direction === 'OUT' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30')}>
                                                    {e.direction} {e.qty}
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-slate-500 text-right">
                                                <p className="font-medium text-slate-700 dark:text-zinc-300">Balance: {e.balanceAfter} &middot; By {e.issuedBy} &middot; Witness {e.witnessBy}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatIstDateTime(e.recordedAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {subTab === 'coldchain' && (
                        <Card className="border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Cold-Chain Temperature Log</h2>
                                <Button size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10" onClick={() => setShowReading(true)}>
                                    <Plus className="h-4 w-4 mr-1" /> Record Reading
                                </Button>
                            </div>
                            {readings.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No readings recorded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {readings.map(r => (
                                        <div key={r.logId} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/10 flex-wrap hover:border-slate-200 dark:hover:border-zinc-700 transition-all duration-305">
                                            <div className="flex items-center gap-2">
                                                <Thermometer className={cn('h-4 w-4', r.breachFlag ? 'text-rose-500' : 'text-sky-500')} />
                                                <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{r.storeName}</span>
                                                <span className="text-sm font-mono font-bold text-slate-850 dark:text-zinc-150">{r.tempCelsius}°C</span>
                                                {r.breachFlag && <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30 rounded-full">Breach</Badge>}
                                            </div>
                                            <span className="text-[11px] text-slate-500">{formatIstDateTime(r.recordedAt)} &middot; {r.recordedBy}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}
                </>
            )}

            {/* DISPENSE NARCOTIC DIALOG */}
            <Dialog open={showDispense} onOpenChange={setShowDispense}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50">Dispense Narcotic</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">Requires a prescriber reference and a witness (two-person sign-off).</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Item</Label>
                            <Select value={dispenseItemId} onValueChange={setDispenseItemId}>
                                <SelectTrigger className="w-full h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150"><SelectValue placeholder="Select narcotic item" /></SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl">{narcoticItems.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>)}</SelectContent>
                            </Select>
                            {narcoticItems.length === 0 && <p className="text-[10px] text-amber-600 mt-1">No items are flagged Narcotic in Item Master yet.</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Store</Label>
                            <Select value={dispenseStoreId} onValueChange={setDispenseStoreId}>
                                <SelectTrigger className="w-full h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150"><SelectValue placeholder="Select store" /></SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl">{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Qty</Label>
                            <Input type="number" min={1} value={dispenseQty} onChange={e => setDispenseQty(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono dark:text-zinc-150" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Prescriber Reference</Label>
                            <Input value={dispensePrescriber} onChange={e => setDispensePrescriber(e.target.value)} placeholder="Doctor name / prescription no." className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Witness Name</Label>
                            <Input value={dispenseWitness} onChange={e => setDispenseWitness(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150" />
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                            <Button disabled={dispenseBusy} onClick={submitDispense} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10">
                                {dispenseBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />} Dispense
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RECORD COLD-CHAIN READING DIALOG */}
            <Dialog open={showReading} onOpenChange={setShowReading}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50">Record Cold-Chain Reading</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">Flags a breach automatically against the store's configured temperature range.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Store</Label>
                            <Select value={readingStoreId} onValueChange={setReadingStoreId}>
                                <SelectTrigger className="w-full h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150"><SelectValue placeholder="Select store" /></SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto rounded-xl">{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Temperature (°C)</Label>
                            <Input type="number" step="0.1" value={readingTemp} onChange={e => setReadingTemp(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono dark:text-zinc-150" />
                        </div>
                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                            <Button disabled={readingBusy} onClick={submitReading} className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/10">
                                {readingBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />} Record
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NarcoticCompliancePanel;
