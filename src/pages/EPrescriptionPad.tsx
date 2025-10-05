import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdvancedSuggestionInput from '@/components/ui/AdvancedSuggestionInput';
import { printPrescription } from '@/utils/printPrescription';

// Debug: Check if function is imported correctly
console.log('printPrescription function imported:', typeof printPrescription);
import { 
  Save, 
  Printer, 
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
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Upload,
  File,
  Image,
  TestTube,
  FileType
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
  attachments: Array<{
    id: string;
    name: string;
    type: 'test' | 'document' | 'image' | 'other';
    file: File | string; // File object or URL string
    uploadedAt: string;
  }>;
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
  medications: [
    'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Azithromycin', 'Ciprofloxacin',
    'Metformin', 'Insulin', 'Amlodipine', 'Atenolol', 'Losartan', 'Enalapril',
    'Omeprazole', 'Ranitidine', 'Pantoprazole', 'Domperidone', 'Ondansetron',
    'Salbutamol', 'Montelukast', 'Cetirizine', 'Loratadine', 'Prednisolone',
    'Atorvastatin', 'Rosuvastatin', 'Clopidogrel', 'Warfarin', 'Levothyroxine'
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

// Attachment Field Component
const AttachmentField: React.FC<{
  attachments: Array<{
    id: string;
    name: string;
    type: 'test' | 'document' | 'image' | 'other';
    file: File | string;
    uploadedAt: string;
  }>;
  onAttachmentsChange: (attachments: Array<{
    id: string;
    name: string;
    type: 'test' | 'document' | 'image' | 'other';
    file: File | string;
    uploadedAt: string;
  }>) => void;
}> = ({ attachments, onAttachmentsChange }) => {
  const [selectedType, setSelectedType] = useState<'test' | 'document' | 'image' | 'other'>('test');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments = Array.from(files).map(file => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: selectedType,
        file: file,
        uploadedAt: new Date().toISOString()
      }));

      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(attachment => attachment.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test': return <TestTube className="h-4 w-4 text-blue-500" />;
      case 'document': return <File className="h-4 w-4 text-green-500" />;
      case 'image': return <Image className="h-4 w-4 text-purple-500" />;
      default: return <FileType className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'test': return 'Test Results';
      case 'document': return 'Document';
      case 'image': return 'Image';
      default: return 'Other';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center mb-4">
          <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-4">Upload files, images, or documents</p>
        </div>

        {/* Type Selection */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Attachment Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'test', label: 'Test Results', icon: <TestTube className="h-4 w-4" /> },
              { value: 'document', label: 'Document', icon: <File className="h-4 w-4" /> },
              { value: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> },
              { value: 'other', label: 'Other', icon: <FileType className="h-4 w-4" /> }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedType(option.value as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  selectedType === option.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="flex items-center justify-center">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept={
                selectedType === 'image' 
                  ? 'image/*' 
                  : selectedType === 'test' 
                    ? '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif'
                    : '*'
              }
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 text-sm"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add {getTypeLabel(selectedType)}
                </>
              )}
            </Button>
          </label>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Uploaded Attachments</Label>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(attachment.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {getTypeLabel(attachment.type)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(attachment.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const defaultFieldConfigs: FieldConfig[] = [
  { id: 'vitals', label: 'Vitals', enabled: true, required: true, category: 'basic' },
  { id: 'chiefComplaint', label: 'Chief Complaint', enabled: true, required: true, category: 'basic' },
  { id: 'history', label: 'History', enabled: true, required: false, category: 'clinical' },
  { id: 'comorbidity', label: 'Comorbidity', enabled: true, required: false, category: 'clinical' },
  { id: 'examination', label: 'Examination', enabled: true, required: false, category: 'clinical' },
  { id: 'diagnosis', label: 'Diagnosis', enabled: true, required: true, category: 'clinical' },
  { id: 'investigations', label: 'Investigations', enabled: true, required: false, category: 'treatment' },
  { id: 'procedures', label: 'Procedures', enabled: true, required: false, category: 'treatment' },
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
  const [showPreview, setShowPreview] = useState(false);
  const [showDurationInput, setShowDurationInput] = useState<boolean>(false);
  const [lastAddedComplaint, setLastAddedComplaint] = useState<string>('');
  const [complaintDays, setComplaintDays] = useState<string>('');
  const [durationUnit, setDurationUnit] = useState<string>('days');



  // Function to add duration to last added complaint from search
  const addDurationToLastComplaint = (days: string) => {
    if (!lastAddedComplaint || !days) return;
    
    const currentValue = prescriptionData.chiefComplaint || '';
    const updatedValue = currentValue.replace(
      lastAddedComplaint, 
      `${lastAddedComplaint} since ${days}`
    );
    
    setPrescriptionData(prev => ({ ...prev, chiefComplaint: updatedValue }));
    setShowDurationInput(false);
    setLastAddedComplaint('');
  };

  // Custom onChange handler for chief complaint to detect new additions
  const handleChiefComplaintChange = (tokens: string[], csv: string) => {
    setPrescriptionData(prev => ({ ...prev, chiefComplaint: csv }));
    
    // Check if a new token was added (for duration input)
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && !prescriptionData.chiefComplaint.includes(lastToken)) {
        setLastAddedComplaint(lastToken);
        setShowDurationInput(true);
      }
    }
  };
  
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
    // Use parent's saveFieldData function
    const saveAutoSuggestionFieldData = async (fieldId: string, data: any) => {
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saving' }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saved' }));
      setTimeout(() => {
        setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
      }, 2000);
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
            onClick={() => saveAutoSuggestionFieldData(fieldId, value)}
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
  // Helper functions for orders (shared between Investigations and Procedures)
  const saveOrdersFieldData = async (fieldId: string, data: any) => {
    setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saving' }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'saved' }));
    setTimeout(() => {
      setFieldSaveStatus(prev => ({ ...prev, [fieldId]: 'idle' }));
    }, 2000);
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

  // Improved Medications Field Component - Tabular Form
  const MedicationsField = () => {
    const [activeQuickOptions, setActiveQuickOptions] = useState<string | null>(null);

    const frequencyOptions = [
      { value: 'OD', label: 'Once Daily', abbr: 'OD' },
      { value: 'BD', label: 'Twice Daily', abbr: 'BD' },
      { value: 'TDS', label: 'Three Times Daily', abbr: 'TDS' },
      { value: 'QID', label: 'Four Times Daily', abbr: 'QID' },
      { value: 'SOS', label: 'When Required', abbr: 'SOS' },
      { value: 'STAT', label: 'Immediately', abbr: 'STAT' },
    ];

    const durationOptions = ['3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', '2 months', '3 months'];
    
    const dosageOptions = ['250mg', '500mg', '750mg', '1000mg', '5mg', '10mg', '20mg', '25mg', '50mg', '100mg'];

    const instructionOptions = ['Before food', 'After food', 'With food', 'Empty stomach', 'At bedtime', 'In the morning'];

    return (
      <div className="space-y-3">
        {/* Add Medication Button - Always Visible */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-200 bg-blue-50/50 p-3 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Medications</h4>
            <p className="text-xs text-gray-600">Add and manage patient medications</p>
          </div>
          <Button
            onClick={addMedication}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>

        {/* Medications Table */}
        {prescriptionData.medications.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700 w-8">#</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700">Medication Name</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700">Dosage</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700">Frequency</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700">Duration</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-700">Instructions</th>
                  <th className="border-b border-gray-200 px-3 py-3 text-center text-xs font-semibold text-gray-700 w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionData.medications.map((medication, index) => (
                  <React.Fragment key={medication.id}>
                    <tr className="hover:bg-blue-50/50 transition-colors">
                      <td className="border-b border-gray-100 px-3 py-2 text-center text-sm text-gray-600 font-medium">
                        {index + 1}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="relative">
                          <Input
                            placeholder="Medication name"
                            value={medication.name}
                            onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                            onFocus={() => setActiveQuickOptions(`medicine-${medication.id}`)}
                            onBlur={() => setTimeout(() => setActiveQuickOptions(null), 200)}
                            list={`medications-datalist-${medication.id}`}
                            className="h-8 text-sm min-w-[200px]"
                          />
                          <datalist id={`medications-datalist-${medication.id}`}>
                            {predefinedOptions.medications?.map((med, idx) => (
                              <option key={idx} value={med} />
                            ))}
                          </datalist>
                          {activeQuickOptions === `medicine-${medication.id}` && (
                            <div className="absolute z-50 mt-1 p-2 bg-white rounded-lg border border-blue-200 shadow-xl left-0 max-h-60 overflow-y-auto">
                              <div className="grid grid-cols-2 gap-1 w-[320px]">
                                {predefinedOptions.medications?.map((med, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      updateMedication(medication.id, 'name', med);
                                      setActiveQuickOptions(null);
                                    }}
                                    className="px-3 py-1.5 text-xs text-left bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-blue-700 whitespace-nowrap"
                                  >
                                    {med}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="relative">
                          <Input
                            placeholder="e.g., 500mg"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                            onFocus={() => setActiveQuickOptions(`dosage-${medication.id}`)}
                            onBlur={() => setTimeout(() => setActiveQuickOptions(null), 200)}
                            className="h-8 text-sm min-w-[100px]"
                          />
                          {activeQuickOptions === `dosage-${medication.id}` && (
                            <div className="absolute z-50 mt-1 p-2 bg-white rounded-lg border border-purple-200 shadow-xl left-0">
                              <div className="flex flex-wrap gap-1 w-[180px]">
                                {dosageOptions.map((dose) => (
                                  <button
                                    key={dose}
                                    onClick={() => {
                                      updateMedication(medication.id, 'dosage', dose);
                                      setActiveQuickOptions(null);
                                    }}
                                    className="px-2 py-1 text-xs bg-purple-50 border border-purple-300 rounded hover:bg-purple-100 text-purple-700"
                                  >
                                    {dose}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="min-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {frequencyOptions.map((freq) => (
                              <button
                                key={freq.value}
                                onClick={() => updateMedication(medication.id, 'frequency', freq.value)}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                  medication.frequency === freq.value
                                    ? 'bg-green-600 text-white border-green-700 font-semibold'
                                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                }`}
                                title={freq.label}
                              >
                                {freq.abbr}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="relative">
                          <Input
                            placeholder="e.g., 7 days"
                            value={medication.duration}
                            onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                            onFocus={() => setActiveQuickOptions(`duration-${medication.id}`)}
                            onBlur={() => setTimeout(() => setActiveQuickOptions(null), 200)}
                            className="h-8 text-sm min-w-[100px]"
                          />
                          {activeQuickOptions === `duration-${medication.id}` && (
                            <div className="absolute z-50 mt-1 p-2 bg-white rounded-lg border border-amber-200 shadow-xl left-0">
                              <div className="flex flex-wrap gap-1 w-[200px]">
                                {durationOptions.map((duration) => (
                                  <button
                                    key={duration}
                                    onClick={() => {
                                      updateMedication(medication.id, 'duration', duration);
                                      setActiveQuickOptions(null);
                                    }}
                                    className="px-2 py-1 text-xs bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 text-amber-700 whitespace-nowrap"
                                  >
                                    {duration}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="relative">
                          <Input
                            placeholder="Special instructions"
                            value={medication.instructions}
                            onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                            onFocus={() => setActiveQuickOptions(`instructions-${medication.id}`)}
                            onBlur={() => setTimeout(() => setActiveQuickOptions(null), 200)}
                            className="h-8 text-sm min-w-[150px]"
                          />
                          {activeQuickOptions === `instructions-${medication.id}` && (
                            <div className="absolute z-50 mt-1 p-2 bg-white rounded-lg border border-orange-200 shadow-xl left-0">
                              <div className="flex flex-wrap gap-1 w-[220px]">
                                {instructionOptions.map((instruction) => (
                                  <button
                                    key={instruction}
                                    onClick={() => {
                                      const currentInstructions = medication.instructions || '';
                                      const newInstructions = currentInstructions 
                                        ? `${currentInstructions}, ${instruction}`
                                        : instruction;
                                      updateMedication(medication.id, 'instructions', newInstructions);
                                    }}
                                    className="px-2 py-1 text-xs bg-orange-50 border border-orange-300 rounded hover:bg-orange-100 text-orange-700 whitespace-nowrap"
                                  >
                                    {instruction}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 text-center">
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
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Pill className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No medications added yet. Click "Add Medication" button above to get started!</p>
          </div>
        )}

        {/* Save All Medications */}
        {prescriptionData.medications.length > 0 && (
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveOrdersFieldData('medications', prescriptionData.medications)}
              disabled={fieldSaveStatus['medications'] === 'saving'}
              className="h-8 text-xs"
            >
              {fieldSaveStatus['medications'] === 'saving' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
              {fieldSaveStatus['medications'] === 'saved' && <Check className="h-3 w-3 mr-1 text-green-600" />}
              {fieldSaveStatus['medications'] === 'saving' ? 'Saving...' : 
               fieldSaveStatus['medications'] === 'saved' ? 'Saved!' : 'Save All Medications'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Separate component for Investigations
  const InvestigationsField = () => {
    return (
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

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveOrdersFieldData('investigations', prescriptionData.orders.investigations)}
            disabled={fieldSaveStatus['investigations'] === 'saving'}
            className="h-7 text-xs"
          >
            {fieldSaveStatus['investigations'] === 'saving' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
            {fieldSaveStatus['investigations'] === 'saved' && <Check className="h-3 w-3 mr-1 text-green-600" />}
            {fieldSaveStatus['investigations'] === 'saving' ? 'Saving...' : 
             fieldSaveStatus['investigations'] === 'saved' ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  // Separate component for Procedures
  const ProceduresField = () => {
    return (
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

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveOrdersFieldData('procedures', prescriptionData.orders.procedures)}
            disabled={fieldSaveStatus['procedures'] === 'saving'}
            className="h-7 text-xs"
          >
            {fieldSaveStatus['procedures'] === 'saving' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
            {fieldSaveStatus['procedures'] === 'saved' && <Check className="h-3 w-3 mr-1 text-green-600" />}
            {fieldSaveStatus['procedures'] === 'saving' ? 'Saving...' : 
             fieldSaveStatus['procedures'] === 'saved' ? 'Saved!' : 'Save'}
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
                <div className="space-y-3">
                  <AdvancedSuggestionInput
                    data={getAllOptionsForField(fieldId)}
                    placeholder="Type symptoms or complaints... (comma to add multiple)"
                    onChange={handleChiefComplaintChange}
                    value={prescriptionData.chiefComplaint || ''}
                    onValueChange={(value) => setPrescriptionData(prev => ({ ...prev, chiefComplaint: value }))}
                    maxSuggestions={8}
                    allowCustom={true}
                    className="w-full"
                  />
                  
                  {/* Duration Input for Last Added Complaint */}
                  {showDurationInput && lastAddedComplaint && (
                    <div className="flex gap-2 items-end p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex-1">
                        <Label htmlFor="search-complaint-days" className="text-xs text-blue-700">
                          Add duration for "{lastAddedComplaint}"
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="search-complaint-days"
                            placeholder="Enter number"
                            value={complaintDays}
                            onChange={(e) => setComplaintDays(e.target.value)}
                            className="h-8 text-sm flex-1"
                            type="number"
                            min="1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const durationText = complaintDays ? `${complaintDays} ${durationUnit}` : '';
                                addDurationToLastComplaint(durationText);
                                setComplaintDays('');
                              }
                            }}
                          />
                          <Select value={durationUnit} onValueChange={setDurationUnit}>
                            <SelectTrigger className="h-8 w-24 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const durationText = complaintDays ? `${complaintDays} ${durationUnit}` : '';
                            addDurationToLastComplaint(durationText);
                            setComplaintDays('');
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 h-8"
                          disabled={!complaintDays.trim()}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Duration
                        </Button>
                        <Button
                          onClick={() => {
                            setShowDurationInput(false);
                            setLastAddedComplaint('');
                            setComplaintDays('');
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                content
              )}
            </div>
            
            {/* Quick Add Options integrated into main card */}
            {fieldId === 'chiefComplaint' && (
              <div className="mt-4">
                {/* Complaint Selection */}
                <div className="flex flex-wrap gap-2">
                  {predefinedOptions[fieldId as keyof typeof predefinedOptions]?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Add the complaint directly to the field
                        const currentValue = prescriptionData.chiefComplaint || '';
                        const newValue = currentValue ? `${currentValue}, ${option}` : option;
                        setPrescriptionData(prev => ({ ...prev, chiefComplaint: newValue }));
                        
                        // Set up for duration prompt (same as search behavior)
                        setLastAddedComplaint(option);
                        setShowDurationInput(true);
                        setComplaintDays('');
                        setDurationUnit('days');
                      }}
                      className="group flex items-center gap-1 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs hover:bg-gray-100 hover:border-gray-400 text-gray-700 transition-all duration-200"
                      title="Click to add complaint and prompt for duration"
                    >
                      <span className="font-medium">
                        {option}
                      </span>
                      <Plus className="h-3 w-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
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
              className="flex items-center gap-2"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
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

            {/* Investigations Section */}
            {renderCollapsibleSection(
              'investigations',
              'Investigations',
              <InvestigationsField />
            )}

            {/* Procedures Section */}
            {renderCollapsibleSection(
              'procedures',
              'Procedures',
              <ProceduresField />
            )}

            {/* Medications Section */}
            {renderCollapsibleSection(
              'medications',
              'Medications',
              <MedicationsField />
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
              <AttachmentField
                attachments={prescriptionData.attachments}
                onAttachmentsChange={(attachments) => setPrescriptionData(prev => ({
                  ...prev,
                  attachments
                }))}
              />
            )}

          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Prescription Preview</h2>
                  <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {/* Prescription Header */}
                <div className="text-center mb-6 border-b border-gray-200 pb-4">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">E-PRESCRIPTION</h1>
                  <div className="text-sm text-gray-600">
                    <p>Date: {new Date().toLocaleDateString()}</p>
                    <p>Patient ID: {patientId}</p>
                  </div>
                </div>

                {/* Vitals Section */}
                {fieldConfigs.find(f => f.id === 'vitals')?.enabled && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Vitals
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Blood Pressure:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.bloodPressure || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Temperature:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.temperature || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Heart Rate:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.heartRate || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Weight:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.weight || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Height:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.height || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">BMI:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.bmi || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">O2 Saturation:</span>
                        <p className="text-gray-900">{prescriptionData.vitals.oxygenSaturation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chief Complaint */}
                {fieldConfigs.find(f => f.id === 'chiefComplaint')?.enabled && prescriptionData.chiefComplaint && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Chief Complaint
                    </h3>
                    <p className="text-gray-700 bg-red-50 p-4 rounded-lg border border-red-200">
                      {prescriptionData.chiefComplaint}
                    </p>
                  </div>
                )}

                {/* History */}
                {fieldConfigs.find(f => f.id === 'history')?.enabled && prescriptionData.history && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      History
                    </h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      {prescriptionData.history}
                    </p>
                  </div>
                )}

                {/* Comorbidity */}
                {fieldConfigs.find(f => f.id === 'comorbidity')?.enabled && prescriptionData.comorbidity && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-pink-600" />
                      Comorbidity
                    </h3>
                    <p className="text-gray-700 bg-pink-50 p-4 rounded-lg border border-pink-200">
                      {prescriptionData.comorbidity}
                    </p>
                  </div>
                )}

                {/* Examination */}
                {fieldConfigs.find(f => f.id === 'examination')?.enabled && prescriptionData.examination && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-green-600" />
                      Examination
                    </h3>
                    <p className="text-gray-700 bg-green-50 p-4 rounded-lg border border-green-200">
                      {prescriptionData.examination}
                    </p>
                  </div>
                )}

                {/* Diagnosis */}
                {fieldConfigs.find(f => f.id === 'diagnosis')?.enabled && prescriptionData.diagnosis && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Diagnosis
                    </h3>
                    <p className="text-gray-700 bg-green-50 p-4 rounded-lg border border-green-200 font-medium">
                      {prescriptionData.diagnosis}
                    </p>
                  </div>
                )}

                {/* Orders */}
                {fieldConfigs.find(f => f.id === 'orders')?.enabled && (prescriptionData.orders.investigations.length > 0 || prescriptionData.orders.procedures.length > 0) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-purple-600" />
                      Orders
                    </h3>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      {prescriptionData.orders.investigations.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-900 mb-2">Investigations:</h4>
                          <ul className="list-disc list-inside text-gray-700">
                            {prescriptionData.orders.investigations.map((investigation, index) => (
                              <li key={index}>{investigation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {prescriptionData.orders.procedures.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Procedures:</h4>
                          <ul className="list-disc list-inside text-gray-700">
                            {prescriptionData.orders.procedures.map((procedure, index) => (
                              <li key={index}>{procedure}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {fieldConfigs.find(f => f.id === 'medications')?.enabled && prescriptionData.medications.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Pill className="h-5 w-5 text-blue-600" />
                      Medications
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-blue-200">
                              <th className="text-left py-2 px-3 font-medium text-gray-900">#</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">Medication</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">Dosage</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">Frequency</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">Duration</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prescriptionData.medications.map((medication, index) => (
                              <tr key={medication.id} className="border-b border-blue-100">
                                <td className="py-2 px-3 text-gray-700">{index + 1}</td>
                                <td className="py-2 px-3 text-gray-700 font-medium">{medication.name}</td>
                                <td className="py-2 px-3 text-gray-700">{medication.dosage}</td>
                                <td className="py-2 px-3 text-gray-700">{medication.frequency}</td>
                                <td className="py-2 px-3 text-gray-700">{medication.duration}</td>
                                <td className="py-2 px-3 text-gray-700">{medication.instructions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-pharmacological Advice */}
                {fieldConfigs.find(f => f.id === 'nonPharmacologicalAdvice')?.enabled && prescriptionData.nonPharmacologicalAdvice && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-orange-600" />
                      Non-pharmacological Advice
                    </h3>
                    <p className="text-gray-700 bg-orange-50 p-4 rounded-lg border border-orange-200">
                      {prescriptionData.nonPharmacologicalAdvice}
                    </p>
                  </div>
                )}

                {/* Follow-up */}
                {fieldConfigs.find(f => f.id === 'followUp')?.enabled && (prescriptionData.followUp.date || prescriptionData.followUp.referral || prescriptionData.followUp.notes) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      Follow-up & Referral
                    </h3>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      {prescriptionData.followUp.date && (
                        <p className="text-gray-700 mb-2"><span className="font-medium">Follow-up Date:</span> {prescriptionData.followUp.date}</p>
                      )}
                      {prescriptionData.followUp.referral && (
                        <p className="text-gray-700 mb-2"><span className="font-medium">Referral:</span> {prescriptionData.followUp.referral}</p>
                      )}
                      {prescriptionData.followUp.notes && (
                        <p className="text-gray-700"><span className="font-medium">Notes:</span> {prescriptionData.followUp.notes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Doctor Signature */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-600">Doctor's Signature</p>
                      <div className="mt-8 w-32 h-16 border-b-2 border-gray-400"></div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false);
                  // Trigger print function here
                  console.log('Print from preview modal');
                }}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPrescriptionPad;
