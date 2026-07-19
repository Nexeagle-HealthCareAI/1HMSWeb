import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Droplet, AlertTriangle, Check } from 'lucide-react';
import {
    bloodBankApi, type BloodBag, type AdmissionBloodBag, type TransfusionEventRecord,
    type BloodComponent, type BloodGroup, type CrossmatchResult, type TransfusionReaction,
} from '../services/bloodBankApi';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const COMPONENTS: BloodComponent[] = ['WHOLE', 'PRBC', 'FFP', 'PLATELET', 'CRYO'];
const GROUPS: BloodGroup[] = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG'];
const groupLabel = (g: string) => g.replace('_POS', '+').replace('_NEG', '-');

const statusBadge = (status: string) => cn(
    'text-[10px] font-bold',
    status === 'AVAILABLE' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
    status === 'RESERVED' && 'bg-amber-50 text-amber-700 border-amber-200',
    status === 'TRANSFUSED' && 'bg-slate-100 text-slate-600',
    status === 'DISCARDED' && 'bg-rose-50 text-rose-700 border-rose-200',
);

export const BloodBankPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [loading, setLoading] = useState(true);
    const [reservedBags, setReservedBags] = useState<AdmissionBloodBag[]>([]);
    const [transfusions, setTransfusions] = useState<TransfusionEventRecord[]>([]);

    const [poolOpen, setPoolOpen] = useState(false);
    const [poolComponent, setPoolComponent] = useState<BloodComponent | ''>('');
    const [poolGroup, setPoolGroup] = useState<BloodGroup | ''>('');
    const [pool, setPool] = useState<BloodBag[]>([]);
    const [poolLoading, setPoolLoading] = useState(false);
    const [reservingBagId, setReservingBagId] = useState<string | null>(null);

    const [transfuseBagId, setTransfuseBagId] = useState<string | null>(null);
    const [volumeGivenMl, setVolumeGivenMl] = useState('');
    const [vitalsBefore, setVitalsBefore] = useState('');
    const [vitalsAfter, setVitalsAfter] = useState('');
    const [reaction, setReaction] = useState<TransfusionReaction>('NONE');
    const [reactionNotes, setReactionNotes] = useState('');
    const [witnessName, setWitnessName] = useState('');
    const [transfuseBusy, setTransfuseBusy] = useState(false);

    const load = () => {
        setLoading(true);
        bloodBankApi.getHistory(admissionId)
            .then(({ reservedBags, transfusions }) => { setReservedBags(reservedBags); setTransfusions(transfusions); })
            .catch(() => { setReservedBags([]); setTransfusions([]); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const searchPool = () => {
        setPoolLoading(true);
        bloodBankApi.getPool({ component: poolComponent || undefined, bloodGroup: poolGroup || undefined })
            .then(setPool)
            .catch(() => setPool([]))
            .finally(() => setPoolLoading(false));
    };

    useEffect(() => { if (poolOpen) searchPool(); }, [poolOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const reserve = async (bagId: string, crossmatchResult: CrossmatchResult) => {
        if (isSubscriptionReadOnly) { blockAction('Reserving blood units'); return; }
        setReservingBagId(bagId);
        try {
            await bloodBankApi.reserveBag(bagId, admissionId, crossmatchResult);
            toast({ title: 'Bag reserved.' });
            searchPool();
            load();
        } catch (err) {
            toast({ title: 'Could not reserve', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setReservingBagId(null);
        }
    };

    const openTransfuse = (bagId: string) => {
        if (isSubscriptionReadOnly) { blockAction('Recording transfusions'); return; }
        setTransfuseBagId(bagId);
        setVolumeGivenMl('');
        setVitalsBefore('');
        setVitalsAfter('');
        setReaction('NONE');
        setReactionNotes('');
        setWitnessName('');
    };

    const submitTransfuse = async () => {
        if (!transfuseBagId) return;
        if (!volumeGivenMl || Number(volumeGivenMl) <= 0) {
            toast({ title: 'Volume given is required', variant: 'destructive' });
            return;
        }
        if (!witnessName.trim()) {
            toast({ title: 'Witness name is required', variant: 'destructive' });
            return;
        }
        if (reaction !== 'NONE' && !reactionNotes.trim()) {
            toast({ title: 'Reaction notes are required when a reaction is recorded', variant: 'destructive' });
            return;
        }
        if (isSubscriptionReadOnly) { blockAction('Recording transfusions'); return; }
        setTransfuseBusy(true);
        try {
            await bloodBankApi.transfuse({
                bloodBagId: transfuseBagId,
                admissionId,
                startedAt: new Date().toISOString(),
                volumeGivenMl: Number(volumeGivenMl),
                vitalsBefore: vitalsBefore.trim() || undefined,
                vitalsAfter: vitalsAfter.trim() || undefined,
                reaction,
                reactionNotes: reactionNotes.trim() || undefined,
                witnessName: witnessName.trim(),
            });
            toast({ title: 'Transfusion recorded.' });
            setTransfuseBagId(null);
            load();
        } catch (err) {
            toast({ title: 'Could not record transfusion', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setTransfuseBusy(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
    }

    return (
        <div className="space-y-5">
            {/* Reserve a unit */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Reserve a unit</h2>
                    {isActive && (
                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs self-start" onClick={() => setPoolOpen(o => !o)}>
                            <Search className="h-3.5 w-3.5 mr-1.5" /> {poolOpen ? 'Hide pool search' : 'Search pool'}
                        </Button>
                    )}
                </div>

                {poolOpen && isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-end">
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Component</Label>
                                <select value={poolComponent} onChange={e => setPoolComponent(e.target.value as BloodComponent | '')} className="h-10 sm:h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                    <option value="">Any</option>
                                    {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Blood group</Label>
                                <select value={poolGroup} onChange={e => setPoolGroup(e.target.value as BloodGroup | '')} className="h-10 sm:h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                    <option value="">Any</option>
                                    {GROUPS.map(g => <option key={g} value={g}>{groupLabel(g)}</option>)}
                                </select>
                            </div>
                            <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700" onClick={searchPool} disabled={poolLoading}>
                                {poolLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />} Search
                            </Button>
                        </div>

                        {pool.length === 0 ? (
                            <p className="text-sm text-slate-400">No available bags match this search.</p>
                        ) : (
                            <div className="space-y-2">
                                {pool.map(b => (
                                    <div key={b.bloodBagId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg border border-slate-100">
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-800">{b.component} · {groupLabel(b.bloodGroup)}</span>
                                            <span className="text-slate-500"> · {b.bagNumber} · {b.volumeMl}ml · expires {formatIstDateTime(b.expiresAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Button size="sm" variant="outline" className="h-9 sm:h-7 text-[11px] w-full sm:w-auto" disabled={reservingBagId === b.bloodBagId || isSubscriptionReadOnly}
                                                onClick={() => reserve(b.bloodBagId, 'COMPATIBLE')}>
                                                {reservingBagId === b.bloodBagId ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Reserve (compatible)
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reserved for this admission */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Reserved for this admission</h2>
                {reservedBags.length === 0 ? (
                    <p className="text-sm text-slate-400">No bags reserved yet.</p>
                ) : (
                    <div className="space-y-2">
                        {reservedBags.map(b => (
                            <div key={b.bloodBagId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg border border-slate-100">
                                <div className="text-sm flex items-center gap-2 flex-wrap">
                                    <Droplet className="h-4 w-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-slate-800">{b.component} · {groupLabel(b.bloodGroup)}</span>
                                    <span className="text-slate-500">{b.bagNumber}</span>
                                    <Badge variant="outline" className={statusBadge(b.status)}>{b.status}</Badge>
                                    {b.crossmatchResult && <Badge variant="outline" className="text-[10px]">{b.crossmatchResult}</Badge>}
                                </div>
                                {isActive && b.status === 'RESERVED' && (
                                    <Button size="sm" className="h-9 sm:h-8 text-xs bg-brand-600 hover:bg-brand-700" disabled={isSubscriptionReadOnly} onClick={() => openTransfuse(b.bloodBagId)}>
                                        Record transfusion
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {transfuseBagId && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Record transfusion</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Volume given (ml)</Label>
                                <Input type="number" min={1} value={volumeGivenMl} onChange={e => setVolumeGivenMl(e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Witness name</Label>
                                <Input value={witnessName} onChange={e => setWitnessName(e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Vitals before</Label>
                                <Input value={vitalsBefore} onChange={e => setVitalsBefore(e.target.value)} placeholder="e.g. BP 118/76, HR 82, Temp 98.4°F" className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Vitals after</Label>
                                <Input value={vitalsAfter} onChange={e => setVitalsAfter(e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Reaction</Label>
                                <select value={reaction} onChange={e => setReaction(e.target.value as TransfusionReaction)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                    <option value="NONE">None</option>
                                    <option value="MILD">Mild</option>
                                    <option value="SEVERE">Severe</option>
                                    <option value="ANAPHYLAXIS">Anaphylaxis</option>
                                </select>
                            </div>
                        </div>
                        {reaction !== 'NONE' && (
                            <div>
                                <Label className="text-[11px] font-semibold text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Reaction notes (required)</Label>
                                <Textarea value={reactionNotes} onChange={e => setReactionNotes(e.target.value)} className="mt-1" rows={2} />
                            </div>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-10 sm:h-9" onClick={() => setTransfuseBagId(null)}>Cancel</Button>
                            <Button size="sm" className="h-10 sm:h-9 bg-brand-600 hover:bg-brand-700" disabled={transfuseBusy || isSubscriptionReadOnly} onClick={submitTransfuse}>
                                {transfuseBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Transfusion history */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Transfusion history</h2>
                {transfusions.length === 0 ? (
                    <p className="text-sm text-slate-400">No transfusions recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {transfusions.map(t => (
                            <div key={t.transfusionEventId} className="p-2.5 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <span className="text-sm font-bold text-slate-800">{t.component} · {t.bagNumber} · {t.volumeGivenMl}ml</span>
                                    <span className="text-[11px] text-slate-500">{formatIstDateTime(t.startedAt)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">By {t.administeredBy} · Witness {t.witnessName}</p>
                                {t.reaction !== 'NONE' && (
                                    <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" /> {t.reaction}{t.reactionNotes ? ` — ${t.reactionNotes}` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
