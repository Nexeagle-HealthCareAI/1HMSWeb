import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserCog, Loader2, CheckCircle2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbhaAccountSummary } from '../services/abdmApi';

type Step = 'verify' | 'otp' | 'edit';
type LoginHint = 'mobile' | 'aadhaar' | 'abha-number';
type MobileEditState = 'idle' | 'entering' | 'otp';

interface Props {
  hospitalId: string;
  account: AbhaAccountSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export const EditAbhaProfileWizard: React.FC<Props> = ({ hospitalId, account, open, onOpenChange, onUpdated }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('verify');
  const [busy, setBusy] = useState(false);

  const [loginHint, setLoginHint] = useState<LoginHint>('mobile');
  const [loginId, setLoginId] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionTxnId, setSessionTxnId] = useState('');

  const [currentMobile, setCurrentMobile] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  const [mobileEdit, setMobileEdit] = useState<MobileEditState>('idle');
  const [newMobile, setNewMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [updateTxnId, setUpdateTxnId] = useState('');

  const [emailDraft, setEmailDraft] = useState('');

  useEffect(() => {
    if (open && account) {
      setStep('verify');
      setBusy(false);
      setLoginHint('mobile');
      setLoginId(account.mobile || '');
      setOtp('');
      setSessionTxnId('');
      setCurrentMobile(account.mobile || '');
      setCurrentEmail(account.email || '');
      setMobileEdit('idle');
      setNewMobile('');
      setMobileOtp('');
      setUpdateTxnId('');
      setEmailDraft(account.email || '');
    }
  }, [open, account]);

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  if (!account) return null;

  const sendVerifyOtp = async () => {
    const clean = loginId.trim();
    if (!clean) { toast({ title: `Enter a ${loginHint === 'mobile' ? 'mobile number' : loginHint === 'aadhaar' ? 'Aadhaar number' : 'ABHA number'}`, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const otpSystem = loginHint === 'aadhaar' ? 'aadhaar' : 'abdm';
      const res = await abdmApi.requestLoginOtp(hospitalId, clean, loginHint, otpSystem);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setSessionTxnId(res.txnId);
      toast({ title: 'OTP sent', description: res.message || 'Enter the OTP to continue.' });
      setStep('otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyIdentity = async () => {
    const clean = otp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyLoginOtp(hospitalId, sessionTxnId, clean);
      if (!res.success) { fail(res.message); return; }
      setSessionTxnId(res.txnId || sessionTxnId);
      setCurrentMobile(res.mobile || currentMobile);
      setStep('edit');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const sendMobileUpdateOtp = async () => {
    const clean = newMobile.replace(/\D/g, '');
    if (clean.length !== 10) { toast({ title: 'Enter a valid 10-digit mobile number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.requestUpdateMobileOtp(sessionTxnId, clean);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setUpdateTxnId(res.txnId);
      toast({ title: 'OTP sent', description: res.message || 'Check the new mobile number.' });
      setMobileEdit('otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyMobileUpdate = async () => {
    const clean = mobileOtp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyUpdateMobileOtp(hospitalId, account.abhaNumber, sessionTxnId, updateTxnId, clean);
      if (!res.success) { fail(res.message); return; }
      setCurrentMobile(res.mobile || newMobile);
      setMobileEdit('idle');
      setNewMobile('');
      setMobileOtp('');
      toast({ title: 'Mobile number updated' });
      onUpdated();
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEmail = async () => {
    const clean = emailDraft.trim();
    if (!clean) { toast({ title: 'Enter an email address', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.updateEmail(hospitalId, account.abhaNumber, sessionTxnId, clean);
      if (!res.success) { fail(res.message); return; }
      setCurrentEmail(res.email || clean);
      toast({ title: 'Email updated' });
      onUpdated();
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 sm:px-6 pt-5 pb-4 shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shadow-inner">
              <UserCog className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold">Edit ABHA profile</SheetTitle>
              <SheetDescription className="text-xs font-mono">{account.abhaNumber}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {step === 'verify' && (
            <>
              <p className="text-sm text-muted-foreground">ABDM requires the ABHA holder to re-verify with an OTP before any profile change — this doesn't change what's stored yet.</p>
              <div className="space-y-2">
                <Label>Identify by</Label>
                <RadioGroup value={loginHint} onValueChange={v => setLoginHint(v as LoginHint)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mobile" id="ehint-mobile" />
                    <label htmlFor="ehint-mobile" className="text-sm cursor-pointer">Mobile</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="aadhaar" id="ehint-aadhaar" />
                    <label htmlFor="ehint-aadhaar" className="text-sm cursor-pointer">Aadhaar</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="abha-number" id="ehint-abha" />
                    <label htmlFor="ehint-abha" className="text-sm cursor-pointer">ABHA number</label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>{loginHint === 'mobile' ? 'Mobile number' : loginHint === 'aadhaar' ? 'Aadhaar number' : 'ABHA number'}</Label>
                <Input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Enter to receive an OTP" />
              </div>
              <Button onClick={sendVerifyOtp} disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send OTP
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="space-y-2">
                <Label>Enter the 6-digit OTP</Label>
                <Input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
              </div>
              <Button onClick={verifyIdentity} disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
              </Button>
            </>
          )}

          {step === 'edit' && (
            <div className="space-y-5">
              {/* Mobile */}
              <div className="rounded-xl border p-3.5 space-y-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mobile number</Label>
                {mobileEdit === 'idle' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm">{currentMobile || '—'}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMobileEdit('entering')}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Change
                    </Button>
                  </div>
                )}
                {mobileEdit === 'entering' && (
                  <div className="space-y-2">
                    <Input value={newMobile} onChange={e => setNewMobile(e.target.value)} maxLength={10} inputMode="numeric" placeholder="New 10-digit mobile number" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setMobileEdit('idle'); setNewMobile(''); }}>Cancel</Button>
                      <Button type="button" size="sm" className="flex-1" onClick={sendMobileUpdateOtp} disabled={busy}>
                        {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Send OTP
                      </Button>
                    </div>
                  </div>
                )}
                {mobileEdit === 'otp' && (
                  <div className="space-y-2">
                    <Input value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder={`OTP sent to ${newMobile}`} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setMobileEdit('idle'); setNewMobile(''); setMobileOtp(''); }}>Cancel</Button>
                      <Button type="button" size="sm" className="flex-1" onClick={verifyMobileUpdate} disabled={busy}>
                        {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Verify
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="rounded-xl border p-3.5 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <Input type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} placeholder="Email address" />
                <Button type="button" size="sm" className="w-full" onClick={saveEmail} disabled={busy || emailDraft.trim() === currentEmail}>
                  {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Save email
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Identity verified for this session
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
