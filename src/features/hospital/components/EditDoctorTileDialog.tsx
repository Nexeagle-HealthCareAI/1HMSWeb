import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDepartmentApi } from '@/hooks/useApi';
import { ProfilePictureUploader } from '@/components/shared/ProfilePictureUploader';
import { QualificationSelector } from '@/features/doctor/components/QualificationSelector';
import { SpecializationSelector } from '@/features/doctor/components/SpecializationSelector';
import { LanguagesSelector } from './LanguagesSelector';
import { publicDirectoryDoctorsApi, type PublicDirectoryDoctorTile } from '../services/publicDirectoryDoctorsApi';
import { doctorFeeService } from '../services/doctorFeeService';
import { Loader2, Save } from 'lucide-react';

interface EditDoctorTileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: PublicDirectoryDoctorTile | null;
  hospitalId: string;
  onSaved: () => void;
}

const parseQualifications = (raw?: string | null): string[] =>
  (raw ?? '')
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean);

export const EditDoctorTileDialog: React.FC<EditDoctorTileDialogProps> = ({
  open,
  onOpenChange,
  doctor,
  hospitalId,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: departmentsResponse } = useDepartmentApi.getGlobalDepartments();

  const [photoUrl, setPhotoUrl] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');
  const [registrationYear, setRegistrationYear] = useState('');
  const [opdConsultFee, setOpdConsultFee] = useState('');
  // Not shown/edited here — round-tripped back unchanged on save so this tile's OPD-only edit
  // doesn't clobber them (the shared doctor-fees endpoint takes all three, non-nullable).
  const [ipdVisitFee, setIpdVisitFee] = useState(0);
  const [emergencyFee, setEmergencyFee] = useState(0);
  const [qualification, setQualification] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [publicContactEmail, setPublicContactEmail] = useState('');
  const [publicContactPhone, setPublicContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doctor && open) {
      setPhotoUrl(doctor.photoUrl || '');
      setLicenseNumber(doctor.licenseNumber || '');
      setMedicalCouncil(doctor.medicalCouncil || '');
      setRegistrationYear(doctor.registrationYear ? String(doctor.registrationYear) : '');
      setOpdConsultFee(doctor.opdConsultFee != null ? String(doctor.opdConsultFee) : '');
      setIpdVisitFee(doctor.ipdVisitFee ?? 0);
      setEmergencyFee(doctor.emergencyFee ?? 0);
      setQualification(parseQualifications(doctor.qualification));
      setDepartmentId(doctor.departmentId || '');
      setSpecializations(doctor.specializations || []);
      setExperienceYears(doctor.experienceYears ?? '');
      setBio(doctor.bio || '');
      setLanguages(doctor.languages || []);
      setPublicContactEmail(doctor.publicContactEmail || '');
      setPublicContactPhone(doctor.publicContactPhone || '');
    }
  }, [doctor, open]);

  const departmentOptions = useMemo(() => {
    if (!departmentsResponse?.departments) return [];
    return departmentsResponse.departments
      .filter((dept) => dept.isActive && dept.departmentID && dept.name?.trim())
      .map((dept) => ({ id: String(dept.departmentID), name: dept.name }));
  }, [departmentsResponse]);

  const selectedDepartment = departmentOptions.find((d) => d.id === departmentId) || null;

  const handleSave = async () => {
    if (!doctor) return;
    if (!doctor.hospitalDepartmentMappingId) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('publicDirectory.editDialog.missingDepartmentMapping', {
          defaultValue: 'This doctor has no department assignment at this hospital yet — assign one from their profile first.',
        }),
        variant: 'destructive',
      });
      return;
    }

    if (!medicalCouncil.trim()) {
      toast({ title: 'State medical council required', description: 'Enter the state medical council this doctor is registered with.', variant: 'destructive' });
      return;
    }
    const regYear = Number(registrationYear);
    const currentYear = new Date().getFullYear();
    if (!registrationYear || !Number.isInteger(regYear) || regYear < 1950 || regYear > currentYear) {
      toast({ title: 'Valid registration year required', description: `Enter a registration year between 1950 and ${currentYear}.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await publicDirectoryDoctorsApi.updateDoctorTile({
        userId: doctor.userId,
        hospitalId,
        hospitalDepartmentMappingId: doctor.hospitalDepartmentMappingId,
        licenseNumber: licenseNumber || undefined,
        medicalCouncil: medicalCouncil.trim(),
        registrationYear: regYear,
        qualification,
        experienceYears: experienceYears === '' ? undefined : Number(experienceYears),
        bio: bio || undefined,
        department: selectedDepartment?.name,
        specializations,
        languages,
        publicContactEmail,
        publicContactPhone,
      });

      if (!response.success) {
        toast({
          title: t('publicDirectory.editDialog.saveFailedTitle', { defaultValue: 'Could not save' }),
          description: response.message || (response.errors || []).join(', '),
          variant: 'destructive',
        });
        return;
      }

      // OPD fee lives in the shared dbo.DoctorFees table (same one Configuration > Doctor Fees
      // edits) — a separate endpoint from the profile PUT above. IPD/Emergency round-trip
      // unchanged since this tile only surfaces OPD.
      if (opdConsultFee.trim()) {
        try {
          await doctorFeeService.upsert({
            doctorId: doctor.doctorId,
            opdConsultFee: Number(opdConsultFee) || 0,
            ipdVisitFee,
            emergencyFee,
          }, hospitalId);
        } catch (feeErr: any) {
          toast({
            title: 'Profile saved, but the fee update failed',
            description: feeErr?.message ?? 'Try updating the OPD fee again from Configuration > Doctor Fees.',
            variant: 'destructive',
          });
          onSaved();
          onOpenChange(false);
          return;
        }
      }

      toast({ title: t('publicDirectory.editDialog.saveSuccess', { defaultValue: 'Doctor profile updated' }) });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: t('publicDirectory.editDialog.saveFailedTitle', { defaultValue: 'Could not save' }),
        description: e?.message ?? '',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('publicDirectory.editDialog.title', {
              defaultValue: 'Edit {{name}}',
              name: doctor.fullName || t('publicDirectory.unnamedDoctor', { defaultValue: 'Unnamed doctor' }),
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ProfilePictureUploader
            currentImageUrl={photoUrl}
            targetUserId={doctor.userId}
            hospitalId={hospitalId}
            size="lg"
            onImageChange={setPhotoUrl}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tile-license">
                {t('publicDirectory.editDialog.licenseNumber', { defaultValue: 'License number' })}
              </Label>
              <Input id="tile-license" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-experience">
                {t('publicDirectory.editDialog.experienceYears', { defaultValue: 'Years of experience' })}
              </Label>
              <Input
                id="tile-experience"
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-medical-council">
                State medical council <span className="text-red-500">*</span>
              </Label>
              <Input id="tile-medical-council" value={medicalCouncil} onChange={(e) => setMedicalCouncil(e.target.value)} placeholder="e.g. Karnataka Medical Council" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-registration-year">
                Registration year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tile-registration-year"
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={registrationYear}
                onChange={(e) => setRegistrationYear(e.target.value)}
                placeholder="e.g. 2012"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-opd-fee">OPD consultation fee (₹)</Label>
              <Input
                id="tile-opd-fee"
                type="number"
                min={0}
                value={opdConsultFee}
                onChange={(e) => setOpdConsultFee(e.target.value)}
                placeholder="Synced with Configuration > Doctor Fees"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('publicDirectory.editDialog.department', { defaultValue: 'Speciality (department)' })}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder={t('publicDirectory.editDialog.departmentPlaceholder', { defaultValue: 'Select department' })} />
              </SelectTrigger>
              <SelectContent className="max-h-56 overflow-y-auto">
                {departmentOptions.map(({ id, name }) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">
              {t('publicDirectory.editDialog.focusAreas', { defaultValue: 'Focus areas' })}
            </Label>
            <SpecializationSelector
              departmentId={departmentId}
              departmentName={selectedDepartment?.name || ''}
              selectedSpecializations={specializations}
              onSpecializationsChange={setSpecializations}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">
              {t('publicDirectory.editDialog.qualification', { defaultValue: 'Degree / qualification' })}
            </Label>
            <QualificationSelector
              selectedQualifications={qualification}
              onQualificationsChange={setQualification}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tile-bio">{t('publicDirectory.editDialog.about', { defaultValue: 'About' })}</Label>
            <Textarea
              id="tile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={t('publicDirectory.editDialog.aboutPlaceholder', { defaultValue: 'A short public-facing bio for patients…' })}
            />
          </div>

          <LanguagesSelector selectedLanguages={languages} onLanguagesChange={setLanguages} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tile-contact-email">
                {t('publicDirectory.editDialog.publicEmail', { defaultValue: 'Public contact email' })}
              </Label>
              <Input
                id="tile-contact-email"
                type="email"
                value={publicContactEmail}
                onChange={(e) => setPublicContactEmail(e.target.value)}
                placeholder={t('publicDirectory.editDialog.publicEmailPlaceholder', { defaultValue: 'Optional — shown to patients' })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-contact-phone">
                {t('publicDirectory.editDialog.publicPhone', { defaultValue: 'Public contact phone' })}
              </Label>
              <Input
                id="tile-contact-phone"
                value={publicContactPhone}
                onChange={(e) => setPublicContactPhone(e.target.value)}
                placeholder={t('publicDirectory.editDialog.publicPhonePlaceholder', { defaultValue: 'Optional — shown to patients' })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
