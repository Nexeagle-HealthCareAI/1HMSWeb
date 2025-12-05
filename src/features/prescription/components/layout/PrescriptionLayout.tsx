import { LayoutControlsPanel } from '@/features/prescription/components/layout/LayoutControlsPanel';
import { PreviewPanel } from '@/features/prescription/components/layout/PreviewPanel';
import { usePrescriptionDesigner } from '@/features/prescription/hooks/usePrescriptionDesigner';

export const PrescriptionLayout = () => {
  const designer = usePrescriptionDesigner();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prescription designer</h1>
          <p className="text-sm text-muted-foreground">Upload brand templates, tune layout, and preview printable prescriptions.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <LayoutControlsPanel
            margins={designer.layoutMargins}
            onMarginsChange={designer.updateMargins}
            overflowStrategy={designer.overflowStrategy}
            onOverflowChange={designer.setOverflowStrategy}
            templateMeta={designer.templateMeta}
            templateError={designer.templateError}
            isAnalyzingTemplate={designer.isAnalyzingTemplate}
            onTemplateUpload={designer.handleTemplateUpload}
            onApplyRecommendedMargins={designer.applyRecommendedMargins}
            typography={designer.typography}
            onTypographyChange={designer.updateTypography}
            onSaveLayout={designer.generatePreview}
          />
        </div>
        <PreviewPanel
          previewUrl={designer.previewUrl}
          zoom={designer.zoom}
          isGenerating={designer.isGeneratingPreview}
          onZoomChange={(value) => designer.setZoom(value)}
          onOpen={designer.openPreviewInNewTab}
          isTestEnabled={Boolean(designer.templateMeta)}
          margins={designer.layoutMargins}
          typography={designer.typography}
          overflowStrategy={designer.overflowStrategy}
          templateFile={designer.templateFile}
        />
      </div>
    </div>
  );
};
