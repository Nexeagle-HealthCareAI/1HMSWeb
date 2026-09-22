import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Printer, Loader2, Copy, CheckCircle2, Settings2, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { abdmApi, type AbdmProfileShareItem } from '../services/abdmApi';

const COUNTER_KEY = 'abdm-counter-id';
const POLL_MS = 5000;

// Backend DateTime values serialize without a timezone suffix (naive UTC) — append Z so the browser
// doesn't read them as local time.
const receivedAtLocal = (iso: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);

interface Props {
  hospitalId: string;
  // Fired after a scanned profile is marked handled, so the parent can refresh its ABHA account list.
  onHandled?: () => void;
}

export const CounterScanPanel: React.FC<Props> = ({ hospitalId, onHandled }) => {
  const { toast } = useToast();
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const [hipId, setHipId] = useState('');
  const [hipDraft, setHipDraft] = useState('');
  const [qrBaseUrl, setQrBaseUrl] = useState('');
  const [savingHip, setSavingHip] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const [counterId, setCounterId] = useState(() => {
    try { return localStorage.getItem(COUNTER_KEY) || 'COUNTER-1'; } catch { return 'COUNTER-1'; }
  });
  const [showHandled, setShowHandled] = useState(false);
  const [items, setItems] = useState<AbdmProfileShareItem[]>([]);
  const [handlingId, setHandlingId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(COUNTER_KEY, counterId); } catch { /* storage unavailable — non-fatal */ }
  }, [counterId]);

  useEffect(() => {
    if (!hospitalId) return;
    let active = true;
    abdmApi.getFacility(hospitalId)
      .then(res => {
        if (!active) return;
        setHipId(res.hipId || '');
        setHipDraft(res.hipId || '');
        setQrBaseUrl(res.qrBaseUrl || '');
        if (!res.hipId) setShowSetup(true);
      })
      .catch(() => { /* panel just shows the unconfigured state */ });
    return () => { active = false; };
  }, [hospitalId]);

  const loadShares = useCallback(async () => {
    if (!hospitalId || !hipId) return;
    try {
      const res = await abdmApi.getProfileShares(hospitalId, showHandled ? undefined : { status: 'NEW' });
      setItems(res.items || []);
    } catch { /* transient — the next poll retries */ }
  }, [hospitalId, hipId, showHandled]);

  useEffect(() => {
    void loadShares();
    const id = setInterval(() => { if (document.visibilityState === 'visible') void loadShares(); }, POLL_MS);
    return () => clearInterval(id);
  }, [loadShares]);

  const qrValue = useMemo(() => {
    if (!hipId || !qrBaseUrl) return '';
    const cid = counterId.trim();
    return `${qrBaseUrl}?hip-id=${encodeURIComponent(hipId)}${cid ? `&counter-id=${encodeURIComponent(cid)}` : ''}`;
  }, [hipId, qrBaseUrl, counterId]);

  const saveHip = async () => {
    const value = hipDraft.trim();
    if (!value) { toast({ title: 'Enter your HIP / HFR ID', variant: 'destructive' }); return; }
    setSavingHip(true);
    try {
      const res = await abdmApi.saveFacility(hospitalId, value);
      if (!res.success) { toast({ title: 'Could not save', description: res.message, variant: 'destructive' }); return; }
      setHipId(value);
      toast({ title: 'HIP ID saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.response?.data?.Message || e?.message, variant: 'destructive' });
    } finally {
      setSavingHip(false);
    }
  };

  const registerBridge = async () => {
    setRegistering(true);
    try {
      const res = await abdmApi.registerBridgeUrl();
      toast({ title: 'Callback registered with ABDM', description: res.abdmResponse || res.message });
    } catch (e: any) {
      toast({ title: 'Could not register callback', description: e?.response?.data?.Message || e?.message, variant: 'destructive' });
    } finally {
      setRegistering(false);
    }
  };

  const printQr = () => {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const w = window.open('', '_blank', 'width=520,height=640');
    if (!w) { toast({ title: 'Allow pop-ups to print the QR', variant: 'destructive' }); return; }
    w.document.write(
      `<html><head><title>ABHA counter QR</title></head><body style="font-family:sans-serif;text-align:center;padding:32px">` +
      `<h2 style="margin:0 0 4px">Scan to share your ABHA profile</h2>` +
      `<p style="margin:0 0 24px;color:#555">Open your ABHA / PHR app and scan this code${counterId.trim() ? ` &middot; ${counterId.trim().replace(/</g, '&lt;')}` : ''}</p>` +
      `<div style="width:320px;height:320px;margin:0 auto">${svg.outerHTML.replace(/width="\d+"/, 'width="320"').replace(/height="\d+"/, 'height="320"')}</div>` +
      `<script>window.onload=function(){window.print();}</script></body></html>`
    );
    w.document.close();
  };

  const markHandled = async (item: AbdmProfileShareItem) => {
    setHandlingId(item.profileShareId);
    try {
      const res = await abdmApi.handleProfileShare(hospitalId, item.profileShareId);
      if (!res.success) { toast({ title: 'Could not update', description: res.message, variant: 'destructive' }); return; }
      await loadShares();
      onHandled?.();
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.response?.data?.Message || e?.message, variant: 'destructive' });
    } finally {
      setHandlingId(null);
    }
  };

  const copyAbha = async (abha?: string) => {
    if (!abha) return;
    try { await navigator.clipboard.writeText(abha); toast({ title: 'ABHA number copied' }); }
    catch { toast({ title: 'Could not copy', variant: 'destructive' }); }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" /> Counter QR &middot; scan &amp; share
        </CardTitle>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setShowSetup(s => !s)}>
          <Settings2 className="h-4 w-4" /> Setup
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {showSetup && (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>Facility (HIP / HFR) ID</Label>
                <Input value={hipDraft} onChange={e => setHipDraft(e.target.value)} placeholder="e.g. IN3410000260" />
              </div>
              <Button onClick={saveHip} disabled={savingHip}>
                {savingHip && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Button variant="outline" size="sm" onClick={registerBridge} disabled={registering}>
                {registering && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />} Register callback URL with ABDM
              </Button>
              <span>One-time, platform-wide. Needed before patients&apos; scans can reach this system.</span>
            </div>
          </div>
        )}

        {!hipId ? (
          <p className="text-sm text-muted-foreground">Enter your facility&apos;s HIP / HFR ID in Setup to generate the counter QR.</p>
        ) : !qrValue ? (
          <p className="text-sm text-muted-foreground">The ABDM share-profile URL isn&apos;t configured for this environment yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="space-y-2">
              <div ref={svgWrapRef} className="rounded-xl border bg-white p-3 inline-block">
                <QRCodeSVG value={qrValue} size={168} level="M" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Counter ID</Label>
                <div className="flex gap-2">
                  <Input className="h-9 w-40" value={counterId} onChange={e => setCounterId(e.target.value)} />
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={printQr}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-600 animate-pulse" /> Scanned profiles
                </p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showHandled} onChange={e => setShowHandled(e.target.checked)} />
                  Show handled
                </label>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                  Waiting for a patient to scan the QR&hellip; new scans appear here within a few seconds.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.profileShareId} className="rounded-xl border p-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold truncate">{item.fullName || 'Unnamed'}</p>
                          {item.existingPatientId ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                              Returning &middot; {item.existingPatientId}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-sky-200 bg-sky-100 text-sky-700">New patient</Badge>
                          )}
                          {item.statusCode === 'HANDLED' && <Badge variant="outline" className="text-muted-foreground">Handled</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {[item.abhaNumber, item.mobile, item.gender, item.dateOfBirth].filter(Boolean).join(' · ') || '—'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {receivedAtLocal(item.receivedAt).toLocaleTimeString()}{item.counterId ? ` · ${item.counterId}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => copyAbha(item.abhaNumber)} disabled={!item.abhaNumber}>
                          <Copy className="h-3.5 w-3.5" /> ABHA
                        </Button>
                        {item.statusCode !== 'HANDLED' && (
                          <Button size="sm" className="h-8 gap-1.5" onClick={() => markHandled(item)} disabled={handlingId === item.profileShareId}>
                            {handlingId === item.profileShareId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Mark handled
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
