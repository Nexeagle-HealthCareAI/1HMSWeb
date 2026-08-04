import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link2, Loader2, CheckCircle2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmProfileResponse, type AbdmFindAbhaCandidate } from '../services/abdmApi';

type Step = 'login' | 'pick' | 'otp' | 'confirm';
type LoginHint = 'mobile' | 'aadhaar' | 'abha-number';

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
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [profile, setProfile] = useState<AbdmProfileResponse | null>(null);

  // "Find ABHA" mode — for a holder who doesn't remember their exact ABHA number/address but has
  // the mobile/Aadhaar it's linked to. A search can surface more than one linked ABHA.
  const [findMode, setFindMode] = useState(false);
  const [candidates, setCandidates] = useState<AbdmFindAbhaCandidate[]>([]);
  const [searchTxnId, setSearchTxnId] = useState('');

  const reset = () => {
    setStep('login');
    setBusy(false);
    setLoginHint('mobile');
    setLoginId('');
    setOtp('');
    setTxnId('');
    setProfile(null);
    setFindMode(false);
    setCandidates([]);
    setSearchTxnId('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  const sendOtp = async () => {
    const clean = loginId.trim();
    if (!clean) { toast({ title: `Enter a ${loginHint === 'mobile' ? 'mobile number' : loginHint === 'aadhaar' ? 'Aadhaar number' : 'ABHA number'}`, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const otpSystem = loginHint === 'aadhaar' ? 'aadhaar' : 'abdm';
      const res = await abdmApi.requestLoginOtp(hospitalId, clean, loginHint, otpSystem);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      toast({ title: 'OTP sent', description: res.message || 'Enter the OTP to continue.' });
      setStep('otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  // "I don't remember my ABHA number" — search by mobile/Aadhaar first; a single match skips
  // straight to OTP, multiple matches show a picker.
  const searchForAbha = async () => {
    const clean = loginId.trim();
    const searchBy = loginHint === 'aadhaar' ? 'aadhaar' : 'mobile';
    if (!clean) { toast({ title: `Enter a ${searchBy === 'aadhaar' ? 'Aadhaar number' : 'mobile number'}`, variant: 'destructive' }); return; }
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
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const generateOtpForCandidate = async (txn: string, index: number, searchBy: 'mobile' | 'aadhaar') => {
    setBusy(true);
    try {
      const res = await abdmApi.findAbhaGenerateOtp(hospitalId, txn, index, searchBy);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      toast({ title: 'OTP sent', description: res.message || 'Enter the OTP to continue.' });
      setStep('otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    const clean = otp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyLoginOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      setProfile(res);
      setStep('confirm');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAccount = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const res = await abdmApi.saveLinkedAccount(hospitalId, profile);
      if (!res.success) { fail(res.message); return; }
      toast({ title: 'ABHA account linked', description: res.message });
      onLinked?.(profile);
      onDone();
      handleOpenChange(false);
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
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
            <div className="space-y-2">
              <Label>Identify by</Label>
              <RadioGroup value={loginHint} onValueChange={v => setLoginHint(v as LoginHint)} className="flex gap-4">
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
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>{loginHint === 'mobile' ? 'Mobile number' : loginHint === 'aadhaar' ? 'Aadhaar number' : 'ABHA number'}</Label>
              <Input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Enter to receive an OTP" />
            </div>
            {loginHint !== 'abha-number' && (
              <button
                type="button"
                className="text-xs text-brand-600 dark:text-brand-400 underline underline-offset-2"
                onClick={() => setFindMode(f => !f)}
              >
                {findMode ? "I know my ABHA number" : "I don't remember my ABHA number"}
              </button>
            )}
            <Button onClick={findMode && loginHint !== 'abha-number' ? searchForAbha : sendOtp} disabled={busy} className="w-full">
              {busy
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : findMode && loginHint !== 'abha-number' ? <Search className="h-4 w-4 mr-2" /> : null}
              {findMode && loginHint !== 'abha-number' ? 'Search' : 'Send OTP'}
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
              <Input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
            </div>
            <Button onClick={verifyOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
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
            <Button onClick={saveAccount} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save to hospital records
            </Button>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
