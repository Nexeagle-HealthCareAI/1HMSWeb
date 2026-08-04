import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi } from '../services/abdmApi';

type Step = 'enter' | 'otp' | 'done';

interface Props {
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReactivated: () => void;
}

// §8.5 Re-activate ABHA — a deactivated account has no live session, so unlike editing/deactivating
// an active one, this is a standalone cold-start flow: just the ABHA number + an OTP.
export const ReactivateAbhaDialog: React.FC<Props> = ({ hospitalId, open, onOpenChange, onReactivated }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('enter');
  const [busy, setBusy] = useState(false);
  const [abhaNumber, setAbhaNumber] = useState('');
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');

  const reset = () => {
    setStep('enter');
    setBusy(false);
    setAbhaNumber('');
    setTxnId('');
    setOtp('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const fail = (message?: string) => toast({ title: 'Something went wrong', description: message || 'Please try again.', variant: 'destructive' });

  const sendOtp = async () => {
    const clean = abhaNumber.trim();
    if (!clean) { toast({ title: 'Enter the ABHA number', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await abdmApi.requestReactivateOtp(hospitalId, clean);
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
      const res = await abdmApi.verifyReactivateOtp(hospitalId, txnId, clean);
      if (!res.success) { fail(res.message); return; }
      setStep('done');
      onReactivated();
    } catch (e: any) {
      fail(e?.response?.data?.Message || e?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Reactivate a deactivated ABHA</DialogTitle>
        </DialogHeader>

        {step === 'enter' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>ABHA number</Label>
              <Input value={abhaNumber} onChange={e => setAbhaNumber(e.target.value)} placeholder="XX-XXXX-XXXX-XXXX" />
            </div>
            <Button onClick={sendOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send OTP
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Enter the 6-digit OTP</Label>
              <Input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} inputMode="numeric" placeholder="6-digit OTP" />
            </div>
            <Button onClick={verifyOtp} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Verify & reactivate
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-2 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <p className="text-sm">ABHA number reactivated.</p>
            <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
