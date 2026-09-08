import React, { useEffect, useState } from 'react';
import { pathologyService, PathologyTestMaster } from '@/features/pathology/services/pathologyService';
import { resolveOpdBillingEncounterId } from '@/features/pathology/utils/resolveOpdBillingEncounter';
import { Button } from '@/components/ui/button';
import { FlaskConical, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PathologyInvestigationLabSyncProps {
  hospitalId: string;
  patientId: string;
  doctorId?: string;
  // The doctor's own free-text "Investigations" chips (prescriptionData.orders.investigations) --
  // this component never edits that list itself, it only reads it.
  investigations: string[];
}

// Rather than a separate "Lab Tests" picker (which risked a doctor typing "CBC" into the existing
// Investigations chips AND separately picking CBC from a second UI -- printed twice, and only one
// of them actually billed), this reads the SAME Investigations list the doctor already types into
// and finds which entries match a catalogued PathologyTestMaster test by name/code. Matched-and-
// unsent ones get one "Send to Lab" action that places a real PathologyOrder for just those --
// same CreatePathologyOrderHandler path, same billing behaviour, as the standalone Pathology
// module's own order flow. Investigations that don't match anything in the catalog (imaging,
// procedures not yet catalogued, etc.) stay exactly as they are today: free text, printed, not billed.
export const PathologyInvestigationLabSync: React.FC<PathologyInvestigationLabSyncProps> = ({
  hospitalId, patientId, doctorId, investigations,
}) => {
  const [testCatalog, setTestCatalog] = useState<PathologyTestMaster[]>([]);
  const [sentNames, setSentNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderNo, setLastOrderNo] = useState<string | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
  }, [hospitalId]);

  const norm = (s: string) => s.trim().toLowerCase();

  const matchedTests = investigations
    .map(name => ({
      name,
      test: testCatalog.find(t => norm(t.testName) === norm(name) || norm(t.testCode) === norm(name)),
    }))
    .filter((m): m is { name: string; test: PathologyTestMaster } => !!m.test);

  const pendingMatches = matchedTests.filter(m => !sentNames.includes(norm(m.name)));

  if (matchedTests.length === 0) return null;

  const sendToLab = async () => {
    if (!patientId || pendingMatches.length === 0) return;
    setIsSubmitting(true);
    try {
      const encounterId = await resolveOpdBillingEncounterId(patientId);
      const response = await pathologyService.createOrder(hospitalId, {
        patientId,
        encounterId,
        orderedByDoctorId: doctorId || undefined,
        testIds: pendingMatches.map(m => m.test.testId),
        sourceType: 'OPD',
      });
      if (!response.success) {
        toast.error('Could not send tests to the lab', { description: response.message });
        return;
      }
      toast.success('Sent to Pathology Lab', { description: response.orderNo });
      if (response.billingWarning) {
        toast.warning('Billing needs attention', { description: response.billingWarning, duration: 10000 });
      }
      setSentNames(prev => [...prev, ...pendingMatches.map(m => norm(m.name))]);
      setLastOrderNo(response.orderNo ?? null);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send tests to the lab');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-brand-800 dark:text-brand-200">
        <FlaskConical className="h-4 w-4" />
        <span className="text-xs font-bold">
          {matchedTests.length} investigation{matchedTests.length > 1 ? 's' : ''} match the lab catalog
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matchedTests.map(m => {
          const isSent = sentNames.includes(norm(m.name));
          return (
            <span
              key={m.name}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-brand-300 text-brand-700'}`}
            >
              {isSent && <CheckCircle2 className="h-3 w-3" />}
              {m.name}
            </span>
          );
        })}
      </div>

      {pendingMatches.length > 0 ? (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-brand-700 dark:text-brand-300">
            Sending bills the patient and queues these in Pathology Lab.
          </span>
          <Button size="sm" className="h-7 text-xs" disabled={isSubmitting} onClick={sendToLab}>
            {isSubmitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            {isSubmitting ? 'Sending...' : `Send ${pendingMatches.length} to Lab`}
          </Button>
        </div>
      ) : lastOrderNo ? (
        <div className="text-[11px] text-emerald-700 pt-1">All matched tests sent — order {lastOrderNo}.</div>
      ) : null}
    </div>
  );
};

export default PathologyInvestigationLabSync;
