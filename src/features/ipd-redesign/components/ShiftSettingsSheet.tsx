import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Clock } from 'lucide-react';
import { shiftApi, type ShiftItem } from '../services/shiftApi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hospitalId: string;
    onShiftsChanged: () => void;
}

export const ShiftSettingsSheet: React.FC<Props> = ({ open, onOpenChange, hospitalId, onShiftsChanged }) => {
    const { toast } = useToast();
    const [shifts, setShifts] = useState<ShiftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Form state
    const [newCode, setNewCode] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');

    const loadShifts = async () => {
        setLoading(true);
        try {
            const data = await shiftApi.getShifts(hospitalId);
            setShifts(data);
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to load shifts', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadShifts();
        }
    }, [open, hospitalId]);

    const handleAddShift = async () => {
        if (!newCode.trim() || !newLabel.trim()) {
            toast({ title: 'Validation Error', description: 'Shift Code and Label are required', variant: 'destructive' });
            return;
        }

        setProcessing(true);
        try {
            await shiftApi.addShift({
                shiftCode: newCode.trim().toUpperCase(),
                label: newLabel.trim(),
                startTime: newStart || undefined,
                endTime: newEnd || undefined,
                isActive: true
            }, hospitalId);
            
            toast({ title: 'Success', description: 'Shift added successfully' });
            setNewCode('');
            setNewLabel('');
            setNewStart('');
            setNewEnd('');
            loadShifts();
            onShiftsChanged();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to add shift', variant: 'destructive' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteShift = async (shiftCode: string) => {
        setProcessing(true);
        try {
            await shiftApi.deleteShift(shiftCode, hospitalId);
            toast({ title: 'Success', description: 'Shift deleted' });
            loadShifts();
            onShiftsChanged();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to delete shift', variant: 'destructive' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Shift Configurations</SheetTitle>
                    <SheetDescription>
                        Manage the shifts available for nurse rostering.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Add New Shift Form */}
                    <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Add New Shift</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Shift Code *</Label>
                                <Input 
                                    placeholder="e.g. 12H-DAY" 
                                    value={newCode} 
                                    onChange={e => setNewCode(e.target.value.toUpperCase())} 
                                    className="h-8 text-sm uppercase"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Display Label *</Label>
                                <Input 
                                    placeholder="e.g. 12 Hr Day" 
                                    value={newLabel} 
                                    onChange={e => setNewLabel(e.target.value)} 
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Start Time (Optional)</Label>
                                <Input 
                                    type="time" 
                                    value={newStart} 
                                    onChange={e => setNewStart(e.target.value)} 
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">End Time (Optional)</Label>
                                <Input 
                                    type="time" 
                                    value={newEnd} 
                                    onChange={e => setNewEnd(e.target.value)} 
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handleAddShift} 
                            disabled={processing || !newCode || !newLabel} 
                            className="w-full h-8 text-xs bg-brand-600 hover:bg-brand-700"
                        >
                            {processing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                            Add Shift
                        </Button>
                    </div>

                    {/* Existing Shifts List */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3">Configured Shifts</h4>
                        {loading ? (
                            <div className="flex justify-center p-6 text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : shifts.length === 0 ? (
                            <p className="text-sm text-slate-500 italic text-center p-4">No shifts configured.</p>
                        ) : (
                            <div className="space-y-2">
                                {shifts.sort((a, b) => a.sortOrder - b.sortOrder).map(shift => (
                                    <div key={shift.shiftCode} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{shift.label}</span>
                                                <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">{shift.shiftCode}</span>
                                            </div>
                                            {(shift.startTime || shift.endTime) && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {shift.startTime || '--:--'} to {shift.endTime || '--:--'}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteShift(shift.shiftCode)}
                                            disabled={processing}
                                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
