import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Stethoscope, Lock, Edit3, MessageSquarePlus,
    Loader2, RefreshCw, AlertCircle, X, Save, ClipboardList,
    User, Calendar, FileText, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
    roundNoteService, type RoundNote, type CreateRoundNoteRequest,
} from '../services/roundNoteService';

interface RoundNotesTabProps {
    admissionId: string;
    isActive: boolean;
}

type EditorMode =
    | { type: 'new' }
    | { type: 'edit'; note: RoundNote }
    | { type: 'addendum'; parent: RoundNote };

// ─── small helpers ───────────────────────────────────────────────────────────

const SOAP_FIELDS: Array<{ key: 'subjective' | 'objective' | 'assessment' | 'plan'; label: string; placeholder: string; rows: number }> = [
    { key: 'subjective', label: 'Subjective',  placeholder: 'Patient complaints, history this round…', rows: 3 },
    { key: 'objective',  label: 'Objective',   placeholder: 'Vitals, examination findings…', rows: 3 },
    { key: 'assessment', label: 'Assessment',  placeholder: 'Clinical interpretation, diagnosis update…', rows: 3 },
    { key: 'plan',       label: 'Plan',        placeholder: 'Next steps, orders, follow-up…', rows: 3 },
];

const SOAP_PILLS: Record<string, string> = {
    subjective: 'bg-blue-50 text-blue-700 border-blue-200',
    objective:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    assessment: 'bg-purple-50 text-purple-700 border-purple-200',
    plan:       'bg-amber-50 text-amber-700 border-amber-200',
};

// Group all addendums under their parent so the timeline reads chronologically.
function buildThreads(notes: RoundNote[]) {
    const topLevel = notes.filter(n => !n.isAddendum);
    const childrenMap = new Map<string, RoundNote[]>();
    for (const n of notes) {
        if (n.isAddendum && n.parentNoteId) {
            const arr = childrenMap.get(n.parentNoteId) ?? [];
            arr.push(n);
            childrenMap.set(n.parentNoteId, arr);
        }
    }
    return topLevel.map(parent => ({
        parent,
        addendums: (childrenMap.get(parent.roundNoteId) ?? [])
            .sort((a, b) => +new Date(a.notedAt) - +new Date(b.notedAt)),
    }));
}

// ─── Note card ───────────────────────────────────────────────────────────────

const NoteSection: React.FC<{ k: keyof typeof SOAP_PILLS; label: string; value?: string }> = ({ k, label, value }) => {
    if (!value || !value.trim()) return null;
    return (
        <div>
            <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', SOAP_PILLS[k])}>
                {label}
            </Badge>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{value}</p>
        </div>
    );
};

const NoteCard: React.FC<{
    note: RoundNote;
    isAddendum?: boolean;
    onEdit: () => void;
    onAddendum: () => void;
}> = ({ note, isAddendum = false, onEdit, onAddendum }) => {
    const lockedAt = new Date(new Date(note.createdAt).getTime() + 24 * 3600 * 1000);
    const lockCountdown = note.editLocked
        ? `locked ${formatDistanceToNow(lockedAt, { addSuffix: true })}`
        : `locks ${formatDistanceToNow(lockedAt, { addSuffix: true })}`;

    return (
        <div className={cn(
            'rounded-xl border p-4 space-y-3',
            isAddendum
                ? 'border-amber-200 bg-amber-50/40 ml-8'
                : 'border-slate-200 bg-white'
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isAddendum && (
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 font-bold">
                                ADDENDUM
                            </Badge>
                        )}
                        <span className="text-sm font-semibold text-slate-900">
                            {format(new Date(note.notedAt), 'EEE, dd MMM · HH:mm')}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" /> {note.doctorName ?? 'Unknown'}
                        </span>
                    </div>
                    {note.isAddendum && note.addendumReason && (
                        <p className="text-[11px] text-amber-700 mt-1 italic">
                            Reason: {note.addendumReason}
                        </p>
                    )}
                    {note.diagnosis && (
                        <p className="text-xs text-slate-500 mt-1.5">
                            <span className="font-semibold text-slate-600">Diagnosis:</span> {note.diagnosis}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {note.editLocked ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200 gap-1">
                            <Lock className="h-3 w-3" /> Locked
                        </Badge>
                    ) : (
                        <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 text-xs gap-1 text-slate-600 hover:text-blue-700">
                            <Edit3 className="h-3 w-3" /> Edit
                        </Button>
                    )}
                    {!isAddendum && (
                        <Button size="sm" variant="ghost" onClick={onAddendum} className="h-7 text-xs gap-1 text-slate-600 hover:text-amber-700">
                            <MessageSquarePlus className="h-3 w-3" /> Addendum
                        </Button>
                    )}
                </div>
            </div>

            {/* SOAP body */}
            <div className="space-y-3">
                <NoteSection k="subjective" label="Subjective" value={note.subjective} />
                <NoteSection k="objective"  label="Objective"  value={note.objective} />
                <NoteSection k="assessment" label="Assessment" value={note.assessment} />
                <NoteSection k="plan"       label="Plan"       value={note.plan} />
                {!note.subjective && !note.objective && !note.assessment && !note.plan && (
                    <p className="text-xs text-slate-400 italic">No SOAP content recorded.</p>
                )}
            </div>

            {/* Footer */}
            <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {lockCountdown}
                </span>
                {note.createdBy && (
                    <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> by {note.createdBy}
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Editor sheet ────────────────────────────────────────────────────────────

const RoundNoteEditor: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: EditorMode | null;
    admissionId: string;
    onSaved: () => void;
}> = ({ open, onOpenChange, mode, admissionId, onSaved }) => {
    const { toast } = useToast();
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [notedAt, setNotedAt] = useState('');
    const [addendumReason, setAddendumReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reset on open
    useEffect(() => {
        if (!open || !mode) return;
        const seed: RoundNote | undefined =
            mode.type === 'edit' ? mode.note
            : undefined; // 'new' and 'addendum' start blank
        setSubjective(seed?.subjective ?? '');
        setObjective(seed?.objective ?? '');
        setAssessment(seed?.assessment ?? '');
        setPlan(seed?.plan ?? '');
        setDiagnosis(seed?.diagnosis ?? '');
        const initialDate = seed?.notedAt ?? new Date().toISOString();
        // Use the patient timezone? For now we use local for the input control.
        const local = new Date(initialDate);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const inputValue = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
        setNotedAt(inputValue);
        setAddendumReason('');
    }, [open, mode]);

    if (!mode) return null;

    const isAddendum = mode.type === 'addendum';
    const isEdit = mode.type === 'edit';
    const hasContent = [subjective, objective, assessment, plan, diagnosis].some(s => s && s.trim().length > 0);
    const addendumOk = !isAddendum || addendumReason.trim().length > 0;
    const canSubmit = hasContent && addendumOk && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        const notedAtIso = notedAt ? new Date(notedAt).toISOString() : new Date().toISOString();
        try {
            if (isEdit && mode.type === 'edit') {
                const res = await roundNoteService.update(mode.note.roundNoteId, {
                    notedAt: notedAtIso,
                    subjective, objective, assessment, plan, diagnosis,
                });
                if (!res.success) {
                    if (res.requiresAddendum) {
                        toast({
                            title: 'Note is locked',
                            description: 'This note is older than 24 hours. Add an addendum instead.',
                            variant: 'destructive',
                        });
                    } else {
                        throw new Error(res.message ?? 'Update failed');
                    }
                } else {
                    toast({ title: 'Round note updated' });
                    onSaved();
                    onOpenChange(false);
                }
            } else {
                const payload: CreateRoundNoteRequest = {
                    admissionId,
                    notedAt: notedAtIso,
                    subjective, objective, assessment, plan, diagnosis,
                    isAddendum,
                    parentNoteId: isAddendum && mode.type === 'addendum' ? mode.parent.roundNoteId : undefined,
                    addendumReason: isAddendum ? addendumReason : undefined,
                };
                const res = await roundNoteService.create(payload);
                if (!res.success) throw new Error(res.message ?? 'Save failed');
                toast({
                    title: isAddendum ? 'Addendum saved' : 'Round note saved',
                });
                onSaved();
                onOpenChange(false);
            }
        } catch (err: any) {
            toast({
                title: 'Could not save',
                description: err?.message ?? 'Try again.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const headerTitle =
        mode.type === 'edit' ? 'Edit Round Note'
        : mode.type === 'addendum' ? 'Add Addendum'
        : 'New Round Note';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                            isAddendum ? 'bg-amber-600' : isEdit ? 'bg-indigo-600' : 'bg-blue-600'
                        )}>
                            <ClipboardList className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-base font-bold text-slate-900">{headerTitle}</SheetTitle>
                            <SheetDescription className="text-xs text-slate-500">
                                {isAddendum && mode.type === 'addendum'
                                    ? `Linked to note from ${format(new Date(mode.parent.notedAt), 'dd MMM HH:mm')}`
                                    : 'SOAP format. Each section is optional but at least one is required.'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Noted at + diagnosis */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">
                                <Calendar className="h-3 w-3 inline mr-1" /> Noted At
                            </Label>
                            <Input
                                type="datetime-local"
                                value={notedAt}
                                onChange={e => setNotedAt(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">
                                <FileText className="h-3 w-3 inline mr-1" /> Diagnosis (this round)
                            </Label>
                            <Input
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                                placeholder="ICD-10 description or free text…"
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>

                    {/* Addendum reason */}
                    {isAddendum && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                            <Label className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                                Reason for Addendum <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                value={addendumReason}
                                onChange={e => setAddendumReason(e.target.value)}
                                placeholder="e.g. Correction to medication dose recorded earlier"
                                className="h-9 text-sm bg-white"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* SOAP fields */}
                    {SOAP_FIELDS.map(f => {
                        const value =
                            f.key === 'subjective' ? subjective :
                            f.key === 'objective'  ? objective :
                            f.key === 'assessment' ? assessment : plan;
                        const setter =
                            f.key === 'subjective' ? setSubjective :
                            f.key === 'objective'  ? setObjective :
                            f.key === 'assessment' ? setAssessment : setPlan;
                        return (
                            <div key={f.key} className="space-y-1.5">
                                <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider', SOAP_PILLS[f.key])}>
                                    {f.label}
                                </Badge>
                                <Textarea
                                    value={value}
                                    onChange={e => setter(e.target.value)}
                                    placeholder={f.placeholder}
                                    rows={f.rows}
                                    className="text-sm resize-y"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1 text-[11px] text-slate-400 text-right">
                        {hasContent ? '' : 'Add at least one SOAP section'}
                        {isAddendum && !addendumReason.trim() && ' · Reason required'}
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={cn(
                            'h-10 px-5 font-semibold',
                            isAddendum ? 'bg-amber-600 hover:bg-amber-700' :
                            isEdit ? 'bg-indigo-600 hover:bg-indigo-700' :
                            'bg-blue-600 hover:bg-blue-700'
                        )}
                    >
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main tab ────────────────────────────────────────────────────────────────

export const RoundNotesTab: React.FC<RoundNotesTabProps> = ({ admissionId, isActive }) => {
    const [notes, setNotes] = useState<RoundNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await roundNoteService.list(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load round notes');
            setNotes(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load round notes');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadedOnce(true);
        }
    }, [admissionId]);

    useEffect(() => {
        if (isActive && !loadedOnce) load();
    }, [isActive, loadedOnce, load]);

    const threads = useMemo(() => buildThreads(notes), [notes]);

    const handleNew = () => { setEditorMode({ type: 'new' }); setEditorOpen(true); };
    const handleEdit = (note: RoundNote) => { setEditorMode({ type: 'edit', note }); setEditorOpen(true); };
    const handleAddendum = (parent: RoundNote) => { setEditorMode({ type: 'addendum', parent }); setEditorOpen(true); };
    const handleSaved = () => load(true);

    return (
        <div className="space-y-4 pt-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-indigo-600" /> Doctor Round Notes
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Multiple doctors can add notes per day. Edits lock 24 hours after creation — use addendums after that.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="h-9 text-xs gap-1"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleNew}
                        className="h-9 bg-blue-600 hover:bg-blue-700 gap-1"
                    >
                        <Plus className="h-4 w-4" /> New Note
                    </Button>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load notes</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">
                        Retry
                    </Button>
                </div>
            ) : threads.length === 0 ? (
                <div className="p-10 text-center space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <div className="h-14 w-14 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center">
                        <ClipboardList className="h-7 w-7 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">No round notes yet</p>
                        <p className="text-xs text-slate-500">Capture the first SOAP-format progress note for this admission.</p>
                    </div>
                    <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" /> Write the first note
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {threads.map(({ parent, addendums }) => (
                        <div key={parent.roundNoteId} className="space-y-2">
                            <NoteCard
                                note={parent}
                                onEdit={() => handleEdit(parent)}
                                onAddendum={() => handleAddendum(parent)}
                            />
                            {addendums.map(a => (
                                <NoteCard
                                    key={a.roundNoteId}
                                    note={a}
                                    isAddendum
                                    onEdit={() => handleEdit(a)}
                                    onAddendum={() => handleAddendum(parent)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <RoundNoteEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                mode={editorMode}
                admissionId={admissionId}
                onSaved={handleSaved}
            />
        </div>
    );
};

export default RoundNotesTab;
