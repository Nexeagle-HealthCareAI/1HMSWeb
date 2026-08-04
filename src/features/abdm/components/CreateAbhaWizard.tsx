import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileBadge2, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmEnrollResponse } from '../services/abdmApi';

type Step = 'consent' | 'aadhaar' | 'aadhaar-otp' | 'mobile-otp' | 'address' | 'success';

const STEP_LABELS: Record<Step, string> = {
  consent: 'Consent',
  aadhaar: 'Aadhaar number',
  'aadhaar-otp': 'Verify Aadhaar OTP',
  'mobile-otp': 'Verify mobile OTP',
  address: 'Choose ABHA address',
  success: 'Done',
};

// NHA-published consent declaration for Aadhaar-based ABHA creation (CRT_ABHA_102, mandatory for
// M1). Verify this against NHA's current officially published consent copy before go-live — exact
// wording is a compliance requirement, not just UX text.
const ABHA_CONSENT_TEXT = `I hereby declare that I am voluntarily sharing my Aadhaar number and demographic information issued by UIDAI, with the National Health Authority (NHA), for the sole purpose of creating an Ayushman Bharat Health Account (ABHA) number and ABHA Address. I understand that my Aadhaar number / Virtual ID and demographic information will be used only for this purpose and will not be used for any other purpose. This consent is given in accordance with the provisions of the Aadhaar Act, 2016 and the regulations made thereunder. I understand that my personally identifiable information (name, address, age, date of birth, gender, photograph, mobile number) may be shared with entities in the National Digital Health Ecosystem that I choose to interact with, only after my informed consent.`;

// Max 2 resends, each gated by a 60s cooldown (CRT_ABHA_106, mandatory for M1).
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 2;

interface Props {
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export const CreateAbhaWizard: React.FC<Props> = ({ hospitalId, open, onOpenChange, onDone }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('consent');
  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [enrollResult, setEnrollResult] = useState<AbdmEnrollResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chosenAddress, setChosenAddress] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [finalResult, setFinalResult] = useState<AbdmEnrollResponse | null>(null);

  // Resend-OTP: max 2 resends per OTP step, each gated by a 60s cooldown (CRT_ABHA_106).
  const [aadhaarResends, setAadhaarResends] = useState(0);
  const [aadhaarCooldown, setAadhaarCooldown] = useState(0);
  const [mobileResends, setMobileResends] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (setCooldown: React.Dispatch<React.SetStateAction<number>>) => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { if (cooldownTimer.current) clearInterval(cooldownTimer.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  const reset = () => {
    setStep('consent');
    setBusy(false);
    setConsentChecked(false);
    setAadhaar('');
    setAadhaarOtp('');
    setMobile('');
    setMobileOtp('');
    setTxnId('');
    setEnrollResult(null);
    setSuggestions([]);
    setChosenAddress('');
    setCustomAddress('');
    setFinalResult(null);
    setAadhaarResends(0);
    setAadhaarCooldown(0);
    setMobileResends(0);
    setMobileCooldown(0);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  const sendAadhaarOtp = async () => {
    const clean = aadhaar.replace(/\D/g, '');
    if (clean.length !== 12) { toast({ title: 'Enter a valid 12-digit Aadhaar number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.generateAadhaarOtp(hospitalId, clean);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      setAadhaarResends(0);
      startCooldown(setAadhaarCooldown);
      toast({ title: 'OTP sent', description: res.message || 'Check the Aadhaar-linked mobile number.' });
      setStep('aadhaar-otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const resendAadhaarOtp = async () => {
    if (aadhaarCooldown > 0 || aadhaarResends >= MAX_RESENDS) return;
    setBusy(true);
    try {
      const clean = aadhaar.replace(/\D/g, '');
      const res = await abdmApi.generateAadhaarOtp(hospitalId, clean);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      setAadhaarResends(n => n + 1);
      startCooldown(setAadhaarCooldown);
      toast({ title: 'OTP resent', description: res.message });
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyAadhaarOtp = async () => {
    const cleanOtp = aadhaarOtp.replace(/\D/g, '');
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanOtp.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    if (cleanMobile.length !== 10) { toast({ title: 'Enter a valid 10-digit mobile number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyAadhaarOtp(hospitalId, txnId, cleanOtp, cleanMobile);
      if (!res.success) { fail(res.message); return; }
      setEnrollResult(res);
      const nextTxnId = res.txnId || txnId;
      setTxnId(nextTxnId);
      if (res.mobileVerified) {
        await loadSuggestions(nextTxnId);
      } else {
        // The mobile just submitted didn't match the Aadhaar-linked one, so ABDM still needs it
        // OTP-verified separately — the number is already known, so go straight to sending that
        // OTP instead of asking for it again.
        await sendMobileOtp(nextTxnId, cleanMobile);
      }
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const sendMobileOtp = async (tx: string, cleanMobile: string) => {
    try {
      const res = await abdmApi.generateMobileOtp(hospitalId, tx, cleanMobile);
      if (!res.success) { fail(res.message); return; }
      // ABDM issues a fresh txnId for this OTP transaction, distinct from the Aadhaar-enrollment
      // one — must carry it forward or the next verify call will reference a stale transaction
      // (same pattern as verifyAadhaarOtp/verifyMobileOtp below).
      setTxnId(res.txnId || tx);
      setMobileResends(0);
      startCooldown(setMobileCooldown);
      toast({ title: 'OTP sent', description: res.message || 'Check the mobile number.' });
      setStep('mobile-otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    }
  };

  const resendMobileOtp = async () => {
    if (mobileCooldown > 0 || mobileResends >= MAX_RESENDS) return;
    setBusy(true);
    try {
      const clean = mobile.replace(/\D/g, '');
      const res = await abdmApi.generateMobileOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      setTxnId(res.txnId || txnId);
      setMobileResends(n => n + 1);
      startCooldown(setMobileCooldown);
      toast({ title: 'OTP resent', description: res.message });
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyMobileOtp = async () => {
    const clean = mobileOtp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyMobileOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      setEnrollResult(res);
      await loadSuggestions(res.txnId || txnId);
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const loadSuggestions = async (tx: string) => {
    setBusy(true);
    try {
      const res = await abdmApi.getAbhaAddressSuggestions(tx);
      if (res.success) setSuggestions(res.suggestions || []);
      setStep('address');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
      setStep('address');
    } finally {
      setBusy(false);
    }
  };

  const confirmAddress = async () => {
    const address = (chosenAddress === '__custom__' ? customAddress : chosenAddress).trim();
    if (!address) { toast({ title: 'Choose or enter an ABHA address', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.createAbhaAddress(hospitalId, txnId, address);
      if (!res.success) { fail(res.message); return; }
      setFinalResult(res);
      setStep('success');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const steps: Step[] = ['consent', 'aadhaar', 'aadhaar-otp', 'mobile-otp', 'address', 'success'];
  const stepIndex = steps.indexOf(step);

  const finishAndClose = () => {
    onDone();
    handleOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 sm:px-6 pt-5 pb-4 shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shadow-inner">
              <FileBadge2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold">Create ABHA</SheetTitle>
              <SheetDescription className="text-xs">{STEP_LABELS[step]}</SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 pt-1">
            {steps.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
        {step === 'consent' && (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground max-h-64 overflow-y-auto">
              {ABHA_CONSENT_TEXT}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="abha-consent" checked={consentChecked} onCheckedChange={v => setConsentChecked(v === true)} className="mt-0.5" />
              <label htmlFor="abha-consent" className="text-sm cursor-pointer">
                I have read and agree to the above consent for sharing my Aadhaar details and creating an ABHA number.
              </label>
            </div>
            <Button onClick={() => setStep('aadhaar')} disabled={!consentChecked} className="w-full">
              Continue
            </Button>
          </>
        )}

        {step === 'aadhaar' && (
          <>
            <div className="space-y-2">
              <Label>Aadhaar number</Label>
              <Input value={aadhaar} onChange={e => setAadhaar(e.target.value)} maxLength={12} inputMode="numeric" placeholder="12-digit Aadhaar number" />
            </div>
            <Button onClick={sendAadhaarOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send OTP
            </Button>
          </>
        )}

        {step === 'aadhaar-otp' && (
          <>
            <div className="space-y-2">
              <Label>Enter the OTP sent to the Aadhaar-linked mobile</Label>
              <Input value={aadhaarOtp} onChange={e => setAadhaarOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
            </div>
            <div className="space-y-2">
              <Label>Primary mobile number for this ABHA account</Label>
              <Input value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} inputMode="numeric" placeholder="10-digit mobile number" />
              <p className="text-xs text-muted-foreground">Can be the same as the Aadhaar-linked mobile, or a different one — ABDM verifies it either way.</p>
            </div>
            <Button onClick={verifyAadhaarOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
            {aadhaarResends < MAX_RESENDS && (
              <button
                type="button"
                onClick={resendAadhaarOtp}
                disabled={busy || aadhaarCooldown > 0}
                className="w-full text-center text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {aadhaarCooldown > 0 ? `Resend OTP in ${aadhaarCooldown}s` : `Resend OTP (${MAX_RESENDS - aadhaarResends} left)`}
              </button>
            )}
          </>
        )}

        {step === 'mobile-otp' && (
          <>
            <div className="space-y-2">
              <Label>Enter the OTP sent to {mobile}</Label>
              <Input value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
            </div>
            <Button onClick={verifyMobileOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
            {mobileResends < MAX_RESENDS && (
              <button
                type="button"
                onClick={resendMobileOtp}
                disabled={busy || mobileCooldown > 0}
                className="w-full text-center text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {mobileCooldown > 0 ? `Resend OTP in ${mobileCooldown}s` : `Resend OTP (${MAX_RESENDS - mobileResends} left)`}
              </button>
            )}
          </>
        )}

        {step === 'address' && (
          <>
            <Label>Choose an ABHA address</Label>
            <RadioGroup value={chosenAddress} onValueChange={setChosenAddress} className="space-y-2">
              {suggestions.map(s => (
                <div key={s} className="flex items-center gap-2 border rounded-md p-2">
                  <RadioGroupItem value={s} id={s} />
                  <label htmlFor={s} className="text-sm cursor-pointer">{s}@abdm</label>
                </div>
              ))}
              <div className="flex items-center gap-2 border rounded-md p-2">
                <RadioGroupItem value="__custom__" id="__custom__" />
                <Input
                  value={customAddress}
                  onChange={e => { setCustomAddress(e.target.value); setChosenAddress('__custom__'); }}
                  placeholder="Type a custom ABHA address"
                  className="border-0 h-8 p-0 focus-visible:ring-0"
                />
              </div>
            </RadioGroup>
            <Button onClick={confirmAddress} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create ABHA address
            </Button>
          </>
        )}

        {step === 'success' && finalResult && (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <p className="font-semibold">ABHA created</p>
            <p className="text-sm text-muted-foreground">{finalResult.fullName}</p>
            <p className="text-sm">ABHA number: <span className="font-mono">{finalResult.abhaNumber}</span></p>
            {finalResult.abhaAddress && <p className="text-sm">ABHA address: <span className="font-mono">{finalResult.abhaAddress}</span></p>}
            <Button onClick={finishAndClose} className="w-full">Done</Button>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
