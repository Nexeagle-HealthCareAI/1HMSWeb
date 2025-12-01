import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePrescriptionFieldConfig } from '@/features/doctor/hooks/usePrescriptionFieldConfig';
import { useAuthStore } from '@/store/authStore';
import { prescriptionFieldConfigApi } from '@/features/doctor/services/prescriptionFieldConfigApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search,
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
}

// Field configurations are now loaded from API via usePrescriptionFieldConfig hook

// Convert API preferences to field configs
const convertPreferencesToFieldConfigs = (preferences: any) => {
  console.log('=== Converting Preferences ===');
  console.log('Input preferences:', preferences);
  
  const fieldDefinitions = [
    { id: 'vitals', label: 'Vitals' },
    { id: 'chiefComplaint', label: 'Chief Complaint' },
    { id: 'history', label: 'History' },
    { id: 'comorbidity', label: 'Comorbidity' },
    { id: 'examination', label: 'Examination' },
    { id: 'diagnosis', label: 'Diagnosis' },
    { id: 'orders', label: 'Orders' },
    { id: 'medications', label: 'Medications' },
    { id: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice' },
    { id: 'privateNotes', label: 'Private Notes' },
    { id: 'certificates', label: 'Certificates & Notes' },
    { id: 'immunizations', label: 'Immunizations' },
    { id: 'followUp', label: 'Follow-up & Referral' },
    { id: 'attachments', label: 'Attachments' }
  ];

  const result = fieldDefinitions.map(field => {
    let apiFieldName = field.id;
    
    if (field.id === 'certificates') {
      apiFieldName = 'certificatesAndNotes';
    } else if (field.id === 'followUp') {
      apiFieldName = 'followUpAndReferral';
    } else if (field.id === 'orders') {
      const investigationsEnabled = preferences.investigations;
      const proceduresEnabled = preferences.procedures;
      return {
        ...field,
        enabled: investigationsEnabled || proceduresEnabled
      };
    }
    
    const enabled = preferences[apiFieldName];
    
    return {
      ...field,
      enabled: enabled !== undefined ? Boolean(enabled) : false
    };
  });
  
  console.log('Converted field configs:', result);
  return result;
};

interface EPrescriptionPadProps {
  prescriptionFieldPreferences?: any;
}

const EPrescriptionPad: React.FC<EPrescriptionPadProps> = ({ prescriptionFieldPreferences }) => {
  const { patientId } = useParams<{ patientId: string }>();
  const { getDoctorId, getHospitalId } = useAuthStore();
  const [apiPreferences, setApiPreferences] = useState<any>(null);
  const [isLoadingApiPreferences, setIsLoadingApiPreferences] = useState(false);
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

  // Load prescription field preferences when component mounts
  useEffect(() => {
    const loadPrescriptionPreferences = async () => {
      try {
        setIsLoadingApiPreferences(true);
        const doctorId = getDoctorId() || '';
        const hospitalId = getHospitalId?.() || '';
        
        if (!doctorId || !hospitalId) {
          console.warn('Missing identifiers for prescription preferences', { doctorId, hospitalId });
          return;
        }

        const response = await prescriptionFieldConfigApi.getFieldPreferences(doctorId, hospitalId);
        
        if (response.success && response.preference) {
          setApiPreferences(response.preference);
          console.log('Prescription field preferences loaded in EPrescriptionPad');
          console.log('API Response:', response);
          console.log('Preferences data:', response.preference);
        } else {
          console.warn('Failed to load prescription preferences:', response.message);
        }
      } catch (error) {
        console.error('Error loading prescription preferences:', error);
      } finally {
        setIsLoadingApiPreferences(false);
      }
    };

    loadPrescriptionPreferences();
  }, [getDoctorId, getHospitalId]);

  // Get field preferences from API or passed props
  const { fields: fieldConfigs, isLoadingPreferences } = usePrescriptionFieldConfig();
  
  // Use API preferences if available, otherwise use hook data
  const finalFieldConfigs = apiPreferences ? 
    convertPreferencesToFieldConfigs(apiPreferences) : 
    fieldConfigs;
  
  // Determine if we should show loading state
  const shouldShowLoading = !apiPreferences && (isLoadingApiPreferences || isLoadingPreferences);
  
  // Search functionality state
  const [searchSuggestions, setSearchSuggestions] = useState<{ [key: string]: string[] }>({
    chiefComplaint: [
      'Chest pain', 'Shortness of breath', 'Headache', 'Fever', 'Cough', 'Nausea', 'Vomiting',
      'Abdominal pain', 'Back pain', 'Joint pain', 'Fatigue', 'Dizziness', 'Weight loss',
      'Weight gain', 'Sleep problems', 'Anxiety', 'Depression'
    ],
    diagnosis: [
      'Hypertension', 'Diabetes mellitus', 'Coronary artery disease', 'Asthma', 'COPD',
      'Pneumonia', 'Urinary tract infection', 'Gastroenteritis', 'Migraine', 'Anxiety disorder',
      'Depression', 'Osteoarthritis', 'Rheumatoid arthritis', 'Hyperthyroidism', 'Hypothyroidism'
    ],
    medications: [
      'Metformin', 'Lisinopril', 'Amlodipine', 'Atorvastatin', 'Omeprazole', 'Paracetamol',
      'Ibuprofen', 'Aspirin', 'Warfarin', 'Insulin', 'Levothyroxine', 'Albuterol'
    ]
  });
  
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({});
  const [filteredSuggestions, setFilteredSuggestions] = useState<{ [key: string]: string[] }>({});
  
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
  
  // Field configuration is now handled by the API via usePrescriptionFieldConfig hook
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

  // Search functionality
  const handleSearchInput = (fieldId: string, value: string) => {
    const suggestions = searchSuggestions[fieldId] || [];
    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSuggestions(prev => ({ ...prev, [fieldId]: filtered }));
    setShowSuggestions(prev => ({ ...prev, [fieldId]: value.length > 0 && filtered.length > 0 }));
  };

  const selectSuggestion = (fieldId: string, suggestion: string) => {
    if (fieldId === 'chiefComplaint') {
      setPrescriptionData(prev => ({ ...prev, chiefComplaint: suggestion }));
    } else if (fieldId === 'diagnosis') {
      setPrescriptionData(prev => ({ ...prev, diagnosis: suggestion }));
    }
    setShowSuggestions(prev => ({ ...prev, [fieldId]: false }));
  };

  const SearchableInput = ({ 
    fieldId, 
    value, 
    onChange, 
    placeholder, 
    className = "" 
  }: { 
    fieldId: string; 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string; 
    className?: string;
  }) => (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            handleSearchInput(fieldId, e.target.value);
          }}
          onFocus={() => {
            if (value.length > 0) {
              handleSearchInput(fieldId, value);
            }
          }}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
        />
      </div>
      {showSuggestions[fieldId] && filteredSuggestions[fieldId]?.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions[fieldId].map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => selectSuggestion(fieldId, suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
    content: React.ReactNode
  ) => {
    const field = finalFieldConfigs.find(f => f.id === fieldId);
    if (!field?.enabled) return null;

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
                    Save for Later
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
  // Field configurations are now loaded from API, no need for localStorage

  // Show loading state while fetching field preferences
  if (shouldShowLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading field preferences...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save for Later
            </Button>
            <Button size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="w-full space-y-4">

            {/* Vitals Section */}
            {renderCollapsibleSection(
              'vitals',
              'Vitals',
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {/* Blood Pressure */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">BP</Label>
                    </div>
                    <Input
                      placeholder="120/80"
                      value={prescriptionData.vitals.bloodPressure}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bloodPressure: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  
                  {/* Temperature */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Temp</Label>
                    </div>
                    <Input
                      placeholder="98.6°F"
                      value={prescriptionData.vitals.temperature}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, temperature: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-red-400 focus:ring-1 focus:ring-red-100"
                    />
                  </div>
                  
                  {/* Heart Rate */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">HR</Label>
                    </div>
                    <Input
                      placeholder="72 bpm"
                      value={prescriptionData.vitals.heartRate}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, heartRate: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-100"
                    />
                  </div>
                  
                  {/* O2 Saturation */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">O2</Label>
                    </div>
                    <Input
                      placeholder="98%"
                      value={prescriptionData.vitals.oxygenSaturation}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, oxygenSaturation: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                    />
                  </div>
                  
                  {/* Weight */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Weight</Label>
                    </div>
                    <Input
                      placeholder="70 kg"
                      value={prescriptionData.vitals.weight}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, weight: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-100"
                    />
                  </div>
                  
                  {/* Height */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Height</Label>
                    </div>
                    <Input
                      placeholder="170 cm"
                      value={prescriptionData.vitals.height}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, height: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-100"
                    />
                  </div>
                  
                  {/* BMI */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">BMI</Label>
                    </div>
                    <Input
                      placeholder="24.2"
                      value={prescriptionData.vitals.bmi}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bmi: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Chief Complaint Section */}
            {renderCollapsibleSection(
              'chiefComplaint',
              'Chief Complaint',
              <div className="space-y-3">
                <SearchableInput
                  fieldId="chiefComplaint"
                  value={prescriptionData.chiefComplaint}
                  onChange={(value) => setPrescriptionData(prev => ({
                    ...prev,
                    chiefComplaint: value
                  }))}
                  placeholder="Search or type the main reason for the visit..."
                  className="text-sm"
                />
                <Textarea
                  placeholder="Additional details about the complaint..."
                  value={prescriptionData.chiefComplaint}
                  onChange={(e) => setPrescriptionData(prev => ({
                    ...prev,
                    chiefComplaint: e.target.value
                  }))}
                  className="min-h-[60px] text-sm"
                />
              </div>
            )}

            {/* History Section */}
            {renderCollapsibleSection(
              'history',
              'History',
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
              <div className="space-y-3">
                <SearchableInput
                  fieldId="diagnosis"
                  value={prescriptionData.diagnosis}
                  onChange={(value) => setPrescriptionData(prev => ({
                    ...prev,
                    diagnosis: value
                  }))}
                  placeholder="Search or type diagnosis..."
                  className="text-sm"
                />
                <Textarea
                  placeholder="Additional diagnosis details..."
                  value={prescriptionData.diagnosis}
                  onChange={(e) => setPrescriptionData(prev => ({
                    ...prev,
                    diagnosis: e.target.value
                  }))}
                  className="min-h-[60px] text-sm"
                />
              </div>
            )}

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigations / Procedures',
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
