import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Download, Eye, Loader2, Lock, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbhaPatientSummary, type MatchAbhaPatientResponse } from '../services/abdmApi';
import { onlyDigits } from '../utils/aadhaar';
import {
  compareRows, genderLabel, holdsOtherAbha, initialForm, maskMobile, sameMobile,
  type AbhaEditableForm, type AbhaVerifiedProfile,
} from '../utils/abhaRegister';

export interface AbhaRegistered {
  patientId: string;
  created: boolean;
}

interface Props {
  hospitalId: string;
  profile: AbhaVerifiedProfile;
  // Proof the ABHA was verified here (OTP or creation), or a counter-scan share instead.
  linkToken?: string;
  profileShareId?: string | null;
  // The verified session: shows the ABHA card and updates the ABHA's mobile.
  sessionTxnId?: string;
  // An ABHA address login has no published call to update the mobile (VRFY_ABHA_102, 202).
  mobileUpdate?: 'abha-token' | 'unsupported';
  onFinished: (result: AbhaRegistered) => void;
}

const errorText = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { Message?: string; message?: string } }; message?: string };
  return (err?.response?.data?.Message ?? err?.response?.data?.message) || err?.message || fallback;
};

const ReadOnly: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="space-y-1">
    <Label className="flex items-center gap-1 text-xs"><Lock className="h-3 w-3" aria-hidden="true" /> {label}</Label>
    <Input value={value || ''} readOnly disabled aria-readonly="true" className="bg-muted/40" />
  </div>
);

/**
 * The step after an ABHA is verified or created: the full profile, the ABHA card, a check for the
 * patient in this hospital's records, and a registration form filled from the ABHA. Name, date of
 * birth and gender are read only; address, email, mobile, state, district, city and pincode stay
 * editable. ABDM M1: VRFY_ABHA_101, 102, 201, 202, 305, 306, 308, 404, CRT_ABHA_113, 114, 116 and
 * TAGGING_UNIQUEPATIENTID_UNIQUEABHANUMBER.
 */
export const AbhaRegisterPatient: React.FC<Props> = ({
  hospitalId, profile, linkToken, profileShareId, sessionTxnId, mobileUpdate = 'abha-token', onFinished,
}) => {
  const { toast } = useToast();
  const [match, setMatch] = useState<MatchAbhaPatientResponse | null>(null);
  const [matching, setMatching] = useState(true);
  const [choice, setChoice] = useState<string>('new');
  const [form, setForm] = useState<AbhaEditableForm>(() => initialForm(profile));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<AbhaRegistered & { message?: string } | null>(null);

  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  // The Yes or No offer to update the ABHA's mobile when the record's differs (VRFY_ABHA_101, 201).
  const [mobileAnswer, setMobileAnswer] = useState<'ask' | 'no' | 'otp' | 'updated' | 'unsupported'>('ask');
  const [updateTxnId, setUpdateTxnId] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileBusy, setMobileBusy] = useState(false);

  useEffect(() => () => { if (card) URL.revokeObjectURL(card.url); }, [card]);

  useEffect(() => {
    let active = true;
    setMatching(true);
    abdmApi.matchAbhaPatient(hospitalId, linkToken, profileShareId)
      .then(res => {
        if (!active) return;
        setMatch(res);
        if (res.alreadyLinked) {
          setChoice(res.alreadyLinked.patientId);
          setForm(initialForm(profile, res.alreadyLinked));
        }
      })
      .catch(e => { if (active) toast({ title: 'Could not check the patient records', description: errorText(e, 'Try again.'), variant: 'destructive' }); })
      .finally(() => { if (active) setMatching(false); });
    return () => { active = false; };
  }, [hospitalId, linkToken, profileShareId]); // eslint-disable-line react-hooks/exhaustive-deps

  const linked = match?.alreadyLinked ?? null;
  const candidates = match?.candidates ?? [];
  const chosenPatient: AbhaPatientSummary | null = useMemo(() => {
    if (linked) return linked;
    return candidates.find(c => c.patientId === choice) ?? null;
  }, [linked, candidates, choice]);

  const choose = (value: string) => {
    setChoice(value);
    setForm(initialForm(profile, candidates.find(c => c.patientId === value) ?? null));
    setMobileAnswer('ask');
  };

  const set = (key: keyof AbhaEditableForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === 'mobile' ? onlyDigits(e.target.value, 10) : key === 'pincode' ? onlyDigits(e.target.value, 6) : e.target.value;
    setForm(f => ({ ...f, [key]: value }));
    if (key === 'mobile') setMobileAnswer('ask');
  };

  const mobileDiffers = form.mobile.length === 10 && !!profile.mobile && !sameMobile(form.mobile, profile.mobile);

  const loadCard = async (): Promise<Blob | null> => {
    if (card) return card.blob;
    if (!sessionTxnId) return null;
    setCardBusy(true);
    try {
      const blob = await abdmApi.getAbhaCardBlob(hospitalId, sessionTxnId);
      setCard({ blob, url: URL.createObjectURL(blob) });
      return blob;
    } catch (e) {
      toast({ title: 'Could not fetch the ABHA card', description: errorText(e, 'Try again.'), variant: 'destructive' });
      return null;
    } finally {
      setCardBusy(false);
    }
  };

  const downloadCard = async () => {
    const blob = await loadCard();
    if (blob) abdmApi.downloadBlob(blob, `ABHA-Card-${profile.abhaNumber ?? 'abha'}`);
  };

  const askMobileUpdate = async () => {
    if (mobileUpdate === 'unsupported' || !sessionTxnId) { setMobileAnswer('unsupported'); return; }
    setMobileBusy(true);
    try {
      const res = await abdmApi.requestUpdateMobileOtp(hospitalId, sessionTxnId, form.mobile);
      if (!res.success || !res.txnId) { toast({ title: 'Could not send the OTP', description: res.message, variant: 'destructive' }); return; }
      setUpdateTxnId(res.txnId);
      setMobileOtp('');
      setMobileAnswer('otp');
      toast({ title: 'OTP sent', description: res.message || `OTP sent to ${maskMobile(form.mobile)}.` });
    } catch (e) {
      toast({ title: 'Could not send the OTP', description: errorText(e, 'Try again.'), variant: 'destructive' });
    } finally {
      setMobileBusy(false);
    }
  };

  const verifyMobileUpdate = async () => {
    if (mobileOtp.length !== 6 || !sessionTxnId) return;
    setMobileBusy(true);
    try {
      const res = await abdmApi.verifyUpdateMobileOtp(hospitalId, profile.abhaNumber ?? '', sessionTxnId, updateTxnId, mobileOtp);
      // Shown as done only when the update call says so.
      if (!res.success) { toast({ title: 'The mobile was not updated', description: res.message, variant: 'destructive' }); return; }
      setMobileAnswer('updated');
      toast({ title: 'ABHA mobile updated', description: res.message });
    } catch (e) {
      toast({ title: 'The mobile was not updated', description: errorText(e, 'Try again.'), variant: 'destructive' });
    } finally {
      setMobileBusy(false);
    }
  };

  const save = async (patientId?: string) => {
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) { toast({ title: 'Please enter a valid mobile number.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await abdmApi.registerAbhaPatient({
        hospitalId, linkToken, profileShareId, patientId,
        mobile: form.mobile, email: form.email.trim(), addressLine: form.addressLine.trim(), city: form.city.trim(),
        district: form.district.trim(), state: form.state.trim(), pincode: form.pincode,
      });
      if (!res.success || !res.patientId) { toast({ title: 'Not saved', description: res.message, variant: 'destructive' }); return; }
      if (profileShareId) void abdmApi.handleProfileShare(hospitalId, profileShareId).catch(() => { /* best-effort */ });
      setDone({ patientId: res.patientId, created: !!res.created, message: res.message });
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { alreadyLinkedPatientId?: string; message?: string } } };
      // Linked meanwhile: show it as linked rather than making a second patient.
      if (err.response?.status === 409 && err.response.data?.alreadyLinkedPatientId) {
        toast({ title: 'Already linked', description: err.response.data.message, variant: 'destructive' });
        const again = await abdmApi.matchAbhaPatient(hospitalId, linkToken, profileShareId).catch(() => null);
        if (again) { setMatch(again); if (again.alreadyLinked) setChoice(again.alreadyLinked.patientId); }
      } else {
        toast({ title: 'Not saved', description: errorText(e, 'Try again.'), variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 text-center py-4">
        <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
        <p className="font-semibold">{done.created ? 'Patient registered' : 'ABHA linked to the patient'}</p>
        <p className="text-sm">Beneficiary ID: <span className="font-mono">{done.patientId}</span></p>
        <p className="text-sm">ABHA number: <span className="font-mono">{profile.abhaNumber}</span></p>
        {profile.abhaAddress && <p className="text-sm">ABHA address: <span className="font-mono">{profile.abhaAddress}</span></p>}
        {done.message && <p className="text-xs text-muted-foreground">{done.message}</p>}
        <Button onClick={() => onFinished(done)} className="w-full">Done</Button>
      </div>
    );
  }

  const row = (label: string, value?: string) => value
    ? <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right break-all">{value}</span></div>
    : null;

  return (
    <div className="space-y-4">
      {/* The selected ABHA's profile, and only that one (VRFY_ABHA_305). */}
      <section className="rounded-xl border p-3 space-y-2" aria-label="ABHA profile">
        <div className="flex items-center gap-3">
          {profile.profilePhoto
            ? <img src={`data:image/jpeg;base64,${profile.profilePhoto}`} alt="ABHA photo" className="h-14 w-14 rounded-lg object-cover border" />
            : <div className="h-14 w-14 rounded-lg border bg-muted/40" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="font-semibold truncate">{profile.fullName}</p>
            <p className="text-sm font-mono">{profile.abhaNumber}</p>
            {profile.abhaAddress && <p className="text-xs font-mono text-muted-foreground truncate">{profile.abhaAddress}</p>}
          </div>
        </div>
        {row('Gender', genderLabel(profile.gender))}
        {row('Date of birth', profile.dateOfBirth)}
        {row('Mobile', profile.mobile ? maskMobile(profile.mobile) : undefined)}
        {row('Address', profile.address)}
        {row('City / town', profile.city)}
        {row('District', profile.district)}
        {row('State', profile.state)}
        {row('Pincode', profile.pincode)}
        {profile.kycVerified === false ? (
          <p className="text-xs rounded-md bg-amber-50 text-amber-900 border border-amber-200 p-2">This ABHA is not KYC verified, so ABDM issues no ABHA card for it.</p>
        ) : sessionTxnId ? (
          <>
            {card && (card.blob.type === 'application/pdf'
              ? <iframe src={card.url} title="ABHA card" className="w-full h-56 border rounded-md" />
              : <img src={card.url} alt="ABHA card" className="w-full border rounded-md" />)}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => loadCard()} disabled={cardBusy || !!card} className="gap-1.5">
                {cardBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" aria-hidden="true" />} View ABHA card
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCard} disabled={cardBusy} className="gap-1.5">
                <Download className="h-4 w-4" aria-hidden="true" /> Download card
              </Button>
            </div>
          </>
        ) : null}
      </section>

      {matching && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking this hospital's patient records</p>}

      {/* Already linked: a comparison, never a second registration (VRFY_ABHA_308). */}
      {!matching && linked && (
        <section className="space-y-2" aria-label="Already linked">
          <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex gap-2" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>This ABHA profile is already linked to HMIS Beneficiary ID. <span className="font-mono font-semibold">{linked.patientId}</span></span>
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr><th className="text-left p-2">Detail</th><th className="text-left p-2">From ABHA</th><th className="text-left p-2">In HMIS ({linked.patientId})</th></tr>
              </thead>
              <tbody>
                {compareRows(profile, linked).map(r => (
                  <tr key={r.label} className={r.differs ? 'bg-amber-50/60' : ''}>
                    <td className="p-2 text-muted-foreground">{r.label}</td>
                    <td className="p-2 break-all">{r.abha || '—'}</td>
                    <td className="p-2 break-all">{r.hmis || '—'}{r.differs && <span className="sr-only"> (differs)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Beneficiary matching before registering (CRT_ABHA_116). */}
      {!matching && !linked && candidates.length > 0 && (
        <section className="space-y-2" aria-label="Possible matches">
          <p className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" aria-hidden="true" /> Patients here who may be this person</p>
          {candidates.map(c => {
            const blocked = holdsOtherAbha(c, profile.abhaNumber);
            return (
              <label key={c.patientId} className={`flex items-start gap-2 rounded-lg border p-2.5 ${blocked ? 'opacity-60' : 'cursor-pointer hover:bg-muted/40'}`}>
                <input type="radio" name="abha-patient-choice" className="mt-1" disabled={blocked} checked={choice === c.patientId} onChange={() => choose(c.patientId)} />
                <span className="min-w-0 text-sm">
                  <span className="font-medium">{c.fullName}</span> <span className="font-mono text-xs">{c.patientId}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[genderLabel(c.sex), c.age != null ? `${c.age}${c.ageUnit && c.ageUnit !== 'Y' ? c.ageUnit : ' y'}` : '', maskMobile(c.mobile), c.city].filter(Boolean).join(' · ')}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">Matched on {c.matchedOn.join(', ').toLowerCase()}</span>
                  {blocked && <span className="block text-[11px] text-red-700">Holds another ABHA. One patient can hold only one ABHA number.</span>}
                </span>
              </label>
            );
          })}
          <label className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/40">
            <input type="radio" name="abha-patient-choice" checked={choice === 'new'} onChange={() => choose('new')} />
            <span className="text-sm flex items-center gap-1.5"><UserPlus className="h-4 w-4" aria-hidden="true" /> None of these: register a new patient</span>
          </label>
        </section>
      )}

      {/* The registration form, filled from the ABHA (VRFY_ABHA_306). */}
      {!matching && (
        <section className="space-y-3" aria-label="Registration form">
          <p className="text-sm font-semibold">
            {linked ? `Patient ${linked.patientId}` : chosenPatient ? `Link to patient ${chosenPatient.patientId}` : 'Register a new patient'}
          </p>
          <ReadOnly label="Name (from ABHA)" value={profile.fullName} />
          <div className="grid grid-cols-2 gap-2">
            <ReadOnly label="Date of birth" value={profile.dateOfBirth} />
            <ReadOnly label="Gender" value={genderLabel(profile.gender)} />
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">Name, date of birth and gender come from the ABHA and cannot be changed here.</p>
          <div className="space-y-1">
            <Label htmlFor="abha-reg-mobile" className="text-xs">Mobile</Label>
            <Input id="abha-reg-mobile" value={form.mobile} onChange={set('mobile')} inputMode="numeric" maxLength={10} />
          </div>
          {mobileDiffers && mobileAnswer !== 'no' && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              {mobileAnswer === 'ask' && (
                <>
                  <p>The mobile here ({maskMobile(form.mobile)}) differs from the one on the ABHA ({maskMobile(profile.mobile)}). Update the ABHA profile's mobile to {maskMobile(form.mobile)}?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={askMobileUpdate} disabled={mobileBusy}>{mobileBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Yes</Button>
                    <Button size="sm" variant="outline" onClick={() => setMobileAnswer('no')}>No</Button>
                  </div>
                </>
              )}
              {mobileAnswer === 'otp' && (
                <>
                  <Label htmlFor="abha-reg-mobile-otp" className="text-xs">OTP sent to {maskMobile(form.mobile)}</Label>
                  <Input id="abha-reg-mobile-otp" value={mobileOtp} onChange={e => setMobileOtp(onlyDigits(e.target.value, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit OTP" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={verifyMobileUpdate} disabled={mobileBusy || mobileOtp.length !== 6}>{mobileBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Verify</Button>
                    <Button size="sm" variant="outline" onClick={() => setMobileAnswer('no')}>Cancel</Button>
                  </div>
                </>
              )}
              {mobileAnswer === 'updated' && <p className="text-green-700">The ABHA profile's mobile is now {maskMobile(form.mobile)}.</p>}
              {mobileAnswer === 'unsupported' && (
                <p className="text-amber-900">ABDM has no call to update the mobile after an ABHA address login, so the ABHA mobile was not changed. Verify with the ABHA number to update it.</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="abha-reg-email" className="text-xs">Email</Label>
            <Input id="abha-reg-email" value={form.email} onChange={set('email')} type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="abha-reg-address" className="text-xs">Address</Label>
            <Input id="abha-reg-address" value={form.addressLine} onChange={set('addressLine')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="abha-reg-city" className="text-xs">City / town</Label>
              <Input id="abha-reg-city" value={form.city} onChange={set('city')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="abha-reg-district" className="text-xs">District</Label>
              <Input id="abha-reg-district" value={form.district} onChange={set('district')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="abha-reg-state" className="text-xs">State</Label>
              <Input id="abha-reg-state" value={form.state} onChange={set('state')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="abha-reg-pincode" className="text-xs">Pincode</Label>
              <Input id="abha-reg-pincode" value={form.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} />
            </div>
          </div>
          {linked ? (
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={() => save(linked.patientId)} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update {linked.patientId} from this ABHA
              </Button>
              <Button variant="outline" onClick={() => onFinished({ patientId: linked.patientId, created: false })} disabled={saving} className="w-full">
                Keep the record as it is
              </Button>
            </div>
          ) : (
            <Button onClick={() => save(chosenPatient?.patientId)} disabled={saving || (!linkToken && !profileShareId)} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {chosenPatient ? `Link ABHA to ${chosenPatient.patientId}` : 'Register patient'}
            </Button>
          )}
        </section>
      )}
    </div>
  );
};
