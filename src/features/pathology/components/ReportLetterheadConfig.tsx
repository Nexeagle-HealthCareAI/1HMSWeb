import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyReportTemplate, PathologyLetterheadMode } from '../services/pathologyService';
import { hospitalApi, HospitalData } from '@/features/hospital/services/hospitalApi';
import { PreviewPanel } from '@/features/prescription/components/layout/PreviewPanel';
import { TemplateUploadSuccessModal } from '@/features/prescription/components/modals/TemplateUploadSuccessModal';
import { LayoutSaveSuccessModal } from '@/features/prescription/components/modals/LayoutSaveSuccessModal';
import { useReportDesigner, MarginConfig } from '../hooks/useReportDesigner';
import { Loader2, FileText, Eye, Plus, Edit2, Sparkles, FileX, Upload, Ruler, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ReportTemplateForm } from './ReportTemplateForm';

const clampMargin = (value: number) => {
  if (Number.isNaN(value)) return 10;
  return Math.min(Math.max(value, 0), 1000);
};

const LETTERHEAD_MODE_OPTIONS: { value: PathologyLetterheadMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'CUSTOM_TEMPLATE',
    label: 'Upload custom letterhead',
    description: 'Use your own letterhead PDF, positioned behind every page.',
    icon: <Upload className="h-3.5 w-3.5 text-primary shrink-0" />,
  },
  {
    value: 'BLANK_PREPRINTED',
    label: 'Leave blank (pre-printed stationery)',
    description: 'Draw nothing in the margin band -- for hospitals that print on their own physical letterhead stock.',
    icon: <FileX className="h-3.5 w-3.5 text-primary shrink-0" />,
  },
  {
    value: 'SYSTEM_DEFAULT',
    label: 'Use system default',
    description: "An auto-generated header/footer from your hospital's name, address and registration details.",
    icon: <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />,
  },
];

export const ReportLetterheadConfig: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [templates, setTemplates] = useState<PathologyReportTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PathologyReportTemplate | null>(null);

  // Which source the real, signed report PDF draws its header/footer from -- a hospital-wide
  // setting (LabConfiguration), independent of which individual template is being edited below.
  const [letterheadMode, setLetterheadMode] = useState<PathologyLetterheadMode>('SYSTEM_DEFAULT');
  const [isLoadingMode, setIsLoadingMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Lab identity overrides (fall back to the hospital's own profile when blank) + the static
  // manual sign-off labels printed on every report -- see LabConfiguration.cs.
  const [labName, setLabName] = useState('');
  const [labAddress, setLabAddress] = useState('');
  const [labRegistrationNumber, setLabRegistrationNumber] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [pathologistName, setPathologistName] = useState('');
  const [technicianNameTouched, setTechnicianNameTouched] = useState(false);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalData | null>(null);

  const fetchTemplates = async () => {
    if (!hospitalId) return;
    try {
      setIsLoadingTemplates(true);
      const data = await pathologyService.getTemplates(hospitalId);
      setTemplates(data);
      if (!selectedTemplateId) {
        const defaultTemplate = data.find(t => t.isDefault) ?? data[0];
        if (defaultTemplate) setSelectedTemplateId(defaultTemplate.templateId);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchMode = async () => {
    if (!hospitalId) return;
    try {
      setIsLoadingMode(true);
      const config = await pathologyService.getLabConfig(hospitalId);
      setLetterheadMode(config.letterheadMode ?? 'SYSTEM_DEFAULT');
      setLabName(config.labName ?? '');
      setLabAddress(config.labAddress ?? '');
      setLabRegistrationNumber(config.labRegistrationNumber ?? '');
      setTechnicianName(config.technicianName ?? '');
      setPathologistName(config.pathologistName ?? '');
    } catch (error) {
      console.error('Failed to fetch lab configuration:', error);
    } finally {
      setIsLoadingMode(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchMode();
    if (hospitalId) {
      hospitalApi.getHospitalById(hospitalId).then(setHospitalProfile).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  // Same address composition defaultLetterhead.ts's footer uses, so the placeholder shown here
  // matches exactly what would print if Lab Address is left blank.
  const hospitalAddressPlaceholder = hospitalProfile
    ? [hospitalProfile.location, hospitalProfile.city, [hospitalProfile.state, hospitalProfile.pincode].filter(Boolean).join(' - ')].filter(Boolean).join(', ')
    : '';

  const designer = useReportDesigner(selectedTemplateId, hospitalId || undefined);

  const handleAddNew = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: PathologyReportTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchTemplates();
  };

  const handleLivePreview = async () => {
    const url = await designer.generatePreview(letterheadMode);
    if (url) window.open(url, '_blank', 'noopener');
  };

  // Saves both halves of "letterhead configuration" as one action: the hospital-wide source mode
  // (LabConfiguration, read-modify-write -- updateLabConfig overwrites the whole row, so the
  // current config is re-fetched first rather than assumed) and the selected template's own
  // margins/typography/overflow strategy (PathologyReportTemplate.layoutJson, via useReportDesigner).
  const handleSaveAll = async () => {
    if (!hospitalId) return;
    if (!technicianName.trim()) {
      setTechnicianNameTouched(true);
      toast.error('Technician Name is required', { description: 'Set who is accountable for reports from this lab before saving.' });
      return;
    }
    setIsSaving(true);
    try {
      const current = await pathologyService.getLabConfig(hospitalId);
      await pathologyService.updateLabConfig(hospitalId, {
        autoBillOnOrder: current.autoBillOnOrder,
        defaultReportHeaderBlob: current.defaultReportHeaderBlob,
        defaultReportFooterText: current.defaultReportFooterText,
        letterheadMode,
        labName: labName.trim() || undefined,
        labAddress: labAddress.trim() || undefined,
        labRegistrationNumber: labRegistrationNumber.trim() || undefined,
        technicianName: technicianName.trim(),
        pathologistName: pathologistName.trim() || undefined,
      });
      if (selectedTemplateId) {
        await designer.saveLayoutSettings();
      } else {
        toast.success('Saved', { description: 'Letterhead source updated.' });
      }
    } catch (error) {
      console.error('Failed to save letterhead configuration', error);
      toast.error('Save failed', { description: 'Could not save the letterhead configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarginInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const parsed = clampMargin(Number(value));
    if (!Number.isNaN(parsed)) {
      designer.updateMargins({ ...designer.layoutMargins, [name]: parsed } as MarginConfig);
    }
  };

  const handleTemplateFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      designer.handleTemplateUpload(file);
      event.target.value = '';
    }
  };

  if (isLoadingTemplates || isLoadingMode) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Loading letterhead configuration...</span>
      </div>
    );
  }

  const selectedTemplate = templates.find(t => t.templateId === selectedTemplateId);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-r from-brand-50/50 to-brand-50/50 dark:from-brand-900/10 dark:to-brand-900/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="template-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template-select" className="bg-white dark:bg-gray-950 max-sm:border-transparent max-sm:rounded-xl max-sm:h-12">
                  <SelectValue placeholder="Select a report template to design" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 && (
                    <SelectItem value="none" disabled>No templates configured</SelectItem>
                  )}
                  {templates.map((template) => (
                    <SelectItem key={template.templateId} value={template.templateId}>
                      {template.templateName} ({template.templateCode}) {template.isDefault ? ' - Default' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && !selectedTemplate.isDefault && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  This template isn't the Default one -- only the Default template's letterhead/margins are used on finalized reports.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedTemplate && (
                <Button variant="outline" size="icon" onClick={() => handleEdit(selectedTemplate)} title="Edit Template Details">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleAddNew} title="Add New Template">
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-10 px-4 gap-2 whitespace-nowrap"
                onClick={handleLivePreview}
                disabled={designer.isGeneratingPreview}
              >
                <Eye className="h-4 w-4" />
                {designer.isGeneratingPreview ? 'Generating...' : 'Live Preview'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Letterhead Source
              </CardTitle>
              <CardDescription>Where the header/footer on a signed pathology report comes from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={letterheadMode} onValueChange={(value) => setLetterheadMode(value as PathologyLetterheadMode)} className="space-y-3">
                {LETTERHEAD_MODE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                    <RadioGroupItem value={opt.value} className="mt-1" />
                    <div className="flex items-start gap-1.5">
                      {opt.icon}
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {letterheadMode === 'CUSTOM_TEMPLATE' && (
                <>
                  <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary hover:bg-primary/10">
                    <span className="font-medium">Upload letterhead PDF</span>
                    <span className="text-xs text-primary/80">Best for a scanned/designed A4 letterhead</span>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Choose file</span>
                    <Input type="file" accept="application/pdf" className="hidden" onChange={handleTemplateFileChange} disabled={designer.isAnalyzingTemplate || !selectedTemplateId} />
                  </label>
                  {!selectedTemplateId && (
                    <p className="text-xs text-muted-foreground">Select or create a template above before uploading.</p>
                  )}
                  {designer.templateError && <p className="text-sm text-destructive">{designer.templateError}</p>}
                  {designer.templateMeta && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{designer.templateMeta.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {designer.templateMeta.fileSizeKb} KB · {designer.templateMeta.orientationHint.toUpperCase()} layout · {designer.templateMeta.pageSize.width} × {designer.templateMeta.pageSize.height} {designer.templateMeta.pageSize.unit}
                      </p>
                      {designer.templateMeta.wasConverted && designer.templateMeta.originalPageSize && (
                        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Non-A4 upload converted from {designer.templateMeta.originalPageSize.width} × {designer.templateMeta.originalPageSize.height}{' '}
                          {designer.templateMeta.originalPageSize.unit} to standard A4.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" />
                Lab Identity &amp; Sign-off
              </CardTitle>
              <CardDescription>Shown on every generated report when using the system default letterhead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lab-name">Lab Name</Label>
                <Input
                  id="lab-name"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder={hospitalProfile?.name || 'Lab name'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use your hospital's own name{hospitalProfile?.name ? ` (${hospitalProfile.name})` : ''}.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-address">Lab Address</Label>
                <Textarea
                  id="lab-address"
                  value={labAddress}
                  onChange={(e) => setLabAddress(e.target.value)}
                  placeholder={hospitalAddressPlaceholder || 'Lab address'}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Leave blank to use your hospital's own address.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-reg">Lab Registration Number</Label>
                <Input
                  id="lab-reg"
                  value={labRegistrationNumber}
                  onChange={(e) => setLabRegistrationNumber(e.target.value)}
                  placeholder={hospitalProfile?.registrationNumber || 'Registration number'}
                />
                <p className="text-xs text-muted-foreground">Leave blank to use your hospital's own registration number.</p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="technician-name">
                  Technician Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="technician-name"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  onBlur={() => setTechnicianNameTouched(true)}
                  placeholder="e.g. Rajesh Kumar"
                  className={technicianNameTouched && !technicianName.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {technicianNameTouched && !technicianName.trim() ? (
                  <p className="text-xs text-destructive">Required before this lab can start creating new orders.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Printed as the manual sign-off name on every report.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pathologist-name">Pathologist Name</Label>
                <Input
                  id="pathologist-name"
                  value={pathologistName}
                  onChange={(e) => setPathologistName(e.target.value)}
                  placeholder="Optional"
                />
                <p className="text-xs text-muted-foreground">Leave blank if no pathologist reviews reports at this lab.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-4 w-4" />
                Margins
              </CardTitle>
              <CardDescription>Applied to every mode -- reserves room for your letterhead artwork, or just spaces out a blank/default header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(['top', 'bottom', 'left', 'right'] as Array<keyof MarginConfig>).map((side) => (
                  <div key={side} className="space-y-1.5">
                    <Label htmlFor={`margin-${side}`} className="capitalize">{side} (mm)</Label>
                    <Input
                      id={`margin-${side}`}
                      name={side}
                      type="number"
                      min={0}
                      max={1000}
                      value={designer.layoutMargins[side]}
                      onChange={handleMarginInput}
                      disabled={!selectedTemplateId}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Typography</p>
                  <p className="text-xs text-muted-foreground">Saved for reference -- report text currently always renders in the system font.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Font family</Label>
                  <Select value={designer.typography.family} onValueChange={(value) => designer.updateTypography({ family: value as typeof designer.typography.family })} disabled={!selectedTemplateId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times">Times New Roman</SelectItem>
                      <SelectItem value="Courier">Courier</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Size</Label>
                    <span>{designer.typography.size} pt</span>
                  </div>
                  <Slider value={[designer.typography.size]} min={9} max={18} step={1} onValueChange={(v) => designer.updateTypography({ size: v[0] })} disabled={!selectedTemplateId} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleSaveAll} disabled={isSaving || designer.isSavingLayout}>
                  {isSaving || designer.isSavingLayout ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PreviewPanel
            previewUrl={designer.previewUrl}
            isGenerating={designer.isGeneratingPreview || designer.isLoadingTemplate}
            onOpen={designer.openPreviewInNewTab}
            isTestEnabled={false}
            margins={designer.layoutMargins}
            typography={designer.typography}
            overflowStrategy={designer.overflowStrategy}
            templateFile={designer.templateFile}
            templateUrl={designer.serverTemplateUri}
          />
        </div>
      </div>

      <TemplateUploadSuccessModal
        open={designer.templateUploadSuccessOpen}
        onOpenChange={designer.setTemplateUploadSuccessOpen}
        message={designer.templateUploadSuccessMessage}
      />
      <LayoutSaveSuccessModal
        open={designer.layoutSaveSuccessOpen}
        onOpenChange={designer.setLayoutSaveSuccessOpen}
        message={designer.layoutSaveSuccessMessage}
      />

      {isFormOpen && (
        <ReportTemplateForm
          template={editingTemplate}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};
