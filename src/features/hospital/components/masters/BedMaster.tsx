import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Layers, Edit2, Bed, Beaker, Archive, User, Activity, AlertCircle, X, CheckSquare, Settings2, Trash2, RefreshCw, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { bedService, type BedMasterItem, type UpsertBedMasterRequest } from '@/features/hospital/services/bedService';

// --- Types & Mock Data ---

export interface BedRecord {
    id: string;
    wardCode: string;
    wardName: string;
    wardType: 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'DELUXE' | 'ICU' | 'NICU' | 'PICU' | 'HDU' | 'ISOLATION' | 'RECOVERY' | 'OTHER';
    floorNo?: string;
    roomCode?: string;
    roomType?: string;
    capacityInRoom?: number;
    bedCode: string;
    bedName?: string;
    genderRestriction?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'NONE';
    wardRoomDailyRate: number;
    bedDailyRateOverride?: number | null;
    incentiveAmount?: number | null;
    statusCode: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED' | 'BLOCKED';
    isActive: boolean;
    lastStatusAt?: string;
}

const fromBackend = (b: BedMasterItem): BedRecord => ({
    id: b.bedId,
    wardCode: b.wardCode ?? '',
    wardName: b.wardName ?? '',
    wardType: (b.wardType as BedRecord['wardType']) ?? 'GENERAL',
    floorNo: b.floorNo,
    roomCode: b.roomCode,
    roomType: b.roomType,
    capacityInRoom: b.capacityInRoom,
    bedCode: b.bedCode ?? '',
    bedName: b.bedName,
    genderRestriction: (b.genderRestriction as BedRecord['genderRestriction']) ?? 'NONE',
    wardRoomDailyRate: Number(b.wardRoomDailyRate ?? 0),
    bedDailyRateOverride: b.bedDailyRateOverride != null ? Number(b.bedDailyRateOverride) : null,
    incentiveAmount: b.incentiveAmount != null ? Number(b.incentiveAmount) : null,
    statusCode: (b.statusCode as BedRecord['statusCode']) ?? 'AVAILABLE',
    isActive: b.isActive,
    lastStatusAt: b.lastStatusAt,
});

const STATUS_COLORS = {
    AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    OCCUPIED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    CLEANING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    RESERVED: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    BLOCKED: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-800'
};

// Default Ward Code / Name / Room Code + Bed Code prefix suggested for each Ward Type when adding
// a bed. The bed code number is auto-incremented per prefix from the existing beds (e.g. ICU-03).
const WARD_TYPE_DEFAULTS: Record<string, { code: string; name: string; room: string; bedPrefix: string }> = {
    GENERAL:      { code: 'W-GEN',  name: 'General Ward',      room: 'R-GEN',  bedPrefix: 'GEN' },
    SEMI_PRIVATE: { code: 'W-SEMI', name: 'Semi-Private Ward', room: 'R-SEMI', bedPrefix: 'SEMI' },
    PRIVATE:      { code: 'W-PVT',  name: 'Private Room',      room: 'R-PVT',  bedPrefix: 'PVT' },
    DELUXE:       { code: 'W-DLX',  name: 'Deluxe Room',       room: 'R-DLX',  bedPrefix: 'DLX' },
    ICU:          { code: 'W-ICU',  name: 'ICU',               room: 'R-ICU',  bedPrefix: 'ICU' },
    NICU:         { code: 'W-NICU', name: 'NICU',              room: 'R-NICU', bedPrefix: 'NICU' },
    PICU:         { code: 'W-PICU', name: 'PICU',              room: 'R-PICU', bedPrefix: 'PICU' },
    HDU:          { code: 'W-HDU',  name: 'HDU',               room: 'R-HDU',  bedPrefix: 'HDU' },
    ISOLATION:    { code: 'W-ISO',  name: 'Isolation Ward',    room: 'R-ISO',  bedPrefix: 'ISO' },
    RECOVERY:     { code: 'W-REC',  name: 'Recovery Room',     room: 'R-REC',  bedPrefix: 'REC' },
    OTHER:        { code: 'W-OTH',  name: 'Other',             room: 'R-OTH',  bedPrefix: 'OTH' },
};

// Bed form validation. Mandatory: ward code, bed code, ward/room daily rate (> 0).
// Optional numeric fields (override / incentive / capacity) and the bulk count are range-checked.
type BedErrors = { wardCode?: string; bedCode?: string; wardRoomDailyRate?: string; bedDailyRateOverride?: string; incentiveAmount?: string; capacityInRoom?: string; bedCount?: string };
const validateBed = (rec: Partial<BedRecord> | null, count?: number): BedErrors => {
    const e: BedErrors = {};
    if (!rec) return e;
    if (!String(rec.wardCode ?? '').trim()) e.wardCode = 'Ward code is required';
    if (!String(rec.bedCode ?? '').trim()) e.bedCode = 'Bed code is required';
    const rate = Number(rec.wardRoomDailyRate);
    if (rec.wardRoomDailyRate == null || isNaN(rate) || rate <= 0) e.wardRoomDailyRate = 'Daily rate must be greater than 0';
    if (rec.bedDailyRateOverride != null && (isNaN(Number(rec.bedDailyRateOverride)) || Number(rec.bedDailyRateOverride) < 0)) e.bedDailyRateOverride = 'Override must be 0 or more';
    if (rec.incentiveAmount != null && (isNaN(Number(rec.incentiveAmount)) || Number(rec.incentiveAmount) < 0)) e.incentiveAmount = 'Incentive must be 0 or more';
    if (rec.capacityInRoom != null && (isNaN(Number(rec.capacityInRoom)) || Number(rec.capacityInRoom) < 1)) e.capacityInRoom = 'Capacity must be at least 1';
    if (count != null && (isNaN(count) || count < 1 || count > 200)) e.bedCount = 'Number of beds must be 1–200';
    return e;
};

export const BedMaster = () => {
    // --- State ---
    const [beds, setBeds] = useState<BedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [filterWardType, setFilterWardType] = useState<string>('ALL');
    const [filterWardCode, setFilterWardCode] = useState<string>('ALL');

    // UI Layout
    const [selectedWardNode, setSelectedWardNode] = useState<string>('ALL'); // Left panel selection

    // Drawer & Modals
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Partial<BedRecord> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    // Number of beds to create at once (bulk add); 1 = single bed.
    const [bedCount, setBedCount] = useState(1);


    const loadBeds = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await bedService.list({ pageSize: 500 });
            setBeds((res?.items ?? []).map(fromBackend));
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load beds');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadBeds(); }, [loadBeds]);

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('bed-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Derived Data ---
    const uniqueWards = useMemo(() => Array.from(new Set(beds.map(b => b.wardCode))), [beds]);

    const filteredBeds = useMemo(() => {
        return beds.filter(b => {
            const matchesSearch = b.bedCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.wardCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (b.roomCode && b.roomCode.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesWardType = filterWardType === 'ALL' || b.wardType === filterWardType;

            // Left panel filtering overrides top filter if active
            const activeWardFilter = selectedWardNode !== 'ALL' ? selectedWardNode : (filterWardCode !== 'ALL' ? filterWardCode : 'ALL');
            const matchesWardNode = activeWardFilter === 'ALL' || b.wardCode === activeWardFilter;

            return matchesSearch && matchesWardType && matchesWardNode;
        });
    }, [beds, searchTerm, filterWardType, filterWardCode, selectedWardNode]);

    const wardStats = useMemo(() => {
        const stats: Record<string, { total: number, occupied: number, name: string, type: string }> = {};
        beds.forEach(b => {
            if (!stats[b.wardCode]) stats[b.wardCode] = { total: 0, occupied: 0, name: b.wardName, type: b.wardType };
            stats[b.wardCode].total++;
            if (b.statusCode === 'OCCUPIED') stats[b.wardCode].occupied++;
        });
        return stats;
    }, [beds]);

    // Next free bed code for a ward-type prefix, e.g. ICU-01, ICU-02… (scans existing beds).
    const nextBedCode = (prefix: string): string => {
        const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
        let max = 0;
        for (const b of beds) {
            const m = (b.bedCode ?? '').match(re);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return `${prefix}-${String(max + 1).padStart(2, '0')}`;
    };

    // Increment the trailing number of a bed code, preserving its prefix and zero-padding width
    // (e.g. ICU-01 → ICU-02, GEN-09 → GEN-10). Used after "Save & Add Next" — reliable even before
    // the bed list state has refreshed. Returns the code unchanged if it has no trailing number.
    const incrementBedCode = (code: string): string => {
        const m = (code ?? '').match(/^(.*?)(\d+)$/);
        if (!m) return code ?? '';
        const next = parseInt(m[2], 10) + 1;
        return m[1] + String(next).padStart(m[2].length, '0');
    };

    // --- Actions ---
    const handleOpenDrawer = (record: BedRecord | null = null) => {
        setBedCount(1);
        if (record) {
            setEditingRecord({ ...record });
        } else {
            const def = WARD_TYPE_DEFAULTS.GENERAL;
            setEditingRecord({
                wardCode: def.code, wardName: def.name, wardType: 'GENERAL', statusCode: 'AVAILABLE',
                roomCode: def.room, bedCode: nextBedCode(def.bedPrefix), wardRoomDailyRate: 0, isActive: true, genderRestriction: 'NONE'
            });
        }
        setIsDrawerOpen(true);
    };

    const handleSaveDrawer = async (addNext = false) => {
        const errs = validateBed(editingRecord, !editingRecord?.id ? bedCount : undefined);
        const firstErr = errs.wardCode || errs.bedCode || errs.wardRoomDailyRate || errs.bedDailyRateOverride || errs.incentiveAmount || errs.capacityInRoom || errs.bedCount;
        if (firstErr) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        const isNew = !editingRecord.id;

        // Bulk create: generate N beds in one go with server-side auto-incremented codes.
        if (isNew && bedCount > 1) {
            try {
                const prefix = ((editingRecord.bedCode ?? '').replace(/[-_\s]?\d+$/, '').trim())
                    || WARD_TYPE_DEFAULTS[editingRecord.wardType as string]?.bedPrefix
                    || 'BED';
                const res = await bedService.bulkCreate({
                    wardCode: editingRecord.wardCode,
                    wardName: editingRecord.wardName ?? '',
                    wardType: editingRecord.wardType,
                    floorNo: editingRecord.floorNo,
                    roomCode: editingRecord.roomCode,
                    roomType: editingRecord.roomType,
                    capacityInRoom: editingRecord.capacityInRoom,
                    wardRoomDailyRate: Number(editingRecord.wardRoomDailyRate ?? 0),
                    bedDailyRateOverride: editingRecord.bedDailyRateOverride != null ? Number(editingRecord.bedDailyRateOverride) : undefined,
                    incentiveAmount: editingRecord.incentiveAmount != null ? Number(editingRecord.incentiveAmount) : undefined,
                    genderRestriction: editingRecord.genderRestriction,
                    statusCode: editingRecord.statusCode,
                    isActive: editingRecord.isActive ?? true,
                    bedCodePrefix: prefix,
                    count: bedCount,
                });
                if (res?.success === false) throw new Error(res.message ?? 'Bulk create failed');
                setIsSaving(false);
                toast({ title: 'Beds created', description: res?.message ?? `${res?.createdCount ?? bedCount} beds created.` });
                await loadBeds(true);
                setIsDrawerOpen(false);
            } catch (e: any) {
                setIsSaving(false);
                toast({ title: 'Bulk create failed', description: e?.message ?? '', variant: 'destructive' });
            }
            return;
        }

        let savedRecord: BedRecord;
        try {
            const req: UpsertBedMasterRequest = {
                bedId: editingRecord.id || undefined,
                wardCode: editingRecord.wardCode,
                wardName: editingRecord.wardName ?? '',
                wardType: editingRecord.wardType,
                floorNo: editingRecord.floorNo,
                roomCode: editingRecord.roomCode,
                roomType: editingRecord.roomType,
                capacityInRoom: editingRecord.capacityInRoom,
                wardRoomDailyRate: Number(editingRecord.wardRoomDailyRate ?? 0),
                bedDailyRateOverride: editingRecord.bedDailyRateOverride != null ? Number(editingRecord.bedDailyRateOverride) : undefined,
                incentiveAmount: editingRecord.incentiveAmount != null ? Number(editingRecord.incentiveAmount) : undefined,
                bedCode: editingRecord.bedCode,
                bedName: editingRecord.bedName,
                statusCode: editingRecord.statusCode,
                genderRestriction: editingRecord.genderRestriction,
                isActive: editingRecord.isActive ?? true,
            };
            const res = await bedService.upsert(req);
            const newId = res?.bedId || editingRecord.id || '';
            savedRecord = {
                ...(editingRecord as BedRecord),
                id: newId,
                bedDailyRateOverride: editingRecord.bedDailyRateOverride != null ? Number(editingRecord.bedDailyRateOverride) : null,
            };
            setBeds(prev => {
                if (isNew) return [...prev, savedRecord];
                return prev.map(b => b.id === savedRecord.id ? savedRecord : b);
            });
        } catch (e: any) {
            setIsSaving(false);
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
            return;
        }

        setIsSaving(false);
        setIsSuccess(true);

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.8, y: 0.8 },
            colors: ['#4f46e5', '#10b981', '#3b82f6'] // Indigo, Emerald, Blue
        });

        toast({ title: 'Success', description: `Bed ${isNew ? 'added' : 'updated'} successfully.` });

        setTimeout(() => {
            setIsSuccess(false);
            if (addNext) {
                // Keep ward details; advance the bed code to the next number (ICU-01 → ICU-02).
                setEditingRecord({
                    ...savedRecord,
                    id: '',
                    bedCode: incrementBedCode(savedRecord.bedCode),
                    bedName: '',
                    bedDailyRateOverride: null,
                    statusCode: 'AVAILABLE'
                });
            } else {
                setIsDrawerOpen(false);
            }
        }, 1200);
    };


    const quickChangeStatus = async (bedId: string, newStatus: BedRecord['statusCode']) => {
        const bed = beds.find(b => b.id === bedId);
        if (!bed || busyId) return;
        const previous = bed.statusCode;
        // Optimistic
        setBeds(prev => prev.map(b => b.id === bedId ? { ...b, statusCode: newStatus } : b));
        setBusyId(bedId);
        try {
            const req: UpsertBedMasterRequest = {
                bedId,
                wardCode: bed.wardCode,
                wardName: bed.wardName,
                wardType: bed.wardType,
                floorNo: bed.floorNo,
                roomCode: bed.roomCode,
                roomType: bed.roomType,
                capacityInRoom: bed.capacityInRoom,
                wardRoomDailyRate: bed.wardRoomDailyRate,
                bedDailyRateOverride: bed.bedDailyRateOverride ?? undefined,
                incentiveAmount: bed.incentiveAmount ?? undefined,
                bedCode: bed.bedCode,
                bedName: bed.bedName,
                statusCode: newStatus,
                genderRestriction: bed.genderRestriction,
                isActive: bed.isActive,
            };
            await bedService.upsert(req);
            toast({ title: 'Status updated', description: `${bed.bedCode}: ${newStatus}` });
        } catch (e: any) {
            // Roll back
            setBeds(prev => prev.map(b => b.id === bedId ? { ...b, statusCode: previous } : b));
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    // Soft-delete a bed by flipping isActive=false (backend has no DELETE endpoint for beds —
    // they keep history attached). The visual list filter hides inactive items.
    const handleDeleteBed = async (bedId: string) => {
        if (!window.confirm("Mark this bed as inactive? It will be hidden from the live list but retained for history.")) return;
        const bed = beds.find(b => b.id === bedId);
        if (!bed || busyId) return;
        setBusyId(bedId);
        try {
            const req: UpsertBedMasterRequest = {
                bedId,
                wardCode: bed.wardCode,
                wardName: bed.wardName,
                wardType: bed.wardType,
                floorNo: bed.floorNo,
                roomCode: bed.roomCode,
                roomType: bed.roomType,
                capacityInRoom: bed.capacityInRoom,
                wardRoomDailyRate: bed.wardRoomDailyRate,
                bedDailyRateOverride: bed.bedDailyRateOverride ?? undefined,
                incentiveAmount: bed.incentiveAmount ?? undefined,
                bedCode: bed.bedCode,
                bedName: bed.bedName,
                statusCode: bed.statusCode,
                genderRestriction: bed.genderRestriction,
                isActive: false,
            };
            await bedService.upsert(req);
            setBeds(prev => prev.map(b => b.id === bedId ? { ...b, isActive: false } : b));
            toast({ title: 'Bed deactivated', description: 'Hidden from active list.' });
        } catch (e: any) {
            toast({ title: 'Could not deactivate', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    // Live validation for the drawer (gates the Save buttons + drives inline field errors).
    const bedFormErrors = validateBed(editingRecord, !editingRecord?.id ? bedCount : undefined);
    const isBedValid = Object.keys(bedFormErrors).length === 0;

    // --- Render ---
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="bed-search"
                            placeholder="Search bed, ward, room..."
                            className="pl-9 bg-gray-50 dark:bg-slate-950"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 text-sm w-full overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                        <Select value={filterWardType} onValueChange={setFilterWardType}>
                            <SelectTrigger className="w-[120px] h-10 bg-gray-50 dark:bg-slate-950">
                                <SelectValue placeholder="Ward Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="GENERAL">General</SelectItem>
                                <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
                                <SelectItem value="PRIVATE">Private</SelectItem>
                                <SelectItem value="DELUXE">Deluxe</SelectItem>
                                <SelectItem value="ICU">ICU</SelectItem>
                                <SelectItem value="NICU">NICU</SelectItem>
                                <SelectItem value="PICU">PICU</SelectItem>
                                <SelectItem value="HDU">HDU</SelectItem>
                                <SelectItem value="ISOLATION">Isolation</SelectItem>
                                <SelectItem value="RECOVERY">Recovery</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadBeds(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Bed
                    </Button>
                </div>
            </div>

            {/* MAIN LAYOUT: Left Ward List + Right Grid */}
            <div className="flex-1 flex overflow-hidden">
                {/* WARD TREE (LEFT PANEL) */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-y-auto hidden lg:flex flex-col pb-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Facility Explorer
                    </div>
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => setSelectedWardNode('ALL')}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedWardNode === 'ALL' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            All Facilities ({beds.length} Beds)
                        </button>

                        <div className="pt-2 pb-1 px-3 text-xs font-bold text-gray-400 uppercase mt-2">Wards</div>
                        {Object.keys(wardStats).map(wCode => {
                            const stat = wardStats[wCode];
                            const isSelected = selectedWardNode === wCode;
                            const isFull = stat.occupied >= stat.total;
                            return (
                                <button
                                    key={wCode}
                                    onClick={() => setSelectedWardNode(wCode)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex justify-between items-center ${isSelected ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="truncate pr-2">
                                        <div className="font-semibold truncate">{stat.name}</div>
                                        <div className="text-[10px] font-mono opacity-60 truncate">{wCode}</div>
                                    </div>
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFull ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}`}>
                                        {stat.occupied}/{stat.total}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* BED GRID (RIGHT PANEL) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                        </div>
                    )}
                    {!loading && loadError && (
                        <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                            <AlertCircle className="h-8 w-8" />
                            <p className="font-semibold">{loadError}</p>
                            <Button size="sm" variant="outline" onClick={() => loadBeds(true)} className="mt-2">
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                        </div>
                    )}
                    {!loading && !loadError && filteredBeds.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {filteredBeds.map(bed => {
                            const effectiveRate = bed.bedDailyRateOverride ?? bed.wardRoomDailyRate;
                            const isOverridden = bed.bedDailyRateOverride !== null && bed.bedDailyRateOverride !== undefined;

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={bed.id}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${!bed.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    {/* Top Color Bar indicating status */}
                                    <div className={`h-1.5 w-full ${STATUS_COLORS[bed.statusCode].split(' ')[0]}`} />

                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-xl font-bold font-mono text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <Bed className="h-4 w-4 text-gray-400" />
                                                    {bed.bedCode}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={bed.wardName}>
                                                    {bed.wardCode} {bed.roomCode ? `• ${bed.roomCode}` : ''}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[bed.statusCode]}`}>
                                                {bed.statusCode}
                                            </Badge>
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Effective Rate</div>
                                                    <div className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                        ₹{effectiveRate.toLocaleString('en-IN')}
                                                        {isOverridden && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-1" title={`Overridden from base ₹${bed.wardRoomDailyRate}`} />
                                                        )}
                                                    </div>
                                                </div>

                                                {bed.genderRestriction && bed.genderRestriction !== 'NONE' && (
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800">
                                                        {bed.genderRestriction === 'MALE_ONLY' ? 'MALE' : 'FEMALE'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Hover Bar */}
                                    <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur pb-1 rounded shadow-sm border border-gray-100 dark:border-gray-800">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800" onClick={() => handleOpenDrawer(bed)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        {bed.statusCode !== 'AVAILABLE' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800" onClick={() => quickChangeStatus(bed.id, 'AVAILABLE')} title="Mark Available">
                                                <CheckSquare className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {bed.statusCode === 'AVAILABLE' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => quickChangeStatus(bed.id, 'BLOCKED')} title="Mark Blocked">
                                                <Settings2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteBed(bed.id)} title="Delete Bed">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                </motion.div>
                            );
                        })}
                    </div>
                    )}
                    {!loading && !loadError && filteredBeds.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{beds.length === 0 ? 'No beds configured yet' : 'No beds match your filters'}</p>
                            <p className="text-sm mt-1 max-w-sm">{beds.length === 0 ? 'Click "Add Bed" to create your first bed in this hospital.' : 'Try selecting "All Facilities" or changing the ward type filter.'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT DRAWER: ADD/EDIT BED */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
                            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <Bed className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-white leading-tight">
                                            {editingRecord?.id ? 'Edit Bed' : 'Add New Bed'}
                                        </h2>
                                        <p className="text-[11px] text-brand-100/90 font-mono mt-0.5 truncate">
                                            {editingRecord?.id
                                                ? editingRecord.bedCode
                                                : (bedCount > 1
                                                    ? `${bedCount} beds · ${((editingRecord?.bedCode ?? '').replace(/[-_\s]?\d+$/, '') || 'BED')}-NN`
                                                    : `${editingRecord?.bedCode ?? ''} · auto-coded`)}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Ward / Room Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Ward Type</Label>
                                            <Select value={editingRecord?.wardType} onValueChange={v => setEditingRecord(p => {
                                                if (!p) return p;
                                                const next = { ...p, wardType: v as any };
                                                const oldDef = WARD_TYPE_DEFAULTS[p.wardType as string];
                                                const newDef = WARD_TYPE_DEFAULTS[v];
                                                // Auto-fill Code/Name/Room/Bed from the chosen type, but keep any value the user typed.
                                                if (newDef) {
                                                    if (!p.wardName || (oldDef && p.wardName === oldDef.name)) next.wardName = newDef.name;
                                                    if (!p.wardCode || (oldDef && p.wardCode === oldDef.code)) next.wardCode = newDef.code;
                                                    if (!p.roomCode || (oldDef && p.roomCode === oldDef.room)) next.roomCode = newDef.room;
                                                    // Regenerate the bed code only when blank or still an auto code for the old type.
                                                    const looksAuto = oldDef ? new RegExp(`^${oldDef.bedPrefix}-\\d+$`, 'i').test(p.bedCode ?? '') : false;
                                                    if (!p.bedCode || looksAuto) next.bedCode = nextBedCode(newDef.bedPrefix);
                                                }
                                                return next;
                                            })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GENERAL">General</SelectItem>
                                                    <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
                                                    <SelectItem value="PRIVATE">Private</SelectItem>
                                                    <SelectItem value="DELUXE">Deluxe</SelectItem>
                                                    <SelectItem value="ICU">ICU</SelectItem>
                                                    <SelectItem value="NICU">NICU</SelectItem>
                                                    <SelectItem value="PICU">PICU</SelectItem>
                                                    <SelectItem value="HDU">HDU</SelectItem>
                                                    <SelectItem value="ISOLATION">Isolation</SelectItem>
                                                    <SelectItem value="RECOVERY">Recovery</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Capacity in Room <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="e.g. 4 (leave blank if N/A)"
                                                value={editingRecord?.capacityInRoom ?? ''}
                                                onChange={e => setEditingRecord(p => ({ ...p!, capacityInRoom: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value)) }))}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Bed Specifics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 items-start">
                                        {!editingRecord?.id && (
                                            <div className="grid gap-2 col-span-2 sm:col-span-1">
                                                <Label>Number of beds</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={200}
                                                    value={bedCount}
                                                    onChange={e => setBedCount(Math.max(1, Math.min(200, Math.floor(Number(e.target.value)) || 1)))}
                                                />
                                                <p className="text-[10px] text-muted-foreground">Set &gt; 1 to create several beds at once (auto-numbered).</p>
                                            </div>
                                        )}
                                        <div className="grid gap-2 col-span-2 sm:col-span-1">
                                            <Label>Gender Restriction</Label>
                                            <Select value={editingRecord?.genderRestriction || 'NONE'} onValueChange={v => setEditingRecord(p => ({ ...p!, genderRestriction: v as any }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NONE">None</SelectItem>
                                                    <SelectItem value="MALE_ONLY">Male Only</SelectItem>
                                                    <SelectItem value="FEMALE_ONLY">Female Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-slate-900/40">
                                        <div>
                                            <Label htmlFor="bedActive" className="cursor-pointer font-semibold">Active</Label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Inactive beds are hidden from the live list.</p>
                                        </div>
                                        <Switch id="bedActive" checked={editingRecord?.isActive} onCheckedChange={v => setEditingRecord(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Financials (Daily Rates)
                                    </h3>
                                    <div className="grid gap-5">
                                        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-gray-800 rounded-lg space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Ward/Room Daily Rate (₹) <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                                                    <Input type="number" min="0" className={`font-mono pl-7 bg-white dark:bg-slate-950 ${bedFormErrors.wardRoomDailyRate ? 'border-red-500' : ''}`} value={editingRecord?.wardRoomDailyRate || ''} onChange={e => setEditingRecord(p => ({ ...p!, wardRoomDailyRate: Number(e.target.value) }))} />
                                                </div>
                                                {bedFormErrors.wardRoomDailyRate
                                                    ? <p className="text-[10px] text-red-500">{bedFormErrors.wardRoomDailyRate}</p>
                                                    : <p className="text-[10px] text-muted-foreground">Standard rate inherited from ward/room configuration.</p>}
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 grid gap-2">
                                                <Label>Bed Override Amount (₹) <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                                                    <Input type="number" className="font-mono pl-7 bg-white dark:bg-slate-950" placeholder="Leave blank if same"
                                                        value={editingRecord?.bedDailyRateOverride || ''}
                                                        onChange={e => setEditingRecord(p => ({ ...p!, bedDailyRateOverride: e.target.value ? Number(e.target.value) : null }))}
                                                    />
                                                </div>
                                                {bedFormErrors.bedDailyRateOverride && <p className="text-[10px] text-red-500">{bedFormErrors.bedDailyRateOverride}</p>}
                                                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">Use only if this specific bed costs differently than others in the same room.</p>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 grid gap-2">
                                                <Label>Incentive (₹) <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                                                    <Input type="number" min="0" className="font-mono pl-7 bg-white dark:bg-slate-950" placeholder="0"
                                                        value={editingRecord?.incentiveAmount ?? ''}
                                                        onChange={e => setEditingRecord(p => ({ ...p!, incentiveAmount: e.target.value ? Number(e.target.value) : null }))}
                                                    />
                                                </div>
                                                {bedFormErrors.incentiveAmount && <p className="text-[10px] text-red-500">{bedFormErrors.incentiveAmount}</p>}
                                                <p className="text-[10px] text-muted-foreground">Default per day · editable at billing · blank/0 = none.</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                {bedCount <= 1 && (
                                    <Button variant="outline" disabled={isSaving || isSuccess || !isBedValid} onClick={() => handleSaveDrawer(true)} className="border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 disabled:opacity-50">Save &amp; Add Next in Ward</Button>
                                )}
                                <motion.button
                                    disabled={isSaving || isSuccess || !isBedValid}
                                    onClick={() => handleSaveDrawer(false)}
                                    className={`flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-w-[100px] h-10 px-4 ${isSuccess
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                                        }`}
                                    animate={isSuccess ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isSaving ? "Saving..." : isSuccess ? <><CheckSquare className="h-4 w-4" /> Saved!</> : (!editingRecord?.id && bedCount > 1 ? `Create ${bedCount} Beds` : "Save")}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


        </div>
    );
};
