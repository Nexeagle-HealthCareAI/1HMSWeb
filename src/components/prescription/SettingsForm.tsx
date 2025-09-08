import React, { useState, useEffect } from 'react';
import { usePrescriptionStore } from '@/store/prescription';
import { ImageUploader } from './ImageUploader';
import { NumberField } from './NumberField';
import { Toggle } from './Toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ruler, Image, User, Settings, HelpCircle, FileText, Save, Check } from 'lucide-react';

export const SettingsForm: React.FC = () => {
  const { settings, update } = usePrescriptionStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const updateSettings = (key: string, value: any) => {
    update({ [key]: value });
    setSaveStatus('idle');
  };

  const updateNestedSettings = (parentKey: string, childKey: string, value: any) => {
    const currentParent = settings[parentKey as keyof typeof settings] as any;
    update({
      [parentKey]: {
        ...currentParent,
        [childKey]: value,
      },
    });
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // Since Zustand with persist automatically saves to localStorage,
      // we just need to trigger a save confirmation
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save delay
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Ensure settings are properly initialized
  if (!settings || !settings.page || !settings.page.margin) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {/* Page Layout */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-b border-purple-200 dark:border-purple-700">
          <CardTitle className="text-md font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Page Layout
            <div className="group relative">
              <HelpCircle className="h-3 w-3 text-purple-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Adjust page margins for optimal content spacing
              </div>
            </div>
          </CardTitle>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Configure page margins to control content spacing
          </p>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
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

      {/* Letterhead Option */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-b border-blue-200 dark:border-blue-700">
          <CardTitle className="text-md font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Default Prescription Template
            <div className="group relative">
              <HelpCircle className="h-3 w-3 text-blue-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Use built-in prescription header and footer template
              </div>
            </div>
          </CardTitle>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Use default prescription template or customize header/footer individually
          </p>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-700">
            <div>
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">Use Default Template</Label>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Use built-in prescription header and footer</p>
            </div>
            <Toggle
              label=""
              checked={settings.useLetterhead ?? false}
              onCheckedChange={(checked) => updateSettings('useLetterhead', checked)}
            />
          </div>

          {settings.useLetterhead && (
            <div className="space-y-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-700">
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">Template Dimensions</Label>
              <p className="text-xs text-blue-600 dark:text-blue-400">Adjust the height of header and footer sections</p>
              
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Header Height"
                  value={settings.letterhead?.headerHeight ?? 30}
                  onChange={(value) => updateNestedSettings('letterhead', 'headerHeight', value)}
                  unit="mm"
                />
                <NumberField
                  label="Footer Height"
                  value={settings.letterhead?.footerHeight ?? 20}
                  onChange={(value) => updateNestedSettings('letterhead', 'footerHeight', value)}
                  unit="mm"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header & Footer Images */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-b border-green-200 dark:border-green-700">
          <CardTitle className="text-md font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Image className="h-4 w-4" />
            Header & Footer Images
            <div className="group relative">
              <HelpCircle className="h-3 w-3 text-green-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Upload and customize header and footer images
              </div>
            </div>
          </CardTitle>
          <p className="text-xs text-green-600 dark:text-green-400">
            Add your clinic logo or branding images
          </p>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Header Image Section */}
          <div className={`space-y-3 p-3 rounded-lg border ${settings.useLetterhead ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'}`}>
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-medium ${settings.useLetterhead ? 'text-gray-500 dark:text-gray-400' : 'text-green-700 dark:text-green-300'}`}>
                Header Image {settings.useLetterhead && '(Disabled - Using Default Template)'}
              </Label>
              <Toggle
                label=""
                checked={settings.header?.showImage ?? true}
                onCheckedChange={(checked) => !settings.useLetterhead && updateNestedSettings('header', 'showImage', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-medium ${settings.useLetterhead ? 'text-gray-500 dark:text-gray-400' : 'text-green-700 dark:text-green-300'}`}>
                Show on All Pages
              </Label>
              <Toggle
                label=""
                checked={settings.header?.showOnAllPages ?? true}
                onCheckedChange={(checked) => updateNestedSettings('header', 'showOnAllPages', checked)}
              />
            </div>
            
            {settings.header?.showImage && !settings.useLetterhead && (
              <>
                <ImageUploader
                  value={settings.images?.header}
                  onChange={(image) => updateNestedSettings('images', 'header', image)}
                  placeholder="Upload header image"
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Height"
                    value={settings.header?.height ?? 20}
                    onChange={(value) => updateNestedSettings('header', 'height', value)}
                    unit="mm"
                  />
                  <NumberField
                    label="Width"
                    value={settings.header?.width ?? 100}
                    onChange={(value) => updateNestedSettings('header', 'width', value)}
                    unit="%"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Image Section */}
          <div className={`space-y-3 p-3 rounded-lg border ${settings.useLetterhead ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'}`}>
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-medium ${settings.useLetterhead ? 'text-gray-500 dark:text-gray-400' : 'text-green-700 dark:text-green-300'}`}>
                Footer Image {settings.useLetterhead && '(Disabled - Using Default Template)'}
              </Label>
              <Toggle
                label=""
                checked={settings.footer?.showImage ?? true}
                onCheckedChange={(checked) => !settings.useLetterhead && updateNestedSettings('footer', 'showImage', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-medium ${settings.useLetterhead ? 'text-gray-500 dark:text-gray-400' : 'text-green-700 dark:text-green-300'}`}>
                Show on All Pages
              </Label>
              <Toggle
                label=""
                checked={settings.footer?.showOnAllPages ?? true}
                onCheckedChange={(checked) => updateNestedSettings('footer', 'showOnAllPages', checked)}
              />
            </div>
            
            {settings.footer?.showImage && !settings.useLetterhead && (
              <>
                <ImageUploader
                  value={settings.images?.footer}
                  onChange={(image) => updateNestedSettings('images', 'footer', image)}
                  placeholder="Upload footer image"
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Height"
                    value={settings.footer?.height ?? 15}
                    onChange={(value) => updateNestedSettings('footer', 'height', value)}
                    unit="mm"
                  />
                  <NumberField
                    label="Width"
                    value={settings.footer?.width ?? 100}
                    onChange={(value) => updateNestedSettings('footer', 'width', value)}
                    unit="%"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Doctor Information */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700">
          <CardTitle className="text-md font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <User className="h-4 w-4" />
            Doctor Information
            <div className="group relative">
              <HelpCircle className="h-3 w-3 text-orange-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Set up your professional signature and details
              </div>
            </div>
          </CardTitle>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Configure your signature and professional information
          </p>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className={`flex items-center justify-between p-3 rounded-lg border ${settings.useLetterhead ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'}`}>
            <div>
              <Label className={`text-sm font-medium ${settings.useLetterhead ? 'text-gray-500 dark:text-gray-400' : 'text-orange-700 dark:text-orange-300'}`}>
                Show Doctor Information {settings.useLetterhead && '(Disabled - Using Default Template)'}
              </Label>
              <p className={`text-xs mt-1 ${settings.useLetterhead ? 'text-gray-400 dark:text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                Display signature and name on prescription
              </p>
            </div>
            <Toggle
              label=""
              checked={settings.footer?.showSignature ?? true}
              onCheckedChange={(checked) => !settings.useLetterhead && updateNestedSettings('footer', 'showSignature', checked)}
            />
          </div>

          {settings.footer?.showSignature && !settings.useLetterhead && (
            <>
              {/* Doctor Signature Upload */}
              <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-700">
                <Label className="text-sm font-medium text-orange-700 dark:text-orange-300">Doctor Signature</Label>
                <ImageUploader
                  value={settings.images?.signature}
                  onChange={(image) => updateNestedSettings('images', 'signature', image)}
                  placeholder="Upload doctor signature"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Signature Height"
                    value={settings.footer?.signatureHeight ?? 10}
                    onChange={(value) => updateNestedSettings('footer', 'signatureHeight', value)}
                    unit="mm"
                  />
                  <NumberField
                    label="Signature Width"
                    value={settings.footer?.signatureWidth ?? 20}
                    onChange={(value) => updateNestedSettings('footer', 'signatureWidth', value)}
                    unit="mm"
                  />
                </div>
              </div>

              {/* Doctor Details */}
              <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-700">
                <Label className="text-sm font-medium text-orange-700 dark:text-orange-300">Doctor Details</Label>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-orange-600 dark:text-orange-400">Full Name</Label>
                    <Input
                      value={settings.footer?.doctorName ?? ''}
                      onChange={(e) => updateNestedSettings('footer', 'doctorName', e.target.value)}
                      className="text-sm border-orange-200 dark:border-orange-700 focus:border-orange-400 dark:focus:border-orange-500"
                      placeholder="Doctor Name"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Save className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Save Settings</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {saveStatus === 'idle' && 'Save your prescription settings'}
                  {saveStatus === 'saving' && 'Saving settings...'}
                  {saveStatus === 'saved' && 'Settings saved successfully!'}
                  {saveStatus === 'error' && 'Error saving settings. Please try again.'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 ${
                saveStatus === 'saved' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
