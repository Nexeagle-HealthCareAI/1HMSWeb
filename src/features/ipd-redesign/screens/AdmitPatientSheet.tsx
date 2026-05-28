import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserPlus, Search, BedDouble, Stethoscope, IndianRupee, Check, X, Siren, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIpdStore } from '../store';
import type { AdmissionType, IcdCode } from '../types';

const DOCTORS = ['Dr. Mehta', 'Dr. Rao', 'Dr. Kapoor', 'Dr. Iyer', 'Dr. Khan'];

const ADMISSION_TYPES: { value: AdmissionType; label: string; tone: string }[] = [
    { value: 'EMERGENCY', label: 'Emergency', tone: 'border-rose-300 bg-rose-50 text-rose-700' },
    { value: 'ELECTIVE', label: 'Elective', tone: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
    { value: 'DAY_CARE', label: 'Day Care', tone: 'border-sky-300 bg-sky-50 text-sky-700' },
    { value: 'LAMA', label: 'LAMA', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
];

const ROOM_TYPE_LABEL: Record<string, string> = {
    SINGLE_AC: 'Single AC', SINGLE_NONAC: 'Single Non-AC', TWIN_SHARING: 'Twin Sharing',
    GENERAL_HALL: 'General Hall', DELUXE: 'Deluxe', SUITE: 'Suite', ICU_BAY: 'ICU Bay',
};

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onAdmitted: (admissionId: string) => void;
}

export const AdmitPatientSheet: React.FC<Props> = ({ open, onOpenChange, onAdmitted }) => {
    const { toast } = useToast();
    const patients = useIpdStore(s => s.patients);
    const wards = useIpdStore(s => s.wards);
    const rooms = useIpdStore(s => s.rooms);
    const beds = useIpdStore(s => s.beds);
    const admissions = useIpdStore(s => s.admissions);
    const icdCatalog = useIpdStore(s => s.icdCatalog);
    const beneficiaries = useIpdStore(s => s.beneficiaries);
    const admitPatient = useIpdStore(s => s.admitPatient);
    const upsertBeneficiary = useIpdStore(s => s.upsertBeneficiary);

    const [admissionType, setAdmissionType] = useState<AdmissionType>('EMERGENCY');
    const [patientSearch, setPatientSearch] = useState('');
    const [patientId, setPatientId] = useState<string | null>(null);
    const [wardId, setWardId] = useState('');
    const [roomId, setRoomId] = useState('');
    const [bedId, setBedId] = useState('');
    const [doctor, setDoctor] = useState('');
    const [icdQuery, setIcdQuery] = useState('');
    const [icd, setIcd] = useState<IcdCode | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [consent, setConsent] = useState(false);
    const [deposit, setDeposit] = useState(0);
    const [isMlc, setIsMlc] = useState(false);
    const [beneficiaryId, setBeneficiaryId] = useState('');
    // Inline new-referrer capture (when beneficiaryId === '__new__')
    const [newRefName, setNewRefName] = useState('');
    const [newRefPhone, setNewRefPhone] = useState('');
    const [newRefAddress, setNewRefAddress] = useState('');
    const [newRefRate, setNewRefRate] = useState(10);

    const admittedPatientIds = new Set(admissions.filter(a => a.status === 'ADMITTED' || a.status === 'DISCHARGE_INITIATED').map(a => a.patientId));
    const candidatePatients = useMemo(() => {
        const q = patientSearch.trim().toLowerCase();
        return patients.filter(p => !admittedPatientIds.has(p.patientId))
            .filter(p => !q || p.name.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q) || p.mobile.includes(q));
    }, [patients, patientSearch, admittedPatientIds]);

    const icdMatches = useMemo(() => {
        const q = icdQuery.trim().toLowerCase();
        if (q.length < 2) return [];
        return icdCatalog.filter(c => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)).slice(0, 6);
    }, [icdQuery, icdCatalog]);

    const selectedPatient = patients.find(p => p.patientId === patientId);
    const wardRooms = rooms.filter(r => r.wardId === wardId);
    const roomBeds = beds.filter(b => b.roomId === roomId && b.status === 'AVAILABLE');
    const selectedRoom = rooms.find(r => r.roomId === roomId);

    const reset = () => {
        setAdmissionType('EMERGENCY'); setPatientSearch(''); setPatientId(null);
        setWardId(''); setRoomId(''); setBedId(''); setDoctor('');
        setIcdQuery(''); setIcd(null); setDiagnosis(''); setConsent(false); setDeposit(0); setIsMlc(false);
        setBeneficiaryId('');
        setNewRefName(''); setNewRefPhone(''); setNewRefAddress(''); setNewRefRate(10);
    };

    const creatingNewRef = beneficiaryId === '__new__';
    const canSubmit = patientId && wardId && roomId && bedId && doctor && diagnosis.trim() && consent
        && (!creatingNewRef || newRefName.trim());

    const submit = () => {
        if (!canSubmit) {
            toast({ title: 'Incomplete', description: 'Patient, bed, doctor, diagnosis and consent are all required.', variant: 'destructive' });
            return;
        }
        // Inline-create the referrer in the Referee master, then attach to this admission.
        let resolvedBeneficiaryId = beneficiaryId || undefined;
        if (creatingNewRef) {
            resolvedBeneficiaryId = upsertBeneficiary({
                name: newRefName.trim(), type: 'REFERRER',
                phone: newRefPhone.trim() || undefined, address: newRefAddress.trim() || undefined,
                defaultRatePercent: newRefRate, isActive: true,
            });
        }
        const id = admitPatient({
            patientId: patientId!, wardId, roomId, bedId, admissionType, attendingDoctor: doctor,
            provisionalDiagnosis: diagnosis.trim(), icd: icd ?? undefined, consentCaptured: consent,
            depositPaid: deposit, estimatedDailyCost: selectedRoom?.dailyTariff ?? 0, isMlc,
            beneficiaryId: resolvedBeneficiaryId,
        });
        toast({ title: 'Patient admitted', description: `${selectedPatient?.name} → ${beds.find(b => b.bedId === bedId)?.bedCode}` });
        reset();
        onAdmitted(id);
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center"><UserPlus className="h-5 w-5 text-white" /></div>
                        <div>
                            <SheetTitle className="text-base font-bold">Admit Patient</SheetTitle>
                            <SheetDescription className="text-xs">Type → patient → bed → clinical → consent → deposit.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Admission type */}
                    <section className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Admission Type</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {ADMISSION_TYPES.map(t => (
                                <button key={t.value} type="button" onClick={() => setAdmissionType(t.value)}
                                    className={cn('rounded-lg border-2 py-2 text-xs font-bold transition-all',
                                        admissionType === t.value ? t.tone : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Patient */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Search className="h-3 w-3" /> Patient</h4>
                        {!selectedPatient ? (
                            <>
                                <Input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search by name, UHID or mobile…" className="h-9" />
                                <div className="border border-slate-200 rounded-lg max-h-48 overflow-auto">
                                    {candidatePatients.map(p => (
                                        <button key={p.patientId} type="button" onClick={() => setPatientId(p.patientId)} className="w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-indigo-50/50 text-sm">
                                            <p className="font-semibold text-slate-900">{p.name}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">{p.uhid} · {p.age}{p.sex} · {p.mobile}{p.bloodGroup ? ` · ${p.bloodGroup}` : ''}</p>
                                        </button>
                                    ))}
                                    {candidatePatients.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">No matching un-admitted patient.</p>}
                                </div>
                            </>
                        ) : (
                            <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900">{selectedPatient.name}</p>
                                    <p className="text-[11px] text-slate-600 font-mono">{selectedPatient.uhid} · {selectedPatient.age}{selectedPatient.sex} · {selectedPatient.bloodGroup}</p>
                                    {selectedPatient.allergies?.length ? <p className="text-[11px] text-rose-600 font-semibold mt-0.5">⚠ Allergies: {selectedPatient.allergies.join(', ')}</p> : null}
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setPatientId(null)} className="h-7 text-xs"><X className="h-3 w-3 mr-1" /> Change</Button>
                            </div>
                        )}
                    </section>

                    {/* Ward → Room → Bed */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><BedDouble className="h-3 w-3" /> Ward → Room → Bed</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Ward</Label>
                                <select value={wardId} onChange={e => { setWardId(e.target.value); setRoomId(''); setBedId(''); }} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    <option value="">Select…</option>
                                    {wards.map(w => <option key={w.wardId} value={w.wardId}>{w.wardName}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Room</Label>
                                <select value={roomId} onChange={e => { setRoomId(e.target.value); setBedId(''); }} disabled={!wardId} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white disabled:opacity-50">
                                    <option value="">{wardId ? 'Select…' : 'Pick ward'}</option>
                                    {wardRooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomCode} · {ROOM_TYPE_LABEL[r.roomType]} (₹{r.dailyTariff})</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Bed</Label>
                                <select value={bedId} onChange={e => setBedId(e.target.value)} disabled={!roomId} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white disabled:opacity-50">
                                    <option value="">{roomId ? (roomBeds.length ? 'Select…' : 'No free beds') : 'Pick room'}</option>
                                    {roomBeds.map(b => <option key={b.bedId} value={b.bedId}>{b.bedCode}</option>)}
                                </select>
                            </div>
                        </div>
                        {selectedRoom && <p className="text-[11px] text-slate-500">Room tariff ₹{selectedRoom.dailyTariff.toLocaleString('en-IN')}/day{selectedRoom.dailyTariff > 5000 ? ' · note: rooms > ₹5,000/day attract 5% GST' : ''}.</p>}
                    </section>

                    {/* Clinical */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Stethoscope className="h-3 w-3" /> Clinical</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Attending doctor</Label>
                                <select value={doctor} onChange={e => setDoctor(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    <option value="">Select…</option>
                                    {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 h-9">
                                    <input type="checkbox" checked={isMlc} onChange={e => setIsMlc(e.target.checked)} /> <Siren className="h-3.5 w-3.5 text-rose-500" /> Medico-legal (MLC)
                                </label>
                            </div>
                        </div>
                        {/* ICD-10 picker */}
                        <div className="relative">
                            <Label className="text-xs font-semibold text-slate-700">Provisional diagnosis (ICD-10 — type 2+ chars)</Label>
                            {icd ? (
                                <div className="h-9 mt-1 px-2 flex items-center justify-between border border-indigo-200 bg-indigo-50/40 rounded-md text-sm">
                                    <span><span className="font-mono font-bold text-indigo-700">{icd.code}</span> · {icd.label}</span>
                                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setIcd(null); setIcdQuery(''); }}>change</Button>
                                </div>
                            ) : (
                                <>
                                    <Input value={icdQuery} onChange={e => { setIcdQuery(e.target.value); if (!diagnosis) setDiagnosis(e.target.value); }} placeholder="e.g. pneumonia, J18, sepsis…" className="h-9 mt-1" />
                                    {icdMatches.length > 0 && (
                                        <div className="absolute z-10 left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-48 overflow-auto">
                                            {icdMatches.map(c => (
                                                <button key={c.code} type="button" onClick={() => { setIcd(c); setDiagnosis(c.label); }} className="w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-indigo-50/50 text-sm">
                                                    <span className="font-mono font-bold text-indigo-700">{c.code}</span> · {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Diagnosis note</Label>
                            <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Free-text diagnosis / chief complaint" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Referred by (earns referral incentive)</Label>
                            <select value={beneficiaryId} onChange={e => setBeneficiaryId(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                <option value="">— None / not referred —</option>
                                {beneficiaries.filter(b => b.isActive).map(b => (
                                    <option key={b.beneficiaryId} value={b.beneficiaryId}>{b.name} · {b.type}{b.defaultRatePercent > 0 ? ` · ${b.defaultRatePercent}%` : ''}</option>
                                ))}
                                <option value="__new__">+ New referrer…</option>
                            </select>
                            {creatingNewRef && (
                                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-3">
                                    <div className="col-span-2">
                                        <Label className="text-[11px] font-semibold text-slate-700">Referrer name <span className="text-rose-500">*</span></Label>
                                        <Input value={newRefName} onChange={e => setNewRefName(e.target.value)} placeholder="Dr. / clinic / agent name" className="h-8 mt-1 text-sm" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-700">Contact number</Label>
                                        <Input value={newRefPhone} onChange={e => setNewRefPhone(e.target.value)} placeholder="Mobile" className="h-8 mt-1 text-sm font-mono" />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-700">Incentive %</Label>
                                        <Input type="number" min={0} max={100} value={newRefRate} onChange={e => setNewRefRate(parseInt(e.target.value || '0', 10))} className="h-8 mt-1 text-sm font-mono" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-[11px] font-semibold text-slate-700">Address</Label>
                                        <Input value={newRefAddress} onChange={e => setNewRefAddress(e.target.value)} placeholder="City / clinic address" className="h-8 mt-1 text-sm" />
                                    </div>
                                    <p className="col-span-2 text-[11px] text-slate-500">Saved to the referrer master so future visits can reuse this contact.</p>
                                </div>
                            )}
                            <p className="text-[11px] text-slate-500 mt-1">Incentive accrues on commissionable charges (consult/lab/procedure) when payment is received.</p>
                        </div>
                    </section>

                    {/* Consent */}
                    <section className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><FileSignature className="h-3 w-3" /> Consent</h4>
                        <label className={cn('flex items-start gap-2 rounded-lg border-2 p-3 cursor-pointer', consent ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200')}>
                            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
                            <span className="text-xs text-slate-700">General admission consent obtained from patient / guardian (wet signature scanned or e-signed). <span className="text-rose-500 font-semibold">Required to admit.</span></span>
                        </label>
                    </section>

                    {/* Deposit */}
                    <section className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> Advance Deposit</h4>
                        <div className="flex items-center gap-2">
                            <Input type="number" min={0} step={500} value={deposit} onChange={e => setDeposit(parseInt(e.target.value || '0', 10))} className="h-9 w-40 font-mono" />
                            <div className="flex gap-1.5">
                                {[5000, 10000, 25000].map(amt => <Button key={amt} type="button" size="sm" variant="outline" className="h-9 text-xs" onClick={() => setDeposit(amt)}>₹{amt.toLocaleString('en-IN')}</Button>)}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => { reset(); onOpenChange(false); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                    <div className="flex-1" />
                    {selectedPatient && bedId && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50">{selectedPatient.name} → {beds.find(b => b.bedId === bedId)?.bedCode}</Badge>
                    )}
                    <Button onClick={submit} disabled={!canSubmit} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold"><Check className="h-4 w-4 mr-2" /> Admit</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
