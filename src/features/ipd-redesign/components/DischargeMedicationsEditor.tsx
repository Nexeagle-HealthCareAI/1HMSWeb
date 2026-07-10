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

/** Structured discharge/home-medication list — same field set and Personal/General search split
 *  as the e-prescription pad's medicine picker, built as its own small component rather than
 *  reusing EPrescriptionPad.tsx's inline (non-exported) implementation. */
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
        onChange([...value, { medicineName: '', dosage: '', route: '', frequency: '', durations: '', instructions: '', displayOrder: value.length }]);
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
            saltName: item.genericName || undefined,
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

            <div className="space-y-2">
                {value.map((med, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                            <div className="relative lg:col-span-2">
                                <Input
                                    placeholder="Search medicine…"
                                    value={med.medicineName ?? ''}
                                    disabled={disabled}
                                    onChange={e => handleNameChange(index, e.target.value)}
                                    onFocus={() => { if ((med.medicineName ?? '').trim().length > 2) setSearchOpenIndex(index); }}
                                    onBlur={() => setTimeout(() => setSearchOpenIndex(prev => (prev === index ? null : prev)), 150)}
                                    className={inputCls}
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
                            <Input placeholder="Dosage" value={med.dosage ?? ''} disabled={disabled} onChange={e => updateRow(index, { dosage: e.target.value })} className={inputCls} />
                            <Input placeholder="Route" value={med.route ?? ''} disabled={disabled} onChange={e => updateRow(index, { route: e.target.value })} className={inputCls} />
                            <Input placeholder="Frequency" value={med.frequency ?? ''} disabled={disabled} onChange={e => updateRow(index, { frequency: e.target.value })} className={inputCls} />
                            <Input placeholder="Duration" value={med.durations ?? ''} disabled={disabled} onChange={e => updateRow(index, { durations: e.target.value })} className={inputCls} />
                            <div className="flex items-center gap-1.5">
                                <Input placeholder="Instructions" value={med.instructions ?? ''} disabled={disabled} onChange={e => updateRow(index, { instructions: e.target.value })} className={cn(inputCls, 'flex-1')} />
                                {!disabled && (
                                    <button type="button" onClick={() => removeRow(index)} className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

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
