import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { formatTokenNumber } from '@/lib/utils';
import type { PathologyOrderDto } from '../services/pathologyService';

interface PathologyTokenPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PathologyOrderDto | null;
}

// Mirrors Appointments' TokenPrintModal.tsx (same 80mm thermal layout, same formatTokenNumber
// letter-grouping) but for a pathology order's daily token: Order No + tests replace
// doctor/referrer/guardian, and there's no QR/scan-to-track since pathology tokens aren't tied to
// a live per-doctor queue-calling system the way appointment tokens are.
export const PathologyTokenPrintModal: React.FC<PathologyTokenPrintModalProps> = ({ open, onOpenChange, order }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const getHospitalId = useAuthStore(state => state.getHospitalId);
  const { data: hospitalData } = useHospitalApi.getHospitalById(getHospitalId() || '');

  const hospitalAddress = React.useMemo(() => {
    if (!hospitalData) return undefined;
    return [hospitalData.location, hospitalData.city, hospitalData.state].filter(Boolean).join(', ');
  }, [hospitalData]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    onAfterPrint: () => onOpenChange(false),
  });

  if (!order || order.tokenNumber == null) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Token</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto max-h-[80vh]">
          <div className="flex justify-center w-full">
            <div
              ref={componentRef}
              className="bg-white p-2 flex flex-col items-center text-center shadow-sm print:shadow-none print:w-full print:m-0 print:py-0 print:pl-4"
              style={{
                width: '80mm',
                minHeight: '100px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: 'black',
              }}
            >
              <style type="text/css" media="print">
                {`
                  @page { size: 80mm auto; margin: 0; }
                  body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                `}
              </style>

              <div className="w-full border-b-2 border-black pb-2 mb-2 text-center">
                <div className="font-black text-[16px] leading-tight uppercase tracking-widest break-words whitespace-normal text-black">{hospitalData?.name || 'Loading Hospital...'}</div>
                {hospitalAddress && (
                  <div className="text-[10px] uppercase tracking-wide leading-tight mt-1 whitespace-normal text-gray-800">{hospitalAddress}</div>
                )}
              </div>

              <div className="w-full border-2 border-black p-2 mb-3 text-center rounded-sm relative mt-2">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white print:bg-white px-2 text-[10px] font-black uppercase tracking-[0.2em]">Token No.</div>
                <div className="text-3xl font-black mt-1 leading-none tracking-tighter">{formatTokenNumber(order.tokenNumber)}</div>
              </div>

              <div className="w-full border-t border-b border-black py-2 mb-3 space-y-1.5 text-left px-1">
                <div className="flex justify-between items-baseline border-b border-black/10 pb-1.5">
                  <span className="font-bold text-[9px] uppercase tracking-wider">Patient</span>
                  <span className="font-black text-[13px] text-right truncate pl-2">{order.patientName}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-black/10 pb-1.5">
                  <span className="font-bold text-[9px] uppercase tracking-wider">Patient ID</span>
                  <span className="font-mono font-bold text-[11px]">{order.patientId}</span>
                </div>
                {(order.patientAgeYears != null || order.patientGender) && (
                  <div className="flex justify-between items-baseline border-b border-black/10 pb-1.5">
                    <span className="font-bold text-[9px] uppercase tracking-wider">Age/Sex</span>
                    <span className="font-bold text-[11px]">
                      {[order.patientAgeYears != null ? `${order.patientAgeYears} Y` : null, order.patientGender?.charAt(0)].filter(Boolean).join(' / ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pb-0.5">
                  <span className="font-bold text-[9px] uppercase tracking-wider">Order No</span>
                  <span className="font-mono font-bold text-[11px]">{order.orderNo}</span>
                </div>
              </div>

              {order.testNames.length > 0 && (
                <div className="w-full text-left mb-3 px-1">
                  <div className="font-bold text-[9px] uppercase tracking-wider mb-1">Tests</div>
                  <div className="font-bold text-[11px] leading-snug">{order.testNames.join(', ')}</div>
                </div>
              )}

              <div className="flex flex-col items-center w-full">
                <div className="text-[9px] mt-1 font-bold text-center w-full border-t border-black pt-1.5">
                  Please wait for your turn.
                </div>
                <div className="text-[9px] mt-1 text-center w-full uppercase tracking-wider">
                  {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-3 mt-4 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button onClick={handlePrint} className="flex-1 sm:flex-none gap-2">
            <Printer className="w-4 h-4" />
            Print Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PathologyTokenPrintModal;
