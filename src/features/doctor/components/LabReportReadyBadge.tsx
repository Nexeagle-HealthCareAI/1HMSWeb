import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FlaskConical } from 'lucide-react';
import { PathologyReportReadyDto } from '@/features/pathology/services/pathologyService';

interface Props {
  reports?: PathologyReportReadyDto[] | null;
}

/** Compact, presentational badge shown alongside AdmissionStatusBadge on each DocBoard row --
 *  same "caller bulk-fetches once and passes the right one per row" shape as that component.
 *  Additive to the existing manual "attach a lab file" feature, not a replacement of it: this
 *  reflects the structured PathologyReport pipeline, which most appointments won't have used yet.
 *  Takes every ready report for the patient (not just one) -- a multi-test order now produces one
 *  report per test, so a patient can genuinely have more than one ready at once. */
export const LabReportReadyBadge: React.FC<Props> = ({ reports }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  if (!reports || reports.length === 0) return null;

  const selectedReport = reports.find(r => r.reportId === selectedReportId) ?? reports[0];

  const openPreview = (reportId: string) => {
    setSelectedReportId(reportId);
    setPreviewOpen(true);
  };

  return (
    <>
      <Badge
        variant="outline"
        className="text-[10px] font-semibold gap-1 whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100"
        onClick={() => openPreview(reports[0].reportId)}
      >
        <FlaskConical className="h-3 w-3 shrink-0" />
        {reports.length > 1 ? `${reports.length} Lab Reports Ready` : 'Lab Report Ready'}
      </Badge>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lab Report {selectedReport.reportNo}{selectedReport.testName ? ` — ${selectedReport.testName}` : ''}</DialogTitle>
            <DialogDescription>Order {selectedReport.orderNo}{selectedReport.generatedAt ? ` · Generated ${new Date(selectedReport.generatedAt).toLocaleString()}` : ''}</DialogDescription>
          </DialogHeader>
          {reports.length > 1 && (
            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
              {reports.map(r => (
                <button
                  key={r.reportId}
                  onClick={() => setSelectedReportId(r.reportId)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    r.reportId === selectedReport.reportId ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {r.testName ?? r.reportNo}
                </button>
              ))}
            </div>
          )}
          {selectedReport.pdfBlobPath ? (
            <iframe src={selectedReport.pdfBlobPath} className="flex-1 w-full rounded-md border" title={`Lab Report ${selectedReport.reportNo}`} />
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
