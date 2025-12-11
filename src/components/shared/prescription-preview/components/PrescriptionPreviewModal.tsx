import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { usePrescriptionPreview } from '../hooks/usePrescriptionPreview';
import { type GeneratePrescriptionDetailsRequest } from '../services/generatePrescriptionDetailsService';

export interface PrescriptionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: GeneratePrescriptionDetailsRequest | null;
  title?: string;
  description?: string;
}

const PreviewModalBody = ({
  request,
  title,
  description,
}: Omit<PrescriptionPreviewModalProps, 'open' | 'onOpenChange'>) => {
  const { t } = useTranslation();
  const { previewUrl, templateUrl, isLoading, error, regeneratePreview } = usePrescriptionPreview({
    request,
  });

  const buildPdfEmbed = (url: string | null) => {
    if (!url) return { src: null as string | null, srcDoc: null as string | null };
    try {
      const hasFragment = url.includes('#');
      const separator = hasFragment ? '&' : '#';
      const pdfUrl = `${url}${separator}toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH`;
      const srcDoc = `<!doctype html><html><head><style>html,body{margin:0;padding:0;height:100%;background:#fff;}embed{width:100%;height:100%;border:0;background:#fff;}</style></head><body><embed src="${pdfUrl}" type="application/pdf" /></body></html>`;
      return { src: null, srcDoc };
    } catch {
      return { src: url, srcDoc: null };
    }
  };


  return (
    <DialogContent className="max-w-[90vw] xl:max-w-[1100px] 2xl:max-w-[1200px] w-full max-h-[95vh] p-0 overflow-hidden">
      <div className="flex flex-col gap-0 h-[92vh]">
          <DialogHeader className="px-6 pt-6 pb-4">
            {title ? <DialogTitle>{title}</DialogTitle> : <DialogTitle>{t('prescriptionPreview.title')}</DialogTitle>}
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription>{t('prescriptionPreview.description')}</DialogDescription>
            )}
          </DialogHeader>
          <Separator />
          <div className="px-6 py-4" />
          <div className="px-6 pb-6 flex-1 overflow-auto">
            <div className="min-h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-lg border bg-muted/30 h-full overflow-hidden">
                {error && (
                  <div className="p-6 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {!error && (
                  <div className="relative bg-white h-full overflow-hidden">
                    {previewUrl && isLoading && (
                      <Skeleton className="h-full w-full rounded-lg" />
                    )}
                    {
                      previewUrl && (() => {
                        const embed = buildPdfEmbed(previewUrl);
                        return (
                          <iframe
                            title={t('prescriptionPreview.previewFrameTitle')}
                            src={embed.src ?? undefined}
                            srcDoc={embed.srcDoc ?? undefined}
                            className="h-full w-full rounded-lg bg-white"
                          />
                        );
                      })()
                    }
                  </div>
                )}
              </div>

              <div className="hidden lg:flex flex-col items-center justify-start min-w-[220px] h-full p-0">
                <div className="w-full bg-gradient-to-b from-blue-50 to-blue-100 rounded-t-lg px-6 pt-7 pb-4 flex flex-col items-center text-center border-b border-blue-200">
                  <div className="text-lg font-semibold text-blue-900 mb-1">{t('prescriptionPreview.actions.title')}</div>
                  <div className="text-xs text-blue-700 mb-2">{t('prescriptionPreview.actions.description')}</div>
                  <div className="text-[11px] text-blue-500">{t('prescriptionPreview.actions.tip')}</div>
                </div>
                <div className="flex-1 w-full flex flex-col items-center justify-center gap-5 bg-white rounded-b-lg px-6 pb-8 pt-8">
                  <Button
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
                    disabled={!previewUrl}
                    onClick={() => {
                      if (previewUrl) {
                        const link = document.createElement('a');
                        link.href = previewUrl;
                        link.download = 'prescription.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    {t('prescriptionPreview.actions.download')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-900/40"
                    disabled={!previewUrl}
                    onClick={() => {
                      if (navigator.share && previewUrl) {
                        fetch(previewUrl)
                          .then(res => res.blob())
                          .then(blob => {
                            const file = new File([blob], 'prescription.pdf', { type: 'application/pdf' });
                            navigator.share({
                              title: t('prescriptionPreview.share.title'),
                              text: t('prescriptionPreview.share.text'),
                              files: [file],
                            });
                          });
                      } else {
                        alert(t('prescriptionPreview.share.unsupported'));
                      }
                    }}
                  >
                    {t('prescriptionPreview.actions.share')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-900/40"
                    disabled={!previewUrl}
                    onClick={e => {
                      e.stopPropagation();
                      if (previewUrl) {
                        // Open PDF in a new window and trigger print
                        const printWindow = window.open(previewUrl, '_blank');
                        if (printWindow) {
                          printWindow.focus();
                          // Wait for the PDF to load before printing
                          printWindow.onload = () => {
                            printWindow.print();
                          };
                        }
                      }
                    }}
                  >
                    {t('prescriptionPreview.actions.print')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
  );
};

export const PrescriptionPreviewModal = ({
  open,
  onOpenChange,
  request,
  title,
  description,
}: PrescriptionPreviewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PreviewModalBody request={request} title={title} description={description} />
      ) : null}
    </Dialog>
  );
};
