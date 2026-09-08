import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { debounce } from 'lodash';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { patientService } from '@/features/billing/services/patientService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import type { Patient } from '@/features/billing/types';
import { useAuthStore } from '@/store/authStore';

interface NewLabBillDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // Fires once the patient is confirmed (existing or newly registered) AND a fresh LAB encounter
    // has been created for them -- the caller chains straight into AddChargesModal for test
    // selection, reusing that existing picker instead of rebuilding it here.
    onEncounterReady: (encounterId: string, patientId: string) => void;
}

export const NewLabBillDrawer: React.FC<NewLabBillDrawerProps> = ({ open, onOpenChange, onEncounterReady }) => {
    const { toast } = useToast();
    const [mode, setMode] = useState<'search' | 'manual'>('search');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [searching, setSearching] = useState(false);

    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState<'Male' | 'Female'>('Male');

    const [submitting, setSubmitting] = useState(false);

    const debouncedSearch = useMemo(
        () => debounce(async (q: string) => {
            if (!q || q.length < 3) { setResults([]); setSearching(false); return; }
            setSearching(true);
            let by: 'patientId' | 'name' | 'contact' = 'name';
            if (q.toUpperCase().startsWith('PT')) by = 'patientId';
            else if (/^\d{4,}$/.test(q)) by = 'contact';
            try {
                setResults(await patientService.searchPatients(q, by));
            } catch {
                toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch patients.' });
            } finally {
                setSearching(false);
            }
        }, 400),
        [toast],
    );

    useEffect(() => { debouncedSearch(query); return () => { debouncedSearch.cancel(); }; }, [query, debouncedSearch]);

    useEffect(() => {
        if (!open) {
            setMode('search');
            setQuery('');
            setResults([]);
            setFullName('');
            setMobile('');
            setAge('');
            setSex('Male');
            setSubmitting(false);
        }
    }, [open]);

    const createBillFor = async (patientId: string) => {
        try {
            const hospitalId = useAuthStore.getState().getHospitalId();
            const res = await ipdBillingService.createEncounter({ hospitalId, patientId, encounterType: 'LAB' });
            if (!res.success || !res.data?.encounterId) throw new Error(res.message ?? 'Could not create bill');
            onOpenChange(false);
            onEncounterReady(res.data.encounterId, patientId);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not create bill', description: e?.message ?? '' });
            setSubmitting(false);
        }
    };

    const handlePickExisting = (p: Patient) => {
        setSubmitting(true);
        createBillFor(p.patientId);
    };

    const handleRegisterAndCreate = async () => {
        if (!fullName.trim() || !mobile.trim() || submitting) return;
        setSubmitting(true);
        try {
            const hospitalId = useAuthStore.getState().getHospitalId();
            const patient = await patientService.registerWalkIn(hospitalId, {
                fullName: fullName.trim(),
                mobile: mobile.trim(),
                age: age ? Number(age) : undefined,
                sex,
            });
            await createBillFor(patient.patientId);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not register patient', description: e?.message ?? '' });
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
            <SheetContent className="sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle>New Lab Bill</SheetTitle>
                    <SheetDescription>Pick the patient this bill is for, then add tests.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <button
                            type="button"
                            onClick={() => setMode('search')}
                            disabled={submitting}
                            className={cn(
                                'flex-1 text-xs font-semibold rounded-md py-1.5 transition-colors',
                                mode === 'search' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500',
                            )}
                        >
                            Existing Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            disabled={submitting}
                            className={cn(
                                'flex-1 text-xs font-semibold rounded-md py-1.5 transition-colors',
                                mode === 'manual' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500',
                            )}
                        >
                            Add Manually
                        </button>
                    </div>

                    {mode === 'search' ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, patient ID or mobile..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-9"
                                    disabled={submitting}
                                />
                                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                            </div>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto">
                                {results.map(p => (
                                    <button
                                        key={p.patientId}
                                        disabled={submitting}
                                        onClick={() => handlePickExisting(p)}
                                        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-brand-300 hover:bg-brand-50/50 transition-colors disabled:opacity-50"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-300 shrink-0">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">{p.patientId} · {p.age}Y/{p.sex}</p>
                                        </div>
                                        {submitting && <Loader2 className="h-4 w-4 animate-spin text-brand-500 shrink-0" />}
                                    </button>
                                ))}
                                {query.length >= 3 && !searching && results.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">No patients found. Try "Add Manually".</p>
                                )}
                                {query.length < 3 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Type at least 3 characters to search.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs">Full Name *</Label>
                                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Patient name" disabled={submitting} />
                            </div>
                            <div>
                                <Label className="text-xs">Mobile *</Label>
                                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" disabled={submitting} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Age</Label>
                                    <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} disabled={submitting} />
                                </div>
                                <div>
                                    <Label className="text-xs">Gender</Label>
                                    <Select value={sex} onValueChange={(v) => setSex(v as 'Male' | 'Female')} disabled={submitting}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'manual' && (
                    <SheetFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                        <Button onClick={handleRegisterAndCreate} disabled={!fullName.trim() || !mobile.trim() || submitting} className="gap-1.5">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Register &amp; Continue to Tests
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
};
