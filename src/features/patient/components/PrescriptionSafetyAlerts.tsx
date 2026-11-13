import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  prescriptionSafetyApi,
  type PrescriptionSafetyResult,
  type SafetyCheckMedicine,
} from '../services/prescriptionSafetyApi';

interface Props {
  hospitalId: string | null | undefined;
  patientId: string;
  medications: Array<{ name: string; saltName?: string }>;
  /**
   * Called when the clinician acknowledges the warnings, with a ready-to-store one-paragraph summary
   * (what was flagged + the optional reason they typed). Giving a reason is OPTIONAL — acknowledging
   * without one is allowed — and nothing is blocked either way; the caller decides where to persist
   * it (the Rx pad appends a private note; the IPD order dialog appends to the order notes).
   */
  onAcknowledge?: (summary: string) => void;
}

const HIGH = new Set(['CONTRAINDICATED', 'ANAPHYLAXIS', 'SEVERE', 'MAJOR']);

const tone = (severity: string) =>
  HIGH.has((severity || '').toUpperCase())
    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
    : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200';

/**
 * Drug-allergy and drug-drug interaction warnings for the medications on the prescription.
 *
 * Advisory, not a hard stop: the doctor stays in control. If the screen cannot run it says so
 * explicitly ("not checked") -- silence must never be read as "safe". The interaction data is a
 * starter set, so "no warnings" is worded as "no known interactions found", not "safe".
 */
export const PrescriptionSafetyAlerts: React.FC<Props> = ({ hospitalId, patientId, medications, onAcknowledge }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<PrescriptionSafetyResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState('');
  const [ackedKey, setAckedKey] = useState<string | null>(null);

  const meds: SafetyCheckMedicine[] = useMemo(
    () =>
      medications
        .filter(m => (m.name || '').trim().length >= 3)
        .map(m => ({ name: m.name.trim(), genericName: m.saltName?.trim() || undefined })),
    [medications],
  );
  const key = useMemo(() => meds.map(m => `${m.name}|${m.genericName ?? ''}`).join('~'), [meds]);

  useEffect(() => {
    if (!hospitalId || !patientId || meds.length === 0) {
      setResult(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await prescriptionSafetyApi.check(hospitalId, patientId, meds);
        if (!cancelled) {
          setResult(res);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // `key` captures the medication content; avoids refetching on unrelated edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId, patientId, key]);

  if (meds.length === 0) return null;

  if (failed || (result && !result.checked)) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t('safety.notChecked')}</span>
      </div>
    );
  }

  if (!result) return null;

  const { allergyAlerts, interactionAlerts } = result;
  const alertKey = [
    ...allergyAlerts.map(a => `A:${a.medicine}:${a.allergen}`),
    ...interactionAlerts.map(x => `I:${x.medicineA}:${x.medicineB}`),
  ].join('|');
  const acknowledged = ackedKey !== null && ackedKey === alertKey;

  const acknowledge = () => {
    const lines = [
      ...allergyAlerts.map(a => `${a.medicine} — allergy to ${a.allergen} (${a.severity.toLowerCase()})`),
      ...interactionAlerts.map(x => `${x.medicineA} + ${x.medicineB} (${x.severity.toLowerCase()} interaction)`),
    ];
    const text = `[Safety warning acknowledged] ${lines.join('; ')}.${reason.trim() ? ` Reason: ${reason.trim()}` : ''}`;
    onAcknowledge?.(text);
    setAckedKey(alertKey);
    setReason('');
  };

  if (allergyAlerts.length === 0 && interactionAlerts.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('safety.noneFound')}
      </p>
    );
  }

  return (
    <div className="space-y-2" role="alert" aria-live="polite">
      {allergyAlerts.map((a, i) => (
        <div key={`al-${i}`} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tone(a.severity)}`}>
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">
              Possible allergy: {a.medicine} — patient allergic to “{a.allergen}” ({a.severity.toLowerCase()})
            </div>
            <div className="text-xs opacity-90">
              {a.reaction ? `Reaction: ${a.reaction}. ` : ''}
              {a.source === 'PROFILE' ? 'From the allergies recorded on the patient profile.' : 'From the patient’s allergy record.'}{' '}
              Confirm before prescribing.
            </div>
          </div>
        </div>
      ))}
      {interactionAlerts.map((x, i) => (
        <div key={`ix-${i}`} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tone(x.severity)}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">
              Interaction ({x.severity.toLowerCase()}): {x.medicineA} + {x.medicineB}
            </div>
            {x.effect && <div className="text-xs opacity-90">{x.effect}</div>}
            {x.management && <div className="text-xs opacity-90">Suggested: {x.management}</div>}
          </div>
        </div>
      ))}
      {onAcknowledge && (
        acknowledged ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('safety.acknowledged')}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={300}
              placeholder={t('safety.reasonPlaceholder')}
              aria-label={t('safety.reasonPlaceholder')}
              className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={acknowledge}
              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              {t('safety.acknowledge')}
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default PrescriptionSafetyAlerts;
