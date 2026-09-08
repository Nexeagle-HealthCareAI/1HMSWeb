import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Droplet, PlusCircle, Trash2 } from 'lucide-react';
import {
    bloodBankApi, type BloodComponent, type BloodGroup, type BloodBagStatus,
    type BloodBankInventoryRow, type BloodBankLedgerRow,
} from '../services/bloodBankApi';
import { formatIstDateTime } from '../utils/istDate';

const COMPONENTS: BloodComponent[] = ['WHOLE', 'PRBC', 'FFP', 'PLATELET', 'CRYO'];
const GROUPS: BloodGroup[] = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG'];
const groupLabel = (g: string) => g.replace('_POS', '+').replace('_NEG', '-');

const statusBadge = (status: string) => cn(
    'text-[10px] font-bold rounded-full',
    status === 'AVAILABLE' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
    status === 'RESERVED' && 'bg-amber-50 text-amber-700 border-amber-200',
    status === 'TRANSFUSED' && 'bg-slate-100 text-slate-600',
    status === 'DISCARDED' && 'bg-rose-50 text-rose-700 border-rose-200',
);

const EMPTY_RECEIVE = {
    bagNumber: '', component: '' as BloodComponent | '', bloodGroup: '' as BloodGroup | '',
    volumeMl: '', donorRef: '', collectedAt: '', expiresAt: '', storageLocation: '',
};

// Hospital-wide Blood Bank management -- unlike BloodBankPanel (per-admission reserve/transfuse,
// mounted inside a patient's own chart), this is the standalone screen for actually stocking the
// bank: receiving new units, seeing every unit regardless of status, discarding one, and a
// hospital-wide transfusion ledger. Nothing here posted the intake form before -- ReceiveBag and
// DiscardBag already existed on the backend and in bloodBankApi, just never had a UI caller.
export const BloodBankManagementPanel: React.FC = () => {
    const { toast } = useToast();
    const [tab, setTab] = useState<'receive' | 'stock' | 'ledger'>('stock');

    const [receiving, setReceiving] = useState(false);
    const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE);

    const [stock, setStock] = useState<BloodBankInventoryRow[]>([]);
    const [stockLoading, setStockLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<BloodBagStatus | 'ALL'>('ALL');
    const [discardingId, setDiscardingId] = useState<string | null>(null);
    const [discardReason, setDiscardReason] = useState('');

    const [ledger, setLedger] = useState<BloodBankLedgerRow[]>([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerLoaded, setLedgerLoaded] = useState(false);

    const loadStock = () => {
        setStockLoading(true);
        bloodBankApi.getInventory(statusFilter === 'ALL' ? undefined : statusFilter)
            .then(setStock)
            .catch(() => toast({ title: 'Could not load blood bank stock', variant: 'destructive' }))
            .finally(() => setStockLoading(false));
    };

    useEffect(() => { loadStock(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (tab !== 'ledger' || ledgerLoaded) return;
        setLedgerLoading(true);
        bloodBankApi.getLedger()
            .then(rows => { setLedger(rows); setLedgerLoaded(true); })
            .catch(() => toast({ title: 'Could not load the transfusion ledger', variant: 'destructive' }))
            .finally(() => setLedgerLoading(false));
    }, [tab, ledgerLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    const submitReceive = async () => {
        const f = receiveForm;
        if (!f.bagNumber.trim() || !f.component || !f.bloodGroup || !f.volumeMl || !f.collectedAt || !f.expiresAt) {
            toast({ title: 'Bag number, component, blood group, volume, collected and expiry dates are required', variant: 'destructive' });
            return;
        }
        setReceiving(true);
        try {
            await bloodBankApi.receiveBag({
                bagNumber: f.bagNumber.trim(),
                component: f.component,
                bloodGroup: f.bloodGroup,
                volumeMl: Number(f.volumeMl),
                donorRef: f.donorRef.trim() || undefined,
                collectedAt: new Date(f.collectedAt).toISOString(),
                expiresAt: new Date(f.expiresAt).toISOString(),
                storageLocation: f.storageLocation.trim() || undefined,
            });
            toast({ title: 'Blood unit received into stock.' });
            setReceiveForm(EMPTY_RECEIVE);
            setTab('stock');
            loadStock();
        } catch (err) {
            toast({ title: 'Could not receive the unit', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReceiving(false);
        }
    };

    const submitDiscard = async (bloodBagId: string) => {
        if (!discardReason.trim()) {
            toast({ title: 'A discard reason is required', variant: 'destructive' });
            return;
        }
        setDiscardingId(bloodBagId);
        try {
            await bloodBankApi.discardBag(bloodBagId, discardReason.trim());
            toast({ title: 'Unit discarded.' });
            setDiscardReason('');
            loadStock();
        } catch (err) {
            toast({ title: 'Could not discard the unit', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDiscardingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
                <TabsList>
                    <TabsTrigger value="stock">Current Stock</TabsTrigger>
                    <TabsTrigger value="receive">Receive Unit</TabsTrigger>
                    <TabsTrigger value="ledger">Transfusion Ledger</TabsTrigger>
                </TabsList>

                <TabsContent value="stock" className="mt-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                <Droplet className="h-4 w-4 text-rose-500" /> All Units
                            </h2>
                            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as BloodBagStatus | 'ALL')}>
                                <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="AVAILABLE">Available</SelectItem>
                                    <SelectItem value="RESERVED">Reserved</SelectItem>
                                    <SelectItem value="TRANSFUSED">Transfused</SelectItem>
                                    <SelectItem value="DISCARDED">Discarded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {stockLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : stock.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No units recorded yet. Use "Receive Unit" to add the first one.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bag #</TableHead>
                                            <TableHead>Component / Group</TableHead>
                                            <TableHead>Volume</TableHead>
                                            <TableHead>Expires</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>For Patient</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stock.map(b => (
                                            <TableRow key={b.bloodBagId}>
                                                <TableCell className="font-mono text-xs font-semibold">{b.bagNumber}</TableCell>
                                                <TableCell className="text-sm">{b.component} · {groupLabel(b.bloodGroup)}</TableCell>
                                                <TableCell className="text-sm">{b.volumeMl} mL</TableCell>
                                                <TableCell className="text-xs text-slate-500">{formatIstDateTime(b.expiresAt)}</TableCell>
                                                <TableCell><Badge variant="outline" className={statusBadge(b.status)}>{b.status}</Badge></TableCell>
                                                <TableCell className="text-xs text-slate-600">{b.reservedForPatientName || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    {(b.status === 'AVAILABLE' || b.status === 'RESERVED') && (
                                                        discardingId === b.bloodBagId ? (
                                                            <div className="flex items-center gap-1.5 justify-end">
                                                                <Input
                                                                    placeholder="Reason"
                                                                    value={discardReason}
                                                                    onChange={e => setDiscardReason(e.target.value)}
                                                                    className="h-8 w-32 text-xs"
                                                                    autoFocus
                                                                />
                                                                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => submitDiscard(b.bloodBagId)}>Confirm</Button>
                                                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDiscardingId(null); setDiscardReason(''); }}>Cancel</Button>
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDiscardingId(b.bloodBagId); setDiscardReason(''); }}>
                                                                <Trash2 className="h-3 w-3 mr-1" /> Discard
                                                            </Button>
                                                        )
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="receive" className="mt-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 max-w-xl space-y-4">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <PlusCircle className="h-4 w-4 text-brand-600" /> Receive a New Unit
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Bag Number *</Label>
                                <Input value={receiveForm.bagNumber} onChange={e => setReceiveForm(f => ({ ...f, bagNumber: e.target.value }))} placeholder="e.g. BB-2026-0042" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Donor Ref</Label>
                                <Input value={receiveForm.donorRef} onChange={e => setReceiveForm(f => ({ ...f, donorRef: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Component *</Label>
                                <Select value={receiveForm.component} onValueChange={v => setReceiveForm(f => ({ ...f, component: v as BloodComponent }))}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{COMPONENTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Blood Group *</Label>
                                <Select value={receiveForm.bloodGroup} onValueChange={v => setReceiveForm(f => ({ ...f, bloodGroup: v as BloodGroup }))}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{GROUPS.map(g => <SelectItem key={g} value={g}>{groupLabel(g)}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Volume (mL) *</Label>
                                <Input type="number" min="1" value={receiveForm.volumeMl} onChange={e => setReceiveForm(f => ({ ...f, volumeMl: e.target.value }))} placeholder="350" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Storage Location</Label>
                                <Input value={receiveForm.storageLocation} onChange={e => setReceiveForm(f => ({ ...f, storageLocation: e.target.value }))} placeholder="e.g. Fridge 1, Shelf B" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Collected At *</Label>
                                <Input type="datetime-local" value={receiveForm.collectedAt} onChange={e => setReceiveForm(f => ({ ...f, collectedAt: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Expires At *</Label>
                                <Input type="datetime-local" value={receiveForm.expiresAt} onChange={e => setReceiveForm(f => ({ ...f, expiresAt: e.target.value }))} />
                            </div>
                        </div>
                        <Button onClick={submitReceive} disabled={receiving} className="w-full sm:w-auto">
                            {receiving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            {receiving ? 'Receiving...' : 'Receive Unit'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="ledger" className="mt-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Transfusion Ledger (last 500)</h2>
                        {ledgerLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : ledger.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No transfusions recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Bag #</TableHead>
                                            <TableHead>Component / Group</TableHead>
                                            <TableHead>Volume</TableHead>
                                            <TableHead>Reaction</TableHead>
                                            <TableHead>By / Witness</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.map(t => (
                                            <TableRow key={t.transfusionEventId}>
                                                <TableCell className="text-xs text-slate-500">{formatIstDateTime(t.startedAt)}</TableCell>
                                                <TableCell className="text-sm font-medium">{t.patientName || t.patientId || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{t.bagNumber}</TableCell>
                                                <TableCell className="text-sm">{t.component} · {groupLabel(t.bloodGroup)}</TableCell>
                                                <TableCell className="text-sm">{t.volumeGivenMl} mL</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', t.reaction !== 'NONE' && 'bg-rose-50 text-rose-700 border-rose-200')}>
                                                        {t.reaction}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{t.administeredBy} / {t.witnessName}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BloodBankManagementPanel;
