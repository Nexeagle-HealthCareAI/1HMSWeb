import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    '3D': 'bg-sky-50 text-sky-700 border-sky-200',
    '3E': 'bg-violet-50 text-violet-700 border-violet-200',
    '3H': 'bg-amber-50 text-amber-700 border-amber-200',
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
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button onClick={() => setSubTab('register')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', subTab === 'register' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <ShieldAlert className="h-3.5 w-3.5" /> Narcotics Register
                </button>
                <button onClick={() => setSubTab('coldchain')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5', subTab === 'coldchain' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Thermometer className="h-3.5 w-3.5" /> Cold Chain
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <>
                    {subTab === 'register' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Narcotics Register (Forms 3D/3E/3H)</h2>
                                <Button size="sm" className="h-8 bg-brand-600 hover:bg-brand-700" onClick={() => setShowDispense(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Dispense Narcotic
                                </Button>
                            </div>
                            {register.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No narcotics register entries yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {register.map(e => (
                                        <div key={e.registerEntryId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{e.itemName}</span>
                                                <span className="text-xs text-slate-500">Batch {e.batchNumber} · {e.storeName}</span>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', FORM_TONE[e.formType])}>Form {e.formType}</Badge>
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', e.direction === 'OUT' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                                                    {e.direction} {e.qty}
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-slate-500 text-right">
                                                <p>Balance: {e.balanceAfter} · By {e.issuedBy} · Witness {e.witnessBy}</p>
                                                <p>{formatIstDateTime(e.recordedAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {subTab === 'coldchain' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cold-Chain Temperature Log</h2>
                                <Button size="sm" className="h-8 bg-brand-600 hover:bg-brand-700" onClick={() => setShowReading(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Record Reading
                                </Button>
                            </div>
                            {readings.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">No readings recorded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {readings.map(r => (
                                        <div key={r.logId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Thermometer className={cn('h-4 w-4', r.breachFlag ? 'text-rose-500' : 'text-sky-500')} />
                                                <span className="font-semibold text-slate-800 text-sm">{r.storeName}</span>
                                                <span className="text-sm font-mono">{r.tempCelsius}°C</span>
                                                {r.breachFlag && <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200">Breach</Badge>}
                                            </div>
                                            <span className="text-[11px] text-slate-500">{formatIstDateTime(r.recordedAt)} · {r.recordedBy}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* DISPENSE NARCOTIC DIALOG */}
            <Dialog open={showDispense} onOpenChange={setShowDispense}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Dispense Narcotic</DialogTitle>
                        <DialogDescription>Requires a prescriber reference and a witness (two-person sign-off).</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Item</Label>
                            <Select value={dispenseItemId} onValueChange={setDispenseItemId}>
                                <SelectTrigger><SelectValue placeholder="Select narcotic item" /></SelectTrigger>
                                <SelectContent>{narcoticItems.map(i => <SelectItem key={i.inventoryItemId} value={i.inventoryItemId}>{i.itemName}</SelectItem>)}</SelectContent>
                            </Select>
                            {narcoticItems.length === 0 && <p className="text-[10px] text-amber-600">No items are flagged Narcotic in Item Master yet.</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Store</Label>
                            <Select value={dispenseStoreId} onValueChange={setDispenseStoreId}>
                                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                                <SelectContent>{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Qty</Label>
                            <Input type="number" min={1} value={dispenseQty} onChange={e => setDispenseQty(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Prescriber Reference</Label>
                            <Input value={dispensePrescriber} onChange={e => setDispensePrescriber(e.target.value)} placeholder="Doctor name / prescription no." />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Witness Name</Label>
                            <Input value={dispenseWitness} onChange={e => setDispenseWitness(e.target.value)} />
                        </div>
                        <div className="flex justify-end">
                            <Button disabled={dispenseBusy} onClick={submitDispense} className="bg-brand-600 hover:bg-brand-700">
                                {dispenseBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Dispense
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RECORD COLD-CHAIN READING DIALOG */}
            <Dialog open={showReading} onOpenChange={setShowReading}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Cold-Chain Reading</DialogTitle>
                        <DialogDescription>Flags a breach automatically against the store's configured temperature range.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Store</Label>
                            <Select value={readingStoreId} onValueChange={setReadingStoreId}>
                                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                                <SelectContent>{stores.map(s => <SelectItem key={s.storeId} value={s.storeId}>{s.storeName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Temperature (°C)</Label>
                            <Input type="number" step="0.1" value={readingTemp} onChange={e => setReadingTemp(e.target.value)} />
                        </div>
                        <div className="flex justify-end">
                            <Button disabled={readingBusy} onClick={submitReading} className="bg-brand-600 hover:bg-brand-700">
                                {readingBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Record
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NarcoticCompliancePanel;
