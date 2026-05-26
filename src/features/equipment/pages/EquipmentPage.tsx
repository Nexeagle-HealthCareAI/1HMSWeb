import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Wrench, Plus, Search, RefreshCw, Loader2, AlertCircle, AlertTriangle,
    X, Save, Zap, History, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import {
    equipmentService,
    type EquipmentListItem, type EquipmentDetail, type MaintenanceLogItem,
    type UpsertEquipmentRequest, type RecordMaintenanceRequest,
    type EquipmentCategory, type EquipmentStatus, type MaintenanceActivity, type MaintenanceOutcome,
} from '../services/equipmentService';

const CATEGORIES: { value: EquipmentCategory; label: string }[] = [
    { value: 'BIOMEDICAL', label: 'Biomedical' },
    { value: 'ICT',        label: 'ICT' },
    { value: 'FACILITY',   label: 'Facility' },
    { value: 'FURNITURE',  label: 'Furniture' },
    { value: 'OTHER',      label: 'Other' },
];

const STATUS_TONE: Record<string, string> = {
    ACTIVE:             'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNDER_MAINTENANCE:  'bg-amber-50 text-amber-700 border-amber-200',
    RETIRED:            'bg-slate-100 text-slate-600 border-slate-300',
};

const ACTIVITIES: { value: MaintenanceActivity; label: string }[] = [
    { value: 'PM',          label: 'PM' },
    { value: 'BREAKDOWN',   label: 'Breakdown' },
    { value: 'CALIBRATION', label: 'Calibration' },
    { value: 'INSPECTION',  label: 'Inspection' },
    { value: 'REPAIR',      label: 'Repair' },
    { value: 'OTHER',       label: 'Other' },
];

const ACTIVITY_TONE: Record<string, string> = {
    PM:          'bg-emerald-50 text-emerald-700 border-emerald-200',
    BREAKDOWN:   'bg-rose-50 text-rose-700 border-rose-200',
    CALIBRATION: 'bg-sky-50 text-sky-700 border-sky-200',
    INSPECTION:  'bg-amber-50 text-amber-700 border-amber-200',
    REPAIR:      'bg-rose-50 text-rose-700 border-rose-200',
    OTHER:       'bg-slate-50 text-slate-600 border-slate-200',
};

const inr = (n?: number | null) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const initialEquipment = (): UpsertEquipmentRequest => ({
    assetCode: '',
    name: '',
    category: 'BIOMEDICAL',
    status: 'ACTIVE',
});

const toLocal = (s?: string | null) => s ? s.slice(0, 16) : '';
const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

// ─── Edit / view sheet (form + history) ─────────────────────────────────────

const EquipmentSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editingId?: string | null;
    onSaved: () => void;
    onOpenMaintenance: (eq: EquipmentDetail) => void;
}> = ({ open, onOpenChange, editingId, onSaved, onOpenMaintenance }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertEquipmentRequest>(initialEquipment());
    const [detail, setDetail] = useState<EquipmentDetail | null>(null);
    const [logs, setLogs] = useState<MaintenanceLogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadDetail = useCallback(async () => {
        if (!editingId) return;
        setLoading(true);
        try {
            const res = await equipmentService.getById(editingId);
            if (!res.success || !res.equipment) throw new Error(res.message ?? 'Failed to load');
            setDetail(res.equipment);
            setLogs(res.logs ?? []);
            setForm({
                equipmentId: res.equipment.equipmentId,
                assetCode: res.equipment.assetCode,
                name: res.equipment.name,
                model: res.equipment.model,
                serialNumber: res.equipment.serialNumber,
                manufacturer: res.equipment.manufacturer,
                category: res.equipment.category,
                location: res.equipment.location,
                department: res.equipment.department,
                amcVendor: res.equipment.amcVendor,
                installedAt: res.equipment.installedAt,
                warrantyEndAt: res.equipment.warrantyEndAt,
                amcEndAt: res.equipment.amcEndAt,
                pmIntervalDays: res.equipment.pmIntervalDays,
                nextDueAt: res.equipment.nextDueAt,
                status: res.equipment.status,
                notes: res.equipment.notes,
            });
        } catch (e: any) {
            toast({ title: 'Failed to load', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [editingId, toast]);

    useEffect(() => {
        if (!open) return;
        if (editingId) loadDetail();
        else { setDetail(null); setLogs([]); setForm(initialEquipment()); }
    }, [open, editingId, loadDetail]);

    const set = <K extends keyof UpsertEquipmentRequest>(k: K, v: UpsertEquipmentRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        if (!form.assetCode.trim()) { toast({ title: 'Asset code required', variant: 'destructive' }); return; }
        if (!form.name.trim())      { toast({ title: 'Name required',       variant: 'destructive' }); return; }
        if (form.pmIntervalDays != null && form.pmIntervalDays <= 0) {
            toast({ title: 'PM interval must be positive', variant: 'destructive' }); return;
        }
        setSubmitting(true);
        try {
            const res = await equipmentService.upsert(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: editingId ? 'Equipment updated' : 'Equipment added', description: `${form.assetCode} · ${form.name}` });
            onSaved();
            if (editingId) loadDetail();
            else onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <Wrench className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-base font-bold flex items-center gap-2">
                                {detail ? `${detail.assetCode} · ${detail.name}` : 'New Equipment'}
                                {detail && <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[detail.status] ?? '')}>{detail.status.replace('_', ' ')}</Badge>}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {detail
                                    ? `Last serviced ${detail.lastServiceAt ? format(parseISO(detail.lastServiceAt), 'd MMM yyyy') : 'never'}${detail.nextDueAt ? ` · Next due ${format(parseISO(detail.nextDueAt), 'd MMM yyyy')}` : ''}`
                                    : 'Register a new piece of equipment.'}
                            </SheetDescription>
                        </div>
                        {detail && detail.status !== 'RETIRED' && (
                            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 font-semibold" onClick={() => onOpenMaintenance(detail)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Record service
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading && <Skeleton className="h-32 w-full" />}

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Identification</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Asset code *</Label>
                                <Input value={form.assetCode} onChange={e => set('assetCode', e.target.value)} className="h-9 mt-1 font-mono" disabled={!!editingId} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                                <select value={form.status} onChange={e => set('status', e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    <option value="ACTIVE">Active</option>
                                    <option value="UNDER_MAINTENANCE">Under maintenance</option>
                                    <option value="RETIRED">Retired</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Name *</Label>
                                <Input value={form.name} onChange={e => set('name', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Model</Label>
                                <Input value={form.model ?? ''} onChange={e => set('model', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Serial #</Label>
                                <Input value={form.serialNumber ?? ''} onChange={e => set('serialNumber', e.target.value)} className="h-9 mt-1 font-mono" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Manufacturer</Label>
                                <Input value={form.manufacturer ?? ''} onChange={e => set('manufacturer', e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Placement</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                                <select value={form.category} onChange={e => set('category', e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Department</Label>
                                <Input value={form.department ?? ''} onChange={e => set('department', e.target.value)} className="h-9 mt-1" placeholder="ICU, OT, Lab…" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Location</Label>
                                <Input value={form.location ?? ''} onChange={e => set('location', e.target.value)} className="h-9 mt-1" placeholder="OT-1, Block-B…" />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Warranty & AMC</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Installed</Label>
                                <Input type="date" value={form.installedAt?.slice(0, 10) ?? ''} onChange={e => set('installedAt', e.target.value ? toIso(`${e.target.value}T00:00:00`) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Warranty end</Label>
                                <Input type="date" value={form.warrantyEndAt?.slice(0, 10) ?? ''} onChange={e => set('warrantyEndAt', e.target.value ? toIso(`${e.target.value}T00:00:00`) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">AMC end</Label>
                                <Input type="date" value={form.amcEndAt?.slice(0, 10) ?? ''} onChange={e => set('amcEndAt', e.target.value ? toIso(`${e.target.value}T00:00:00`) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">AMC vendor</Label>
                                <Input value={form.amcVendor ?? ''} onChange={e => set('amcVendor', e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preventive Maintenance</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">PM interval (days)</Label>
                                <Input type="number" min={1} value={form.pmIntervalDays ?? ''} onChange={e => set('pmIntervalDays', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 mt-1" placeholder="e.g. 90" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Next due</Label>
                                <Input type="datetime-local" value={toLocal(form.nextDueAt)} onChange={e => set('nextDueAt', toIso(e.target.value))} className="h-9 mt-1" />
                                <p className="text-[10px] text-slate-500 mt-1">Auto-advances after each PM service.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                    </section>

                    {/* Maintenance history */}
                    {detail && logs.length > 0 && (
                        <section className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                <History className="h-3 w-3" /> Maintenance history ({logs.length})
                            </h4>
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="text-left px-2.5 py-1.5 font-bold">When</th>
                                            <th className="text-left px-2.5 py-1.5 font-bold">Activity</th>
                                            <th className="text-left px-2.5 py-1.5 font-bold">By / Vendor</th>
                                            <th className="text-left px-2.5 py-1.5 font-bold">Outcome</th>
                                            <th className="text-right px-2.5 py-1.5 font-bold">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(l => (
                                            <tr key={l.maintenanceLogId} className="border-t border-slate-100">
                                                <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{format(parseISO(l.performedAt), 'd MMM yyyy')}</td>
                                                <td className="px-2.5 py-1.5">
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold', ACTIVITY_TONE[l.activityType] ?? '')}>{l.activityType}</Badge>
                                                </td>
                                                <td className="px-2.5 py-1.5 text-slate-600">{l.performedBy}{l.vendorName ? ` · ${l.vendorName}` : ''}</td>
                                                <td className="px-2.5 py-1.5 text-slate-600">{l.outcome ?? '—'}</td>
                                                <td className="px-2.5 py-1.5 text-right text-slate-700">{inr(l.cost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Record maintenance sheet ───────────────────────────────────────────────

const MaintenanceSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    equipment: EquipmentDetail | null;
    onSaved: () => void;
}> = ({ open, onOpenChange, equipment, onSaved }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<RecordMaintenanceRequest>({
        equipmentId: '',
        activityType: 'PM',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !equipment) return;
        setForm({
            equipmentId: equipment.equipmentId,
            activityType: 'PM',
            performedAt: new Date().toISOString(),
        });
    }, [open, equipment]);

    if (!equipment) return null;

    const set = <K extends keyof RecordMaintenanceRequest>(k: K, v: RecordMaintenanceRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await equipmentService.recordMaintenance(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({
                title: 'Service recorded',
                description: `${equipment.name}${res.nextDueAt ? ` · next due ${format(parseISO(res.nextDueAt), 'd MMM yyyy')}` : ''}`,
            });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                            <ListChecks className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Record Service</SheetTitle>
                            <SheetDescription className="text-xs">{equipment.assetCode} · {equipment.name}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Activity *</Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {ACTIVITIES.map(a => (
                                <button
                                    key={a.value}
                                    type="button"
                                    onClick={() => set('activityType', a.value)}
                                    className={cn(
                                        'px-2.5 h-8 rounded-md border text-xs font-semibold',
                                        form.activityType === a.value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{a.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Performed at</Label>
                            <Input type="datetime-local" value={toLocal(form.performedAt)} onChange={e => set('performedAt', toIso(e.target.value))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Outcome</Label>
                            <select value={form.outcome ?? ''} onChange={e => set('outcome', (e.target.value || undefined) as MaintenanceOutcome | undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                <option value="">—</option>
                                <option value="PASS">Pass</option>
                                <option value="FAIL">Fail</option>
                                <option value="NEEDS_FOLLOWUP">Needs follow-up</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Performed by</Label>
                            <Input value={form.performedBy ?? ''} onChange={e => set('performedBy', e.target.value)} className="h-9 mt-1" placeholder="Defaults to current user" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Vendor</Label>
                            <Input value={form.vendorName ?? ''} onChange={e => set('vendorName', e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Cost (₹)</Label>
                            <Input type="number" min={0} step="0.01" value={form.cost ?? ''} onChange={e => set('cost', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Next due (override)</Label>
                            <Input type="datetime-local" value={toLocal(form.nextDueAtOverride)} onChange={e => set('nextDueAtOverride', toIso(e.target.value))} className="h-9 mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Findings</Label>
                        <Textarea value={form.findings ?? ''} onChange={e => set('findings', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Action taken</Label>
                        <Textarea value={form.actionTaken ?? ''} onChange={e => set('actionTaken', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Parts replaced</Label>
                        <Textarea value={form.partsReplaced ?? ''} onChange={e => set('partsReplaced', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>

                    {equipment.pmIntervalDays && form.activityType === 'PM' && !form.nextDueAtOverride && (
                        <p className="text-[11px] text-slate-500 italic">
                            Next PM will auto-set to performed date + {equipment.pmIntervalDays} day{equipment.pmIntervalDays === 1 ? '' : 's'}.
                        </p>
                    )}
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Record</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────────

const EquipmentPage: React.FC = () => {
    const { toast } = useToast();
    const [items, setItems] = useState<EquipmentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'ALL' | EquipmentCategory>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | EquipmentStatus>('ALL');
    const [dueSoonOnly, setDueSoonOnly] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [maintOpen, setMaintOpen] = useState(false);
    const [maintEquipment, setMaintEquipment] = useState<EquipmentDetail | null>(null);

    const [evaluating, setEvaluating] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await equipmentService.list({ take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load equipment');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (statusFilter !== 'ALL' && it.status !== statusFilter) return false;
            if (categoryFilter !== 'ALL' && it.category !== categoryFilter) return false;
            if (dueSoonOnly && !it.isDueSoon && !it.isOverdue) return false;
            if (!q) return true;
            return it.assetCode.toLowerCase().includes(q)
                || it.name.toLowerCase().includes(q)
                || (it.serialNumber ?? '').toLowerCase().includes(q)
                || (it.department ?? '').toLowerCase().includes(q);
        });
    }, [items, search, statusFilter, categoryFilter, dueSoonOnly]);

    const counts = useMemo(() => ({
        total: items.length,
        active: items.filter(i => i.status === 'ACTIVE').length,
        under: items.filter(i => i.status === 'UNDER_MAINTENANCE').length,
        overdue: items.filter(i => i.isOverdue).length,
        dueSoon: items.filter(i => i.isDueSoon).length,
    }), [items]);

    const runEvaluator = async () => {
        if (evaluating) return;
        setEvaluating(true);
        try {
            const res = await equipmentService.evaluatePm();
            if (!res.success) throw new Error(res.message ?? 'Could not run');
            toast({
                title: 'PM scan complete',
                description: `${res.overdueRaised} overdue · ${res.dueSoonRaised} due-soon raised · ${res.skipped} duplicates skipped (${res.scanned} scanned)`,
            });
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not run scan', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setEvaluating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <Wrench className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Equipment · PM</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Biomedical & facility asset register with preventive-maintenance schedule.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-10" onClick={runEvaluator} disabled={evaluating}>
                            {evaluating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                            Run PM scan
                        </Button>
                        <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                            <Plus className="h-4 w-4 mr-2" /> New Equipment
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Active</p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">{counts.active}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Under maint.</p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">{counts.under}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.dueSoon > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.dueSoon > 0 ? 'text-amber-700' : 'text-slate-400')}>PM due soon</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.dueSoon > 0 ? 'text-amber-900' : 'text-slate-700')}>{counts.dueSoon}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.overdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.overdue > 0 ? 'text-rose-700' : 'text-slate-400')}>PM overdue</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.overdue > 0 ? 'text-rose-900' : 'text-slate-700')}>{counts.overdue}</p>
                    </div>
                </div>

                {/* Filter strip */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, name, serial, department" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as 'ALL' | EquipmentCategory)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All categories</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ALL', 'ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                                'h-7 px-3 rounded-md text-xs font-semibold',
                                statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}>{s.replace('_', ' ')}</button>
                        ))}
                    </div>
                    <Button
                        variant={dueSoonOnly ? 'default' : 'outline'}
                        size="sm"
                        className={cn('h-9', dueSoonOnly && 'bg-amber-600 hover:bg-amber-700')}
                        onClick={() => setDueSoonOnly(v => !v)}
                    >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Due/overdue only
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {loading && (<div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>)}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No equipment registered</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Add the first asset to start tracking maintenance.</p>
                        <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> New Equipment
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">Asset</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Name / Model</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Cat</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Dept / Location</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Last service</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Next due</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => (
                                    <tr key={it.equipmentId}
                                        className={cn(
                                            'border-t border-slate-100 hover:bg-slate-50/50 cursor-pointer',
                                            it.isOverdue && 'bg-rose-50/40',
                                            it.status === 'RETIRED' && 'opacity-60',
                                        )}
                                        onClick={() => { setEditingId(it.equipmentId); setSheetOpen(true); }}>
                                        <td className="px-3 py-2 text-xs font-mono font-bold text-indigo-700">{it.assetCode}</td>
                                        <td className="px-3 py-2">
                                            <p className="text-sm font-semibold text-slate-900">{it.name}</p>
                                            <p className="text-[11px] text-slate-500">{[it.model, it.serialNumber].filter(Boolean).join(' · ') || '—'}</p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">{it.category}</Badge>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-700">{[it.department, it.location].filter(Boolean).join(' · ') || '—'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                            {it.lastServiceAt ? format(parseISO(it.lastServiceAt), 'd MMM yyyy') : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                                            {it.nextDueAt ? (
                                                <span className={cn(
                                                    it.isOverdue ? 'text-rose-700 font-bold'
                                                    : it.isDueSoon ? 'text-amber-700 font-semibold'
                                                    : 'text-slate-700'
                                                )}>
                                                    {format(parseISO(it.nextDueAt), 'd MMM yyyy')}
                                                    <div className="text-[10px] text-slate-400 font-normal">
                                                        {it.isOverdue
                                                            ? `${formatDistanceToNowStrict(parseISO(it.nextDueAt))} ago`
                                                            : `in ${formatDistanceToNowStrict(parseISO(it.nextDueAt))}`}
                                                    </div>
                                                </span>
                                            ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? '')}>
                                                {it.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No equipment matches the current filters</p>
                    </div>
                )}
            </div>

            <EquipmentSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                editingId={editingId}
                onSaved={() => load(true)}
                onOpenMaintenance={(eq) => { setMaintEquipment(eq); setMaintOpen(true); }}
            />
            <MaintenanceSheet
                open={maintOpen}
                onOpenChange={setMaintOpen}
                equipment={maintEquipment}
                onSaved={() => { load(true); /* refresh edit-sheet too if it reopens */ }}
            />
        </div>
    );
};

export default EquipmentPage;
