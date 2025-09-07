import React from 'react';
import { usePrescriptionStore } from '@/store/prescription';
import { ImageUploader } from './ImageUploader';
import { NumberField } from './NumberField';
import { Toggle } from './Toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SettingsForm: React.FC = () => {
  const { settings, update } = usePrescriptionStore();

  const updateSettings = (key: string, value: any) => {
    update({ [key]: value });
  };

  const updateNestedSettings = (parentKey: string, childKey: string, value: any) => {
    update({
      [parentKey]: {
        ...settings[parentKey as keyof typeof settings],
        [childKey]: value,
      },
    });
  };

  // Ensure settings are properly initialized
  if (!settings || !settings.page || !settings.page.margin) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Page Layout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Page Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Top Margin"
              value={settings.page?.margin?.top ?? 20}
              onChange={(value) => updateNestedSettings('page', 'margin', { ...settings.page?.margin, top: value })}
              unit="mm"
            />
            <NumberField
              label="Bottom Margin"
              value={settings.page?.margin?.bottom ?? 20}
              onChange={(value) => updateNestedSettings('page', 'margin', { ...settings.page?.margin, bottom: value })}
              unit="mm"
            />
            <NumberField
              label="Left Margin"
              value={settings.page?.margin?.left ?? 20}
              onChange={(value) => updateNestedSettings('page', 'margin', { ...settings.page?.margin, left: value })}
              unit="mm"
            />
            <NumberField
              label="Right Margin"
              value={settings.page?.margin?.right ?? 20}
              onChange={(value) => updateNestedSettings('page', 'margin', { ...settings.page?.margin, right: value })}
              unit="mm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Header Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Show Header Image"
            checked={settings.header?.showImage ?? true}
            onCheckedChange={(checked) => updateNestedSettings('header', 'showImage', checked)}
          />
          
          {settings.header?.showImage && (
            <ImageUploader
              value={settings.images?.header}
              onChange={(image) => updateNestedSettings('images', 'header', image)}
              placeholder="Upload header image"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Height"
              value={settings.header?.height ?? 80}
              onChange={(value) => updateNestedSettings('header', 'height', value)}
              unit="px"
            />
            <NumberField
              label="Width"
              value={settings.header?.width ?? 100}
              onChange={(value) => updateNestedSettings('header', 'width', value)}
              unit="%"
            />
          </div>

          <Toggle
            label="Show Header Text"
            checked={settings.header?.showText ?? true}
            onCheckedChange={(checked) => updateNestedSettings('header', 'showText', checked)}
          />

          {settings.header?.showText && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Header Text</Label>
              <Textarea
                value={settings.header?.text ?? ''}
                onChange={(e) => updateNestedSettings('header', 'text', e.target.value)}
                rows={3}
                className="text-sm"
                placeholder="Enter header text (use new lines for multiple lines)"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Footer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Show Footer Image"
            checked={settings.footer?.showImage ?? true}
            onCheckedChange={(checked) => updateNestedSettings('footer', 'showImage', checked)}
          />
          
          {settings.footer?.showImage && (
            <ImageUploader
              value={settings.images?.footer}
              onChange={(image) => updateNestedSettings('images', 'footer', image)}
              placeholder="Upload footer image"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Height"
              value={settings.footer?.height ?? 60}
              onChange={(value) => updateNestedSettings('footer', 'height', value)}
              unit="px"
            />
            <NumberField
              label="Width"
              value={settings.footer?.width ?? 100}
              onChange={(value) => updateNestedSettings('footer', 'width', value)}
              unit="%"
            />
          </div>

          <Toggle
            label="Show Footer Text"
            checked={settings.footer?.showText ?? true}
            onCheckedChange={(checked) => updateNestedSettings('footer', 'showText', checked)}
          />

          {settings.footer?.showText && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Footer Text</Label>
              <Input
                value={settings.footer?.text ?? ''}
                onChange={(e) => updateNestedSettings('footer', 'text', e.target.value)}
                className="text-sm"
                placeholder="Enter footer text"
              />
            </div>
          )}

          <Toggle
            label="Show Doctor Signature"
            checked={settings.footer?.showSignature ?? true}
            onCheckedChange={(checked) => updateNestedSettings('footer', 'showSignature', checked)}
          />

          {settings.footer?.showSignature && (
            <>
              <ImageUploader
                value={settings.images?.signature}
                onChange={(image) => updateNestedSettings('images', 'signature', image)}
                placeholder="Upload doctor signature"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Signature Height"
                  value={settings.footer?.signatureHeight ?? 40}
                  onChange={(value) => updateNestedSettings('footer', 'signatureHeight', value)}
                  unit="px"
                />
                <NumberField
                  label="Signature Width"
                  value={settings.footer?.signatureWidth ?? 80}
                  onChange={(value) => updateNestedSettings('footer', 'signatureWidth', value)}
                  unit="px"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Font Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Font Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700">Font Family</Label>
            <Select
              value={settings.font?.family ?? 'Arial'}
              onValueChange={(value) => updateNestedSettings('font', 'family', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <NumberField
            label="Font Size"
            value={settings.font?.size ?? 12}
            onChange={(value) => updateNestedSettings('font', 'size', value)}
            min={8}
            max={24}
            unit="px"
          />
        </CardContent>
      </Card>
    </div>
  );
};
