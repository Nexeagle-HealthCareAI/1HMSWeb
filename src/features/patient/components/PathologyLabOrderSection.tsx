import React, { useState } from 'react';
import { pathologyService } from '@/features/pathology/services/pathologyService';
import { PathologyTestPicker } from '@/features/pathology/components/PathologyTestPicker';
import { resolveOpdBillingEncounterId } from '@/features/pathology/utils/resolveOpdBillingEncounter';
import { Button } from '@/components/ui/button';
import { FlaskConical, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PathologyLabOrderSectionProps {
  hospitalId: string;
  patientId: string;
  doctorId?: string;
  doctorName?: string;
}

interface PlacedOrder {
  orderNo: string;
  testCount: number;
}

// Lets a doctor order pathology tests directly from the prescription pad -- reuses the exact same
// CreatePathologyOrderHandler path the Pathology module's own "New Lab Order" modal calls (no
// separate/parallel billing wiring, unlike the IPD CPOE panel's lab-order cross-write, which turned
// out to have its own billing bugs the module's own path didn't). Submits immediately per click
// (like placing a real order), independent of the rest of the prescription draft's own save flow --
// a doctor shouldn't have to save/finalize the whole prescription just to get a lab order queued.
export const PathologyLabOrderSection: React.FC<PathologyLabOrderSectionProps> = ({ hospitalId, patientId, doctorId, doctorName }) => {
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([]);

  const toggleTest = (testId: string) => {
    setSelectedTestIds(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const sendToLab = async () => {
    if (!patientId || selectedTestIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const encounterId = await resolveOpdBillingEncounterId(patientId);
      const response = await pathologyService.createOrder(hospitalId, {
        patientId,
        encounterId,
        orderedByDoctorId: doctorId || undefined,
        testIds: selectedTestIds,
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
      setPlacedOrders(prev => [...prev, { orderNo: response.orderNo!, testCount: selectedTestIds.length }]);
      setSelectedTestIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send tests to the lab');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-slate-800">Lab Tests</h3>
      </div>

      <PathologyTestPicker hospitalId={hospitalId} selectedTestIds={selectedTestIds} onToggle={toggleTest} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selectedTestIds.length > 0 ? `${selectedTestIds.length} test${selectedTestIds.length > 1 ? 's' : ''} selected` : 'Select tests to send to the lab'}
        </span>
        <Button size="sm" className="h-8 text-xs" disabled={selectedTestIds.length === 0 || isSubmitting} onClick={sendToLab}>
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
          {isSubmitting ? 'Sending...' : 'Send to Lab'}
        </Button>
      </div>

      {placedOrders.length > 0 && (
        <div className="space-y-1 pt-1">
          {placedOrders.map((o, i) => (
            <div key={`${o.orderNo}-${i}`} className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Order {o.orderNo} sent ({o.testCount} test{o.testCount > 1 ? 's' : ''})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PathologyLabOrderSection;
