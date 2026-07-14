import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import { referrerApi, type Referrer } from '@/features/appointment/services/referrerApi';

// Referrer-master type styling — same colour language as OPD's appointment-booking referrer
// picker (PatientForm.tsx): DOCTOR=blue, AGENT=purple, REFERRER="Other"=emerald.
export const REFERRER_LABEL: Record<string, string> = { DOCTOR: 'Doctor', AGENT: 'Agent', REFERRER: 'Other' };
export const REFERRER_TONE: Record<string, { bg: string; avatar: string; badge: string; border: string; text: string }> = {
    DOCTOR: { bg: 'bg-blue-50 border-blue-200', avatar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-200', text: 'text-blue-600' },
    AGENT: { bg: 'bg-purple-50 border-purple-200', avatar: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-purple-200', text: 'text-purple-600' },
    REFERRER: { bg: 'bg-emerald-50 border-emerald-200', avatar: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-200', text: 'text-emerald-600' },
};

const INPUT_CLS = 'h-10 rounded-xl';

interface Props {
    hospitalId: string;
    referrerId: string;
    referrerName: string;
    referrerType?: string;
    onSelect: (referrerId: string, referrerName: string, referrerType: string) => void;
    onClear: () => void;
}

// Search-or-create picker against the hospital-wide Referrer master. Shared between the admit
// wizard and the Overview-tab edit sheet so both always behave identically and a fix in one place
// fixes both. Unlike the admit wizard's old inline version, "Add new referrer" is always visible
// (not hidden behind focusing the search box), and a new referrer is created immediately on
// confirm rather than deferred to the parent form's own submit — referrers are small, reusable,
// hospital-wide master data, so an extra one from an abandoned edit is harmless.
export const ReferrerPicker: React.FC<Props> = ({ hospitalId, referrerId, referrerName, referrerType, onSelect, onClear }) => {
    const [search, setSearch] = useState('');
    const [focused, setFocused] = useState(false);
    const [results, setResults] = useState<Referrer[]>([]);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'DOCTOR' | 'AGENT' | 'REFERRER'>('REFERRER');
    const [newPhone, setNewPhone] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (referrerId) return;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await referrerApi.getReferrers(hospitalId, search.trim() || undefined);
                setResults(res.referrers ?? []);
            } catch {
                setResults([]);
            }
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [hospitalId, search, referrerId]);

    const startCreate = (prefillName: string) => {
        setCreating(true);
        setNewName(prefillName);
        setNewType('REFERRER');
        setNewPhone('');
        setNewAddress('');
        setSaveError(null);
        setSearch('');
        setFocused(false);
    };

    const confirmCreate = async () => {
        if (!newName.trim() || saving) return;
        setSaving(true);
        setSaveError(null);
        try {
            const created = await referrerApi.createReferrer(hospitalId, {
                referrerName: newName.trim(),
                referrerType: newType,
                phone: newPhone.trim() || undefined,
                address: newAddress.trim() || undefined,
                defaultRatePercent: 0,
            });
            onSelect(created.referrerId, created.referrerName, newType);
            setCreating(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Could not save the new referrer.');
        } finally {
            setSaving(false);
        }
    };

    if (referrerId) {
        const tone = REFERRER_TONE[referrerType ?? 'REFERRER'] ?? REFERRER_TONE.REFERRER;
        return (
            <div className={cn('h-10 px-3 rounded-xl border flex items-center justify-between', tone.bg)}>
                <span className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', tone.avatar)}>
                        {(referrerName || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm text-slate-800 truncate">{referrerName}</span>
                    {referrerType && <Badge variant="outline" className={cn('text-[9px] font-bold shrink-0', tone.badge)}>{REFERRER_LABEL[referrerType] ?? referrerType}</Badge>}
                </span>
                <button type="button" onClick={onClear} className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-500 shrink-0">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    if (creating) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New referrer</span>
                    <button type="button" onClick={() => setCreating(false)} className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-500">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Referrer name" autoFocus className={INPUT_CLS} />
                <div className="flex gap-2">
                    {(['DOCTOR', 'AGENT', 'REFERRER'] as const).map(opt => {
                        const active = newType === opt;
                        const tone = REFERRER_TONE[opt];
                        return (
                            <button key={opt} type="button" onClick={() => setNewType(opt)}
                                className={cn('flex-1 h-8 rounded-lg border-2 text-xs font-semibold transition-all',
                                    active ? cn(tone.avatar, 'text-white border-transparent') : cn('bg-white', tone.border, tone.text))}>
                                {REFERRER_LABEL[opt]}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Input value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} placeholder="Phone (optional)" className="h-9 text-xs font-mono" />
                    <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Address (optional)" className="h-9 text-xs" />
                </div>
                {saveError && <p className="text-[11px] text-rose-600">{saveError}</p>}
                <div className="flex justify-end gap-2 pt-0.5">
                    <button type="button" onClick={() => setCreating(false)} className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <button type="button" onClick={confirmCreate} disabled={!newName.trim() || saving}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add referrer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
                    placeholder="Search doctor / agent referrer…" className={cn(INPUT_CLS, 'pl-9')} />
            </div>
            <button type="button" onMouseDown={() => startCreate(search.trim())}
                className="mt-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add new referrer
            </button>
            {(focused || search.trim()) && (
                <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                    {results.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                            <Search className="h-3.5 w-3.5" /> No referrers found — add one below.
                        </div>
                    )}
                    {results.map(r => {
                        const tone = REFERRER_TONE[r.referrerType] ?? REFERRER_TONE.REFERRER;
                        return (
                            <button key={r.referrerId} type="button"
                                onMouseDown={() => onSelect(r.referrerId, r.referrerName, r.referrerType)}
                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3">
                                <span className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0', tone.avatar)}>
                                    {r.referrerName.charAt(0).toUpperCase()}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block font-medium text-sm text-slate-800 truncate">{r.referrerName}</span>
                                    {r.phone && <span className="block text-[11px] text-slate-400">{r.phone}</span>}
                                </span>
                                <Badge variant="outline" className={cn('text-[9px] font-bold shrink-0', tone.badge)}>{REFERRER_LABEL[r.referrerType] ?? r.referrerType}</Badge>
                            </button>
                        );
                    })}
                    <button type="button" onMouseDown={() => startCreate(search.trim())}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">+</span>
                        Add new referrer{search.trim() ? ` "${search.trim()}"` : ''}
                    </button>
                </div>
            )}
        </div>
    );
};
