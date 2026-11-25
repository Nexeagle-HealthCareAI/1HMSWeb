import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Languages, Loader2, X } from 'lucide-react';
import type { SaveDischargeSummaryFields } from '../../services/dischargeSummaryApi';
import { PATIENT_ADVICE_SECTIONS, sectionLabel, textOf, type PatientAdviceKey, type Translations } from '../../utils/dischargeSections';

interface Props {
    /** True once this summary has a translation. Until then only the one-tap offer is shown. */
    active: boolean;
    languageCode: string;
    languageName: string;
    form: SaveDischargeSummaryFields;
    translations: Translations;
    stale: PatientAdviceKey[];
    readOnly: boolean;
    aiReady: boolean;
    busy: boolean;
    onTranslate: () => void;
    onEdit: (key: PatientAdviceKey, value: string) => void;
    onRemove: () => void;
}

/**
 * The discharge summary prints in English by default. This adds, with one tap, a translation of
 * the patient advice (e.g. Hindi), printed in brackets after the English. English stays the
 * source: AI translates it, staff can correct the wording here, a section is flagged when its
 * English changed after translating, and the translation can be removed again.
 */
export const PatientAdviceTranslation: React.FC<Props> = ({ active, languageCode, languageName, form, translations, stale, readOnly, aiReady, busy, onTranslate, onEdit, onRemove }) => {
    // Without AI the translation is typed by hand; this opens the boxes for that.
    const [typing, setTyping] = useState(false);
    const keys = PATIENT_ADVICE_SECTIONS.filter(k => textOf(form, k).trim());
    const open = active || typing;

    if (!open) {
        return (
            <section aria-label="Translation" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Languages className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-700 flex-1 min-w-[200px]">
                    <span className="font-semibold text-slate-900">Printed in English.</span> Add a {languageName} translation of the advice if the patient needs it — it prints in brackets.
                </p>
                <Button type="button" size="sm" variant="outline" className="h-9 rounded-full border-brand-200 text-brand-700 hover:bg-brand-50 font-bold"
                    disabled={busy || keys.length === 0} title={keys.length === 0 ? 'Write the advice in English first' : undefined}
                    onClick={aiReady ? onTranslate : () => setTyping(true)}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1.5" />}
                    {aiReady ? `Add ${languageName} translation` : `Type ${languageName} translation`}
                </Button>
            </section>
        );
    }

    return (
        <section aria-label={`Advice in ${languageName}`} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Languages className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 flex-1">{languageName} translation <span className="font-normal text-slate-500">— printed in brackets after the English</span></h3>
                {!readOnly && aiReady && (
                    <Button type="button" size="sm" className="h-9 rounded-full bg-brand-600 hover:bg-brand-700 text-white" disabled={busy || keys.length === 0} onClick={onTranslate}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1.5" />}
                        {stale.length ? `Translate ${stale.length} section${stale.length === 1 ? '' : 's'}` : 'Translate again'}
                    </Button>
                )}
                {!readOnly && (
                    <Button type="button" size="sm" variant="ghost" className="h-9 rounded-full text-slate-600" onClick={() => { setTyping(false); onRemove(); }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Remove — English only
                    </Button>
                )}
            </div>
            {keys.length === 0 ? (
                <p className="text-xs text-slate-500">Write the follow-up, diet, activity or warning-sign advice in English first.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keys.map(k => {
                        const value = translations[languageCode]?.[k] ?? '';
                        const isStale = stale.includes(k);
                        return (
                            <div key={k}>
                                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    {sectionLabel(k)}
                                    {isStale && <span className="normal-case tracking-normal text-[11px] font-bold text-amber-700">{value ? 'English changed' : 'Not translated'}</span>}
                                </Label>
                                {readOnly ? (
                                    <p className="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap">{value || '—'}</p>
                                ) : (
                                    <Textarea lang={languageCode} rows={2} value={value} onChange={e => onEdit(k, e.target.value)}
                                        className="mt-1.5 text-base bg-slate-50 border-slate-200 rounded-xl" placeholder={aiReady ? 'Tap Translate, or type it here' : 'Type it here'} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
