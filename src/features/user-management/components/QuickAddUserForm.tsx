import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, Eye, EyeOff, Stethoscope, CheckCircle2, Copy, Check, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { useDepartmentApi } from '@/hooks/useApi';
import { SpecializationSelector } from '@/features/doctor/components/SpecializationSelector';
import { PrimarySpecialityPicker } from '@/features/doctor/components/PrimarySpecialityPicker';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded?: () => void;
  editMode?: boolean;
  initialData?: any;
}

const DOCTOR_ROLES = ['doctor', 'admindoctor'];

const EMPTY = {
  fullName: '', mobileNumber: '', email: '', password: '', confirm: '', roles: [] as string[],
  licenseNumber: '', qualification: '', experienceYears: '', department: '', consultFee: '', primaryMedicalSpecialityId: '',
};

// Snapshot of the just-created member, used for the share-login screen.
interface Created {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  roles: string[];
  hospitalId: string;
}

/** One-step "quick add" or "edit" of a team member. */
export const QuickAddUserForm: React.FC<Props> = ({ open, onOpenChange, onAdded, editMode, initialData }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getAllRoles, quickAddUser, updateUser, shareCredentials } = useUserManagementApi();
  const rolesQuery = getAllRoles();
  const { isReadOnly: isSubscriptionReadOnly } = useSubscriptionReadOnly();
  // The roles table holds a system role plus a per-hospital copy of each role (same name),
  // so the raw list repeats names. Show each role type once. While the subscription is
  // expired/blocked, only Doctor/AdminDoctor can be onboarded — other role types are hidden
  // until the subscription is renewed. Fully open otherwise.
  const roles = useMemo(() => {
    const seen = new Set<string>();
    return (rolesQuery.data?.allRoles ?? []).filter(r => {
      const key = r.roleName?.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      if (isSubscriptionReadOnly && !DOCTOR_ROLES.includes(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rolesQuery.data, isSubscriptionReadOnly]);

  const [form, setForm] = useState({ ...EMPTY });
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  
  React.useEffect(() => {
    if (open && editMode && initialData) {
      setForm({
        fullName: initialData.fullName || '',
        mobileNumber: initialData.mobileNumber || '',
        email: initialData.email || '',
        password: '',
        confirm: '',
        roles: initialData.roles?.map((r: any) => r.roleName) || [],
        licenseNumber: initialData.licenseNumber || '',
        qualification: initialData.qualification?.join(', ') || '',
        experienceYears: initialData.experienceYears ? String(initialData.experienceYears) : '',
        department: initialData.department || '',
        consultFee: initialData.consultFee ? String(initialData.consultFee) : '',
        primaryMedicalSpecialityId: initialData.primaryMedicalSpecialityId || '',
      });
      if (initialData.specializations) {
        setSpecializations(initialData.specializations);
      }
    } else if (open && !editMode) {
      setForm({ ...EMPTY });
      setSpecializations([]);
    }
  }, [open, editMode, initialData]);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isDoctor = useMemo(() => DOCTOR_ROLES.some(dr => form.roles.some(r => r.trim().toLowerCase() === dr)), [form.roles]);
  const submitting = editMode ? updateUser.isPending : quickAddUser.isPending;

  // Departments to pick from (cascades into specializations). Same source the doctor profile uses.
  const departmentsQuery = useDepartmentApi.getGlobalDepartments();
  const departmentOptions = useMemo(() => (departmentsQuery.data?.departments ?? [])
    .filter(d => d.isActive && d.departmentID && d.name?.trim())
    .map(d => ({ id: String(d.departmentID), name: d.name })), [departmentsQuery.data]);
  const selectedDepartment = departmentOptions.find(d => d.id === form.department) || null;

  const reset = () => { setForm({ ...EMPTY }); setSpecializations([]); setShowPwd(false); setCreated(null); setCopied(false); setSendingChannel(null); };

  const closeAll = () => { reset(); onOpenChange(false); };

  const submit = async () => {
    if (!form.fullName.trim() || !form.mobileNumber.trim() || form.roles.length === 0) {
      toast({ title: t('userManagement.quickAdd.missingTitle'), description: t('userManagement.quickAdd.missingDesc'), variant: 'destructive' });
      return;
    }
    if (!editMode) {
      if (!form.password) {
        toast({ title: t('userManagement.quickAdd.missingTitle'), description: t('userManagement.quickAdd.missingDesc'), variant: 'destructive' });
        return;
      }
      if (form.password.length < 6) {
        toast({ title: t('userManagement.quickAdd.weakTitle'), description: t('userManagement.quickAdd.weakDesc'), variant: 'destructive' });
        return;
      }
      if (form.password !== form.confirm) {
        toast({ title: t('userManagement.quickAdd.mismatchTitle'), variant: 'destructive' });
        return;
      }
    }
    if (isDoctor) {
      if (!form.licenseNumber.trim()) {
        toast({ title: t('userManagement.quickAdd.licenseReqTitle'), description: t('userManagement.quickAdd.licenseReqDesc'), variant: 'destructive' });
        return;
      }
      if (!form.department || !selectedDepartment) {
        toast({ title: t('userManagement.quickAdd.departmentReqTitle'), description: t('userManagement.quickAdd.departmentReqDesc'), variant: 'destructive' });
        return;
      }
      if (specializations.length === 0) {
        toast({ title: t('userManagement.quickAdd.specializationReqTitle'), description: t('userManagement.quickAdd.specializationReqDesc'), variant: 'destructive' });
        return;
      }
    }
    const hospitalId = useAuthStore.getState().getHospitalId();
    if (!hospitalId) { toast({ title: t('userManagement.quickAdd.noHospital'), variant: 'destructive' }); return; }

    const toList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    try {
      if (editMode) {
        const res = await updateUser.mutateAsync({
          userId: initialData.userId,
          fullName: form.fullName.trim(),
          mobileNumber: form.mobileNumber.trim(),
          email: form.email.trim() || undefined,
          roles: form.roles,
          hospitalId,
          licenseNumber: isDoctor ? form.licenseNumber.trim() : undefined,
          qualification: isDoctor && form.qualification.trim() ? toList(form.qualification) : undefined,
          experienceYears: isDoctor && form.experienceYears ? Number(form.experienceYears) : undefined,
          department: isDoctor && selectedDepartment ? selectedDepartment.name : undefined,
          specializations: isDoctor && specializations.length ? specializations : undefined,
          primaryMedicalSpecialityId: isDoctor && form.primaryMedicalSpecialityId ? form.primaryMedicalSpecialityId : undefined,
          consultFee: isDoctor && form.consultFee.trim() ? Number(form.consultFee) : undefined,
        });
        if (res.success !== false) {
          onAdded?.();
          closeAll();
        }
      } else {
        const res = await quickAddUser.mutateAsync({
          fullName: form.fullName.trim(),
          mobileNumber: form.mobileNumber.trim(),
          email: form.email.trim() || undefined,
          password: form.password,
          roles: form.roles,
          hospitalId,
          licenseNumber: isDoctor ? form.licenseNumber.trim() : undefined,
          qualification: isDoctor && form.qualification.trim() ? toList(form.qualification) : undefined,
          experienceYears: isDoctor && form.experienceYears ? Number(form.experienceYears) : undefined,
          department: isDoctor && selectedDepartment ? selectedDepartment.name : undefined,
          specializations: isDoctor && specializations.length ? specializations : undefined,
          primaryMedicalSpecialityId: isDoctor && form.primaryMedicalSpecialityId ? form.primaryMedicalSpecialityId : undefined,
          consultFee: isDoctor && form.consultFee.trim() ? Number(form.consultFee) : undefined,
        });
        if (res.success !== false) {
          // Member created — refresh the list behind us and switch to the share-login screen.
          onAdded?.();
          setCreated({
            fullName: form.fullName.trim(),
            mobileNumber: form.mobileNumber.trim(),
            email: form.email.trim(),
            password: form.password,
            roles: form.roles,
            hospitalId,
          });
        }
      }
    } catch { /* mutation toasts the error */ }
  };

  const loginText = useMemo(() => {
    if (!created) return '';
    return [
      t('userManagement.quickAdd.copyHeading'),
      t('userManagement.quickAdd.copySignIn', { url: `${window.location.origin}/login` }),
      t('userManagement.quickAdd.copyLogin', { mobile: created.mobileNumber }),
      t('userManagement.quickAdd.copyPassword', { password: created.password }),
    ].join('\n');
  }, [created, t]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(loginText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('userManagement.quickAdd.copyFailTitle'), description: t('userManagement.quickAdd.copyFailDesc'), variant: 'destructive' });
    }
  };

  const send = async (channel: 'email' | 'whatsapp') => {
    if (!created) return;
    if (channel === 'email' && !created.email) {
      toast({ title: t('userManagement.quickAdd.noEmailTitle'), description: t('userManagement.quickAdd.noEmailDesc'), variant: 'destructive' });
      return;
    }
    setSendingChannel(channel);
    try {
      const res = await shareCredentials.mutateAsync({
        hospitalId: created.hospitalId,
        fullName: created.fullName,
        mobileNumber: created.mobileNumber,
        email: created.email || undefined,
        password: created.password,
        roleName: created.roles.join(', '),
        viaEmail: channel === 'email',
        viaWhatsApp: channel === 'whatsapp',
      });
      if (res.success) {
        toast({ title: t('userManagement.quickAdd.sentTitle'), description: res.message });
      } else {
        toast({ title: t('userManagement.quickAdd.sendFailTitle'), description: res.message || t('userManagement.quickAdd.sendFailDesc'), variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: t('userManagement.quickAdd.sendFailTitle'), description: e?.message || t('userManagement.quickAdd.sendFailDesc'), variant: 'destructive' });
    } finally {
      setSendingChannel(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] max-w-none p-0 flex flex-col overflow-hidden gap-0 border-l border-slate-200">
        {!created ? (
          <>
            <div className="px-6 py-6 bg-gradient-to-br from-brand-600 to-violet-600 text-white flex items-center gap-4 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><UserPlus className="h-6 w-6" /></div>
              <div>
                <SheetTitle className="text-lg font-bold text-white">{editMode ? 'Edit team member' : t('userManagement.quickAdd.title')}</SheetTitle>
                <SheetDescription className="text-sm text-white/80 mt-0.5">{editMode ? 'Update details and roles.' : t('userManagement.quickAdd.subtitle')}</SheetDescription>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.fullName')} <span className="text-red-500">*</span></Label>
                  <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} className="mt-1 rounded-lg" placeholder={t('userManagement.quickAdd.fullNamePlaceholder')} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.mobile')} <span className="text-red-500">*</span></Label>
                  <Input value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} className="mt-1 rounded-lg font-mono" placeholder={t('userManagement.quickAdd.mobilePlaceholder')} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.email')}</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1 rounded-lg" placeholder={t('userManagement.quickAdd.emailPlaceholder')} />
                </div>
                {!editMode && (
                  <>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.password')} <span className="text-red-500">*</span></Label>
                      <div className="relative mt-1">
                        <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} className="rounded-lg pr-9" placeholder={t('userManagement.quickAdd.passwordPlaceholder')} />
                        <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.confirmPassword')} <span className="text-red-500">*</span></Label>
                      <Input type={showPwd ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)} className="mt-1 rounded-lg" placeholder={t('userManagement.quickAdd.confirmPlaceholder')} />
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-slate-600 mb-2 block">{t('userManagement.quickAdd.role')} <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {rolesQuery.isLoading ? <span className="text-sm text-slate-500">{t('userManagement.quickAdd.loadingRoles')}</span> : 
                      roles.map(r => {
                        const isSelected = form.roles.includes(r.roleName);
                        return (
                          <button
                            key={r.roleId}
                            type="button"
                            onClick={() => {
                              const newRoles = isSelected 
                                ? form.roles.filter(x => x !== r.roleName)
                                : [...form.roles, r.roleName];
                              setForm(f => ({ ...f, roles: newRoles }));
                            }}
                            className={`px-3.5 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 border flex items-center gap-2 ${
                              isSelected 
                                ? 'bg-brand-50 border-brand-500 text-brand-800 ring-1 ring-brand-500/20 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 text-brand-600" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center bg-white" />
                            )}
                            {r.roleName}
                          </button>
                        );
                      })
                    }
                  </div>
                  {isSubscriptionReadOnly && (
                    <p className="text-[11px] text-amber-600 mt-1.5">
                      Your hospital's subscription is expired — only Doctor and AdminDoctor can be onboarded until it's renewed.
                    </p>
                  )}
                </div>
              </div>

              {isDoctor && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> {t('userManagement.quickAdd.doctorDetails')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.license')} <span className="text-red-500">*</span></Label>
                      <Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} className="mt-1 rounded-lg" placeholder={t('userManagement.quickAdd.licensePlaceholder')} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.department')} <span className="text-red-500">*</span></Label>
                      <select
                        value={form.department}
                        onChange={e => { set('department', e.target.value); setSpecializations([]); }}
                        disabled={departmentsQuery.isLoading || departmentOptions.length === 0}
                        className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400 disabled:bg-slate-100"
                      >
                        <option value="">
                          {departmentsQuery.isLoading
                            ? t('userManagement.quickAdd.loadingDepartments')
                            : departmentOptions.length === 0
                              ? t('userManagement.quickAdd.noDepartments')
                              : t('userManagement.quickAdd.selectDepartment')}
                        </option>
                        {departmentOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.experience')}</Label>
                      <Input type="number" min={0} value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} className="mt-1 rounded-lg font-mono" placeholder={t('userManagement.quickAdd.experiencePlaceholder')} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.qualification')}</Label>
                      <Input value={form.qualification} onChange={e => set('qualification', e.target.value)} className="mt-1 rounded-lg" placeholder={t('userManagement.quickAdd.qualificationPlaceholder')} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.consultFee')}</Label>
                      <Input type="number" min={0} value={form.consultFee} onChange={e => set('consultFee', e.target.value)} className="mt-1 rounded-lg font-mono" placeholder={t('userManagement.quickAdd.consultFeePlaceholder')} />
                    </div>
                  </div>

                  {/* Specializations cascade from the chosen department — disabled until one is picked */}
                  <div className="pt-1">
                    <Label className="text-[11px] font-semibold text-slate-600">{t('userManagement.quickAdd.specializations')} <span className="text-red-500">*</span></Label>
                    {!form.department && (
                      <p className="mt-1 text-[11px] text-slate-400">{t('userManagement.quickAdd.selectDepartmentFirst')}</p>
                    )}
                    <div className={form.department ? 'mt-2' : 'mt-2 opacity-50 pointer-events-none select-none'}>
                      <SpecializationSelector
                        departmentId={form.department}
                        departmentName={selectedDepartment?.name || ''}
                        selectedSpecializations={specializations}
                        onSpecializationsChange={setSpecializations}
                        disabled={!form.department}
                      />
                    </div>
                  </div>

                  {/* Optional — categorizes this doctor on the public Doctor Dekho listing */}
                  <div className="pt-1">
                    <PrimarySpecialityPicker
                      value={form.primaryMedicalSpecialityId}
                      onChange={(id) => set('primaryMedicalSpecialityId', id)}
                    />
                  </div>
                </div>
              )}
            </div>

            <SheetFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
              <Button variant="outline" onClick={closeAll}>{t('userManagement.quickAdd.cancel')}</Button>
              <Button onClick={submit} disabled={submitting} className="bg-brand-600 hover:bg-brand-700">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />} {editMode ? 'Save Changes' : t('userManagement.quickAdd.addMember')}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="px-6 py-6 bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center gap-4 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><CheckCircle2 className="h-6 w-6" /></div>
              <div>
                <SheetTitle className="text-lg font-bold text-white">{t('userManagement.quickAdd.readyTitle', { name: created.fullName })}</SheetTitle>
                <SheetDescription className="text-sm text-white/80 mt-0.5">{t('userManagement.quickAdd.readySubtitle')}</SheetDescription>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4 flex-1 overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('userManagement.quickAdd.loginMobileLabel')}</span>
                  <span className="text-sm font-mono font-semibold text-slate-800">{created.mobileNumber}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('userManagement.quickAdd.passwordLabel')}</span>
                  <span className="text-sm font-mono font-semibold text-slate-800">{created.password}</span>
                </div>
              </div>

              <Button variant="outline" onClick={copy} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t('userManagement.quickAdd.copied') : t('userManagement.quickAdd.copy')}
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => send('whatsapp')}
                  disabled={sendingChannel !== null}
                  className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  {sendingChannel === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {t('userManagement.quickAdd.sendWhatsapp')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => send('email')}
                  disabled={sendingChannel !== null || !created.email}
                  title={created.email ? undefined : t('userManagement.quickAdd.noEmailDesc')}
                  className="gap-2 border-brand-200 text-brand-700 hover:bg-brand-50"
                >
                  {sendingChannel === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {t('userManagement.quickAdd.sendEmail')}
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                {t('userManagement.quickAdd.changeHint')}
              </p>
            </div>

            <SheetFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
              <Button variant="outline" onClick={() => { reset(); }}>{t('userManagement.quickAdd.addAnother')}</Button>
              <Button onClick={closeAll} className="bg-brand-600 hover:bg-brand-700">{t('userManagement.quickAdd.done')}</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddUserForm;
