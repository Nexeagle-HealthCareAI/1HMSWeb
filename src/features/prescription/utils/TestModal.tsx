import { ChangeEvent, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { defaultPrescriptionData } from '@/features/prescription/utils/prescriptionTestData';
import { MarginConfig, PrescriptionDesignerData, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { resolveTemplateFetchUrl } from '@/features/prescription/utils/templateFetch';
import { buildTemplateBoundPreview, TemplateBoundLayoutConfig } from '@/components/shared/prescription-preview/services/previewRenderer';
import { generateTemplateBoundPrescription } from './generateTemplateBoundPrescription';

interface TestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  margins: MarginConfig;
  typography: TypographySettings;
  overflowStrategy: 'reuse-template' | 'blank';
  templateFile: File | null;
  templateUrl?: string | null;
}

const deriveFileNameFromUrl = (url: string) => {
  const withoutQuery = url.split('?')[0] ?? url;
  const candidate = withoutQuery.split('/').pop() || 'prescription-template.pdf';
  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
};

const downloadTemplateFromUrl = async (url: string): Promise<File> => {
  const fetchTarget = resolveTemplateFetchUrl(url);
  if (!fetchTarget) {
    throw new Error('Template url is missing. Upload a template before running the test.');
  }

  const response = await fetch(fetchTarget, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.status}`);
  }
  const blob = await response.blob();
  const fileName = deriveFileNameFromUrl(url);
  return new File([await blob.arrayBuffer()], fileName, { type: blob.type || 'application/pdf' });
};

export const TestModal = ({ open, onOpenChange, margins, typography, overflowStrategy, templateFile, templateUrl }: TestModalProps) => {
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(defaultPrescriptionData, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedPrescription, setParsedPrescription] = useState<PrescriptionDesignerData | null>(defaultPrescriptionData);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open) {
      setJsonError(null);
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
        setGeneratedPreviewUrl(null);
      }
    }
  }, [open, generatedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
    };
  }, [generatedPreviewUrl]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonValue) as PrescriptionDesignerData;
      setParsedPrescription(parsed);
      setJsonError(null);
    } catch (error) {
      setParsedPrescription(null);
      setJsonError('Invalid JSON structure. Fix syntax before running the test.');
    }
  }, [jsonValue]);

  const handleJsonChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setJsonValue(event.target.value);
  };

  const handleGenerate = async () => {
    // Use user-edited JSON (parsedPrescription) for preview generation
    if (!parsedPrescription) {
      setJsonError('Invalid JSON structure. Fix syntax before running the test.');
      return;
    }
    setIsGenerating(true);
    try {
      const headerHeight = margins.top;
      const footerHeight = margins.bottom;
      let resolvedTemplateFile = templateFile;

      if (!resolvedTemplateFile && templateUrl) {
        resolvedTemplateFile = await downloadTemplateFromUrl(templateUrl);
      }

      let blob: Blob;
      if (resolvedTemplateFile) {
        const layoutConfig: TemplateBoundLayoutConfig = {
          margins,
          headerHeight,
          footerHeight,
          overflowStrategy,
        };
        blob = await generateTemplateBoundPrescription({
          templateFile: resolvedTemplateFile,
          layout: layoutConfig,
          typography,
          prescription: parsedPrescription,
        });
      }

      const nextUrl = URL.createObjectURL(blob);
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
      setGeneratedPreviewUrl(nextUrl);
      setJsonError(null);
    } catch (error) {
      console.error('Failed to generate test preview', error);
      const message = error instanceof Error
        ? error.message
        : 'Unable to generate preview. Check console for details.';
      setJsonError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[90vh] min-w-[900px] min-h-[600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Test prescription preview</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2 h-[500px] min-h-[500px]">
          <div className="space-y-3 h-full min-w-[350px] flex flex-col">
            <p className="text-sm font-semibold">Prescription JSON</p>
            <Textarea value={jsonValue} onChange={handleJsonChange} className="h-[28rem] font-mono text-xs flex-1" />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-3 pb-1 mt-auto z-10 border-t">
              <Button variant="outline" type="button" onClick={handleClose}>
                Close
              </Button>
              <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate preview'}
              </Button>
            </div>
          </div>
          <div className="space-y-3 h-full min-w-[350px] flex flex-col">
            <p className="text-sm font-semibold">Live preview</p>
            <div className="rounded-lg border bg-muted/40 p-3 flex-1 flex flex-col">
              {generatedPreviewUrl ? (
                <div className="h-[28rem] w-full flex-1">
                  <iframe
                    src={generatedPreviewUrl}
                    title="Prescription test preview"
                    className="h-full w-full rounded-md border-0 bg-transparent"
                    style={{ background: 'transparent' }}
                  />
                </div>
              ) : null}
              {!generatedPreviewUrl && (
                <div className="flex h-[28rem] items-center justify-center text-sm text-muted-foreground">
                  Generate a preview to render the PDF output here.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

