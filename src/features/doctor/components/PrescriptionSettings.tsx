import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Badge as LucideBadgeIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldStyle {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
}

interface PrescriptionSettingsData {
  doctorName: string;
  qualifications: string;
  designationRegNumber: string;
  styles?: {
    doctorName?: FieldStyle;
    qualifications?: FieldStyle;
    designationRegNumber?: FieldStyle;
  };
  doctorId?: string;
}

interface AdminTemplateData {
  header: {
    hospitalName: string;
    contactInfo: string;
    customText: string;
    logoUrl: string;
    styles: {
      hospitalName: { color: string; fontSize: string; fontFamily: string; };
      contactInfo: { color: string; fontSize: string; fontFamily: string; };
      customText: { color: string; fontSize: string; fontFamily: string; };
    };
  };
  footer: {
    customNotes: string;
    styles: {
      customNotes: { color: string; fontSize: string; fontFamily: string; };
    };
  };
}

export const PrescriptionSettings = () => {
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const [adminTemplate, setAdminTemplate] = useState<AdminTemplateData | null>(null);

  const defaultFieldStyle: FieldStyle = {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#000000'
  };

  const loadSettings = (): PrescriptionSettingsData => {
    const stored = localStorage.getItem('prescriptionSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PrescriptionSettingsData;
        parsed.styles = {
          doctorName: { ...defaultFieldStyle, ...(parsed.styles?.doctorName || {}) },
          qualifications: { ...defaultFieldStyle, ...(parsed.styles?.qualifications || {}) },
          designationRegNumber: { ...defaultFieldStyle, ...(parsed.styles?.designationRegNumber || {}) },
        };
        return parsed;
      } catch {}
    }
    return {
      doctorName: '',
      qualifications: '',
      designationRegNumber: '',
      styles: {
        doctorName: { ...defaultFieldStyle },
        qualifications: { ...defaultFieldStyle },
        designationRegNumber: { ...defaultFieldStyle }
      }
    };
  };

  const [settings, setSettings] = useState<PrescriptionSettingsData>(loadSettings());

  useEffect(() => {
    const adminTemplateData = localStorage.getItem('adminTemplate');
    if (adminTemplateData) {
      try {
        setAdminTemplate(JSON.parse(adminTemplateData));
      } catch {}
    }
  }, []);

  const handleInputChange = (field: keyof PrescriptionSettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleStyleChange = (
    field: 'doctorName' | 'qualifications' | 'designationRegNumber',
    prop: keyof FieldStyle,
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [field]: { ...prev.styles?.[field], [prop]: value }
      }
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    localStorage.setItem('prescriptionSettings', JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Prescription settings updated successfully."
    });
    setIsDirty(false);
  };

  const handleReset = () => {
    setSettings(loadSettings());
    setIsDirty(false);
    toast({
      title: "Settings Reset",
      description: "Changes reverted to last saved state.",
      variant: "destructive",
    });
  };

  const getCompletionPercentage = () => {
    const fields = [settings.doctorName, settings.qualifications, settings.designationRegNumber];
    const completed = fields.filter(f => f.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();
  const isComplete = completionPercentage === 100;

  const [headerPos, setHeaderPos] = useState({ x: 0, y: 0 });
  const [doctorPos, setDoctorPos] = useState({ x: 0, y: 0 });
  const [footerPos, setFooterPos] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Doctor Prescription Settings
          </h1>
          <p className="text-muted-foreground">Configure your details with the admin template</p>
        </div>
      </div>

      {/* Form + Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Form */}
            <div className="w-full lg:w-1/2 space-y-4">
              {[
                { label: 'Doctor Name', field: 'doctorName', placeholder: 'Dr. John Doe' },
                { label: 'Qualifications', field: 'qualifications', placeholder: 'MBBS, MS' },
                { label: 'Registration Number', field: 'designationRegNumber', placeholder: 'Reg-12345' }
              ].map(item => (
                <div key={item.field}>
                  <Label>{item.label}</Label>
                  <Input
                    value={(settings as any)[item.field]}
                    placeholder={item.placeholder}
                    onChange={e => handleInputChange(item.field as any, e.target.value)}
                  />
                  {/* Font Family */}
                  <select
                    value={(settings.styles as any)?.[item.field]?.fontFamily || 'Arial'}
                    onChange={e => handleStyleChange(item.field as any, 'fontFamily', e.target.value)}
                    className="border rounded p-1 mt-1 w-full"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                  {/* Font Size */}
                  <Input
                    type="text"
                    className="mt-1"
                    placeholder="Font size (e.g. 16px)"
                    value={(settings.styles as any)?.[item.field]?.fontSize || ''}
                    onChange={e => handleStyleChange(item.field as any, 'fontSize', e.target.value)}
                  />
                  {/* Font Color */}
                  <input
                    type="color"
                    className="mt-1 w-full h-8 p-0 border"
                    value={(settings.styles as any)?.[item.field]?.color || '#000000'}
                    onChange={e => handleStyleChange(item.field as any, 'color', e.target.value)}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={!isDirty}>
                  <Save className="h-4 w-4" /> Save
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </div>

            {/* Preview */}
      <div
              ref={previewRef}
              className="w-full lg:w-1/2 bg-muted/50 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col justify-start min-h-[400px] relative overflow-hidden"
              style={{ position: 'relative' }}
            >
              <Label className="text-base font-medium mb-4 select-none">Combined Template Preview (Drag to reposition)</Label>
              
              {/* Draggable Admin Template Header */}
              {adminTemplate && (
                <Draggable
                  bounds="parent"
                  position={headerPos}
                  onDrag={(e, data) => setHeaderPos({ x: data.x, y: data.y })}
                >
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-500 cursor-move select-none absolute" style={{ width: 'calc(100% - 48px)' }}>
                    <p className="text-xs text-blue-600 mb-2">Admin Template Header</p>
                    <div className="text-sm">
                      <strong>{adminTemplate.header.hospitalName}</strong>
                      {adminTemplate.header.customText && <p className="text-xs italic">{adminTemplate.header.customText}</p>}
                    </div>
                  </div>
                </Draggable>
              )}
              <Draggable
                bounds="parent"
                position={doctorPos}
                onDrag={(e, data) => setDoctorPos({ x: data.x, y: data.y })}
              >
                <div className="absolute text-center p-2 bg-green-50 border-l-4 border-green-500 cursor-move" style={{ width: 'calc(100% - 48px)' }}>
                  <h3
                    style={{
                      fontFamily: settings.styles?.doctorName?.fontFamily,
                      fontSize: settings.styles?.doctorName?.fontSize,
                      color: settings.styles?.doctorName?.color
                    }}
                  >
                    {settings.doctorName || 'Doctor Name'}
                  </h3>
                  <p
                    style={{
                      fontFamily: settings.styles?.qualifications?.fontFamily,
                      fontSize: settings.styles?.qualifications?.fontSize,
                      color: settings.styles?.qualifications?.color
                    }}
                  >
                    {settings.qualifications}
                  </p>
                  <p
                    style={{
                      fontFamily: settings.styles?.designationRegNumber?.fontFamily,
                      fontSize: settings.styles?.designationRegNumber?.fontSize,
                      color: settings.styles?.designationRegNumber?.color
                    }}
                  >
                    {settings.designationRegNumber}
                  </p>
                </div>
              </Draggable>
             {/* Draggable Footer Preview */}
              {adminTemplate && adminTemplate.footer.customNotes && (
                <Draggable
                  bounds="parent"
                  position={footerPos}
                  onDrag={(e, data) => setFooterPos({ x: data.x, y: data.y })}
                >
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded border-l-4 border-orange-500 cursor-move select-none absolute" style={{ width: 'calc(100% - 48px)' }}>
                    <p className="text-xs text-orange-600 mb-2">Admin Template Footer</p>
                    <p className="text-xs">{adminTemplate.footer.customNotes}</p>
                  </div>
                </Draggable>
              )}

              {!settings.doctorName && !settings.qualifications && !settings.designationRegNumber && (
                <p className="text-xs text-muted-foreground text-center italic mt-2">
                  Fill in your details to see the complete template preview
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
