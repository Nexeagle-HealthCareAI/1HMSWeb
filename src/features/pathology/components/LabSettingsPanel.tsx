import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store';
import { pathologyService } from '../services/pathologyService';
import { hospitalApi, HospitalData } from '@/features/hospital/services/hospitalApi';
import { Loader2, UserCheck, Globe, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';

// Lab-wide identity/sign-off settings (moved out of ReportLetterheadConfig.tsx into its own nav
// tab) + the Doctor Dekho public-listing opt-in. Both live on the same LabConfiguration row as
// letterhead settings, so every save here re-fetches the current row and spreads it into the write
// -- LabConfiguration's update command is a full-row overwrite with no partial-patch semantics, so
// omitting a field this screen doesn't own would silently blank it out.
export const LabSettingsPanel: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalData | null>(null);

  const [labName, setLabName] = useState('');
  const [labAddress, setLabAddress] = useState('');
  const [labRegistrationNumber, setLabRegistrationNumber] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [pathologistName, setPathologistName] = useState('');
  const [technicianNameTouched, setTechnicianNameTouched] = useState(false);

  const [isPubliclyListed, setIsPubliclyListed] = useState(false);
  const [publicDescription, setPublicDescription] = useState('');
  const [publicContactPhone, setPublicContactPhone] = useState('');
  const [publicContactEmail, setPublicContactEmail] = useState('');
  const [labCity, setLabCity] = useState('');
  const [labState, setLabState] = useState('');
  const [labPincode, setLabPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [testCategoriesInput, setTestCategoriesInput] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      pathologyService.getLabConfig(hospitalId),
      hospitalApi.getHospitalById(hospitalId).catch(() => null),
    ]).then(([config, hospital]) => {
      if (cancelled) return;
      setLabName(config.labName ?? '');
      setLabAddress(config.labAddress ?? '');
      setLabRegistrationNumber(config.labRegistrationNumber ?? '');
      setTechnicianName(config.technicianName ?? '');
      setPathologistName(config.pathologistName ?? '');
      setIsPubliclyListed(!!config.isPubliclyListed);
      setPublicDescription(config.publicDescription ?? '');
      setPublicContactPhone(config.publicContactPhone ?? '');
      setPublicContactEmail(config.publicContactEmail ?? '');
      setLabCity(config.labCity ?? '');
      setLabState(config.labState ?? '');
      setLabPincode(config.labPincode ?? '');
      setLatitude(config.latitude != null ? String(config.latitude) : '');
      setLongitude(config.longitude != null ? String(config.longitude) : '');
      let categories: string[] = [];
      try { categories = config.testCategoriesJson ? JSON.parse(config.testCategoriesJson) : []; } catch { categories = []; }
      setTestCategoriesInput(categories.join(', '));
      setHospitalProfile(hospital);
    }).catch((error) => {
      console.error('Failed to fetch lab configuration:', error);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [hospitalId]);

  // Same address composition defaultLetterhead.ts's footer uses, so the placeholder shown here
  // matches exactly what would print if Lab Address is left blank.
  const hospitalAddressPlaceholder = hospitalProfile
    ? [hospitalProfile.location, hospitalProfile.city, [hospitalProfile.state, hospitalProfile.pincode].filter(Boolean).join(' - ')].filter(Boolean).join(', ')
    : '';

  // Reads the browser's own GPS/network location (a permission prompt on first use) rather than
  // requiring the lab to look up and manually type coordinates -- most people configuring this from
  // the lab itself, so the device's current position is the right pin almost every time.
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location detection is not supported by this browser');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        toast.success('Location detected', { description: 'Latitude/Longitude filled in below -- remember to Save Changes.' });
        setIsDetectingLocation(false);
      },
      (error) => {
        toast.error('Could not detect location', { description: error.message || 'Check your browser\'s location permission for this site.' });
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!hospitalId) return;
    if (!technicianName.trim()) {
      setTechnicianNameTouched(true);
      toast.error('Technician Name is required', { description: 'Set who is accountable for reports from this lab before saving.' });
      return;
    }
    const lat = latitude.trim() ? Number(latitude) : undefined;
    const lng = longitude.trim() ? Number(longitude) : undefined;
    if (latitude.trim() && Number.isNaN(lat)) {
      toast.error('Latitude must be a number');
      return;
    }
    if (longitude.trim() && Number.isNaN(lng)) {
      toast.error('Longitude must be a number');
      return;
    }
    setIsSaving(true);
    try {
      const current = await pathologyService.getLabConfig(hospitalId);
      const testCategories = testCategoriesInput.split(',').map(s => s.trim()).filter(Boolean);
      await pathologyService.updateLabConfig(hospitalId, {
        ...current,
        labName: labName.trim() || undefined,
        labAddress: labAddress.trim() || undefined,
        labRegistrationNumber: labRegistrationNumber.trim() || undefined,
        technicianName: technicianName.trim(),
        pathologistName: pathologistName.trim() || undefined,
        isPubliclyListed,
        publicDescription: publicDescription.trim() || undefined,
        publicContactPhone: publicContactPhone.trim() || undefined,
        publicContactEmail: publicContactEmail.trim() || undefined,
        labCity: labCity.trim() || undefined,
        labState: labState.trim() || undefined,
        labPincode: labPincode.trim() || undefined,
        latitude: lat,
        longitude: lng,
        testCategoriesJson: testCategories.length > 0 ? JSON.stringify(testCategories) : undefined,
      });
      toast.success('Saved', { description: 'Lab settings updated.' });
    } catch (error) {
      console.error('Failed to save lab settings', error);
      toast.error('Save failed', { description: 'Could not save lab settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Loading lab settings...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Lab Identity &amp; Sign-off
          </CardTitle>
          <CardDescription>Shown on every generated report when using the system default letterhead.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lab-name">Lab Name</Label>
            <Input
              id="lab-name"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder={hospitalProfile?.name || 'Lab name'}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use your hospital's own name{hospitalProfile?.name ? ` (${hospitalProfile.name})` : ''}.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-address">Lab Address</Label>
            <Textarea
              id="lab-address"
              value={labAddress}
              onChange={(e) => setLabAddress(e.target.value)}
              placeholder={hospitalAddressPlaceholder || 'Lab address'}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use your hospital's own address.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-reg">Lab Registration Number</Label>
            <Input
              id="lab-reg"
              value={labRegistrationNumber}
              onChange={(e) => setLabRegistrationNumber(e.target.value)}
              placeholder={hospitalProfile?.registrationNumber || 'Registration number'}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use your hospital's own registration number.</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="technician-name">
              Technician Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="technician-name"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              onBlur={() => setTechnicianNameTouched(true)}
              placeholder="e.g. Rajesh Kumar"
              className={technicianNameTouched && !technicianName.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {technicianNameTouched && !technicianName.trim() ? (
              <p className="text-xs text-destructive">Required before this lab can start creating new orders.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Printed as the manual sign-off name on every report.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pathologist-name">Pathologist Name</Label>
            <Input
              id="pathologist-name"
              value={pathologistName}
              onChange={(e) => setPathologistName(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">Leave blank if no pathologist reviews reports at this lab.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Online Listing (Doctor Dekho)
          </CardTitle>
          <CardDescription>
            List this lab on NexEagle's patient-facing Doctor Dekho directory -- independent of whether
            your hospital is separately listed for doctor consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">List this lab publicly</p>
              <p className="text-xs text-muted-foreground">Patients can find, view, and get directions to this lab.</p>
            </div>
            <Switch checked={isPubliclyListed} onCheckedChange={setIsPubliclyListed} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="public-description">About this lab</Label>
            <Textarea
              id="public-description"
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              placeholder="A short description patients will see on your lab's public page."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="public-phone">Public Contact Phone</Label>
              <Input id="public-phone" value={publicContactPhone} onChange={(e) => setPublicContactPhone(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="public-email">Public Contact Email</Label>
              <Input id="public-email" type="email" value={publicContactEmail} onChange={(e) => setPublicContactEmail(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lab-city">City</Label>
              <Input id="lab-city" value={labCity} onChange={(e) => setLabCity(e.target.value)} placeholder={hospitalProfile?.city || 'City'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-state">State</Label>
              <Input id="lab-state" value={labState} onChange={(e) => setLabState(e.target.value)} placeholder={hospitalProfile?.state || 'State'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-pincode">Pincode</Label>
              <Input id="lab-pincode" value={labPincode} onChange={(e) => setLabPincode(e.target.value)} placeholder={hospitalProfile?.pincode || 'Pincode'} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Used for search on Doctor Dekho -- leave blank to use your hospital's own city/state/pincode.</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>GPS Location</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingLocation}
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {isDetectingLocation ? 'Detecting...' : 'Use my current location'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lab-lat" className="text-xs text-muted-foreground font-normal">Latitude</Label>
                <Input id="lab-lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-lng" className="text-xs text-muted-foreground font-normal">Longitude</Label>
                <Input id="lab-lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Powers "Get Directions" on your lab's public page. You can also type coordinates manually.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="test-categories">Test Categories</Label>
            <Input
              id="test-categories"
              value={testCategoriesInput}
              onChange={(e) => setTestCategoriesInput(e.target.value)}
              placeholder="e.g. Hematology, Biochemistry, Microbiology"
            />
            <p className="text-xs text-muted-foreground">Comma-separated. Shown as tags on your lab's public page.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabSettingsPanel;
