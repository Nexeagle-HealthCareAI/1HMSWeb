import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Loader2, GitBranch, MapPin, Check, Stethoscope, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { hospitalApi, type MyChainResponse, type ChainDoctorItem } from '../services/hospitalApi';
import { appointmentApi, type Department } from '@/features/appointment/services/appointmentApi';

const EMPTY_HOSPITAL = {
  name: '', type: 'Hospital', registrationNumber: '', email: '', contact: '',
  location: '', city: '', state: '', country: 'India', pincode: '',
};

/**
 * Hospital-chain management for an owner (Admin/AdminDoctor): create a chain from their existing
 * hospital, then onboard more hospitals into it. All complexity (IDs, numbering) is server-side.
 */
export const ChainManagement: React.FC = () => {
  const { toast } = useToast();
  const userId = useAuthStore(s => s.userId);

  const [chain, setChain] = useState<MyChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chainName, setChainName] = useState('');
  const [creating, setCreating] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_HOSPITAL });
  const [saving, setSaving] = useState(false);

  // Doctors across the chain + add-doctor-to-hospital dialog state.
  const [doctors, setDoctors] = useState<ChainDoctorItem[]>([]);
  const [docDialog, setDocDialog] = useState<{ doctor: ChainDoctorItem } | null>(null);
  const [docTarget, setDocTarget] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docFee, setDocFee] = useState('');
  const [deptOptions, setDeptOptions] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const c = await hospitalApi.getMyChain();
      setChain(c);
      if (c?.chainId) {
        try { setDoctors(await hospitalApi.getChainDoctors()); } catch { /* non-blocking */ }
      }
    } catch {
      toast({ title: 'Could not load your chain', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const refreshSwitcher = async () => {
    try { useAuthStore.getState().setHospitals(await hospitalApi.getMyHospitals()); } catch { /* non-blocking */ }
  };

  const deactivateBranch = async (hospitalId: string, name: string) => {
    if (!window.confirm(`Deactivate "${name}"? Staff will no longer be able to access this branch.`)) return;
    setDeactivatingId(hospitalId);
    try {
      const res = await hospitalApi.deactivateHospital(hospitalId);
      if (!res.success) throw new Error(res.message ?? 'Could not deactivate the hospital');
      toast({ title: 'Hospital deactivated', description: res.message });
      await load();
      await refreshSwitcher();
    } catch (e: any) {
      toast({ title: 'Could not deactivate the hospital', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setDeactivatingId(null);
    }
  };

  const createChain = async () => {
    if (!chainName.trim()) { toast({ title: 'Enter a chain name', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const res = await hospitalApi.createChain(chainName.trim());
      if (res.success === false) throw new Error(res.message ?? 'Could not create the chain');
      toast({ title: 'Chain created', description: `${res.hospitalsLinked ?? 0} hospital(s) linked.` });
      setChainName('');
      await load();
      await refreshSwitcher();
    } catch (e: any) {
      toast({ title: 'Could not create the chain', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const onboard = async () => {
    if (!chain?.chainId) return;
    if (!form.name.trim() || !form.contact.trim() || !form.city.trim()) {
      toast({ title: 'Missing details', description: 'Name, contact and city are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await hospitalApi.onboardHospitalToChain(chain.chainId, {
        ...form,
        userId: userId ?? '',
        alternateContact: '', website: '', timeZone: '',
      } as any);
      if ((res as any)?.success === false) throw new Error((res as any)?.message ?? 'Could not onboard the hospital');
      toast({ title: 'Hospital added', description: `${form.name} joined the chain.` });
      setAddOpen(false);
      setForm({ ...EMPTY_HOSPITAL });
      await load();
      await refreshSwitcher();
    } catch (e: any) {
      toast({ title: 'Could not add the hospital', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof EMPTY_HOSPITAL, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Hospitals in the chain this doctor is NOT yet part of (candidates to add them to).
  const targetsFor = (doctor: ChainDoctorItem) => {
    const inIds = new Set(doctor.hospitals.map(h => h.hospitalId));
    return (chain?.hospitals ?? []).filter(h => !inIds.has(h.hospitalId));
  };

  const openDoctorDialog = (doctor: ChainDoctorItem) => {
    setDocDialog({ doctor });
    setDocTarget(''); setDocDept(''); setDocFee(''); setDeptOptions([]);
  };

  const onPickTarget = async (hospitalId: string) => {
    setDocTarget(hospitalId);
    setDocDept('');
    setDeptOptions([]);
    if (!hospitalId) return;
    setDeptLoading(true);
    try {
      const res = await appointmentApi.getDepartments(hospitalId);
      setDeptOptions(res.departments ?? []);
    } catch {
      toast({ title: 'Could not load departments', variant: 'destructive' });
    } finally {
      setDeptLoading(false);
    }
  };

  const submitAddDoctor = async () => {
    if (!chain?.chainId || !docDialog) return;
    if (!docTarget || !docDept) { toast({ title: 'Pick a hospital and department', variant: 'destructive' }); return; }
    setDocSaving(true);
    try {
      const res = await hospitalApi.addDoctorToHospital(chain.chainId, {
        doctorId: docDialog.doctor.doctorId,
        targetHospitalId: docTarget,
        departmentId: docDept,
        consultFee: docFee ? Number(docFee) : undefined,
      });
      if (res.success === false) throw new Error(res.message ?? 'Could not add the doctor');
      toast({ title: res.alreadyMember ? 'Already there' : 'Doctor added', description: res.message ?? '' });
      setDocDialog(null);
      setDoctors(await hospitalApi.getChainDoctors());
    } catch (e: any) {
      toast({ title: 'Could not add the doctor', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setDocSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading your chain…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center"><GitBranch className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hospital chain</h1>
          <p className="text-sm text-slate-500">Connect multiple hospitals under one group you own.</p>
        </div>
      </div>

      {!chain?.chainId ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Create your chain</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Give your group a name. Your current hospital becomes its first member, and you can add more.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={chainName} onChange={e => setChainName(e.target.value)} placeholder="e.g. NexEagle Hospitals Group" className="flex-1" />
              <Button onClick={createChain} disabled={creating} className="bg-brand-600 hover:bg-brand-700">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Create chain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {chain.chainName}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{chain.hospitals.length} hospital{chain.hospitals.length === 1 ? '' : 's'} in this chain</p>
              </div>
              <Button onClick={() => setAddOpen(true)} className="bg-brand-600 hover:bg-brand-700"><Plus className="h-4 w-4 mr-2" /> Add hospital</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {chain.hospitals.map(h => (
                <div key={h.hospitalId} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 p-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-gray-100 truncate flex items-center gap-2">
                      {h.name}
                      {h.isActive === false && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {[h.city, h.state].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  {h.isActive !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deactivatingId === h.hospitalId}
                      onClick={() => deactivateBranch(h.hospitalId, h.name)}
                      className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 shrink-0"
                    >
                      {deactivatingId === h.hospitalId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Deactivate'}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Doctors across the chain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-brand-600" /> Doctors</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Add a doctor to more than one hospital in your chain.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctors.length === 0 && <p className="text-sm text-slate-400">No doctors in this chain yet.</p>}
              {doctors.map(d => (
                <div key={d.doctorId} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 p-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Stethoscope className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-gray-100 truncate">{d.fullName || 'Doctor'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.hospitals.map(h => (
                        <span key={h.hospitalId} className="text-[11px] rounded-full bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 px-2 py-0.5">{h.name}</span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={targetsFor(d).length === 0}
                    onClick={() => openDoctorDialog(d)}
                    title={targetsFor(d).length === 0 ? 'Already in every hospital' : 'Add to another hospital'}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Add to hospital
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add-hospital dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add a hospital to the chain</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-semibold text-slate-600">Hospital name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" placeholder="Hospital name" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Type</Label>
              <Input value={form.type} onChange={e => set('type', e.target.value)} className="mt-1" placeholder="Hospital / Clinic" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Registration number</Label>
              <Input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Contact *</Label>
              <Input value={form.contact} onChange={e => set('contact', e.target.value)} className="mt-1 font-mono" placeholder="Phone" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Email</Label>
              <Input value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-semibold text-slate-600">Address</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} className="mt-1" placeholder="Street / area" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">City *</Label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">State</Label>
              <Input value={form.state} onChange={e => set('state', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Country</Label>
              <Input value={form.country} onChange={e => set('country', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">PIN code</Label>
              <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} className="mt-1 font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={onboard} disabled={saving} className="bg-brand-600 hover:bg-brand-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add hospital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-doctor-to-hospital dialog */}
      <Dialog open={!!docDialog} onOpenChange={(v) => { if (!v) setDocDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add {docDialog?.doctor.fullName || 'doctor'} to a hospital</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Hospital *</Label>
              <select value={docTarget} onChange={e => onPickTarget(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                <option value="">Select a hospital…</option>
                {docDialog && targetsFor(docDialog.doctor).map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Department *</Label>
              <select value={docDept} onChange={e => setDocDept(e.target.value)} disabled={!docTarget || deptLoading} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white disabled:opacity-50">
                <option value="">{!docTarget ? 'Pick a hospital first' : deptLoading ? 'Loading…' : 'Select a department…'}</option>
                {deptOptions.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">OPD consult fee (optional)</Label>
              <Input type="number" min={0} value={docFee} onChange={e => setDocFee(e.target.value)} className="mt-1 font-mono" placeholder="e.g. 500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(null)}>Cancel</Button>
            <Button onClick={submitAddDoctor} disabled={docSaving} className="bg-brand-600 hover:bg-brand-700">
              {docSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />} Add doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChainManagement;
