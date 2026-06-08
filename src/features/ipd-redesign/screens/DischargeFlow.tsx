import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LogOut, FileText, IndianRupee, Check, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIpdStore } from '../store';

interface Props {
    admissionId: string | null;
    onClose: () => void;
    onDischarged: () => void;
}

type Step = 'summary' | 'bill' | 'confirm';

export const DischargeFlow: React.FC<Props> = ({ admissionId, onClose, onDischarged }) => {
    const { toast } = useToast();
    const admissionView = useIpdStore(s => s.admissionView);
    const initiateDischarge = useIpdStore(s => s.initiateDischarge);
    const completeDischarge = useIpdStore(s => s.completeDischarge);
    const addPayment = useIpdStore(s => s.addPayment);

    const [step, setStep] = useState<Step>('summary');
    const [finalDiagnosis, setFinalDiagnosis] = useState('');
    const [conditionAtDischarge, setConditionAtDischarge] = useState('STABLE');
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [settleAmount, setSettleAmount] = useState('');

    const v = admissionId ? admissionView(admissionId) : undefined;

    useEffect(() => {
        if (admissionId && v) {
            setStep('summary');
            setFinalDiagnosis(v.finalDiagnosis ?? v.provisionalDiagnosis);
            setConditionAtDischarge('STABLE');
            setAdvice('');
            setFollowUp('');
            setSettleAmount(v.balance > 0 ? String(v.balance) : '');
        }
    }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!admissionId || !v) return null;

    const confirmDischarge = () => {
        const amt = parseFloat(settleAmount);
        if (amt && amt > 0) addPayment(admissionId, amt, 'CASH');
        initiateDischarge(admissionId, finalDiagnosis);
        completeDischarge(admissionId);
        toast({ title: 'Patient discharged', description: `${v.patient.name} · bed ${v.bed.bedCode} released for cleaning.` });
        onDischarged();
    };

    return (
        <Dialog open={!!admissionId} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-amber-600" /> Discharge — {v.patient.name}</DialogTitle>
                    <DialogDescription>{v.admissionNo} · {v.ward.wardName} · {v.bed.bedCode} · LOS {v.lengthOfStayDays}d</DialogDescription>
                </DialogHeader>

                {/* Stepper */}
                <div className="flex items-center gap-2 text-[11px] font-bold">
                    {(['summary', 'bill', 'confirm'] as Step[]).map((s, i) => (
                        <React.Fragment key={s}>
                            <span className={cn('px-2 py-1 rounded uppercase tracking-wider', step === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                                {i + 1}. {s === 'summary' ? 'Summary' : s === 'bill' ? 'Final Bill' : 'Confirm'}
                            </span>
                            {i < 2 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step 1 — Summary */}
                {step === 'summary' && (
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Final diagnosis</Label>
                            <Textarea rows={2} value={finalDiagnosis} onChange={e => setFinalDiagnosis(e.target.value)} className="text-sm mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Condition at discharge</Label>
                                <select value={conditionAtDischarge} onChange={e => setConditionAtDischarge(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    {['STABLE', 'IMPROVED', 'RECOVERED', 'REFERRED', 'LAMA', 'EXPIRED'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Follow-up date</Label>
                                <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Discharge advice</Label>
                            <Textarea rows={3} value={advice} onChange={e => setAdvice(e.target.value)} className="text-sm mt-1" placeholder="Medications, rest, diet, warning signs to return…" />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setStep('bill')} className="bg-brand-600 hover:bg-brand-700">Next: Final bill <ChevronRight className="h-4 w-4 ml-1" /></Button>
                        </div>
                    </div>
                )}

                {/* Step 2 — Bill */}
                {step === 'bill' && (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span>Final bill preview</span><FileText className="h-3.5 w-3.5" />
                            </div>
                            <div className="p-4 space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Total charges</span><span className="font-mono font-semibold">₹{v.totalCharges.toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Total received</span><span className="font-mono font-semibold text-emerald-700">₹{v.totalPaid.toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between pt-2 border-t border-slate-100 text-base">
                                    <span className="font-bold">{v.balance > 0 ? 'Net payable' : 'Refund due'}</span>
                                    <span className={cn('font-mono font-black', v.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>₹{Math.abs(v.balance).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                        {v.balance > 0 && (
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Settle now (cash)</Label>
                                <Input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} className="h-9 mt-1 w-48 font-mono" />
                                <p className="text-[11px] text-slate-500 mt-1">Pre-filled with the outstanding balance. Adjust if partial.</p>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep('summary')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                            <Button onClick={() => setStep('confirm')} className="bg-brand-600 hover:bg-brand-700">Next: Confirm <ChevronRight className="h-4 w-4 ml-1" /></Button>
                        </div>
                    </div>
                )}

                {/* Step 3 — Confirm */}
                {step === 'confirm' && (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-[12px] text-amber-800">
                                Confirming discharge will close this admission, release <b>bed {v.bed.bedCode}</b> for cleaning, and lock the bill.
                                {parseFloat(settleAmount) > 0 ? ` A payment of ₹${parseFloat(settleAmount).toLocaleString('en-IN')} will be recorded.` : ''}
                            </p>
                        </div>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Dx</dt><dd className="text-slate-800">{finalDiagnosis}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condition</dt><dd><Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{conditionAtDischarge}</Badge></dd></div>
                        </dl>
                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep('bill')}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                            <Button onClick={confirmDischarge} className="bg-amber-600 hover:bg-amber-700 font-semibold"><Check className="h-4 w-4 mr-2" /> Confirm Discharge</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
