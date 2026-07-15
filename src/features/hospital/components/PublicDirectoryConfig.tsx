import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Globe,
  GraduationCap,
  Languages as LanguagesIcon,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Stethoscope,
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
import { cn } from '@/lib/utils';

const initialsFor = (name?: string | null) => {
  const cleaned = (name || '').replace(/^Dr\.?\s*/i, '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
};

type PendingToggle =
  | { kind: 'hospital'; next: boolean }
  | { kind: 'doctor'; doctorId: string; doctorName: string; next: boolean };

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

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {translate('publicDirectory.title', 'Public Doctor Directory')}
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

      <Card className="border-gray-200 dark:border-gray-800">
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
                  const hasContact = Boolean(d.publicContactEmail || d.publicContactPhone);
                  const hasStats = Boolean(d.licenseNumber || d.qualification || d.experienceYears != null);
                  const hasTags = d.specializations.length > 0 || d.languages.length > 0;

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
                          'relative h-full overflow-hidden border shadow-sm transition-colors duration-300 hover:shadow-md',
                          d.isPubliclyListed
                            ? 'border-emerald-200 dark:border-emerald-900'
                            : 'border-gray-200 dark:border-gray-800'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute inset-x-0 top-0 h-1 transition-colors duration-300',
                            d.isPubliclyListed ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                          )}
                        />
                        <CardContent className="p-4 pt-5 space-y-3.5">
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
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{d.departmentName || '—'}</p>
                                {d.reviewCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {d.rating?.toFixed(1)}
                                    <span className="text-muted-foreground font-normal">({d.reviewCount})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={d.isPubliclyListed ? 'default' : 'outline'}
                              className={cn(
                                'shrink-0 text-[10px] px-2 py-0.5',
                                d.isPubliclyListed && 'bg-emerald-500 hover:bg-emerald-500 text-white border-transparent'
                              )}
                            >
                              {d.isPubliclyListed
                                ? translate('publicDirectory.tile.live', 'Live')
                                : translate('publicDirectory.tile.hidden', 'Hidden')}
                            </Badge>
                          </div>

                          {hasStats && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground border-y border-dashed border-gray-200 dark:border-gray-800 py-2">
                              {d.qualification && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {d.qualification}
                                </span>
                              )}
                              {d.experienceYears != null && (
                                <span className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {translate('publicDirectory.tile.experienceYears', '{{count}} yrs experience').replace('{{count}}', String(d.experienceYears))}
                                </span>
                              )}
                              {d.licenseNumber && (
                                <span>{translate('publicDirectory.tile.license', 'Lic. {{number}}').replace('{{number}}', d.licenseNumber)}</span>
                              )}
                            </div>
                          )}

                          {d.bio && <p className="text-xs text-muted-foreground line-clamp-2">{d.bio}</p>}

                          {hasTags && (
                            <div className="flex flex-wrap gap-1">
                              {d.specializations.slice(0, 3).map((s) => (
                                <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5">{s}</Badge>
                              ))}
                              {d.specializations.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">+{d.specializations.length - 3}</Badge>
                              )}
                              {d.languages.slice(0, 3).map((l) => (
                                <Badge key={l} variant="outline" className="text-[10px] px-2 py-0.5 gap-1">
                                  <LanguagesIcon className="h-2.5 w-2.5" />
                                  {l}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {hasContact && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {d.publicContactEmail && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {d.publicContactEmail}
                                </span>
                              )}
                              {d.publicContactPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {d.publicContactPhone}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => setEditingDoctor(d)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {translate('publicDirectory.tile.edit', 'Edit profile')}
                            </Button>
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-2.5 py-1.5">
                              <span className="text-[11px] font-medium text-muted-foreground">
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>
              {translate('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle} disabled={confirming} className="gap-2">
              {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {translate('publicDirectory.confirm.action', 'Yes, continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
