import React, { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useBiometricDevices,
  useEmployeeDeviceLinks,
  useHrEmployees,
  useMapDeviceUser,
  useRegisterBiometricDevice,
  useRotateBiometricDeviceToken,
  useSetBiometricDeviceActive,
  useUnmapDeviceUser,
  useUnmappedDeviceUsers,
} from '../hrApi';
import type { BiometricDevice, UnmappedDeviceUser } from '../types';

// The API serialises UTC timestamps without a "Z", which the browser would read as local time.
const asUtc = (value: string) => new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin;

const connectionDetails = () => {
  let host = API_BASE;
  let port = '';
  try {
    const url = new URL(API_BASE);
    host = url.hostname;
    port = url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch { /* keep the raw value */ }
  return { host, port, punchUrl: `${API_BASE.replace(/\/$/, '')}/api/v1/hr/biometric/punches` };
};

const statusOf = (d: BiometricDevice) => {
  if (!d.isActive) return { label: 'Deactivated', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  if (d.isOnline) return { label: 'Online', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' };
  if (d.lastSeenAt) return { label: 'Offline', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' };
  return { label: 'Never connected', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
};

// ─── Small pieces ─────────────────────────────────────────────────────────────

const CopyField: React.FC<{ label: string; value: string; secret?: boolean }> = ({ label, value, secret }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Could not copy', description: 'Select the text and copy it manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex gap-2">
        <code className={`flex-1 min-w-0 break-all rounded-lg border px-3 py-2 text-xs font-mono ${secret
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'}`}>
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-lg" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

/** Shown once after registering a device or rotating its token. */
const ConnectInstructions: React.FC<{ serial: string; token: string }> = ({ serial, token }) => {
  const { host, port, punchUrl } = connectionDetails();
  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Copy the access token now. For security it is shown only once and can't be recovered later, only replaced with a new one.</span>
      </div>

      <CopyField label="Device serial number" value={serial} />
      <CopyField label="Access token" value={token} secret />

      <div className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">If the device has a “Cloud Server” / ADMS setting</p>
        <p className="text-xs text-gray-500">
          On the device, open its Communication (or Network) menu, then Cloud Server, and enter the address below. Menu names vary by model and firmware.
          The device identifies itself by serial number, so no token is needed on it.
        </p>
        <CopyField label="Server address" value={host} />
        <CopyField label="Server port" value={port} />
      </div>

      <div className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">If you use a bridge or custom software</p>
        <p className="text-xs text-gray-500">
          POST scans as JSON to this URL with the headers <code>X-Device-Serial</code> and <code>X-Device-Token</code>.
        </p>
        <CopyField label="Endpoint" value={punchUrl} />
      </div>
    </div>
  );
};

// ─── Register a device ────────────────────────────────────────────────────────

const RegisterDeviceSheet: React.FC<{ hospitalId: string; open: boolean; onOpenChange: (open: boolean) => void }> = ({ hospitalId, open, onOpenChange }) => {
  const { toast } = useToast();
  const register = useRegisterBiometricDevice();
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [model, setModel] = useState('ZKTeco K40 Pro');
  const [location, setLocation] = useState('');
  const [created, setCreated] = useState<{ serial: string; token: string } | null>(null);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Reset only once the sheet is closed, so the one-time token is never left in state.
      setName(''); setSerial(''); setModel('ZKTeco K40 Pro'); setLocation(''); setCreated(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await register.mutateAsync({ hospitalId, name: name.trim(), serialNumber: serial.trim(), model: model.trim(), location: location.trim() });
      if (!res.success || !res.token || !res.device) {
        toast({ title: 'Could not register the device', description: res.message, variant: 'destructive' });
        return;
      }
      setCreated({ serial: res.device.serialNumber, token: res.token });
    } catch (err) {
      toast({ title: 'Could not register the device', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{created ? 'Connect your device' : 'Add attendance device'}</SheetTitle>
          <SheetDescription>
            {created
              ? 'The device is registered. Point it at the platform using one of the options below.'
              : 'Register a fingerprint / face terminal so its scans reach the platform.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {created ? (
            <>
              <ConnectInstructions serial={created.serial} token={created.token} />
              <Button className="mt-6 w-full" onClick={() => close(false)}>Done</Button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dev-name">Name</Label>
                <Input id="dev-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main gate" maxLength={100} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-serial">Serial number</Label>
                <Input id="dev-serial" value={serial} onChange={e => setSerial(e.target.value)} placeholder="e.g. CJDE192360123" maxLength={64} required className="font-mono" />
                <p className="text-xs text-gray-500">Find it on the device: Menu → System Info → Device Info. It is also printed on the label at the back.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-model">Model</Label>
                <Input id="dev-model" value={model} onChange={e => setModel(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-location">Location (optional)</Label>
                <Input id="dev-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Ground floor reception" maxLength={200} />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={register.isPending || !name.trim() || !serial.trim()}>
                {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Register device
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Link a device ID to an employee ──────────────────────────────────────────

const LinkDeviceUserDialog: React.FC<{ hospitalId: string; user: UnmappedDeviceUser | null; onClose: () => void }> = ({ hospitalId, user, onClose }) => {
  const { toast } = useToast();
  const { data: employees = [] } = useHrEmployees({ hospitalId });
  const { data: links = [] } = useEmployeeDeviceLinks(hospitalId);
  const map = useMapDeviceUser(hospitalId);
  const [employeeId, setEmployeeId] = useState('');

  // Someone who already has an ID on the device can't be offered again.
  const available = useMemo(() => {
    const linked = new Set(links.map(l => l.hrEmployeeId));
    return employees.filter(e => !linked.has(e.id));
  }, [employees, links]);

  const submit = async () => {
    if (!user || !employeeId) return;
    try {
      const res = await map.mutateAsync({ employeeId, deviceUserId: user.deviceUserId });
      if (!res.success) {
        toast({ title: 'Could not link', description: res.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Linked', description: res.message });
      setEmployeeId('');
      onClose();
    } catch (err) {
      toast({ title: 'Could not link', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={open => { if (!open) { setEmployeeId(''); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link device ID {user?.deviceUserId}</DialogTitle>
          <DialogDescription>
            Choose the staff member who enrolled with this ID on the device. Their {user?.scanCount} earlier scan(s) will turn into attendance straight away.
          </DialogDescription>
        </DialogHeader>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
          <SelectContent>
            {available.length === 0
              ? <div className="px-3 py-2 text-sm text-gray-500">Everyone already has a device ID.</div>
              : available.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.employeeCode}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!employeeId || map.isPending} className="gap-2">
            {map.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

export const BiometricDevicesPanel: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const { toast } = useToast();
  const devicesQuery = useBiometricDevices(hospitalId);
  const { data: unmapped = [] } = useUnmappedDeviceUsers(hospitalId);
  const { data: links = [] } = useEmployeeDeviceLinks(hospitalId);
  const setActive = useSetBiometricDeviceActive(hospitalId);
  const rotate = useRotateBiometricDeviceToken();
  const unmap = useUnmapDeviceUser(hospitalId);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [linking, setLinking] = useState<UnmappedDeviceUser | null>(null);
  const [rotating, setRotating] = useState<BiometricDevice | null>(null);
  const [newCredentials, setNewCredentials] = useState<{ serial: string; token: string } | null>(null);

  const devices = devicesQuery.data ?? [];
  const forbidden = isAxiosError(devicesQuery.error) && devicesQuery.error.response?.status === 403;

  const toggleActive = async (d: BiometricDevice) => {
    try {
      const res = await setActive.mutateAsync({ deviceId: d.hrBiometricDeviceId, isActive: !d.isActive });
      toast({ title: res.message || (d.isActive ? 'Device deactivated' : 'Device activated') });
    } catch (err) {
      toast({ title: 'Could not update the device', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  const confirmRotate = async () => {
    if (!rotating) return;
    const target = rotating;
    setRotating(null);
    try {
      const res = await rotate.mutateAsync(target.hrBiometricDeviceId);
      if (!res.success || !res.token) {
        toast({ title: 'Could not issue a new token', description: res.message, variant: 'destructive' });
        return;
      }
      setNewCredentials({ serial: target.serialNumber, token: res.token });
    } catch (err) {
      toast({ title: 'Could not issue a new token', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  const unlink = async (employeeId: string) => {
    try {
      await unmap.mutateAsync(employeeId);
      toast({ title: 'Device ID unlinked' });
    } catch (err) {
      toast({ title: 'Could not unlink', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-sm text-gray-500">
        You don't have permission to manage attendance devices. Ask an HR administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Attendance devices</h2>
          <p className="text-sm text-gray-500">Fingerprint / face terminals whose scans become attendance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => devicesQuery.refetch()} className="gap-1.5 rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 ${devicesQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setRegisterOpen(true)}
            className="gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-4 w-4" />
            Add device
          </Button>
        </div>
      </div>

      {/* IDs that scanned but belong to nobody yet */}
      {unmapped.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {unmapped.length} device ID{unmapped.length > 1 ? 's have' : ' has'} scanned but {unmapped.length > 1 ? "aren't" : "isn't"} linked to a staff member
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/70">Their attendance won't appear until you link them.</p>
              <ul className="mt-3 divide-y divide-amber-200/70 dark:divide-amber-900/40">
                {unmapped.map(u => (
                  <li key={u.deviceUserId} className="flex items-center justify-between gap-3 py-2">
                    <div className="text-sm">
                      <span className="font-mono font-semibold">ID {u.deviceUserId}</span>
                      <span className="ml-2 text-xs text-gray-500">{u.scanCount} scan{u.scanCount > 1 ? 's' : ''} · last {format(new Date(u.lastSeen), 'dd MMM, h:mm a')}</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setLinking(u)}>
                      <Link2 className="h-3.5 w-3.5" />
                      Link to staff
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Device list */}
      {devicesQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading devices…
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <Cpu className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100">No attendance devices yet</p>
          <ol className="mx-auto mt-3 max-w-md space-y-1 text-left text-xs text-gray-500 list-decimal pl-5">
            <li>Add your device here using its serial number.</li>
            <li>Point the device at the platform (we show you exactly how).</li>
            <li>Staff scan in; link each device ID to the right staff member.</li>
          </ol>
          <Button size="sm" className="mt-5 gap-1.5" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4" /> Add your first device
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {devices.map(d => {
            const st = statusOf(d);
            return (
              <div key={d.hrBiometricDeviceId} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{d.name}</p>
                    <p className="text-xs text-gray-500">{[d.model, d.location].filter(Boolean).join(' · ') || d.vendor}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>{st.label}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-gray-500">Serial</dt>
                  <dd className="font-mono text-gray-800 dark:text-gray-200 break-all">{d.serialNumber}</dd>
                  <dt className="text-gray-500">Last contact</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{d.lastSeenAt ? formatDistanceToNow(asUtc(d.lastSeenAt), { addSuffix: true }) : 'Never'}</dd>
                  <dt className="text-gray-500">Last scan</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{d.lastPunchTime ? format(new Date(d.lastPunchTime), 'dd MMM, h:mm a') : '—'}</dd>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setRotating(d)}>
                    <KeyRound className="h-3.5 w-3.5" /> New token
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => toggleActive(d)} disabled={setActive.isPending}>
                    <Power className="h-3.5 w-3.5" /> {d.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Links that already exist */}
      {links.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Linked device IDs</p>
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {links.map(l => (
              <li key={l.hrEmployeeId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {l.employeeName} <span className="text-xs text-gray-500">· {l.employeeCode}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs rounded-md bg-gray-100 px-2 py-0.5 dark:bg-gray-800">ID {l.deviceUserId}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unlink(l.hrEmployeeId)} disabled={unmap.isPending} aria-label={`Unlink ${l.employeeName}`}>
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RegisterDeviceSheet hospitalId={hospitalId} open={registerOpen} onOpenChange={setRegisterOpen} />
      <LinkDeviceUserDialog hospitalId={hospitalId} user={linking} onClose={() => setLinking(null)} />

      <AlertDialog open={!!rotating} onOpenChange={open => { if (!open) setRotating(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue a new access token?</AlertDialogTitle>
            <AlertDialogDescription>
              The current token for “{rotating?.name}” stops working immediately. Anything using it (a bridge or custom software) must be updated with the new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRotate}>Issue new token</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!newCredentials} onOpenChange={open => { if (!open) setNewCredentials(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New access token</DialogTitle>
            <DialogDescription>Update whatever was using the old token with this one.</DialogDescription>
          </DialogHeader>
          {newCredentials && <ConnectInstructions serial={newCredentials.serial} token={newCredentials.token} />}
          <DialogFooter>
            <Button onClick={() => setNewCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
