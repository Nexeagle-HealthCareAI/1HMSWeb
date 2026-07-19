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
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';
import { cn } from '@/lib/utils';

const EMPTY_HOSPITAL = {
  name: '', type: 'Hospital', registrationNumber: '', email: '', contact: '',
  location: '', city: '', state: '', country: 'India', pincode: '',
};

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

  const [doctors, setDoctors] = useState<ChainDoctorItem[]>([]);
  const [docDialog, setDocDialog] = useState<{ doctor: ChainDoctorItem } | null>(null);
  const [docTarget, setDocTarget] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docFee, setDocFee] = useState('');
  const [deptOptions, setDeptOptions] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Mobile App View UI State
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors'>('hospitals');

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
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-brand-600">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium animate-pulse">Loading network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-24">
      {/* Sticky Header with Glassmorphism */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
            <GitBranch className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Hospital Chain</h1>
            <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">
              {chain?.chainName || 'Manage your network'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 mt-2 space-y-6">
        <SubscriptionReadOnlyOverlay featureLabel="Managing your hospital chain">
        {!chain?.chainId ? (
          // Empty State / Create Chain
          <div className="flex flex-col items-center justify-center text-center p-8 mt-10 rounded-3xl bg-white dark:bg-gray-900 shadow-xl shadow-brand-500/5 border border-brand-100 dark:border-gray-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <GitBranch className="h-64 w-64 text-brand-500" />
            </div>
            <div className="h-20 w-20 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-6 z-10">
              <Plus className="h-10 w-10 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 z-10">Start your network</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 z-10">
              Give your group a name. Your current hospital becomes its first member, and you can securely add more.
            </p>
            <div className="flex flex-col w-full max-w-sm gap-3 z-10">
              <Input 
                value={chainName} 
                onChange={e => setChainName(e.target.value)} 
                placeholder="e.g. NexEagle Hospitals Group" 
                className="h-14 rounded-2xl text-base px-4 text-center border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" 
              />
              <Button onClick={createChain} disabled={creating} className="h-14 rounded-2xl text-base font-semibold bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25">
                {creating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : 'Create Chain'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Custom Tab Navigation */}
            <div className="flex items-center gap-2 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl w-full sm:w-fit mx-auto mb-6">
              <button
                onClick={() => setActiveTab('hospitals')}
                className={cn(
                  'flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300',
                  activeTab === 'hospitals' 
                    ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                Hospitals
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={cn(
                  'flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300',
                  activeTab === 'doctors' 
                    ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                Doctors
              </button>
            </div>

            {activeTab === 'hospitals' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {chain.hospitals.length} Linked Hospitals
                  </h3>
                  <Button onClick={() => setAddOpen(true)} size="sm" className="rounded-full h-9 bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300">
                    <Plus className="h-4 w-4 mr-1.5" /> Add New
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {chain.hospitals.map(h => (
                    <div 
                      key={h.hospitalId} 
                      className="group relative flex flex-col p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                            h.isActive !== false ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          )}>
                            <Building2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{h.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {[h.city, h.state].filter(Boolean).join(', ') || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'h-2 w-2 rounded-full',
                            h.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                          )} />
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {h.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {h.isActive !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deactivatingId === h.hospitalId}
                            onClick={() => deactivateBranch(h.hospitalId, h.name)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl px-3"
                          >
                            {deactivatingId === h.hospitalId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'doctors' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {doctors.length} Registered Doctors
                  </h3>
                </div>

                {doctors.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-white/50 dark:bg-gray-900/50">
                    <UserPlus className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500">No doctors registered in the chain yet.</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {doctors.map(d => (
                    <div 
                      key={d.doctorId} 
                      className="group flex flex-col p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="font-bold text-gray-900 dark:text-white truncate text-base">{d.fullName || 'Doctor'}</p>
                          <p className="text-xs text-gray-500 mt-1">Works at {d.hospitals.length} location(s)</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-5 min-h-[2rem]">
                        {d.hospitals.map(h => (
                          <span key={h.hospitalId} className="text-[10px] font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 border border-gray-200 dark:border-gray-700">
                            {h.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button
                          variant="outline"
                          disabled={targetsFor(d).length === 0}
                          onClick={() => openDoctorDialog(d)}
                          className="w-full h-11 rounded-xl font-semibold border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-800/50 dark:text-brand-300 dark:hover:bg-brand-900/20 transition-colors"
                        >
                          <UserPlus className="h-4 w-4 mr-2" /> 
                          {targetsFor(d).length === 0 ? 'In All Hospitals' : 'Add to Another Hospital'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </SubscriptionReadOnlyOverlay>

        {/* Add-hospital dialog (Bottom Sheet style on Mobile) */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full mx-auto rounded-3xl p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">Add New Branch</DialogTitle>
              <p className="text-sm text-gray-500">Expand your hospital network instantly.</p>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-2 max-h-[60vh] overflow-y-auto px-1 -mx-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Hospital Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} className="h-12 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-brand-500/20" placeholder="e.g. City General Clinic" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Contact *</Label>
                  <Input value={form.contact} onChange={e => set('contact', e.target.value)} className="h-12 rounded-xl font-mono border-gray-200 dark:border-gray-700" placeholder="Phone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">City *</Label>
                  <Input value={form.city} onChange={e => set('city', e.target.value)} className="h-12 rounded-xl border-gray-200 dark:border-gray-700" placeholder="City" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Email</Label>
                <Input value={form.email} onChange={e => set('email', e.target.value)} className="h-12 rounded-xl border-gray-200 dark:border-gray-700" placeholder="Optional" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Address</Label>
                <Input value={form.location} onChange={e => set('location', e.target.value)} className="h-12 rounded-xl border-gray-200 dark:border-gray-700" placeholder="Street / area" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">State</Label>
                  <Input value={form.state} onChange={e => set('state', e.target.value)} className="h-12 rounded-xl border-gray-200 dark:border-gray-700" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">PIN code</Label>
                  <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} className="h-12 rounded-xl font-mono border-gray-200 dark:border-gray-700" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 sm:mt-8 gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="h-12 rounded-xl font-semibold sm:w-auto w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
              <Button onClick={onboard} disabled={saving} className="h-12 rounded-xl font-semibold bg-brand-600 hover:bg-brand-700 sm:w-auto w-full shadow-lg shadow-brand-500/20 text-white">
                {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Plus className="h-5 w-5 mr-2" />} Confirm & Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add-doctor-to-hospital dialog */}
        <Dialog open={!!docDialog} onOpenChange={(v) => { if (!v) setDocDialog(null); }}>
          <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full mx-auto rounded-3xl p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">Assign Location</DialogTitle>
              <p className="text-sm text-gray-500">Add {docDialog?.doctor.fullName || 'this doctor'} to another branch.</p>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Target Hospital *</Label>
                <div className="relative">
                  <select 
                    value={docTarget} 
                    onChange={e => onPickTarget(e.target.value)} 
                    className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 px-4 text-sm bg-white dark:bg-gray-800 appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  >
                    <option value="">Select a branch…</option>
                    {docDialog && targetsFor(docDialog.doctor).map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Department *</Label>
                <div className="relative">
                  <select 
                    value={docDept} 
                    onChange={e => setDocDept(e.target.value)} 
                    disabled={!docTarget || deptLoading} 
                    className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 px-4 text-sm bg-white dark:bg-gray-800 appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 transition-all outline-none"
                  >
                    <option value="">{!docTarget ? 'Pick a hospital first' : deptLoading ? 'Loading…' : 'Select a department…'}</option>
                    {deptOptions.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">OPD Consult Fee (Optional)</Label>
                <Input type="number" min={0} value={docFee} onChange={e => setDocFee(e.target.value)} className="h-12 rounded-xl font-mono border-gray-200 dark:border-gray-700 focus:ring-brand-500/20" placeholder="e.g. 500" />
              </div>
            </div>
            <DialogFooter className="mt-6 sm:mt-8 gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setDocDialog(null)} className="h-12 rounded-xl font-semibold sm:w-auto w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
              <Button onClick={submitAddDoctor} disabled={docSaving} className="h-12 rounded-xl font-semibold bg-brand-600 hover:bg-brand-700 sm:w-auto w-full shadow-lg shadow-brand-500/20 text-white">
                {docSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <UserPlus className="h-5 w-5 mr-2" />} Assign Doctor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChainManagement;
