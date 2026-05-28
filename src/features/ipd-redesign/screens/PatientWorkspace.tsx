import React, { useMemo, useState } from 'react';
import {
    ArrowLeft, Activity, Pill, NotebookPen, IndianRupee, LayoutDashboard, LogOut,
    Plus, Check, AlertTriangle, Clock, Heart, Wind, Thermometer, Droplet, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useIpdStore } from '../store';
import type { MedStatus } from '../types';

type Tab = 'overview' | 'vitals' | 'mar' | 'notes' | 'billing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'vitals', label: 'Vitals', icon: <Activity className="h-4 w-4" /> },
    { id: 'mar', label: 'MAR', icon: <Pill className="h-4 w-4" /> },
    { id: 'notes', label: 'Round Notes', icon: <NotebookPen className="h-4 w-4" /> },
    { id: 'billing', label: 'Billing', icon: <IndianRupee className="h-4 w-4" /> },
];

interface Props {
    admissionId: string;
    onBack: () => void;
    onDischarge: () => void;
}

export const PatientWorkspace: React.FC<Props> = ({ admissionId, onBack, onDischarge }) => {
    const [tab, setTab] = useState<Tab>('overview');
    const admissionView = useIpdStore(s => s.admissionView);
    const v = admissionView(admissionId);

    if (!v) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-10 text-center text-slate-500">
                Admission not found. <Button variant="link" onClick={onBack}>Back to dashboard</Button>
            </div>
        );
    }

    const discharging = v.status === 'DISCHARGE_INITIATED';

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
            {/* Header bar */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5"><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                        {v.patient.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-black text-slate-900">{v.patient.name}</h1>
                            <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{v.patient.age}{v.patient.sex} · {v.patient.bloodGroup}</Badge>
                            {v.isMlc && <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200">MLC</Badge>}
                            {discharging && <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">DISCHARGING</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {v.admissionNo} · {v.ward.wardName} · {v.bed.bedCode} · {v.attendingDoctor} · LOS {v.lengthOfStayDays}d
                        </p>
                        {v.patient.allergies?.length ? (
                            <p className="text-[11px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Allergies: {v.patient.allergies.join(', ')}</p>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn('rounded-lg border px-3 py-1.5 text-right', v.balance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200')}>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Balance</p>
                        <p className={cn('text-sm font-black font-mono', v.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>₹{Math.abs(v.balance).toLocaleString('en-IN')}{v.balance < 0 ? ' CR' : ''}</p>
                    </div>
                    {!discharging && (
                        <Button onClick={onDischarge} variant="outline" className="h-10 border-amber-300 text-amber-700 hover:bg-amber-50">
                            <LogOut className="h-4 w-4 mr-2" /> Discharge
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1 flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn(
                        'h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5',
                        tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}>{t.icon}{t.label}</button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && <OverviewTab admissionId={admissionId} />}
            {tab === 'vitals' && <VitalsTab admissionId={admissionId} />}
            {tab === 'mar' && <MarTab admissionId={admissionId} />}
            {tab === 'notes' && <NotesTab admissionId={admissionId} />}
            {tab === 'billing' && <BillingTab admissionId={admissionId} locked={discharging} />}
        </div>
    );
};

// ─── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const v = useIpdStore(s => s.admissionView(admissionId))!;
    const referredBy = useIpdStore(s => s.beneficiaryName(v.beneficiaryId));
    const vitals = useIpdStore(s => s.vitals).filter(x => x.admissionId === admissionId);
    const meds = useIpdStore(s => s.medications).filter(x => x.admissionId === admissionId);
    const latest = vitals[vitals.length - 1];
    const dueMeds = meds.filter(m => m.status === 'DUE').length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
                <Card title="Admission details">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <Field label="Admission #" value={v.admissionNo} mono />
                        <Field label="Admitted" value={format(parseISO(v.admittedAt), 'd MMM yyyy, HH:mm')} />
                        <Field label="Ward / Bed" value={`${v.ward.wardName} · ${v.bed.bedCode}`} />
                        <Field label="Attending" value={v.attendingDoctor} />
                        <Field label="Provisional Dx" value={v.provisionalDiagnosis} />
                        {v.finalDiagnosis && <Field label="Final Dx" value={v.finalDiagnosis} />}
                        <Field label="Est. daily cost" value={`₹${v.estimatedDailyCost.toLocaleString('en-IN')}`} />
                        <Field label="LOS" value={`${v.lengthOfStayDays} day(s)`} />
                        {referredBy && <Field label="Referred by" value={referredBy} />}
                    </dl>
                </Card>
            </div>
            <div className="space-y-4">
                <Card title="Latest vitals">
                    {latest ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Stat icon={<Thermometer className="h-4 w-4 text-rose-500" />} label="Temp" value={`${latest.temperatureF}°F`} />
                            <Stat icon={<Heart className="h-4 w-4 text-rose-500" />} label="Pulse" value={`${latest.pulse}`} />
                            <Stat icon={<Activity className="h-4 w-4 text-indigo-500" />} label="BP" value={`${latest.systolic}/${latest.diastolic}`} />
                            <Stat icon={<Wind className="h-4 w-4 text-sky-500" />} label="SpO₂" value={`${latest.spo2}%`} />
                        </div>
                    ) : <p className="text-xs text-slate-400">No vitals recorded.</p>}
                </Card>
                <Card title="Care snapshot">
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-500">Meds due</span><Badge variant="outline" className={cn('text-[10px] font-bold', dueMeds ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>{dueMeds}</Badge></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Total billed</span><span className="font-mono font-semibold">₹{v.totalCharges.toLocaleString('en-IN')}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Received</span><span className="font-mono font-semibold text-emerald-700">₹{v.totalPaid.toLocaleString('en-IN')}</span></div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100"><span className="font-bold">Balance</span><span className={cn('font-mono font-bold', v.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>₹{Math.abs(v.balance).toLocaleString('en-IN')}{v.balance < 0 ? ' CR' : ''}</span></div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// ─── Vitals ───────────────────────────────────────────────────────────────────
const VitalsTab: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const { toast } = useToast();
    const vitals = useIpdStore(s => s.vitals).filter(x => x.admissionId === admissionId);
    const addVital = useIpdStore(s => s.addVital);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ temperatureF: '', pulse: '', systolic: '', diastolic: '', spo2: '', respRate: '', painScore: '' });

    const submit = () => {
        addVital({
            admissionId, recordedAt: new Date().toISOString(), recordedBy: 'You',
            temperatureF: num(form.temperatureF), pulse: num(form.pulse), systolic: num(form.systolic),
            diastolic: num(form.diastolic), spo2: num(form.spo2), respRate: num(form.respRate), painScore: num(form.painScore),
        });
        toast({ title: 'Vitals recorded' });
        setForm({ temperatureF: '', pulse: '', systolic: '', diastolic: '', spo2: '', respRate: '', painScore: '' });
        setOpen(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpen(true)} className="h-8 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-3.5 w-3.5 mr-1" /> Record vitals</Button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="text-left px-3 py-2.5 font-bold">Time</th>
                            <th className="text-right px-3 py-2.5 font-bold">Temp °F</th>
                            <th className="text-right px-3 py-2.5 font-bold">Pulse</th>
                            <th className="text-right px-3 py-2.5 font-bold">BP</th>
                            <th className="text-right px-3 py-2.5 font-bold">SpO₂</th>
                            <th className="text-right px-3 py-2.5 font-bold">RR</th>
                            <th className="text-right px-3 py-2.5 font-bold">Pain</th>
                            <th className="text-left px-3 py-2.5 font-bold">By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...vitals].reverse().map(r => (
                            <tr key={r.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-xs whitespace-nowrap">{format(parseISO(r.recordedAt), 'd MMM HH:mm')}</td>
                                <td className={cn('px-3 py-2 text-right font-mono', (r.temperatureF ?? 0) >= 100.4 && 'text-rose-600 font-bold')}>{r.temperatureF ?? '—'}</td>
                                <td className="px-3 py-2 text-right font-mono">{r.pulse ?? '—'}</td>
                                <td className="px-3 py-2 text-right font-mono">{r.systolic ?? '—'}/{r.diastolic ?? '—'}</td>
                                <td className={cn('px-3 py-2 text-right font-mono', (r.spo2 ?? 100) < 94 && 'text-rose-600 font-bold')}>{r.spo2 ?? '—'}%</td>
                                <td className="px-3 py-2 text-right font-mono">{r.respRate ?? '—'}</td>
                                <td className="px-3 py-2 text-right font-mono">{r.painScore ?? '—'}</td>
                                <td className="px-3 py-2 text-xs text-slate-500">{r.recordedBy}</td>
                            </tr>
                        ))}
                        {vitals.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-400">No vitals yet.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Record vitals</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        {([['temperatureF', 'Temp °F'], ['pulse', 'Pulse'], ['systolic', 'Systolic'], ['diastolic', 'Diastolic'], ['spo2', 'SpO₂ %'], ['respRate', 'Resp rate'], ['painScore', 'Pain 0-10']] as const).map(([k, lbl]) => (
                            <div key={k}>
                                <Label className="text-xs font-semibold text-slate-700">{lbl}</Label>
                                <Input type="number" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="h-9 mt-1" />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ─── MAR ──────────────────────────────────────────────────────────────────────
const MED_TONE: Record<MedStatus, string> = {
    DUE: 'bg-amber-50 text-amber-700 border-amber-200',
    GIVEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MISSED: 'bg-rose-50 text-rose-700 border-rose-200',
    HELD: 'bg-slate-100 text-slate-600 border-slate-200',
};
const MarTab: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const { toast } = useToast();
    const meds = useIpdStore(s => s.medications).filter(x => x.admissionId === admissionId);
    const give = useIpdStore(s => s.giveMedication);

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="text-left px-3 py-2.5 font-bold">Drug</th>
                        <th className="text-left px-3 py-2.5 font-bold">Dose / Route</th>
                        <th className="text-left px-3 py-2.5 font-bold">Scheduled</th>
                        <th className="text-left px-3 py-2.5 font-bold">Status</th>
                        <th className="text-left px-3 py-2.5 font-bold">Given by</th>
                        <th className="w-px"></th>
                    </tr>
                </thead>
                <tbody>
                    {[...meds].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).map(m => (
                        <tr key={m.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                                <span className="font-semibold text-slate-900">{m.drugName}</span>
                                {m.highAlert && <Badge variant="outline" className="ml-2 text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-200">HIGH-ALERT</Badge>}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-700">{m.dose} · {m.route}</td>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">{format(parseISO(m.scheduledAt), 'd MMM HH:mm')}</td>
                            <td className="px-3 py-2"><Badge variant="outline" className={cn('text-[10px] font-bold', MED_TONE[m.status])}>{m.status}</Badge></td>
                            <td className="px-3 py-2 text-xs text-slate-500">{m.givenBy ?? '—'}</td>
                            <td className="px-2 py-2 text-right">
                                {m.status === 'DUE' && (
                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { give(m.id, 'You'); toast({ title: `${m.drugName} given`, description: m.highAlert ? 'High-alert — second-nurse verification recommended.' : undefined }); }}>
                                        <Check className="h-3 w-3 mr-1" /> Give
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {meds.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">No medication orders.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// ─── Notes ────────────────────────────────────────────────────────────────────
const NotesTab: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const { toast } = useToast();
    const notes = useIpdStore(s => s.roundNotes).filter(x => x.admissionId === admissionId);
    const addNote = useIpdStore(s => s.addRoundNote);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' });

    const submit = () => {
        addNote({ admissionId, author: 'You', authoredAt: new Date().toISOString(), ...form });
        toast({ title: 'Round note saved' });
        setForm({ subjective: '', objective: '', assessment: '', plan: '' });
        setOpen(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpen(true)} className="h-8 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-3.5 w-3.5 mr-1" /> Add SOAP note</Button>
            </div>
            <div className="space-y-3">
                {[...notes].reverse().map(n => (
                    <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-sm text-slate-900">{n.author}</p>
                            <p className="text-[11px] text-slate-500">{format(parseISO(n.authoredAt), 'd MMM yyyy, HH:mm')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <SoapLine letter="S" text={n.subjective} />
                            <SoapLine letter="O" text={n.objective} />
                            <SoapLine letter="A" text={n.assessment} />
                            <SoapLine letter="P" text={n.plan} />
                        </div>
                    </div>
                ))}
                {notes.length === 0 && <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No round notes yet.</div>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>SOAP round note</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        {([['subjective', 'Subjective'], ['objective', 'Objective'], ['assessment', 'Assessment'], ['plan', 'Plan']] as const).map(([k, lbl]) => (
                            <div key={k}>
                                <Label className="text-xs font-semibold text-slate-700">{lbl}</Label>
                                <Textarea rows={2} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="text-sm mt-1" />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700">Save note</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ─── Billing tab ────────────────────────────────────────────────────────────────
const BillingTab: React.FC<{ admissionId: string; locked: boolean }> = ({ admissionId, locked }) => {
    const { toast } = useToast();
    const v = useIpdStore(s => s.admissionView(admissionId))!;
    const ledger = useIpdStore(s => s.ledger).filter(l => l.admissionId === admissionId);
    const addCharge = useIpdStore(s => s.addCharge);
    const addPayment = useIpdStore(s => s.addPayment);
    const [chargeOpen, setChargeOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [charge, setCharge] = useState({ description: '', category: 'PROCEDURE', qty: '1', rate: '' });
    const [pay, setPay] = useState({ amount: '', mode: 'CASH' });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="text-left px-3 py-2.5 font-bold">Date</th>
                            <th className="text-left px-3 py-2.5 font-bold">Description</th>
                            <th className="text-left px-3 py-2.5 font-bold">Category</th>
                            <th className="text-right px-3 py-2.5 font-bold">Debit</th>
                            <th className="text-right px-3 py-2.5 font-bold">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...ledger].reverse().map(l => (
                            <tr key={l.id} className={cn('border-t border-slate-100', l.kind === 'PAYMENT' && 'bg-emerald-50/30')}>
                                <td className="px-3 py-2 text-xs whitespace-nowrap">{format(parseISO(l.at), 'd MMM HH:mm')}</td>
                                <td className="px-3 py-2">
                                    <span className="text-slate-800">{l.description}</span>
                                    {l.qty && l.rate ? <span className="text-[11px] text-slate-400 ml-1">({l.qty} × ₹{l.rate})</span> : null}
                                    {l.mode ? <span className="text-[11px] text-slate-400 ml-1">· {l.mode}</span> : null}
                                    {l.auto ? <Badge variant="outline" className="ml-1.5 text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200">AUTO</Badge> : null}
                                </td>
                                <td className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">{l.category}</td>
                                <td className="px-3 py-2 text-right font-mono">{l.kind === 'CHARGE' ? `₹${l.amount.toLocaleString('en-IN')}` : '—'}</td>
                                <td className="px-3 py-2 text-right font-mono text-emerald-700">{l.kind === 'PAYMENT' ? `₹${l.amount.toLocaleString('en-IN')}` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-y-3">
                <Card title="Summary">
                    <div className="space-y-2 text-sm">
                        <Row label="Total billed" value={`₹${v.totalCharges.toLocaleString('en-IN')}`} />
                        <Row label="Received" value={`₹${v.totalPaid.toLocaleString('en-IN')}`} valueClass="text-emerald-700" />
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="font-bold">Balance</span>
                            <span className={cn('font-mono font-bold', v.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>₹{Math.abs(v.balance).toLocaleString('en-IN')}{v.balance < 0 ? ' CR' : ''}</span>
                        </div>
                    </div>
                </Card>
                <div className="grid grid-cols-1 gap-2">
                    <Button onClick={() => setChargeOpen(true)} disabled={locked} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Add charge</Button>
                    <Button onClick={() => setPayOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><IndianRupee className="h-4 w-4 mr-1" /> Record payment</Button>
                </div>
                {locked && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Discharge initiated — charges are locked. Payments still allowed.</p>}
            </div>

            {/* Add charge */}
            <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add charge</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs font-semibold">Description</Label><Input value={charge.description} onChange={e => setCharge(c => ({ ...c, description: e.target.value }))} className="h-9 mt-1" /></div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-xs font-semibold">Category</Label>
                                <select value={charge.category} onChange={e => setCharge(c => ({ ...c, category: e.target.value }))} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    {['PROCEDURE', 'LAB', 'PHARMACY', 'CONSULT', 'BED', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><Label className="text-xs font-semibold">Qty</Label><Input type="number" value={charge.qty} onChange={e => setCharge(c => ({ ...c, qty: e.target.value }))} className="h-9 mt-1" /></div>
                            <div><Label className="text-xs font-semibold">Rate</Label><Input type="number" value={charge.rate} onChange={e => setCharge(c => ({ ...c, rate: e.target.value }))} className="h-9 mt-1" /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                            if (!charge.description.trim() || !charge.rate) { toast({ title: 'Description and rate required', variant: 'destructive' }); return; }
                            addCharge(admissionId, { description: charge.description.trim(), category: charge.category, qty: parseInt(charge.qty || '1', 10), rate: parseFloat(charge.rate) });
                            toast({ title: 'Charge added' });
                            setCharge({ description: '', category: 'PROCEDURE', qty: '1', rate: '' });
                            setChargeOpen(false);
                        }}>Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record payment */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs font-semibold">Amount</Label><Input type="number" value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} className="h-9 mt-1 font-mono text-lg" /></div>
                        <div><Label className="text-xs font-semibold">Mode</Label>
                            <select value={pay.mode} onChange={e => setPay(p => ({ ...p, mode: e.target.value }))} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                {['CASH', 'UPI', 'CARD', 'BANK'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                            const amt = parseFloat(pay.amount);
                            if (!amt || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
                            addPayment(admissionId, amt, pay.mode);
                            toast({ title: 'Payment recorded', description: `₹${amt.toLocaleString('en-IN')} · ${pay.mode}` });
                            setPay({ amount: '', mode: 'CASH' });
                            setPayOpen(false);
                        }}>Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ─── Small shared bits ──────────────────────────────────────────────────────────
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</h4>
        {children}
    </div>
);
const Field: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
    <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className={cn('text-sm text-slate-800 mt-0.5', mono && 'font-mono')}>{value}</dd></div>
);
const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{icon}{label}</div>
        <p className="text-base font-black text-slate-900 mt-0.5">{value}</p>
    </div>
);
const SoapLine: React.FC<{ letter: string; text: string }> = ({ letter, text }) => (
    <div className="flex gap-2"><span className="h-5 w-5 shrink-0 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">{letter}</span><p className="text-slate-700">{text || <span className="text-slate-300">—</span>}</p></div>
);
const Row: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
    <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className={cn('font-mono font-semibold', valueClass)}>{value}</span></div>
);

const num = (s: string) => s === '' ? undefined : Number(s);
