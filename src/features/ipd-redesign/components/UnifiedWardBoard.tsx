import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Loader2, Calendar as CalendarIcon, UserRound, AlertTriangle, X, Settings, HeartPulse, ThermometerSun, Pill, ChevronRight, BedDouble, Activity, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useAuthStore } from '@/store/authStore';
import { nursingStationApi, type HospitalNurseItem, type WardListItem, type PatientNurseAssignmentItem, type NursingStationPatientItem } from '@/features/ipd-redesign/services/nursingStationApi';
import { bedBoardApi, type BedBoardItem } from '@/features/ipd-redesign/services/bedBoardApi';
import { shiftApi, type ShiftItem } from '@/features/ipd-redesign/services/shiftApi';
import { ShiftSettingsSheet } from '@/features/ipd-redesign/components/ShiftSettingsSheet';
import { NurseQuickActionDialog } from '@/features/ipd-redesign/components/NurseQuickActionDialog';

const SUMMARY_POLL_MS = 60000;
const VITAL_STALE_HOURS = 6;

const isStale = (lastVitalAt?: string | null) => {
    if (!lastVitalAt) return true;
    return Date.now() - new Date(lastVitalAt).getTime() > VITAL_STALE_HOURS * 3600 * 1000;
};

const formatVitalAge = (iso?: string | null) => {
    if (!iso) return 'No vitals recorded';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// --- DRAGGABLE NURSE ---
const DraggableNurse = ({ nurse }: { nurse: HospitalNurseItem }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `nurse-${nurse.userId}`,
        data: { type: 'nurse', nurse },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-grab flex items-center gap-3 transition-all",
                isDragging && "opacity-50 ring-2 ring-brand-500 z-50",
                "hover:border-brand-300 hover:shadow-md"
            )}
        >
            <div className="h-8 w-8 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                <UserRound className="h-4 w-4 text-brand-600" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
                    {nurse.fullName || nurse.mobileNumber}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Nurse</p>
            </div>
        </div>
    );
};

// --- DROPPABLE BED CARD ---
const DroppableBedCard = ({ 
    bed, 
    clinicalSummary,
    shiftCode,
    assignments,
    onRemoveAssignment,
    isProcessing,
    onClick
}: { 
    bed: BedBoardItem;
    clinicalSummary?: NursingStationPatientItem;
    shiftCode: string;
    assignments: PatientNurseAssignmentItem[];
    onRemoveAssignment: (assignmentId: string) => void;
    isProcessing: boolean;
    onClick?: () => void;
}) => {
    const isOccupied = !!bed.admissionId;
    const { isOver, setNodeRef } = useDroppable({
        id: `bed-${bed.bedId}`,
        data: { type: 'bed', admissionId: bed.admissionId, shiftCode },
        disabled: !isOccupied
    });

    const stale = isStale(clinicalSummary?.lastVitalAt);

    return (
        <motion.div 
            ref={setNodeRef}
            onClick={isOccupied ? onClick : undefined}
            whileHover={isOccupied ? { y: -4, transition: { duration: 0.2 } } : {}}
            className={cn(
                "relative flex flex-col rounded-[1.25rem] border transition-all duration-300 min-h-[170px] overflow-hidden group",
                isOccupied 
                    ? "bg-white dark:bg-zinc-900/80 border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer"
                    : "bg-slate-50/40 dark:bg-zinc-950/40 border-slate-200/60 dark:border-zinc-800/60 border-dashed opacity-70 hover:opacity-100",
                isOver && "ring-2 ring-brand-500 border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 shadow-xl scale-[1.02] z-10"
            )}
        >
            {/* Header: Bed Name & Availability */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-zinc-800/60 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-transparent dark:from-zinc-900/80">
                <div className="flex items-center gap-2">
                    <BedDouble className={cn("h-4 w-4", isOccupied ? "text-brand-500" : "text-slate-400")} />
                    <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 tracking-tight">{bed.bedName || bed.bedCode}</span>
                </div>
                {!isOccupied && <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100/50 dark:bg-zinc-800/50 border-slate-200">Available</Badge>}
            </div>

            {/* Body: Patient Clinical Data */}
            <div className="p-4 flex-1 flex flex-col">
                {isOccupied ? (
                    <>
                        <p className="font-bold text-slate-900 dark:text-zinc-100 text-base truncate mb-1">
                            {clinicalSummary?.patientName || bed.patientName || 'Unnamed Patient'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mb-3">
                            {clinicalSummary?.patientAge ?? ''}{clinicalSummary?.patientSex ?? ''} 
                            {clinicalSummary?.primaryDoctorName ? ` · Dr. ${clinicalSummary.primaryDoctorName}` : ''}
                        </p>

                        <div className="flex items-center gap-3 mt-auto flex-wrap">
                            <span className={cn('flex items-center gap-1 text-[10px] font-bold', stale ? 'text-amber-600' : 'text-slate-500 dark:text-zinc-400')}>
                                <HeartPulse className="h-3.5 w-3.5" /> {formatVitalAge(clinicalSummary?.lastVitalAt)}
                            </span>
                            {clinicalSummary?.lastTemperature != null && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                    <ThermometerSun className="h-3.5 w-3.5" /> {clinicalSummary.lastTemperature}°
                                </span>
                            )}
                        </div>

                        {/* Med Alerts */}
                        <div className="flex gap-2 mt-3">
                            {(clinicalSummary?.medsOverdueCount ?? 0) > 0 && (
                                <Badge variant="outline" className="text-[9px] font-extrabold uppercase tracking-wider rounded-md px-1.5 py-0.5 bg-rose-50 text-rose-700 border-rose-200 shadow-sm">
                                    <AlertCircle className="h-2.5 w-2.5 mr-1" /> {(clinicalSummary?.medsOverdueCount ?? 0)} overdue
                                </Badge>
                            )}
                            {(clinicalSummary?.medsDueCount ?? 0) > 0 && (
                                <Badge variant="outline" className="text-[9px] font-extrabold uppercase tracking-wider rounded-md px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                                    <Pill className="h-2.5 w-2.5 mr-1" /> {(clinicalSummary?.medsDueCount ?? 0)} due
                                </Badge>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <BedDouble className="h-8 w-8 text-slate-300 dark:text-zinc-700 mb-2" />
                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-600">Empty Bed</span>
                    </div>
                )}
            </div>

            {/* Footer: Assignments */}
            {isOccupied && (
                <div className="p-2 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 flex flex-col gap-1 min-h-[40px]">
                    {assignments.length === 0 && !isOver && (
                        <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg py-1.5">
                            Unassigned
                        </div>
                    )}
                    {assignments.map(a => (
                        <div key={a.patientNurseAssignmentId} className="flex items-center justify-between gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 shadow-sm group/assign">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <UserRound className="h-3 w-3 text-brand-600" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate">{a.nurseName || 'Unknown'}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveAssignment(a.patientNurseAssignmentId); }}
                                disabled={isProcessing}
                                className="opacity-0 group-hover/assign:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center z-20 backdrop-blur-[1px]">
                            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                        </div>
                    )}
                </div>
            )}
            
            {isOver && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 border-2 border-brand-500 border-dashed rounded-[1.25rem] bg-brand-100/40 flex items-center justify-center z-30 pointer-events-none backdrop-blur-[2px]">
                    <div className="bg-brand-600 text-white px-4 py-2 rounded-full text-xs font-extrabold tracking-wide flex items-center gap-2 shadow-xl shadow-brand-500/20">
                        <UserRound className="h-4 w-4" /> Drop to assign
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export const UnifiedWardBoard: React.FC = () => {
    const navigate = useNavigate();
    const hospitalId = useAuthStore(state => state.hospitalId) || '';
    const roles = useAuthStore(state => state.userRoles ?? (state.userRole ? [state.userRole] : []));
    const canManageRoster = roles.some(r => r === 'Admin' || r === 'AdminDoctor');

    const [wards, setWards] = useState<WardListItem[]>([]);
    const [floors, setFloors] = useState<string[]>([]);
    const [nurses, setNurses] = useState<HospitalNurseItem[]>([]);
    const [shifts, setShifts] = useState<ShiftItem[]>([]);
    
    const [viewMode, setViewMode] = useState<'ward' | 'floor'>('ward');
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [selectedFloor, setSelectedFloor] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedShift, setSelectedShift] = useState<string>('');

    const [beds, setBeds] = useState<BedBoardItem[]>([]);
    const [clinicalSummaries, setClinicalSummaries] = useState<Record<string, NursingStationPatientItem>>({});
    const [assignments, setAssignments] = useState<Record<string, PatientNurseAssignmentItem[]>>({});
    
    const [loadingMasters, setLoadingMasters] = useState(true);
    const [loadingBoard, setLoadingBoard] = useState(false);
    const [processingCells, setProcessingCells] = useState<Set<string>>(new Set());
    
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [quickActionAdmissionId, setQuickActionAdmissionId] = useState<string | null>(null);

    // 1. Load Masters
    useEffect(() => {
        if (!hospitalId) return;
        Promise.all([
            nursingStationApi.listWards(hospitalId),
            nursingStationApi.listNurses(hospitalId),
            shiftApi.getShifts(hospitalId),
            bedBoardApi.getBoard(undefined, hospitalId) // fetch all beds once to extract floors
        ]).then(([wRes, nRes, sRes, allBeds]) => {
            setWards(wRes);
            setNurses(nRes);
            setShifts(sRes);
            
            const uniqueFloors = Array.from(new Set(allBeds.map(b => b.floorNo).filter(Boolean))) as string[];
            setFloors(uniqueFloors.sort());

            if (wRes.length > 0) setSelectedWard(wRes[0].wardCode);
            if (sRes.length > 0) setSelectedShift(sRes[0].shiftCode);
            if (uniqueFloors.length > 0) setSelectedFloor(uniqueFloors[0]);
        }).catch(() => {
            toast({ title: 'Error', description: 'Failed to load static masters', variant: 'destructive' });
        }).finally(() => {
            setLoadingMasters(false);
        });
    }, [hospitalId]);

    // 2. Load Board Data
    const loadBoard = async (silent = false) => {
        if (!hospitalId || !selectedShift) return;
        if (viewMode === 'ward' && !selectedWard) return;
        if (viewMode === 'floor' && !selectedFloor) return;
        
        if (!silent) setLoadingBoard(true);
        try {
            // Parallel fetches
            const [fetchedBeds, clinicalData] = await Promise.all([
                bedBoardApi.getBoard(viewMode === 'ward' ? selectedWard : undefined, hospitalId),
                nursingStationApi.getSummary({ wardCode: viewMode === 'ward' ? selectedWard : undefined, shiftCode: selectedShift }, hospitalId)
            ]);

            const finalBeds = viewMode === 'floor' ? fetchedBeds.filter(b => b.floorNo === selectedFloor) : fetchedBeds;

            // Map clinical data by admissionId
            const sumMap: Record<string, NursingStationPatientItem> = {};
            clinicalData.items.forEach(item => { sumMap[item.admissionId] = item; });

            // Fetch assignments for all admitted beds
            const assignData: Record<string, PatientNurseAssignmentItem[]> = {};
            await Promise.all(finalBeds.map(async (b) => {
                if (b.admissionId) {
                    const patientAssignments = await nursingStationApi.getPatientAssignments(b.admissionId, hospitalId);
                    assignData[b.admissionId] = patientAssignments.filter(a => 
                        a.shiftCode === selectedShift && (!a.shiftDate || a.shiftDate.startsWith(selectedDate))
                    );
                }
            }));

            setBeds(finalBeds);
            setClinicalSummaries(sumMap);
            setAssignments(assignData);
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to load board', variant: 'destructive' });
        } finally {
            setLoadingBoard(false);
        }
    };

    useEffect(() => {
        loadBoard();
    }, [hospitalId, viewMode, selectedWard, selectedFloor, selectedDate, selectedShift]);

    // Polling for clinical updates (vitals, meds)
    useEffect(() => {
        const id = setInterval(() => loadBoard(true), SUMMARY_POLL_MS);
        return () => clearInterval(id);
    }, [hospitalId, viewMode, selectedWard, selectedFloor, selectedDate, selectedShift]);

    // 3. Drag & Drop Handlers
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return; 

        const nurse = active.data.current?.nurse as HospitalNurseItem;
        const admissionId = over.data.current?.admissionId as string;
        const shiftCode = over.data.current?.shiftCode as string;

        if (!nurse || !admissionId || !shiftCode) return;

        const currentAssigns = assignments[admissionId] || [];
        if (currentAssigns.some(a => a.nurseUserId === nurse.userId && a.shiftCode === shiftCode)) {
            toast({ title: 'Notice', description: `${nurse.fullName || nurse.mobileNumber} is already assigned.` });
            return;
        }

        setProcessingCells(prev => new Set(prev).add(admissionId));
        try {
            await nursingStationApi.assignPatient({
                admissionId,
                nurseUserId: nurse.userId,
                shiftCode,
                shiftDate: selectedDate
            }, hospitalId);

            const refreshed = await nursingStationApi.getPatientAssignments(admissionId, hospitalId);
            setAssignments(prev => ({
                ...prev,
                [admissionId]: refreshed.filter(a => a.shiftCode === shiftCode && (!a.shiftDate || a.shiftDate.startsWith(selectedDate)))
            }));
            toast({ title: 'Assigned', description: `${nurse.fullName || nurse.mobileNumber} assigned to patient.` });
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to assign', variant: 'destructive' });
        } finally {
            setProcessingCells(prev => {
                const next = new Set(prev);
                next.delete(admissionId);
                return next;
            });
        }
    };

    const handleRemoveAssignment = async (admissionId: string, assignmentId: string) => {
        setProcessingCells(prev => new Set(prev).add(admissionId));
        try {
            await nursingStationApi.releasePatientAssignment(assignmentId, hospitalId);
            setAssignments(prev => {
                const updated = (prev[admissionId] || []).filter(a => a.patientNurseAssignmentId !== assignmentId);
                return { ...prev, [admissionId]: updated };
            });
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to remove assignment', variant: 'destructive' });
        } finally {
            setProcessingCells(prev => {
                const next = new Set(prev);
                next.delete(admissionId);
                return next;
            });
        }
    };

    if (loadingMasters) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
    }

    // Filter beds: If not an admin, maybe we only want to emphasize beds assigned to this nurse,
    // but for "Ward Board" it's good to see all beds, so we just show all.
    const sortedShifts = [...shifts].sort((a, b) => a.sortOrder - b.sortOrder);
    
    // KPIs
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.admissionId).length;
    const occupancyRate = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const emptyBeds = totalBeds - occupiedBeds;
    const wardMedsOverdue = Object.values(clinicalSummaries).reduce((sum, s) => sum + (s.medsOverdueCount || 0), 0);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-lg overflow-hidden">
            {/* Management Header / Toolbar */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-zinc-800 p-5 flex flex-col gap-5 z-10 shrink-0">
                
                {/* KPIs Row */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Occupancy</p>
                                <p className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-none mt-0.5">{occupancyRate}%</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                                <BedDouble className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available</p>
                                <p className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-none mt-0.5">{emptyBeds} <span className="text-sm font-medium text-slate-400">/ {totalBeds}</span></p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meds Overdue</p>
                                <p className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-none mt-0.5">{wardMedsOverdue}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-zinc-950/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-zinc-800">
                            <button
                                onClick={() => setViewMode('ward')}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'ward' ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300")}
                            >
                                Ward
                            </button>
                            <button
                                onClick={() => setViewMode('floor')}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'floor' ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300")}
                            >
                                Floor
                            </button>
                        </div>
                        
                        {viewMode === 'ward' ? (
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                <Label className="text-xs font-bold text-slate-500 uppercase shrink-0">Ward</Label>
                                <Select value={selectedWard} onValueChange={setSelectedWard}>
                                    <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 font-bold rounded-xl shadow-sm text-brand-700 dark:text-brand-400">
                                        <SelectValue placeholder="Select ward" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-lg border-slate-100 dark:border-zinc-800">
                                        {wards.map(w => (
                                            <SelectItem key={w.wardCode} value={w.wardCode} className="font-medium">{w.wardName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                <Label className="text-xs font-bold text-slate-500 uppercase shrink-0">Floor</Label>
                                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                                    <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 font-bold rounded-xl shadow-sm text-brand-700 dark:text-brand-400">
                                        <SelectValue placeholder="Select floor" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-lg border-slate-100 dark:border-zinc-800">
                                        {floors.length === 0 ? (
                                            <SelectItem value="none" disabled>No floors available</SelectItem>
                                        ) : (
                                            floors.map(f => (
                                                <SelectItem key={f} value={f} className="font-medium">Floor {f}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block"></div>  

                        <Select value={selectedShift} onValueChange={setSelectedShift}>
                            <SelectTrigger className="h-9 rounded-lg w-full sm:w-[160px] bg-white dark:bg-zinc-900 font-bold border-slate-200 shadow-sm">
                                <SelectValue placeholder="Select Shift" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedShifts.map(s => <SelectItem key={s.shiftCode} value={s.shiftCode}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full sm:w-[150px] font-medium shadow-sm text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canManageRoster && (
                            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-9 rounded-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm">
                                <Settings className="h-4 w-4 mr-1.5 text-slate-500" />
                                <span className="text-slate-600 font-bold text-xs">Shift Settings</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <DndContext onDragEnd={handleDragEnd}>
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
                    
                    {/* Main Board Grid */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">
                        {loadingBoard ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-sm z-20">
                                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                            </div>
                        ) : beds.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <AlertTriangle className="h-12 w-12 mb-3 text-slate-300" />
                                <p>No beds found in this ward.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {beds.map(b => (
                                    <DroppableBedCard
                                        key={b.bedId}
                                        bed={b}
                                        shiftCode={selectedShift}
                                        clinicalSummary={b.admissionId ? clinicalSummaries[b.admissionId] : undefined}
                                        assignments={b.admissionId ? (assignments[b.admissionId] || []) : []}
                                        onRemoveAssignment={(id) => b.admissionId && handleRemoveAssignment(b.admissionId, id)}
                                        isProcessing={b.admissionId ? processingCells.has(b.admissionId) : false}
                                        onClick={() => b.admissionId && setQuickActionAdmissionId(b.admissionId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Staff Sidebar (Admins Only) */}
                    {canManageRoster && (
                        <div className="w-full h-64 lg:h-auto lg:w-[300px] border-t lg:border-t-0 lg:border-l border-slate-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl flex flex-col z-10 lg:shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.05)]">
                            <div className="p-4 lg:p-5 border-b border-slate-200/40 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-950">
                                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 flex items-center justify-center shrink-0">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm tracking-tight">Staff Rostering</h3>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Drag a nurse to assign</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-row lg:flex-col gap-3 custom-scrollbar">
                                {nurses.map(n => (
                                    <div key={n.userId} className="w-[200px] lg:w-full shrink-0">
                                        <DraggableNurse nurse={n} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DndContext>

            <ShiftSettingsSheet
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                hospitalId={hospitalId}
                onShiftsChanged={() => shiftApi.getShifts(hospitalId).then(setShifts)}
            />

            <NurseQuickActionDialog 
                open={!!quickActionAdmissionId}
                onOpenChange={(open) => !open && setQuickActionAdmissionId(null)}
                admissionId={quickActionAdmissionId}
                patientSummary={quickActionAdmissionId ? clinicalSummaries[quickActionAdmissionId] : undefined}
            />
        </div>
    );
};

export default UnifiedWardBoard;
