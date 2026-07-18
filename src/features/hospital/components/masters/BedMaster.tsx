import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Edit2, Bed, DoorOpen, BedDouble, Archive, User, AlertCircle, X,
    CheckSquare, Settings2, Trash2, RefreshCw, Loader2, ChevronDown, ChevronRight, Building2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { bedService, type BedMasterItem, type UpsertBedMasterRequest } from '@/features/hospital/services/bedService';
import { roomService, type RoomItem, type UpsertRoomRequest } from '@/features/hospital/services/roomService';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionApi } from '@/features/subscription/hooks/useSubscriptionApi';
import { UsageLimitBadge } from '@/features/subscription/components/UsageLimitBadge';

// --- Types ---

export interface BedRecord {
    id: string;
    roomId?: string;
    wardCode: string;
    wardName: string;
    wardType: string;
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
    roomId: b.roomId,
    wardCode: b.wardCode ?? '',
    wardName: b.wardName ?? '',
    wardType: b.wardType ?? 'GENERAL',
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

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    OCCUPIED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    CLEANING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    RESERVED: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    BLOCKED: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-800',
};

// Default Ward Code / Name suggested for each Ward Type when adding a room.
const WARD_TYPE_DEFAULTS: Record<string, { code: string; name: string }> = {
    GENERAL:      { code: 'W-GEN',  name: 'General Ward' },
    SEMI_PRIVATE: { code: 'W-SEMI', name: 'Semi-Private Ward' },
    PRIVATE:      { code: 'W-PVT',  name: 'Private Room' },
    DELUXE:       { code: 'W-DLX',  name: 'Deluxe Room' },
    ICU:          { code: 'W-ICU',  name: 'ICU' },
    NICU:         { code: 'W-NICU', name: 'NICU' },
    PICU:         { code: 'W-PICU', name: 'PICU' },
    HDU:          { code: 'W-HDU',  name: 'HDU' },
    ISOLATION:    { code: 'W-ISO',  name: 'Isolation Ward' },
    RECOVERY:     { code: 'W-REC',  name: 'Recovery Room' },
    OTHER:        { code: 'W-OTH',  name: 'Other' },
};

type EditingRoom = Partial<UpsertRoomRequest> & { roomId?: string; totalBeds?: number };

type RoomErrors = { floorNo?: string; roomNo?: string; totalBeds?: string; dailyRate?: string };
const validateRoom = (rec: EditingRoom | null, isNew: boolean): RoomErrors => {
    const e: RoomErrors = {};
    if (!rec) return e;
    if (!String(rec.floorNo ?? '').trim()) e.floorNo = 'Floor is required';
    if (!String(rec.roomNo ?? '').trim()) e.roomNo = 'Room number is required';
    if (isNew) {
        const tb = Number(rec.totalBeds);
        if (rec.totalBeds == null || isNaN(tb) || tb < 1) e.totalBeds = 'Total beds must be at least 1';
    } else {
        const cap = Number(rec.capacityInRoom);
        if (rec.capacityInRoom == null || isNaN(cap) || cap < 1) e.totalBeds = 'Capacity must be at least 1';
    }
    const rate = Number(rec.dailyRate);
    if (rec.dailyRate == null || isNaN(rate) || rate < 0) e.dailyRate = 'Daily rate must be 0 or more';
    return e;
};

// Bed form validation. A room-linked bed inherits ward/rate from its room (nothing to validate
// here); a legacy standalone bed (no room) still needs its own ward code / bed code / rate.
type BedErrors = { wardCode?: string; bedCode?: string; wardRoomDailyRate?: string; bedDailyRateOverride?: string; incentiveAmount?: string };
const validateBed = (rec: Partial<BedRecord> | null): BedErrors => {
    const e: BedErrors = {};
    if (!rec) return e;
    if (!rec.roomId) {
        if (!String(rec.wardCode ?? '').trim()) e.wardCode = 'Ward code is required';
        if (!String(rec.bedCode ?? '').trim()) e.bedCode = 'Bed code is required';
        const rate = Number(rec.wardRoomDailyRate);
        if (rec.wardRoomDailyRate == null || isNaN(rate) || rate <= 0) e.wardRoomDailyRate = 'Daily rate must be greater than 0';
    }
    if (rec.bedDailyRateOverride != null && (isNaN(Number(rec.bedDailyRateOverride)) || Number(rec.bedDailyRateOverride) < 0)) e.bedDailyRateOverride = 'Override must be 0 or more';
    if (rec.incentiveAmount != null && (isNaN(Number(rec.incentiveAmount)) || Number(rec.incentiveAmount) < 0)) e.incentiveAmount = 'Incentive must be 0 or more';
    return e;
};

const UNASSIGNED_FLOOR = 'UNASSIGNED';

const extractErrorMessage = (e: unknown, fallback: string): string =>
    (axios.isAxiosError(e) && (e.response?.data as { message?: string } | undefined)?.message) || fallback;

export const BedMaster = () => {
    const hospitalId = useAuthStore(state => state.hospitalId) || '';
    const { getUsage } = useSubscriptionApi();
    const { data: usage, isLoading: isUsageLoading } = getUsage(hospitalId);

    // --- Data ---
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [beds, setBeds] = useState<BedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWardType, setFilterWardType] = useState('ALL');
    // Deactivated beds are hidden from the bed lists by default — they're kept for history but
    // shouldn't look "still there" after being deactivated. Toggle to bring them back into view.
    const [showInactive, setShowInactive] = useState(false);

    // Left-panel navigation: 'ALL' | `floor:<floorNo>` | `room:<roomId>` | 'UNASSIGNED'
    const [selectedNode, setSelectedNode] = useState('ALL');
    const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

    // Add/Edit Room drawer
    const [isRoomDrawerOpen, setIsRoomDrawerOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<EditingRoom | null>(null);
    const [isSavingRoom, setIsSavingRoom] = useState(false);

    // Add More Beds (inline, within a selected room)
    const [addBedCount, setAddBedCount] = useState(1);
    const [addingBeds, setAddingBeds] = useState(false);

    // Add/Edit Bed drawer (per-bed overrides)
    const [isBedDrawerOpen, setIsBedDrawerOpen] = useState(false);
    const [editingBed, setEditingBed] = useState<Partial<BedRecord> | null>(null);
    const [isSavingBed, setIsSavingBed] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Result popup for deactivate/delete outcomes (modal instead of a toast, since these can
    // carry a list of blocked bed codes that's easy to miss in a toast that auto-dismisses).
    const [resultModal, setResultModal] = useState<{ title: string; description: string; variant?: 'default' | 'destructive' } | null>(null);

    // Multi-select for bulk deactivation, scoped to whichever bed list is currently on screen
    // (a single room's beds, or the unassigned-beds list) — cleared whenever navigation changes.
    const [selectedBedIds, setSelectedBedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const toggleBedSelection = (bedId: string) => {
        setSelectedBedIds(prev => {
            const next = new Set(prev);
            if (next.has(bedId)) next.delete(bedId); else next.add(bedId);
            return next;
        });
    };

    const loadAll = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const [roomsRes, bedsRes] = await Promise.all([
                roomService.list({ pageSize: 500 }),
                bedService.list({ pageSize: 500 }),
            ]);
            setRooms(roomsRes?.items ?? []);
            setBeds((bedsRes?.items ?? []).map(fromBackend));
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load beds/rooms');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);
    useEffect(() => { setSelectedBedIds(new Set()); }, [selectedNode]);

    // --- Derived data ---
    const existingFloors = useMemo(
        () => Array.from(new Set(rooms.map(r => r.floorNo).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [rooms]
    );

    const floorGroups = useMemo(() => {
        const map = new Map<string, { floorNo: string; rooms: RoomItem[]; totalBeds: number; occupiedBeds: number }>();
        for (const r of rooms) {
            const key = r.floorNo || UNASSIGNED_FLOOR;
            if (!map.has(key)) map.set(key, { floorNo: key, rooms: [], totalBeds: 0, occupiedBeds: 0 });
            const g = map.get(key)!;
            g.rooms.push(r);
            g.totalBeds += r.bedCount;
            g.occupiedBeds += r.occupiedBedCount;
        }
        return Array.from(map.values()).sort((a, b) => a.floorNo.localeCompare(b.floorNo, undefined, { numeric: true }));
    }, [rooms]);

    const unassignedBeds = useMemo(() => beds.filter(b => !b.roomId), [beds]);

    const matchesFilters = useCallback((r: RoomItem) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = !q || (r.roomNo ?? '').toLowerCase().includes(q) || (r.wardCode ?? '').toLowerCase().includes(q) || (r.wardName ?? '').toLowerCase().includes(q);
        const matchesWardType = filterWardType === 'ALL' || r.wardType === filterWardType;
        return matchesSearch && matchesWardType;
    }, [searchTerm, filterWardType]);

    const filteredUnassignedBeds = useMemo(() => {
        return unassignedBeds.filter(b => {
            if (!showInactive && !b.isActive) return false;
            const matchesSearch = b.bedCode.toLowerCase().includes(searchTerm.toLowerCase())
                || b.wardCode.toLowerCase().includes(searchTerm.toLowerCase())
                || (b.roomCode && b.roomCode.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesWardType = filterWardType === 'ALL' || b.wardType === filterWardType;
            return matchesSearch && matchesWardType;
        });
    }, [unassignedBeds, searchTerm, filterWardType, showInactive]);

    const parsedNode = useMemo(() => {
        if (selectedNode === 'ALL' || selectedNode === 'UNASSIGNED') return { kind: selectedNode as 'ALL' | 'UNASSIGNED' };
        if (selectedNode.startsWith('floor:')) return { kind: 'floor' as const, floorNo: selectedNode.slice(6) };
        if (selectedNode.startsWith('room:')) return { kind: 'room' as const, roomId: selectedNode.slice(5) };
        return { kind: 'ALL' as const };
    }, [selectedNode]);

    const selectedRoom = parsedNode.kind === 'room' ? rooms.find(r => r.roomId === parsedNode.roomId) ?? null : null;
    const selectedRoomBeds = selectedRoom ? beds.filter(b => b.roomId === selectedRoom.roomId && (showInactive || b.isActive)) : [];

    const roomsForRightPanel = useMemo(() => {
        if (parsedNode.kind === 'floor') return rooms.filter(r => (r.floorNo || UNASSIGNED_FLOOR) === parsedNode.floorNo && matchesFilters(r));
        if (parsedNode.kind === 'ALL') return rooms.filter(matchesFilters);
        return [];
    }, [rooms, parsedNode, matchesFilters]);

    // --- Navigation actions ---
    const toggleFloorExpand = (floorNo: string) => {
        setExpandedFloors(prev => {
            const next = new Set(prev);
            if (next.has(floorNo)) next.delete(floorNo); else next.add(floorNo);
            return next;
        });
    };

    const selectFloor = (floorNo: string) => {
        setSelectedNode(`floor:${floorNo}`);
        setExpandedFloors(prev => new Set(prev).add(floorNo));
    };

    const selectRoom = (room: RoomItem) => {
        setSelectedNode(`room:${room.roomId}`);
        if (room.floorNo) setExpandedFloors(prev => new Set(prev).add(room.floorNo!));
    };

    // --- Room actions ---
    const handleOpenRoomDrawer = (room: RoomItem | null = null) => {
        if (room) {
            setEditingRoom({ ...room, roomId: room.roomId });
        } else {
            const def = WARD_TYPE_DEFAULTS.GENERAL;
            setEditingRoom({
                wardCode: def.code, wardName: def.name, wardType: 'GENERAL',
                floorNo: parsedNode.kind === 'floor' ? parsedNode.floorNo : '',
                roomNo: '', roomType: '', totalBeds: 1, dailyRate: 0, isActive: true,
            });
        }
        setIsRoomDrawerOpen(true);
    };

    const roomFormErrors = validateRoom(editingRoom, !editingRoom?.roomId);
    const isRoomValid = Object.keys(roomFormErrors).length === 0;

    const handleSaveRoom = async () => {
        const isNew = !editingRoom?.roomId;
        const errs = validateRoom(editingRoom, isNew);
        const firstErr = errs.floorNo || errs.roomNo || errs.totalBeds || errs.dailyRate;
        if (firstErr || !editingRoom) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSavingRoom(true);
        try {
            const capacity = isNew ? Number(editingRoom.totalBeds) : Number(editingRoom.capacityInRoom);
            const req: UpsertRoomRequest = {
                roomId: editingRoom.roomId,
                wardCode: editingRoom.wardCode,
                wardName: editingRoom.wardName,
                wardType: editingRoom.wardType,
                floorNo: editingRoom.floorNo!.trim(),
                roomNo: editingRoom.roomNo!.trim(),
                roomType: editingRoom.roomType,
                capacityInRoom: capacity,
                dailyRate: Number(editingRoom.dailyRate ?? 0),
                isActive: editingRoom.isActive ?? true,
            };
            const res = await roomService.upsert(req);
            if (!res?.success) throw new Error(res?.message ?? 'Could not save room');

            if (isNew && Number(editingRoom.totalBeds) > 0) {
                const bulkRes = await bedService.bulkCreate({
                    roomId: res.roomId,
                    wardCode: req.wardCode,
                    wardName: req.wardName,
                    wardType: req.wardType,
                    floorNo: req.floorNo,
                    roomCode: req.roomNo,
                    roomType: req.roomType,
                    capacityInRoom: req.capacityInRoom,
                    wardRoomDailyRate: req.dailyRate,
                    bedCodePrefix: req.roomNo,
                    count: Number(editingRoom.totalBeds),
                    isActive: true,
                });
                if (bulkRes?.success === false) throw new Error(bulkRes.message ?? 'Room saved, but could not create its beds');
            }

            toast({ title: isNew ? 'Room created' : 'Room updated', description: `Room ${req.roomNo}` });
            if (isNew) {
                confetti({ particleCount: 90, spread: 70, origin: { x: 0.8, y: 0.8 }, colors: ['#4f46e5', '#10b981', '#3b82f6'] });
            }
            setIsRoomDrawerOpen(false);
            await loadAll(true);
            if (isNew) {
                setSelectedNode(`room:${res.roomId}`);
                setExpandedFloors(prev => new Set(prev).add(req.floorNo));
            }
        } catch (e: any) {
            toast({ title: 'Save failed', description: extractErrorMessage(e, e?.message ?? ''), variant: 'destructive' });
        } finally {
            setIsSavingRoom(false);
        }
    };

    const handleAddMoreBeds = async () => {
        if (!selectedRoom || addingBeds) return;
        setAddingBeds(true);
        try {
            const res = await bedService.bulkCreate({
                roomId: selectedRoom.roomId,
                wardCode: selectedRoom.wardCode,
                wardName: selectedRoom.wardName,
                wardType: selectedRoom.wardType,
                floorNo: selectedRoom.floorNo,
                roomCode: selectedRoom.roomNo,
                roomType: selectedRoom.roomType,
                capacityInRoom: selectedRoom.capacityInRoom,
                wardRoomDailyRate: selectedRoom.dailyRate,
                bedCodePrefix: selectedRoom.roomNo,
                count: addBedCount,
                isActive: true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not add beds');
            toast({ title: 'Beds added', description: res?.message });
            setAddBedCount(1);
            await loadAll(true);
        } catch (e: any) {
            toast({ title: 'Could not add beds', description: extractErrorMessage(e, e?.message ?? ''), variant: 'destructive' });
        } finally {
            setAddingBeds(false);
        }
    };

    // --- Bed actions (per-bed overrides on an existing bed) ---
    const handleOpenBedDrawer = (bed: BedRecord) => {
        setEditingBed({ ...bed });
        setIsBedDrawerOpen(true);
    };

    const bedFormErrors = validateBed(editingBed);
    const isBedValid = Object.keys(bedFormErrors).length === 0;

    const handleSaveBed = async () => {
        const errs = validateBed(editingBed);
        const firstErr = errs.wardCode || errs.bedCode || errs.wardRoomDailyRate || errs.bedDailyRateOverride || errs.incentiveAmount;
        if (firstErr || !editingBed) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSavingBed(true);
        try {
            const req: UpsertBedMasterRequest = {
                bedId: editingBed.id,
                wardCode: editingBed.wardCode,
                wardName: editingBed.wardName,
                wardType: editingBed.wardType,
                floorNo: editingBed.floorNo,
                roomCode: editingBed.roomCode,
                roomType: editingBed.roomType,
                capacityInRoom: editingBed.capacityInRoom,
                wardRoomDailyRate: Number(editingBed.wardRoomDailyRate ?? 0),
                bedDailyRateOverride: editingBed.bedDailyRateOverride != null ? Number(editingBed.bedDailyRateOverride) : undefined,
                incentiveAmount: editingBed.incentiveAmount != null ? Number(editingBed.incentiveAmount) : undefined,
                bedCode: editingBed.bedCode,
                bedName: editingBed.bedName,
                statusCode: editingBed.statusCode,
                genderRestriction: editingBed.genderRestriction,
                isActive: editingBed.isActive ?? true,
            };
            await bedService.upsert(req);
            setIsSavingBed(false);
            setIsSuccess(true);
            toast({ title: 'Success', description: 'Bed updated successfully.' });
            setTimeout(() => { setIsSuccess(false); setIsBedDrawerOpen(false); }, 900);
            await loadAll(true);
        } catch (e: any) {
            setIsSavingBed(false);
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    const quickChangeStatus = async (bedId: string, newStatus: BedRecord['statusCode']) => {
        const bed = beds.find(b => b.id === bedId);
        if (!bed || busyId) return;
        const previous = bed.statusCode;
        setBeds(prev => prev.map(b => b.id === bedId ? { ...b, statusCode: newStatus } : b));
        setBusyId(bedId);
        try {
            await bedService.upsert({
                bedId,
                wardCode: bed.wardCode, wardName: bed.wardName, wardType: bed.wardType, floorNo: bed.floorNo,
                roomCode: bed.roomCode, roomType: bed.roomType, capacityInRoom: bed.capacityInRoom,
                wardRoomDailyRate: bed.wardRoomDailyRate, bedDailyRateOverride: bed.bedDailyRateOverride ?? undefined,
                incentiveAmount: bed.incentiveAmount ?? undefined, bedCode: bed.bedCode, bedName: bed.bedName,
                statusCode: newStatus, genderRestriction: bed.genderRestriction, isActive: bed.isActive,
            });
            toast({ title: 'Status updated', description: `${bed.bedCode}: ${newStatus}` });
        } catch (e: any) {
            setBeds(prev => prev.map(b => b.id === bedId ? { ...b, statusCode: previous } : b));
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteBed = async (bedId: string) => {
        if (!window.confirm('Mark this bed as inactive? It will be hidden from the live list but retained for history.')) return;
        const bed = beds.find(b => b.id === bedId);
        if (!bed || busyId) return;
        setBusyId(bedId);
        try {
            await bedService.upsert({
                bedId,
                wardCode: bed.wardCode, wardName: bed.wardName, wardType: bed.wardType, floorNo: bed.floorNo,
                roomCode: bed.roomCode, roomType: bed.roomType, capacityInRoom: bed.capacityInRoom,
                wardRoomDailyRate: bed.wardRoomDailyRate, bedDailyRateOverride: bed.bedDailyRateOverride ?? undefined,
                incentiveAmount: bed.incentiveAmount ?? undefined, bedCode: bed.bedCode, bedName: bed.bedName,
                statusCode: bed.statusCode, genderRestriction: bed.genderRestriction, isActive: false,
            });
            setBeds(prev => prev.map(b => b.id === bedId ? { ...b, isActive: false } : b));
            setResultModal({ title: 'Bed deactivated', description: 'Hidden from active list.' });
        } catch (e) {
            setResultModal({ title: 'Could not deactivate', description: extractErrorMessage(e, 'Please try again.'), variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedBedIds);
        if (ids.length === 0 || bulkDeleting) return;
        if (!window.confirm(`Mark ${ids.length} selected bed(s) as inactive? Occupied beds will be skipped. This hides them from the active list but retains history.`)) return;

        setBulkDeleting(true);
        try {
            const result = await bedService.bulkDelete(ids);
            if (result.deactivated.length > 0) {
                const deactivatedSet = new Set(result.deactivated);
                setBeds(prev => prev.map(b => deactivatedSet.has(b.id) ? { ...b, isActive: false } : b));
            }
            if (result.blocked.length === 0) {
                setResultModal({ title: `${result.deactivated.length} bed(s) deactivated`, description: 'Hidden from active list.' });
            } else {
                const blockedCodes = result.blocked.map(b => b.bedCode || b.bedId).join(', ');
                setResultModal({
                    title: `${result.deactivated.length} deactivated, ${result.blocked.length} blocked`,
                    description: `Still occupied or unavailable: ${blockedCodes}`,
                    variant: 'destructive',
                });
            }
            setSelectedBedIds(new Set());
        } catch (e) {
            setResultModal({ title: 'Could not deactivate selected beds', description: extractErrorMessage(e, 'Please try again.'), variant: 'destructive' });
        } finally {
            setBulkDeleting(false);
        }
    };

    // Permanent hard delete — only actually removes beds with zero assignment history; anything
    // else (occupied, or ever assigned to a patient) is reported back as blocked, not silently
    // skipped, since "permanently delete" carries a stronger expectation than deactivate.
    const handleBulkHardDelete = async () => {
        const ids = Array.from(selectedBedIds);
        if (ids.length === 0 || bulkDeleting) return;
        if (!window.confirm(`Permanently delete ${ids.length} selected bed(s)? This cannot be undone. Beds that are occupied or have ever been assigned to a patient will be skipped — deactivate those instead.`)) return;

        setBulkDeleting(true);
        try {
            const result = await bedService.bulkHardDelete(ids);
            if (result.deleted.length > 0) {
                const deletedSet = new Set(result.deleted);
                setBeds(prev => prev.filter(b => !deletedSet.has(b.id)));
            }
            if (result.blocked.length === 0) {
                setResultModal({ title: `${result.deleted.length} bed(s) permanently deleted`, description: '' });
            } else {
                const blockedCodes = result.blocked.map(b => b.bedCode || b.bedId).join(', ');
                setResultModal({
                    title: `${result.deleted.length} deleted, ${result.blocked.length} blocked`,
                    description: `Occupied or has assignment history: ${blockedCodes}`,
                    variant: 'destructive',
                });
            }
            setSelectedBedIds(new Set());
        } catch (e) {
            setResultModal({ title: 'Could not permanently delete selected beds', description: extractErrorMessage(e, 'Please try again.'), variant: 'destructive' });
        } finally {
            setBulkDeleting(false);
        }
    };

    // --- Shared bed-card renderer (used for both a selected Room's beds and Unassigned Beds) ---
    const renderBedCard = (bed: BedRecord) => {
        const effectiveRate = bed.bedDailyRateOverride ?? bed.wardRoomDailyRate;
        const isOverridden = bed.bedDailyRateOverride !== null && bed.bedDailyRateOverride !== undefined;
        const isChecked = selectedBedIds.has(bed.id);
        return (
            <motion.div
                layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={bed.id}
                className={`relative bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${isChecked ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-800' : 'border-gray-200 dark:border-gray-800'} ${!bed.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
            >
                {bed.isActive && (
                    <button
                        type="button"
                        onClick={() => toggleBedSelection(bed.id)}
                        className={`absolute top-2.5 left-2 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-brand-600 border-brand-600' : 'bg-white/90 dark:bg-slate-900/90 border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100'}`}
                        title={isChecked ? 'Deselect bed' : 'Select bed'}
                        aria-label={isChecked ? 'Deselect bed' : 'Select bed'}
                    >
                        {isChecked && <CheckSquare className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
                    </button>
                )}
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
                                    {isOverridden && <div className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-1" title={`Overridden from base ₹${bed.wardRoomDailyRate}`} />}
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
                <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur pb-1 rounded shadow-sm border border-gray-100 dark:border-gray-800">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800" onClick={() => handleOpenBedDrawer(bed)}>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteBed(bed.id)} title="Deactivate Bed">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </motion.div>
        );
    };

    const renderRoomCard = (room: RoomItem) => {
        const isFull = room.bedCount >= room.capacityInRoom;
        return (
            <motion.div
                layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={room.roomId}
                className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md cursor-pointer ${!room.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                onClick={() => selectRoom(room)}
            >
                <div className={`h-1.5 w-full ${isFull ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-xl font-bold font-mono text-gray-900 dark:text-white flex items-center gap-1.5">
                                <DoorOpen className="h-4 w-4 text-gray-400" />
                                {room.roomNo}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={room.wardName}>
                                Floor {room.floorNo} • {room.wardCode}
                            </p>
                        </div>
                        <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 rounded-sm text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleOpenRoomDrawer(room); }}
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Daily Rate</div>
                            <div className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">₹{room.dailyRate.toLocaleString('en-IN')}</div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isFull ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            <BedDouble className="h-3 w-3" /> {room.bedCount}/{room.capacityInRoom}
                        </Badge>
                    </div>
                </div>
            </motion.div>
        );
    };

    const rightPanelTitle = parsedNode.kind === 'room' && selectedRoom
        ? `Room ${selectedRoom.roomNo} · Floor ${selectedRoom.floorNo}`
        : parsedNode.kind === 'floor' ? `Floor ${parsedNode.floorNo}`
        : parsedNode.kind === 'UNASSIGNED' ? 'Unassigned Beds'
        : 'All Rooms';

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="bed-search"
                            placeholder="Search room no, ward..."
                            className="pl-9 bg-gray-50 dark:bg-slate-950"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterWardType} onValueChange={setFilterWardType}>
                        <SelectTrigger className="w-[140px] h-10 bg-gray-50 dark:bg-slate-950">
                            <SelectValue placeholder="Ward Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            {Object.keys(WARD_TYPE_DEFAULTS).map(t => (
                                <SelectItem key={t} value={t}>{WARD_TYPE_DEFAULTS[t].name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 shrink-0 pl-1 cursor-pointer">
                        <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                        Show inactive
                    </label>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadAll(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenRoomDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Room
                    </Button>
                </div>
            </div>

            {/* BED CAPACITY (subscription plan limit) */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-slate-50/80 dark:bg-slate-900/40">
                <UsageLimitBadge label="Bed Capacity" current={usage?.currentBeds ?? 0} max={usage?.maxBeds ?? null} isLoading={isUsageLoading} />
            </div>

            {/* MAIN LAYOUT: Left Floor/Room Tree + Right Grid */}
            <div className="flex-1 flex overflow-hidden">
                {/* FLOOR TREE (LEFT PANEL) */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-y-auto hidden lg:flex flex-col pb-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Facility Explorer
                    </div>
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => setSelectedNode('ALL')}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedNode === 'ALL' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            All Rooms ({rooms.length})
                        </button>

                        <div className="pt-2 pb-1 px-3 text-xs font-bold text-gray-400 uppercase mt-2">Floors</div>
                        {floorGroups.map(fg => {
                            const isExpanded = expandedFloors.has(fg.floorNo);
                            const isSelected = selectedNode === `floor:${fg.floorNo}`;
                            return (
                                <div key={fg.floorNo}>
                                    <div className={`flex items-center rounded-lg ${isSelected ? 'bg-brand-50 dark:bg-brand-900/30' : ''}`}>
                                        <button onClick={() => toggleFloorExpand(fg.floorNo)} className="p-1.5 text-gray-400 hover:text-gray-600">
                                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => selectFloor(fg.floorNo)}
                                            className={`flex-1 text-left px-1 py-2 text-sm transition-colors flex justify-between items-center ${isSelected ? 'text-brand-700 dark:text-brand-300 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
                                        >
                                            <span className="truncate pr-2">{fg.floorNo === UNASSIGNED_FLOOR ? 'Unassigned Floor' : `Floor ${fg.floorNo}`}</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 shrink-0">
                                                {fg.occupiedBeds}/{fg.totalBeds}
                                            </span>
                                        </button>
                                    </div>
                                    {isExpanded && (
                                        <div className="ml-6 space-y-0.5">
                                            {fg.rooms.map(r => (
                                                <button
                                                    key={r.roomId}
                                                    onClick={() => selectRoom(r)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex justify-between items-center ${selectedNode === `room:${r.roomId}` ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate pr-2 flex items-center gap-1"><DoorOpen className="h-3 w-3 shrink-0" /> {r.roomNo}</span>
                                                    <span className="text-[10px] font-mono shrink-0">{r.bedCount}/{r.capacityInRoom}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {unassignedBeds.length > 0 && (
                            <>
                                <div className="pt-2 pb-1 px-3 text-xs font-bold text-gray-400 uppercase mt-2">Legacy</div>
                                <button
                                    onClick={() => setSelectedNode('UNASSIGNED')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${selectedNode === 'UNASSIGNED' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                >
                                    <span>Unassigned Beds</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400">{unassignedBeds.length}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        <Building2 className="h-4 w-4" /> {rightPanelTitle}
                    </div>

                    {selectedBedIds.size > 0 && (
                        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800 px-4 py-2.5">
                            <span className="text-sm font-semibold text-brand-800 dark:text-brand-300">{selectedBedIds.size} bed(s) selected</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedBedIds(new Set())} disabled={bulkDeleting}>
                                    Clear
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleBulkDelete} disabled={bulkDeleting}>
                                    {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                                    Deactivate Selected
                                </Button>
                                <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={handleBulkHardDelete} disabled={bulkDeleting} title="Permanently delete — only works for beds with no assignment history">
                                    {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Delete Permanently
                                </Button>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                        </div>
                    )}
                    {!loading && loadError && (
                        <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                            <AlertCircle className="h-8 w-8" />
                            <p className="font-semibold">{loadError}</p>
                            <Button size="sm" variant="outline" onClick={() => loadAll(true)} className="mt-2">
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                        </div>
                    )}

                    {!loading && !loadError && (parsedNode.kind === 'ALL' || parsedNode.kind === 'floor') && (
                        roomsForRightPanel.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {roomsForRightPanel.map(renderRoomCard)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                                <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{rooms.length === 0 ? 'No rooms configured yet' : 'No rooms match your filters'}</p>
                                <p className="text-sm mt-1 max-w-sm">{rooms.length === 0 ? 'Click "Add Room" to set up a floor, room number and its beds in one step.' : 'Try a different search or ward type filter.'}</p>
                            </div>
                        )
                    )}

                    {!loading && !loadError && parsedNode.kind === 'room' && selectedRoom && (
                        <div className="space-y-4">
                            {selectedRoom.bedCount < selectedRoom.capacityInRoom && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-slate-900 flex items-center gap-2">
                                    <Input
                                        type="number" min={1} max={selectedRoom.capacityInRoom - selectedRoom.bedCount}
                                        value={addBedCount}
                                        onChange={e => setAddBedCount(Math.max(1, Math.min(selectedRoom.capacityInRoom - selectedRoom.bedCount, Number(e.target.value) || 1)))}
                                        className="w-24 h-10"
                                    />
                                    <Button disabled={addingBeds} onClick={handleAddMoreBeds} className="h-10 bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
                                        {addingBeds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Add {addBedCount > 1 ? `${addBedCount} Beds` : 'Bed'} to this Room
                                    </Button>
                                </div>
                            )}
                            {selectedRoom.bedCount >= selectedRoom.capacityInRoom && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                    This room is at full capacity. Edit the room to raise capacity before adding more beds.
                                </p>
                            )}
                            {selectedRoomBeds.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {selectedRoomBeds.map(renderBedCard)}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-10">No beds yet — add one above.</p>
                            )}
                        </div>
                    )}

                    {!loading && !loadError && parsedNode.kind === 'UNASSIGNED' && (
                        filteredUnassignedBeds.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {filteredUnassignedBeds.map(renderBedCard)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                                <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">No unassigned beds match your filters</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ADD/EDIT ROOM DRAWER */}
            <AnimatePresence>
                {isRoomDrawerOpen && editingRoom && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsRoomDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <DoorOpen className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">
                                        {editingRoom.roomId ? 'Edit Room' : 'Add New Room'}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsRoomDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Floor <span className="text-red-500">*</span></Label>
                                        <Input
                                            list="floor-options"
                                            placeholder="e.g. 1, Ground, 2nd Floor"
                                            className={roomFormErrors.floorNo ? 'border-red-500' : ''}
                                            value={editingRoom.floorNo ?? ''}
                                            onChange={e => setEditingRoom(p => ({ ...p!, floorNo: e.target.value }))}
                                        />
                                        <datalist id="floor-options">
                                            {existingFloors.map(f => <option key={f} value={f} />)}
                                        </datalist>
                                        {roomFormErrors.floorNo && <p className="text-[10px] text-red-500">{roomFormErrors.floorNo}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Room No <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. 101"
                                            className={roomFormErrors.roomNo ? 'border-red-500' : ''}
                                            value={editingRoom.roomNo ?? ''}
                                            onChange={e => setEditingRoom(p => ({ ...p!, roomNo: e.target.value }))}
                                        />
                                        {roomFormErrors.roomNo && <p className="text-[10px] text-red-500">{roomFormErrors.roomNo}</p>}
                                        <p className="text-[10px] text-muted-foreground">Only needs to be unique within this floor.</p>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Ward Type</Label>
                                        <Select value={editingRoom.wardType} onValueChange={v => setEditingRoom(p => {
                                            if (!p) return p;
                                            const def = WARD_TYPE_DEFAULTS[v];
                                            const oldDef = WARD_TYPE_DEFAULTS[p.wardType as string];
                                            const next = { ...p, wardType: v };
                                            if (def) {
                                                if (!p.wardName || (oldDef && p.wardName === oldDef.name)) next.wardName = def.name;
                                                if (!p.wardCode || (oldDef && p.wardCode === oldDef.code)) next.wardCode = def.code;
                                            }
                                            return next;
                                        })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(WARD_TYPE_DEFAULTS).map(t => (
                                                    <SelectItem key={t} value={t}>{WARD_TYPE_DEFAULTS[t].name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Room Type <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Input placeholder="e.g. PRIVATE" value={editingRoom.roomType ?? ''} onChange={e => setEditingRoom(p => ({ ...p!, roomType: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>{editingRoom.roomId ? 'Capacity' : 'Total Beds'} <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number" min={1}
                                            className={roomFormErrors.totalBeds ? 'border-red-500' : ''}
                                            value={editingRoom.roomId ? (editingRoom.capacityInRoom ?? '') : (editingRoom.totalBeds ?? '')}
                                            onChange={e => setEditingRoom(p => {
                                                const n = Math.max(1, Number(e.target.value) || 1);
                                                return editingRoom!.roomId ? { ...p!, capacityInRoom: n } : { ...p!, totalBeds: n };
                                            })}
                                        />
                                        {roomFormErrors.totalBeds
                                            ? <p className="text-[10px] text-red-500">{roomFormErrors.totalBeds}</p>
                                            : <p className="text-[10px] text-muted-foreground">{editingRoom.roomId ? 'Max beds this room can hold.' : 'This many beds are created immediately.'}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Daily Rate (₹) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number" min={0}
                                            className={roomFormErrors.dailyRate ? 'border-red-500' : ''}
                                            value={editingRoom.dailyRate ?? ''}
                                            onChange={e => setEditingRoom(p => ({ ...p!, dailyRate: Number(e.target.value) }))}
                                        />
                                        {roomFormErrors.dailyRate && <p className="text-[10px] text-red-500">{roomFormErrors.dailyRate}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-slate-900/40">
                                    <div>
                                        <Label htmlFor="roomActive" className="cursor-pointer font-semibold">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive rooms are hidden from selection when adding beds.</p>
                                    </div>
                                    <Switch id="roomActive" checked={editingRoom.isActive} onCheckedChange={v => setEditingRoom(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsRoomDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSavingRoom || !isRoomValid} onClick={handleSaveRoom} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    {isSavingRoom ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingRoom.roomId ? 'Save' : 'Create Room + Beds')}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* EDIT BED DRAWER (per-bed overrides) */}
            <AnimatePresence>
                {isBedDrawerOpen && editingBed && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsBedDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <Bed className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-white leading-tight">Edit Bed</h2>
                                        <p className="text-[11px] text-brand-100/90 font-mono mt-0.5 truncate">{editingBed.bedCode}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsBedDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {editingBed.roomId ? (
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-slate-900/40 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <p><span className="font-semibold text-gray-800 dark:text-gray-200">Ward:</span> {editingBed.wardCode} ({editingBed.wardName})</p>
                                        <p><span className="font-semibold text-gray-800 dark:text-gray-200">Room:</span> {editingBed.roomCode} · Floor {editingBed.floorNo}</p>
                                        <p><span className="font-semibold text-gray-800 dark:text-gray-200">Base Rate:</span> ₹{editingBed.wardRoomDailyRate?.toLocaleString('en-IN')}</p>
                                        <p className="text-[10px] text-muted-foreground pt-1">Inherited from the room — edit the room to change these.</p>
                                    </div>
                                ) : (
                                    <section className="space-y-4">
                                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Ward / Room (legacy bed)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Ward Code <span className="text-red-500">*</span></Label>
                                                <Input className={bedFormErrors.wardCode ? 'border-red-500' : ''} value={editingBed.wardCode ?? ''} onChange={e => setEditingBed(p => ({ ...p!, wardCode: e.target.value }))} />
                                                {bedFormErrors.wardCode && <p className="text-[10px] text-red-500">{bedFormErrors.wardCode}</p>}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Ward Name</Label>
                                                <Input value={editingBed.wardName ?? ''} onChange={e => setEditingBed(p => ({ ...p!, wardName: e.target.value }))} />
                                            </div>
                                            <div className="grid gap-2 col-span-2">
                                                <Label>Daily Rate (₹) <span className="text-red-500">*</span></Label>
                                                <Input type="number" min={0} className={bedFormErrors.wardRoomDailyRate ? 'border-red-500' : ''} value={editingBed.wardRoomDailyRate ?? ''} onChange={e => setEditingBed(p => ({ ...p!, wardRoomDailyRate: Number(e.target.value) }))} />
                                                {bedFormErrors.wardRoomDailyRate && <p className="text-[10px] text-red-500">{bedFormErrors.wardRoomDailyRate}</p>}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Bed Specifics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Bed Code {!editingBed.roomId && <span className="text-red-500">*</span>}</Label>
                                            <Input disabled={!!editingBed.roomId} className={bedFormErrors.bedCode ? 'border-red-500' : ''} value={editingBed.bedCode ?? ''} onChange={e => setEditingBed(p => ({ ...p!, bedCode: e.target.value }))} />
                                            {bedFormErrors.bedCode && <p className="text-[10px] text-red-500">{bedFormErrors.bedCode}</p>}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Gender Restriction</Label>
                                            <Select value={editingBed.genderRestriction || 'NONE'} onValueChange={v => setEditingBed(p => ({ ...p!, genderRestriction: v as any }))}>
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
                                        <Switch id="bedActive" checked={editingBed.isActive} onCheckedChange={v => setEditingBed(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Rate Override &amp; Incentive
                                    </h3>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-gray-800 rounded-lg space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Bed Override Amount (₹) <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                                                <Input type="number" className="font-mono pl-7 bg-white dark:bg-slate-950" placeholder="Leave blank if same"
                                                    value={editingBed.bedDailyRateOverride || ''}
                                                    onChange={e => setEditingBed(p => ({ ...p!, bedDailyRateOverride: e.target.value ? Number(e.target.value) : null }))}
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
                                                    value={editingBed.incentiveAmount ?? ''}
                                                    onChange={e => setEditingBed(p => ({ ...p!, incentiveAmount: e.target.value ? Number(e.target.value) : null }))}
                                                />
                                            </div>
                                            {bedFormErrors.incentiveAmount && <p className="text-[10px] text-red-500">{bedFormErrors.incentiveAmount}</p>}
                                            <p className="text-[10px] text-muted-foreground">Default per day · editable at billing · blank/0 = none.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsBedDrawerOpen(false)}>Cancel</Button>
                                <motion.button
                                    disabled={isSavingBed || isSuccess || !isBedValid}
                                    onClick={handleSaveBed}
                                    className={`flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-w-[100px] h-10 px-4 ${isSuccess ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'}`}
                                    animate={isSuccess ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isSavingBed ? 'Saving...' : isSuccess ? <><CheckSquare className="h-4 w-4" /> Saved!</> : 'Save'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Dialog open={!!resultModal} onOpenChange={(open) => !open && setResultModal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className={resultModal?.variant === 'destructive' ? 'text-red-600' : undefined}>
                            {resultModal?.title}
                        </DialogTitle>
                        {resultModal?.description ? (
                            <DialogDescription>{resultModal.description}</DialogDescription>
                        ) : null}
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setResultModal(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BedMaster;
