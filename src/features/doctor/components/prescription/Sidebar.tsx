import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from './Field';
import { NumberMm } from './NumberMm';
import { SignatureUploader } from './SignatureUploader';
import { TemplateState, DEFAULT_TEMPLATE_STATE } from '../../types/prescription';
import { downloadJson, openJsonFile } from '../../utils/download';

interface SidebarProps {
  state: TemplateState;
  setState: React.Dispatch<React.SetStateAction<TemplateState>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, setState }) => {
  const {
    layoutMode,
    headerHtml,
    footerHtml,
    headerHeightMm,
    footerHeightMm,
    minContentHeightMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    signatureDataUrl,
    signatureWidthMm,
    signatureAnchor,
    zoomPct
  } = state;

  const updateState = (updates: Partial<TemplateState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Calculate if header/footer height would violate min content height
  const availableHeight = 297 - marginTopMm - marginBottomMm; // A4 height minus margins
  const headerSpace = layoutMode === 'header' ? headerHeightMm : 0;
  const footerSpace = layoutMode === 'footer' ? footerHeightMm : 0;
  const contentSpace = availableHeight - headerSpace - footerSpace;
  
  const headerWarning = layoutMode === 'header' && contentSpace < minContentHeightMm;
  const footerWarning = layoutMode === 'footer' && contentSpace < minContentHeightMm;

  const handleExport = () => {
    downloadJson('prescription-template.json', state);
  };

  const handleImport = async () => {
    try {
      const importedData = await openJsonFile();
      // Basic validation
      if (importedData && typeof importedData === 'object') {
        setState({ ...DEFAULT_TEMPLATE_STATE, ...importedData });
      } else {
        alert('Invalid template file');
      }
    } catch (error) {
      alert('Error importing template: ' + (error as Error).message);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default values?')) {
      setState(DEFAULT_TEMPLATE_STATE);
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Layout Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {(['header', 'footer', 'none'] as const).map((mode) => (
              <label key={mode} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="layoutMode"
                  value={mode}
                  checked={layoutMode === mode}
                  onChange={(e) => updateState({ layoutMode: e.target.value as any })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm capitalize">
                  {mode === 'header' ? 'Header Only' : mode === 'footer' ? 'Footer Only' : 'None'}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      {layoutMode === 'header' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="HTML Content">
              <textarea
                value={headerHtml}
                onChange={(e) => updateState({ headerHtml: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="Enter HTML content for header..."
              />
            </Field>
            <Field 
              label="Height" 
              error={headerWarning ? 'Height too large for minimum content area' : undefined}
            >
              <NumberMm
                value={headerHeightMm}
                onChange={(value) => updateState({ headerHeightMm: value })}
                min={0}
                max={90}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      {layoutMode === 'footer' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Footer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="HTML Content">
              <textarea
                value={footerHtml}
                onChange={(e) => updateState({ footerHtml: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="Enter HTML content for footer..."
              />
            </Field>
            <Field 
              label="Height" 
              error={footerWarning ? 'Height too large for minimum content area' : undefined}
            >
              <NumberMm
                value={footerHeightMm}
                onChange={(value) => updateState({ footerHeightMm: value })}
                min={0}
                max={90}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Upload Image">
            <SignatureUploader
              dataUrl={signatureDataUrl}
              onUpload={(dataUrl) => updateState({ signatureDataUrl: dataUrl })}
              onRemove={() => updateState({ signatureDataUrl: undefined })}
            />
          </Field>
          
          {signatureDataUrl && (
            <>
              <Field label="Position">
                <select
                  value={signatureAnchor}
                  onChange={(e) => updateState({ signatureAnchor: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="top-right">Top-Right (under header)</option>
                  <option value="bottom-right">Bottom-Right (above footer)</option>
                </select>
              </Field>
              
              <Field label="Width">
                <NumberMm
                  value={signatureWidthMm}
                  onChange={(value) => updateState({ signatureWidthMm: value })}
                  min={10}
                  max={100}
                />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Page Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Page & Margins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Minimum Content Height">
            <NumberMm
              value={minContentHeightMm}
              onChange={(value) => updateState({ minContentHeightMm: value })}
              min={50}
              max={200}
            />
          </Field>
          
          <div className="grid grid-cols-2 gap-3">
            <Field label="Top Margin">
              <NumberMm
                value={marginTopMm}
                onChange={(value) => updateState({ marginTopMm: value })}
                min={0}
                max={50}
              />
            </Field>
            <Field label="Right Margin">
              <NumberMm
                value={marginRightMm}
                onChange={(value) => updateState({ marginRightMm: value })}
                min={0}
                max={50}
              />
            </Field>
            <Field label="Bottom Margin">
              <NumberMm
                value={marginBottomMm}
                onChange={(value) => updateState({ marginBottomMm: value })}
                min={0}
                max={50}
              />
            </Field>
            <Field label="Left Margin">
              <NumberMm
                value={marginLeftMm}
                onChange={(value) => updateState({ marginLeftMm: value })}
                min={0}
                max={50}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Zoom */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview Zoom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label={`Zoom: ${zoomPct}%`}>
            <input
              type="range"
              min="50"
              max="150"
              value={zoomPct}
              onChange={(e) => updateState({ zoomPct: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} className="w-full" variant="outline">
            Export JSON
          </Button>
          <Button onClick={handleImport} className="w-full" variant="outline">
            Import JSON
          </Button>
          <Button onClick={handleReset} className="w-full" variant="destructive">
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
