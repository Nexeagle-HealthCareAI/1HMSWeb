import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, DoorOpen, Edit2, Archive, AlertCircle, X, RefreshCw, Loader2, Bed, BedDouble,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { roomService, type RoomItem, type RoomDetail, type UpsertRoomRequest } from '@/features/hospital/services/roomService';
import { bedService } from '@/features/hospital/services/bedService';

// Same ward-type default codes/names used by Bed Master, so a room created here lines up with
// the ward conventions beds already use.
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

type RoomErrors = { roomNo?: string; capacityInRoom?: string; dailyRate?: string };
const validateRoom = (rec: Partial<UpsertRoomRequest> | null): RoomErrors => {
    const e: RoomErrors = {};
    if (!rec) return e;
    if (!String(rec.roomNo ?? '').trim()) e.roomNo = 'Room number is required';
    const cap = Number(rec.capacityInRoom);
    if (rec.capacityInRoom == null || isNaN(cap) || cap < 1) e.capacityInRoom = 'Capacity must be at least 1';
    const rate = Number(rec.dailyRate);
    if (rec.dailyRate == null || isNaN(rate) || rate < 0) e.dailyRate = 'Daily rate must be 0 or more';
    return e;
};

export const RoomMaster = () => {
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWardType, setFilterWardType] = useState<string>('ALL');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<(Partial<UpsertRoomRequest> & { roomId?: string }) | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Room detail (its beds) — opened from a card's "View Beds" action.
    const [detailRoomId, setDetailRoomId] = useState<string | null>(null);
    const [detail, setDetail] = useState<RoomDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [addBedCount, setAddBedCount] = useState(1);
    const [addingBeds, setAddingBeds] = useState(false);

    const loadRooms = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await roomService.list({ pageSize: 500 });
            setRooms(res?.items ?? []);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load rooms');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadRooms(); }, [loadRooms]);

    const loadDetail = useCallback(async (roomId: string) => {
        setDetailLoading(true);
        try {
            const res = await roomService.getById(roomId);
            setDetail(res);
        } catch (e: any) {
            toast({ title: 'Could not load room', description: e?.message ?? '', variant: 'destructive' });
            setDetailRoomId(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (detailRoomId) { setAddBedCount(1); loadDetail(detailRoomId); }
        else setDetail(null);
    }, [detailRoomId, loadDetail]);

    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            const matchesSearch = (r.roomNo ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                || (r.wardCode ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                || (r.wardName ?? '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesWardType = filterWardType === 'ALL' || r.wardType === filterWardType;
            return matchesSearch && matchesWardType;
        });
    }, [rooms, searchTerm, filterWardType]);

    const handleOpenDrawer = (room: RoomItem | null = null) => {
        if (room) {
            setEditingRoom({ ...room });
        } else {
            const def = WARD_TYPE_DEFAULTS.GENERAL;
            setEditingRoom({ wardCode: def.code, wardName: def.name, wardType: 'GENERAL', capacityInRoom: 1, dailyRate: 0, isActive: true });
        }
        setIsDrawerOpen(true);
    };

    const roomFormErrors = validateRoom(editingRoom);
    const isRoomValid = Object.keys(roomFormErrors).length === 0;

    const handleSaveDrawer = async () => {
        const errs = validateRoom(editingRoom);
        const firstErr = errs.roomNo || errs.capacityInRoom || errs.dailyRate;
        if (firstErr || !editingRoom) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const req: UpsertRoomRequest = {
                roomId: editingRoom.roomId,
                wardCode: editingRoom.wardCode,
                wardName: editingRoom.wardName,
                wardType: editingRoom.wardType,
                floorNo: editingRoom.floorNo,
                roomNo: editingRoom.roomNo!.trim(),
                roomType: editingRoom.roomType,
                capacityInRoom: Number(editingRoom.capacityInRoom ?? 1),
                dailyRate: Number(editingRoom.dailyRate ?? 0),
                isActive: editingRoom.isActive ?? true,
            };
            const res = await roomService.upsert(req);
            if (!res?.success) throw new Error(res?.message ?? 'Could not save room');
            toast({ title: editingRoom.roomId ? 'Room updated' : 'Room created', description: res.roomNo ? `Room ${res.roomNo}` : undefined });
            setIsDrawerOpen(false);
            await loadRooms(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBeds = async () => {
        if (!detail || addingBeds) return;
        setAddingBeds(true);
        try {
            const res = await bedService.bulkCreate({
                roomId: detail.roomId,
                wardCode: detail.wardCode,
                wardName: detail.wardName,
                wardType: detail.wardType,
                floorNo: detail.floorNo,
                roomCode: detail.roomNo,
                roomType: detail.roomType,
                capacityInRoom: detail.capacityInRoom,
                wardRoomDailyRate: detail.dailyRate,
                bedCodePrefix: detail.roomNo,
                count: addBedCount,
                isActive: true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not add beds');
            toast({ title: 'Beds added', description: res?.message });
            await loadDetail(detail.roomId);
            await loadRooms(true);
        } catch (e: any) {
            toast({ title: 'Could not add beds', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setAddingBeds(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
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
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadRooms(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Room
                    </Button>
                </div>
            </div>

            {/* ROOM GRID */}
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
                        <Button size="sm" variant="outline" onClick={() => loadRooms(true)} className="mt-2">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && filteredRooms.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {filteredRooms.map(room => {
                            const isFull = room.bedCount >= room.capacityInRoom;
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={room.roomId}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md cursor-pointer ${!room.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                    onClick={() => setDetailRoomId(room.roomId)}
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
                                                    {room.wardCode} {room.roomType ? `• ${room.roomType}` : ''}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 rounded-sm text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 shrink-0"
                                                onClick={(e) => { e.stopPropagation(); handleOpenDrawer(room); }}
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
                        })}
                    </div>
                )}
                {!loading && !loadError && filteredRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                        <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{rooms.length === 0 ? 'No rooms configured yet' : 'No rooms match your filters'}</p>
                        <p className="text-sm mt-1 max-w-sm">{rooms.length === 0 ? 'Click "Add Room" to create your first room, then add its beds.' : 'Try a different search or ward type filter.'}</p>
                    </div>
                )}
            </div>

            {/* ADD/EDIT ROOM DRAWER */}
            <AnimatePresence>
                {isDrawerOpen && editingRoom && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[460px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
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
                                        <Label>Room No <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. 101"
                                            className={roomFormErrors.roomNo ? 'border-red-500' : ''}
                                            value={editingRoom.roomNo ?? ''}
                                            onChange={e => setEditingRoom(p => ({ ...p!, roomNo: e.target.value }))}
                                        />
                                        {roomFormErrors.roomNo && <p className="text-[10px] text-red-500">{roomFormErrors.roomNo}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Room Type <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Input placeholder="e.g. PRIVATE" value={editingRoom.roomType ?? ''} onChange={e => setEditingRoom(p => ({ ...p!, roomType: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Floor No <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Input placeholder="e.g. 2" value={editingRoom.floorNo ?? ''} onChange={e => setEditingRoom(p => ({ ...p!, floorNo: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Bed Capacity <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number" min={1}
                                            className={roomFormErrors.capacityInRoom ? 'border-red-500' : ''}
                                            value={editingRoom.capacityInRoom ?? ''}
                                            onChange={e => setEditingRoom(p => ({ ...p!, capacityInRoom: Math.max(1, Number(e.target.value) || 1) }))}
                                        />
                                        {roomFormErrors.capacityInRoom
                                            ? <p className="text-[10px] text-red-500">{roomFormErrors.capacityInRoom}</p>
                                            : <p className="text-[10px] text-muted-foreground">Max beds this room can hold.</p>}
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
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isRoomValid} onClick={handleSaveDrawer} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ROOM DETAIL: its beds */}
            <AnimatePresence>
                {detailRoomId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setDetailRoomId(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[460px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <DoorOpen className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-white leading-tight">Room {detail?.roomNo ?? ''}</h2>
                                        <p className="text-[11px] text-brand-100/90 mt-0.5 truncate">{detail?.wardName}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setDetailRoomId(null)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {detailLoading && (
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                                    </div>
                                )}
                                {!detailLoading && detail && (
                                    <>
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-slate-900/40 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-500">Beds in this room</span>
                                                <Badge variant="outline" className="text-[10px] font-bold">{detail.bedCount}/{detail.capacityInRoom}</Badge>
                                            </div>
                                            {detail.bedCount < detail.capacityInRoom && (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number" min={1} max={detail.capacityInRoom - detail.bedCount}
                                                        value={addBedCount}
                                                        onChange={e => setAddBedCount(Math.max(1, Math.min(detail.capacityInRoom - detail.bedCount, Number(e.target.value) || 1)))}
                                                        className="w-20 h-9"
                                                    />
                                                    <Button size="sm" disabled={addingBeds} onClick={handleAddBeds} className="h-9 bg-brand-600 hover:bg-brand-700 text-white gap-1.5 flex-1">
                                                        {addingBeds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                                        Add {addBedCount > 1 ? `${addBedCount} Beds` : 'Bed'}
                                                    </Button>
                                                </div>
                                            )}
                                            {detail.bedCount >= detail.capacityInRoom && (
                                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                                    This room is at full capacity. Edit the room to raise capacity before adding more beds.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {detail.beds.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-6">No beds yet — add one above.</p>
                                            )}
                                            {detail.beds.map(bed => (
                                                <div key={bed.bedId} className={`flex items-center justify-between rounded-lg border p-3 ${bed.isActive ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900' : 'border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-slate-950 opacity-60'}`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <Bed className="h-4 w-4 text-gray-400" />
                                                        <div>
                                                            <p className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">{bed.bedCode}</p>
                                                            <p className="text-[10px] text-muted-foreground">{bed.statusCode ?? '—'}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">₹{(bed.bedDailyRateOverride ?? bed.wardRoomDailyRate).toLocaleString('en-IN')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoomMaster;
