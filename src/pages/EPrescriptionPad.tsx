import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AdvancedSuggestionInput from '@/components/ui/AdvancedSuggestionInput';
import { printPrescription } from '@/utils/printPrescription';

// Debug: Check if function is imported correctly
console.log('printPrescription function imported:', typeof printPrescription);
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
  Check,
  Search
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

// Predefined options for each field
const predefinedOptions = {
  chiefComplaint: [
    'Fever', 'Cough', 'Headache', 'Chest pain', 'Shortness of breath', 'Nausea', 'Vomiting', 'Diarrhea',
    'Abdominal pain', 'Back pain', 'Joint pain', 'Fatigue', 'Dizziness', 'Weight loss', 'Weight gain',
    'Sleep problems', 'Anxiety', 'Depression', 'Skin rash', 'Itching', 'Swelling', 'Bleeding',
    'Urinary problems', 'Vision problems', 'Hearing problems', 'Memory problems', 'Confusion'
  ],
  comorbidity: [
    'Diabetes', 'Hypertension', 'Heart disease', 'Asthma', 'COPD', 'Arthritis', 'Osteoporosis',
    'Thyroid disorder', 'Kidney disease', 'Liver disease', 'Cancer', 'Stroke', 'Depression',
    'Anxiety', 'Obesity', 'High cholesterol', 'Migraine', 'Epilepsy', 'Parkinson\'s disease',
    'Alzheimer\'s disease', 'Multiple sclerosis', 'Lupus', 'Rheumatoid arthritis', 'Crohn\'s disease',
    'Ulcerative colitis', 'GERD', 'Peptic ulcer', 'Gallstones', 'Kidney stones'
  ],
  history: [
    'Family history of diabetes', 'Family history of heart disease', 'Family history of cancer',
    'Family history of hypertension', 'Previous surgery', 'Previous hospitalization',
    'Allergic reactions', 'Medication allergies', 'Food allergies', 'Environmental allergies',
    'Smoking history', 'Alcohol use', 'Drug use', 'Exercise routine', 'Dietary habits',
    'Travel history', 'Occupational exposure', 'Previous injuries', 'Previous infections',
    'Vaccination history', 'Pregnancy history', 'Menstrual history', 'Sexual history'
  ],
  examination: [
    'General appearance: Well/Unwell', 'Vital signs: Stable/Unstable', 'Blood pressure: Normal/Elevated',
    'Heart rate: Regular/Irregular', 'Temperature: Afebrile/Febrile', 'Respiratory rate: Normal/Tachypneic',
    'Oxygen saturation: Normal/Low', 'Weight: Stable/Changed', 'Height: Normal/Short stature',
    'Skin: Clear/Rash present', 'Eyes: Normal/Abnormal', 'Ears: Normal/Abnormal',
    'Nose: Normal/Abnormal', 'Throat: Normal/Inflamed', 'Neck: Normal/Lymphadenopathy',
    'Chest: Clear/Rales/Rhonchi', 'Heart: Regular/Irregular/Murmur', 'Abdomen: Soft/Tender/Distended',
    'Extremities: Normal/Swelling', 'Neurological: Normal/Abnormal', 'Mental status: Alert/Confused'
  ],
  diagnosis: [
    'Upper respiratory infection', 'Lower respiratory infection', 'Pneumonia', 'Bronchitis',
    'Asthma exacerbation', 'COPD exacerbation', 'Hypertension', 'Diabetes mellitus',
    'Type 1 diabetes', 'Type 2 diabetes', 'Hypoglycemia', 'Hyperglycemia', 'Diabetic ketoacidosis',
    'Heart failure', 'Myocardial infarction', 'Angina', 'Arrhythmia', 'Atrial fibrillation',
    'Stroke', 'TIA', 'Migraine', 'Tension headache', 'Cluster headache', 'Seizure disorder',
    'Depression', 'Anxiety disorder', 'Panic disorder', 'Bipolar disorder', 'Schizophrenia',
    'Osteoarthritis', 'Rheumatoid arthritis', 'Fibromyalgia', 'Chronic pain syndrome',
    'Gastroenteritis', 'GERD', 'Peptic ulcer', 'Irritable bowel syndrome', 'Constipation',
    'Urinary tract infection', 'Kidney stones', 'Chronic kidney disease', 'Liver disease',
    'Hepatitis', 'Cirrhosis', 'Thyroid disorder', 'Hypothyroidism', 'Hyperthyroidism'
  ],
  investigations: [
    'Complete Blood Count (CBC)', 'Basic Metabolic Panel (BMP)', 'Comprehensive Metabolic Panel (CMP)',
    'Lipid Panel', 'Thyroid Function Tests', 'HbA1c', 'Fasting Blood Glucose', 'Random Blood Glucose',
    'Urinalysis', 'Urine Culture', 'Stool Analysis', 'Stool Culture', 'Chest X-ray',
    'ECG', 'Echocardiogram', 'Stress Test', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography',
    'Colonoscopy', 'Endoscopy', 'Biopsy', 'Blood Culture', 'Sputum Culture', 'Throat Culture',
    'Skin Test', 'Allergy Testing', 'Pulmonary Function Test', 'Sleep Study', 'Bone Density Scan',
    'Cardiac Catheterization', 'Angiography', 'Nuclear Medicine Scan', 'PET Scan'
  ],
  procedures: [
    'Physical Examination', 'Vital Signs Check', 'Blood Pressure Measurement', 'Temperature Check',
    'Weight and Height Measurement', 'BMI Calculation', 'Vision Test', 'Hearing Test',
    'Reflex Testing', 'Range of Motion Assessment', 'Skin Examination', 'Mole Check',
    'Breast Examination', 'Pelvic Examination', 'Prostate Examination', 'Rectal Examination',
    'Neurological Examination', 'Mental Status Examination', 'Gait Assessment', 'Balance Test',
    'Vaccination', 'Flu Shot', 'COVID-19 Vaccine', 'Tetanus Shot', 'Blood Draw',
    'IV Insertion', 'Catheter Insertion', 'Wound Care', 'Suture Removal', 'Cast Application',
    'Splint Application', 'Physical Therapy', 'Occupational Therapy', 'Speech Therapy',
    'Counseling Session', 'Nutrition Counseling', 'Smoking Cessation Counseling'
  ]
};

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

  // Enhanced Auto-suggestion system for Chief Complaint
  const AutoSuggestionInput = ({ fieldId, value, onChange, placeholder }: { 
    fieldId: string; 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string; 
  }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [inputRef, setInputRef] = useState<HTMLTextAreaElement | null>(null);
    const [suggestionsRef, setSuggestionsRef] = useState<HTMLDivElement | null>(null);

    // Get personalized options from localStorage
    const getPersonalizedOptions = (fieldId: string): string[] => {
      try {
        const saved = localStorage.getItem('eprescription-personalized-options');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed[fieldId] || [];
        }
      } catch (error) {
        console.error('Error loading personalized options:', error);
      }
      return [];
    };

    // Get all available options (predefined + personalized)
    const getAllOptions = (): string[] => {
      const predefined = predefinedOptions[fieldId as keyof typeof predefinedOptions] || [];
      const personalized = getPersonalizedOptions(fieldId);
      
      // Combine and remove duplicates
      const allOptions = [...predefined, ...personalized];
      return [...new Set(allOptions)];
    };

    // Enhanced filtering with better search logic
    const getFilteredSuggestions = (): string[] => {
      if (!value || value.trim().length < 1) return [];
      
      const searchTerm = value.trim().toLowerCase();
      const allOptions = getAllOptions();
      
      // First, find exact matches at the beginning
      const exactMatches = allOptions.filter(option => 
        option.toLowerCase().startsWith(searchTerm)
      );
      
      // Then, find partial matches
      const partialMatches = allOptions.filter(option => 
        option.toLowerCase().includes(searchTerm) && 
        !option.toLowerCase().startsWith(searchTerm)
      );
      
      // Combine and limit results
      const combined = [...exactMatches, ...partialMatches];
      return combined.slice(0, 8); // Limit to 8 for better performance
    };

    const suggestions = getFilteredSuggestions();

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      // Immediately show suggestions if there's input and we have matches
      const shouldShow = newValue.trim().length > 0 && getFilteredSuggestions().length > 0;
      setShowSuggestions(shouldShow);
      setSelectedIndex(-1);
      
      // Ensure input stays focused without interfering with typing
      if (inputRef) {
        // Use a more immediate approach to maintain focus
        setTimeout(() => {
          if (inputRef && document.activeElement !== inputRef) {
            inputRef.focus();
          }
        }, 0);
      }
    };

    // Handle suggestion selection
    const selectSuggestion = (suggestion: string) => {
      onChange(suggestion);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      // Keep focus on input after selection
      setTimeout(() => {
        if (inputRef) {
          inputRef.focus();
          // Move cursor to end of text
          const length = suggestion.length;
          inputRef.setSelectionRange(length, length);
        }
      }, 0);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Always allow normal typing characters
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Space') {
        return; // Allow normal typing
      }

      if (!showSuggestions || suggestions.length === 0) {
        // Allow normal textarea behavior when no suggestions
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            selectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
        case 'Tab':
          // Allow tab to close suggestions and move to next field
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    // Handle focus events
    const handleFocus = () => {
      // Show suggestions if there's content and matches
      if (value.trim().length > 0 && suggestions.length > 0) {
        setShowSuggestions(true);
      }
    };

    // Handle blur events - be more lenient about closing suggestions
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Don't close suggestions immediately - let the click outside handler manage it
      // This allows for smoother interaction with suggestions
    };

    // Handle click outside to close suggestions
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          inputRef && 
          suggestionsRef && 
          !inputRef.contains(event.target as Node) && 
          !suggestionsRef.contains(event.target as Node)
        ) {
          // Longer delay to prevent closing when user is still interacting
          setTimeout(() => {
            setShowSuggestions(false);
            setSelectedIndex(-1);
          }, 300);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputRef, suggestionsRef]);

    // Debug logging (remove in production)
    useEffect(() => {
      if (value.trim().length > 0) {
        console.log('Search term:', value);
        console.log('All options:', getAllOptions());
        console.log('Filtered suggestions:', suggestions);
      }
    }, [value, suggestions]);

    return (
      <div className="relative">
        <Textarea
          ref={setInputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="min-h-[80px] text-sm resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-150"
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* Auto-suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={setSuggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200"
          >
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-between">
                <span>Suggestions ({suggestions.length})</span>
                <span className="text-gray-400">Press ↑↓ to navigate, Enter to select</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded-full">
                      <Plus className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="font-medium">{suggestion}</span>
                    {suggestion.toLowerCase().startsWith(value.trim().toLowerCase()) && (
                      <span className="text-xs text-green-600 bg-green-100 px-1 rounded">Exact</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input hint when no suggestions found */}
        {value.trim().length > 0 && suggestions.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs text-yellow-700">
              <div className="flex items-center gap-1 mb-1">
                <div className="p-0.5 bg-yellow-100 rounded-full">
                  <Plus className="h-2.5 w-2.5 text-yellow-600" />
                </div>
                <span className="font-medium">No suggestions found for "{value}"</span>
              </div>
              <p className="text-yellow-600">Continue typing or add this as a new personalized option below</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get personalized options from localStorage
  const getPersonalizedOptions = (fieldId: string) => {
    try {
      const saved = localStorage.getItem('eprescription-personalized-options');
      return saved ? JSON.parse(saved)[fieldId] || [] : [];
    } catch {
      return [];
    }
  };

  // Helper function to get all options for a field
  const getAllOptionsForField = (fieldId: string): string[] => {
    const predefined = predefinedOptions[fieldId as keyof typeof predefinedOptions] || [];
    const personalized = getPersonalizedOptions(fieldId);
    return [...new Set([...predefined, ...personalized])];
  };

  // Reusable Auto-Suggestion Field Component
  const AutoSuggestionField = ({ fieldId, title, placeholder, value, onChange, className = "min-h-[100px]" }: {
    fieldId: string;
    title: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
  }) => {
    const [fieldSaveStatus, setFieldSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

    const saveFieldData = async (fieldId: string, data: any) => {
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saving' }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saved' }));
      setTimeout(() => {
        setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
      }, 2000);
    };

    const getAllOptionsForField = (fieldId: string): string[] => {
      const predefined = predefinedOptions[fieldId as keyof typeof predefinedOptions] || [];
      const personalized = getPersonalizedOptions(fieldId);
      return [...new Set([...predefined, ...personalized])];
    };

    return (
      <div className="space-y-4">
        {/* Advanced Suggestion Input */}
        <AdvancedSuggestionInput
          data={getAllOptionsForField(fieldId)}
          placeholder={placeholder}
          value={value}
          onValueChange={onChange}
          maxSuggestions={10}
          allowCustom={true}
          className="w-full"
        />
        
        {/* Quick Options within the same card */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {predefinedOptions[fieldId as keyof typeof predefinedOptions]?.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  const currentValue = value || '';
                  const newValue = currentValue ? `${currentValue}, ${option}` : option;
                  onChange(newValue);
                }}
                className="group flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-xs hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                title="Click to add to field"
              >
                <span className="text-blue-600 hover:text-blue-800 font-medium">
                  {option}
                </span>
                <Plus className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveFieldData(fieldId, value)}
            disabled={fieldSaveStatus[fieldId] === 'saving'}
            className="h-7 text-xs"
          >
            {fieldSaveStatus[fieldId] === 'saving' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
            {fieldSaveStatus[fieldId] === 'saved' && <Check className="h-3 w-3 mr-1 text-green-600" />}
            {fieldSaveStatus[fieldId] === 'saving' ? 'Saving...' : 
             fieldSaveStatus[fieldId] === 'saved' ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  // Special Orders Field Component for Investigations and Procedures
  const OrdersField = () => {
    const [fieldSaveStatus, setFieldSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

    const saveFieldData = async (fieldId: string, data: any) => {
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saving' }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saved' }));
      setTimeout(() => {
        setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
      }, 2000);
    };

    const getAllOptionsForField = (fieldId: string): string[] => {
      const predefined = predefinedOptions[fieldId as keyof typeof predefinedOptions] || [];
      const personalized = getPersonalizedOptions(fieldId);
      return [...new Set([...predefined, ...personalized])];
    };

    const addOrderItem = (type: 'investigations' | 'procedures', value: string) => {
      if (value.trim()) {
        setPrescriptionData(prev => ({
          ...prev,
          orders: {
            ...prev.orders,
            [type]: [...prev.orders[type], value.trim()]
          }
        }));
      }
    };

    const updateOrderItem = (type: 'investigations' | 'procedures', index: number, value: string) => {
      setPrescriptionData(prev => ({
        ...prev,
        orders: {
          ...prev.orders,
          [type]: prev.orders[type].map((item, i) => i === index ? value : item)
        }
      }));
    };

    const removeOrderItem = (type: 'investigations' | 'procedures', index: number) => {
      setPrescriptionData(prev => ({
        ...prev,
        orders: {
          ...prev.orders,
          [type]: prev.orders[type].filter((_, i) => i !== index)
        }
      }));
    };

    return (
      <div className="space-y-6">
        {/* Investigations */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Investigations</h4>
          <div className="space-y-3">
            {/* Auto-suggestion input for new investigation */}
            <AdvancedSuggestionInput
              data={getAllOptionsForField('investigations')}
              placeholder="Add investigation..."
              value=""
              onValueChange={(value) => {
                if (value.trim()) {
                  addOrderItem('investigations', value);
                }
              }}
              maxSuggestions={8}
              allowCustom={true}
              className="w-full"
            />
            
            {/* Quick options for investigations */}
            <div className="flex flex-wrap gap-2">
              {predefinedOptions.investigations?.slice(0, 8).map((option, index) => (
                <button
                  key={index}
                  onClick={() => addOrderItem('investigations', option)}
                  className="group flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-xs hover:bg-green-100 hover:border-green-400 transition-all duration-200"
                  title="Click to add investigation"
                >
                  <span className="text-green-600 hover:text-green-800 font-medium">
                    {option}
                  </span>
                  <Plus className="h-3 w-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Existing investigations */}
            {prescriptionData.orders.investigations.map((investigation, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Input
                  value={investigation}
                  onChange={(e) => updateOrderItem('investigations', index, e.target.value)}
                  className="flex-1 text-sm"
                  placeholder="Investigation name"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeOrderItem('investigations', index)}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Procedures */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Procedures</h4>
          <div className="space-y-3">
            {/* Auto-suggestion input for new procedure */}
            <AdvancedSuggestionInput
              data={getAllOptionsForField('procedures')}
              placeholder="Add procedure..."
              value=""
              onValueChange={(value) => {
                if (value.trim()) {
                  addOrderItem('procedures', value);
                }
              }}
              maxSuggestions={8}
              allowCustom={true}
              className="w-full"
            />
            
            {/* Quick options for procedures */}
            <div className="flex flex-wrap gap-2">
              {predefinedOptions.procedures?.slice(0, 8).map((option, index) => (
                <button
                  key={index}
                  onClick={() => addOrderItem('procedures', option)}
                  className="group flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-3 py-1.5 text-xs hover:bg-purple-100 hover:border-purple-400 transition-all duration-200"
                  title="Click to add procedure"
                >
                  <span className="text-purple-600 hover:text-purple-800 font-medium">
                    {option}
                  </span>
                  <Plus className="h-3 w-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Existing procedures */}
            {prescriptionData.orders.procedures.map((procedure, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Input
                  value={procedure}
                  onChange={(e) => updateOrderItem('procedures', index, e.target.value)}
                  className="flex-1 text-sm"
                  placeholder="Procedure name"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeOrderItem('procedures', index)}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveFieldData('orders', prescriptionData.orders)}
            disabled={fieldSaveStatus['orders'] === 'saving'}
            className="h-7 text-xs"
          >
            {fieldSaveStatus['orders'] === 'saving' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
            {fieldSaveStatus['orders'] === 'saved' && <Check className="h-3 w-3 mr-1 text-green-600" />}
            {fieldSaveStatus['orders'] === 'saving' ? 'Saving...' : 
             fieldSaveStatus['orders'] === 'saved' ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  // Combined Chief Complaint Card with Auto-suggestion and Personalized Options
  const CombinedChiefComplaintCard = ({ fieldId, title, content }: { fieldId: string; title: string; content: React.ReactNode }) => {
    const [customValue, setCustomValue] = useState('');
    const [showAddCustom, setShowAddCustom] = useState(false);
    
    // Get personalized options from localStorage
    const getPersonalizedOptionsLocal = (fieldId: string) => {
      try {
        const saved = localStorage.getItem('eprescription-personalized-options');
        return saved ? JSON.parse(saved)[fieldId] || [] : [];
      } catch {
        return [];
      }
    };

    const [personalizedOptions, setPersonalizedOptions] = useState<string[]>(getPersonalizedOptionsLocal(fieldId));

    const addPersonalizedOption = (option: string) => {
      if (option.trim() && !personalizedOptions.includes(option.trim())) {
        const newOptions = [...personalizedOptions, option.trim()];
        setPersonalizedOptions(newOptions);
        
        // Save to localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('eprescription-personalized-options') || '{}');
          saved[fieldId] = newOptions;
          localStorage.setItem('eprescription-personalized-options', JSON.stringify(saved));
          console.log('Added personalized option:', option, 'Total options:', newOptions);
        } catch (error) {
          console.error('Error saving personalized options:', error);
        }
      }
    };

    const removePersonalizedOption = (option: string) => {
      const newOptions = personalizedOptions.filter(opt => opt !== option);
      setPersonalizedOptions(newOptions);
      
      // Save to localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('eprescription-personalized-options') || '{}');
        saved[fieldId] = newOptions;
        localStorage.setItem('eprescription-personalized-options', JSON.stringify(saved));
      } catch (error) {
        console.error('Error saving personalized options:', error);
      }
    };

    const handleAddCustom = () => {
      if (customValue.trim()) {
        addPersonalizedOption(customValue);
        setCustomValue('');
        setShowAddCustom(false);
        // Show success feedback
        console.log('Successfully added custom option:', customValue);
      }
    };

    return (
      <Card className="border border-gray-200 hover:shadow-lg transition-shadow duration-200">
        <CardHeader 
          className="pb-4 cursor-pointer transition-colors"
          onClick={() => toggleSection(fieldId)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
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
          <CardContent className="p-6">
            {/* Input Field with Advanced Auto-suggestion */}
            <div className="mb-6">
              {fieldId === 'chiefComplaint' ? (
                <AdvancedSuggestionInput
                  data={getAllOptionsForField(fieldId)}
                  placeholder="Type symptoms or complaints... (comma to add multiple)"
                  onChange={(tokens, csv) => setPrescriptionData(prev => ({ ...prev, chiefComplaint: csv }))}
                  value={prescriptionData.chiefComplaint || ''}
                  onValueChange={(value) => setPrescriptionData(prev => ({ ...prev, chiefComplaint: value }))}
                  maxSuggestions={8}
                  allowCustom={true}
                  className="w-full"
                />
              ) : (
                content
              )}
            </div>
            
            {/* Quick Options within the same card */}
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {predefinedOptions[fieldId as keyof typeof predefinedOptions]?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      // Add to the current complaint field
                      const currentValue = prescriptionData.chiefComplaint || '';
                      const newValue = currentValue ? `${currentValue}, ${option}` : option;
                      setPrescriptionData(prev => ({ ...prev, chiefComplaint: newValue }));
                    }}
                    className="group flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-xs hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                    title="Click to add to complaint"
                  >
                    <span className="text-blue-600 hover:text-blue-800 font-medium">
                      {option}
                    </span>
                    <Plus className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
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

  const renderCollapsibleSection = (
    fieldId: string, 
    title: string, 
    content: React.ReactNode
  ) => {
    const field = fieldConfigs.find(f => f.id === fieldId);
    if (!field?.enabled) return null;

    const hasPredefinedOptions = ['chiefComplaint', 'comorbidity', 'history', 'examination', 'diagnosis', 'orders'].includes(fieldId);
    const showQuickOptions = fieldId === 'chiefComplaint' && !collapsedSections[fieldId];

    if (showQuickOptions) {
      return (
        <CombinedChiefComplaintCard 
          key={fieldId} 
          fieldId={fieldId} 
          title={title} 
          content={content} 
        />
      );
    }

    return (
      <Card key={fieldId} className="relative border border-gray-200 hover:shadow-lg transition-shadow duration-200">
        <CardHeader 
          className="pb-4 cursor-pointer transition-colors"
          onClick={() => toggleSection(fieldId)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
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
          <CardContent className="relative p-6">
            {/* Content */}
            <div>
              {content}
            </div>
            
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
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">E-Prescription Pad</h1>
              <p className="text-base text-gray-500 mt-1">Patient ID: {patientId}</p>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => {
                console.log('Test print button clicked');
                // Simple test with minimal data
                printPrescription(
                  { id: 'TEST', name: 'Test Patient', age: 30, gender: 'Male', phone: '123-456-7890', email: 'test@test.com', address: 'Test Address', dateOfBirth: '1990-01-01', emergencyContact: 'Test Contact' },
                  { bloodPressure: '120/80', temperature: '98.6°F', heartRate: '72 bpm', weight: '70 kg', height: '170 cm', bmi: '24.2', oxygenSaturation: '98%' },
                  { chiefComplaint: 'Test complaint', history: 'Test history', comorbidity: 'Test comorbidity', examination: 'Test examination', diagnosis: 'Test diagnosis', orders: { investigations: ['Test'], procedures: ['Test'] }, medications: [{ name: 'Test Med', dosage: '100mg', frequency: 'Once daily', duration: '7 days' }], privateNotes: 'Test notes', certificates: 'Test certificate', immunizations: 'Test immunization', followUp: 'Test followup', nonPharmacologicalAdvice: 'Test advice', attachments: 'Test attachment' },
                  { name: 'Dr. Test', degree: 'MBBS', specialization: 'General', license: 'TEST123', phone: '123-456-7890', email: 'dr@test.com', address: 'Test Address', signature: 'Dr. Test' }
                );
              }}
            >
              <Printer className="h-4 w-4" />
              Test Print
            </Button>
            <Button 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => {
                console.log('Print button clicked in EPrescriptionPad');
                console.log('Current prescription data:', prescriptionData);
                try {
                  printPrescription(
                {
                  id: 'P001',
                  name: 'John Smith',
                  age: 45,
                  gender: 'Male',
                  phone: '+1 (555) 123-4567',
                  email: 'john.smith@email.com',
                  address: '123 Main Street, City, State 12345',
                  dateOfBirth: '1978-03-15',
                  emergencyContact: 'Jane Smith - +1 (555) 987-6543'
                },
                {
                  bloodPressure: '120/80',
                  temperature: '98.6°F',
                  heartRate: '72 bpm',
                  weight: '75 kg',
                  height: '175 cm',
                  bmi: '24.5',
                  oxygenSaturation: '98%'
                },
                {
                  chiefComplaint: prescriptionData.chiefComplaint || 'Chest pain, Shortness of breath',
                  history: prescriptionData.history || 'Family history of heart disease',
                  comorbidity: prescriptionData.comorbidity || 'Hypertension, Diabetes',
                  examination: prescriptionData.examination || 'Blood pressure elevated',
                  diagnosis: prescriptionData.diagnosis || 'Hypertension, Diabetes mellitus',
                  orders: prescriptionData.orders,
                  medications: [
                    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days' },
                    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' }
                  ],
                  privateNotes: prescriptionData.privateNotes || 'Follow up in 2 weeks',
                  certificates: prescriptionData.certificates || 'Medical certificate issued',
                  immunizations: prescriptionData.immunizations || 'Annual flu vaccine recommended',
                  followUp: typeof prescriptionData.followUp === 'string' ? prescriptionData.followUp : 'Follow up in 2 weeks',
                  nonPharmacologicalAdvice: typeof prescriptionData.nonPharmacologicalAdvice === 'string' ? prescriptionData.nonPharmacologicalAdvice : 'Regular exercise, low sodium diet',
                  attachments: typeof prescriptionData.attachments === 'string' ? prescriptionData.attachments : 'ECG report attached'
                },
                {
                  name: 'Dr. Sarah Johnson',
                  degree: 'MBBS, MD (Cardiology)',
                  specialization: 'Cardiologist',
                  license: 'MD12345',
                  phone: '+1 (555) 234-5678',
                  email: 'dr.johnson@hospital.com',
                  address: 'Medical Center, 456 Health Street, City, State 12345',
                  signature: 'Dr. Sarah Johnson'
                }
                  );
                } catch (error) {
                  console.error('Error calling printPrescription:', error);
                  alert('Error opening print dialog. Please try again.');
                }
              }}
            >
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Enhanced Vitals Section */}
            {renderCollapsibleSection(
              'vitals',
              'Vitals',
              <div className="space-y-4">
                {/* Quick Input Row */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <h4 className="text-sm font-semibold text-green-800">Quick Vitals Entry</h4>
                  </div>
                  <div className="grid grid-cols-7 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        BP
                      </Label>
                      <Input
                        placeholder="120/80"
                        value={prescriptionData.vitals.bloodPressure}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, bloodPressure: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-red-400 focus:ring-red-200"
                      />
                      <p className="text-xs text-gray-500">mmHg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Temp
                      </Label>
                      <Input
                        placeholder="98.6"
                        value={prescriptionData.vitals.temperature}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, temperature: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-orange-400 focus:ring-orange-200"
                      />
                      <p className="text-xs text-gray-500">°F</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        HR
                      </Label>
                      <Input
                        placeholder="72"
                        value={prescriptionData.vitals.heartRate}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, heartRate: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-pink-400 focus:ring-pink-200"
                      />
                      <p className="text-xs text-gray-500">bpm</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Weight
                      </Label>
                      <Input
                        placeholder="70"
                        value={prescriptionData.vitals.weight}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, weight: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-blue-400 focus:ring-blue-200"
                      />
                      <p className="text-xs text-gray-500">kg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Height
                      </Label>
                      <Input
                        placeholder="170"
                        value={prescriptionData.vitals.height}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, height: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-purple-400 focus:ring-purple-200"
                      />
                      <p className="text-xs text-gray-500">cm</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        BMI
                      </Label>
                      <Input
                        placeholder="24.2"
                        value={prescriptionData.vitals.bmi}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, bmi: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-indigo-400 focus:ring-indigo-200"
                      />
                      <p className="text-xs text-gray-500">kg/m²</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                        SpO₂
                      </Label>
                      <Input
                        placeholder="98"
                        value={prescriptionData.vitals.oxygenSaturation}
                        onChange={(e) => setPrescriptionData(prev => ({
                          ...prev,
                          vitals: { ...prev.vitals, oxygenSaturation: e.target.value }
                        }))}
                        className="h-9 text-sm border-gray-300 focus:border-teal-400 focus:ring-teal-200"
                      />
                      <p className="text-xs text-gray-500">%</p>
                    </div>
                  </div>
                </div>

                {/* Time Stamp */}
                <div className="flex justify-end">
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {/* Chief Complaint Section */}
            {renderCollapsibleSection(
              'chiefComplaint',
              'Chief Complaint',
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
              <AutoSuggestionField
                fieldId="history"
                title="History"
                placeholder="Medical history, family history, social history..."
                value={prescriptionData.history}
                onChange={(value) => setPrescriptionData(prev => ({
                  ...prev,
                  history: value
                }))}
                className="min-h-[100px]"
              />
            )}

            {/* Comorbidity Section */}
            {renderCollapsibleSection(
              'comorbidity',
              'Comorbidity',
              <AutoSuggestionField
                fieldId="comorbidity"
                title="Comorbidity"
                placeholder="Existing medical conditions, comorbidities..."
                value={prescriptionData.comorbidity}
                onChange={(value) => setPrescriptionData(prev => ({
                  ...prev,
                  comorbidity: value
                }))}
                className="min-h-[80px]"
              />
            )}

            {/* Examination Section */}
            {renderCollapsibleSection(
              'examination',
              'Examination',
              <AutoSuggestionField
                fieldId="examination"
                title="Examination"
                placeholder="Physical examination findings..."
                value={prescriptionData.examination}
                onChange={(value) => setPrescriptionData(prev => ({
                  ...prev,
                  examination: value
                }))}
                className="min-h-[100px]"
              />
            )}

            {/* Diagnosis Section */}
            {renderCollapsibleSection(
              'diagnosis',
              'Diagnosis',
              <AutoSuggestionField
                fieldId="diagnosis"
                title="Diagnosis"
                placeholder="Primary and secondary diagnoses..."
                value={prescriptionData.diagnosis}
                onChange={(value) => setPrescriptionData(prev => ({
                  ...prev,
                  diagnosis: value
                }))}
                className="min-h-[80px]"
              />
            )}

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigations / Procedures',
              <OrdersField />
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
