import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FlaskConical } from 'lucide-react';
import { PathologyReportReadyDto } from '@/features/pathology/services/pathologyService';

interface Props {
  report?: PathologyReportReadyDto | null;
}

/** Compact, presentational badge shown alongside AdmissionStatusBadge on each DocBoard row --
 *  same "caller bulk-fetches once and passes the right one per row" shape as that component.
 *  Additive to the existing manual "attach a lab file" feature, not a replacement of it: this
 *  reflects the structured PathologyReport pipeline, which most appointments won't have used yet. */
export const LabReportReadyBadge: React.FC<Props> = ({ report }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!report) return null;

  return (
    <>
      <Badge
        variant="outline"
        className="text-[10px] font-semibold gap-1 whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100"
        onClick={() => setPreviewOpen(true)}
      >
        <FlaskConical className="h-3 w-3 shrink-0" />
        Lab Report Ready
      </Badge>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lab Report {report.reportNo}</DialogTitle>
            <DialogDescription>Order {report.orderNo}{report.generatedAt ? ` · Generated ${new Date(report.generatedAt).toLocaleString()}` : ''}</DialogDescription>
          </DialogHeader>
          {report.pdfBlobPath ? (
            <iframe src={report.pdfBlobPath} className="flex-1 w-full rounded-md border" title={`Lab Report ${report.reportNo}`} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              The signed PDF isn't available yet -- open the Pathology workspace to check its status.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LabReportReadyBadge;
