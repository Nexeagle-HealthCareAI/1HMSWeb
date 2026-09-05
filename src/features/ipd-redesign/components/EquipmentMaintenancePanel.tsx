import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatIstDateTime } from '../utils/istDate';
import {
    equipmentApi,
    type EquipmentItem,
    type MaintenanceLogItem,
    type UpsertEquipmentInput,
    type RecordMaintenanceLogInput,
    type EquipmentCategory,
    type EquipmentStatus,
    type MaintenanceActivityType,
    type MaintenanceOutcome,
} from '../services/equipmentApi';
import {
    HardDrive, Plus, Search, Filter, Clock, CheckCircle2, AlertTriangle,
    ChevronRight, Loader2, Wrench, CalendarDays, BadgeCheck, XCircle,
    Building2, Tag, Cpu, ShieldCheck, FileText, RotateCcw, X
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<EquipmentStatus, { label: string; color: string; icon: React.ElementType }> = {
    ACTIVE:            { label: 'Active',           color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50',    icon: CheckCircle2 },
    UNDER_MAINTENANCE: { label: 'Under Maintenance', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',    icon: Wrench },
    RETIRED:           { label: 'Retired',           color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700',            icon: XCircle },
};

const CATEGORY_META: Record<EquipmentCategory, { label: string; color: string }> = {
    BIOMEDICAL: { label: 'Biomedical',  color: 'text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50' },
    ICT:        { label: 'IT / ICT',    color: 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50' },
    FACILITY:   { label: 'Facility',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' },
    FURNITURE:  { label: 'Furniture',   color: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50' },
    OTHER:      { label: 'Other',       color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' },
};

const ACTIVITY_LABELS: Record<MaintenanceActivityType, string> = {
    PM:          'Preventive Maintenance',
    BREAKDOWN:   'Breakdown Repair',
    CALIBRATION: 'Calibration',
    INSPECTION:  'Inspection',
    REPAIR:      'Repair',
    OTHER:       'Other',
};

const OUTCOME_META: Record<MaintenanceOutcome, { label: string; color: string }> = {
    PASS:          { label: 'Pass',           color: 'bg-green-50 text-green-700 border-green-200' },
    FAIL:          { label: 'Failed',         color: 'bg-red-50 text-red-700 border-red-200' },
    NEEDS_FOLLOWUP:{ label: 'Needs Followup', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const isDue = (item: EquipmentItem) => {
    if (!item.nextDueAt) return false;
    return new Date(item.nextDueAt) <= new Date();
};

// ─── Main Panel ──────────────────────────────────────────────────────────────

export const EquipmentMaintenancePanel: React.FC = () => {
    const { toast } = useToast();
    const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterDueOnly, setFilterDueOnly] = useState(false);

    // Sheets / dialogs
    const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
    const [upsertOpen, setUpsertOpen] = useState(false);
    const [upsertTarget, setUpsertTarget] = useState<EquipmentItem | null>(null);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await equipmentApi.getEquipment();
            setEquipment(data);
        } catch {
            toast({ title: 'Failed to load equipment', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return equipment.filter(e => {
            if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
            if (filterCategory !== 'ALL' && e.category !== filterCategory) return false;
            if (filterDueOnly && !isDue(e)) return false;
            if (q && !e.name.toLowerCase().includes(q) && !e.assetCode.toLowerCase().includes(q) && !(e.department?.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [equipment, search, filterStatus, filterCategory, filterDueOnly]);

    const dueCount = equipment.filter(isDue).length;

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-violet-500" /> Equipment Register
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {equipment.length} total · {dueCount > 0 && <span className="text-amber-600 font-bold">{dueCount} due for service</span>}
                        {dueCount === 0 && <span className="text-green-600 font-semibold">All up to date ✓</span>}
                    </p>
                </div>
                <Button
                    onClick={() => { setUpsertTarget(null); setUpsertOpen(true); }}
                    className="h-10 rounded-xl active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/10 px-5"
                >
                    <Plus className="h-4 w-4 mr-1.5" /> Add Equipment
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-3 border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl">
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search equipment..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm rounded-xl bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 w-[150px] rounded-xl text-sm bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                            <SelectItem value="RETIRED">Retired</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-9 w-[150px] rounded-xl text-sm bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">All Categories</SelectItem>
                            <SelectItem value="BIOMEDICAL">Biomedical</SelectItem>
                            <SelectItem value="ICT">IT / ICT</SelectItem>
                            <SelectItem value="FACILITY">Facility</SelectItem>
                            <SelectItem value="FURNITURE">Furniture</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        onClick={() => setFilterDueOnly(v => !v)}
                        className={cn(
                            'h-9 px-4 rounded-xl text-xs font-bold border transition-all active:scale-[0.98]',
                            filterDueOnly
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 hover:bg-amber-50 hover:text-amber-700'
                        )}
                    >
                        <Clock className="h-3.5 w-3.5 inline mr-1" /> Due Only
                    </button>
                </div>
            </Card>

            {/* Equipment List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading equipment...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No equipment found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or add new equipment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence>
                        {filtered.map((item, i) => {
                            const statusMeta = STATUS_META[item.status];
                            const catMeta = CATEGORY_META[item.category];
                            const StatusIcon = statusMeta.icon;
                            const due = isDue(item);

                            return (
                                <motion.div
                                    key={item.equipmentId}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                >
                                    <Card
                                        className={cn(
                                            'p-4 rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]',
                                            due ? 'border-amber-200 dark:border-amber-900/50' : 'border-slate-200/60 dark:border-zinc-800'
                                        )}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        {/* Top row */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{item.name}</h3>
                                                    {due && (
                                                        <Badge variant="outline" className="text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200 rounded-full shrink-0 animate-pulse">
                                                            DUE
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.assetCode}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-zinc-700 group-hover:text-brand-500 transition-colors shrink-0 mt-0.5" />
                                        </div>

                                        {/* Tags row */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', catMeta.color)}>{catMeta.label}</Badge>
                                            <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full flex items-center gap-1', statusMeta.color)}>
                                                <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                                            </Badge>
                                        </div>

                                        {/* Info row */}
                                        <div className="space-y-1 text-xs text-slate-500 dark:text-zinc-400">
                                            {item.department && (
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{item.department}{item.location ? ` · ${item.location}` : ''}</span>
                                                </div>
                                            )}
                                            {item.nextDueAt && (
                                                <div className={cn('flex items-center gap-1.5', due ? 'text-amber-600 font-semibold' : '')}>
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    <span>Next service: {formatIstDateTime(item.nextDueAt).split(' ')[0]}</span>
                                                </div>
                                            )}
                                            {item.amcVendor && (
                                                <div className="flex items-center gap-1.5">
                                                    <ShieldCheck className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">AMC: {item.amcVendor}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Detail Sheet */}
            <EquipmentDetailSheet
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onEdit={(item) => { setUpsertTarget(item); setUpsertOpen(true); }}
                onRefresh={() => load(true)}
            />

            {/* Add / Edit Sheet */}
            <UpsertEquipmentSheet
                open={upsertOpen}
                item={upsertTarget}
                onClose={() => { setUpsertOpen(false); setUpsertTarget(null); }}
                onSuccess={() => { setUpsertOpen(false); setUpsertTarget(null); load(true); }}
            />
        </div>
    );
};

// ─── Detail / Maintenance Log Sheet ──────────────────────────────────────────

const EquipmentDetailSheet: React.FC<{
    item: EquipmentItem | null;
    onClose: () => void;
    onEdit: (item: EquipmentItem) => void;
    onRefresh: () => void;
}> = ({ item, onClose, onEdit, onRefresh }) => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<MaintenanceLogItem[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logDialogOpen, setLogDialogOpen] = useState(false);

    useEffect(() => {
        if (!item) return;
        setLogsLoading(true);
        equipmentApi.getMaintenanceLogHistory(item.equipmentId)
            .then(setLogs)
            .catch(() => toast({ title: 'Failed to load history', variant: 'destructive' }))
            .finally(() => setLogsLoading(false));
    }, [item]);

    if (!item) return null;

    const statusMeta = STATUS_META[item.status];
    const catMeta = CATEGORY_META[item.category];
    const StatusIcon = statusMeta.icon;
    const due = isDue(item);

    return (
        <>
            <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
                <SheetContent side="right" className="w-full sm:w-[520px] p-0 overflow-y-auto flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 p-5">
                        <SheetHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <SheetTitle className="text-lg font-black text-slate-800 dark:text-zinc-100 truncate">{item.name}</SheetTitle>
                                    <SheetDescription className="font-mono text-xs mt-0.5">{item.assetCode}</SheetDescription>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={() => onEdit(item)}>
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', catMeta.color)}>{catMeta.label}</Badge>
                                <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full flex items-center gap-1', statusMeta.color)}>
                                    <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                                </Badge>
                                {due && <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200 rounded-full animate-pulse">DUE FOR SERVICE</Badge>}
                            </div>
                        </SheetHeader>
                    </div>

                    <div className="flex-1 p-5 space-y-6">
                        {/* Equipment Details */}
                        <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Equipment Details</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    { label: 'Model', value: item.model },
                                    { label: 'Serial No.', value: item.serialNumber, mono: true },
                                    { label: 'Manufacturer', value: item.manufacturer },
                                    { label: 'Department', value: item.department },
                                    { label: 'Location', value: item.location },
                                    { label: 'AMC Vendor', value: item.amcVendor },
                                    { label: 'Installed', value: item.installedAt ? formatIstDateTime(item.installedAt).split(' ')[0] : null },
                                    { label: 'Warranty End', value: item.warrantyEndAt ? formatIstDateTime(item.warrantyEndAt).split(' ')[0] : null },
                                    { label: 'AMC End', value: item.amcEndAt ? formatIstDateTime(item.amcEndAt).split(' ')[0] : null },
                                    { label: 'PM Interval', value: item.pmIntervalDays ? `${item.pmIntervalDays} days` : null },
                                    { label: 'Last Serviced', value: item.lastServiceAt ? formatIstDateTime(item.lastServiceAt).split(' ')[0] : null },
                                    { label: 'Next Due', value: item.nextDueAt ? formatIstDateTime(item.nextDueAt).split(' ')[0] : null },
                                ].filter(f => f.value).map(f => (
                                    <div key={f.label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{f.label}</p>
                                        <p className={cn('font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 truncate', f.mono && 'font-mono text-xs')}>{f.value}</p>
                                    </div>
                                ))}
                            </div>
                            {item.notes && (
                                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 text-sm text-slate-600 dark:text-zinc-400">
                                    <FileText className="h-3.5 w-3.5 inline mr-1" />{item.notes}
                                </div>
                            )}
                        </div>

                        {/* Maintenance Log */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Maintenance History</h4>
                                <Button
                                    size="sm"
                                    onClick={() => setLogDialogOpen(true)}
                                    className="h-8 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white active:scale-[0.98] transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Log Service
                                </Button>
                            </div>

                            {logsLoading ? (
                                <div className="flex items-center justify-center py-8 text-slate-400">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history...
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">No service records yet</p>
                                    <p className="text-xs mt-1">Log the first maintenance entry above.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {logs.map(log => (
                                        <div key={log.maintenanceLogId} className="p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-zinc-200">{ACTIVITY_LABELS[log.activityType]}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {formatIstDateTime(log.performedAt).split(' ')[0]} · {log.performedBy}
                                                        {log.vendorName && ` · ${log.vendorName}`}
                                                    </p>
                                                </div>
                                                {log.outcome && (
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full shrink-0', OUTCOME_META[log.outcome].color)}>
                                                        {OUTCOME_META[log.outcome].label}
                                                    </Badge>
                                                )}
                                            </div>
                                            {(log.findings || log.actionTaken || log.partsReplaced || log.cost) && (
                                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800 space-y-1 text-xs text-slate-600 dark:text-zinc-400">
                                                    {log.findings && <p><span className="font-bold text-slate-700 dark:text-zinc-300">Findings:</span> {log.findings}</p>}
                                                    {log.actionTaken && <p><span className="font-bold text-slate-700 dark:text-zinc-300">Action:</span> {log.actionTaken}</p>}
                                                    {log.partsReplaced && <p><span className="font-bold text-slate-700 dark:text-zinc-300">Parts:</span> {log.partsReplaced}</p>}
                                                    {log.cost && <p><span className="font-bold text-slate-700 dark:text-zinc-300">Cost:</span> ₹{log.cost.toLocaleString('en-IN')}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <RecordMaintenanceDialog
                open={logDialogOpen}
                equipmentId={item.equipmentId}
                onClose={() => setLogDialogOpen(false)}
                onSuccess={() => {
                    setLogDialogOpen(false);
                    equipmentApi.getMaintenanceLogHistory(item.equipmentId).then(setLogs).catch(() => {});
                    onRefresh();
                }}
            />
        </>
    );
};

// ─── Record Maintenance Dialog ────────────────────────────────────────────────

const RecordMaintenanceDialog: React.FC<{
    open: boolean;
    equipmentId: string;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ open, equipmentId, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<RecordMaintenanceLogInput>({
        activityType: 'PM',
        performedAt: new Date().toISOString().slice(0, 10),
        outcome: 'PASS',
    });

    const set = (field: keyof RecordMaintenanceLogInput, val: any) =>
        setForm(prev => ({ ...prev, [field]: val }));

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await equipmentApi.recordMaintenanceLog(equipmentId, form);
            toast({ title: 'Service logged successfully' });
            onSuccess();
        } catch {
            toast({ title: 'Failed to log service', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b border-slate-100 dark:border-zinc-800">
                    <DialogTitle className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-brand-500" /> Log Maintenance Service
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">Record a completed service, repair, or inspection.</DialogDescription>
                </DialogHeader>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Activity Type *</Label>
                            <Select value={form.activityType} onValueChange={v => set('activityType', v as MaintenanceActivityType)}>
                                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {(Object.entries(ACTIVITY_LABELS) as [MaintenanceActivityType, string][]).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Date *</Label>
                            <Input type="date" value={form.performedAt ?? ''} onChange={e => set('performedAt', e.target.value)} className="h-9 rounded-xl text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Performed By</Label>
                            <Input placeholder="Technician name" value={(form as any).performedBy ?? ''} onChange={e => set('performedBy' as any, e.target.value)} className="h-9 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Vendor</Label>
                            <Input placeholder="Vendor name" value={form.vendorName ?? ''} onChange={e => set('vendorName', e.target.value)} className="h-9 rounded-xl text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Findings</Label>
                        <textarea
                            className="w-full h-20 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            placeholder="What was found during inspection..."
                            value={form.findings ?? ''}
                            onChange={e => set('findings', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Action Taken</Label>
                        <textarea
                            className="w-full h-20 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            placeholder="What was done to resolve..."
                            value={form.actionTaken ?? ''}
                            onChange={e => set('actionTaken', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Parts Replaced</Label>
                            <Input placeholder="e.g. Filter, Battery" value={form.partsReplaced ?? ''} onChange={e => set('partsReplaced', e.target.value)} className="h-9 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Cost (₹)</Label>
                            <Input type="number" min="0" placeholder="0.00" value={form.cost ?? ''} onChange={e => set('cost', parseFloat(e.target.value))} className="h-9 rounded-xl text-sm font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Outcome</Label>
                            <Select value={form.outcome ?? 'PASS'} onValueChange={v => set('outcome', v as MaintenanceOutcome)}>
                                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="PASS">Pass</SelectItem>
                                    <SelectItem value="FAIL">Failed</SelectItem>
                                    <SelectItem value="NEEDS_FOLLOWUP">Needs Followup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Override Next Due Date</Label>
                            <Input type="date" value={form.nextDueAtOverride ?? ''} onChange={e => set('nextDueAtOverride', e.target.value)} className="h-9 rounded-xl text-sm" />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving} className="h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-[0.98] transition-all">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />} Save Record
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Add / Edit Equipment Sheet ───────────────────────────────────────────────

const EMPTY_FORM: UpsertEquipmentInput = {
    assetCode: '',
    name: '',
    category: 'BIOMEDICAL',
    status: 'ACTIVE',
};

const UpsertEquipmentSheet: React.FC<{
    open: boolean;
    item: EquipmentItem | null;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ open, item, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<UpsertEquipmentInput>(EMPTY_FORM);

    useEffect(() => {
        if (item) {
            setForm({
                equipmentId: item.equipmentId,
                assetCode: item.assetCode,
                name: item.name,
                model: item.model ?? '',
                serialNumber: item.serialNumber ?? '',
                manufacturer: item.manufacturer ?? '',
                category: item.category,
                location: item.location ?? '',
                department: item.department ?? '',
                amcVendor: item.amcVendor ?? '',
                installedAt: item.installedAt?.slice(0, 10) ?? '',
                warrantyEndAt: item.warrantyEndAt?.slice(0, 10) ?? '',
                amcEndAt: item.amcEndAt?.slice(0, 10) ?? '',
                pmIntervalDays: item.pmIntervalDays ?? undefined,
                status: item.status,
                notes: item.notes ?? '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [item, open]);

    const set = (field: keyof UpsertEquipmentInput, val: any) =>
        setForm(prev => ({ ...prev, [field]: val }));

    const handleSubmit = async () => {
        if (!form.assetCode.trim() || !form.name.trim()) {
            toast({ title: 'Asset Code and Name are required', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            await equipmentApi.upsertEquipment(form);
            toast({ title: item ? 'Equipment updated' : 'Equipment added' });
            onSuccess();
        } catch {
            toast({ title: 'Failed to save equipment', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={o => !o && onClose()}>
            <SheetContent side="right" className="w-full sm:w-[520px] p-0 overflow-y-auto flex flex-col">
                <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 p-5">
                    <SheetHeader>
                        <div className="flex items-center justify-between">
                            <SheetTitle className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                                <HardDrive className="h-5 w-5 text-brand-500" /> {item ? 'Edit Equipment' : 'Add New Equipment'}
                            </SheetTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <SheetDescription className="text-sm text-slate-500">
                            {item ? 'Update equipment details below.' : 'Fill in the details to register new equipment.'}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                    {/* Basic Info */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Basic Information</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Asset Code *</Label>
                                    <Input value={form.assetCode} onChange={e => set('assetCode', e.target.value)} placeholder="EQUIP-001" className="h-9 rounded-xl text-sm font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Category *</Label>
                                    <Select value={form.category} onValueChange={v => set('category', v as EquipmentCategory)}>
                                        <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {(Object.entries(CATEGORY_META) as [EquipmentCategory, {label:string}][]).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Equipment Name *</Label>
                                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ventilator, ECG Machine..." className="h-9 rounded-xl text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Model</Label>
                                    <Input value={form.model ?? ''} onChange={e => set('model', e.target.value)} placeholder="Model number" className="h-9 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Serial Number</Label>
                                    <Input value={form.serialNumber ?? ''} onChange={e => set('serialNumber', e.target.value)} placeholder="SN-XXXXXXXX" className="h-9 rounded-xl text-sm font-mono" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Manufacturer</Label>
                                <Input value={form.manufacturer ?? ''} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. GE, Philips, Drager" className="h-9 rounded-xl text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Location</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Department</Label>
                                <Input value={form.department ?? ''} onChange={e => set('department', e.target.value)} placeholder="e.g. ICU, OT" className="h-9 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Location</Label>
                                <Input value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Bed 3, Room 204..." className="h-9 rounded-xl text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Service Info */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Service & Warranty</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Installed Date</Label>
                                    <Input type="date" value={form.installedAt ?? ''} onChange={e => set('installedAt', e.target.value)} className="h-9 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">Warranty End</Label>
                                    <Input type="date" value={form.warrantyEndAt ?? ''} onChange={e => set('warrantyEndAt', e.target.value)} className="h-9 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">AMC Vendor</Label>
                                    <Input value={form.amcVendor ?? ''} onChange={e => set('amcVendor', e.target.value)} placeholder="Vendor name" className="h-9 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-600 uppercase">AMC End Date</Label>
                                    <Input type="date" value={form.amcEndAt ?? ''} onChange={e => set('amcEndAt', e.target.value)} className="h-9 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">PM Interval (days)</Label>
                                <Input
                                    type="number" min="1"
                                    placeholder="e.g. 90 for quarterly"
                                    value={form.pmIntervalDays ?? ''}
                                    onChange={e => set('pmIntervalDays', e.target.value ? parseInt(e.target.value) : null)}
                                    className="h-9 rounded-xl text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status & Notes */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Status & Notes</p>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Status</Label>
                                <Select value={form.status ?? 'ACTIVE'} onValueChange={v => set('status', v as EquipmentStatus)}>
                                    <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                                        <SelectItem value="RETIRED">Retired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600 uppercase">Notes</Label>
                                <textarea
                                    className="w-full h-20 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    placeholder="Any additional notes..."
                                    value={form.notes ?? ''}
                                    onChange={e => set('notes', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 p-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2 bg-white dark:bg-zinc-900">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving} className="h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-[0.98] transition-all">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                        {item ? 'Save Changes' : 'Add Equipment'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
