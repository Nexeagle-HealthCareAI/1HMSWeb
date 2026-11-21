import React, { useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Clock, Loader2, ShieldAlert, Siren } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import {
  EMERGENCY_CAPABILITIES,
  emergencySettingsApi,
  saveError,
  type EmergencySettings,
  type EmergencySettingsResponse,
} from '../services/emergencySettingsApi';

// Settings -> Emergency takeover (Vita, vision Phase 3). When a Doctor Dekho patient's message looks like an emergency, Vita
// shows the nearest emergency-ready hospitals with their numbers and sends them a "possible emergency nearby" alert (WhatsApp
// and a CRITICAL alert here). This hospital appears only while switched on AND verified by the Doctor Dekho team; changing the
// numbers, pin or hours sends it back for checking. Only a hospital admin can save (the API enforces it).

// Summary of the takeover terms. The binding text is pending legal review (vision open question); the version the hospital
// accepts is recorded with the date and the admin who accepted.
const TERMS = [
  'Doctor Dekho may show this hospital, its emergency numbers and its distance to patients whose message suggests an emergency nearby.',
  'The hospital agrees to receive "possible emergency nearby" alerts on the WhatsApp number below and in 1HMS, at any hour it is listed as open.',
  'The numbers given are answered by staff who can receive an emergency patient. The hospital keeps them, its hours and its map pin up to date.',
  'An alert is a notice, not a referral: the patient may or may not arrive. A patient\'s own number is shared only when the patient agrees.',
  'The hospital can switch the takeover off at any time; it stops appearing and receiving alerts at once.',
];

type Form = {
  isEnabled: boolean;
  emergencyPhone: string;
  alternatePhone: string;
  alertWhatsApp: string;
  latitude?: number;
  longitude?: number;
  landmark: string;
  address: string;
  city: string;
  is24x7: boolean;
  openTime: string;
  closeTime: string;
  capabilities: string[];
  dutyContactName: string;
  dutyContactPhone: string;
};

const toForm = (s?: EmergencySettings | null): Form => ({
  isEnabled: s?.isEnabled ?? false,
  emergencyPhone: s?.emergencyPhone ?? '',
  alternatePhone: s?.alternatePhone ?? '',
  alertWhatsApp: s?.alertWhatsApp ?? '',
  latitude: s?.latitude ?? undefined,
  longitude: s?.longitude ?? undefined,
  landmark: s?.landmark ?? '',
  address: s?.address ?? '',
  city: s?.city ?? '',
  is24x7: s?.is24x7 ?? true,
  openTime: s?.openTime ?? '',
  closeTime: s?.closeTime ?? '',
  capabilities: s?.capabilities ?? [],
  dutyContactName: s?.dutyContactName ?? '',
  dutyContactPhone: s?.dutyContactPhone ?? '',
});

const STATUS: Record<string, { label: string; className: string; Icon: React.ElementType; note: string }> = {
  NEW: { label: 'Not set up', className: 'bg-slate-100 text-slate-700', Icon: Siren, note: 'Fill this in and save. The Doctor Dekho team will check the details before patients see your hospital.' },
  PENDING: { label: 'Waiting for verification', className: 'bg-amber-100 text-amber-800', Icon: Clock, note: 'The Doctor Dekho team is checking the details (they may call the emergency number). Patients do not see your hospital until then.' },
  VERIFIED: { label: 'Verified', className: 'bg-emerald-100 text-emerald-800', Icon: BadgeCheck, note: 'Checked by the Doctor Dekho team.' },
  REJECTED: { label: 'Needs changes', className: 'bg-red-100 text-red-800', Icon: ShieldAlert, note: 'The Doctor Dekho team could not verify the details. Fix them and save to send them again.' },
};

export const EmergencyTakeoverConfig: React.FC = () => {
  const { hospitalId } = useAuthStore();
  const { toast } = useToast();
  const [data, setData] = useState<EmergencySettingsResponse | null>(null);
  const [form, setForm] = useState<Form>(toForm());
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    let live = true;
    setLoading(true);
    emergencySettingsApi.get(hospitalId)
      .then((r) => {
        if (!live) return;
        setData(r);
        setForm(toForm(r.settings));
      })
      .catch((e) => live && setError(saveError(e)))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [hospitalId]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleCapability = (id: string) =>
    set('capabilities', form.capabilities.includes(id) ? form.capabilities.filter((c) => c !== id) : [...form.capabilities, id]);

  const settings = data?.settings;
  const termsCurrent = !!settings?.termsVersion && settings.termsVersion === data?.currentTermsVersion;
  const status = STATUS[settings?.verificationStatus ?? 'NEW'] ?? STATUS.NEW;
  const listed = !!settings?.listed;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;
    setError(null);
    if (form.isEnabled && !termsCurrent && !acceptTerms) {
      setError('Accept the emergency takeover terms to switch it on.');
      return;
    }
    setSaving(true);
    try {
      const r = await emergencySettingsApi.save(hospitalId, {
        isEnabled: form.isEnabled,
        acceptTerms: acceptTerms && !termsCurrent,
        emergencyPhone: form.emergencyPhone,
        alternatePhone: form.alternatePhone || null,
        alertWhatsApp: form.alertWhatsApp || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        landmark: form.landmark || null,
        address: form.address || null,
        city: form.city || null,
        is24x7: form.is24x7,
        openTime: form.is24x7 ? null : form.openTime || null,
        closeTime: form.is24x7 ? null : form.closeTime || null,
        capabilities: form.capabilities,
        dutyContactName: form.dutyContactName || null,
        dutyContactPhone: form.dutyContactPhone || null,
      });
      setData(r);
      setForm(toForm(r.settings));
      setAcceptTerms(false);
      toast({ title: 'Emergency takeover saved', description: r.message ?? undefined });
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading emergency settings...
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4" aria-label="Emergency takeover">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Siren className="h-5 w-5 text-red-600" /> Emergency takeover
            <Badge className={status.className} variant="secondary">
              <status.Icon className="mr-1 h-3.5 w-3.5" /> {status.label}
            </Badge>
            {listed && <Badge className="bg-red-600 text-white">Shown to patients</Badge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            When a Doctor Dekho patient's message looks like an emergency, Vita shows the nearest emergency-ready hospitals with
            their numbers and alerts them: "Possible emergency (chest pain) detected 3.2 km from you at 14:05. The patient was shown
            your number." The alert comes on WhatsApp and as a critical alert here.
          </p>
          <p className="text-sm">{status.note}</p>
          {settings?.verificationNote && settings.verificationStatus !== 'VERIFIED' && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Note from the Doctor Dekho team: {settings.verificationNote}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="em-enabled" className="font-semibold">Show this hospital in emergencies</Label>
              <p className="text-xs text-muted-foreground">Switch off any time: the hospital stops appearing and receiving alerts at once.</p>
            </div>
            <Switch id="em-enabled" checked={form.isEnabled} onCheckedChange={(v) => set('isEnabled', v)} aria-label="Show this hospital in emergencies" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field id="em-phone" label="24x7 emergency phone *" value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} type="tel" />
            <Field id="em-alt" label="Alternate emergency phone" value={form.alternatePhone} onChange={(v) => set('alternatePhone', v)} type="tel" />
            <Field id="em-wa" label="WhatsApp number for alerts *" value={form.alertWhatsApp} onChange={(v) => set('alertWhatsApp', v)} type="tel"
              hint="10-digit mobile that is watched round the clock. Needed to switch on." />
            <Field id="em-landmark" label="Landmark" value={form.landmark} onChange={(v) => set('landmark', v)} hint="Helps a patient find the emergency gate." />
            <Field id="em-address" label="Emergency entrance address" value={form.address} onChange={(v) => set('address', v)} />
            <Field id="em-city" label="City" value={form.city} onChange={(v) => set('city', v)} />
            <Field id="em-duty" label="Duty contact person" value={form.dutyContactName} onChange={(v) => set('dutyContactName', v)} />
            <Field id="em-duty-phone" label="Duty contact phone" value={form.dutyContactPhone} onChange={(v) => set('dutyContactPhone', v)} type="tel" />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Map pin of the emergency entrance *</Label>
            <MapLocationPicker latitude={form.latitude} longitude={form.longitude}
              onLocationChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              searchPlaceholder="Search for the emergency entrance..." />
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="em-247" className="font-semibold">Emergency open 24x7</Label>
              <Switch id="em-247" checked={form.is24x7} onCheckedChange={(v) => set('is24x7', v)} aria-label="Emergency open 24x7" />
            </div>
            {!form.is24x7 && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="em-open" label="Opens" value={form.openTime} onChange={(v) => set('openTime', v)} type="time" />
                <Field id="em-close" label="Closes" value={form.closeTime} onChange={(v) => set('closeTime', v)} type="time"
                  hint="Overnight is fine (e.g. 20:00 to 08:00). Patients do not see the hospital while closed." />
              </div>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">What the emergency can handle</legend>
            <p className="text-xs text-muted-foreground">Puts the right hospital first for a heart, birth or child emergency, among hospitals nearly as close.</p>
            <div className="flex flex-wrap gap-3">
              {EMERGENCY_CAPABILITIES.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Checkbox checked={form.capabilities.includes(c.id)} onCheckedChange={() => toggleCapability(c.id)} aria-label={c.label} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-700" /> Emergency takeover terms (version {data?.currentTermsVersion})</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              {TERMS.map((t) => <li key={t}>{t}</li>)}
            </ul>
            {termsCurrent ? (
              <p className="text-xs text-emerald-800">Accepted{settings?.termsAcceptedAt ? ` on ${new Date(settings.termsAcceptedAt).toLocaleDateString()}` : ''}.</p>
            ) : (
              <label className="flex items-start gap-2">
                <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} aria-label="I accept the emergency takeover terms on behalf of this hospital" />
                <span>I accept the emergency takeover terms on behalf of this hospital</span>
              </label>
            )}
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

const Field: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }> = ({
  id, label, value, onChange, type = 'text', hint,
}) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} inputMode={type === 'tel' ? 'tel' : undefined} />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default EmergencyTakeoverConfig;
