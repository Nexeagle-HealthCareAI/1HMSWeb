import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Ruler, Eye } from 'lucide-react';
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
  typography: TypographySettings;
  onTypographyChange: (next: Partial<TypographySettings>) => void;


  validUpto: number;
  onValidUptoChange: (days: number) => void;
  onSaveLayout?: () => void;
  isSavingLayout?: boolean;
  onPreview?: () => void;
}

const clampMargin = (value: number) => {
  if (Number.isNaN(value)) return 10;
  return Math.min(Math.max(value, 0), 1000);
};

// Labels moved into component to use t() function

export const LayoutControlsPanel = ({
  margins,
  onMarginsChange,
  overflowStrategy,
  onOverflowChange,
  templateMeta,
  templateError,
  isAnalyzingTemplate,
  onTemplateUpload,
  typography,
  onTypographyChange,
  validUpto,
  onValidUptoChange,
  onSaveLayout,
  isSavingLayout,
  onPreview,
}: LayoutControlsPanelProps) => {
  const { t } = useTranslation();

  const marginLabels: Record<keyof MarginConfig, string> = {
    top: t('prescriptionDesigner.controls.margins.headerHeight'),
    right: t('prescriptionDesigner.controls.margins.rightMargin'),
    bottom: t('prescriptionDesigner.controls.margins.footerHeight'),
    left: t('prescriptionDesigner.controls.margins.leftMargin'),
  };
  const handleMarginInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    // Allow empty string for user editing, don't update until valid number
    if (value === '') {
      onMarginsChange({
        ...margins,
        [name]: value,
      } as MarginConfig);
      return;
    }
    const parsed = clampMargin(Number(value));
    if (!Number.isNaN(parsed)) {
      onMarginsChange({
        ...margins,
        [name]: parsed,
      } as MarginConfig);
    }
  };

  const handleTemplateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onTemplateUpload(file);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 [&_input]:max-sm:bg-gray-100/80 [&_input]:max-sm:border-transparent [&_input]:max-sm:rounded-xl [&_input]:max-sm:h-12 [&_input]:max-sm:px-4 [&_button[role='combobox']]:max-sm:bg-gray-100/80 [&_button[role='combobox']]:max-sm:border-transparent [&_button[role='combobox']]:max-sm:rounded-xl [&_button[role='combobox']]:max-sm:h-12 dark:[&_input]:max-sm:bg-slate-800 dark:[&_button[role='combobox']]:max-sm:bg-slate-800">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t('prescriptionDesigner.controls.uploadTitle')}
          </CardTitle>
          <CardDescription>{t('prescriptionDesigner.controls.uploadDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary hover:bg-primary/10">
            <span className="font-medium">{t('prescriptionDesigner.controls.uploadTitle')}</span>
            <span className="text-xs text-primary/80">{t('prescriptionDesigner.controls.idealFor')}</span>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{t('prescriptionDesigner.controls.chooseFile')}</span>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4" />
            {t('prescriptionDesigner.controls.layoutControls')}
          </CardTitle>
          <CardDescription>{t('prescriptionDesigner.controls.layoutDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t('prescriptionDesigner.controls.marginSettings')}</p>
                <p className="text-xs text-muted-foreground">{t('prescriptionDesigner.controls.marginDescription')}</p>
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
                      min={0}
                      max={1000}
                      value={margins[side] === 0 ? (typeof margins[side] === 'string' ? margins[side] : 0) : margins[side]}
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
                      min={0}
                      max={1000}
                      value={margins[side] === 0 ? (typeof margins[side] === 'string' ? margins[side] : 0) : margins[side]}
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
              <p className="text-sm font-semibold text-foreground">{t('prescriptionDesigner.controls.overflow.title')}</p>
              <p className="text-xs text-muted-foreground">{t('prescriptionDesigner.controls.overflow.description')}</p>
            </div>
            <RadioGroup value={overflowStrategy} onValueChange={(value) => onOverflowChange(value as 'reuse-template' | 'blank')} className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                <RadioGroupItem value="reuse-template" className="mt-1" />
                <div>
                  <p className="font-medium text-foreground">{t('prescriptionDesigner.controls.overflow.reuse')}</p>
                  <p className="text-xs text-muted-foreground">{t('prescriptionDesigner.controls.overflow.reuseDescription')}</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                <RadioGroupItem value="blank" className="mt-1" />
                <div>
                  <p className="font-medium text-foreground">{t('prescriptionDesigner.controls.overflow.blank')}</p>
                  <p className="text-xs text-muted-foreground">{t('prescriptionDesigner.controls.overflow.blankDescription')}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('prescriptionDesigner.controls.typography.title')}</p>
              <p className="text-xs text-muted-foreground">{t('prescriptionDesigner.controls.typography.description')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('prescriptionDesigner.controls.typography.family')}</Label>
              <Select value={typography.family} onValueChange={(value) => onTypographyChange({ family: value as TypographySettings['family'] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('prescriptionDesigner.controls.typography.selectFont')} />
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
                <Label>{t('prescriptionDesigner.controls.typography.size')}</Label>
                <span>{typography.size} {t('prescriptionDesigner.controls.typography.pt')}</span>
              </div>
              <Slider value={[typography.size]} min={9} max={18} step={1} onValueChange={(value) => onTypographyChange({ size: value[0] })} />
            </div>

            <div className="space-y-1.5">
              <Label>{t('prescriptionDesigner.controls.typography.weight')}</Label>
              <Select value={typography.weight} onValueChange={(value) => onTypographyChange({ weight: value as TypographySettings['weight'] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('prescriptionDesigner.controls.typography.selectWeight')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="font-color">{t('prescriptionDesigner.controls.typography.color')}</Label>
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

          <Separator />

          <Separator />

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
            <div className="space-y-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300">
                    <FileText className="h-3 w-3" />
                  </span>
                  {t('prescriptionDesigner.controls.validity.title')}
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
                  {t('prescriptionDesigner.controls.validity.description')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid-upto" className="text-amber-900 dark:text-amber-100">
                  {t('prescriptionDesigner.controls.validity.label')}
                </Label>
                <Input
                  id="valid-upto"
                  type="number"
                  min={0}
                  value={validUpto}
                  onChange={(e) => onValidUptoChange(Number(e.target.value))}
                  className="bg-white dark:bg-gray-950 border-amber-200 dark:border-amber-800 focus-visible:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onPreview}
              disabled={!onPreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('prescriptionDesigner.controls.actions.preview')}
            </Button>
            <Button type="button" onClick={onSaveLayout} disabled={!onSaveLayout || isSavingLayout}>
              {isSavingLayout ? t('prescriptionDesigner.controls.actions.saving') : t('prescriptionDesigner.controls.actions.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
