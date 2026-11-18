import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, FileText, Loader2, RefreshCw, Search, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ABDM_PURPOSES, ABDM_RECORD_TYPES, abdmHiuApi, abdmHiuStatusText, defaultAskDates,
  type AbdmHiuConsent, type AbdmHiuConsentStatus, type AbdmReceivedRecord, type AbdmReceivedRecordSummary,
} from '../services/abdmHiuApi';
import { summariseFhirBundle } from '../utils/fhirSummary';
import { abdmUtc } from '../services/abdmApi';

interface Props {
  hospitalId: string;
}

const STATUS_CLASS: Record<AbdmHiuConsentStatus, string> = {
  REQUESTED: 'bg-blue-100 text-blue-700',
  GRANTED: 'bg-emerald-100 text-emerald-700',
  DENIED: 'bg-slate-100 text-slate-700',
  REVOKED: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
  FAILED: 'bg-red-100 text-red-700',
};

const errorText = (e: unknown): string | undefined => {
  const err = e as { response?: { data?: { Message?: string; message?: string } }; message?: string } | undefined;
  return err?.response?.data?.Message || err?.response?.data?.message || err?.message;
};
const isNotFound = (e: unknown) => (e as { response?: { status?: number } } | undefined)?.response?.status === 404;

const day = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(abdmUtc(iso)) : '—';
const dayTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(abdmUtc(iso)) : '—';

/**
 * ABDM M3 on the ABHA board: ask a patient for consent to see their records from other
 * hospitals, follow the request, and read what arrived. Records are shown as text taken from
 * the document; nothing in a received record is ever rendered as HTML.
 */
export const HiuPanel: React.FC<Props> = ({ hospitalId }) => {
  const { toast } = useToast();
  const dates = useMemo(() => defaultAskDates(), []);

  const [patientDraft, setPatientDraft] = useState('');
  const [patientId, setPatientId] = useState('');
  const [consents, setConsents] = useState<AbdmHiuConsent[]>([]);
  const [records, setRecords] = useState<AbdmReceivedRecordSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [abhaAddress, setAbhaAddress] = useState('');
  const [purpose, setPurpose] = useState('CAREMGT');
  const [types, setTypes] = useState<string[]>(['Prescription', 'DiagnosticReport', 'DischargeSummary']);
  const [from, setFrom] = useState(dates.from);
  const [to, setTo] = useState(dates.to);
  const [eraseAt, setEraseAt] = useState(dates.eraseAt);
  const [asking, setAsking] = useState(false);

  const [openRecord, setOpenRecord] = useState<AbdmReceivedRecord | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // A request that has waited: ask ABDM where it stands (the patient may have answered while the
  // notice to us was lost). ABDM answers on its own channel, so the list is read again shortly after.
  const check = async (consentRowId: string) => {
    setCheckingId(consentRowId);
    try {
      const res = await abdmHiuApi.checkConsent(hospitalId, consentRowId);
      if (res.message && !res.consentAsked) {
        toast({ title: 'Could not check with ABDM', description: res.message, variant: 'destructive' });
      } else {
        toast({
          title: 'Asked ABDM',
          description: res.transferStatus ? `Records: ${res.transferStatus.toLowerCase()}. The list will update in a moment.` : 'The list will update in a moment.',
        });
      }
      setTimeout(() => { void load(patientId); }, 4000);
    } catch (e) {
      toast({ title: 'Could not check with ABDM', description: errorText(e), variant: 'destructive' });
    } finally {
      setCheckingId(null);
    }
  };

  const load = useCallback(async (id: string) => {
    if (!hospitalId || !id) return;
    setLoading(true);
    try {
      const [c, r] = await Promise.all([abdmHiuApi.getConsents(hospitalId, id), abdmHiuApi.getRecords(hospitalId, id)]);
      setConsents(c.consents || []);
      setRecords(r.records || []);
    } catch (e) {
      toast({ title: 'Could not load', description: errorText(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [hospitalId, toast]);

  useEffect(() => { if (patientId) void load(patientId); }, [patientId, load]);

  const waiting = consents.some(c => c.status === 'REQUESTED');
  // While a request is with the patient, look again now and then; they answer in their own app.
  useEffect(() => {
    if (!waiting || !patientId) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(patientId); }, 15_000);
    return () => clearInterval(timer);
  }, [waiting, patientId, load]);

  const ask = async () => {
    if (types.length === 0) { toast({ title: 'Choose at least one kind of record', variant: 'destructive' }); return; }
    if (from >= to) { toast({ title: 'The "from" date must be before the "to" date', variant: 'destructive' }); return; }
    setAsking(true);
    try {
      const res = await abdmHiuApi.requestConsent({
        hospitalId, patientId, abhaAddress: abhaAddress.trim() || undefined, purposeCode: purpose, hiTypes: types,
        from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.000Z`, eraseAt: `${eraseAt}T23:59:59.000Z`,
      });
      if (res.consent?.status === 'FAILED') {
        toast({ title: 'ABDM did not accept the request', description: res.consent.failureReason || undefined, variant: 'destructive' });
      } else {
        toast({ title: 'Request sent', description: 'Ask the patient to open their ABHA app and approve it.' });
      }
      await load(patientId);
    } catch (e) {
      toast({ title: 'Could not send the request', description: errorText(e), variant: 'destructive' });
    } finally {
      setAsking(false);
    }
  };

  const open = async (id: string) => {
    setOpeningId(id);
    try {
      setOpenRecord(await abdmHiuApi.getRecord(hospitalId, id));
    } catch (e) {
      toast({ title: 'Could not open the record', description: isNotFound(e) ? 'It is no longer available.' : errorText(e), variant: 'destructive' });
    } finally {
      setOpeningId(null);
    }
  };

  const summary = useMemo(() => (openRecord ? summariseFhirBundle(openRecord.bundle) : null), [openRecord]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><FileDown className="h-5 w-5 text-primary" aria-hidden="true" /> Records from other hospitals</CardTitle>
          <p className="text-sm text-muted-foreground">
            With the patient's approval in their ABHA app, their records from other hospitals and labs are brought here for you to read.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col sm:flex-row gap-2 sm:items-end"
            onSubmit={(e) => { e.preventDefault(); setConsents([]); setRecords([]); setPatientId(patientDraft.trim()); }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="hiu-patient">Patient ID</Label>
              <Input id="hiu-patient" value={patientDraft} onChange={e => setPatientDraft(e.target.value)} placeholder="The patient's ID in 1HMS" autoComplete="off" />
            </div>
            <Button type="submit" className="h-10 gap-2" disabled={!patientDraft.trim()}><Search className="h-4 w-4" aria-hidden="true" /> Open patient</Button>
          </form>
        </CardContent>
      </Card>

      {patientId && (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Ask for records</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hiu-abha">ABHA address</Label>
                  <Input id="hiu-abha" value={abhaAddress} onChange={e => setAbhaAddress(e.target.value)} placeholder="name@abdm (leave empty to use the one on record)" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hiu-purpose">Why the records are needed</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger id="hiu-purpose" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{ABDM_PURPOSES.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Kinds of record</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ABDM_RECORD_TYPES.map(t => (
                    <label key={t.code} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={types.includes(t.code)} onCheckedChange={(v) => setTypes(prev => v ? [...prev, t.code] : prev.filter(x => x !== t.code))} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5"><Label htmlFor="hiu-from">Records from</Label><Input id="hiu-from" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="hiu-to">Records up to</Label><Input id="hiu-to" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="hiu-keep">Keep them until</Label><Input id="hiu-keep" type="date" value={eraseAt} min={dates.to} onChange={e => setEraseAt(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">After the "keep until" date the records are deleted from 1HMS. The patient can also withdraw their approval at any time, which removes them at once.</p>

              <Button onClick={ask} disabled={asking} className="gap-2">
                {asking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send request to the patient
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Requests for {patientId}</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => load(patientId)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {consents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'No requests yet for this patient.'}</p>
              ) : consents.map(c => (
                <div key={c.consentRowId} className="rounded-xl border p-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.hiTypes.map(t => ABDM_RECORD_TYPES.find(x => x.code === t)?.label ?? t).join(', ') || 'Records'}</p>
                    <p className="text-xs text-muted-foreground">
                      {day(c.dateFrom)} to {day(c.dateTo)} · asked {dayTime(c.createdAt)}{c.fromFacility ? ` · from ${c.fromFacility}` : ''}
                    </p>
                    {c.status === 'FAILED' && c.failureReason && <p className="text-xs text-red-700 mt-1">{c.failureReason}</p>}
                    {c.status === 'GRANTED' && <p className="text-xs text-muted-foreground mt-1">Kept until {day(c.expiresAt)}</p>}
                  </div>
                  {(c.status === 'REQUESTED' || c.status === 'GRANTED') && c.consentRequestId && (
                    <Button variant="outline" size="sm" onClick={() => check(c.consentRowId)} disabled={checkingId === c.consentRowId}>
                      {checkingId === c.consentRowId ? 'Checking…' : 'Check with ABDM'}
                    </Button>
                  )}
                  <Badge className={STATUS_CLASS[c.status] ?? 'bg-slate-100 text-slate-700'}>{abdmHiuStatusText[c.status] ?? c.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Records received ({records.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing has arrived yet. Records appear here shortly after the patient approves a request.</p>
              ) : records.map(r => (
                <button
                  key={r.receivedRecordId}
                  type="button"
                  onClick={() => open(r.receivedRecordId)}
                  disabled={openingId === r.receivedRecordId}
                  className="w-full text-left rounded-xl border p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  {openingId === r.receivedRecordId
                    ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" aria-hidden="true" />
                    : <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{r.title || ABDM_RECORD_TYPES.find(x => x.code === r.hiType)?.label || 'Health record'}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {r.fromFacility ? `${r.fromFacility} · ` : ''}received {dayTime(r.receivedAt)} · kept until {day(r.eraseAt)}
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!openRecord} onOpenChange={(v) => { if (!v) setOpenRecord(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{summary?.title ?? 'Health record'}</DialogTitle>
            <DialogDescription>
              {[summary?.facility, summary?.author, summary?.date ? day(summary.date) : undefined].filter(Boolean).join(' · ') || 'From another facility'}
            </DialogDescription>
          </DialogHeader>
          {summary && summary.sections.length > 0 ? (
            <div className="space-y-4">
              {summary.sections.map((s, i) => (
                <section key={`${s.title}-${i}`}>
                  <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                  <ul className="space-y-1 text-sm">
                    {s.lines.map((line, j) => <li key={j} className="whitespace-pre-wrap">{line}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This record could not be shown as text. It was received and is stored, but its contents are in a form this screen does not read yet.</p>
          )}
          <p className="text-xs text-muted-foreground border-t pt-3">
            Shown as sent by the other facility. Kept in 1HMS until {day(openRecord?.eraseAt)}.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};
