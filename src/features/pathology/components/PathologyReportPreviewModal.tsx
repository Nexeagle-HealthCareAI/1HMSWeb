import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export interface PathologyReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  isLoading: boolean;
  error: string | null;
  fileName?: string;
  title?: string;
}

// A side drawer (not a centered dialog) sliding in from the right -- keeps the underlying report
// editor visible/reachable at a glance while previewing, per the report editor's "side drawer only"
// popup convention. Layout otherwise mirrors DischargePreviewModal.tsx / PrescriptionPreviewModal.tsx
// (iframe preview + gradient actions rail) minus the translate toggle, which a lab report has no
// equivalent need for. Unlike those two, this drawer doesn't own a data-fetching hook: the caller
// already builds the report PDF client-side (resolveReportPdfData + generatePathologyReportPdf) and
// just hands over the blob URL, since that generation logic is order-specific and already lives in
// PathologyOrderDetailPage.
const PreviewSheetBody: React.FC<Omit<PathologyReportPreviewModalProps, 'open' | 'onOpenChange'>> = ({
  previewUrl, isLoading, error, fileName = 'pathology-report.pdf', title = 'Report Preview',
}) => (
  <SheetContent side="right" className="w-full sm:max-w-none md:w-[92vw] lg:w-[1100px] p-0 flex flex-col overflow-hidden">
    <div className="flex-shrink-0">
      <SheetHeader className="px-6 pt-6 pb-4 text-left">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <Separator />
    </div>

    <div className="flex-1 min-h-0 px-6 py-6 overflow-hidden">
      <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <div className="lg:col-span-2 rounded-lg border bg-muted/30 overflow-hidden h-full">
          {error ? (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-sm text-destructive font-medium">{error}</div>
            </div>
          ) : (
            <div className="relative bg-white h-full w-full">
              {isLoading && <Skeleton className="absolute inset-0 rounded-lg" />}
              {previewUrl && (
                <iframe title={title} src={previewUrl} className="w-full h-full rounded-lg bg-white border-0" style={{ display: 'block' }} />
              )}
            </div>
          )}
        </div>

        <div className="hidden lg:flex flex-col min-w-[200px] overflow-hidden rounded-lg border shadow-sm">
          <div className="flex-shrink-0 bg-gradient-to-b from-brand-50 to-brand-100 px-6 pt-7 pb-4 flex flex-col items-center text-center border-b border-brand-200">
            <div className="text-lg font-semibold text-brand-900 mb-1">Actions</div>
            <div className="text-xs text-brand-700">Rendered with your saved letterhead &amp; report field layout.</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-white px-6 py-8">
            <Button
              variant="default"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold"
              disabled={!previewUrl}
              onClick={() => {
                if (!previewUrl) return;
                const link = document.createElement('a');
                link.href = previewUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download
            </Button>
            <Button
              variant="outline"
              className="w-full border-brand-400 text-brand-700 hover:bg-brand-50 font-semibold"
              disabled={!previewUrl}
              onClick={() => {
                if (!previewUrl) return;
                const printWindow = window.open(previewUrl, '_blank');
                if (printWindow) {
                  printWindow.focus();
                  printWindow.onload = () => printWindow.print();
                }
              }}
            >
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  </SheetContent>
);

export const PathologyReportPreviewModal: React.FC<PathologyReportPreviewModalProps> = ({ open, onOpenChange, ...rest }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    {open ? <PreviewSheetBody {...rest} /> : null}
  </Sheet>
);

export default PathologyReportPreviewModal;
