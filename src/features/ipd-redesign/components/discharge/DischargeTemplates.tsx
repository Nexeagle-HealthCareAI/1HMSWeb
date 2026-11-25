import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookmarkPlus, FileStack, Loader2, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SaveDischargeSummaryFields } from '../../services/dischargeSummaryApi';
import { dischargeTemplateApi, type DischargeTemplate } from '../../services/dischargeTemplateApi';
import {
    applyTemplate, buildTemplateContent, defaultPartsToSave, describeTemplate, parseTemplateContent, partsWithContent, templatePartLabel,
    type ApplyMode, type ApplyResult,
} from '../../utils/dischargeTemplates';

interface Props {
    form: SaveDischargeSummaryFields;
    /** False once the summary is signed or the stay is closed: a template can still be saved, not applied. */
    canApply: boolean;
    onApply: (result: ApplyResult, templateName: string) => void;
}

/**
 * "Use a template" and "Save as template" for the discharge summary. A doctor saves the summary
 * being written under a name (usually the condition), then starts the next similar patient from
 * it and edits. Templates are shared by the hospital.
 */
export const DischargeTemplateBar: React.FC<Props> = ({ form, canApply, onApply }) => {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<DischargeTemplate[] | null>(null);
    const [useOpen, setUseOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);

    const load = () => dischargeTemplateApi.list().then(setTemplates).catch(() => setTemplates([]));
    useEffect(() => { load(); }, []);

    const savable = partsWithContent(form).length > 0;
    const count = templates?.length ?? 0;

    return (
        <section aria-label="Templates" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <FileStack className="h-4 w-4 text-brand-600 shrink-0" />
            <p className="text-sm text-slate-700 flex-1 min-w-[200px]">
                <span className="font-semibold text-slate-900">Templates.</span>{' '}
                {count > 0 ? `Start from one of ${count} saved for this hospital, then edit.` : 'Save this summary under a name and reuse it for the next similar patient.'}
            </p>
            {canApply && (
                <Button type="button" size="sm" className="h-9 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={count === 0} onClick={() => setUseOpen(true)}
                    title={count === 0 ? 'No templates saved yet' : undefined}>
                    <FileStack className="h-3.5 w-3.5 mr-1.5" /> Use a template
                </Button>
            )}
            <Button type="button" size="sm" variant="outline" className="h-9 rounded-full border-brand-200 text-brand-700 hover:bg-brand-50 font-bold" disabled={!savable} onClick={() => setSaveOpen(true)}
                title={savable ? undefined : 'Write something first'}>
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Save as template
            </Button>

            {useOpen && (
                <UseTemplateDialog templates={templates ?? []} form={form} onClose={() => setUseOpen(false)} onDeleted={load}
                    onApply={(result, template) => {
                        setUseOpen(false);
                        dischargeTemplateApi.markUsed(template.dischargeTemplateId).then(load);
                        onApply(result, template.name);
                    }} />
            )}
            {saveOpen && (
                <SaveTemplateDialog form={form} existingNames={(templates ?? []).map(t => t.name)} onClose={() => setSaveOpen(false)}
                    onSaved={name => { setSaveOpen(false); load(); toast({ title: 'Template saved', description: `"${name}" is ready to use on other patients.` }); }} />
            )}
        </section>
    );
};

const UseTemplateDialog: React.FC<{
    templates: DischargeTemplate[]; form: SaveDischargeSummaryFields; onClose: () => void; onDeleted: () => void;
    onApply: (result: ApplyResult, template: DischargeTemplate) => void;
}> = ({ templates, form, onClose, onDeleted, onApply }) => {
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(templates.length === 1 ? templates[0].dischargeTemplateId : null);
    const [mode, setMode] = useState<ApplyMode>('fill');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates;
    }, [templates, query]);
    const selected = templates.find(t => t.dischargeTemplateId === selectedId) ?? null;
    const content = useMemo(() => (selected ? parseTemplateContent(selected.contentJson) : null), [selected]);
    const preview = useMemo(() => (content ? applyTemplate(form, content, mode) : null), [content, form, mode]);

    const remove = async (id: string) => {
        setDeleting(true);
        try {
            const res = await dischargeTemplateApi.remove(id);
            if (res.success === false) throw new Error(res.message || 'Could not delete the template.');
            if (selectedId === id) setSelectedId(null);
            setConfirmDeleteId(null);
            onDeleted();
        } catch (err) {
            toast({ title: 'Could not delete the template', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-3">
                <DialogHeader>
                    <DialogTitle>Use a template</DialogTitle>
                    <DialogDescription>Pick one. Nothing is saved until you save the summary, and you can edit everything after.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, e.g. dengue" aria-label="Search templates" className="h-10 pl-9 rounded-xl" />
                </div>
                <ul className="flex-1 min-h-[120px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {shown.length === 0 && <li className="p-4 text-sm text-slate-500">No template matches "{query}".</li>}
                    {shown.map(t => {
                        const isSelected = t.dischargeTemplateId === selectedId;
                        return (
                            <li key={t.dischargeTemplateId} className={cn('flex items-center gap-2 pr-2', isSelected && 'bg-brand-50')}>
                                <button type="button" aria-pressed={isSelected} onClick={() => setSelectedId(t.dischargeTemplateId)} className="flex-1 min-w-0 text-left px-3 py-2.5">
                                    <span className="block text-sm font-bold text-slate-900 truncate">{t.name}</span>
                                    <span className="block text-xs text-slate-500 truncate">{describeTemplate(parseTemplateContent(t.contentJson))}{t.useCount > 0 ? ` · used ${t.useCount} time${t.useCount === 1 ? '' : 's'}` : ''}</span>
                                </button>
                                {confirmDeleteId === t.dischargeTemplateId ? (
                                    <span className="flex items-center gap-1 shrink-0">
                                        <Button type="button" size="sm" variant="destructive" className="h-8 rounded-full text-xs" disabled={deleting} onClick={() => remove(t.dischargeTemplateId)}>
                                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete for everyone'}
                                        </Button>
                                        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => setConfirmDeleteId(null)}>Keep</Button>
                                    </span>
                                ) : (
                                    <Button type="button" size="sm" variant="ghost" aria-label={`Delete template ${t.name}`} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-600 shrink-0" onClick={() => setConfirmDeleteId(t.dischargeTemplateId)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {selected && preview && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <div role="radiogroup" aria-label="How to apply" className="flex gap-1 p-1 rounded-full bg-white border border-slate-200 w-fit">
                            {([['fill', 'Fill empty sections only'], ['replace', 'Replace what is written']] as const).map(([value, label]) => (
                                <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
                                    className={cn('h-8 px-3.5 rounded-full text-xs font-bold', mode === value ? 'bg-brand-600 text-white' : 'text-slate-600')}>{label}</button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-700">
                            <b>Will fill:</b> {preview.applied.length ? preview.applied.map(k => (k === 'medications' ? `${preview.medicinesAdded} medicine${preview.medicinesAdded === 1 ? '' : 's'}` : templatePartLabel(k))).join(', ') : 'nothing — every section in this template is already written.'}
                        </p>
                        {preview.kept.length > 0 && (
                            <p className="text-xs text-slate-500"><b>Left as written:</b> {preview.kept.map(k => (k === 'medications' ? 'medicines already in the list' : templatePartLabel(k))).join(', ')}</p>
                        )}
                        {mode === 'replace' && <p className="text-xs font-semibold text-amber-700">This overwrites the text and the medicine list already in these sections.</p>}
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button type="button" className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={!selected || !preview || preview.applied.length === 0}
                        onClick={() => { if (selected && preview) onApply(preview, selected); }}>
                        Use this template
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SaveTemplateDialog: React.FC<{ form: SaveDischargeSummaryFields; existingNames: string[]; onClose: () => void; onSaved: (name: string) => void }> = ({ form, existingNames, onClose, onSaved }) => {
    const { toast } = useToast();
    const parts = useMemo(() => partsWithContent(form), [form]);
    const [name, setName] = useState((form.finalDiagnosis ?? '').split('\n')[0].trim().slice(0, 80));
    const [include, setInclude] = useState<string[]>(() => defaultPartsToSave(form));
    const [saving, setSaving] = useState(false);
    const [nameTaken, setNameTaken] = useState(false);

    const clean = name.trim().replace(/\s+/g, ' ');
    const alreadyUsed = nameTaken || existingNames.some(n => n.toLowerCase() === clean.toLowerCase());
    const content = buildTemplateContent(form, include);
    const toggle = (key: string) => setInclude(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

    const save = async (replaceExisting: boolean) => {
        if (!content || !clean) return;
        setSaving(true);
        try {
            const res = await dischargeTemplateApi.save({ name: clean, contentJson: JSON.stringify(content), replaceExisting });
            if (res.success) { onSaved(clean); return; }
            if (res.nameTaken) { setNameTaken(true); return; }
            throw new Error(res.message || 'The template was not saved.');
        } catch (err) {
            toast({ title: 'Could not save the template', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Save as template</DialogTitle>
                    <DialogDescription>Everyone in this hospital can use it. Dates, the condition at discharge and the patient's details are never saved.</DialogDescription>
                </DialogHeader>
                <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Name — usually the condition</span>
                    <Input autoFocus value={name} maxLength={200} onChange={e => { setName(e.target.value); setNameTaken(false); }} placeholder="e.g. Dengue, Normal delivery, Cataract surgery" className="mt-1.5 h-10 rounded-xl" />
                </label>
                <fieldset className="mt-1">
                    <legend className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">What to keep</legend>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {parts.map(p => (
                            <label key={p.key} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={include.includes(p.key)} onChange={() => toggle(p.key)} />
                                <span className="flex-1">{p.label}</span>
                                {!p.includeByDefault && <span className="text-[11px] font-semibold text-amber-700">Usually about this patient</span>}
                            </label>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Check the text has no patient name, age or dates before keeping a section marked "usually about this patient".</p>
                </fieldset>
                {alreadyUsed && clean && (
                    <p role="alert" className="text-xs font-semibold text-amber-700">A template called "{clean}" already exists. Saving will replace it for everyone.</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button type="button" className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={saving || !clean || !content} onClick={() => save(alreadyUsed)}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {alreadyUsed ? 'Replace template' : 'Save template'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
