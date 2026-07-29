import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmEnrollResponse } from '../services/abdmApi';

type Step = 'aadhaar' | 'aadhaar-otp' | 'mobile' | 'mobile-otp' | 'address' | 'success';

const STEP_LABELS: Record<Step, string> = {
  aadhaar: 'Aadhaar number',
  'aadhaar-otp': 'Verify Aadhaar OTP',
  mobile: 'Mobile number',
  'mobile-otp': 'Verify mobile OTP',
  address: 'Choose ABHA address',
  success: 'Done',
};

interface Props {
  hospitalId: string;
  onDone: () => void;
  onCancel: () => void;
}

export const CreateAbhaWizard: React.FC<Props> = ({ hospitalId, onDone, onCancel }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('aadhaar');
  const [busy, setBusy] = useState(false);

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

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  const sendAadhaarOtp = async () => {
    const clean = aadhaar.replace(/\D/g, '');
    if (clean.length !== 12) { toast({ title: 'Enter a valid 12-digit Aadhaar number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.generateAadhaarOtp(hospitalId, clean);
      if (!res.success || !res.txnId) { fail(res.message); return; }
      setTxnId(res.txnId);
      toast({ title: 'OTP sent', description: res.message || 'Check the Aadhaar-linked mobile number.' });
      setStep('aadhaar-otp');
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyAadhaarOtp = async () => {
    const clean = aadhaarOtp.replace(/\D/g, '');
    if (clean.length !== 6) { toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.verifyAadhaarOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      setEnrollResult(res);
      setTxnId(res.txnId || txnId);
      setMobile(res.mobile || '');
      if (res.mobileVerified) {
        await loadSuggestions(res.txnId || txnId);
      } else {
        setStep('mobile');
      }
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  const sendMobileOtp = async () => {
    const clean = mobile.replace(/\D/g, '');
    if (clean.length !== 10) { toast({ title: 'Enter a valid 10-digit mobile number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.generateMobileOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      toast({ title: 'OTP sent', description: res.message || 'Check the mobile number.' });
      setStep('mobile-otp');
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

  const steps: Step[] = ['aadhaar', 'aadhaar-otp', 'mobile', 'mobile-otp', 'address', 'success'];
  const stepIndex = steps.indexOf(step);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="p-2 h-auto"><ArrowLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-base">Create ABHA — {STEP_LABELS[step]}</CardTitle>
        </div>
        <div className="flex items-center gap-1 pl-10">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
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
            <Button onClick={verifyAadhaarOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify
            </Button>
          </>
        )}

        {step === 'mobile' && (
          <>
            {enrollResult?.fullName && (
              <p className="text-sm text-muted-foreground">Aadhaar KYC found: <span className="font-medium text-foreground">{enrollResult.fullName}</span></p>
            )}
            <div className="space-y-2">
              <Label>Mobile number for this ABHA account</Label>
              <Input value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} inputMode="numeric" placeholder="10-digit mobile number" />
            </div>
            <Button onClick={sendMobileOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send OTP
            </Button>
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
            <Button onClick={onDone} className="w-full">Done</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
