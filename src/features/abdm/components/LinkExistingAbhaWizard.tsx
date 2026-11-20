import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link2, Loader2, CheckCircle2, Search, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmProfileResponse, type AbdmFindAbhaCandidate, type AbdmProfileShareItem } from '../services/abdmApi';
import { INVALID_AADHAAR, isAbhaAddress, isValidAadhaar, onlyDigits } from '../utils/aadhaar';

type Step = 'login' | 'pick' | 'otp' | 'confirm';
type LoginHint = 'mobile' | 'aadhaar' | 'abha-number' | 'abha-address';
type OtpTo = 'abdm' | 'aadhaar';

const HINT_LABEL: Record<LoginHint, string> = {
  mobile: 'Mobile number',
  aadhaar: 'Aadhaar number',
  'abha-number': 'ABHA number',
  'abha-address': 'ABHA address',
};

// An ABHA number or address can be proved by an OTP to either mobile; the patient chooses.
const choosesOtp = (hint: LoginHint) => hint === 'abha-number' || hint === 'abha-address';

// Resend: at most 2, each after a 60 second wait (VRFY_ABHA_305), as on the Create ABHA screen.
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 2;

const STEP_LABELS: Record<Step, string> = {
  login: 'Identify the ABHA holder',
  pick: 'Choose an ABHA number',
  otp: 'Verify OTP',
  confirm: 'Confirm & save',
};

interface Props {
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  // Fired with the fetched profile right after it's saved — lets a host form (appointment
  // booking, IPD admission) pull the ABHA number into its own field without re-fetching.
  onLinked?: (profile: AbdmProfileResponse) => void;
}

export const LinkExistingAbhaWizard: React.FC<Props> = ({ hospitalId, open, onOpenChange, onDone, onLinked }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('login');
  const [busy, setBusy] = useState(false);

  const [loginHint, setLoginHint] = useState<LoginHint>('mobile');
  const [loginId, setLoginId] = useState('');
  const [otpTo, setOtpTo] = useState<OtpTo>('abdm');
  const [otp, setOtp] = useState('');
  const [resends, setResends] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // How the OTP now on screen was asked for, so "Resend" asks the same way.
  const lastSend = useRef<(() => Promise<boolean>) | null>(null);

  const startCooldown = () => {
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
  const [txnId, setTxnId] = useState('');
  const [profile, setProfile] = useState<AbdmProfileResponse | null>(null);

  // "Find ABHA" mode — for a holder who doesn't remember their exact ABHA number/address but has
  // the mobile/Aadhaar it's linked to. A search can surface more than one linked ABHA.
  const [findMode, setFindMode] = useState(false);
  const [candidates, setCandidates] = useState<AbdmFindAbhaCandidate[]>([]);
  const [searchTxnId, setSearchTxnId] = useState('');

  // Profiles patients just shared by scanning the counter QR — already consented to in their ABHA
  // app, so picking one skips the OTP step entirely.
  const [recentScans, setRecentScans] = useState<AbdmProfileShareItem[]>([]);
  const [pickedShareId, setPickedShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || step !== 'login' || !hospitalId) return;
    let active = true;
    abdmApi.getProfileShares(hospitalId, { status: 'NEW' })
      .then(res => { if (active) setRecentScans((res.items || []).filter(i => i.abhaNumber).slice(0, 5)); })
      .catch(() => { /* optional shortcut — the OTP path below still works */ });
    return () => { active = false; };
  }, [open, step, hospitalId]);

  const pickScan = (item: AbdmProfileShareItem) => {
    setProfile({
      success: true,
      abhaNumber: item.abhaNumber,
      abhaAddress: item.abhaAddress,
      fullName: item.fullName,
      gender: item.gender,
      dateOfBirth: item.dateOfBirth,
      mobile: item.mobile,
    });
    setPickedShareId(item.profileShareId);
    setStep('confirm');
  };

  const reset = () => {
    setStep('login');
    setBusy(false);
    setLoginHint('mobile');
    setLoginId('');
    setOtpTo('abdm');
    setOtp('');
    setResends(0);
    setCooldown(0);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    lastSend.current = null;
    setTxnId('');
    setProfile(null);
    setFindMode(false);
    setCandidates([]);
    setSearchTxnId('');
    setRecentScans([]);
    setPickedShareId(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  // Where the OTP goes: fixed for a mobile or an Aadhaar number, chosen for an ABHA number or address.
  const otpSystem: OtpTo = loginHint === 'aadhaar' ? 'aadhaar' : loginHint === 'mobile' ? 'abdm' : otpTo;

  // Stopped here, before any call to ABDM (VRFY_ABHA_301 and 401).
  const typedIsUsable = (clean: string): boolean => {
    if (!clean) { toast({ title: `Enter the ${HINT_LABEL[loginHint].toLowerCase()}`, variant: 'destructive' }); return false; }
    if (loginHint === 'aadhaar' && !isValidAadhaar(clean)) { toast({ title: INVALID_AADHAAR, variant: 'destructive' }); return false; }
    if (loginHint === 'mobile' && !/^[6-9]\d{9}$/.test(clean.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))) {
      toast({ title: 'Enter a valid 10-digit mobile number', variant: 'destructive' }); return false;
    }
    if (loginHint === 'abha-number' && clean.replace(/\D/g, '').length !== 14) { toast({ title: 'Enter the 14-digit ABHA number', variant: 'destructive' }); return false; }
    if (loginHint === 'abha-address' && !isAbhaAddress(clean)) { toast({ title: 'Enter the ABHA address in full, like name@abdm', variant: 'destructive' }); return false; }
    return true;
  };

  const otpSent = (res: { txnId?: string; message?: string }, first: boolean) => {
    setTxnId(res.txnId!);
    setOtp('');
    if (first) setResends(0);
    startCooldown();
    toast({ title: first ? 'OTP sent' : 'OTP sent again', description: res.message || 'Enter the OTP to continue.' });
    setStep('otp');
  };

  const sendOtp = async () => {
    const clean = loginId.trim();
    if (!typedIsUsable(clean)) return;
    const send = async (first: boolean) => {
      const res = await abdmApi.requestLoginOtp(hospitalId, clean, loginHint, otpSystem);
      if (!res.success || !res.txnId) { fail(res.message); return false; }
      otpSent(res, first);
      return true;
    };
    setBusy(true);
    try {
      if (await send(true)) lastSend.current = () => send(false);
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0 || resends >= MAX_RESENDS || !lastSend.current) return;
    setBusy(true);
    try {
      if (await lastSend.current()) setResends(n => n + 1);
    } catch (e) {
      const err = e as { response?: { data?: { Message?: string; message?: string } }; message?: string };
      fail(err.response?.data?.Message || err.message);
    } finally {
      setBusy(false);
    }
  };

  // "I don't remember my ABHA number" — search by mobile/Aadhaar first; a single match skips
  // straight to OTP, multiple matches show a picker.
  const searchForAbha = async () => {
    const clean = loginId.trim();
    const searchBy = loginHint === 'aadhaar' ? 'aadhaar' : 'mobile';
    if (!typedIsUsable(clean)) return;
    setBusy(true);
    try {
      const res = await abdmApi.findAbhaSearch(hospitalId, clean, searchBy);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setSearchTxnId(res.txnId);
      if (res.candidates.length === 1) {
        await generateOtpForCandidate(res.txnId, res.candidates[0].index, searchBy);
      } else {
        setCandidates(res.candidates);
        setStep('pick');
      }
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const generateOtpForCandidate = async (txn: string, index: number, searchBy: 'mobile' | 'aadhaar') => {
    const send = async (first: boolean) => {
      const res = await abdmApi.findAbhaGenerateOtp(hospitalId, txn, index, searchBy);
      if (!res.success || !res.txnId) { fail(res.message); return false; }
      otpSent(res, first);
      return true;
    };
    setBusy(true);
    try {
      if (await send(true)) lastSend.current = () => send(false);
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    const clean = otp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      // The verify must name the same OTP the request did: ABDM checks the two against each other.
      const res = loginHint === 'abha-address'
        ? await abdmApi.verifyLoginOtp(hospitalId, txnId, clean, 'abha-address', { loginId: loginId.trim(), otpSystem })
        : await abdmApi.verifyLoginOtp(hospitalId, txnId, clean, otpSystem === 'aadhaar' ? 'aadhaar' : 'mobile');
      if (!res.success) { fail(res.message); return; }
      setProfile(res);
      setStep('confirm');
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAccount = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const res = await abdmApi.saveLinkedAccount(hospitalId, profile, pickedShareId);
      if (!res.success) { fail(res.message); return; }
      toast({ title: 'ABHA account linked', description: res.message });
      if (pickedShareId) void abdmApi.handleProfileShare(hospitalId, pickedShareId).catch(() => { /* best-effort */ });
      onLinked?.(profile);
      onDone();
      handleOpenChange(false);
    } catch (e: any) {
      fail((e?.response?.data?.Message ?? e?.response?.data?.message) || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const steps: Step[] = ['login', 'pick', 'otp', 'confirm'];
  const stepIndex = steps.indexOf(step);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 sm:px-6 pt-5 pb-4 shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shadow-inner">
              <Link2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold">Link existing ABHA</SheetTitle>
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
        {step === 'login' && (
          <>
            {recentScans.length > 0 && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                <p className="text-sm font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-emerald-600" /> Just scanned at the counter</p>
                {recentScans.map(item => (
                  <button
                    key={item.profileShareId}
                    type="button"
                    onClick={() => pickScan(item)}
                    className="w-full text-left rounded-lg border bg-background p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{item.fullName || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{[item.abhaNumber, item.mobile].filter(Boolean).join(' · ')}</p>
                  </button>
                ))}
                <p className="text-[11px] text-muted-foreground">No OTP needed — the patient already consented in their ABHA app.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Identify by</Label>
              <RadioGroup
                value={loginHint}
                onValueChange={v => { setLoginHint(v as LoginHint); setLoginId(''); if (choosesOtp(v as LoginHint)) setFindMode(false); }}
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mobile" id="hint-mobile" />
                  <label htmlFor="hint-mobile" className="text-sm cursor-pointer">Mobile</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="aadhaar" id="hint-aadhaar" />
                  <label htmlFor="hint-aadhaar" className="text-sm cursor-pointer">Aadhaar</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="abha-number" id="hint-abha" />
                  <label htmlFor="hint-abha" className="text-sm cursor-pointer">ABHA number</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="abha-address" id="hint-address" />
                  <label htmlFor="hint-address" className="text-sm cursor-pointer">ABHA address</label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="abha-login-id">{HINT_LABEL[loginHint]}</Label>
              <Input
                id="abha-login-id"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder={loginHint === 'abha-address' ? 'name@abdm' : 'Enter to receive an OTP'}
                inputMode={loginHint === 'abha-address' ? 'email' : 'numeric'}
                autoCapitalize="none"
              />
            </div>
            {choosesOtp(loginHint) && (
              <div className="space-y-2">
                <Label>Send the OTP to</Label>
                <RadioGroup value={otpTo} onValueChange={v => setOtpTo(v as OtpTo)} className="flex flex-wrap gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="abdm" id="otp-abdm" />
                    <label htmlFor="otp-abdm" className="text-sm cursor-pointer">Mobile linked to the ABHA</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="aadhaar" id="otp-aadhaar" />
                    <label htmlFor="otp-aadhaar" className="text-sm cursor-pointer">Mobile linked to Aadhaar</label>
                  </div>
                </RadioGroup>
              </div>
            )}
            {!choosesOtp(loginHint) && (
              <button
                type="button"
                className="text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2"
                onClick={() => setFindMode(f => !f)}
              >
                {findMode ? "I know my ABHA number" : "I don't remember my ABHA number"}
              </button>
            )}
            <Button onClick={findMode && !choosesOtp(loginHint) ? searchForAbha : sendOtp} disabled={busy} className="w-full">
              {busy
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : findMode && !choosesOtp(loginHint) ? <Search className="h-4 w-4 mr-2" /> : null}
              {findMode && !choosesOtp(loginHint) ? 'Search' : 'Send OTP'}
            </Button>
          </>
        )}

        {step === 'pick' && (
          <>
            <p className="text-sm text-muted-foreground">More than one ABHA number is linked — choose one.</p>
            <div className="space-y-2">
              {candidates.map(c => (
                <button
                  key={c.index}
                  type="button"
                  disabled={busy}
                  onClick={() => generateOtpForCandidate(searchTxnId, c.index, loginHint === 'aadhaar' ? 'aadhaar' : 'mobile')}
                  className="w-full text-left rounded-xl border p-3 hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <p className="font-mono text-sm">{c.abhaNumber}</p>
                  <p className="text-xs text-muted-foreground">{[c.name, c.gender].filter(Boolean).join(' · ') || '—'}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="space-y-2">
              <Label>Enter the 6-digit OTP</Label>
              <Input value={otp} onChange={e => setOtp(onlyDigits(e.target.value, 6))} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
            </div>
            <Button onClick={verifyOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
            <div className="text-center">
              {resends >= MAX_RESENDS ? (
                <p className="text-xs text-muted-foreground">No more resends. Go back and start again if the OTP did not arrive.</p>
              ) : (
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={busy || cooldown > 0}
                  className="text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              )}
            </div>
          </>
        )}

        {step === 'confirm' && profile && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
              <p className="font-semibold">{profile.fullName}</p>
              <p className="text-sm">ABHA number: <span className="font-mono">{profile.abhaNumber}</span></p>
              {profile.abhaAddress && <p className="text-sm">ABHA address: <span className="font-mono">{profile.abhaAddress}</span></p>}
              {profile.mobile && <p className="text-sm text-muted-foreground">Mobile: {profile.mobile}</p>}
            </div>
            {/* Verified, but nothing to save: an ABHA address with no ABHA number behind it. */}
            {!profile.linkToken && !pickedShareId && profile.message && (
              <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3" role="alert">{profile.message}</p>
            )}
            <Button onClick={saveAccount} disabled={busy || (!profile.linkToken && !pickedShareId)} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save to hospital records
            </Button>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
