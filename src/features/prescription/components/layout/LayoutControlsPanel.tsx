import { ChangeEvent } from 'react';
import { FileText, Ruler } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { MarginConfig, TemplateMetadata, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';

interface LayoutControlsPanelProps {
  margins: MarginConfig;
  onMarginsChange: (next: MarginConfig) => void;
  overflowStrategy: 'reuse-template' | 'blank';
  onOverflowChange: (strategy: 'reuse-template' | 'blank') => void;
  templateMeta: TemplateMetadata | null;
  templateError: string | null;
  isAnalyzingTemplate: boolean;
  onTemplateUpload: (file: File) => void;
  onApplyRecommendedMargins?: () => void;
  typography: TypographySettings;
  onTypographyChange: (next: Partial<TypographySettings>) => void;
  onSaveLayout?: () => void;
}

const clampMargin = (value: number) => {
  if (Number.isNaN(value)) return 10;
  return Math.min(Math.max(value, 5), 45);
};

const marginLabels: Record<keyof MarginConfig, string> = {
  top: 'Header height',
  right: 'Content right margin',
  bottom: 'Footer height',
  left: 'Content left margin',
};

export const LayoutControlsPanel = ({
  margins,
  onMarginsChange,
  overflowStrategy,
  onOverflowChange,
  templateMeta,
  templateError,
  isAnalyzingTemplate,
  onTemplateUpload,
  onApplyRecommendedMargins,
  typography,
  onTypographyChange,
  onSaveLayout,
}: LayoutControlsPanelProps) => {
  const handleMarginInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const parsed = clampMargin(Number(value));
    onMarginsChange({
      ...margins,
      [name]: parsed,
    } as MarginConfig);
  };

  const handleTemplateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onTemplateUpload(file);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Upload design PDF
          </CardTitle>
          <CardDescription>Attach a hospital-branded template or sample prescription layout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary hover:bg-primary/10">
            <span className="font-medium">Upload design PDF</span>
            <span className="text-xs text-primary/80">Ideal for letterheads, templates, or sample prescriptions</span>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Choose file</span>
            <Input type="file" accept="application/pdf" className="hidden" onChange={handleTemplateChange} disabled={isAnalyzingTemplate} />
          </label>
          {templateError && <p className="text-sm text-destructive">{templateError}</p>}
          {templateMeta && (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{templateMeta.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {templateMeta.fileSizeKb} KB · {templateMeta.orientationHint.toUpperCase()} layout · {templateMeta.pageSize.width} ×{' '}
                {templateMeta.pageSize.height} {templateMeta.pageSize.unit}
              </p>
              {templateMeta.wasConverted && templateMeta.originalPageSize && (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Non-A4 upload converted from {templateMeta.originalPageSize.width} × {templateMeta.originalPageSize.height}{' '}
                  {templateMeta.originalPageSize.unit} to standard A4 before previewing.
                </p>
              )}
              {onApplyRecommendedMargins && (
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onApplyRecommendedMargins}>
                  Apply recommended margins
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4" />
            Layout controls
          </CardTitle>
          <CardDescription>Fine-tune margins, overflow behavior, and typography before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Margin settings</p>
                <p className="text-xs text-muted-foreground">Control the printable safe area in millimeters.</p>
              </div>
            </div>
            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                {(['top', 'bottom'] as Array<keyof MarginConfig>).map((side) => (
                  <div key={side} className="space-y-1.5">
                    <Label htmlFor={`margin-${side}`}>{marginLabels[side]}</Label>
                    <Input
                      id={`margin-${side}`}
                      name={side}
                      type="number"
                      min={5}
                      max={45}
                      value={margins[side]}
                      onChange={handleMarginInput}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['left', 'right'] as Array<keyof MarginConfig>).map((side) => (
                  <div key={side} className="space-y-1.5">
                    <Label htmlFor={`margin-${side}`}>{marginLabels[side]}</Label>
                    <Input
                      id={`margin-${side}`}
                      name={side}
                      type="number"
                      min={5}
                      max={45}
                      value={margins[side]}
                      onChange={handleMarginInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-sm font-semibold text-foreground">Overflow pages</p>
              <p className="text-xs text-muted-foreground">Choose what happens after the first sheet fills up.</p>
            </div>
            <RadioGroup value={overflowStrategy} onValueChange={(value) => onOverflowChange(value as 'reuse-template' | 'blank')} className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                <RadioGroupItem value="reuse-template" className="mt-1" />
                <div>
                  <p className="font-medium text-foreground">Reuse uploaded layout</p>
                  <p className="text-xs text-muted-foreground">Every extra page reuses the imported background.</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                <RadioGroupItem value="blank" className="mt-1" />
                <div>
                  <p className="font-medium text-foreground">Use blank page</p>
                  <p className="text-xs text-muted-foreground">Keep overflow sheets plain for more writing room.</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Typography</p>
              <p className="text-xs text-muted-foreground">Dial in font family, sizing, weight, and ink color.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Font family</Label>
              <Select value={typography.family} onValueChange={(value) => onTypographyChange({ family: value as TypographySettings['family'] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times">Times New Roman</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Label>Font size</Label>
                <span>{typography.size} pt</span>
              </div>
              <Slider value={[typography.size]} min={9} max={18} step={1} onValueChange={(value) => onTypographyChange({ size: value[0] })} />
            </div>

            <div className="space-y-1.5">
              <Label>Weight</Label>
              <Select value={typography.weight} onValueChange={(value) => onTypographyChange({ weight: value as TypographySettings['weight'] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select weight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="font-color">Text color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="font-color"
                  type="color"
                  className="h-10 w-16 cursor-pointer p-1"
                  value={typography.color}
                  onChange={(event) => onTypographyChange({ color: event.target.value })}
                />
                <Input value={typography.color} onChange={(event) => onTypographyChange({ color: event.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={onSaveLayout} disabled={!onSaveLayout}>
              Save layout settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
