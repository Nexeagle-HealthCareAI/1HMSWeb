import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Zap, BedDouble, Stethoscope, Save, X, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIpdStore } from '../store';

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}

export const AutoBillingConfig: React.FC<Props> = ({ open, onOpenChange }) => {
    const { toast } = useToast();
    const policy = useIpdStore(s => s.policy);
    const setPolicy = useIpdStore(s => s.setPolicy);

    const [autoConsult, setAutoConsult] = useState(policy.autoConsultFeeOnAdmission);
    const [autoBed, setAutoBed] = useState(policy.autoDailyBedCharge);
    const [fees, setFees] = useState<Record<string, number>>({ ...policy.doctorConsultFees });

    useEffect(() => {
        if (open) {
            setAutoConsult(policy.autoConsultFeeOnAdmission);
            setAutoBed(policy.autoDailyBedCharge);
            setFees({ ...policy.doctorConsultFees });
        }
    }, [open, policy]);

    const save = () => {
        setPolicy({ autoConsultFeeOnAdmission: autoConsult, autoDailyBedCharge: autoBed, doctorConsultFees: fees });
        toast({ title: 'Auto-billing policy saved', description: `Consult fee: ${autoConsult ? 'ON' : 'OFF'} · Daily bed charge: ${autoBed ? 'ON' : 'OFF'}` });
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center"><Zap className="h-5 w-5 text-white" /></div>
                        <div>
                            <SheetTitle className="text-base font-bold">Auto-Billing Policy</SheetTitle>
                            <SheetDescription className="text-xs">Decide which charges post automatically, with no manual entry.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Consult fee */}
                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <Stethoscope className="h-5 w-5 text-teal-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm text-slate-900">Consultation fee on admission</p>
                                    <p className="text-xs text-slate-500 mt-0.5">When a patient is admitted, auto-post the admitting consultant's fee. Source: per-doctor fee below.</p>
                                </div>
                            </div>
                            <Switch checked={autoConsult} onCheckedChange={setAutoConsult} className="data-[state=checked]:bg-teal-600" />
                        </div>
                        {autoConsult && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Per-doctor consult fee (₹)</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(fees).map(doc => (
                                        <div key={doc} className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600 flex-1 truncate">{doc}</span>
                                            <Input type="number" value={fees[doc]} onChange={e => setFees(f => ({ ...f, [doc]: parseInt(e.target.value || '0', 10) }))} className="h-8 w-24 font-mono text-xs" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bed charge */}
                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <BedDouble className="h-5 w-5 text-brand-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm text-slate-900">Daily bed charge (nightly)</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Post one bed charge per active admission each night. Source: room tariff (falls back to ward rate). Idempotent — never double-posts for the same day.</p>
                                </div>
                            </div>
                            <Switch checked={autoBed} onCheckedChange={setAutoBed} className="data-[state=checked]:bg-brand-600" />
                        </div>
                    </div>

                    {/* Explainer */}
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-sky-800">
                            In the real system these map to the Billing Policy "integration triggers" (<code>opdConsultTrigger</code>, <code>ipdBedChargeMode</code>).
                            Auto-posted charges are tagged <Badge variant="outline" className="text-[11px] font-bold bg-white">AUTO</Badge> in the ledger so staff can tell them apart from manual entries.
                        </p>
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                    <div className="flex-1" />
                    <Button onClick={save} className="h-10 px-5 bg-amber-500 hover:bg-amber-600 font-semibold"><Save className="h-4 w-4 mr-2" /> Save policy</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
