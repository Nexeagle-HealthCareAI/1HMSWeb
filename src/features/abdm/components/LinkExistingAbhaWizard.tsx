import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmProfileResponse } from '../services/abdmApi';

type Step = 'login' | 'otp' | 'confirm';
type LoginHint = 'mobile' | 'aadhaar' | 'abha-number';

interface Props {
  hospitalId: string;
  onDone: () => void;
  onCancel: () => void;
}

export const LinkExistingAbhaWizard: React.FC<Props> = ({ hospitalId, onDone, onCancel }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('login');
  const [busy, setBusy] = useState(false);

  const [loginHint, setLoginHint] = useState<LoginHint>('mobile');
  const [loginId, setLoginId] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [profile, setProfile] = useState<AbdmProfileResponse | null>(null);

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
      onDone();
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="p-2 h-auto"><ArrowLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-base">Link existing ABHA</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
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
            <Button onClick={sendOtp} disabled={busy} className="w-full">
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
      </CardContent>
    </Card>
  );
};
