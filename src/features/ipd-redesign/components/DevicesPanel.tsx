import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Syringe, Clock3, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { deviceApi, type DeviceAssignmentItem, type IcuDeviceType } from '../services/deviceApi';
import { careBundleApi, type CareBundleItemDef, type DeviceCareBundleCheckItem } from '../services/careBundleApi';
import { formatIstDateTime, toIstDate } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const DEVICE_TYPES: { type: IcuDeviceType; label: string }[] = [
    { type: 'CENTRAL_LINE', label: 'Central Line' },
    { type: 'URINARY_CATHETER', label: 'Urinary Catheter' },
    { type: 'ETT', label: 'ETT (Endotracheal Tube)' },
];

const BUNDLE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const DevicesPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [devices, setDevices] = useState<DeviceAssignmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [checksByDevice, setChecksByDevice] = useState<Record<string, DeviceCareBundleCheckItem[]>>({});
    const [canonicalByType, setCanonicalByType] = useState<Record<string, CareBundleItemDef[]>>({});

    const [insertType, setInsertType] = useState<IcuDeviceType | null>(null);
    const [insertionSite, setInsertionSite] = useState('');
    const [indication, setIndication] = useState('');
    const [insertedByDoctorName, setInsertedByDoctorName] = useState('');
    const [insertNotes, setInsertNotes] = useState('');
    const [inserting, setInserting] = useState(false);

    const [removing, setRemoving] = useState<DeviceAssignmentItem | null>(null);
    const [removalReason, setRemovalReason] = useState('');
    const [removeBusy, setRemoveBusy] = useState(false);

    const [checklistDevice, setChecklistDevice] = useState<DeviceAssignmentItem | null>(null);
    const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
    const [checklistNotes, setChecklistNotes] = useState('');
    const [checklistBusy, setChecklistBusy] = useState(false);

    const load = () => {
        setLoading(true);
        deviceApi.getDevices(admissionId)
            .then(async list => {
                setDevices(list);
                const active = list.filter(d => d.statusCode === 'ACTIVE');
                const results = await Promise.all(active.map(d => careBundleApi.getChecks(d.deviceAssignmentId).catch(() => ({ canonicalItems: [], checks: [] }))));
                setChecksByDevice(Object.fromEntries(active.map((d, i) => [d.deviceAssignmentId, results[i].checks])));
                setCanonicalByType(prev => {
                    const next = { ...prev };
                    active.forEach((d, i) => { if (results[i].canonicalItems.length) next[d.deviceType] = results[i].canonicalItems; });
                    return next;
                });
            })
            .catch(() => toast({ title: 'Could not load devices', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openInsert = (type: IcuDeviceType) => {
        setInsertType(type);
        setInsertionSite(''); setIndication(''); setInsertedByDoctorName(''); setInsertNotes('');
    };

    const submitInsert = async () => {
        if (!insertType || !insertedByDoctorName.trim() || inserting) {
            toast({ title: 'Incomplete', description: 'Inserted-by doctor is required.', variant: 'destructive' });
            return;
        }
        setInserting(true);
        try {
            await deviceApi.insert(admissionId, {
                deviceType: insertType,
                insertionSite: insertionSite.trim() || undefined,
                indication: indication.trim() || undefined,
                insertedByDoctorName: insertedByDoctorName.trim(),
                notes: insertNotes.trim() || undefined,
            });
            toast({ title: 'Device inserted.' });
            setInsertType(null);
            load();
        } catch (err) {
            toast({ title: 'Could not insert device', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setInserting(false);
        }
    };

    const confirmRemove = async () => {
        if (!removing) return;
        setRemoveBusy(true);
        try {
            await deviceApi.remove(removing.deviceAssignmentId, removalReason || undefined);
            toast({ title: 'Device removed.' });
            setRemoving(null);
            setRemovalReason('');
            load();
        } catch (err) {
            toast({ title: 'Could not remove device', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setRemoveBusy(false);
        }
    };

    const openChecklist = (device: DeviceAssignmentItem) => {
        setChecklistDevice(device);
        const items = canonicalByType[device.deviceType] ?? [];
        setChecklistState(Object.fromEntries(items.map(i => [i.key, true])));
        setChecklistNotes('');
    };

    const submitChecklist = async () => {
        if (!checklistDevice || checklistBusy) return;
        setChecklistBusy(true);
        try {
            const items = Object.entries(checklistState).map(([key, compliant]) => ({ key, compliant }));
            await careBundleApi.submit(checklistDevice.deviceAssignmentId, items, checklistNotes.trim() || undefined);
            toast({ title: 'Bundle check recorded.' });
            setChecklistDevice(null);
            load();
        } catch (err) {
            toast({ title: 'Could not record bundle check', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setChecklistBusy(false);
        }
    };

    const bundleStatus = (device: DeviceAssignmentItem): { text: string; overdue: boolean } => {
        const checks = checksByDevice[device.deviceAssignmentId] ?? [];
        const lastCheckedIso = checks[0]?.checkedAt ?? device.insertedAt;
        const nextDueMs = toIstDate(lastCheckedIso).getTime() + BUNDLE_CHECK_INTERVAL_MS;
        return { text: formatIstDateTime(new Date(nextDueMs).toISOString()), overdue: Date.now() > nextDueMs };
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Syringe className="h-3.5 w-3.5" /> Devices</h2>
                <Button variant="outline" size="sm" className="h-9 sm:h-8 text-xs" onClick={load} disabled={loading}>
                    <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                </Button>
            </div>

            {loading && devices.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
                <div className="space-y-3">
                    {DEVICE_TYPES.map(({ type, label }) => {
                        const active = devices.find(d => d.deviceType === type && d.statusCode === 'ACTIVE');
                        const history = devices.filter(d => d.deviceType === type && d.statusCode !== 'ACTIVE');
                        const status = active ? bundleStatus(active) : null;
                        const checks = active ? (checksByDevice[active.deviceAssignmentId] ?? []) : [];

                        return (
                            <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 text-sm">{label}</span>
                                    {active ? (
                                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">ACTIVE · {active.daysInSitu}d</Badge>
                                    ) : isActive ? (
                                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openInsert(type)}>
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Insert
                                        </Button>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 text-slate-500">NONE</Badge>
                                    )}
                                </div>

                                {active && (
                                    <div className="mt-2 space-y-1.5">
                                        <p className="text-[11px] text-slate-500">
                                            {active.insertionSite ? `${active.insertionSite} · ` : ''}Inserted by {active.insertedByDoctorName} · {formatIstDateTime(active.insertedAt)}
                                        </p>
                                        {active.indication && <p className="text-[11px] text-slate-400 italic">{active.indication}</p>}
                                        <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${status?.overdue ? 'text-rose-700' : 'text-slate-600'}`}>
                                            {status?.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                                            {status?.overdue ? 'Bundle check overdue since ' : 'Next bundle check due: '}{status?.text}
                                        </p>
                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                            {isActive && (
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openChecklist(active)}>
                                                    <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Complete bundle check
                                                </Button>
                                            )}
                                            {isActive && (
                                                <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => { setRemoving(active); setRemovalReason(''); }}>
                                                    Remove device
                                                </Button>
                                            )}
                                        </div>
                                        {checks.length > 0 && (
                                            <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check history</h4>
                                                {checks.slice(0, 5).map(c => (
                                                    <div key={c.checkId} className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                                        <span className={c.allCompliant ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                                                            {c.compliantCount}/{c.totalItems} compliant
                                                        </span>
                                                        <span>{c.checkedBy} · {formatIstDateTime(c.checkedAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {history.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">History</h4>
                                        {history.map(h => (
                                            <p key={h.deviceAssignmentId} className="text-[11px] text-slate-500">
                                                {formatIstDateTime(h.insertedAt)} → {h.removedAt ? formatIstDateTime(h.removedAt) : '—'}
                                                {h.removalReason ? ` — ${h.removalReason}` : ''}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!insertType} onOpenChange={(o) => { if (!o) setInsertType(null); }}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Insert {DEVICE_TYPES.find(d => d.type === insertType)?.label}</DialogTitle>
                        <DialogDescription>Starts device-day tracking and the bundle-compliance schedule.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Insertion site</Label>
                            <Input value={insertionSite} onChange={e => setInsertionSite(e.target.value)} className="h-9 mt-1" placeholder="e.g. Right IJ" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Inserted by *</Label>
                            <Input value={insertedByDoctorName} onChange={e => setInsertedByDoctorName(e.target.value)} className="h-9 mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Indication</Label>
                        <Input value={indication} onChange={e => setIndication(e.target.value)} className="h-9 mt-1" />
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                        <Textarea rows={2} value={insertNotes} onChange={e => setInsertNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="outline" className="h-11 sm:h-10" onClick={() => setInsertType(null)}>Cancel</Button>
                        <Button disabled={!insertedByDoctorName.trim() || inserting} onClick={submitInsert} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700">
                            {inserting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Insert
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
                <DialogContent className="max-w-sm">
                    {removing && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Remove device?</DialogTitle>
                                <DialogDescription>{DEVICE_TYPES.find(d => d.type === removing.deviceType)?.label}</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Reason</Label>
                                <Textarea rows={2} value={removalReason} onChange={e => setRemovalReason(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setRemoving(null)}>Cancel</Button>
                                <Button disabled={removeBusy} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700" onClick={confirmRemove}>
                                    {removeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Remove
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!checklistDevice} onOpenChange={(o) => { if (!o) setChecklistDevice(null); }}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    {checklistDevice && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Bundle compliance check</DialogTitle>
                                <DialogDescription>{DEVICE_TYPES.find(d => d.type === checklistDevice.deviceType)?.label} — uncheck any item not currently met.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                {(canonicalByType[checklistDevice.deviceType] ?? []).map(item => (
                                    <label key={item.key} className="flex items-start gap-2.5 text-sm text-slate-700 py-1">
                                        <input
                                            type="checkbox"
                                            checked={checklistState[item.key] ?? true}
                                            onChange={e => setChecklistState(s => ({ ...s, [item.key]: e.target.checked }))}
                                            className="h-4 w-4 mt-0.5 rounded border-slate-300"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                                <Textarea rows={2} value={checklistNotes} onChange={e => setChecklistNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                                <Button variant="outline" className="h-11 sm:h-10" onClick={() => setChecklistDevice(null)}>Cancel</Button>
                                <Button disabled={checklistBusy} onClick={submitChecklist} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700">
                                    {checklistBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />} Save check
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
