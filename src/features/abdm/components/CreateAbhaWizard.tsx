import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { FileBadge2, Loader2, CheckCircle2, Download, Eye, AlertTriangle, Check, X } from 'lucide-react';
import { AbhaRegisterPatient } from './AbhaRegisterPatient';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmEnrollResponse } from '../services/abdmApi';
import { INVALID_AADHAAR, MAX_RESENDS_MESSAGE, abhaAddressRules, isValidAadhaar, onlyDigits } from '../utils/aadhaar';

type Step = 'consent' | 'aadhaar' | 'aadhaar-otp' | 'mobile-otp' | 'existing' | 'address' | 'success';

const STEP_LABELS: Record<Step, string> = {
  consent: 'Consent',
  aadhaar: 'Aadhaar number',
  'aadhaar-otp': 'Verify Aadhaar OTP',
  'mobile-otp': 'Verify mobile OTP',
  existing: 'ABHA already exists',
  address: 'Choose ABHA address',
  success: 'Done',
};

// Max 2 resends, each gated by a 60s cooldown (CRT_ABHA_106, mandatory for M1).
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 2;

interface Props {
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  // Fired with the new (or already existing) ABHA when staff close the success step.
  onCreated?: (result: AbdmEnrollResponse) => void;
  // On the ABDM page the last step registers the patient (CRT_ABHA_116, tagging). Inside a form that
  // is itself a registration form, the result goes back to that form instead.
  registerHere?: boolean;
  // An Aadhaar already typed on another screen (VRFY_ABHA_403): creation never asks for it again.
  initialAadhaar?: string;
}

export const CreateAbhaWizard: React.FC<Props> = ({ hospitalId, open, onOpenChange, onDone, onCreated, registerHere = false, initialAadhaar }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('consent');
  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  // The wording comes from the server (it owns the text and the version); consent is recorded server-side before any OTP is requested.
  const [consentText, setConsentText] = useState<{ version: string; text: string } | null>(null);
  const [consentGivenBy, setConsentGivenBy] = useState<'PATIENT' | 'GUARDIAN'>('PATIENT');
  const [consentSubject, setConsentSubject] = useState('');
  const [consentId, setConsentId] = useState('');

  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [enrollResult, setEnrollResult] = useState<AbdmEnrollResponse | null>(null);
  // "@sbx" on the sandbox, "@abdm" on live: the server says which.
  const [addressSuffix, setAddressSuffix] = useState('@abdm');
  // The ABHA card, shown on the last screen (M1: the card is offered once the ABHA is created).
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chosenAddress, setChosenAddress] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [finalResult, setFinalResult] = useState<AbdmEnrollResponse | null>(null);
  // "ABHA address already exists." from ABDM: go on with the existing one or type a new one (CRT_ABHA_112).
  const [addressTaken, setAddressTaken] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resendLimitHit, setResendLimitHit] = useState(false);

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
    setConsentId('');
    setConsentGivenBy('PATIENT');
    setConsentSubject('');
    setAadhaar('');
    setAadhaarOtp('');
    setMobile('');
    setMobileOtp('');
    setTxnId('');
    setEnrollResult(null);
    setAddressSuffix('@abdm');
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardBlob(null);
    setCardUrl(null);
    setSuggestions([]);
    setChosenAddress('');
    setCustomAddress('');
    setFinalResult(null);
    setAddressTaken('');
    setSentTo('');
    setResendLimitHit(false);
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

  // Load the wording the server will hold the consent against.
  useEffect(() => {
    if (!open || consentText) return;
    abdmApi.getConsentText()
      .then(res => setConsentText({ version: res.version, text: res.text }))
      .catch(() => toast({ title: 'Could not load the consent wording', description: 'Check your connection and reopen this window.', variant: 'destructive' }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordConsentAndContinue = async () => {
    if (!consentText) return;
    setBusy(true);
    try {
      const res = await abdmApi.recordConsent(hospitalId, consentText.version, consentGivenBy, consentSubject.trim() || undefined);
      if (!res.success || !res.consentId) { fail(res.message); return; }
      setConsentId(res.consentId);
      const carried = (initialAadhaar ?? '').replace(/\D/g, '');
      if (carried.length === 12 && isValidAadhaar(carried)) {
        // Typed already on the login screen: send the OTP for it straight away.
        setAadhaar(carried);
        await sendAadhaarOtp(carried, res.consentId);
      } else {
        setStep('aadhaar');
      }
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  const sendAadhaarOtp = async (typed?: string, consent?: string) => {
    const clean = (typed ?? aadhaar).replace(/\D/g, '');
    if (clean.length !== 12) { toast({ title: 'Enter a valid 12-digit Aadhaar number', variant: 'destructive' }); return; }
    // The check digit too: a mistyped number never reaches ABDM (CRT_ABHA_104).
    if (!isValidAadhaar(clean)) { toast({ title: INVALID_AADHAAR, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.generateAadhaarOtp(hospitalId, clean, consent ?? consentId);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      setSentTo(res.message || '');
      setResendLimitHit(false);
      setAadhaarResends(0);
      startCooldown(setAadhaarCooldown);
      toast({ title: 'OTP sent', description: res.message || 'Check the Aadhaar-linked mobile number.' });
      setStep('aadhaar-otp');
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const resendAadhaarOtp = async () => {
    // A third attempt calls nothing and says why (CRT_ABHA_106).
    if (aadhaarResends >= MAX_RESENDS) { setResendLimitHit(true); return; }
    if (aadhaarCooldown > 0) return;
    setBusy(true);
    try {
      const clean = aadhaar.replace(/\D/g, '');
      // A resend, not a new request: the server asks ABDM again under the same transaction (CRT_ABHA_106).
      const res = await abdmApi.generateAadhaarOtp(hospitalId, clean, consentId, true);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      setAadhaarResends(n => n + 1);
      startCooldown(setAadhaarCooldown);
      toast({ title: 'OTP resent', description: res.message });
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyAadhaarOtp = async (otpOverride?: string) => {
    // input-otp's onComplete fires within the same update as its onChange, before this
    // component's own aadhaarOtp state has re-rendered — reading the completed value from the
    // callback argument (rather than the still-stale aadhaarOtp closure) avoids a spurious
    // "Enter the 6-digit OTP" toast on auto-verify.
    const cleanOtp = (otpOverride ?? aadhaarOtp).replace(/\D/g, '');
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
        await afterIdentityVerified(res, nextTxnId);
      } else {
        // The mobile just submitted didn't match the Aadhaar-linked one, so ABDM still needs it
        // OTP-verified separately — the number is already known, so go straight to sending that
        // OTP instead of asking for it again.
        await sendMobileOtp(nextTxnId, cleanMobile);
      }
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
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
      setSentTo(res.message || '');
      setResendLimitHit(false);
      setMobileResends(0);
      startCooldown(setMobileCooldown);
      toast({ title: 'OTP sent', description: res.message || 'Check the mobile number.' });
      setStep('mobile-otp');
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    }
  };

  const resendMobileOtp = async () => {
    if (mobileResends >= MAX_RESENDS) { setResendLimitHit(true); return; }
    if (mobileCooldown > 0) return;
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
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyMobileOtp = async (otpOverride?: string) => {
    const clean = (otpOverride ?? mobileOtp).replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyMobileOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      // Keep what the Aadhaar step returned (address, photo, the existing-ABHA flag) and add the verified mobile.
      const merged = { ...(enrollResult ?? {}), ...Object.fromEntries(Object.entries(res).filter(([, v]) => v !== undefined && v !== null && v !== '')) } as AbdmEnrollResponse;
      merged.isNew = enrollResult?.isNew ?? res.isNew;
      setEnrollResult(merged);
      await afterIdentityVerified(merged, res.txnId || txnId);
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  // An Aadhaar that already holds an ABHA is not a stop: show it, and let the person go on with it
  // or add a new ABHA address to it (CRT_ABHA_112, 113, 114).
  const afterIdentityVerified = async (res: AbdmEnrollResponse, tx: string) => {
    if (res.isNew === false) { setTxnId(tx); setStep('existing'); return; }
    await loadSuggestions(tx);
  };

  const proceedWithExisting = () => {
    if (!enrollResult) return;
    setFinalResult({ ...enrollResult, txnId: enrollResult.txnId || txnId });
    setStep('success');
  };

  const loadSuggestions = async (tx: string) => {
    setBusy(true);
    try {
      const res = await abdmApi.getAbhaAddressSuggestions(tx, hospitalId);
      if (res.success) {
        const list = res.suggestions || [];
        setSuggestions(list);
        if (res.addressSuffix) setAddressSuffix(res.addressSuffix);
        // Pre-select the first suggestion so "Create ABHA address" works immediately without
        // forcing an extra click when the user is happy with a suggested one.
        if (list.length > 0) setChosenAddress(list[0]);
      } else {
        fail(res.message || 'Could not load ABHA address suggestions — type one manually below.');
      }
      setStep('address');
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
      setStep('address');
    } finally {
      setBusy(false);
    }
  };

  const confirmAddress = async () => {
    const custom = chosenAddress === '__custom__';
    const address = (custom ? customAddress : chosenAddress).trim().replace(/@(sbx|abdm)$/i, '');
    if (!address) { toast({ title: 'Choose or enter an ABHA address', variant: 'destructive' }); return; }
    if (custom && !abhaAddressRules(address, addressSuffix).every(r => r.met)) {
      toast({ title: 'The ABHA address does not meet the rules shown', variant: 'destructive' }); return;
    }
    setAddressTaken('');
    setBusy(true);
    try {
      const res = await abdmApi.createAbhaAddress(hospitalId, txnId, address);
      if (!res.success) { fail(res.message); return; }
      // The Aadhaar step's profile (address, photo) with the new address and the proof to register.
      setFinalResult({ ...(enrollResult ?? {}), ...Object.fromEntries(Object.entries(res).filter(([, v]) => v !== undefined && v !== null && v !== '')) } as AbdmEnrollResponse);
      setStep('success');
    } catch (e: any) {
      const message = (e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message || '';
      if (/exist/i.test(message)) setAddressTaken(`${address}${addressSuffix}`);
      else fail(message);
    } finally {
      setBusy(false);
    }
  };

  const loadCard = async (): Promise<Blob | null> => {
    if (cardBlob) return cardBlob;
    setCardBusy(true);
    try {
      const blob = await abdmApi.getAbhaCardBlob(hospitalId, finalResult?.txnId || txnId);
      setCardBlob(blob);
      setCardUrl(URL.createObjectURL(blob));
      return blob;
    } catch (e) {
      const err = e as { response?: { data?: { Message?: string; message?: string } }; message?: string };
      fail((err?.response?.data?.Message ?? err?.response?.data?.message) || err?.message || 'Could not fetch the ABHA card.');
      return null;
    } finally {
      setCardBusy(false);
    }
  };

  const downloadCard = async () => {
    const blob = await loadCard();
    if (blob) abdmApi.downloadBlob(blob, `ABHA-Card-${finalResult?.abhaNumber ?? 'new'}`);
  };

  const steps: Step[] = ['consent', 'aadhaar', 'aadhaar-otp', 'mobile-otp', 'existing', 'address', 'success'];
  const stepIndex = steps.indexOf(step);

  const finishAndClose = () => {
    if (finalResult?.abhaNumber) onCreated?.(finalResult);
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
              {consentText ? consentText.text : 'Loading the consent wording...'}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Consent given by</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="consent-given-by" checked={consentGivenBy === 'PATIENT'} onChange={() => setConsentGivenBy('PATIENT')} /> Patient
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="consent-given-by" checked={consentGivenBy === 'GUARDIAN'} onChange={() => setConsentGivenBy('GUARDIAN')} /> Guardian
              </label>
            </div>
            <Input value={consentSubject} onChange={e => setConsentSubject(e.target.value)} placeholder="Name of the person giving consent (optional)" maxLength={200} />
            <div className="flex items-start gap-2">
              <Checkbox id="abha-consent" checked={consentChecked} onCheckedChange={v => setConsentChecked(v === true)} className="mt-0.5" />
              <label htmlFor="abha-consent" className="text-sm cursor-pointer">
                I have read and agree to the above consent for sharing my Aadhaar details and creating an ABHA number.
              </label>
            </div>
            <Button onClick={recordConsentAndContinue} disabled={!consentChecked || !consentText || busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Continue
            </Button>
          </>
        )}

        {step === 'aadhaar' && (
          <>
            <div className="space-y-2">
              <Label>Aadhaar number</Label>
              <InputOTP maxLength={12} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" value={aadhaar} onChange={setAadhaar} containerClassName="justify-center flex-wrap gap-y-2">
                <InputOTPGroup>
                  {[0, 1, 2, 3].map(i => <InputOTPSlot key={i} index={i} masked={aadhaar.length === 12} className="h-9 w-7 text-sm sm:h-10 sm:w-8" />)}
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  {[4, 5, 6, 7].map(i => <InputOTPSlot key={i} index={i} masked={aadhaar.length === 12} className="h-9 w-7 text-sm sm:h-10 sm:w-8" />)}
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  {[8, 9, 10, 11].map(i => <InputOTPSlot key={i} index={i} className="h-9 w-7 text-sm sm:h-10 sm:w-8" />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {aadhaar.length === 12 && <p className="text-xs text-center text-muted-foreground">The Aadhaar number is masked once entered. Retype it to change it.</p>}
            <Button onClick={() => sendAadhaarOtp()} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send OTP
            </Button>
          </>
        )}

        {step === 'aadhaar-otp' && (
          <>
            {sentTo && <p className="text-sm rounded-lg bg-muted/40 p-2.5">{sentTo}</p>}
            <div className="space-y-2">
              <Label>Primary mobile number for this ABHA account</Label>
              <Input value={mobile} onChange={e => setMobile(onlyDigits(e.target.value, 10))} maxLength={10} inputMode="numeric" placeholder="10-digit mobile number" />
              <p className="text-xs text-muted-foreground">Can be the same as the Aadhaar-linked mobile, or a different one — ABDM verifies it either way.</p>
            </div>
            <div className="space-y-2">
              <Label>Enter the OTP sent to the Aadhaar-linked mobile</Label>
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                value={aadhaarOtp}
                onChange={setAadhaarOtp}
                containerClassName="justify-center"
                onComplete={value => { if (mobile.replace(/\D/g, '').length === 10) verifyAadhaarOtp(value); }}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={() => verifyAadhaarOtp()} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
            <button
              type="button"
              onClick={resendAadhaarOtp}
              disabled={busy || (aadhaarCooldown > 0 && aadhaarResends < MAX_RESENDS)}
              className="w-full text-center text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {aadhaarCooldown > 0 && aadhaarResends < MAX_RESENDS ? `Resend OTP in ${aadhaarCooldown}s` : `Resend OTP (${Math.max(0, MAX_RESENDS - aadhaarResends)} left)`}
            </button>
            {resendLimitHit && <p className="text-xs text-center text-red-700" role="alert">{MAX_RESENDS_MESSAGE}</p>}
          </>
        )}

        {step === 'mobile-otp' && (
          <>
            <div className="space-y-2">
              {sentTo && <p className="text-sm rounded-lg bg-muted/40 p-2.5">{sentTo}</p>}
              <Label>Enter the OTP sent to the mobile ending {mobile.slice(-4)}</Label>
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" value={mobileOtp} onChange={setMobileOtp} containerClassName="justify-center" onComplete={value => verifyMobileOtp(value)}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={() => verifyMobileOtp()} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
            <button
              type="button"
              onClick={resendMobileOtp}
              disabled={busy || (mobileCooldown > 0 && mobileResends < MAX_RESENDS)}
              className="w-full text-center text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {mobileCooldown > 0 && mobileResends < MAX_RESENDS ? `Resend OTP in ${mobileCooldown}s` : `Resend OTP (${Math.max(0, MAX_RESENDS - mobileResends)} left)`}
            </button>
            {resendLimitHit && <p className="text-xs text-center text-red-700" role="alert">{MAX_RESENDS_MESSAGE}</p>}
          </>
        )}

        {step === 'existing' && enrollResult && (
          <div className="space-y-3">
            <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex gap-2" role="status">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /> An ABHA already exists for this Aadhaar. No new ABHA number is made.
            </p>
            <div className="rounded-xl border p-3 text-sm space-y-1">
              <p className="font-semibold">{enrollResult.fullName}</p>
              <p>ABHA number: <span className="font-mono">{enrollResult.abhaNumber}</span></p>
              {enrollResult.abhaAddress && <p>ABHA address: <span className="font-mono">{enrollResult.abhaAddress}</span></p>}
            </div>
            <Button onClick={proceedWithExisting} className="w-full">Proceed with the existing ABHA</Button>
            <Button variant="outline" onClick={() => loadSuggestions(txnId)} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create a new ABHA address for it
            </Button>
          </div>
        )}

        {step === 'address' && (
          <>
            {addressTaken && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 space-y-2" role="alert">
                <p className="text-sm">ABHA address already exists. <span className="font-mono">{addressTaken}</span></p>
                <div className="grid grid-cols-1 gap-2">
                  {enrollResult?.abhaAddress && (
                    <Button size="sm" variant="outline" onClick={proceedWithExisting}>Go on with the existing address {enrollResult.abhaAddress}</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setAddressTaken(''); setChosenAddress('__custom__'); setCustomAddress(''); }}>Create a new one</Button>
                </div>
              </div>
            )}
            <Label>Choose an ABHA address</Label>
            <RadioGroup value={chosenAddress} onValueChange={setChosenAddress} className="space-y-2">
              {suggestions.map(s => (
                <div key={s} className="flex items-center gap-2 border rounded-md p-2">
                  <RadioGroupItem value={s} id={s} />
                  <label htmlFor={s} className="text-sm cursor-pointer">{s}{addressSuffix}</label>
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
                <span className="text-sm text-muted-foreground">{addressSuffix}</span>
              </div>
            </RadioGroup>
            {/* The rules beside the free field, each green when met and red when not (CRT_ABHA_112). */}
            <ul className="space-y-1 text-xs" aria-label="ABHA address rules">
              {abhaAddressRules(customAddress.replace(/@(sbx|abdm)$/i, ''), addressSuffix).map(rule => (
                <li key={rule.label} className={`flex items-start gap-1.5 ${chosenAddress !== '__custom__' || !customAddress ? 'text-muted-foreground' : rule.met ? 'text-green-700' : 'text-red-700'}`}>
                  {chosenAddress === '__custom__' && customAddress && !rule.met
                    ? <X className="h-3.5 w-3.5 shrink-0 mt-px" aria-label="not met" />
                    : <Check className="h-3.5 w-3.5 shrink-0 mt-px" aria-label={chosenAddress === '__custom__' && customAddress ? 'met' : ''} />}
                  {rule.label}
                </li>
              ))}
            </ul>
            <Button onClick={confirmAddress} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create ABHA address
            </Button>
          </>
        )}

        {step === 'success' && finalResult && (
          <div className="space-y-3">
            <div className="text-center">
              <CheckCircle2 className="h-9 w-9 text-green-600 mx-auto" />
              {/* "ABHA created" only when a new ABHA number was made (CRT_ABHA_113). */}
              <p className="font-semibold">{enrollResult?.isNew === false || finalResult.isNew === false ? 'Existing ABHA verified' : 'ABHA created'}</p>
            </div>
            {registerHere && finalResult.linkToken ? (
              <AbhaRegisterPatient
                hospitalId={hospitalId}
                profile={finalResult}
                linkToken={finalResult.linkToken}
                sessionTxnId={finalResult.txnId || txnId}
                onFinished={finishAndClose}
              />
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">{finalResult.fullName}</p>
                <p className="text-sm">ABHA number: <span className="font-mono">{finalResult.abhaNumber}</span></p>
                {finalResult.abhaAddress && <p className="text-sm">ABHA address: <span className="font-mono">{finalResult.abhaAddress}</span></p>}
                {[finalResult.gender, finalResult.dateOfBirth, finalResult.mobile ? `******${finalResult.mobile.slice(-4)}` : '', finalResult.district, finalResult.state].some(Boolean) && (
                  <p className="text-xs text-muted-foreground">{[finalResult.gender, finalResult.dateOfBirth, finalResult.mobile ? `******${finalResult.mobile.slice(-4)}` : '', finalResult.district, finalResult.state].filter(Boolean).join(' · ')}</p>
                )}
                {cardUrl && cardBlob && (
                  cardBlob.type === 'application/pdf'
                    ? <iframe src={cardUrl} title="ABHA card" className="w-full h-64 border rounded-md" />
                    : <img src={cardUrl} alt="ABHA card" className="w-full border rounded-md" />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => loadCard()} disabled={cardBusy || !!cardUrl} className="gap-2">
                    {cardBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" aria-hidden="true" />} View ABHA card
                  </Button>
                  <Button variant="outline" onClick={downloadCard} disabled={cardBusy} className="gap-2">
                    <Download className="h-4 w-4" aria-hidden="true" /> Download card
                  </Button>
                </div>
                <Button onClick={finishAndClose} className="w-full">Done</Button>
              </div>
            )}
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
