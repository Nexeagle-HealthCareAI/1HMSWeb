import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { TestModal } from '@/features/prescription/utils/TestModal';
import { MarginConfig, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';

interface PreviewPanelProps {
  previewUrl: string | null;
  zoom: number;
  isGenerating: boolean;
  onZoomChange: (value: number) => void;
  onOpen: () => void;
  isTestEnabled?: boolean;
  margins: MarginConfig;
  typography: TypographySettings;
  overflowStrategy: 'reuse-template' | 'blank';
  templateFile: File | null;
}

export const PreviewPanel = ({ previewUrl, zoom, isGenerating, onZoomChange, onOpen, isTestEnabled = false, margins, typography, overflowStrategy, templateFile }: PreviewPanelProps) => {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const openTestModal = () => {
    if (!isTestEnabled) return;
    setIsTestModalOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Prescription preview</CardTitle>
          <CardDescription>Browser-safe rendering of the current configuration.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openTestModal} className="shrink-0" disabled={!isTestEnabled}>
          Test
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <AspectRatio ratio={3 / 4}>
            {previewUrl ? (
              <iframe src={previewUrl} title="Prescription preview" className="h-full w-full rounded-md border" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                {isGenerating ? <Skeleton className="h-10 w-3/4" /> : <Eye className="h-6 w-6" />}
                <p>No preview yet. Generate one to validate spacing.</p>
              </div>
            )}
          </AspectRatio>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Zoom</span>
              <span>{zoom}%</span>
            </div>
            <Slider value={[zoom]} min={50} max={150} step={5} onValueChange={(value) => onZoomChange(value[0])} />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onOpen} disabled={!previewUrl}>
            Open preview
          </Button>
        </div>
      </CardContent>
      <TestModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        margins={margins}
        typography={typography}
        overflowStrategy={overflowStrategy}
        templateFile={templateFile}
      />
    </Card>
  );
};
