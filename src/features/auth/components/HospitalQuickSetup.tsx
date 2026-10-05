import React, { useState } from 'react';
import { Building2, LocateFixed, Loader2, Gift, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export interface QuickHospitalData {
  name: string;
  type: string;
  registrationNumber: string;
  contact: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  referralCode: string;
}

export const emptyQuickHospital = (contact = ''): QuickHospitalData => ({
  name: '', type: '', registrationNumber: '', contact, location: '', city: '', state: '', country: 'India', pincode: '', referralCode: '',
});

const HOSPITAL_TYPES = ['Hospital', 'Clinic', 'Medical Center', 'Nursing Home', 'Diagnostic Center', 'Dental Clinic', 'Eye Clinic', 'Other'];

type FieldErrors = Partial<Record<keyof QuickHospitalData | 'gps', string>>;

/** Step 1 of the hospital details: who they are. */
export const validateHospitalBasics = (d: QuickHospitalData): FieldErrors => {
  const e: FieldErrors = {};
  if (d.name.trim().length < 2) e.name = 'Enter the hospital or clinic name';
  if (!d.type) e.type = 'Select a type';
  if (!/^[+]?[0-9\s-]{8,15}$/.test(d.contact.trim())) e.contact = 'Enter a valid contact number';
  return e;
};

/** Step 2 of the hospital details: where they are (the map pin and the address). */
export const validateHospitalLocation = (d: QuickHospitalData): FieldErrors => {
  const e: FieldErrors = {};
  if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number'
    || d.latitude < -90 || d.latitude > 90 || d.longitude < -180 || d.longitude > 180) e.gps = 'Pin the hospital location on the map';
  if (!d.location.trim()) e.location = 'Enter the address';
  if (!d.city.trim()) e.city = 'Enter the city';
  if (!d.state.trim()) e.state = 'Enter the state';
  if (!d.country.trim()) e.country = 'Enter the country';
  if (!/^\d{4,10}$/.test(d.pincode.trim())) e.pincode = 'Enter a valid pincode';
  return e;
};

/** Everything the quick registration needs; the parent re-checks this before submitting. */
export const validateQuickHospital = (d: QuickHospitalData): FieldErrors => ({ ...validateHospitalBasics(d), ...validateHospitalLocation(d) });

interface StepProps {
  data: QuickHospitalData;
  onChange: (patch: Partial<QuickHospitalData>) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Shared error plumbing: a field's message clears as soon as the person edits it.
const useFieldErrors = (onChange: StepProps['onChange']) => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (patch: Partial<QuickHospitalData>) => {
    onChange(patch);
    setErrors(prev => {
      const next = { ...prev };
      (Object.keys(patch) as (keyof QuickHospitalData)[]).forEach(k => { delete next[k]; });
      if ('latitude' in patch || 'longitude' in patch) delete next.gps;
      return next;
    });
  };
  const err = (k: keyof FieldErrors) => (errors[k] ? <div className="text-xs text-red-600 mt-1">{errors[k]}</div> : null);
  const border = (k: keyof FieldErrors) => (errors[k] ? 'border-red-500' : '');
  return { errors, setErrors, set, err, border };
};

// ───────────────────────────── Step: hospital details ─────────────────────────────

export const HospitalBasicsStep: React.FC<StepProps> = ({ data, onChange, onNext, onBack, isLoading = false }) => {
  const { setErrors, set, err, border } = useFieldErrors(onChange);
  const [showReferral, setShowReferral] = useState(!!data.referralCode);

  const next = () => {
    const found = validateHospitalBasics(data);
    setErrors(found);
    if (Object.keys(found).length === 0) onNext();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Your Hospital
        </h2>
        <p className="text-xs text-gray-600">Tell us about your hospital or clinic. You can change anything later in Settings.</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Hospital / clinic name <span className="text-red-500">*</span></Label>
        <Input value={data.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. City Care Hospital" maxLength={150} className={`h-10 text-sm ${border('name')}`} disabled={isLoading} />
        {err('name')}
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Type <span className="text-red-500">*</span></Label>
        <Select value={data.type} onValueChange={v => set({ type: v })} disabled={isLoading}>
          <SelectTrigger className={`h-10 text-sm ${border('type')}`}><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>{HOSPITAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        {err('type')}
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Contact number <span className="text-red-500">*</span></Label>
        <Input value={data.contact} onChange={e => set({ contact: e.target.value })} inputMode="tel" placeholder="Hospital phone" className={`h-10 text-sm ${border('contact')}`} disabled={isLoading} />
        {err('contact')}
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Registration number <span className="text-muted-foreground font-normal">(optional, add later if you don't have it handy)</span></Label>
        <Input value={data.registrationNumber} onChange={e => set({ registrationNumber: e.target.value })} maxLength={60} className="h-10 text-sm" disabled={isLoading} />
      </div>

      {showReferral ? (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Referral code <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={data.referralCode} onChange={e => set({ referralCode: e.target.value.toUpperCase() })} maxLength={40} className="h-10 text-sm" disabled={isLoading} />
        </div>
      ) : (
        <button type="button" onClick={() => setShowReferral(true)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <Gift className="h-3.5 w-3.5" /> Have a referral code?
        </button>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1 h-10 text-sm">Back</Button>
        <Button type="button" onClick={next} disabled={isLoading} className="flex-1 h-10 text-sm bg-primary text-white">Continue</Button>
      </div>
    </div>
  );
};

// ───────────────────────────── Step: hospital location ─────────────────────────────

// Fills address / city / state / country / pincode from a pin so the user mostly just checks them.
const reverseGeocode = async (lat: number, lng: number): Promise<Partial<QuickHospitalData> | null> => {
  if (!MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=en`);
    const feature = (await res.json())?.features?.[0];
    if (!feature) return null;
    const parts: { id: string; text: string }[] = [{ id: feature.id as string, text: feature.text as string }, ...((feature.context as { id: string; text: string }[]) ?? [])];
    const pick = (...prefixes: string[]) => parts.find(p => prefixes.some(prefix => p.id?.startsWith(prefix)))?.text ?? '';
    return {
      location: (feature.place_name as string) ?? '',
      city: pick('place', 'locality', 'district'),
      state: pick('region'),
      country: pick('country'),
      pincode: pick('postcode'),
    };
  } catch {
    return null;
  }
};

export const HospitalLocationStep: React.FC<StepProps> = ({ data, onChange, onNext, onBack, isLoading = false }) => {
  const { setErrors, set, err, border } = useFieldErrors(onChange);
  const [locating, setLocating] = useState(false);
  const [filling, setFilling] = useState(false);

  const handleLocation = async (lat: number, lng: number) => {
    set({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
    setFilling(true);
    const address = await reverseGeocode(lat, lng);
    if (address) {
      // only overwrite with something the lookup actually found
      const patch: Partial<QuickHospitalData> = {};
      (Object.entries(address) as [keyof QuickHospitalData, string][]).forEach(([k, v]) => { if (v) (patch as Record<string, string>)[k] = v; });
      set(patch);
    }
    setFilling(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); void handleLocation(pos.coords.latitude, pos.coords.longitude); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const next = () => {
    const found = validateHospitalLocation(data);
    setErrors(found);
    if (Object.keys(found).length === 0) onNext();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> Hospital Location
        </h2>
        <p className="text-xs text-gray-600">Search your address or drop a pin on the map. We fill in the address for you to check.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-medium">Location on map <span className="text-red-500">*</span></Label>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={useCurrentLocation} disabled={locating || isLoading}>
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use my current location
          </Button>
        </div>
        {/* cooperativeGestures: one finger scrolls the page past the map, two fingers move it (otherwise the map swallows the scroll) */}
        <MapLocationPicker latitude={data.latitude} longitude={data.longitude} onLocationChange={handleLocation} disabled={isLoading}
          searchPlaceholder="Search your hospital's address..." cooperativeGestures />
        {err('gps')}
        {filling && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Filling the address from the pin...</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Address <span className="text-red-500">*</span></Label>
        <Input value={data.location} onChange={e => set({ location: e.target.value })} placeholder="Street, area" className={`h-10 text-sm ${border('location')}`} disabled={isLoading} />
        {err('location')}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">City <span className="text-red-500">*</span></Label>
          <Input value={data.city} onChange={e => set({ city: e.target.value })} className={`h-10 text-sm ${border('city')}`} disabled={isLoading} />
          {err('city')}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">State <span className="text-red-500">*</span></Label>
          <Input value={data.state} onChange={e => set({ state: e.target.value })} className={`h-10 text-sm ${border('state')}`} disabled={isLoading} />
          {err('state')}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Country <span className="text-red-500">*</span></Label>
          <Input value={data.country} onChange={e => set({ country: e.target.value })} className={`h-10 text-sm ${border('country')}`} disabled={isLoading} />
          {err('country')}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Pincode <span className="text-red-500">*</span></Label>
          <Input value={data.pincode} onChange={e => set({ pincode: e.target.value.replace(/\D/g, '') })} inputMode="numeric" maxLength={10} className={`h-10 text-sm ${border('pincode')}`} disabled={isLoading} />
          {err('pincode')}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1 h-10 text-sm">Back</Button>
        <Button type="button" onClick={next} disabled={isLoading} className="flex-1 h-10 text-sm bg-primary text-white">Continue</Button>
      </div>
    </div>
  );
};
