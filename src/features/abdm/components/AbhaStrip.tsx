import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, CreditCard, Loader2, QrCode, ShieldCheck, UserPlus } from 'lucide-react';
import { abdmApi, type AbdmProfileShareItem } from '../services/abdmApi';
import { LinkExistingAbhaWizard } from './LinkExistingAbhaWizard';
import { CreateAbhaWizard } from './CreateAbhaWizard';
import { ABHA_SOURCE_LABEL, type AbhaProfileLike, type AbhaSource } from '../utils/abhaPrefill';

export interface AbhaVerified {
  abhaNumber: string;
  abhaAddress?: string;
  source: AbhaSource;
  // The counter scan this came from, so it can be marked handled once the booking is saved.
  profileShareId?: string;
}

interface Props {
  hospitalId?: string;
  // ABHA number currently on the form (may come from an existing patient record).
  abhaId: string;
  // Set when the ABHA was verified in this sitting; drives the green state and its wording.
  verified?: AbhaVerified | null;
  onVerified: (profile: AbhaProfileLike, source: AbhaSource) => void;
  onClear: () => void;
}

/**
 * The ABHA strip at the top of the Book-an-appointment patient form. Three ways in:
 * pick a patient who scanned the counter QR, verify an existing ABHA by OTP, or create one.
 */
export const AbhaStrip: React.FC<Props> = ({ hospitalId, abhaId, verified, onVerified, onClear }) => {
  const [scans, setScans] = useState<AbdmProfileShareItem[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [showScans, setShowScans] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadScans = React.useCallback(() => {
    if (!hospitalId) return;
    setLoadingScans(true);
    abdmApi.getProfileShares(hospitalId, { status: 'NEW' })
      .then(res => setScans((res.items || []).filter(i => i.abhaNumber)))
      .catch(() => { /* scans are a shortcut; the OTP and create paths still work */ })
      .finally(() => setLoadingScans(false));
  }, [hospitalId]);

  useEffect(() => { if (!abhaId) loadScans(); }, [abhaId, loadScans]);

  // A counter scan is a profile the patient already chose to share with this hospital, so it
  // fills the form directly. (The OTP wizard's save needs an OTP proof a scan does not have.)
  const pickScan = (scan: AbdmProfileShareItem) => {
    onVerified(scan, 'scan');
    setShowScans(false);
  };

  const wizards = hospitalId ? (
    <>
      <LinkExistingAbhaWizard
        hospitalId={hospitalId}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onDone={() => { /* the form keeps its own state */ }}
        onLinked={(profile) => { onVerified(profile, 'otp'); setShowScans(false); }}
      />
      <CreateAbhaWizard
        hospitalId={hospitalId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onDone={() => { /* the form keeps its own state */ }}
        onCreated={(result) => onVerified(result, 'created')}
      />
    </>
  ) : null;

  if (abhaId) {
    const isVerified = !!verified && verified.abhaNumber === abhaId;
    return (
      <section
        aria-label={isVerified ? 'ABHA verified' : 'ABHA linked'}
        className="xl:col-span-12 rounded-2xl border-2 border-emerald-500/70 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-3 shadow-sm"
      >
        <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{isVerified ? 'ABHA verified' : 'ABHA linked'}</p>
          <p className="text-xs text-emerald-800 dark:text-emerald-400 truncate">
            <span className="font-mono">{abhaId}</span>
            {isVerified && verified?.abhaAddress ? ` · ${verified.abhaAddress}` : ''}
            {isVerified ? ` · ${ABHA_SOURCE_LABEL[verified!.source]}` : ' · from the patient record'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={onClear} disabled={!hospitalId}>
          Change
        </Button>
        {wizards}
      </section>
    );
  }

  return (
    <section
      aria-label="ABHA"
      className="xl:col-span-12 rounded-2xl border-2 border-dashed border-brand-300 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-white dark:from-brand-950/20 dark:to-transparent px-4 py-3 shadow-sm space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-600/20">
            <CreditCard className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-900 dark:text-brand-300">ABHA (health ID)</p>
            <p className="text-xs text-brand-700/90 dark:text-brand-400/80">Start here: verified details fill the form for you.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 bg-brand-600 hover:bg-brand-700 text-white"
            aria-expanded={showScans}
            onClick={() => { setShowScans(v => !v); if (!showScans) loadScans(); }}
            disabled={!hospitalId}
          >
            <QrCode className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Counter scans{scans.length > 0 ? ` (${scans.length})` : ''}
            <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${showScans ? 'rotate-180' : ''}`} aria-hidden="true" />
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setLinkOpen(true)} disabled={!hospitalId}>
            <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden="true" /> Has ABHA: verify
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setCreateOpen(true)} disabled={!hospitalId}>
            <UserPlus className="h-4 w-4 mr-1.5" aria-hidden="true" /> Create ABHA
          </Button>
        </div>
      </div>

      {showScans && (
        <div className="rounded-xl border bg-background p-2 space-y-1.5">
          {loadingScans && scans.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2 p-2"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Looking for scans…</p>
          ) : scans.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">
              No one is waiting. Ask the patient to scan the hospital QR with their ABHA app, then open this list again.
            </p>
          ) : (
            scans.map(item => (
              <button
                key={item.profileShareId}
                type="button"
                onClick={() => pickScan(item)}
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{item.fullName || 'Unnamed'}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {[item.abhaNumber, item.gender, item.dateOfBirth, item.mobile].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={`text-xs font-semibold shrink-0 ${item.existingPatientId ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {item.existingPatientId ? `Existing patient${item.existingPatientName ? `: ${item.existingPatientName}` : ''}` : 'New patient'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
      {wizards}
    </section>
  );
};
