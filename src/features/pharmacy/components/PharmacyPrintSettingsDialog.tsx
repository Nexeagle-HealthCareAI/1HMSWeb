import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { pharmacyApi, UpsertPharmacyPrintSettingsInput } from '../services/pharmacyApi';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

interface PharmacyPrintSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm: UpsertPharmacyPrintSettingsInput = {
  tradeName: '',
  dl20BNumber: '',
  dl21BNumber: '',
  fssaiNumber: '',
  pharmacistName: '',
  pharmacistRegNo: '',
  returnPolicyText: '',
  showVerificationQr: true,
};

export const PharmacyPrintSettingsDialog: React.FC<PharmacyPrintSettingsDialogProps> = ({ isOpen, onClose }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [form, setForm] = useState<UpsertPharmacyPrintSettingsInput>(emptyForm);
  const [gstin, setGstin] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !hospitalId) return;
    setIsLoading(true);
    pharmacyApi.getPrintSettings(hospitalId)
      .then(s => {
        setForm({
          tradeName: s.tradeName ?? '',
          dl20BNumber: s.dl20BNumber ?? '',
          dl21BNumber: s.dl21BNumber ?? '',
          fssaiNumber: s.fssaiNumber ?? '',
          pharmacistName: s.pharmacistName ?? '',
          pharmacistRegNo: s.pharmacistRegNo ?? '',
          returnPolicyText: s.returnPolicyText ?? '',
          showVerificationQr: s.showVerificationQr,
        });
        setGstin(s.hospitalGstin ?? undefined);
      })
      .catch(() => toast.error('Could not load pharmacy print settings'))
      .finally(() => setIsLoading(false));
  }, [isOpen, hospitalId]);

  const handleSave = async () => {
    if (!hospitalId) return;
    setIsSaving(true);
    try {
      await pharmacyApi.upsertPrintSettings(form, hospitalId);
      toast.success('Pharmacy print settings saved');
      onClose();
    } catch {
      toast.error('Could not save pharmacy print settings');
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof UpsertPharmacyPrintSettingsInput, label: string, placeholder?: string) => (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <Input
        className="mt-1"
        value={(form[key] as string) ?? ''}
        placeholder={placeholder}
        onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto shadow-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">Pharmacy Bill Settings</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {gstin && (
              <p className="text-xs text-muted-foreground">
                GSTIN <span className="font-mono">{gstin}</span> is pulled from the hospital profile and printed automatically.
              </p>
            )}
            {field('tradeName', 'Pharmacy Trade Name', 'e.g. 1HMS Pharmacy & Healthcare Store')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('dl20BNumber', 'Drug License (Form 20B)')}
              {field('dl21BNumber', 'Drug License (Form 21B)')}
            </div>
            {field('fssaiNumber', 'FSSAI License Number')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('pharmacistName', 'Registered Pharmacist Name')}
              {field('pharmacistRegNo', 'Pharmacist Registration No.')}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Return Policy (printed on the receipt footer)</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.returnPolicyText ?? ''}
                placeholder="Medicines returnable within 7 days with original receipt. Refrigerated items & opened strips are non-returnable."
                onChange={(e) => setForm(prev => ({ ...prev, returnPolicyText: e.target.value }))}
              />
            </div>
          </div>
        )}

        <SheetFooter className="mt-8 flex flex-row gap-2 justify-end sm:justify-end">
          <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl w-full sm:w-auto bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700" onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
