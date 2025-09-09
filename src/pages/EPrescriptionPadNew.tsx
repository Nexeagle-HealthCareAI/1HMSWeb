import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Edit3,
  Eye,
  FileText,
  Heart,
  Stethoscope,
  Pill,
  Calendar,
  Shield,
  ClipboardList,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  FileImage,
  Send,
  ArrowRight,
  X,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react';

interface EPrescriptionData {
  vitals: {
    bloodPressure: string;
    temperature: string;
    heartRate: string;
    weight: string;
    height: string;
    bmi: string;
    oxygenSaturation: string;
  };
  chiefComplaint: string;
  history: string;
  comorbidity: string;
  examination: string;
  diagnosis: string;
  orders: {
    investigations: string[];
    procedures: string[];
  };
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  privateNotes: string;
  certificates: string;
  immunizations: string;
  followUp: {
    date: string;
    referral: string;
    notes: string;
  };
  nonPharmacologicalAdvice: string;
  attachments: string[];
}

interface FieldConfig {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
  category: 'basic' | 'clinical' | 'treatment' | 'administrative';
}

const defaultFieldConfigs: FieldConfig[] = [
  { id: 'vitals', label: 'Vitals', enabled: true, required: true, category: 'basic' },
  { id: 'chiefComplaint', label: 'Chief Complaint', enabled: true, required: true, category: 'basic' },
  { id: 'history', label: 'History', enabled: true, required: false, category: 'clinical' },
  { id: 'comorbidity', label: 'Comorbidity', enabled: true, required: false, category: 'clinical' },
  { id: 'examination', label: 'Examination', enabled: true, required: false, category: 'clinical' },
  { id: 'diagnosis', label: 'Diagnosis', enabled: true, required: true, category: 'clinical' },
  { id: 'orders', label: 'Orders', enabled: true, required: false, category: 'treatment' },
  { id: 'medications', label: 'Medications', enabled: true, required: false, category: 'treatment' },
  { id: 'privateNotes', label: 'Private Notes', enabled: true, required: false, category: 'administrative' },
  { id: 'certificates', label: 'Certificates & Notes', enabled: true, required: false, category: 'administrative' },
  { id: 'immunizations', label: 'Immunizations', enabled: true, required: false, category: 'administrative' },
  { id: 'followUp', label: 'Follow-up & Referral', enabled: true, required: false, category: 'administrative' },
  { id: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice', enabled: true, required: false, category: 'treatment' },
  { id: 'attachments', label: 'Attachments', enabled: true, required: false, category: 'administrative' }
];

export const EPrescriptionPad: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [prescriptionData, setPrescriptionData] = useState<EPrescriptionData>({
    vitals: {
      bloodPressure: '',
      temperature: '',
      heartRate: '',
      weight: '',
      height: '',
      bmi: '',
      oxygenSaturation: ''
    },
    chiefComplaint: '',
    history: '',
    comorbidity: '',
    examination: '',
    diagnosis: '',
    orders: {
      investigations: [],
      procedures: []
    },
    medications: [],
    privateNotes: '',
    certificates: '',
    immunizations: '',
    followUp: {
      date: '',
      referral: '',
      notes: ''
    },
    nonPharmacologicalAdvice: '',
    attachments: []
  });

  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(defaultFieldConfigs);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customizeTab, setCustomizeTab] = useState('fields');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveConfigStatus, setSaveConfigStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
    vitals: false,
    chiefComplaint: false,
    history: false,
    comorbidity: false,
    examination: false,
    diagnosis: false,
    orders: false,
    medications: false,
    privateNotes: false,
    certificates: false,
    immunizations: false,
    followUp: false,
    nonPharmacologicalAdvice: false,
    attachments: false
  });

  // Individual field save status
  const [fieldSaveStatus, setFieldSaveStatus] = useState<{ [key: string]: 'idle' | 'saving' | 'saved' | 'error' }>({});

  const updateFieldConfig = (fieldId: string, enabled: boolean) => {
    setFieldConfigs(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, enabled } : field
      )
    );
  };

  const handleSaveConfiguration = async () => {
    setIsSavingConfig(true);
    setSaveConfigStatus('saving');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('eprescription-field-configs', JSON.stringify(fieldConfigs));
      setSaveConfigStatus('saved');
      setTimeout(() => setSaveConfigStatus('idle'), 2000);
    } catch (error) {
      setSaveConfigStatus('error');
      setTimeout(() => setSaveConfigStatus('idle'), 3000);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const resetToDefaults = () => {
    setFieldConfigs(defaultFieldConfigs);
  };

  const renderFieldIcon = (fieldId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'vitals': <Activity className="h-4 w-4" />,
      'chiefComplaint': <AlertCircle className="h-4 w-4" />,
      'history': <FileText className="h-4 w-4" />,
      'comorbidity': <Heart className="h-4 w-4" />,
      'examination': <Stethoscope className="h-4 w-4" />,
      'diagnosis': <CheckCircle className="h-4 w-4" />,
      'orders': <ClipboardList className="h-4 w-4" />,
      'medications': <Pill className="h-4 w-4" />,
      'privateNotes': <Edit3 className="h-4 w-4" />,
      'certificates': <FileText className="h-4 w-4" />,
      'immunizations': <Shield className="h-4 w-4" />,
      'followUp': <Calendar className="h-4 w-4" />,
      'nonPharmacologicalAdvice': <User className="h-4 w-4" />,
      'attachments': <FileImage className="h-4 w-4" />
    };
    return iconMap[fieldId] || <FileText className="h-4 w-4" />;
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const saveFieldData = async (fieldId: string, data: any) => {
    setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saving' }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const savedData = JSON.parse(localStorage.getItem('eprescription-field-data') || '{}');
      savedData[fieldId] = data;
      localStorage.setItem('eprescription-field-data', JSON.stringify(savedData));
      
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saved' }));
      setTimeout(() => {
        setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
      }, 2000);
    } catch (error) {
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'error' }));
      setTimeout(() => {
        setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
      }, 3000);
    }
  };

  const renderCollapsibleSection = (
    fieldId: string, 
    title: string, 
    category: 'basic' | 'clinical' | 'treatment' | 'administrative',
    isRequired: boolean,
    content: React.ReactNode
  ) => {
    const field = fieldConfigs.find(f => f.id === fieldId);
    if (!field?.enabled) return null;

    const categoryColors = {
      basic: 'outline',
      clinical: 'secondary', 
      treatment: 'outline',
      administrative: 'destructive'
    };

    return (
      <Card key={fieldId}>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(fieldId)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {renderFieldIcon(fieldId)}
              <span>{title}</span>
              <Badge variant={categoryColors[category]} className="text-xs">{category}</Badge>
              {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              {fieldSaveStatus[fieldId] === 'saved' && <Check className="h-4 w-4 text-green-600" />}
              {collapsedSections[fieldId] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
        {!collapsedSections[fieldId] && (
          <CardContent>
            {content}
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveFieldData(fieldId, prescriptionData[fieldId as keyof EPrescriptionData])}
                disabled={fieldSaveStatus[fieldId] === 'saving'}
                className="h-7 text-xs"
              >
                {fieldSaveStatus[fieldId] === 'saving' ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                    Saving...
                  </>
                ) : fieldSaveStatus[fieldId] === 'saved' ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const addMedication = () => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          id: Date.now().toString(),
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        }
      ]
    }));
  };

  const removeMedication = (id: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.filter(med => med.id !== id)
    }));
  };

  const updateMedication = (id: string, field: string, value: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const addOrder = (type: 'investigations' | 'procedures') => {
    setPrescriptionData(prev => ({
      ...prev,
      orders: {
        ...prev.orders,
        [type]: [...prev.orders[type], '']
      }
    }));
  };

  const updateOrder = (type: 'investigations' | 'procedures', index: number, value: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      orders: {
        ...prev.orders,
        [type]: prev.orders[type].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const removeOrder = (type: 'investigations' | 'procedures', index: number) => {
    setPrescriptionData(prev => ({
      ...prev,
      orders: {
        ...prev.orders,
        [type]: prev.orders[type].filter((_, i) => i !== index)
      }
    }));
  };

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem('eprescription-field-configs');
    if (savedConfigs) {
      try {
        const parsedConfigs = JSON.parse(savedConfigs);
        setFieldConfigs(parsedConfigs);
      } catch (error) {
        console.error('Error loading saved configuration:', error);
      }
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">E-Prescription Pad</h1>
              <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomize(!showCustomize)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Customize
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Customize Panel */}
        {showCustomize && (
          <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
            {/* Customize Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Customize E-Prescription</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomize(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Customize Tabs */}
            <div className="p-4 border-b border-gray-200">
              <Tabs value={customizeTab} onValueChange={setCustomizeTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="fields" className="text-xs">
                    <span>Fields</span>
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="text-xs">
                    <span>Layout</span>
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="text-xs">
                    <span>Templates</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Customize Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <Tabs value={customizeTab} onValueChange={setCustomizeTab}>
                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Field Configuration</h4>
                    <div className="space-y-2">
                      {fieldConfigs.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {renderFieldIcon(field.id)}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">{field.label}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={field.category === 'basic' ? 'default' : 
                                          field.category === 'clinical' ? 'secondary' :
                                          field.category === 'treatment' ? 'outline' : 'destructive'}
                                  className="text-xs"
                                >
                                  {field.category}
                                </Badge>
                                {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={(e) => updateFieldConfig(field.id, e.target.checked)}
                            className="rounded border-gray-300 h-4 w-4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Layout Tab */}
                <TabsContent value="layout" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Layout Options</h4>
                    <div className="space-y-4">
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Section Display</h5>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                            <span className="text-sm text-gray-600">Collapsible sections</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                            <span className="text-sm text-gray-600">Show section icons</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Prescription Templates</h4>
                    <div className="space-y-3">
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <h5 className="text-sm font-medium text-gray-700">General Practice</h5>
                        <p className="text-xs text-gray-500 mt-1">Standard fields for general consultations</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <h5 className="text-sm font-medium text-gray-700">Emergency Medicine</h5>
                        <p className="text-xs text-gray-500 mt-1">Quick access to critical fields</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <h5 className="text-sm font-medium text-gray-700">Pediatrics</h5>
                        <p className="text-xs text-gray-500 mt-1">Child-specific fields and dosages</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <h5 className="text-sm font-medium text-gray-700">Cardiology</h5>
                        <p className="text-xs text-gray-500 mt-1">Heart-related fields and vitals</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Customize Footer */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveConfiguration}
                  disabled={isSavingConfig}
                  className={`flex-1 ${
                    saveConfigStatus === 'saved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : saveConfigStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSavingConfig ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : saveConfigStatus === 'saved' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : saveConfigStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Error
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  className="px-3"
                >
                  Reset
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Your configuration will be saved and applied to all future prescriptions
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">

            {/* Vitals Section */}
            {renderCollapsibleSection(
              'vitals',
              'Vitals',
              'basic',
              true,
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Blood Pressure</Label>
                  <Input
                    placeholder="120/80"
                    value={prescriptionData.vitals.bloodPressure}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, bloodPressure: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Temperature</Label>
                  <Input
                    placeholder="98.6°F"
                    value={prescriptionData.vitals.temperature}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, temperature: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Heart Rate</Label>
                  <Input
                    placeholder="72 bpm"
                    value={prescriptionData.vitals.heartRate}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, heartRate: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Weight</Label>
                  <Input
                    placeholder="70 kg"
                    value={prescriptionData.vitals.weight}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, weight: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Height</Label>
                  <Input
                    placeholder="170 cm"
                    value={prescriptionData.vitals.height}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, height: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">BMI</Label>
                  <Input
                    placeholder="24.2"
                    value={prescriptionData.vitals.bmi}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, bmi: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">O2 Saturation</Label>
                  <Input
                    placeholder="98%"
                    value={prescriptionData.vitals.oxygenSaturation}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, oxygenSaturation: e.target.value }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Chief Complaint Section */}
            {renderCollapsibleSection(
              'chiefComplaint',
              'Chief Complaint',
              'basic',
              true,
              <Textarea
                placeholder="Describe the main reason for the visit..."
                value={prescriptionData.chiefComplaint}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  chiefComplaint: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* History Section */}
            {renderCollapsibleSection(
              'history',
              'History',
              'clinical',
              false,
              <Textarea
                placeholder="Medical history, family history, social history..."
                value={prescriptionData.history}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  history: e.target.value
                }))}
                className="min-h-[100px] text-sm"
              />
            )}

            {/* Comorbidity Section */}
            {renderCollapsibleSection(
              'comorbidity',
              'Comorbidity',
              'clinical',
              false,
              <Textarea
                placeholder="Existing medical conditions, comorbidities..."
                value={prescriptionData.comorbidity}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  comorbidity: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Examination Section */}
            {renderCollapsibleSection(
              'examination',
              'Examination',
              'clinical',
              false,
              <Textarea
                placeholder="Physical examination findings..."
                value={prescriptionData.examination}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  examination: e.target.value
                }))}
                className="min-h-[100px] text-sm"
              />
            )}

            {/* Diagnosis Section */}
            {renderCollapsibleSection(
              'diagnosis',
              'Diagnosis',
              'clinical',
              true,
              <Textarea
                placeholder="Primary and secondary diagnoses..."
                value={prescriptionData.diagnosis}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  diagnosis: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigations / Procedures',
              'treatment',
              false,
              <div className="space-y-4">
                {/* Investigations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700">Investigations</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOrder('investigations')}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {prescriptionData.orders.investigations.map((investigation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., CBC, Blood Sugar, X-Ray"
                          value={investigation}
                          onChange={(e) => updateOrder('investigations', index, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOrder('investigations', index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Procedures */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700">Procedures</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOrder('procedures')}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {prescriptionData.orders.procedures.map((procedure, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., ECG, Ultrasound, Biopsy"
                          value={procedure}
                          onChange={(e) => updateOrder('procedures', index, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOrder('procedures', index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Medications Section */}
            {renderCollapsibleSection(
              'medications',
              'Medications',
              'treatment',
              false,
              <div className="space-y-3">
                {prescriptionData.medications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 rounded-lg">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">#</th>
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Medication Name</th>
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Dosage</th>
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Frequency</th>
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Duration</th>
                          <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Instructions</th>
                          <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptionData.medications.map((medication, index) => (
                          <tr key={medication.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="border border-gray-200 px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-300">{index + 1}</td>
                            <td className="border border-gray-200 px-3 py-2">
                              <Input
                                placeholder="Medication name"
                                value={medication.name}
                                onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                                className="h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <Input
                                placeholder="e.g., 500mg"
                                value={medication.dosage}
                                onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                                className="h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <Input
                                placeholder="e.g., BD, TDS"
                                value={medication.frequency}
                                onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                                className="h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <Input
                                placeholder="e.g., 7 days"
                                value={medication.duration}
                                onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                                className="h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <Input
                                placeholder="Special instructions"
                                value={medication.instructions}
                                onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                                className="h-8 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeMedication(medication.id)}
                                className="h-7 w-7 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Pill className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No medications added yet</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={addMedication}
                  className="w-full h-8 text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </div>
            )}

            {/* Non-pharmacological Advice Section */}
            {renderCollapsibleSection(
              'nonPharmacologicalAdvice',
              'Non-pharmacological Advice',
              'treatment',
              false,
              <Textarea
                placeholder="Lifestyle modifications, diet advice, exercise recommendations..."
                value={prescriptionData.nonPharmacologicalAdvice}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  nonPharmacologicalAdvice: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Private Notes Section */}
            {renderCollapsibleSection(
              'privateNotes',
              'Private Notes',
              'administrative',
              false,
              <Textarea
                placeholder="Private notes for doctor's reference..."
                value={prescriptionData.privateNotes}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  privateNotes: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Certificates & Notes Section */}
            {renderCollapsibleSection(
              'certificates',
              'Certificates & Notes',
              'administrative',
              false,
              <Textarea
                placeholder="Medical certificates, sick leave notes, etc..."
                value={prescriptionData.certificates}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  certificates: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Immunizations Section */}
            {renderCollapsibleSection(
              'immunizations',
              'Immunizations',
              'administrative',
              false,
              <Textarea
                placeholder="Vaccination records, immunization schedule..."
                value={prescriptionData.immunizations}
                onChange={(e) => setPrescriptionData(prev => ({
                  ...prev,
                  immunizations: e.target.value
                }))}
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Follow-up & Referral Section */}
            {renderCollapsibleSection(
              'followUp',
              'Follow-up & Referral',
              'administrative',
              false,
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Follow-up Date</Label>
                    <Input
                      type="date"
                      value={prescriptionData.followUp.date}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, date: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Referral</Label>
                    <Input
                      placeholder="Specialist referral"
                      value={prescriptionData.followUp.referral}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, referral: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Follow-up Notes</Label>
                  <Textarea
                    placeholder="Follow-up instructions and notes..."
                    value={prescriptionData.followUp.notes}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      followUp: { ...prev.followUp, notes: e.target.value }
                    }))}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {renderCollapsibleSection(
              'attachments',
              'Attachments',
              'administrative',
              false,
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">Upload files, images, or documents</p>
                <Button variant="outline" size="sm" className="h-8 text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attachment
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EPrescriptionPad;
