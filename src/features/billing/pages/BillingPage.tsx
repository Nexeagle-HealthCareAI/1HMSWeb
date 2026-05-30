import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Plus, Receipt, ArrowLeft, IndianRupee, Loader2, RefreshCw,
    AlertCircle, X, Wallet, TrendingDown, Trash2, Printer, Lock, FileText, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { debounce } from 'lodash';

import { patientService } from '../services/patientService';
import {
    ipdBillingService,
    type BillingChargeRow, type BillingPaymentRow, type GetEncounterEventsResponse,
} from '../services/ipdBillingService';
import type { Patient } from '../types';
import { AddChargeDialog } from '../components/dialogs/AddChargeDialog';
import { AddPaymentDialog } from '../components/dialogs/AddPaymentDialog';
import { VISIT_TYPES } from '../utils/constants';

// ─── Local view models ──────────────────────────────────────────────────────

type Encounter = {
    encounterId: string;
    invoiceNo?: string;
    invoiceDate: string;
    doctorName?: string;
    status: string;
    isCancelled: boolean;
    cancelReason?: string;
};


// ─── Main BillingPage ───────────────────────────────────────────────────────

export const BillingPage: React.FC = () => {
    const { toast } = useToast();
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId');

    // Patient panel
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Encounters (visits)
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [encountersLoading, setEncountersLoading] = useState(false);
    const [encountersError, setEncountersError] = useState<string | null>(null);

    // Selected encounter + its events
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(appointmentId || null);
    const [eventsData, setEventsData] = useState<GetEncounterEventsResponse['data'] | null>(null);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

    // Dialogs
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showNewVisit, setShowNewVisit] = useState(false);
    const [newVisitType, setNewVisitType] = useState<'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY'>('OPD');
    const [creatingVisit, setCreatingVisit] = useState(false);
    const [voidConfirm, setVoidConfirm] = useState<{ kind: 'charge' | 'payment'; id: string; label: string } | null>(null);
    const [voidBusy, setVoidBusy] = useState(false);

    // ─── Patient search ─────
    const debouncedSearch = useMemo(
        () => debounce(async (query: string) => {
            if (!query || query.length < 3) { setSearchResults([]); setIsSearching(false); return; }
            setIsSearching(true);
            let by: 'patientId' | 'name' | 'contact' = 'name';
            if (query.toUpperCase().startsWith('PT')) by = 'patientId';
            else if (/^\d{4,}$/.test(query)) by = 'contact';
            try {
                const results = await patientService.searchPatients(query, by);
                setSearchResults(results);
            } catch {
                toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch patients.' });
            } finally {
                setIsSearching(false);
            }
        }, 500),
        [toast]
    );

    useEffect(() => {
        debouncedSearch(patientSearch);
        return () => { debouncedSearch.cancel(); };
    }, [patientSearch, debouncedSearch]);

    // ─── Load encounters for selected patient ─────
    const loadEncounters = useCallback(async (patientIdValue: string) => {
        setEncountersLoading(true);
        setEncountersError(null);
        try {
            const res: any = await ipdBillingService.getPatientEvents(patientIdValue);
            if (res?.success === false) throw new Error(res.message ?? 'Could not load visits');
            const list: Encounter[] = (res?.data?.encounters ?? []).map((e: any) => ({
                encounterId: e.encounterId,
                invoiceNo: e.invoiceNo ?? undefined,
                invoiceDate: e.invoiceDate ?? new Date().toISOString(),
                doctorName: e.doctorName ?? undefined,
                status: e.status ?? 'OPEN',
                isCancelled: !!e.isCancelled,
                cancelReason: e.cancelReason ?? undefined,
            })).sort((a: Encounter, b: Encounter) => b.invoiceDate.localeCompare(a.invoiceDate));
            setEncounters(list);
            if (!selectedEncounterId && list.length > 0) setSelectedEncounterId(list[0].encounterId);
            else if (list.length === 0) setSelectedEncounterId(null);
        } catch (e: any) {
            setEncountersError(e?.message ?? 'Failed to load visits');
        } finally {
            setEncountersLoading(false);
        }
    }, [selectedEncounterId]);

    // ─── Load events for selected encounter ─────
    const loadEvents = useCallback(async () => {
        if (!selectedPatient || !selectedEncounterId) {
            setEventsData(null);
            return;
        }
        setEventsLoading(true);
        setEventsError(null);
        try {
            const res = await ipdBillingService.getEncounterEvents(selectedEncounterId, selectedPatient.patientId);
            if (!res?.success) throw new Error(res?.message ?? 'Could not load events');
            setEventsData(res.data ?? null);
        } catch (e: any) {
            setEventsError(e?.message ?? 'Failed to load events');
        } finally {
            setEventsLoading(false);
        }
    }, [selectedPatient, selectedEncounterId]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    useEffect(() => {
        if (selectedPatient) loadEncounters(selectedPatient.patientId);
    }, [selectedPatient, loadEncounters]);

    // Auto-select patient from initial URL param (best effort)
    useEffect(() => {
        if (!initialPatientId || selectedPatient) return;
        (async () => {
            try {
                const results = await patientService.searchPatients(initialPatientId, 'patientId');
                if (results.length > 0) setSelectedPatient(results[0]);
            } catch { /* ignore */ }
        })();
    }, [initialPatientId, selectedPatient]);

    // ─── Mutations ─────

    const handleCreateVisit = async () => {
        if (!selectedPatient || creatingVisit) return;
        setCreatingVisit(true);
        try {
            const res = await ipdBillingService.createEncounter({
                patientId: selectedPatient.patientId,
                encounterType: newVisitType,
            });
            if (!res?.success || !res.data?.encounterId) throw new Error(res?.message ?? 'Could not create visit');
            const newId = res.data.encounterId;
            toast({ title: 'Visit created', description: `${newVisitType} visit ready for billing` });
            await loadEncounters(selectedPatient.patientId);
            setSelectedEncounterId(newId);
            setShowNewVisit(false);
        } catch (e: any) {
            toast({ title: 'Could not create visit', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setCreatingVisit(false);
        }
    };

    const handleVoid = async () => {
        if (!voidConfirm || !selectedPatient || voidBusy) return;
        setVoidBusy(true);
        try {
            const type = voidConfirm.kind === 'charge' ? 'Charges' : 'Payment';
            const res: any = await ipdBillingService.deleteEvent(voidConfirm.id, type, selectedPatient.patientId);
            if (res?.success === false) throw new Error(res.message ?? 'Could not delete');
            toast({ title: `${voidConfirm.kind === 'charge' ? 'Charge' : 'Payment'} removed` });
            setVoidConfirm(null);
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setVoidBusy(false);
        }
    };

    const handlePrint = async () => {
        if (!selectedPatient || !selectedEncounterId) return;
        try {
            await ipdBillingService.print(selectedPatient.patientId, selectedEncounterId);
            toast({ title: 'Print request sent' });
        } catch (e: any) {
            toast({ title: 'Print failed', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    // ─── Derived totals ─────
    const totals = useMemo(() => {
        const debit = eventsData?.totalBilledAmount ?? 0;
        const credit = eventsData?.amountReceived ?? 0;
        const balance = eventsData?.netBalance ?? (debit - credit);
        return { debit, credit, balance };
    }, [eventsData]);

    const selectedEncounter = useMemo(
        () => encounters.find(e => e.encounterId === selectedEncounterId) ?? null,
        [encounters, selectedEncounterId]
    );

    const isFinalized = (eventsData?.currentInvoice?.statusCode ?? '').toUpperCase() === 'FINALIZED';

    // ─── Render ─────
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-2 sm:px-4 pb-4 pt-1 gap-4 text-sm text-slate-800">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/40 ring-1 ring-black/5 shadow-lg shadow-indigo-500/5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100" onClick={() => navigate('/billing')}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                        <IndianRupee className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold tracking-wide text-slate-900 uppercase">Billing Ledger</h1>
                        <p className="text-[10px] text-slate-500 font-mono">Encounter: {selectedEncounterId ?? '—'}</p>
                    </div>

                    {selectedPatient && (
                        <div className="flex items-center gap-3 ml-3 min-w-0">
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-300 shrink-0">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 truncate">{selectedPatient.name}</h3>
                                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 shrink-0">{selectedPatient.age}Y / {selectedPatient.sex}</Badge>
                                    </div>
                                    <span className="text-[10px] text-cyan-700 font-mono">{selectedPatient.patientId}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-600" onClick={() => { setSelectedPatient(null); setEncounters([]); setSelectedEncounterId(null); setEventsData(null); }}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {totals.balance !== 0 && (
                                <div className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-2',
                                    totals.balance < 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'
                                )}>
                                    {totals.balance < 0 ? <Wallet className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold tracking-wider uppercase">{totals.balance < 0 ? 'Credit' : 'Due'}</span>
                                        <span className="text-sm font-bold font-mono">₹ {Math.abs(totals.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main 3-column layout */}
            <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">

                {/* Left: patient search */}
                <Card className="col-span-12 md:col-span-3 lg:col-span-2 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-indigo-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Patient</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 flex flex-col min-h-0">
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="PTID / name / mobile" className="h-9 pl-8 text-xs" autoFocus />
                        </div>

                        {patientSearch.length > 0 && (
                            <div className="border border-slate-200 rounded-md flex-1 overflow-auto bg-white text-xs">
                                {isSearching && (
                                    <div className="p-3 flex items-center gap-2 text-cyan-700"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>
                                )}
                                {!isSearching && patientSearch.length >= 3 && searchResults.length === 0 && (
                                    <div className="p-3 text-rose-600 text-[10px] text-center">No patients found</div>
                                )}
                                {!isSearching && patientSearch.length < 3 && (
                                    <div className="p-3 text-slate-400 text-[10px] text-center">Type at least 3 characters</div>
                                )}
                                {searchResults.map(p => (
                                    <button key={p.patientId} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(''); setSearchResults([]); setSelectedEncounterId(null); setEventsData(null); }} className="w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-cyan-50">
                                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{p.patientId} · {p.mobile} · {p.age}y/{p.sex}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {patientSearch.length === 0 && !selectedPatient && (
                            <div className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400 px-3">
                                Search by patient ID, name, or mobile to start billing.
                            </div>
                        )}

                        {patientSearch.length === 0 && selectedPatient && (
                            <div className="text-[11px] text-slate-500 px-1 leading-relaxed">
                                Showing ledger for <span className="font-semibold text-slate-700">{selectedPatient.name}</span>. Search again to switch patient.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Middle: encounters + ledger */}
                <Card className="col-span-12 md:col-span-9 lg:col-span-7 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-indigo-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Visits</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectedPatient && loadEncounters(selectedPatient.patientId)} disabled={!selectedPatient || encountersLoading}>
                                <RefreshCw className={cn('h-3 w-3 mr-1', encountersLoading && 'animate-spin')} /> Refresh
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowNewVisit(true)} disabled={!selectedPatient}>
                                <Plus className="h-3 w-3 mr-1" /> New Visit
                            </Button>
                        </div>
                    </CardHeader>

                    <div className="border-b border-slate-200 bg-white">
                        {!selectedPatient ? (
                            <div className="p-6 text-center text-xs text-slate-400">Select a patient to view their visits.</div>
                        ) : encountersLoading ? (
                            <div className="p-3 space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                        ) : encountersError ? (
                            <div className="p-4 text-center text-rose-600 text-xs flex items-center justify-center gap-2"><AlertCircle className="h-4 w-4" /> {encountersError}</div>
                        ) : encounters.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">No visits yet for this patient. Click "New Visit" to start.</div>
                        ) : (
                            <div className="flex overflow-x-auto p-2 gap-2">
                                {encounters.map(enc => {
                                    const active = enc.encounterId === selectedEncounterId;
                                    return (
                                        <button
                                            key={enc.encounterId}
                                            type="button"
                                            onClick={() => setSelectedEncounterId(enc.encounterId)}
                                            className={cn(
                                                'shrink-0 px-3 py-2 rounded-xl border text-xs text-left transition-all min-w-[160px]',
                                                active ? 'border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30' : 'border-slate-200 bg-white hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-sm',
                                                enc.isCancelled && 'opacity-60'
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-[10px]">{enc.invoiceNo ?? enc.encounterId.slice(0, 8)}</span>
                                                <Badge variant="outline" className={cn('text-[9px] h-4 px-1', active && 'bg-white/20 text-white border-white/30')}>{enc.status}</Badge>
                                                {enc.isCancelled && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-rose-50 text-rose-700 border-rose-200">VOID</Badge>}
                                            </div>
                                            <p className={cn('text-[10px] mt-0.5', active ? 'text-indigo-100' : 'text-slate-500')}>
                                                {format(parseISO(enc.invoiceDate), 'dd MMM yyyy')}
                                                {enc.doctorName ? ` · ${enc.doctorName}` : ''}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Ledger */}
                    <CardContent className="p-0 flex-1 overflow-auto">
                        {!selectedEncounterId ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {selectedPatient ? 'Pick a visit above (or create one) to see the ledger.' : 'Select a patient first.'}
                            </div>
                        ) : eventsLoading ? (
                            <div className="p-3 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
                        ) : eventsError ? (
                            <div className="p-6 text-center text-rose-600 text-xs flex flex-col items-center gap-2">
                                <AlertCircle className="h-6 w-6" /> {eventsError}
                                <Button size="sm" variant="outline" onClick={loadEvents} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                            </div>
                        ) : (
                            <>
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10">
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Date</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Particular</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Category</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Qty × Rate</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Debit</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Credit</th>
                                            <th className="w-px" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(eventsData?.charges ?? []).map((c: BillingChargeRow) => (
                                            <tr key={c.chargeEventId} className="border-b border-slate-100 border-l-2 border-l-transparent hover:border-l-indigo-300 hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{format(parseISO(c.createdDateTime), 'dd MMM HH:mm')}</td>
                                                <td className="px-3 py-2"><div className="font-semibold text-slate-800 truncate max-w-[260px]">{c.displayName ?? '—'}</div></td>
                                                <td className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">{c.categoryCode ?? '—'}</td>
                                                <td className="px-3 py-2 text-right font-mono">{c.qty} × ₹{Number(c.rate).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">₹{Number(c.netAmount).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right text-slate-300">—</td>
                                                <td className="px-2 py-2 text-right">
                                                    {!isFinalized && (
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600" onClick={() => setVoidConfirm({ kind: 'charge', id: c.chargeEventId, label: c.displayName ?? 'Charge' })}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(eventsData?.payments ?? []).map((p: BillingPaymentRow) => (
                                            <tr key={p.paymentId} className="border-b border-slate-100 border-l-2 border-l-emerald-300 hover:bg-emerald-50/40 bg-emerald-50/20 transition-colors">
                                                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{format(parseISO(p.createdDateTime), 'dd MMM HH:mm')}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-semibold text-emerald-700">{p.paymentType ?? 'PAYMENT'} · {p.paymentMode ?? '—'}</div>
                                                    <div className="text-[10px] text-slate-500">{p.receiptNo ? `Receipt ${p.receiptNo}` : ''}{p.paymentDescription ? ` · ${p.paymentDescription}` : ''}</div>
                                                </td>
                                                <td className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">PAYMENT</td>
                                                <td className="px-3 py-2 text-right text-slate-300 font-mono">—</td>
                                                <td className="px-3 py-2 text-right text-slate-300">—</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">₹{Number(p.amount).toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    {!isFinalized && (
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600" onClick={() => setVoidConfirm({ kind: 'payment', id: p.paymentId, label: p.paymentType ?? 'Payment' })}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {(eventsData?.charges?.length ?? 0) === 0 && (eventsData?.payments?.length ?? 0) === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-3 py-12 text-center text-xs text-slate-400">
                                                    No entries on this visit yet. Use the right panel to add a charge or payment.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Right: actions */}
                <Card className="col-span-12 lg:col-span-3 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-indigo-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-auto space-y-3">
                        {/* Totals summary */}
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-black/5">
                            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/40 blur-2xl pointer-events-none" />
                            <div className="relative flex justify-between text-xs"><span className="text-slate-500">Gross Charged</span><span className="font-mono font-semibold tabular-nums">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            <div className="relative flex justify-between text-xs mt-1.5"><span className="text-slate-500">Received</span><span className="font-mono font-semibold text-emerald-700 tabular-nums">₹{totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            <div className="relative flex justify-between items-baseline text-sm pt-2.5 mt-2.5 border-t border-indigo-200/60">
                                <span className="font-bold text-slate-700">Balance</span>
                                <span className={cn('font-mono font-black text-lg tabular-nums', totals.balance > 0 ? 'text-rose-700' : totals.balance < 0 ? 'text-emerald-700' : 'text-slate-700')}>
                                    ₹{Math.abs(totals.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {totals.balance < 0 ? 'CR' : totals.balance > 0 ? 'DR' : ''}
                                </span>
                            </div>
                            {isFinalized && (
                                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    <Lock className="h-3 w-3" /> Invoice {eventsData?.currentInvoice?.invoiceNo ?? ''} finalized — entries locked.
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-1 gap-2">
                            <Button onClick={() => setShowAddCharge(true)} disabled={!selectedEncounterId || isFinalized} className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]">
                                <Plus className="h-4 w-4 mr-1" /> Add Charge
                            </Button>
                            <Button onClick={() => setShowAddPayment(true)} disabled={!selectedEncounterId || isFinalized} className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]">
                                <CreditCard className="h-4 w-4 mr-1" /> Record Payment
                            </Button>
                            <Button onClick={handlePrint} variant="outline" disabled={!selectedEncounterId} className="h-10 rounded-xl">
                                <Printer className="h-4 w-4 mr-1" /> Print Bill
                            </Button>
                            {selectedEncounterId && (
                                <Button onClick={() => navigate(`/billing/encounter/${selectedEncounterId}`)} variant="outline" className="h-10 rounded-xl">
                                    <FileText className="h-4 w-4 mr-1" /> Open Encounter View
                                </Button>
                            )}
                        </div>

                        {selectedEncounter?.isCancelled && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-700">
                                <p className="font-bold">VISIT CANCELLED</p>
                                {selectedEncounter.cancelReason && <p className="mt-1">{selectedEncounter.cancelReason}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            {selectedPatient && selectedEncounterId && (
                <AddChargeDialog
                    open={showAddCharge}
                    onOpenChange={setShowAddCharge}
                    patientId={selectedPatient.patientId}
                    encounterId={selectedEncounterId}
                    onSaved={loadEvents}
                />
            )}
            {selectedPatient && selectedEncounterId && (
                <AddPaymentDialog
                    open={showAddPayment}
                    onOpenChange={setShowAddPayment}
                    patientId={selectedPatient.patientId}
                    encounterId={selectedEncounterId}
                    suggestedAmount={Math.max(0, totals.balance)}
                    onSaved={loadEvents}
                />
            )}

            {/* New visit dialog */}
            <Dialog open={showNewVisit} onOpenChange={setShowNewVisit}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5">
                            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30"><Plus className="h-4 w-4" /></span>
                            New Visit
                        </DialogTitle>
                        <DialogDescription>Start a new billing encounter for {selectedPatient?.name}.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Visit type</Label>
                        <Select value={newVisitType} onValueChange={(v) => setNewVisitType(v as any)}>
                            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewVisit(false)} disabled={creatingVisit}>Cancel</Button>
                        <Button onClick={handleCreateVisit} disabled={creatingVisit} className="bg-indigo-600 hover:bg-indigo-700">
                            {creatingVisit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Create Visit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Void confirm */}
            <AlertDialog open={!!voidConfirm} onOpenChange={(o) => { if (!o) setVoidConfirm(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove <span className="font-semibold">{voidConfirm?.label}</span> from this visit. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={voidBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoid} disabled={voidBusy} className="bg-rose-600 hover:bg-rose-700">
                            {voidBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing…</> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BillingPage;
