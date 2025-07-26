import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText,
  User,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  GraduationCap,
  Badge as BadgeIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionSettingsData {
  doctorName: string;
  qualifications: string;
  designationRegNumber: string;
}

export const PrescriptionSettings = () => {
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  
  // Load existing data from localStorage
  const loadSettings = (): PrescriptionSettingsData => {
    const stored = localStorage.getItem('easyHMS_prescriptionSettings');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Try to load from setup data as fallback
    const setupData = localStorage.getItem('easyHMS_setupData');
    if (setupData) {
      const data = JSON.parse(setupData);
      return {
        doctorName: data.doctor?.fullName || '',
        qualifications: data.doctor?.qualification || '',
        designationRegNumber: data.doctor?.licenseNumber || '',
      };
    }
    
    return {
      doctorName: '',
      qualifications: '',
      designationRegNumber: '',
    };
  };

  const [settings, setSettings] = useState<PrescriptionSettingsData>(loadSettings());

  const handleInputChange = (field: keyof PrescriptionSettingsData, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    localStorage.setItem('easyHMS_prescriptionSettings', JSON.stringify(settings));
    setIsDirty(false);
    toast({
      title: "Settings Saved",
      description: "Prescription settings have been successfully updated.",
    });
  };

  const handleReset = () => {
    const originalSettings = loadSettings();
    setSettings(originalSettings);
    setIsDirty(false);
    toast({
      title: "Settings Reset",
      description: "All changes have been reverted to the last saved state.",
      variant: "destructive",
    });
  };

  const getCompletionPercentage = () => {
    const fields = [settings.doctorName, settings.qualifications, settings.designationRegNumber];
    const completed = fields.filter(field => field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();
  const isComplete = completionPercentage === 100;

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-healthcare-primary" />
            Prescription Settings
          </h1>
          <p className="text-muted-foreground">Personalize your medical content and identity</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={isComplete ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {isComplete ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {completionPercentage}% Complete
          </Badge>
        </div>
      </div>

      {/* Completion Progress */}
      {!isComplete && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-600 rounded-full">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-900 dark:text-orange-100">
                🩺 Complete Your Prescription Profile
              </h2>
              <p className="text-orange-700 dark:text-orange-300">
                Fill in all details to ensure professional prescription headers
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Progress</span>
              <span className="text-sm text-orange-600">{completionPercentage}/100%</span>
            </div>
            <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-600 to-orange-500 h-4 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${completionPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-healthcare-primary" />
            Header Add-on Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how your name and credentials appear on prescription headers
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Doctor Name */}
          <div className="space-y-2">
            <Label htmlFor="doctorName" className="flex items-center gap-2 text-base font-medium">
              <User className="h-4 w-4 text-healthcare-primary" />
              Doctor Name
            </Label>
            <Input
              id="doctorName"
              placeholder="Enter your full name (e.g., Dr. John Smith)"
              value={settings.doctorName}
              onChange={(e) => handleInputChange('doctorName', e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              This will appear as the primary doctor name on all prescriptions
            </p>
          </div>

          <Separator />

          {/* Qualifications */}
          <div className="space-y-2">
            <Label htmlFor="qualifications" className="flex items-center gap-2 text-base font-medium">
              <GraduationCap className="h-4 w-4 text-healthcare-primary" />
              Qualifications
            </Label>
            <Input
              id="qualifications"
              placeholder="Enter your qualifications (e.g., MBBS, MS, MD)"
              value={settings.qualifications}
              onChange={(e) => handleInputChange('qualifications', e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Your medical qualifications and degrees (separate multiple with commas)
            </p>
          </div>

          <Separator />

          {/* Designation/Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="designationRegNumber" className="flex items-center gap-2 text-base font-medium">
              <BadgeIcon className="h-4 w-4 text-healthcare-primary" />
              Designation/Registration Number
            </Label>
            <Input
              id="designationRegNumber"
              placeholder="Enter your designation or registration number"
              value={settings.designationRegNumber}
              onChange={(e) => handleInputChange('designationRegNumber', e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Your medical council registration number or professional designation
            </p>
          </div>

          <Separator />

          {/* Preview Section */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Preview</Label>
            <div className="bg-muted/50 p-4 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-lg text-foreground">
                  {settings.doctorName || 'Doctor Name'}
                </h3>
                {settings.qualifications && (
                  <p className="text-sm text-muted-foreground">
                    {settings.qualifications}
                  </p>
                )}
                {settings.designationRegNumber && (
                  <p className="text-xs text-muted-foreground">
                    {settings.designationRegNumber}
                  </p>
                )}
              </div>
              {!settings.doctorName && !settings.qualifications && !settings.designationRegNumber && (
                <p className="text-xs text-muted-foreground text-center italic mt-2">
                  Fill in the fields above to see how your prescription header will look
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={!isDirty}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReset}
              disabled={!isDirty}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};