import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Loader2, RefreshCw, AlertCircle, Archive, UserRound, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import {
    nursingStationApi,
    type NurseRosterItem,
    type HospitalNurseItem,
    type WardListItem,
} from '@/features/ipd-redesign/services/nursingStationApi';
import { shiftApi, type ShiftItem } from '@/features/ipd-redesign/services/shiftApi';
import { ShiftSettingsSheet } from '@/features/ipd-redesign/components/ShiftSettingsSheet';

const SHIFT_COLORS: Record<string, string> = {
    MORNING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    EVENING: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    NIGHT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
};

type NewAssignment = {
    wardCode: string;
    nurseUserId: string;
    shiftCode: string;
    shiftDate: string;   // '' = standing assignment
    notes: string;
};

const emptyAssignment: NewAssignment = { wardCode: '', nurseUserId: '', shiftCode: 'MORNING', shiftDate: '', notes: '' };

const formatDateTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
};

export const NurseWardRoster: React.FC = () => {
    const hospitalId = useAuthStore((state) => state.hospitalId) || '';

    const [roster, setRoster] = useState<NurseRosterItem[]>([]);
    const [nurses, setNurses] = useState<HospitalNurseItem[]>([]);
    const [wards, setWards] = useState<WardListItem[]>([]);
    const [shiftConfig, setShiftConfig] = useState<ShiftItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [wardFilter, setWardFilter] = useState('ALL');
    const [shiftFilter, setShiftFilter] = useState('ALL');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState<NewAssignment>(emptyAssignment);
    const [isSaving, setIsSaving] = useState(false);
    const [releasingId, setReleasingId] = useState<string | null>(null);

    const loadAll = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const [rosterRes, nursesRes, wardsRes, shiftsRes] = await Promise.all([
                nursingStationApi.listRoster({ activeOnly: true }, hospitalId),
                nursingStationApi.listNurses(hospitalId),
                nursingStationApi.listWards(hospitalId),
                shiftApi.getShifts(hospitalId),
            ]);
            setRoster(rosterRes);
            setNurses(nursesRes);
            setWards(wardsRes);
            setShiftConfig(shiftsRes);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load the nurse roster');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hospitalId]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const filteredRoster = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return roster.filter(r => {
            if (wardFilter !== 'ALL' && r.wardCode !== wardFilter) return false;
            if (shiftFilter !== 'ALL' && r.shiftCode !== shiftFilter) return false;
            if (!q) return true;
            return (r.nurseName ?? '').toLowerCase().includes(q) || (r.wardName ?? r.wardCode).toLowerCase().includes(q);
        });
    }, [roster, searchTerm, wardFilter, shiftFilter]);

    const groupedByWard = useMemo(() => {
        const groups = new Map<string, NurseRosterItem[]>();
        for (const r of filteredRoster) {
            const key = r.wardName ?? r.wardCode;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(r);
        }
        return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredRoster]);

    const handleOpenDrawer = () => {
        setNewAssignment({ 
            ...emptyAssignment, 
            wardCode: wards[0]?.wardCode ?? '', 
            nurseUserId: nurses[0]?.userId ?? '',
            shiftCode: shiftConfig[0]?.shiftCode ?? ''
        });
        setIsDrawerOpen(true);
    };

    const isValid = Boolean(newAssignment.wardCode && newAssignment.nurseUserId && newAssignment.shiftCode);

    const handleSave = async () => {
        if (!isValid) {
            toast({ title: 'Validation Error', description: 'Ward, nurse and shift are required.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            await nursingStationApi.assign(
                {
                    wardCode: newAssignment.wardCode,
                    nurseUserId: newAssignment.nurseUserId,
                    shiftCode: newAssignment.shiftCode,
                    shiftDate: newAssignment.shiftDate || null,
                    notes: newAssignment.notes.trim() || undefined,
                },
                hospitalId,
            );
            toast({ title: 'Nurse assigned', description: 'The roster has been updated.' });
            setIsDrawerOpen(false);
            await loadAll(true);
        } catch (e: any) {
            toast({ title: 'Could not assign the nurse', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRelease = async (row: NurseRosterItem) => {
        if (!window.confirm(`Release ${row.nurseName ?? 'this nurse'} from ${row.wardName ?? row.wardCode} (${row.shiftCode})?`)) return;
        setReleasingId(row.nurseShiftAssignmentId);
        try {
            await nursingStationApi.release(row.nurseShiftAssignmentId, hospitalId);
            toast({ title: 'Nurse released' });
            await loadAll(true);
        } catch (e: any) {
            toast({ title: 'Could not release the nurse', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setReleasingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950/20 font-sans relative overflow-hidden rounded-2xl">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search nurse or ward..."
                            className="pl-9 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={wardFilter} onValueChange={setWardFilter}>
                        <SelectTrigger className="h-10 rounded-xl w-full sm:w-[160px]"><SelectValue placeholder="All wards" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All wards</SelectItem>
                            {wards.map(w => <SelectItem key={w.wardCode} value={w.wardCode}>{w.wardName ?? w.wardCode}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                        <SelectTrigger className="h-10 rounded-xl w-full sm:w-[140px]"><SelectValue placeholder="All shifts" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All shifts</SelectItem>
                            {shiftConfig.sort((a, b) => a.sortOrder - b.sortOrder).map(s => <SelectItem key={s.shiftCode} value={s.shiftCode}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                        <Settings className="h-4 w-4 text-slate-500 mr-1.5" />
                        <span className="text-slate-600 hidden sm:inline">Shift Settings</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadAll(true)} disabled={refreshing || loading} className="h-10 rounded-xl gap-1.5 border-slate-200 text-slate-700 font-bold px-4">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={handleOpenDrawer} disabled={wards.length === 0 || nurses.length === 0 || shiftConfig.length === 0} className="h-10 rounded-xl flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Assign Nurse
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/10">
                {loading && (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadAll(true)} className="mt-2 rounded-xl">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && (
                    groupedByWard.length > 0 ? (
                        <div className="space-y-6">
                            {groupedByWard.map(([wardLabel, rows]) => (
                                <div key={wardLabel}>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">{wardLabel}</h3>
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                                        {rows.map(row => (
                                            <div key={row.nurseShiftAssignmentId} className="flex items-center justify-between gap-3 p-3.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                                                        <UserRound className="h-4.5 w-4.5 text-brand-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{row.nurseName ?? 'Unnamed nurse'}</p>
                                                        <p className="text-xs text-slate-450 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {row.shiftDate ? `One-off cover · ${row.shiftDate}` : 'Standing assignment'}
                                                            {row.assignedAt && ` · since ${formatDateTime(row.assignedAt)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5', SHIFT_COLORS[row.shiftCode] || 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700')}>
                                                        {row.shiftCode}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                                                        disabled={releasingId === row.nurseShiftAssignmentId}
                                                        onClick={() => handleRelease(row)}
                                                    >
                                                        {releasingId === row.nurseShiftAssignmentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Release'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500 dark:text-zinc-450">
                            <Archive className="h-12 w-12 text-slate-350 dark:text-zinc-700 mb-4" />
                            <p className="font-semibold text-lg text-slate-700 dark:text-zinc-305">{roster.length === 0 ? 'No nurses rostered yet' : 'No roster rows match your search'}</p>
                            <p className="text-sm mt-1 max-w-sm">{roster.length === 0 ? 'Click "Assign Nurse" to roster a nurse onto a ward and shift.' : 'Try a different search or filter.'}</p>
                        </div>
                    )
                )}
            </div>

            {/* ASSIGN NURSE DRAWER */}
            {createPortal(
                <AnimatePresence>
                    {isDrawerOpen && (
                        <motion.div
                            key="drawer-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    )}
                    {isDrawerOpen && (
                        <motion.div
                            key="drawer-content"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[calc(100%-2rem)] sm:w-[440px] rounded-l-[32px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[60] flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <UserRound className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Assign Nurse to Ward</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Ward <span className="text-red-500">*</span></Label>
                                    <Select value={newAssignment.wardCode} onValueChange={v => setNewAssignment(p => ({ ...p, wardCode: v }))}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select ward" /></SelectTrigger>
                                        <SelectContent>
                                            {wards.map(w => <SelectItem key={w.wardCode} value={w.wardCode}>{w.wardName ?? w.wardCode} ({w.bedCount} beds)</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Nurse <span className="text-red-500">*</span></Label>
                                    <Select value={newAssignment.nurseUserId} onValueChange={v => setNewAssignment(p => ({ ...p, nurseUserId: v }))}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select nurse" /></SelectTrigger>
                                        <SelectContent>
                                            {nurses.map(n => <SelectItem key={n.userId} value={n.userId}>{n.fullName ?? n.mobileNumber}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Shift <span className="text-red-500">*</span></Label>
                                    <Select value={newAssignment.shiftCode} onValueChange={v => setNewAssignment(p => ({ ...p, shiftCode: v }))}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {shiftConfig.sort((a, b) => a.sortOrder - b.sortOrder).map(s => <SelectItem key={s.shiftCode} value={s.shiftCode}>{s.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">
                                        One-off date <span className="text-[9px] text-muted-foreground font-normal lowercase">(leave blank for a standing assignment)</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        className="h-10 rounded-xl"
                                        value={newAssignment.shiftDate}
                                        onChange={e => setNewAssignment(p => ({ ...p, shiftDate: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Notes <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                    <Input
                                        placeholder="e.g. covering for Priya"
                                        className="h-10 rounded-xl"
                                        value={newAssignment.notes}
                                        onChange={e => setNewAssignment(p => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-55 dark:bg-zinc-900/60 flex justify-end gap-2 shrink-0">
                                <Button variant="ghost" className="h-10 rounded-xl text-slate-650" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold px-5">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assigning...</> : 'Assign'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            
            <ShiftSettingsSheet
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                hospitalId={hospitalId}
                onShiftsChanged={() => loadAll(true)}
            />
        </div>
    );
};

export default NurseWardRoster;
