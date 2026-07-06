import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, HardDrive, Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
    equipmentApi, type EquipmentItem, type EquipmentCategory, type EquipmentStatus,
    type MaintenanceActivityType, type MaintenanceOutcome, type MaintenanceLogItem, type UpsertEquipmentInput,
} from '@/features/ipd-redesign/services/equipmentApi';

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
    BIOMEDICAL: 'Biomedical', ICT: 'ICT', FACILITY: 'Facility', FURNITURE: 'Furniture', OTHER: 'Other',
};

const STATUS_COLORS: Record<EquipmentStatus, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    UNDER_MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
    RETIRED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ACTIVITY_LABELS: Record<MaintenanceActivityType, string> = {
    PM: 'Preventive Maintenance', BREAKDOWN: 'Breakdown', CALIBRATION: 'Calibration', INSPECTION: 'Inspection', REPAIR: 'Repair', OTHER: 'Other',
};

type EditingEquipment = Partial<UpsertEquipmentInput> & { equipmentId?: string };

type EquipmentErrors = { assetCode?: string; name?: string };
const validateEquipment = (rec: EditingEquipment | null): EquipmentErrors => {
    const e: EquipmentErrors = {};
    if (!rec) return e;
    if (!String(rec.assetCode ?? '').trim()) e.assetCode = 'Asset code is required';
    if (!String(rec.name ?? '').trim()) e.name = 'Name is required';
    return e;
};

const isDue = (nextDueAt?: string | null) => !!nextDueAt && new Date(nextDueAt).getTime() <= Date.now();

export const EquipmentMaster: React.FC = () => {
    const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<EditingEquipment | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [logTarget, setLogTarget] = useState<EquipmentItem | null>(null);
    const [logHistory, setLogHistory] = useState<MaintenanceLogItem[]>([]);
    const [logHistoryLoading, setLogHistoryLoading] = useState(false);
    const [logActivityType, setLogActivityType] = useState<MaintenanceActivityType>('PM');
    const [logOutcome, setLogOutcome] = useState<MaintenanceOutcome | ''>('');
    const [logNotes, setLogNotes] = useState('');
    const [logSaving, setLogSaving] = useState(false);

    const loadEquipment = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await equipmentApi.getEquipment();
            setEquipment(res);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load equipment');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadEquipment(); }, [loadEquipment]);

    const filteredEquipment = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return equipment.filter(e => {
            const matchesSearch = !q || e.name.toLowerCase().includes(q) || e.assetCode.toLowerCase().includes(q) || (e.serialNumber ?? '').toLowerCase().includes(q);
            const matchesCategory = filterCategory === 'ALL' || e.category === filterCategory;
            const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [equipment, searchTerm, filterCategory, filterStatus]);

    const handleOpenDrawer = (item: EquipmentItem | null = null) => {
        if (item) {
            setEditingEquipment({
                equipmentId: item.equipmentId,
                assetCode: item.assetCode,
                name: item.name,
                model: item.model ?? undefined,
                serialNumber: item.serialNumber ?? undefined,
                manufacturer: item.manufacturer ?? undefined,
                category: item.category,
                location: item.location ?? undefined,
                department: item.department ?? undefined,
                amcVendor: item.amcVendor ?? undefined,
                pmIntervalDays: item.pmIntervalDays,
                status: item.status,
                notes: item.notes ?? undefined,
            });
        } else {
            setEditingEquipment({ assetCode: '', name: '', category: 'BIOMEDICAL', status: 'ACTIVE' });
        }
        setIsDrawerOpen(true);
    };

    const formErrors = validateEquipment(editingEquipment);
    const isValid = Object.keys(formErrors).length === 0;

    const handleSave = async () => {
        const errs = validateEquipment(editingEquipment);
        const firstErr = errs.assetCode || errs.name;
        if (firstErr || !editingEquipment) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const res: any = await equipmentApi.upsertEquipment({
                equipmentId: editingEquipment.equipmentId,
                assetCode: editingEquipment.assetCode!.trim(),
                name: editingEquipment.name!.trim(),
                model: editingEquipment.model,
                serialNumber: editingEquipment.serialNumber,
                manufacturer: editingEquipment.manufacturer,
                category: (editingEquipment.category ?? 'BIOMEDICAL') as EquipmentCategory,
                location: editingEquipment.location,
                department: editingEquipment.department,
                amcVendor: editingEquipment.amcVendor,
                pmIntervalDays: editingEquipment.pmIntervalDays ?? null,
                status: (editingEquipment.status ?? 'ACTIVE') as EquipmentStatus,
                notes: editingEquipment.notes,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not save asset');
            toast({ title: editingEquipment.equipmentId ? 'Asset updated' : 'Asset created', description: editingEquipment.name });
            setIsDrawerOpen(false);
            await loadEquipment(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const openLogDialog = (item: EquipmentItem) => {
        setLogTarget(item);
        setLogActivityType('PM');
        setLogOutcome('');
        setLogNotes('');
        setLogHistoryLoading(true);
        equipmentApi.getMaintenanceLogHistory(item.equipmentId)
            .then(setLogHistory)
            .catch(() => setLogHistory([]))
            .finally(() => setLogHistoryLoading(false));
    };

    const submitLog = async () => {
        if (!logTarget) return;
        setLogSaving(true);
        try {
            await equipmentApi.recordMaintenanceLog(logTarget.equipmentId, {
                activityType: logActivityType,
                outcome: logOutcome || undefined,
                notes: logNotes || undefined,
            });
            toast({ title: 'Maintenance log recorded' });
            setLogTarget(null);
            await loadEquipment(true);
        } catch (e: any) {
            toast({ title: 'Could not record log', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setLogSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Search asset, code, serial..." className="pl-9 bg-gray-50 dark:bg-slate-950" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[150px] h-10 bg-gray-50 dark:bg-slate-950"><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            {(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px] h-10 bg-gray-50 dark:bg-slate-950"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                            <SelectItem value="RETIRED">Retired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadEquipment(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Asset
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadEquipment(true)} className="mt-2"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredEquipment.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredEquipment.map(e => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={e.equipmentId}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${e.status === 'RETIRED' ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                                                    <HardDrive className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <span className="truncate">{e.name}</span>
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate">{e.assetCode} {e.department ? `• ${e.department}` : ''}</p>
                                            </div>
                                            <Badge variant="outline" className={`ml-2 text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[e.status]}`}>{e.status.replace('_', ' ')}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase">{CATEGORY_LABELS[e.category]}</Badge>
                                            {isDue(e.nextDueAt) && (
                                                <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-0.5">
                                                    <Clock className="h-2.5 w-2.5" /> PM Due
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-auto flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <div className="text-[10px] text-gray-400 uppercase font-semibold">Next Due</div>
                                                <div className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                                                    {e.nextDueAt ? new Date(e.nextDueAt).toLocaleDateString('en-IN') : '—'}
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => openLogDialog(e)}>
                                                <Wrench className="h-3 w-3" /> Log
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-gray-100 dark:border-gray-800" onClick={() => handleOpenDrawer(e)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{equipment.length === 0 ? 'No equipment registered yet' : 'No assets match your filters'}</p>
                            <p className="text-sm mt-1 max-w-sm">{equipment.length === 0 ? 'Click "Add Asset" to register your first biomedical/ICT/facility asset.' : 'Try a different search or filter.'}</p>
                        </div>
                    )
                )}
            </div>

            <AnimatePresence>
                {isDrawerOpen && editingEquipment && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setIsDrawerOpen(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col">
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0"><HardDrive className="h-5 w-5 text-white" /></div>
                                    <h2 className="text-lg font-bold text-white leading-tight">{editingEquipment.equipmentId ? 'Edit Asset' : 'Add Asset'}</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}><X className="h-5 w-5" /></Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Asset Code <span className="text-red-500">*</span></Label>
                                        <Input className={formErrors.assetCode ? 'border-red-500' : ''} value={editingEquipment.assetCode ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, assetCode: e.target.value }))} />
                                        {formErrors.assetCode && <p className="text-[10px] text-red-500">{formErrors.assetCode}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Name <span className="text-red-500">*</span></Label>
                                        <Input className={formErrors.name ? 'border-red-500' : ''} value={editingEquipment.name ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, name: e.target.value }))} />
                                        {formErrors.name && <p className="text-[10px] text-red-500">{formErrors.name}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Model</Label>
                                        <Input value={editingEquipment.model ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, model: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Serial Number</Label>
                                        <Input value={editingEquipment.serialNumber ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, serialNumber: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Manufacturer</Label>
                                        <Input value={editingEquipment.manufacturer ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, manufacturer: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Category</Label>
                                        <Select value={editingEquipment.category ?? 'BIOMEDICAL'} onValueChange={v => setEditingEquipment(p => ({ ...p!, category: v as EquipmentCategory }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Department</Label>
                                        <Input value={editingEquipment.department ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, department: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Location</Label>
                                        <Input value={editingEquipment.location ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, location: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>AMC Vendor</Label>
                                        <Input value={editingEquipment.amcVendor ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, amcVendor: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>PM Interval (days)</Label>
                                        <Input type="number" min={1} value={editingEquipment.pmIntervalDays ?? ''} onChange={e => setEditingEquipment(p => ({ ...p!, pmIntervalDays: e.target.value ? Number(e.target.value) : null }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Status</Label>
                                        <Select value={editingEquipment.status ?? 'ACTIVE'} onValueChange={v => setEditingEquipment(p => ({ ...p!, status: v as EquipmentStatus }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                                                <SelectItem value="RETIRED">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingEquipment.equipmentId ? 'Save' : 'Create Asset')}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Dialog open={!!logTarget} onOpenChange={(o) => { if (!o) setLogTarget(null); }}>
                <DialogContent className="max-w-lg">
                    {logTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{logTarget.name}</DialogTitle>
                                <DialogDescription>{logTarget.assetCode} · Maintenance log</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Activity Type</Label>
                                        <Select value={logActivityType} onValueChange={v => setLogActivityType(v as MaintenanceActivityType)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(Object.keys(ACTIVITY_LABELS) as MaintenanceActivityType[]).map(a => <SelectItem key={a} value={a}>{ACTIVITY_LABELS[a]}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Outcome <span className="text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Select value={logOutcome || 'NONE'} onValueChange={v => setLogOutcome(v === 'NONE' ? '' : v as MaintenanceOutcome)}>
                                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">None</SelectItem>
                                                <SelectItem value="PASS">Pass</SelectItem>
                                                <SelectItem value="FAIL">Fail</SelectItem>
                                                <SelectItem value="NEEDS_FOLLOWUP">Needs Follow-up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea rows={2} value={logNotes} onChange={e => setLogNotes(e.target.value)} />
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm" disabled={logSaving} onClick={submitLog} className="bg-brand-600 hover:bg-brand-700 text-white">
                                        {logSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null} Record Log
                                    </Button>
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">History</h4>
                                    {logHistoryLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    ) : logHistory.length === 0 ? (
                                        <p className="text-xs text-gray-400">No maintenance logs yet.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {logHistory.map(l => (
                                                <div key={l.maintenanceLogId} className="text-xs flex items-center justify-between border-b border-gray-50 dark:border-gray-900 pb-1">
                                                    <span className="font-medium">{ACTIVITY_LABELS[l.activityType]}</span>
                                                    <span className="text-gray-400">{new Date(l.performedAt).toLocaleDateString('en-IN')} {l.outcome ? `· ${l.outcome}` : ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EquipmentMaster;
