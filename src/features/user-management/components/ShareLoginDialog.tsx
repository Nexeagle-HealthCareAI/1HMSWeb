import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Copy, Check, Mail, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { useUserManagementApi } from '../hooks/useUserManagementApi';

export interface ShareLoginTarget {
  userId: string;
  fullName: string;
  email?: string;
  mobileNumber: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: ShareLoginTarget | null;
}

interface Issued {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  roleName?: string;
  hospitalId: string;
}

/**
 * Re-shares login for an existing member. The original password can't be recovered (only the hash
 * is stored), so this resets it to a fresh temporary password and lets the admin share it.
 */
export const ShareLoginDialog: React.FC<Props> = ({ open, onOpenChange, target }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { resetCredentials, shareCredentials } = useUserManagementApi();

  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<'email' | 'whatsapp' | null>(null);

  const reset = () => { setIssued(null); setCopied(false); setSendingChannel(null); };
  const closeAll = () => { reset(); onOpenChange(false); };

  const doReset = async () => {
    if (!target) return;
    const hospitalId = useAuthStore.getState().getHospitalId();
    if (!hospitalId) { toast({ title: t('userManagement.quickAdd.noHospital'), variant: 'destructive' }); return; }
    try {
      const res = await resetCredentials.mutateAsync({ hospitalId, userId: target.userId });
      if (res.success && res.tempPassword) {
        setIssued({
          fullName: res.fullName || target.fullName,
          mobileNumber: res.mobileNumber || target.mobileNumber,
          email: res.email || target.email || '',
          password: res.tempPassword,
          roleName: res.roleName,
          hospitalId,
        });
      } else {
        toast({ title: t('userManagement.shareLogin.resetFailTitle'), description: res.message || t('userManagement.shareLogin.resetFailDesc'), variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: t('userManagement.shareLogin.resetFailTitle'), description: e?.message || t('userManagement.shareLogin.resetFailDesc'), variant: 'destructive' });
    }
  };

  const loginText = useMemo(() => {
    if (!issued) return '';
    return [
      t('userManagement.shareLogin.copyHeading'),
      t('userManagement.shareLogin.copySignIn', { url: `${window.location.origin}/login` }),
      t('userManagement.shareLogin.copyLogin', { mobile: issued.mobileNumber }),
      t('userManagement.shareLogin.copyTempPassword', { password: issued.password }),
    ].join('\n');
  }, [issued, t]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(loginText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('userManagement.shareLogin.copyFailTitle'), description: t('userManagement.shareLogin.copyFailDesc'), variant: 'destructive' });
    }
  };

  const send = async (channel: 'email' | 'whatsapp') => {
    if (!issued) return;
    if (channel === 'email' && !issued.email) {
      toast({ title: t('userManagement.shareLogin.noEmailTitle'), description: t('userManagement.shareLogin.noEmailDesc'), variant: 'destructive' });
      return;
    }
    setSendingChannel(channel);
    try {
      const res = await shareCredentials.mutateAsync({
        hospitalId: issued.hospitalId,
        fullName: issued.fullName,
        mobileNumber: issued.mobileNumber,
        email: issued.email || undefined,
        password: issued.password,
        roleName: issued.roleName,
        viaEmail: channel === 'email',
        viaWhatsApp: channel === 'whatsapp',
      });
      if (res.success) toast({ title: t('userManagement.shareLogin.sentTitle'), description: res.message });
      else toast({ title: t('userManagement.shareLogin.sendFailTitle'), description: res.message || t('userManagement.shareLogin.sendFailDesc'), variant: 'destructive' });
    } catch (e: any) {
      toast({ title: t('userManagement.shareLogin.sendFailTitle'), description: e?.message || t('userManagement.shareLogin.sendFailDesc'), variant: 'destructive' });
    } finally {
      setSendingChannel(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {!issued ? (
          <>
            <div className="px-6 py-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><KeyRound className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-base font-bold text-white">{t('userManagement.shareLogin.title', { name: target?.fullName ?? '' })}</DialogTitle>
                <DialogDescription className="text-xs text-white/85">{t('userManagement.shareLogin.subtitle')}</DialogDescription>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{t('userManagement.shareLogin.warning')}</p>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-200">
              <Button variant="outline" onClick={closeAll}>{t('userManagement.shareLogin.cancel')}</Button>
              <Button onClick={doReset} disabled={resetCredentials.isPending} className="bg-amber-600 hover:bg-amber-700">
                {resetCredentials.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />} {t('userManagement.shareLogin.resetContinue')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="px-6 py-4 bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-base font-bold text-white">{t('userManagement.shareLogin.newPwdTitle')}</DialogTitle>
                <DialogDescription className="text-xs text-white/85">{t('userManagement.shareLogin.newPwdSubtitle', { name: issued.fullName })}</DialogDescription>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('userManagement.shareLogin.loginMobileLabel')}</span>
                  <span className="text-sm font-mono font-semibold text-slate-800">{issued.mobileNumber}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('userManagement.shareLogin.tempPasswordLabel')}</span>
                  <span className="text-sm font-mono font-semibold text-slate-800">{issued.password}</span>
                </div>
              </div>

              <Button variant="outline" onClick={copy} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t('userManagement.shareLogin.copied') : t('userManagement.shareLogin.copy')}
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => send('whatsapp')}
                  disabled={sendingChannel !== null}
                  className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  {sendingChannel === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {t('userManagement.shareLogin.sendWhatsapp')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => send('email')}
                  disabled={sendingChannel !== null || !issued.email}
                  title={issued.email ? undefined : t('userManagement.shareLogin.noEmailDesc')}
                  className="gap-2 border-brand-200 text-brand-700 hover:bg-brand-50"
                >
                  {sendingChannel === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {t('userManagement.shareLogin.sendEmail')}
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">{t('userManagement.shareLogin.changeHint')}</p>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-200">
              <Button onClick={closeAll} className="bg-brand-600 hover:bg-brand-700">{t('userManagement.shareLogin.done')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareLoginDialog;
