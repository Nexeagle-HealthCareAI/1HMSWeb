import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePrescriptionFieldConfig } from '@/features/prescription/hooks/usePrescriptionFieldConfig';
import { useAuthStore } from '@/store/authStore';
import { prescriptionFieldConfigApi } from '@/features/prescription/services/prescriptionFieldConfigApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
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
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { vitalsApi, PatientVitalsResponse } from '../services/vitalsApi';

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

// Normalize vitals response shape to the fields this component expects.
const normalizeVitals = (raw: any): PatientVitalsResponse => {
  // Accept top-level, nested, and differently-cased payloads
  const base = raw?.vitalsJson
    || raw?.vitals
    || raw?.Vitals
    || raw?.data?.vitalsJson
    || raw?.data?.vitals
    || raw?.data?.Vitals
    || raw?.data
    || raw
    || {};

  // Map common alternative keys (case-insensitive-ish)
  const bpObj = base.bp || base.Bp || base.bloodPressure || base.bpReading;
  const sys = base.bpSys ?? base.bpSystolic ?? base.sys ?? base.Sys ?? base.systolic ?? bpObj?.sys ?? bpObj?.Sys;
  const dia = base.bpDia ?? base.bpDiastolic ?? base.dia ?? base.Dia ?? base.diastolic ?? bpObj?.dia ?? bpObj?.Dia;
  const bp = sys !== undefined || dia !== undefined ? { sys, dia } : bpObj;

  return {
    bp,
    pulse: base.pulse ?? base.Pulse ?? base.heartRate ?? base.hr ?? base.pulseRate ?? undefined,
    tempC: base.tempC ?? base.TempC ?? base.temperatureC ?? base.temperature ?? base.temp ?? undefined,
    spo2: base.spo2 ?? base.Spo2 ?? base.oxygenSaturation ?? base.o2Sat ?? undefined,
    heightCm: base.heightCm ?? base.HeightCm ?? base.height ?? base.heightInCm ?? undefined,
    weightKg: base.weightKg ?? base.WeightKg ?? base.weight ?? base.weightInKg ?? undefined,
    bmi: base.bmi ?? base.Bmi ?? undefined,
  };
};

const calculateBmi = (weightKg: number, heightCm: number): number => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  const bmi = weightKg / (heightM * heightM);
  return Number.isFinite(bmi) ? Number(bmi.toFixed(1)) : 0;
};

const getBmiIndicator = (bmiValue: number) => {
  if (!bmiValue) return { label: 'Not available', color: 'text-gray-500' };
  if (bmiValue < 18.5) return { label: 'Underweight', color: 'text-amber-600' };
  if (bmiValue < 25) return { label: 'Normal range', color: 'text-green-600' };
  if (bmiValue < 30) return { label: 'Overweight', color: 'text-orange-600' };
  return { label: 'Obesity', color: 'text-red-600' };
};

const EPrescriptionPad: React.FC<EPrescriptionPadProps> = ({ prescriptionFieldPreferences }) => {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const { getDoctorId, getHospitalId, getUserId } = useAuthStore();
  const { toast } = useToast();
  const [apiPreferences, setApiPreferences] = useState<any>(null);
  const [isLoadingApiPreferences, setIsLoadingApiPreferences] = useState(false);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [hasFetchedVitals, setHasFetchedVitals] = useState(false);
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

  const safeDecode = (value: string | null) => {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const resolvedPatientId = safeDecode(searchParams.get('patientId')) || patientId || '';
  const resolvedAppointmentId = safeDecode(searchParams.get('appointmentId'));

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

  const loadVitals = useCallback(async () => {
    if (!resolvedPatientId || !resolvedAppointmentId) return;
    try {
      setIsLoadingVitals(true);
      const vitalsResponse = await vitalsApi.fetchVitals(resolvedPatientId, resolvedAppointmentId);
      const vitals = normalizeVitals(vitalsResponse);
      console.log('Vitals API raw response:', vitalsResponse);
      console.log('Vitals normalized:', vitals);

      if (vitals) {
        const hasAnyValue = Boolean(
          (vitals.bp && (vitals.bp.sys !== undefined || vitals.bp.dia !== undefined)) ||
          vitals.pulse !== undefined ||
          vitals.tempC !== undefined ||
          vitals.spo2 !== undefined ||
          vitals.heightCm !== undefined ||
          vitals.weightKg !== undefined ||
          vitals.bmi !== undefined
        );
        setPrescriptionData(prev => ({
          ...prev,
          vitals: {
            bloodPressure: vitals.bp ? `${vitals.bp.sys ?? ''}${vitals.bp.dia !== undefined ? `/${vitals.bp.dia}` : ''}` : '',
            heartRate: vitals.pulse !== undefined && vitals.pulse !== null ? String(vitals.pulse) : '',
            temperature: vitals.tempC !== undefined && vitals.tempC !== null ? String(vitals.tempC) : '',
            oxygenSaturation: vitals.spo2 !== undefined && vitals.spo2 !== null ? String(vitals.spo2) : '',
            height: vitals.heightCm !== undefined && vitals.heightCm !== null ? String(vitals.heightCm) : '',
            weight: vitals.weightKg !== undefined && vitals.weightKg !== null ? String(vitals.weightKg) : '',
            bmi: vitals.bmi !== undefined && vitals.bmi !== null ? String(vitals.bmi) : '',
          }
        }));
        setHasFetchedVitals(hasAnyValue);
      } else {
        setHasFetchedVitals(false);
      }
    } catch (error) {
      console.error('Error fetching vitals:', error);
      toast({
        title: 'Unable to load vitals',
        description: 'We could not fetch vitals for this visit. You can still enter them manually.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVitals(false);
    }
  }, [resolvedPatientId, resolvedAppointmentId, toast]);

  // Fetch vitals on entry
  useEffect(() => {
    loadVitals();
  }, [loadVitals]);

  const handleSaveVitals = async () => {
    if (!resolvedPatientId || !resolvedAppointmentId) {
      toast({
        title: 'Missing info',
        description: 'Patient or appointment is missing. Please reopen from the appointment flow.',
        variant: 'destructive',
      });
      return;
    }

    const parseBp = (bp: string) => {
      const [sysRaw, diaRaw] = (bp || '').split('/');
      const sys = Number(sysRaw);
      const dia = Number(diaRaw);
      return {
        sys: Number.isFinite(sys) ? sys : 0,
        dia: Number.isFinite(dia) ? dia : 0,
      };
    };

    const weightNum = Number(prescriptionData.vitals.weight) || 0;
    const heightNum = Number(prescriptionData.vitals.height) || 0;
    const computedBmi = calculateBmi(weightNum, heightNum);
    const bmiToUse = computedBmi > 0 ? computedBmi : Number(prescriptionData.vitals.bmi) || 0;

    if (computedBmi > 0 && String(computedBmi) !== prescriptionData.vitals.bmi) {
      setPrescriptionData(prev => ({
        ...prev,
        vitals: { ...prev.vitals, bmi: String(computedBmi) }
      }));
    }

    const payload = {
      appointmentId: resolvedAppointmentId,
      patientId: resolvedPatientId,
      vitalsJson: {
        bp: parseBp(prescriptionData.vitals.bloodPressure),
        pulse: Number(prescriptionData.vitals.heartRate) || 0,
        tempC: Number(prescriptionData.vitals.temperature) || 0,
        spo2: Number(prescriptionData.vitals.oxygenSaturation) || 0,
        heightCm: Number(prescriptionData.vitals.height) || 0,
        weightKg: Number(prescriptionData.vitals.weight) || 0,
        bmi: bmiToUse,
      },
      recordedBy: getDoctorId() || getUserId?.() || '',
    };

    try {
      setIsSavingVitals(true);
      await vitalsApi.saveVitals(payload);
      toast({
        title: 'Vitals saved',
        description: 'Vitals have been saved for this appointment.',
      });
      await loadVitals();
    } catch (error) {
      console.error('Error saving vitals:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save vitals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingVitals(false);
    }
  };

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
    className = ''
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
              {collapsedSections[fieldId] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
        {!collapsedSections[fieldId] && (
          <CardContent>
            {content}
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

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="w-full space-y-4">

            {/* Vitals Section */}
            {renderCollapsibleSection(
              'vitals',
              'Vitals',
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                {isLoadingVitals && (
                  <div className="text-xs text-muted-foreground">Loading vitals...</div>
                )}
                {!isLoadingVitals && hasFetchedVitals && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Vitals loaded from this visit</span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {/* Blood Pressure */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Blood Pressure (BP)</Label>
                    </div>
                    <Input
                      placeholder="120/80"
                      value={prescriptionData.vitals.bloodPressure}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bloodPressure: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* Temperature */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Temperature (°F/°C)</Label>
                    </div>
                    <Input
                      placeholder="98.6°F"
                      value={prescriptionData.vitals.temperature}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, temperature: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-red-400 focus:ring-1 focus:ring-red-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* Heart Rate */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Heart Rate (bpm)</Label>
                    </div>
                    <Input
                      placeholder="72 bpm"
                      value={prescriptionData.vitals.heartRate}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, heartRate: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* O2 Saturation */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Oxygen Saturation (SpO₂)</Label>
                    </div>
                    <Input
                      placeholder="98%"
                      value={prescriptionData.vitals.oxygenSaturation}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, oxygenSaturation: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* Weight */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Weight (kg)</Label>
                    </div>
                    <Input
                      placeholder="70 kg"
                      value={prescriptionData.vitals.weight}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, weight: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* Height */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">Height (cm)</Label>
                    </div>
                    <Input
                      placeholder="170 cm"
                      value={prescriptionData.vitals.height}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, height: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                  </div>

                  {/* BMI */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600">BMI (kg/m²)</Label>
                    </div>
                    <Input
                      placeholder="24.2"
                      value={prescriptionData.vitals.bmi}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bmi: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-100 placeholder:text-gray-400 placeholder:opacity-70"
                    />
                    <div className="text-[11px] mt-1 text-gray-600">
                      {(() => {
                        const bmiNum = Number(prescriptionData.vitals.bmi) || 0;
                        const indicator = getBmiIndicator(bmiNum);
                        return <span className={indicator.color}>{indicator.label}</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveVitals}
                    disabled={isSavingVitals}
                    className="h-8"
                  >
                    {isSavingVitals ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Save Vitals</span>
                      </div>
                    )}
                  </Button>
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
