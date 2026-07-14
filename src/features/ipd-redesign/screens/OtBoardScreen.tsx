import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, RefreshCw, AlertCircle, Scissors, Clock, CheckCircle2, Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { otBookingApi, type OtBoardCase } from '@/features/ipd-redesign/services/otBookingApi';
import { surgeryCaseApi, type SurgeryStatus } from '@/features/ipd-redesign/services/surgeryCaseApi';
import { SurgeryTransitionDialog } from '../components/SurgeryTransitionDialog';

const BOARD_POLL_MS = 15000;

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
    { key: 'CANCELLED', label: 'Cancelled' },
];

const TERMINAL_COLUMNS: OtBoardCase['statusCode'][] = ['COMPLETED', 'CANCELLED'];

// Mirrors the backend's fixed forward sequence (SurgeryCaseCommandHandlers.cs) plus "cancel from
// any non-terminal status" -- drives which columns a card can validly be dropped on.
const ALLOWED_NEXT: Partial<Record<OtBoardCase['statusCode'], SurgeryStatus[]>> = {
    REQUESTED: ['SCHEDULED', 'CANCELLED'],
    SCHEDULED: ['PRE_OP', 'CANCELLED'],
    PRE_OP: ['IN_THEATRE', 'CANCELLED'],
    IN_THEATRE: ['POST_OP', 'CANCELLED'],
    POST_OP: ['COMPLETED', 'CANCELLED'],
};

const formatTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
};

const renderProgressDots = (c: OtBoardCase) => {
    const steps: { done: boolean; label: string }[] = [
        { done: c.preOpAssessmentComplete, label: 'Pre-Op' },
        { done: c.signInComplete, label: 'Sign-In' },
        { done: c.timeOutComplete, label: 'Time-Out' },
        { done: c.signOutComplete, label: 'Sign-Out' },
    ];
    return (
        <div className="flex items-center gap-1 mt-2">
            {steps.map(s => (
                <span key={s.label} title={s.label} className={s.done ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-700'}>
                    {s.done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                </span>
            ))}
        </div>
    );
};

const CardContent: React.FC<{ c: OtBoardCase }> = ({ c }) => (
    <>
        <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.patientName || 'Unnamed patient'}</p>
            <Badge variant="outline" className={`shrink-0 text-[9px] font-bold uppercase ${URGENCY_COLORS[c.urgency] ?? URGENCY_COLORS.ROUTINE}`}>{c.urgency}</Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.procedureName}</p>
        {c.surgeonName && <p className="text-[11px] text-gray-400 truncate mt-1">Dr. {c.surgeonName}</p>}
        {c.theatreName && (
            <p className="text-[11px] text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-1">
                <Scissors className="h-3 w-3" /> {c.theatreName}
            </p>
        )}
        {c.scheduledStart && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" /> {formatTime(c.scheduledStart)}
            </p>
        )}
        {renderProgressDots(c)}
    </>
);

const OtBoardCardItem: React.FC<{ c: OtBoardCase; draggable: boolean; onOpen: () => void }> = ({ c, draggable, onOpen }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: c.surgeryCaseId,
        data: { fromStatus: c.statusCode },
        disabled: !draggable,
    });

    return (
        <motion.button
            ref={setNodeRef}
            {...attributes} {...listeners}
            layout initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: isDragging ? 0.35 : 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onOpen}
            className={cn(
                'w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group touch-none',
                draggable && 'cursor-grab active:cursor-grabbing',
            )}
        >
            <CardContent c={c} />
        </motion.button>
    );
};

const OtBoardColumn: React.FC<{
    col: { key: OtBoardCase['statusCode']; label: string; cases: OtBoardCase[] };
    activeFromStatus: OtBoardCase['statusCode'] | null;
    onOpenCard: (c: OtBoardCase) => void;
}> = ({ col, activeFromStatus, onOpenCard }) => {
    const { setNodeRef, isOver } = useDroppable({ id: col.key });
    const dragging = activeFromStatus != null;
    const isValidTarget = dragging ? (ALLOWED_NEXT[activeFromStatus!]?.includes(col.key as SurgeryStatus) ?? false) : null;
    const isCancelled = col.key === 'CANCELLED';

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
            className="w-72 shrink-0 flex flex-col"
        >
            <div className="flex items-center justify-between px-1 mb-2">
                <h3 className={cn('text-xs font-bold uppercase tracking-wider', isCancelled ? 'text-rose-500 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400')}>{col.label}</h3>
                <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-900">{col.cases.length}</Badge>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 space-y-2 overflow-y-auto rounded-xl p-2 min-h-[120px] transition-colors duration-150 border-2 border-transparent',
                    isCancelled ? 'bg-rose-50/40 dark:bg-rose-950/10' : 'bg-gray-50 dark:bg-slate-900/40',
                    dragging && isValidTarget && 'border-emerald-300 bg-emerald-50/60',
                    dragging && isValidTarget === false && 'opacity-40',
                    isOver && isValidTarget && 'border-emerald-500 bg-emerald-100/60',
                )}
            >
                <AnimatePresence initial={false}>
                    {col.cases.map(c => (
                        <OtBoardCardItem key={c.surgeryCaseId} c={c} draggable={!TERMINAL_COLUMNS.includes(col.key)} onOpen={() => onOpenCard(c)} />
                    ))}
                </AnimatePresence>
                {col.cases.length === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-6">No cases</p>
                )}
            </div>
        </motion.div>
    );
};

export const OtBoardScreen: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [board, setBoard] = useState<OtBoardCase[]>([]);
    const [boardLoading, setBoardLoading] = useState(true);
    const [boardError, setBoardError] = useState<string | null>(null);
    const [selectedCase, setSelectedCase] = useState<OtBoardCase | null>(null);

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [transitionCase, setTransitionCase] = useState<OtBoardCase | null>(null);
    const [transitionToStatus, setTransitionToStatus] = useState<SurgeryStatus | null>(null);
    const [transitionOpen, setTransitionOpen] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const loadBoard = useCallback(async (silent = false) => {
        if (!silent) setBoardLoading(true);
        try {
            const res = await otBookingApi.getBoard();
            setBoard(res);
            setBoardError(null);
        } catch (e: any) {
            if (!silent) setBoardError(e?.message ?? 'Failed to load the plan board');
        } finally {
            setBoardLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBoard();
        const id = setInterval(() => loadBoard(true), BOARD_POLL_MS);
        return () => clearInterval(id);
    }, [loadBoard]);

    const columnsWithCases = useMemo(() => {
        return BOARD_COLUMNS.map(col => ({ ...col, cases: board.filter(c => c.statusCode === col.key) }));
    }, [board]);

    const activeFromStatus = activeDragId ? board.find(c => c.surgeryCaseId === activeDragId)?.statusCode ?? null : null;
    const activeCase = activeDragId ? board.find(c => c.surgeryCaseId === activeDragId) ?? null : null;

    const openCard = (c: OtBoardCase) => {
        const targetId = c.encounterId || c.admissionId;
        if (targetId) {
            navigate(`/ipd-workspace/patient/${targetId}?tab=surgery`);
        } else {
            setSelectedCase(c);
        }
    };

    const patchStatus = (surgeryCaseId: string, toStatus: SurgeryStatus) => {
        setBoard(prev => prev.map(c => (c.surgeryCaseId === surgeryCaseId ? { ...c, statusCode: toStatus } : c)));
    };

    const applyInstantTransition = async (surgeryCaseId: string, toStatus: SurgeryStatus) => {
        patchStatus(surgeryCaseId, toStatus);
        try {
            await surgeryCaseApi.updateStatus(surgeryCaseId, toStatus);
            toast({ title: `Moved to ${toStatus.replace('_', ' ')}.` });
        } catch (err) {
            toast({ title: 'Could not update status', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            loadBoard(true);
        }
    };

    const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over) return;

        const fromStatus = (active.data.current?.fromStatus as OtBoardCase['statusCode']) ?? null;
        const toStatus = over.id as SurgeryStatus;
        if (!fromStatus || fromStatus === toStatus) return;

        const allowed = ALLOWED_NEXT[fromStatus];
        if (!allowed || !allowed.includes(toStatus)) return; // invalid hop -- card snaps back, no local state was touched

        const found = board.find(c => c.surgeryCaseId === active.id);
        if (!found) return;

        const needsModal =
            toStatus === 'SCHEDULED' || toStatus === 'CANCELLED' || toStatus === 'COMPLETED' ||
            (toStatus === 'IN_THEATRE' && !(found.preOpAssessmentComplete && found.signInComplete)) ||
            (toStatus === 'POST_OP' && !(found.timeOutComplete && found.signOutComplete));

        if (needsModal) {
            setTransitionCase(found);
            setTransitionToStatus(toStatus);
            setTransitionOpen(true);
            return;
        }

        applyInstantTransition(found.surgeryCaseId, toStatus);
    };

    const handleTransitionSuccess = (surgeryCaseId: string, toStatus: SurgeryStatus) => {
        patchStatus(surgeryCaseId, toStatus);
        loadBoard(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden p-6 max-w-[1600px] mx-auto">
            <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {boardLoading && (
                    <div className="flex items-center justify-center py-20 text-sm text-gray-400 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading plan board…
                    </div>
                )}
                {!boardLoading && boardError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{boardError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadBoard()} className="mt-2">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                )}
                {!boardLoading && !boardError && (
                    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                            className="flex gap-4 h-full min-w-max"
                        >
                            {columnsWithCases.map(col => (
                                <OtBoardColumn key={col.key} col={col} activeFromStatus={activeFromStatus} onOpenCard={openCard} />
                            ))}
                        </motion.div>
                        <DragOverlay>
                            {activeCase ? (
                                <div className="w-72 bg-white dark:bg-slate-900 rounded-lg border-2 border-brand-400 shadow-2xl p-3 rotate-2 scale-105 cursor-grabbing">
                                    <CardContent c={activeCase} />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            <SurgeryTransitionDialog
                open={transitionOpen}
                onOpenChange={setTransitionOpen}
                surgeryCase={transitionCase}
                toStatus={transitionToStatus}
                onSuccess={handleTransitionSuccess}
            />

            <Dialog open={!!selectedCase} onOpenChange={(o) => { if (!o) setSelectedCase(null); }}>
                <DialogContent className="max-w-md">
                    {selectedCase && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedCase.patientName || 'Patient'}</DialogTitle>
                                <DialogDescription>{selectedCase.procedureName}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant="outline">{selectedCase.statusCode}</Badge></div>
                                {selectedCase.surgeonName && <div className="flex justify-between"><span className="text-gray-500">Surgeon</span><span className="font-medium">Dr. {selectedCase.surgeonName}</span></div>}
                                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{selectedCase.surgeryType}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Urgency</span><Badge variant="outline" className={URGENCY_COLORS[selectedCase.urgency] ?? URGENCY_COLORS.ROUTINE}>{selectedCase.urgency}</Badge></div>
                                {selectedCase.theatreName && <div className="flex justify-between"><span className="text-gray-500">Theatre</span><span className="font-medium">{selectedCase.theatreName}</span></div>}
                                {selectedCase.scheduledStart && <div className="flex justify-between"><span className="text-gray-500">Scheduled</span><span className="font-medium">{formatTime(selectedCase.scheduledStart)}</span></div>}
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-2 flex items-center gap-3">
                                    {renderProgressDots(selectedCase)}
                                    <span className="text-[11px] text-gray-400">Pre-Op · Sign-In · Time-Out · Sign-Out</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground pt-2 border-t border-gray-100 dark:border-gray-800">
                                Drag a card to another column to change its status — the board will ask for anything that transition needs.
                            </p>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
