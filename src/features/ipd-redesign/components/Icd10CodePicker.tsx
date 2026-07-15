import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, X, Loader2 } from 'lucide-react';
import { eprescriptionApi } from '@/features/patient/services/eprescriptionApi';

interface Option {
    id: string;
    code: string;
    name: string;
}

interface Props {
    label: string;
    code?: string;
    name?: string;
    readOnly: boolean;
    onSelect: (code: string, name: string) => void;
    onClear: () => void;
    hospitalId: string;
    doctorId: string;
}

// WHO ICD-10 code picker — searches the ICD10 LookupMaster list (10,000+ seeded codes) by code or
// description. Deliberately read-only against the master list (no "add new" — unlike free-text
// lookups, an ICD-10 code isn't something a doctor should be able to invent on the fly).
export const Icd10CodePicker: React.FC<Props> = ({ label, code, name, readOnly, onSelect, onClear, hospitalId, doctorId }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<Option[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2 || !hospitalId || !doctorId) {
            setOptions([]);
            return;
        }
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await eprescriptionApi.searchLookupParams('ICD10', hospitalId, doctorId, q);
                if (res.success) {
                    setOptions(res.masterLookupData.map(i => ({ id: i.lookupId || i.code, code: i.code, name: i.name })));
                }
            } catch {
                setOptions([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [query, hospitalId, doctorId]);

    if (readOnly) {
        return (
            <div>
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
                <p className={cn('text-base mt-1.5 text-slate-800', !code && 'text-slate-400')}>
                    {code ? <><span className="font-mono font-bold">{code}</span> — {name}</> : '—'}
                </p>
            </div>
        );
    }

    if (code) {
        return (
            <div>
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
                <div className="h-12 px-3.5 rounded-xl border border-violet-200 bg-violet-50 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[11px] font-mono font-bold bg-white text-violet-700 border-violet-200 shrink-0">{code}</Badge>
                        <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
                    </span>
                    <button type="button" onClick={onClear} className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-500 shrink-0">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</Label>
            <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Search by code or condition name…"
                    className="h-12 pl-9 text-base bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow rounded-xl"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
            </div>
            {open && query.trim().length >= 2 && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {options.length === 0 && !searching && (
                        <div className="px-3.5 py-2.5 text-xs text-slate-400">No matching ICD-10 code found.</div>
                    )}
                    {options.map(o => (
                        <button key={o.id} type="button" onMouseDown={() => { onSelect(o.code, o.name); setQuery(''); setOpen(false); }}
                            className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 border-b last:border-b-0 border-slate-100">
                            <span className="font-mono font-bold text-violet-700 text-xs shrink-0">{o.code}</span>
                            <span className="text-slate-700 truncate">{o.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
