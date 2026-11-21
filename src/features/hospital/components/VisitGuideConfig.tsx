import React, { useEffect, useState } from 'react';
import { Footprints, Loader2, MapPinOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { visitGuideApi, type VisitGuide } from '../services/visitGuideApi';
import { saveError } from '../services/emergencySettingsApi';

// Settings -> Hospital Info -> Patient visit guide (Vita, vision Phase 4 "After booking"). What a Doctor Dekho patient reads on the day
// of the visit: in the WhatsApp reminders ("directions"), on their visit page, and when they tell Vita "I've reached". Every field is
// optional; the patient then gets the general steps (go to the registration counter with the booking ID, pay at the counter).

type Field = { key: keyof VisitGuide; label: string; hint: string; max: number; long?: boolean };

const FIELDS: Field[] = [
  { key: 'landmark', label: 'Landmark', hint: 'Opposite City Centre, Salt Lake Sector 1', max: 200 },
  { key: 'entranceNote', label: 'Entrance to use', hint: 'Use Gate 2 on the main road', max: 300 },
  { key: 'registrationDesk', label: 'Registration counter', hint: 'Counter 3, ground floor, right of the main door', max: 300 },
  { key: 'opdLocation', label: 'OPD location', hint: '1st floor, left of the lift', max: 300 },
  { key: 'parkingNote', label: 'Parking', hint: 'Free parking in the basement', max: 300 },
  { key: 'paymentNote', label: 'Payment', hint: 'Cash, UPI and cards at the billing counter', max: 300 },
  { key: 'extraNote', label: 'Anything else', hint: 'Fasting needed for blood tests before 10 am', max: 500, long: true },
];

export const VisitGuideConfig: React.FC = () => {
  const { hospitalId } = useAuthStore();
  const { toast } = useToast();
  const [guide, setGuide] = useState<VisitGuide>({});
  const [hasPin, setHasPin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    let live = true;
    visitGuideApi.get(hospitalId)
      .then((r) => {
        if (!live) return;
        setGuide(r.guide ?? {});
        setHasPin(r.hasMapPin);
      })
      .catch((e) => live && setError(saveError(e)))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [hospitalId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;
    setSaving(true);
    setError(null);
    try {
      const r = await visitGuideApi.save(hospitalId, guide);
      setGuide(r.guide ?? {});
      setHasPin(r.hasMapPin);
      toast({ title: 'Patient visit guide saved' });
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the visit guide...
      </div>
    );
  }

  const directions = [guide.landmark, guide.entranceNote, guide.opdLocation].filter((x) => x && x.trim()).join('. ');

  return (
    <form onSubmit={save} aria-label="Patient visit guide" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Footprints className="h-5 w-5 text-brand-600" /> Patient visit guide</CardTitle>
          <p className="text-sm text-muted-foreground">
            What patients who booked on Doctor Dekho read on the day of their visit: in the WhatsApp reminder, on their visit page and
            when they tell Vita "I've reached". Fill in only what helps; empty fields are left out.
          </p>
          {!hasPin && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              <MapPinOff className="h-4 w-4" /> Set the hospital's map pin under Hospital Info so patients get directions and can check in
              from their phone when they arrive.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`vg-${f.key}`}>{f.label}</Label>
              {f.long ? (
                <Textarea id={`vg-${f.key}`} value={guide[f.key] ?? ''} maxLength={f.max} placeholder={f.hint}
                  onChange={(e) => setGuide((g) => ({ ...g, [f.key]: e.target.value }))} />
              ) : (
                <Input id={`vg-${f.key}`} value={guide[f.key] ?? ''} maxLength={f.max} placeholder={f.hint}
                  onChange={(e) => setGuide((g) => ({ ...g, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}

          <div className="rounded-xl border bg-slate-50 p-3 text-sm" aria-label="What the patient reads">
            <p className="font-semibold">What the patient reads in the reminder</p>
            <p className="mt-1 text-slate-700">
              Good morning Rina. Today: Dr. Anita Sen at your hospital, 10:30. {directions || '-'}. Tap Start navigation when you leave.
            </p>
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default VisitGuideConfig;
