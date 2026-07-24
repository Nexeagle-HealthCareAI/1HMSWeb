import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, LayoutGrid, Wrench,
    Scissors, Clock, CheckCircle2, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useDepartments } from '@/features/appointment/hooks/useDepartments';
import { otBookingApi, type OperationTheatre, type OtBoardCase, type UpsertTheatreInput } from '@/features/ipd-redesign/services/otBookingApi';

const BOARD_POLL_MS = 15000;

const THEATRE_STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    IN_USE: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    CLEANING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    UNAVAILABLE: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-800',
};

const URGENCY_COLORS: Record<string, string> = {
    ROUTINE: 'bg-slate-100 text-slate-700 border-slate-200',
    URGENT: 'bg-amber-100 text-amber-800 border-amber-200',
    EMERGENCY: 'bg-rose-100 text-rose-800 border-rose-200',
};

const BOARD_COLUMNS: { key: OtBoardCase['statusCode']; label: string }[] = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'SCHEDULED', label: 'Scheduled' },
    { key: 'PRE_OP', label: 'Pre-Op' },
    { key: 'IN_THEATRE', label: 'In Theatre' },
    { key: 'POST_OP', label: 'Post-Op' },
    { key: 'COMPLETED', label: 'Completed' },
];

type EditingTheatre = Partial<UpsertTheatreInput> & { theatreId?: string };

type TheatreErrors = { theatreCode?: string; theatreName?: string; };
const validateTheatre = (rec: EditingTheatre | null): TheatreErrors => {
    const e: TheatreErrors = {};
    if (!rec) return e;
    if (!String(rec.theatreCode ?? '').trim()) e.theatreCode = 'Theatre code is required';
    if (!String(rec.theatreName ?? '').trim()) e.theatreName = 'Theatre name is required';
    return e;
};

const formatTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
};

export const OtMaster: React.FC = () => {
    const hospitalId = useAuthStore((state) => state.hospitalId) || '';
    const { data: departmentsResponse } = useDepartments(hospitalId);
    const departments = departmentsResponse?.departments ?? [];

    // --- Setup segment state ---
    const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingTheatre, setEditingTheatre] = useState<EditingTheatre | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const loadTheatres = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await otBookingApi.getTheatres(undefined, true);
            setTheatres(res);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load theatres');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadTheatres(); }, [loadTheatres]);

    const filteredTheatres = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return theatres;
        return theatres.filter(t =>
            t.theatreName.toLowerCase().includes(q) ||
            t.theatreCode.toLowerCase().includes(q) ||
            (t.departmentName ?? '').toLowerCase().includes(q));
    }, [theatres, searchTerm]);

    const handleOpenDrawer = (theatre: OperationTheatre | null = null) => {
        if (theatre) {
            setEditingTheatre({
                theatreId: theatre.theatreId,
                theatreCode: theatre.theatreCode,
                theatreName: theatre.theatreName,
                departmentId: theatre.departmentId ?? undefined,
                price: theatre.price,
                status: theatre.status,
                isActive: theatre.isActive,
            });
        } else {
            setEditingTheatre({ theatreCode: '', theatreName: '', isActive: true });
        }
        setIsDrawerOpen(true);
    };

    const formErrors = validateTheatre(editingTheatre);
    const isValid = Object.keys(formErrors).length === 0;

    const handleSave = async () => {
        const errs = validateTheatre(editingTheatre);
        const firstErr = errs.theatreCode || errs.theatreName;
        if (firstErr || !editingTheatre) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const res: any = await otBookingApi.upsertTheatre({
                theatreId: editingTheatre.theatreId,
                theatreCode: editingTheatre.theatreCode!.trim(),
                theatreName: editingTheatre.theatreName!.trim(),
                departmentId: editingTheatre.departmentId || null,
                price: 0,
                status: editingTheatre.status,
                isActive: editingTheatre.isActive ?? true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not save theatre');
            toast({ title: editingTheatre.theatreId ? 'Theatre updated' : 'Theatre created', description: editingTheatre.theatreName });
            setIsDrawerOpen(false);
            await loadTheatres(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950/20 font-sans relative overflow-hidden rounded-2xl">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search theatre name, code..."
                        className="pl-9 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadTheatres(true)} disabled={refreshing || loading} className="h-10 rounded-xl active:scale-[0.98] transition-all gap-1.5 border-slate-200 text-slate-700 font-bold px-4">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="h-10 rounded-xl flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-[0.98] transition-all px-5 shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Theatre
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/10 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadTheatres(true)} className="mt-2 rounded-xl active:scale-[0.98] transition-all">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredTheatres.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredTheatres.map(t => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={t.theatreId}
                                    className={`relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-lg ${!t.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className={`h-1.5 w-full ${(THEATRE_STATUS_COLORS[t.status] ?? THEATRE_STATUS_COLORS.AVAILABLE).split(' ')[0]}`} />
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                    <Scissors className="h-4 w-4 text-brand-500/70" />
                                                    {t.theatreName}
                                                </h3>
                                                <p className="text-xs text-slate-450 dark:text-zinc-400 font-medium truncate mt-0.5 max-w-[180px]">
                                                    {t.theatreCode} {t.departmentName ? `• ${t.departmentName}` : ''}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={`ml-2 text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${THEATRE_STATUS_COLORS[t.status] ?? THEATRE_STATUS_COLORS.AVAILABLE}`}>
                                                {t.status}
                                            </Badge>
                                        </div>
                                        <div className="mt-auto flex items-end justify-between">
                                            <div className="flex flex-col">
                                            </div>
                                            {!t.isActive && (
                                                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">Inactive</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-md border border-slate-100 dark:border-zinc-800 active:scale-[0.98] transition-all" onClick={() => handleOpenDrawer(t)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500 dark:text-zinc-450">
                            <Archive className="h-12 w-12 text-slate-350 dark:text-zinc-700 mb-4" />
                            <p className="font-semibold text-lg text-slate-700 dark:text-zinc-305">{theatres.length === 0 ? 'No theatres configured yet' : 'No theatres match your search'}</p>
                            <p className="text-sm mt-1 max-w-sm">{theatres.length === 0 ? 'Click "Add Theatre" to set up your first operation theatre.' : 'Try a different search.'}</p>
                        </div>
                    )
                )}
            </div>

            {/* ADD/EDIT THEATRE DRAWER */}
            {createPortal(
                <AnimatePresence>
                    {isDrawerOpen && editingTheatre && (
                        <motion.div
                            key="drawer-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    )}
                    {isDrawerOpen && editingTheatre && (
                        <motion.div
                            key="drawer-content"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[calc(100%-2rem)] sm:w-[480px] rounded-l-[32px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[60] flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                        <Scissors className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white leading-tight">
                                        {editingTheatre.theatreId ? 'Edit Theatre' : 'Add Operation Theatre'}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15 active:scale-[0.98] transition-all" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Theatre Code <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. OT-1"
                                            className={cn("h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all", formErrors.theatreCode ? 'border-red-500' : '')}
                                            value={editingTheatre.theatreCode ?? ''}
                                            onChange={e => setEditingTheatre(p => ({ ...p!, theatreCode: e.target.value }))}
                                        />
                                        {formErrors.theatreCode && <p className="text-[10px] text-red-500">{formErrors.theatreCode}</p>}
                                    </div>
                                    <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Theatre Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Main OT 1"
                                            className={cn("h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all", formErrors.theatreName ? 'border-red-500' : '')}
                                            value={editingTheatre.theatreName ?? ''}
                                            onChange={e => setEditingTheatre(p => ({ ...p!, theatreName: e.target.value }))}
                                        />
                                        {formErrors.theatreName && <p className="text-[10px] text-red-500">{formErrors.theatreName}</p>}
                                    </div>
                                    <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Department <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional)</span></Label>
                                        <Select value={editingTheatre.departmentId ?? 'NONE'} onValueChange={v => setEditingTheatre(p => ({ ...p!, departmentId: v === 'NONE' ? undefined : v }))}>
                                            <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="Select department" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="NONE">None</SelectItem>
                                                {departments.map(d => (
                                                    <SelectItem key={d.departmentId} value={d.departmentId}>{d.departmentName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Status</Label>
                                        <Select value={editingTheatre.status ?? 'AVAILABLE'} onValueChange={v => setEditingTheatre(p => ({ ...p!, status: v }))}>
                                            <SelectTrigger className="w-full h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                                <SelectItem value="IN_USE">In Use</SelectItem>
                                                <SelectItem value="CLEANING">Cleaning</SelectItem>
                                                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-950/20">
                                    <div>
                                        <Label htmlFor="theatreActive" className="cursor-pointer font-semibold text-slate-800 dark:text-zinc-200">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive theatres are hidden from booking.</p>
                                    </div>
                                    <Switch id="theatreActive" checked={editingTheatre.isActive} onCheckedChange={v => setEditingTheatre(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-55 dark:bg-zinc-900/60 flex justify-end gap-2 shrink-0">
                                <Button variant="ghost" className="h-10 rounded-xl active:scale-[0.98] transition-all text-slate-650" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 active:scale-[0.98] transition-all">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingTheatre.theatreId ? 'Save' : 'Create Theatre')}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}


        </div>
    );
};

export default OtMaster;
