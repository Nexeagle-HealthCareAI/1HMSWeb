import React, { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import { eprescriptionApi } from '@/features/patient/services/eprescriptionApi';
import { personalizedDataApi, type PersonalizedLookupType } from '@/features/prescription/services/personalizedDataApi';

interface Option {
    id: string;
    name: string;
    source: 'personal' | 'general';
}

interface Props {
    label: string;
    value?: string;
    readOnly: boolean;
    onChange: (v: string) => void;
    // Which lookup bucket to search/save into — reuse an existing prescription-side type
    // (DIAGNOSIS, CHIEF_COMPLAINT, PROCEDURE) where one already exists so suggestions are
    // populated from day one, rather than starting every discharge field from empty history.
    lookupType: PersonalizedLookupType;
    hospitalId: string;
    doctorId: string;
    multiline?: boolean;
    rows?: number;
}

// Suggest-from-past-data field for Discharge — same LookupMasters/LookupPersonals search-or-save
// mechanism already proven in the prescription pad (EPrescriptionPad.tsx's hand-rolled combobox),
// generalized into one reusable component so it isn't hand-rolled a 7th time.
export const LookupAutosuggestField: React.FC<Props> = ({ label, value, readOnly, onChange, lookupType, hospitalId, doctorId, multiline, rows = 3 }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<Option[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const q = (value ?? '').trim();
        if (readOnly || q.length < 2 || !hospitalId || !doctorId) {
            setOptions([]);
            return;
        }
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await eprescriptionApi.searchLookupParams(lookupType, hospitalId, doctorId, q);
                if (res.success) {
                    setOptions([
                        ...res.personalLookupData.map(i => ({ id: i.personalId || i.code, name: i.name, source: 'personal' as const })),
                        ...res.masterLookupData.map(i => ({ id: i.lookupId || i.code, name: i.name, source: 'general' as const })),
                    ]);
                }
            } catch {
                setOptions([]);
            } finally {
                setSearching(false);
            }
        }, 350);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [value, lookupType, hospitalId, doctorId, readOnly]);

    const commit = (name: string, save: boolean) => {
        onChange(name);
        setOpen(false);
        if (save && hospitalId && doctorId && name.trim()) {
            personalizedDataApi
                .upsert(doctorId, hospitalId, lookupType, { personalId: null, name: name.trim(), code: '', shortDesc: '', synonyms: '' })
                .catch(() => { /* best-effort — losing a personal-favorites save shouldn't block charting */ });
        }
    };

    const trimmed = (value ?? '').trim();
    const exactMatch = options.some(o => o.name.toLowerCase() === trimmed.toLowerCase());

    if (readOnly) {
        return multiline ? (
            <div className="flex flex-col h-full">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
                <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className={cn('text-base text-slate-800 whitespace-pre-wrap font-medium', !value && 'text-slate-400 italic')}>{value || '—'}</p>
                </div>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
                <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 shadow-sm">
                    <p className="text-base text-slate-800 font-medium">{value || '—'}</p>
                </div>
            </div>
        );
    }

    const InputEl = multiline ? Textarea : Input;

    return (
        <div className="flex flex-col h-full relative">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
            <div className="relative flex-1">
                <InputEl
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    rows={multiline ? rows : undefined}
                    className={cn(
                        'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow rounded-xl',
                        multiline ? 'text-base leading-relaxed' : 'h-12 text-base pr-9'
                    )}
                />
                {searching && <Loader2 className="absolute right-2.5 top-3.5 h-4 w-4 animate-spin text-slate-400" />}
                {open && (options.length > 0 || (trimmed.length >= 2 && !exactMatch)) && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        {options.map(o => (
                            <button key={`${o.source}-${o.id}`} type="button" onMouseDown={() => commit(o.name, false)}
                                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between gap-2 border-b last:border-b-0 border-slate-100">
                                <span className="truncate text-slate-800">{o.name}</span>
                                <span className={cn('text-[9px] font-bold uppercase shrink-0', o.source === 'personal' ? 'text-brand-500' : 'text-slate-400')}>
                                    {o.source === 'personal' ? 'Yours' : 'Hospital'}
                                </span>
                            </button>
                        ))}
                        {trimmed.length >= 2 && !exactMatch && (
                            <button type="button" onMouseDown={() => commit(trimmed, true)}
                                className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 flex items-center gap-2">
                                <Plus className="h-3.5 w-3.5" /> Save "{trimmed}" for next time
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
