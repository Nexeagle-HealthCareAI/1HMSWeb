import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  Globe,
  GraduationCap,
  Languages as LanguagesIcon,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Stethoscope,
  Tags,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { publicDirectoryDoctorsApi, type PublicDirectoryDoctorTile } from '@/features/hospital/services/publicDirectoryDoctorsApi';
import { EditDoctorTileDialog } from './EditDoctorTileDialog';
import { DoctorReviewsDialog } from './DoctorReviewsDialog';
import { cn } from '@/lib/utils';
import { buildDoctorQrPosterA4 } from '@/printTemplates/doctorQrPosterA4';

const initialsFor = (name?: string | null) => {
  const cleaned = (name || '').replace(/^Dr\.?\s*/i, '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
};

type PendingToggle =
  | { kind: 'hospital'; next: boolean }
  | { kind: 'doctor'; doctorId: string; doctorName: string; next: boolean };

// Every field on a doctor tile renders through this — a fixed icon + bold label + value —
// so every piece of data is unambiguous at a glance ("Languages Spoken: English, Hindi").
const FieldRow: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-1.5 text-xs leading-relaxed">
    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
    <p className="text-muted-foreground">
      <span className="font-semibold text-foreground">{label}:</span> {value}
    </p>
  </div>
);

// Admin screen: opt this hospital's doctors into the platform-wide public directory
// (NexEagle's "find a doctor" page, spanning every opted-in hospital). Off by default —
// replaces the old per-hospital API-key management screen, since a key is now
// platform-wide and no longer something a single hospital admin should self-issue.
export const PublicDirectoryConfig: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hospitalId } = useAuthStore();
  const queryClient = useQueryClient();

  const translate = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const { data: hospitalData, isLoading } = useHospitalApi.getHospitalById(hospitalId || '');
  const updateHospitalMutation = useHospitalApi.updateHospital(hospitalId || '');

  const [isListed, setIsListed] = useState(false);

  useEffect(() => {
    if (hospitalData) {
      setIsListed(Boolean(hospitalData.isPubliclyListed));
    }
  }, [hospitalData]);

  // Every toggle (hospital-level or per-doctor) routes through this single confirm gate before
  // anything actually changes — the switch itself doesn't move until the user confirms.
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);
  const [confirming, setConfirming] = useState(false);

  const applyHospitalToggle = async (next: boolean) => {
    if (!hospitalId || !hospitalData) return;
    setIsListed(next); // optimistic — reverted on failure below
    try {
      const response = await updateHospitalMutation.mutateAsync({
        name: hospitalData.name,
        type: hospitalData.type,
        email: hospitalData.email,
        contact: hospitalData.contact,
        alternateContact: hospitalData.alternateContact,
        website: hospitalData.website,
        location: hospitalData.location,
        city: hospitalData.city,
        state: hospitalData.state,
        country: hospitalData.country,
        pincode: hospitalData.pincode,
        registrationNumber: hospitalData.registrationNumber,
        timeZone: hospitalData.timeZone || '',
        gstin: hospitalData.gstin,
        pan: hospitalData.pan,
        nabhNumber: hospitalData.nabhNumber,
        isPubliclyListed: next,
      });

      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['hospital', hospitalId] });
        toast({
          title: next
            ? translate('publicDirectory.enabledTitle', 'Public directory enabled')
            : translate('publicDirectory.disabledTitle', 'Public directory disabled'),
        });
      } else {
        setIsListed(!next);
        toast({ variant: 'destructive', title: translate('publicDirectory.saveFailedTitle', 'Could not save'), description: response.message ?? '' });
      }
    } catch (e: any) {
      setIsListed(!next);
      toast({ variant: 'destructive', title: translate('publicDirectory.saveFailedTitle', 'Could not save'), description: e?.message ?? '' });
    }
  };

  // Per-doctor curation — only meaningful once the hospital itself has opted in above.
  const [doctors, setDoctors] = useState<(PublicDirectoryDoctorTile & { saving?: boolean })[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<PublicDirectoryDoctorTile | null>(null);
  const [reviewsDoctor, setReviewsDoctor] = useState<PublicDirectoryDoctorTile | null>(null);

  const loadDoctors = useCallback(async () => {
    if (!hospitalId) return;
    setDoctorsLoading(true);
    try {
      const res = await publicDirectoryDoctorsApi.listTiles(hospitalId);
      setDoctors((res?.doctors ?? []).map((d) => ({ ...d })));
    } catch {
      // non-fatal — list just stays empty, matches PublicApiClientConfig's old error handling
    } finally {
      setDoctorsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) => d.fullName?.toLowerCase().includes(q) || d.departmentName?.toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const applyDoctorToggle = async (doctorId: string, next: boolean) => {
    if (!hospitalId) return;
    setDoctors((prev) => prev.map((d) => (d.doctorId === doctorId ? { ...d, isPubliclyListed: next, saving: true } : d)));
    try {
      const response = await publicDirectoryDoctorsApi.updatePublicListing(hospitalId, doctorId, next);
      if (!response.success) {
        setDoctors((prev) => prev.map((d) => (d.doctorId === doctorId ? { ...d, isPubliclyListed: !next } : d)));
        toast({ variant: 'destructive', title: translate('publicDirectory.saveFailedTitle', 'Could not save'), description: response.message ?? '' });
      }
    } catch (e: any) {
      setDoctors((prev) => prev.map((d) => (d.doctorId === doctorId ? { ...d, isPubliclyListed: !next } : d)));
      toast({ variant: 'destructive', title: translate('publicDirectory.saveFailedTitle', 'Could not save'), description: e?.message ?? '' });
    } finally {
      setDoctors((prev) => prev.map((d) => (d.doctorId === doctorId ? { ...d, saving: false } : d)));
    }
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return;
    setConfirming(true);
    try {
      if (pendingToggle.kind === 'hospital') {
        await applyHospitalToggle(pendingToggle.next);
      } else {
        await applyDoctorToggle(pendingToggle.doctorId, pendingToggle.next);
      }
    } finally {
      setConfirming(false);
      setPendingToggle(null);
    }
  };

  const handlePrintQr = (doctor: PublicDirectoryDoctorTile) => {
    if (!hospitalData) return;
    const html = buildDoctorQrPosterA4(doctor, hospitalData.name, hospitalData.city || '');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Please allow pop-ups to print the QR poster.' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-800 max-sm:border-x-0 max-sm:border-t-0 max-sm:rounded-none max-sm:shadow-none max-sm:bg-white max-sm:dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {translate('publicDirectory.title', 'Online Listing')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {translate(
              'publicDirectory.description',
              "List your hospital's active doctors on NexEagle's platform-wide Find a Doctor page. Off by default — patients across the platform can only discover and book your doctors once you turn this on."
            )}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors duration-300',
                isListed
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : 'border-gray-200 dark:border-gray-800'
              )}
            >
              <div className="flex items-center gap-3">
                {isListed ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <Label htmlFor="public-directory-toggle" className="text-sm font-medium">
                    {translate('publicDirectory.toggleLabel', 'List this hospital publicly')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isListed
                      ? translate('publicDirectory.activeHint', 'Your doctors are visible on the public directory.')
                      : translate('publicDirectory.inactiveHint', 'Your doctors are not visible on the public directory.')}
                  </p>
                </div>
              </div>
              <Switch
                id="public-directory-toggle"
                checked={isListed}
                disabled={updateHospitalMutation.isPending}
                onCheckedChange={(next) => setPendingToggle({ kind: 'hospital', next })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-gray-800 max-sm:border-x-0 max-sm:border-t-0 max-sm:rounded-none max-sm:shadow-none max-sm:bg-white max-sm:dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {translate('publicDirectory.doctorsTitle', 'Doctors on the directory')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isListed
              ? translate('publicDirectory.doctorsDescription', 'Choose which of your doctors patients can find and book from the public directory, and keep their public profile up to date.')
              : translate('publicDirectory.doctorsDisabledHint', 'Turn on the public directory above before curating individual doctors.')}
          </p>
        </CardHeader>
        <CardContent className={!isListed ? 'opacity-50 pointer-events-none' : undefined}>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translate('publicDirectory.searchPlaceholder', 'Search doctors…')}
              className="pl-9"
              disabled={!isListed}
            />
          </div>

          {doctorsLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {translate('publicDirectory.noDoctors', 'No doctors found.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence initial={false}>
                {filteredDoctors.map((d, index) => {
                  return (
                    <motion.div
                      key={d.doctorId}
                      layout
                      initial={{ opacity: 0, y: 14, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03, ease: 'easeOut' }}
                      whileHover={{ y: -3 }}
                    >
                      <Card
                        className={cn(
                          'relative h-full overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg',
                          d.isPubliclyListed
                            ? 'border-emerald-200 dark:border-emerald-900'
                            : 'border-gray-200 dark:border-gray-800',
                          'max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none max-sm:border-b max-sm:border-t-0 max-sm:border-gray-200 max-sm:dark:border-gray-800'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute inset-x-0 top-0 h-1.5 transition-colors duration-300',
                            d.isPubliclyListed
                              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400'
                              : 'bg-gray-200 dark:bg-gray-800'
                          )}
                        />
                        <CardContent className="p-4 pt-5 space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                className={cn(
                                  'h-16 w-16 ring-2 ring-offset-2 ring-offset-background transition-all duration-300',
                                  d.isPubliclyListed ? 'ring-emerald-400/70' : 'ring-transparent'
                                )}
                              >
                                <AvatarImage src={d.photoUrl || undefined} alt={d.fullName || ''} />
                                <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200 font-semibold text-base">
                                  {initialsFor(d.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold leading-tight truncate">
                                  {d.fullName || translate('publicDirectory.unnamedDoctor', 'Unnamed doctor')}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {d.departmentName || translate('publicDirectory.tile.speciality', 'Speciality')}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setReviewsDoctor(d)}
                                  className="flex items-center gap-1 text-xs font-medium mt-1.5 -ml-1 rounded-full px-1.5 py-0.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                >
                                  <Star
                                    className={cn(
                                      'h-3 w-3',
                                      d.reviewCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                                    )}
                                  />
                                  <span className={d.reviewCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                    {(d.rating ?? 0).toFixed(1)}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-muted-foreground font-normal underline decoration-dotted underline-offset-2">
                                    <MessageSquare className="h-3 w-3" />
                                    {translate('publicDirectory.tile.reviewsCount', '{{count}} reviews').replace('{{count}}', String(d.reviewCount))}
                                  </span>
                                </button>
                              </div>
                            </div>
                            <Badge
                              variant={d.isPubliclyListed ? 'default' : 'outline'}
                              className={cn(
                                'shrink-0 gap-1 text-[10px] px-2 py-0.5',
                                d.isPubliclyListed && 'bg-emerald-500 hover:bg-emerald-500 text-white border-transparent'
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-block h-1.5 w-1.5 rounded-full',
                                  d.isPubliclyListed ? 'bg-white animate-pulse' : 'bg-muted-foreground/50'
                                )}
                              />
                              {d.isPubliclyListed
                                ? translate('publicDirectory.tile.live', 'Live')
                                : translate('publicDirectory.tile.hidden', 'Hidden')}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 p-3">
                            <FieldRow
                              icon={Stethoscope}
                              label={translate('publicDirectory.tile.speciality', 'Speciality')}
                              value={d.departmentName || '—'}
                            />
                            {d.qualification && (
                              <FieldRow
                                icon={GraduationCap}
                                label={translate('publicDirectory.tile.qualification', 'Qualification')}
                                value={d.qualification}
                              />
                            )}
                            {d.experienceYears != null && (
                              <FieldRow
                                icon={Award}
                                label={translate('publicDirectory.tile.experience', 'Experience')}
                                value={translate('publicDirectory.tile.experienceYears', '{{count}} years').replace('{{count}}', String(d.experienceYears))}
                              />
                            )}
                            {d.licenseNumber && (
                              <FieldRow
                                icon={BadgeCheck}
                                label={translate('publicDirectory.tile.licenseNo', 'License No')}
                                value={d.licenseNumber}
                              />
                            )}
                            {d.specializations.length > 0 && (
                              <FieldRow
                                icon={Tags}
                                label={translate('publicDirectory.tile.focusAreas', 'Focus Areas')}
                                value={d.specializations.join(', ')}
                              />
                            )}
                            {d.languages.length > 0 && (
                              <FieldRow
                                icon={LanguagesIcon}
                                label={translate('publicDirectory.tile.languagesSpoken', 'Languages Spoken')}
                                value={d.languages.join(', ')}
                              />
                            )}
                            {d.publicContactEmail && (
                              <FieldRow
                                icon={Mail}
                                label={translate('publicDirectory.tile.email', 'Email')}
                                value={<span className="break-all">{d.publicContactEmail}</span>}
                              />
                            )}
                            {d.publicContactPhone && (
                              <FieldRow
                                icon={Phone}
                                label={translate('publicDirectory.tile.phone', 'Phone')}
                                value={d.publicContactPhone}
                              />
                            )}
                          </div>

                          {d.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-brand-200 dark:border-brand-800 pl-2.5">
                              {d.bio}
                            </p>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                            <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
                              <Button
                                variant="outline"
                                className="flex-1 gap-2 h-11 sm:h-9 text-sm"
                                onClick={() => setEditingDoctor(d)}
                              >
                                <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                {translate('publicDirectory.tile.edit', 'Edit profile')}
                              </Button>
                              <Button
                                variant="outline"
                                className="px-3 h-11 sm:h-9"
                                title={translate('publicDirectory.tile.printQr', 'Print QR Poster')}
                                onClick={() => handlePrintQr(d)}
                              >
                                <Printer className="h-5 w-5 sm:h-4 sm:w-4 text-brand-600" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between sm:justify-center gap-2 rounded-xl sm:rounded-full border border-gray-200 dark:border-gray-800 px-4 sm:px-3 py-1.5 h-11 sm:h-auto w-full sm:w-auto">
                              <span className="text-[13px] sm:text-[11px] font-medium text-muted-foreground">
                                {translate('publicDirectory.tile.public', 'Public')}
                              </span>
                              <Switch
                                checked={d.isPubliclyListed}
                                disabled={!isListed || d.saving}
                                onCheckedChange={(checked) =>
                                  setPendingToggle({
                                    kind: 'doctor',
                                    doctorId: d.doctorId,
                                    doctorName: d.fullName || translate('publicDirectory.unnamedDoctor', 'Unnamed doctor'),
                                    next: checked,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDoctorTileDialog
        open={editingDoctor !== null}
        onOpenChange={(open) => !open && setEditingDoctor(null)}
        doctor={editingDoctor}
        hospitalId={hospitalId || ''}
        onSaved={loadDoctors}
      />

      <DoctorReviewsDialog
        open={reviewsDoctor !== null}
        onOpenChange={(open) => !open && setReviewsDoctor(null)}
        doctor={reviewsDoctor}
        hospitalId={hospitalId || ''}
        onReviewsChanged={loadDoctors}
      />

      <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => !open && !confirming && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.kind === 'hospital'
                ? pendingToggle.next
                  ? translate('publicDirectory.confirm.hospitalOnTitle', 'List this hospital publicly?')
                  : translate('publicDirectory.confirm.hospitalOffTitle', 'Remove this hospital from the public directory?')
                : pendingToggle?.next
                  ? translate('publicDirectory.confirm.doctorOnTitle', 'List {{name}} publicly?').replace('{{name}}', pendingToggle.doctorName)
                  : translate('publicDirectory.confirm.doctorOffTitle', 'Remove {{name}} from the public directory?').replace(
                      '{{name}}',
                      pendingToggle?.kind === 'doctor' ? pendingToggle.doctorName : ''
                    )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.kind === 'hospital'
                ? pendingToggle.next
                  ? translate(
                      'publicDirectory.confirm.hospitalOnDescription',
                      "Patients across NexEagle's platform will be able to discover and book any doctor you've individually listed below."
                    )
                  : translate(
                      'publicDirectory.confirm.hospitalOffDescription',
                      'Every one of your doctors will immediately disappear from the public directory, even the ones individually listed below.'
                    )
                : pendingToggle?.next
                  ? translate(
                      'publicDirectory.confirm.doctorOnDescription',
                      'Patients will be able to find and book this doctor from the public directory right away.'
                    )
                  : translate(
                      'publicDirectory.confirm.doctorOffDescription',
                      'This doctor will no longer be discoverable or bookable from the public directory.'
                    )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-2 mt-4 space-x-2 space-y-0">
            <AlertDialogCancel disabled={confirming} className="flex-1 sm:flex-none mt-0 rounded-xl h-10 text-xs font-semibold">
              {translate('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle} disabled={confirming} className="flex-1 sm:flex-none rounded-xl h-10 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
              {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {translate('publicDirectory.confirm.action', 'Yes, continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
