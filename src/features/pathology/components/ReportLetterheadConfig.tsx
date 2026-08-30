import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyReportTemplate } from '../services/pathologyService';
import { LayoutControlsPanel } from '@/features/prescription/components/layout/LayoutControlsPanel';
import { PreviewPanel } from '@/features/prescription/components/layout/PreviewPanel';
import { TemplateUploadSuccessModal } from '@/features/prescription/components/modals/TemplateUploadSuccessModal';
import { LayoutSaveSuccessModal } from '@/features/prescription/components/modals/LayoutSaveSuccessModal';
import { useReportDesigner } from '../hooks/useReportDesigner';
import { Loader2, FileText, Eye, Plus, Edit2 } from 'lucide-react';
import { ReportTemplateForm } from './ReportTemplateForm';

export const ReportLetterheadConfig: React.FC = () => {
    const { t } = useTranslation();
    const hospitalId = useAuthStore(state => state.hospitalId);
    
    const [templates, setTemplates] = useState<PathologyReportTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PathologyReportTemplate | null>(null);

    // LayoutControlsPanel is shared with the prescription designer, where "system default" means
    // "fall back to the hospital's letterhead when this doctor hasn't uploaded their own" and
    // "valid upto" bounds a doctor's personal override. Pathology report templates are hospital-wide
    // only -- there's no per-doctor override to fall back from -- so these two controls are inert
    // here rather than wired to real state.
    const [useSystemDefault, setUseSystemDefault] = useState(false);
    const [validUpto, setValidUpto] = useState(0);

    const fetchTemplates = async () => {
        if (!hospitalId) return;
        try {
            setIsLoadingTemplates(true);
            const data = await pathologyService.getTemplates(hospitalId);
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [hospitalId]);

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

    if (isLoadingTemplates) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg font-medium">Loading templates...</span>
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
                            <Label htmlFor="template-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Report Template</Label>
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
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedTemplate && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(selectedTemplate)}
                                    title="Edit Template Details"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleAddNew}
                                title="Add New Template"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 px-4 gap-2 whitespace-nowrap"
                                onClick={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())}
                                disabled={!selectedTemplateId}
                            >
                                <Eye className="h-4 w-4" />
                                Live Preview
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedTemplateId ? (
                <div className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <LayoutControlsPanel
                                margins={designer.layoutMargins}
                                onMarginsChange={designer.updateMargins}
                                overflowStrategy={designer.overflowStrategy}
                                onOverflowChange={designer.setOverflowStrategy}
                                useSystemDefault={useSystemDefault}
                                onUseSystemDefaultChange={setUseSystemDefault}
                                validUpto={validUpto}
                                onValidUptoChange={setValidUpto}
                                templateMeta={designer.templateMeta}
                                templateError={designer.templateError}
                                isAnalyzingTemplate={designer.isAnalyzingTemplate}
                                onTemplateUpload={designer.handleTemplateUpload}
                                typography={designer.typography}
                                onTypographyChange={designer.updateTypography}
                                onSaveLayout={designer.saveLayoutSettings}
                                isSavingLayout={designer.isSavingLayout}
                                onPreview={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())}
                            />
                        </div>
                        <div className="space-y-6">
                            <PreviewPanel
                                previewUrl={designer.previewUrl}
                                isGenerating={designer.isGeneratingPreview || designer.isLoadingTemplate}
                                onOpen={designer.openPreviewInNewTab}
                                isTestEnabled={Boolean(designer.templateMeta || designer.serverTemplateUri)}
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
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">No Report Template Selected</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Please select a report template from the dropdown above to design its letterhead.
                        </p>
                    </CardContent>
                </Card>
            )}

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
