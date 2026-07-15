import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, GraduationCap, Loader2, Pencil, Search, Star, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { publicDirectoryDoctorsApi, type PublicDirectoryDoctorTile } from '@/features/hospital/services/publicDirectoryDoctorsApi';
import { EditDoctorTileDialog } from './EditDoctorTileDialog';

const initialsFor = (name?: string | null) => {
  const cleaned = (name || '').replace(/^Dr\.?\s*/i, '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
};

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

  const handleToggle = async (next: boolean) => {
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

  const handleDoctorToggle = async (doctorId: string, next: boolean) => {
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
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
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
              <Switch
                id="public-directory-toggle"
                checked={isListed}
                disabled={updateHospitalMutation.isPending}
                onCheckedChange={handleToggle}
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
              {filteredDoctors.map((d) => (
                <Card key={d.doctorId} className="border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={d.photoUrl || undefined} alt={d.fullName || ''} />
                          <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200 font-semibold">
                            {initialsFor(d.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium truncate">
                              {d.fullName || translate('publicDirectory.unnamedDoctor', 'Unnamed doctor')}
                            </p>
                            {d.reviewCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground shrink-0">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {d.rating?.toFixed(1)}
                                <span>({d.reviewCount})</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{d.departmentName || '—'}</p>
                        </div>
                      </div>
                      <Switch
                        checked={d.isPubliclyListed}
                        disabled={!isListed || d.saving}
                        onCheckedChange={(checked) => handleDoctorToggle(d.doctorId, checked)}
                      />
                    </div>

                    {(d.licenseNumber || d.qualification || d.experienceYears != null) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {d.qualification && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {d.qualification}
                          </span>
                        )}
                        {d.experienceYears != null && (
                          <span>
                            {translate('publicDirectory.tile.experienceYears', '{{count}} yrs experience').replace('{{count}}', String(d.experienceYears))}
                          </span>
                        )}
                        {d.licenseNumber && (
                          <span>{translate('publicDirectory.tile.license', 'Lic. {{number}}').replace('{{number}}', d.licenseNumber)}</span>
                        )}
                      </div>
                    )}

                    {d.bio && <p className="text-xs text-muted-foreground line-clamp-2">{d.bio}</p>}

                    {(d.specializations.length > 0 || d.languages.length > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {d.specializations.slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5">{s}</Badge>
                        ))}
                        {d.languages.slice(0, 3).map((l) => (
                          <Badge key={l} variant="outline" className="text-[10px] px-2 py-0.5">{l}</Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setEditingDoctor(d)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {translate('publicDirectory.tile.edit', 'Edit profile')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
    </div>
  );
};
