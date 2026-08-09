import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { nursingStationApi, type HospitalNurseItem, type PatientNurseAssignmentItem } from '../services/nursingStationApi';

interface Props {
    admissionId: string;
    onChanged: () => void;
}

export const AssignPatientNursePopover: React.FC<Props> = ({ admissionId, onChanged }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nurses, setNurses] = useState<HospitalNurseItem[]>([]);
    const [assignments, setAssignments] = useState<PatientNurseAssignmentItem[]>([]);
    const [nurseUserId, setNurseUserId] = useState('');
    const [shiftCode, setShiftCode] = useState('MORNING');
    const [busy, setBusy] = useState(false);
    const [releasingId, setReleasingId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        Promise.all([nursingStationApi.listNurses(), nursingStationApi.getPatientAssignments(admissionId)])
            .then(([n, a]) => { setNurses(n); setAssignments(a); })
            .catch(() => toast({ title: 'Failed to load nurses', variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [open, admissionId, toast]);

    const assign = async () => {
        if (!nurseUserId) return;
        setBusy(true);
        try {
            await nursingStationApi.assignPatient({ nurseUserId, admissionId, shiftCode });
            toast({ title: 'Nurse assigned' });
            setNurseUserId('');
            const refreshed = await nursingStationApi.getPatientAssignments(admissionId);
            setAssignments(refreshed);
            onChanged();
        } catch (e: any) {
            toast({ title: 'Could not assign nurse', description: e.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const release = async (id: string) => {
        setReleasingId(id);
        try {
            await nursingStationApi.releasePatientAssignment(id);
            setAssignments(prev => prev.filter(a => a.patientNurseAssignmentId !== id));
            onChanged();
        } catch (e: any) {
            toast({ title: 'Could not release nurse', description: e.message, variant: 'destructive' });
        } finally {
            setReleasingId(null);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={e => e.stopPropagation()}
                    className="h-7 rounded-lg border-slate-205 dark:border-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 active:scale-[0.98] transition-all shrink-0 px-2"
                >
                    <UserPlus className="h-3 w-3 mr-1" /> Assign
                </Button>
            </PopoverTrigger>
            <PopoverContent onClick={e => e.stopPropagation()} className="w-72 rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Assigned nurses</p>
                {loading ? (
                    <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                ) : assignments.length === 0 ? (
                    <p className="text-xs text-slate-450 dark:text-zinc-500">Nobody assigned yet.</p>
                ) : (
                    <div className="space-y-1.5">
                        {assignments.map(a => (
                            <div key={a.patientNurseAssignmentId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-zinc-950/30 px-2.5 py-1.5">
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">{a.nurseName ?? 'Unknown'} <span className="text-slate-400 dark:text-zinc-550 font-normal">· {a.shiftCode.toLowerCase()}</span></span>
                                <button
                                    onClick={() => release(a.patientNurseAssignmentId)}
                                    disabled={releasingId === a.patientNurseAssignmentId}
                                    className="text-slate-400 hover:text-rose-600 shrink-0"
                                >
                                    {releasingId === a.patientNurseAssignmentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Nurse</Label>
                        <Select value={nurseUserId} onValueChange={setNurseUserId}>
                            <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Select nurse" /></SelectTrigger>
                            <SelectContent className="max-h-48 overflow-y-auto">
                                {nurses.map(n => <SelectItem key={n.userId} value={n.userId}>{n.fullName ?? n.mobileNumber}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Shift</Label>
                        <Select value={shiftCode} onValueChange={setShiftCode}>
                            <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MORNING">Morning</SelectItem>
                                <SelectItem value="EVENING">Evening</SelectItem>
                                <SelectItem value="NIGHT">Night</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={assign}
                        disabled={!nurseUserId || busy}
                        className="w-full h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold active:scale-[0.98] transition-all"
                    >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Assign'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
