import React, { useEffect, useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Loader2, Calendar as CalendarIcon, UserRound, AlertTriangle, X, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  nursingStationApi,
  type HospitalNurseItem,
  type WardListItem,
  type PatientNurseAssignmentItem
} from '@/features/ipd-redesign/services/nursingStationApi';
import { bedBoardApi, type BedBoardItem } from '@/features/ipd-redesign/services/bedBoardApi';
import { shiftApi, type ShiftItem } from '@/features/ipd-redesign/services/shiftApi';
import { ShiftSettingsSheet } from '@/features/ipd-redesign/components/ShiftSettingsSheet';

// Draggable Nurse Component
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
        "p-3 mb-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-grab flex items-center gap-3 transition-all",
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

// Droppable Cell Component
const DroppableShiftCell = ({
  admissionId,
  shiftCode,
  assignments,
  onRemove,
  isProcessing
}: {
  admissionId?: string | null;
  shiftCode: string;
  assignments: PatientNurseAssignmentItem[];
  onRemove: (id: string) => void;
  isProcessing: boolean;
}) => {
  const cellId = admissionId ? `cell-${admissionId}-${shiftCode}` : `cell-empty-${shiftCode}-${Math.random()}`;
  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
    data: { type: 'shiftCell', admissionId, shiftCode },
    disabled: !admissionId
  });

  if (!admissionId) {
    return (
      <td className="border p-2 min-w-[160px] h-20 align-top transition-colors relative bg-slate-50/50 dark:bg-zinc-950/50">
        <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-zinc-600 text-[10px] uppercase font-bold tracking-wider h-full">
          Empty Bed
        </div>
      </td>
    );
  }

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "border p-2 min-w-[160px] h-20 align-top transition-colors relative",
        isOver ? "bg-brand-50 dark:bg-brand-900/20 border-brand-300" : "bg-white dark:bg-zinc-950/20"
      )}
    >
      <div className="flex flex-col gap-1.5 w-full h-full">
        {assignments.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-zinc-700 text-xs border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
            Drag here
          </div>
        )}
        
        {isOver && (
          <div className="absolute inset-1 rounded-lg border-2 border-brand-500 border-dashed bg-brand-100/50 dark:bg-brand-900/30 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">Drop to assign</span>
          </div>
        )}

        {assignments.map(a => (
          <div
            key={a.patientNurseAssignmentId}
            className="flex items-center justify-between gap-1 bg-slate-100 dark:bg-zinc-800 rounded-lg px-2 py-1.5 group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">
                {a.nurseName || 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => onRemove(a.patientNurseAssignmentId)}
              disabled={isProcessing}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center rounded-lg z-20">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          </div>
        )}
      </div>
    </td>
  );
};

export const VisualNurseRosterBoard: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId) || '';

  const [nurses, setNurses] = useState<HospitalNurseItem[]>([]);
  const [wards, setWards] = useState<WardListItem[]>([]);
  const [beds, setBeds] = useState<BedBoardItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, PatientNurseAssignmentItem[]>>({});
  const [shiftConfig, setShiftConfig] = useState<ShiftItem[]>([]);
  
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [isLoadingWards, setIsLoadingWards] = useState(true);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [processingCells, setProcessingCells] = useState<Set<string>>(new Set());

  // Load static masters
  useEffect(() => {
    if (!hospitalId) return;
    Promise.all([
      nursingStationApi.listWards(hospitalId),
      nursingStationApi.listNurses(hospitalId),
      shiftApi.getShifts(hospitalId)
    ]).then(([wRes, nRes, sRes]) => {
      setWards(wRes);
      setNurses(nRes);
      setShiftConfig(sRes);
      if (wRes.length > 0) setSelectedWard(wRes[0].wardCode);
    }).catch(() => {
      toast({ title: 'Error', description: 'Failed to load wards or nurses', variant: 'destructive' });
    }).finally(() => {
      setIsLoadingWards(false);
    });
  }, [hospitalId]);

  // Load Board for selected ward
  const loadBoard = async () => {
    if (!hospitalId || !selectedWard) return;
    setIsLoadingBoard(true);
    try {
      const wardBeds = await bedBoardApi.getBoard(selectedWard, hospitalId);
      
      // Fetch assignments for all beds with an admitted patient
      const assignData: Record<string, PatientNurseAssignmentItem[]> = {};
      await Promise.all(wardBeds.map(async (b) => {
        if (b.admissionId) {
          const patientAssignments = await nursingStationApi.getPatientAssignments(b.admissionId, hospitalId);
          assignData[b.admissionId] = patientAssignments.filter(a => 
            !a.shiftDate || a.shiftDate === selectedDate
          );
        }
      }));

      setBeds(wardBeds);
      setAssignments(assignData);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load board data', variant: 'destructive' });
    } finally {
      setIsLoadingBoard(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [hospitalId, selectedWard, selectedDate, shiftConfig]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return; // dropped outside

    const nurse = active.data.current?.nurse as HospitalNurseItem;
    const admissionId = over.data.current?.admissionId as string;
    const shiftCode = over.data.current?.shiftCode as string;

    if (!nurse || !admissionId || !shiftCode) return;

    // Check if already assigned
    const currentAssigns = assignments[admissionId] || [];
    if (currentAssigns.some(a => a.nurseUserId === nurse.userId && a.shiftCode === shiftCode)) {
      toast({ title: 'Notice', description: `${nurse.fullName || nurse.mobileNumber} is already assigned to this shift.` });
      return;
    }

    const cellId = `${admissionId}-${shiftCode}`;
    setProcessingCells(prev => new Set(prev).add(cellId));

    try {
      await nursingStationApi.assignPatient({
        admissionId,
        nurseUserId: nurse.userId,
        shiftCode,
        shiftDate: selectedDate
      }, hospitalId);

      // Refresh assignments for this patient
      const refreshed = await nursingStationApi.getPatientAssignments(admissionId, hospitalId);
      setAssignments(prev => ({
        ...prev,
        [admissionId]: refreshed.filter(a => !a.shiftDate || a.shiftDate === selectedDate)
      }));
      toast({ title: 'Success', description: `Assigned ${nurse.fullName || nurse.mobileNumber}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to assign nurse', variant: 'destructive' });
    } finally {
      setProcessingCells(prev => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }
  };

  const handleRemoveAssignment = async (admissionId: string, shiftCode: string, assignmentId: string) => {
    const cellId = `${admissionId}-${shiftCode}`;
    setProcessingCells(prev => new Set(prev).add(cellId));
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
        next.delete(cellId);
        return next;
      });
    }
  };

  if (isLoadingWards) {
    return <div className="h-full flex items-center justify-center text-slate-500"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950/20 font-sans relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 shadow-sm z-10">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={selectedWard} onValueChange={setSelectedWard}>
            <SelectTrigger className="h-10 rounded-xl w-full sm:w-[200px] bg-slate-50 dark:bg-zinc-950">
              <SelectValue placeholder="Select Ward" />
            </SelectTrigger>
            <SelectContent>
              {wards.map(w => <SelectItem key={w.wardCode} value={w.wardCode}>{w.wardName || w.wardCode}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 h-10 rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 w-full sm:w-[160px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200 py-1.5 px-3">
             Visual Drag & Drop
           </Badge>
           <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-8 rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
             <Settings className="h-4 w-4 mr-1.5 text-slate-500" />
             <span className="text-slate-600">Shift Settings</span>
           </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* NURSES SIDEBAR */}
          <div className="w-64 border-r border-slate-200/60 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50 flex flex-col z-10">
            <div className="p-4 border-b border-slate-200/60 dark:border-zinc-800">
              <h3 className="font-bold text-slate-800 dark:text-zinc-200">Available Nurses</h3>
              <p className="text-xs text-slate-500">Drag to assign</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {nurses.map(n => (
                <DraggableNurse key={n.userId} nurse={n} />
              ))}
              {nurses.length === 0 && (
                <div className="text-sm text-slate-400 text-center mt-10">No nurses available</div>
              )}
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-zinc-900 relative">
            {isLoadingBoard ? (
              <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center z-50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : beds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle className="h-12 w-12 mb-3 text-slate-300" />
                <p>No beds found in this ward.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 dark:bg-zinc-950 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-3 border-b border-r border-slate-200 dark:border-zinc-800 font-bold text-slate-700 dark:text-zinc-300 w-64 bg-slate-100 dark:bg-zinc-950">
                      Bed / Patient
                    </th>
                    {shiftConfig.sort((a, b) => a.sortOrder - b.sortOrder).map(shift => (
                      <th key={shift.shiftCode} className="p-3 border-b border-r border-slate-200 dark:border-zinc-800 font-bold text-slate-700 dark:text-zinc-300 text-center">
                        {shift.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {beds.map(b => (
                    <tr key={b.bedId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                      <td className="p-3 border-b border-r border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/50">
                        <p className="font-bold text-slate-800 dark:text-zinc-200 truncate">{b.bedName || b.bedCode || 'Unknown Bed'}</p>
                        {b.admissionId ? (
                           <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold truncate">{b.patientName}</p>
                        ) : (
                           <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Available</p>
                        )}
                      </td>
                      
                      {shiftConfig.sort((a, b) => a.sortOrder - b.sortOrder).map(shift => (
                        <DroppableShiftCell
                          key={`${b.bedId}-${shift.shiftCode}`}
                          admissionId={b.admissionId}
                          shiftCode={shift.shiftCode}
                          assignments={b.admissionId ? (assignments[b.admissionId] || []).filter(a => a.shiftCode === shift.shiftCode) : []}
                          onRemove={(assignmentId) => b.admissionId && handleRemoveAssignment(b.admissionId, shift.shiftCode, assignmentId)}
                          isProcessing={b.admissionId ? processingCells.has(`${b.admissionId}-${shift.shiftCode}`) : false}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
        </div>
      </DndContext>
      <ShiftSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hospitalId={hospitalId}
        onShiftsChanged={() => shiftApi.getShifts(hospitalId).then(setShiftConfig)}
      />
    </div>
  );
};
