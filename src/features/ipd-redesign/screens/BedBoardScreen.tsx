import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { BedDouble, RefreshCw, LogOut, ArrowLeftRight, Loader2, ArrowLeft, X, Check } from 'lucide-react';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';

const FREE_TONE: Record<string, string> = {
    AVAILABLE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CLEANING: 'border-amber-200 bg-amber-50 text-amber-700',
    RESERVED: 'border-sky-200 bg-sky-50 text-sky-700',
    BLOCKED: 'border-slate-200 bg-slate-100 text-slate-500',
};
const OCCUPIED_TONE = 'border-rose-200 bg-rose-50 text-rose-700';

type ActionMode = 'menu' | 'transfer' | 'discharge' | null;

interface Props {
    onBack: () => void;
}

/**
 * Live bed board — real GET /bed/board data (occupied and free beds both show; occupancy is
 * derived from the ACTIVE BedAssignment, not BedMaster.StatusCode alone). Assigning a bed to an
 * unassigned admission happens at admit time (see AdmitPatientSheet); this screen covers what
 * happens to an already-occupied bed: transfer, release, or discharge.
 */
export const BedBoardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<BedBoardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [wardFilter, setWardFilter] = useState('ALL');
    const [selected, setSelected] = useState<BedBoardItem | null>(null);
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [newBedId, setNewBedId] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        bedBoardApi.getBoard()
            .then(setItems)
            .catch(() => toast({ title: 'Could not load the bed board', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const wards = useMemo(() => Array.from(new Set(items.map(i => i.wardName || i.wardCode || 'Other'))), [items]);

    const grouped = useMemo(() => {
        const groups: Record<string, BedBoardItem[]> = {};
        for (const b of items) {
            const key = b.wardName || b.wardCode || 'Other';
            if (wardFilter !== 'ALL' && key !== wardFilter) continue;
            (groups[key] ??= []).push(b);
        }
        return groups;
    }, [items, wardFilter]);

    // Candidates for "transfer to" — free beds, excluding the one currently selected.
    const freeBeds = useMemo(
        () => items.filter(b => b.isActive && !b.admissionId && b.bedId !== selected?.bedId),
        [items, selected],
    );

    const openBed = (b: BedBoardItem) => {
        if (!b.admissionId) return; // free beds are informational only in this screen
        setSelected(b);
        setActionMode('menu');
        setNewBedId('');
        setNotes('');
    };

    const closeDialog = () => { setSelected(null); setActionMode(null); };

    const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            closeDialog();
            load();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <BedDouble className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Bed Board</h1>
                        <p className="text-xs text-slate-500">Live occupancy · transfer, release & discharge.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All wards</option>
                        {wards.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            </div>

            {loading && items.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading bed board…</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No beds found. Add beds under Bed Master first.</div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([ward, beds]) => {
                        const occ = beds.filter(b => !!b.admissionId).length;
                        return (
                            <div key={ward} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-bold text-slate-900">{ward}</p>
                                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{occ}/{beds.length} occupied</Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {beds.map(b => {
                                        const occupied = !!b.admissionId;
                                        const tone = occupied ? OCCUPIED_TONE : (FREE_TONE[b.statusCode ?? 'AVAILABLE'] ?? FREE_TONE.AVAILABLE);
                                        return (
                                            <button key={b.bedId} type="button" onClick={() => openBed(b)}
                                                disabled={!occupied}
                                                className={cn('w-36 rounded-lg border-2 p-2 text-left transition-all', tone,
                                                    occupied ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-90')}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-[10px] font-bold">{b.bedCode}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{occupied ? 'OCCUPIED' : (b.statusCode ?? 'AVAILABLE')}</span>
                                                </div>
                                                {occupied ? (
                                                    <div className="mt-1">
                                                        <p className="text-xs font-bold truncate">{b.patientName || '—'}</p>
                                                        <p className="text-[10px] opacity-80 truncate">{b.patientAge ?? ''}{b.patientSex ?? ''} · {b.admissionNo}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] mt-1 opacity-70">₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-md">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selected.patientName || 'Patient'} · {selected.bedCode}</DialogTitle>
                                <DialogDescription>{selected.admissionNo} · {selected.admissionType ?? ''} · {selected.payerType ?? 'CASH'}</DialogDescription>
                            </DialogHeader>

                            {actionMode === 'menu' && (
                                <div className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start h-11" onClick={() => setActionMode('transfer')}>
                                        <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer to another bed
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start h-11" disabled={busy}
                                        onClick={() => runAction(() => bedBoardApi.releaseBed(selected.admissionId!), 'Bed released.')}>
                                        <X className="h-4 w-4 mr-2" /> Release bed (keep admission)
                                    </Button>
                                    <Button className="w-full justify-start h-11 bg-amber-600 hover:bg-amber-700" onClick={() => setActionMode('discharge')}>
                                        <LogOut className="h-4 w-4 mr-2" /> Discharge patient
                                    </Button>
                                </div>
                            )}

                            {actionMode === 'transfer' && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">New bed</Label>
                                        <select value={newBedId} onChange={e => setNewBedId(e.target.value)} className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white">
                                            <option value="">Select a bed…</option>
                                            {freeBeds.map(b => (
                                                <option key={b.bedId} value={b.bedId}>{(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={!newBedId || busy} className="bg-brand-600 hover:bg-brand-700"
                                            onClick={() => runAction(() => bedBoardApi.transferBed(selected.admissionId!, newBedId), 'Bed transferred.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />} Transfer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {actionMode === 'discharge' && (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                                        This closes the admission to DISCHARGED and releases bed {selected.bedCode}.
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                                        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={busy} className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => runAction(() => bedBoardApi.dischargeAdmission(selected.admissionId!, notes || undefined), 'Patient discharged.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
