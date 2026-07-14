import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { eprescriptionApi, type MedicineSearchItem } from '@/features/patient/services/eprescriptionApi';
import type { DischargeMedicationItem } from '../services/dischargeSummaryApi';

interface Props {
    value: DischargeMedicationItem[];
    onChange: (meds: DischargeMedicationItem[]) => void;
    hospitalId: string;
    doctorId: string;
    disabled?: boolean;
}

const inputCls = 'h-9 text-sm bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow rounded-lg';
const filledCls = 'bg-emerald-50/60 border-emerald-200';

// Same preset lists as the doctor board's prescription pad (EPrescriptionPad.tsx) — kept identical
// so the two medication-entry experiences behave the same way.
const QUICK_ROUTES = ['PO', 'IV', 'IM', 'Topical', 'Inhalation', 'Eye', 'Ear', 'Nasal'];
const QUICK_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS(PRN)', 'EOD', 'STAT', '1-0-0', '0-0-1', '1-0-1', '1-1-1', '2-0-2', '1-1-1-1'];
const QUICK_DURATIONS = ['3D', '5D', '7D', '10D', '14D', '1M'];
const QUICK_INSTRUCTIONS = ['After food', 'Before food', 'With water', 'At bedtime'];
const DURATION_UNITS = ['days', 'weeks', 'months'] as const;

const composeDuration = (value: string, unit: string): string =>
    value.trim() ? `${value.trim()} ${unit.charAt(0).toUpperCase()}${unit.slice(1)}` : '';

// Best-effort split of the single free-text `durations` string (e.g. "5 Days") back into a
// value + unit for the compound input. Falls back to showing the raw string in the value field
// with a "days" default unit when it doesn't parse cleanly (e.g. hand-typed "SOS").
const parseDuration = (durations?: string): { value: string; unit: string } => {
    const match = (durations ?? '').trim().match(/^(\d+)\s*(day|days|week|weeks|month|months)?$/i);
    if (!match) return { value: durations ?? '', unit: 'days' };
    const unitWord = (match[2] ?? 'days').toLowerCase();
    const unit = unitWord.startsWith('week') ? 'weeks' : unitWord.startsWith('month') ? 'months' : 'days';
    return { value: match[1], unit };
};

const durationFromQuickPick = (dur: string): string => {
    const value = dur.replace(/[A-Z]/g, '');
    const unit = dur.endsWith('D') ? 'days' : dur.endsWith('W') ? 'weeks' : dur.endsWith('M') ? 'months' : 'days';
    return composeDuration(value, unit);
};

/** Structured discharge/home-medication list — same field set, quick-pick presets, and
 *  Personal/General search split as the e-prescription pad's medicine picker
 *  (EPrescriptionPad.tsx), built as its own small component rather than reusing that pad's
 *  inline (non-exported) implementation. */
export const DischargeMedicationsEditor: React.FC<Props> = ({ value, onChange, hospitalId, doctorId, disabled }) => {
    const [searchOpenIndex, setSearchOpenIndex] = useState<number | null>(null);
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<{ personal: MedicineSearchItem[]; general: MedicineSearchItem[] }>({ personal: [], general: [] });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const updateRow = (index: number, patch: Partial<DischargeMedicationItem>) => {
        const next = value.map((m, i) => (i === index ? { ...m, ...patch } : m));
        onChange(next);
    };

    const removeRow = (index: number) => {
        onChange(value.filter((_, i) => i !== index).map((m, i) => ({ ...m, displayOrder: i })));
    };

    const addRow = () => {
        onChange([...value, { medicineName: '', dosage: '', route: '', frequency: '', durations: '', instructions: '', saltName: '', displayOrder: value.length }]);
    };

    const handleNameChange = (index: number, name: string) => {
        updateRow(index, { medicineName: name });
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!hospitalId || !doctorId || name.trim().length <= 2) {
            setResults({ personal: [], general: [] });
            setSearchOpenIndex(null);
            return;
        }

        setSearching(true);
        setSearchOpenIndex(index);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await eprescriptionApi.searchMedicines(hospitalId, doctorId, name.trim());
                setResults({ personal: res?.personalMedicine ?? [], general: res?.masterMedicine ?? [] });
            } catch {
                setResults({ personal: [], general: [] });
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const selectMedicine = (index: number, item: MedicineSearchItem) => {
        updateRow(index, {
            medicineName: item.medicineName,
            saltName: item.genericName || value[index]?.saltName,
            dosage: item.strength || value[index]?.dosage,
        });
        setSearchOpenIndex(null);
        setResults({ personal: [], general: [] });
    };

    const hasResults = results.personal.length > 0 || results.general.length > 0;

    return (
        <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Pill className="h-3 w-3" /> Discharge Medications
            </Label>

            <div className="space-y-3">
                {value.map((med, index) => {
                    const duration = parseDuration(med.durations);
                    return (
                        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 shadow-sm space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                                <div className="relative lg:col-span-2">
                                    <Input
                                        placeholder="Search medicine…"
                                        value={med.medicineName ?? ''}
                                        disabled={disabled}
                                        onChange={e => handleNameChange(index, e.target.value)}
                                        onFocus={() => { if ((med.medicineName ?? '').trim().length > 2) setSearchOpenIndex(index); }}
                                        onBlur={() => setTimeout(() => setSearchOpenIndex(prev => (prev === index ? null : prev)), 150)}
                                        className={cn(inputCls, med.medicineName && filledCls)}
                                    />
                                    {searchOpenIndex === index && (
                                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                            {searching && (
                                                <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>
                                            )}
                                            {!searching && !hasResults && (
                                                <div className="px-3 py-2 text-xs text-slate-400">No matches — you can still type a name freely.</div>
                                            )}
                                            {!searching && results.personal.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">Personal</div>
                                                    {results.personal.map((it, i) => (
                                                        <button key={`p-${i}`} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectMedicine(index, it)}
                                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 transition-colors">
                                                            <span className="font-medium text-slate-800">{it.medicineName}</span>
                                                            {it.strength && <span className="text-xs text-slate-400 ml-1.5">{it.strength}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!searching && results.general.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">General</div>
                                                    {results.general.map((it, i) => (
                                                        <button key={`g-${i}`} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectMedicine(index, it)}
                                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 transition-colors">
                                                            <span className="font-medium text-slate-800">{it.medicineName}</span>
                                                            {it.strength && <span className="text-xs text-slate-400 ml-1.5">{it.strength}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Input placeholder="Dosage" value={med.dosage ?? ''} disabled={disabled} onChange={e => updateRow(index, { dosage: e.target.value })} className={cn(inputCls, med.dosage && filledCls)} />
                                <Input placeholder="Route" value={med.route ?? ''} disabled={disabled} onChange={e => updateRow(index, { route: e.target.value })} className={cn(inputCls, med.route && filledCls)} />
                                <Input placeholder="Frequency" value={med.frequency ?? ''} disabled={disabled} onChange={e => updateRow(index, { frequency: e.target.value })} className={cn(inputCls, med.frequency && filledCls)} />
                                <div className="flex gap-1.5">
                                    <Input
                                        placeholder="e.g. 5" value={duration.value} disabled={disabled}
                                        onChange={e => updateRow(index, { durations: composeDuration(e.target.value, duration.unit) })}
                                        className={cn(inputCls, 'flex-1 min-w-0', med.durations && filledCls)}
                                    />
                                    <select
                                        value={duration.unit} disabled={disabled}
                                        onChange={e => updateRow(index, { durations: composeDuration(duration.value, e.target.value) })}
                                        className={cn('h-9 text-sm border border-slate-200 rounded-lg px-1.5 shrink-0', med.durations ? filledCls : 'bg-white')}
                                    >
                                        {DURATION_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Input placeholder="Instructions" value={med.instructions ?? ''} disabled={disabled} onChange={e => updateRow(index, { instructions: e.target.value })} className={cn(inputCls, 'flex-1', med.instructions && filledCls)} />
                                    {!disabled && (
                                        <button type="button" onClick={() => removeRow(index)} className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!disabled && (
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                                        <span className="font-semibold text-slate-600">Quick route:</span>
                                        {QUICK_ROUTES.map(route => (
                                            <Button key={route} type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[11px]" onClick={() => updateRow(index, { route })}>
                                                {route}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                                        <span className="font-semibold text-slate-600">Quick frequency:</span>
                                        {QUICK_FREQUENCIES.map(freq => (
                                            <Button key={freq} type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"
                                                onClick={() => updateRow(index, { frequency: med.frequency ? `${med.frequency}, ${freq}` : freq })}>
                                                {freq}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                                        <span className="font-semibold text-slate-600">Quick duration:</span>
                                        {QUICK_DURATIONS.map(dur => (
                                            <Button key={dur} type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[11px]" onClick={() => updateRow(index, { durations: durationFromQuickPick(dur) })}>
                                                {dur}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                                        <span className="font-semibold text-slate-600">Quick instructions:</span>
                                        {QUICK_INSTRUCTIONS.map(instr => (
                                            <Button key={instr} type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"
                                                onClick={() => updateRow(index, { instructions: med.instructions ? `${med.instructions}, ${instr}` : instr })}>
                                                {instr}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-[10px] font-semibold text-slate-500">Salt name</Label>
                                    <Input placeholder="e.g., Paracetamol + Caffeine" value={med.saltName ?? ''} disabled={disabled}
                                        onChange={e => updateRow(index, { saltName: e.target.value })} className={cn(inputCls, 'mt-0.5', med.saltName && filledCls)} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {value.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-sm text-slate-400">
                        No discharge medications added yet.
                    </div>
                )}
            </div>

            {!disabled && (
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2 gap-1.5 h-8 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add medicine
                </Button>
            )}
        </div>
    );
};

export default DischargeMedicationsEditor;
