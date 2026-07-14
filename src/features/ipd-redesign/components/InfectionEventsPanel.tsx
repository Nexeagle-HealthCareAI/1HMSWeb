import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Microscope } from 'lucide-react';
import { infectionApi, type InfectionEventItem, type InfectionType } from '../services/infectionApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const INFECTION_TYPE_LABEL: Record<InfectionType, string> = {
    CLABSI: 'CLABSI (central line)',
    CAUTI: 'CAUTI (urinary catheter)',
    VAP: 'VAP (ventilator-associated pneumonia)',
    OTHER: 'Other',
};

export const InfectionEventsPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [events, setEvents] = useState<InfectionEventItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [logOpen, setLogOpen] = useState(false);
    const [infectionType, setInfectionType] = useState<InfectionType>('CLABSI');
    const [diagnosedByDoctorName, setDiagnosedByDoctorName] = useState('');
    const [cultureOrganism, setCultureOrganism] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        infectionApi.getEvents(admissionId)
            .then(setEvents)
            .catch(() => toast({ title: 'Could not load infection events', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openLog = () => {
        setInfectionType('CLABSI'); setDiagnosedByDoctorName(''); setCultureOrganism(''); setNotes('');
        setLogOpen(true);
    };

    const submit = async () => {
        if (!diagnosedByDoctorName.trim() || submitting) {
            toast({ title: 'Incomplete', description: 'Diagnosing doctor is required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await infectionApi.log(admissionId, {
                infectionType,
                diagnosedByDoctorName: diagnosedByDoctorName.trim(),
                cultureOrganism: cultureOrganism.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            toast({ title: 'Infection event logged.' });
            setLogOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not log infection event', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Microscope className="h-3.5 w-3.5" /> Infection Events</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 sm:h-8 text-xs" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-9 sm:h-8 text-xs bg-rose-600 hover:bg-rose-700" onClick={openLog}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Log infection
                        </Button>
                    )}
                </div>
            </div>

            {loading && events.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : events.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No infection events logged.</div>
            ) : (
                <div className="space-y-2">
                    {events.map(e => (
                        <div key={e.infectionEventId} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="font-bold text-rose-800">{INFECTION_TYPE_LABEL[e.infectionType]}</span>
                                <Badge variant="outline" className="text-[9px] font-bold bg-rose-100 text-rose-700 border-rose-300">{formatIstDateTime(e.diagnosedAt)}</Badge>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">Diagnosed by {e.diagnosedByDoctorName}{e.cultureOrganism ? ` · ${e.cultureOrganism}` : ''}</p>
                            {e.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{e.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={logOpen} onOpenChange={setLogOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Log infection event</DialogTitle>
                        <DialogDescription>Feeds the hospital-wide infection-rate summary.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Infection type</Label>
                        <select value={infectionType} onChange={e => setInfectionType(e.target.value as InfectionType)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                            {(Object.keys(INFECTION_TYPE_LABEL) as InfectionType[]).map(t => <option key={t} value={t}>{INFECTION_TYPE_LABEL[t]}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Diagnosed by *</Label>
                            <Input value={diagnosedByDoctorName} onChange={e => setDiagnosedByDoctorName(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Culture organism</Label>
                            <Input value={cultureOrganism} onChange={e => setCultureOrganism(e.target.value)} className="h-9 mt-1" placeholder="Optional" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                        <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="outline" className="h-11 sm:h-10" onClick={() => setLogOpen(false)}>Cancel</Button>
                        <Button disabled={!diagnosedByDoctorName.trim() || submitting} onClick={submit} className="h-11 sm:h-10 bg-rose-600 hover:bg-rose-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Log
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
