import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { vitalsApi, PatientVitalsResponse } from '../services/vitalsApi';
import { chiefComplaintMock, filterChiefComplaints, ChiefComplaintItem } from '@/features/patient/services/chiefComplaintMock';
import { LookupItem } from './LookupMultiSelect';
import AttachmentsSection from './AttachmentsSection';


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
    route: string;
    frequency: string;
    timing: string;
    duration: string;
    durationUnit: string;
    saltName: string;
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

const historyLookupData: LookupItem[] = [
  { id: 'hist-1', name: 'Previous surgery', source: 'personal', shortDesc: 'Documented procedures' },
  { id: 'hist-2', name: 'Family history of diabetes', source: 'personal' },
  { id: 'hist-3', name: 'Smoking', source: 'general', shortDesc: 'Active smoker' },
  { id: 'hist-4', name: 'Alcohol use', source: 'general' },
  { id: 'hist-5', name: 'Past hospitalization', source: 'personal' },
];

const comorbidityLookupData: LookupItem[] = [
  { id: 'co-1', name: 'Hypertension', source: 'personal', usageCount: 42 },
  { id: 'co-2', name: 'Type 2 diabetes', source: 'personal', usageCount: 37 },
  { id: 'co-3', name: 'COPD', source: 'general' },
  { id: 'co-4', name: 'Hypothyroidism', source: 'general' },
  { id: 'co-5', name: 'Chronic kidney disease', source: 'general' },
];

const examinationLookupData: LookupItem[] = [
  { id: 'exam-1', name: 'Normal heart sounds', source: 'general' },
  { id: 'exam-2', name: 'Wheezing', source: 'general' },
  { id: 'exam-3', name: 'Pitting edema', source: 'general' },
  { id: 'exam-4', name: 'Abdominal tenderness', source: 'general' },
  { id: 'exam-5', name: 'Neurological exam normal', source: 'personal' },
];

const diagnosisLookupData: LookupItem[] = [
  { id: 'dx-1', name: 'Hypertension', source: 'general', usageCount: 120 },
  { id: 'dx-2', name: 'Type 2 diabetes mellitus', source: 'general', usageCount: 110 },
  { id: 'dx-3', name: 'Asthma', source: 'general' },
  { id: 'dx-4', name: 'Acute gastroenteritis', source: 'general' },
  { id: 'dx-5', name: 'Migraine', source: 'personal' },
  { id: 'dx-6', name: 'Low back pain', source: 'personal' },
];

const investigationLookupData: LookupItem[] = [
  { id: 'inv-1', name: 'Complete blood count', source: 'personal', usageCount: 42 },
  { id: 'inv-2', name: 'Lipid profile', source: 'personal', usageCount: 36 },
  { id: 'inv-3', name: 'ECG', source: 'personal', usageCount: 58 },
  { id: 'inv-4', name: 'Chest X-ray', source: 'general' },
  { id: 'inv-5', name: 'Liver function test', source: 'general' },
  { id: 'inv-6', name: 'Renal function test', source: 'general' },
];

const procedureLookupData: LookupItem[] = [
  { id: 'proc-1', name: 'Nebulization', source: 'personal', usageCount: 21 },
  { id: 'proc-2', name: 'Wound dressing', source: 'personal', usageCount: 14 },
  { id: 'proc-3', name: 'IV cannulation', source: 'personal' },
  { id: 'proc-4', name: 'Blood transfusion', source: 'general' },
  { id: 'proc-5', name: 'Lumbar puncture', source: 'general' },
  { id: 'proc-6', name: 'Ascitic tap', source: 'general' },
];

const medicationLookupData: LookupItem[] = [
  { id: 'med-1', name: 'Paracetamol 500 mg tablet', source: 'personal', shortDesc: 'Pain / fever' },
  { id: 'med-2', name: 'Ibuprofen 400 mg tablet', source: 'personal', shortDesc: 'NSAID' },
  { id: 'med-3', name: 'Pantoprazole 40 mg tablet', source: 'personal', shortDesc: 'PPI' },
  { id: 'med-4', name: 'Amoxicillin 500 mg capsule', source: 'general', shortDesc: 'Antibiotic' },
  { id: 'med-5', name: 'Azithromycin 500 mg tablet', source: 'general', shortDesc: 'Antibiotic' },
  { id: 'med-6', name: 'Cefixime 200 mg tablet', source: 'general', shortDesc: 'Antibiotic' },
  { id: 'med-7', name: 'Metformin 500 mg tablet', source: 'general', shortDesc: 'Diabetes' },
  { id: 'med-8', name: 'Amlodipine 5 mg tablet', source: 'general', shortDesc: 'Hypertension' },
  { id: 'med-9', name: 'Atorvastatin 10 mg tablet', source: 'general', shortDesc: 'Lipid-lowering' },
  { id: 'med-10', name: 'Salbutamol inhaler 100 mcg', source: 'general', shortDesc: 'Bronchodilator' },
];

const quickPicksBySection: Record<string, LookupItem[]> = {
  history: historyLookupData.filter((i) => i.source === 'personal'),
  comorbidity: comorbidityLookupData.filter((i) => i.source === 'personal'),
  examination: examinationLookupData.filter((i) => i.source === 'personal'),
  diagnosis: diagnosisLookupData.filter((i) => i.source === 'personal'),
  investigations: investigationLookupData.filter((i) => i.source === 'personal'),
  procedures: procedureLookupData.filter((i) => i.source === 'personal'),
};

const filterHistoryItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return historyLookupData;
  return historyLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterComorbidityItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return comorbidityLookupData;
  return comorbidityLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterExaminationItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return examinationLookupData;
  return examinationLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterDiagnosisItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return diagnosisLookupData;
  return diagnosisLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterInvestigationItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return investigationLookupData;
  return investigationLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterProcedureItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return procedureLookupData;
  return procedureLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const filterMedicationItems = (term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return medicationLookupData;
  return medicationLookupData.filter((item) => {
    const haystack = `${item.name || ''} ${item.shortDesc || ''}`.toLowerCase();
    return haystack.includes(query);
  });
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
  const resolvedPatientName = safeDecode(searchParams.get('patientName')) || '';

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
  const [chiefComplaintOptions, setChiefComplaintOptions] = useState<ChiefComplaintItem[]>(chiefComplaintMock);
  const [selectedChiefComplaints, setSelectedChiefComplaints] = useState<string[]>([]);
  const [chiefComplaintOpen, setChiefComplaintOpen] = useState(false);
  const [chiefComplaintQuery, setChiefComplaintQuery] = useState('');
  const [chiefComplaintActiveIndex, setChiefComplaintActiveIndex] = useState(0);
  const chiefComplaintInputRef = useRef<HTMLInputElement | null>(null);
  const chiefComplaintRootRef = useRef<HTMLDivElement | null>(null);

  const [historyOptions, setHistoryOptions] = useState<LookupItem[]>(historyLookupData);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyActiveIndex, setHistoryActiveIndex] = useState(0);
  const historyInputRef = useRef<HTMLInputElement | null>(null);
  const historyRootRef = useRef<HTMLDivElement | null>(null);
  const [comorbidityOptions, setComorbidityOptions] = useState<LookupItem[]>(comorbidityLookupData);
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [comorbidityOpen, setComorbidityOpen] = useState(false);
  const [comorbidityQuery, setComorbidityQuery] = useState('');
  const [comorbidityActiveIndex, setComorbidityActiveIndex] = useState(0);
  const comorbidityInputRef = useRef<HTMLInputElement | null>(null);
  const comorbidityRootRef = useRef<HTMLDivElement | null>(null);
  const [examinationOptions, setExaminationOptions] = useState<LookupItem[]>(examinationLookupData);
  const [selectedExaminations, setSelectedExaminations] = useState<string[]>([]);
  const [examinationOpen, setExaminationOpen] = useState(false);
  const [examinationQuery, setExaminationQuery] = useState('');
  const [examinationActiveIndex, setExaminationActiveIndex] = useState(0);
  const examinationInputRef = useRef<HTMLInputElement | null>(null);
  const examinationRootRef = useRef<HTMLDivElement | null>(null);
  const [diagnosisOptions, setDiagnosisOptions] = useState<LookupItem[]>(diagnosisLookupData);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [diagnosisActiveIndex, setDiagnosisActiveIndex] = useState(0);
  const diagnosisInputRef = useRef<HTMLInputElement | null>(null);
  const diagnosisRootRef = useRef<HTMLDivElement | null>(null);
  const [investigationOptions, setInvestigationOptions] = useState<LookupItem[]>(investigationLookupData);
  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([]);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [investigationQuery, setInvestigationQuery] = useState('');
  const [investigationActiveIndex, setInvestigationActiveIndex] = useState(0);
  const investigationInputRef = useRef<HTMLInputElement | null>(null);
  const investigationRootRef = useRef<HTMLDivElement | null>(null);
  const [procedureOptions, setProcedureOptions] = useState<LookupItem[]>(procedureLookupData);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [procedureActiveIndex, setProcedureActiveIndex] = useState(0);
  const procedureInputRef = useRef<HTMLInputElement | null>(null);
  const procedureRootRef = useRef<HTMLDivElement | null>(null);
  const [medicationOptions, setMedicationOptions] = useState<LookupItem[]>(medicationLookupData);
  const [medicationQuery, setMedicationQuery] = useState('');
  const [medicationOpenForId, setMedicationOpenForId] = useState<string | null>(null);
  const [medicationActiveIndex, setMedicationActiveIndex] = useState(0);
  const [activeMedicationId, setActiveMedicationId] = useState<string | null>(null);

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

  const handleSaveChiefComplaint = () => {
    const value = prescriptionData.chiefComplaint.trim();
    if (!value) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type a chief complaint first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Chief complaint saved',
      description: 'You can continue filling the prescription.',
    });
  };

  const addExaminationItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedExaminations(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({ ...p, examination: next.join('; ') }));
      return next;
    });
  };

  const commitExaminationSelection = (label: string) => {
    addExaminationItem(label);
    setExaminationQuery('');
    setExaminationOptions(examinationLookupData);
    setExaminationActiveIndex(0);
    setExaminationOpen(false);
    examinationInputRef.current?.focus();
  };

  const removeExaminationItem = (label: string) => {
    setSelectedExaminations(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, examination: next.join('; ') }));
      return next;
    });
  };

  const handleSaveExamination = () => {
    const value = prescriptionData.examination.trim();
    if (!value) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type examination items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Examination saved',
      description: 'Examination captured for this visit.',
    });
  };

  const addDiagnosisItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedDiagnoses(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({ ...p, diagnosis: next.join('; ') }));
      return next;
    });
  };

  const commitDiagnosisSelection = (label: string) => {
    addDiagnosisItem(label);
    setDiagnosisQuery('');
    setDiagnosisOptions(diagnosisLookupData);
    setDiagnosisActiveIndex(0);
    setDiagnosisOpen(false);
    diagnosisInputRef.current?.focus();
  };

  const removeDiagnosisItem = (label: string) => {
    setSelectedDiagnoses(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, diagnosis: next.join('; ') }));
      return next;
    });
  };

  const handleSaveDiagnosis = () => {
    const value = prescriptionData.diagnosis.trim();
    if (!value) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type diagnosis items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Diagnosis saved',
      description: 'Diagnosis captured for this visit.',
    });
  };

  const addComorbidityItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedComorbidities(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({ ...p, comorbidity: next.join('; ') }));
      return next;
    });
  };

  const commitComorbiditySelection = (label: string) => {
    addComorbidityItem(label);
    setComorbidityQuery('');
    setComorbidityOptions(comorbidityLookupData);
    setComorbidityActiveIndex(0);
    setComorbidityOpen(false);
    comorbidityInputRef.current?.focus();
  };

  const removeComorbidityItem = (label: string) => {
    setSelectedComorbidities(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, comorbidity: next.join('; ') }));
      return next;
    });
  };

  const handleSaveComorbidity = () => {
    const value = prescriptionData.comorbidity.trim();
    if (!value) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type comorbidity items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Comorbidity saved',
      description: 'Comorbidity captured for this visit.',
    });
  };

  const addHistoryItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedHistoryItems(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({ ...p, history: next.join('; ') }));
      return next;
    });
  };

  const commitHistorySelection = (label: string) => {
    addHistoryItem(label);
    setHistoryQuery('');
    setHistoryOptions(historyLookupData);
    setHistoryActiveIndex(0);
    setHistoryOpen(false);
    historyInputRef.current?.focus();
  };

  const removeHistoryItem = (label: string) => {
    setSelectedHistoryItems(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, history: next.join('; ') }));
      return next;
    });
  };

  const handleSaveHistory = () => {
    const value = prescriptionData.history.trim();
    if (!value) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type history items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'History saved',
      description: 'History captured for this visit.',
    });
  };

  const addChiefComplaint = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedChiefComplaints(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({ ...p, chiefComplaint: next.join('; ') }));
      return next;
    });
  };

  const commitChiefComplaintSelection = (label: string) => {
    addChiefComplaint(label);
    setChiefComplaintQuery('');
    setChiefComplaintOptions(chiefComplaintMock);
    setChiefComplaintActiveIndex(0);
    setChiefComplaintOpen(false);
    chiefComplaintInputRef.current?.focus();
  };

  const removeChiefComplaint = (label: string) => {
    setSelectedChiefComplaints(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, chiefComplaint: next.join('; ') }));
      return next;
    });
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!chiefComplaintRootRef.current) return;
      if (!chiefComplaintRootRef.current.contains(e.target as Node)) {
        setChiefComplaintOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!historyRootRef.current) return;
      if (!historyRootRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!comorbidityRootRef.current) return;
      if (!comorbidityRootRef.current.contains(e.target as Node)) {
        setComorbidityOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!examinationRootRef.current) return;
      if (!examinationRootRef.current.contains(e.target as Node)) {
        setExaminationOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!diagnosisRootRef.current) return;
      if (!diagnosisRootRef.current.contains(e.target as Node)) {
        setDiagnosisOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!investigationRootRef.current) return;
      if (!investigationRootRef.current.contains(e.target as Node)) {
        setInvestigationOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!procedureRootRef.current) return;
      if (!procedureRootRef.current.contains(e.target as Node)) {
        setProcedureOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

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

  const makeMedicationId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  const isMedicationValid = (med: { name: string; dosage: string }) => {
    return Boolean(med.name.trim() && med.dosage.trim());
  };

  const addMedication = (initial?: Partial<EPrescriptionData['medications'][number]>) => {
    const newId = makeMedicationId();
    setPrescriptionData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          id: newId,
          name: '',
          dosage: '',
          route: '',
          frequency: '',
          timing: '',
          duration: '',
          durationUnit: 'days',
          saltName: '',
          instructions: '',
          ...initial,
        }
      ]
    }));
    setActiveMedicationId(newId);
    return newId;
  };

  const removeMedication = (id: string) => {
    setPrescriptionData(prev => {
      const nextMeds = prev.medications.filter(med => med.id !== id);
      setActiveMedicationId(current => {
        if (current !== id) return current;
        return nextMeds[nextMeds.length - 1]?.id ?? null;
      });
      return {
        ...prev,
        medications: nextMeds,
      };
    });
  };

  const updateMedication = (id: string, field: keyof EPrescriptionData['medications'][number], value: string) => {
    setActiveMedicationId(id);
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const commitMedicationNameSelection = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateMedication(id, 'name', trimmed);
    setMedicationQuery(trimmed);
    setMedicationOptions(filterMedicationItems(trimmed));
    setMedicationOpenForId(null);
  };

  const addInvestigationItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedInvestigations(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({
        ...p,
        orders: {
          ...p.orders,
          investigations: next
        }
      }));
      return next;
    });
  };

  const commitInvestigationSelection = (label: string) => {
    addInvestigationItem(label);
    setInvestigationQuery('');
    setInvestigationOptions(investigationLookupData);
    setInvestigationActiveIndex(0);
    setInvestigationOpen(false);
    investigationInputRef.current?.focus();
  };

  const removeInvestigationItem = (label: string) => {
    setSelectedInvestigations(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({
        ...p,
        orders: {
          ...p.orders,
          investigations: next
        }
      }));
      return next;
    });
  };

  const handleSaveInvestigations = () => {
    const hasValue = prescriptionData.orders.investigations.some(item => item.trim());
    if (!hasValue) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type investigation items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Investigations saved',
      description: 'Investigations captured for this visit.',
    });
  };

  const addProcedureItem = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setSelectedProcedures(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setPrescriptionData(p => ({
        ...p,
        orders: {
          ...p.orders,
          procedures: next
        }
      }));
      return next;
    });
  };

  const commitProcedureSelection = (label: string) => {
    addProcedureItem(label);
    setProcedureQuery('');
    setProcedureOptions(procedureLookupData);
    setProcedureActiveIndex(0);
    setProcedureOpen(false);
    procedureInputRef.current?.focus();
  };

  const removeProcedureItem = (label: string) => {
    setSelectedProcedures(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({
        ...p,
        orders: {
          ...p.orders,
          procedures: next
        }
      }));
      return next;
    });
  };

  const handleSaveProcedures = () => {
    const hasValue = prescriptionData.orders.procedures.some(item => item.trim());
    if (!hasValue) {
      toast({
        title: 'Nothing to save',
        description: 'Please select or type procedure items first.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Procedures saved',
      description: 'Procedures captured for this visit.',
    });
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
                <div ref={chiefComplaintRootRef} className="space-y-2">
                  {selectedChiefComplaints.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedChiefComplaints.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800"
                            onClick={() => removeChiefComplaint(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      ref={chiefComplaintInputRef}
                      value={chiefComplaintQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setChiefComplaintQuery(val);
                        const next = val ? filterChiefComplaints(val) : chiefComplaintMock;
                        setChiefComplaintOptions(next);
                        setChiefComplaintActiveIndex(0);
                        setChiefComplaintOpen(true);
                      }}
                      onFocus={() => {
                        setChiefComplaintOpen(true);
                        setChiefComplaintOptions(chiefComplaintMock);
                        setChiefComplaintActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setChiefComplaintOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = chiefComplaintOptions.filter(item => item.category === 'personal');
                        const general = chiefComplaintOptions.filter(item => item.category === 'general');
                        const combined = [...personal, ...general];
                        const trimmed = (chiefComplaintQuery || '').trim();
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setChiefComplaintOpen(true);
                          setChiefComplaintActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setChiefComplaintActiveIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (combined[chiefComplaintActiveIndex]) {
                            e.preventDefault();
                            commitChiefComplaintSelection(combined[chiefComplaintActiveIndex].label);
                          } else if (trimmed) {
                            e.preventDefault();
                            commitChiefComplaintSelection(trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setChiefComplaintOpen(false);
                        }
                      }}
                      placeholder="Search or type the main reason for the visit..."
                      className="text-sm"
                    />

                    {chiefComplaintOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {chiefComplaintOptions.filter(item => item.category === 'personal').map((item, idx) => {
                                const isActive = chiefComplaintActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    onMouseEnter={() => setChiefComplaintActiveIndex(idx)}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      commitChiefComplaintSelection(item.label);
                                    }}
                                  >
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                              {chiefComplaintOptions.filter(item => item.category === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = chiefComplaintOptions.filter(item => item.category === 'personal').length;
                                return chiefComplaintOptions
                                  .filter(item => item.category === 'general')
                                  .map((item, idx) => {
                                    const globalIdx = personalCount + idx;
                                    const isActive = chiefComplaintActiveIndex === globalIdx;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        onMouseEnter={() => setChiefComplaintActiveIndex(globalIdx)}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          commitChiefComplaintSelection(item.label);
                                        }}
                                      >
                                        <span>{item.label}</span>
                                      </button>
                                    );
                                  });
                              })()}
                              {chiefComplaintOptions.filter(item => item.category === 'general').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {chiefComplaintOptions
                        .filter(item => item.category === 'personal')
                        .map(item => {
                          const isSelected = selectedChiefComplaints.includes(item.label);
                          return (
                            <Button
                              key={item.id}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                              onClick={() => addChiefComplaint(item.label)}
                            >
                              {item.label}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleSaveChiefComplaint}
                    >
                      Save chief complaint
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* History Section */}
            {renderCollapsibleSection(
              'history',
              'History',
              <div className="space-y-3">
                <div ref={historyRootRef} className="space-y-2">
                  {selectedHistoryItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedHistoryItems.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800"
                            onClick={() => removeHistoryItem(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      ref={historyInputRef}
                      value={historyQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHistoryQuery(val);
                        const next = val ? filterHistoryItems(val) : historyLookupData;
                        setHistoryOptions(next);
                        setHistoryActiveIndex(0);
                        setHistoryOpen(true);
                      }}
                      onFocus={() => {
                        setHistoryOpen(true);
                        setHistoryOptions(historyLookupData);
                        setHistoryActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setHistoryOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = historyOptions.filter(item => item.source === 'personal');
                        const general = historyOptions.filter(item => item.source === 'general');
                        const combined = [...personal, ...general];
                        const trimmed = (historyQuery || '').trim();
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHistoryOpen(true);
                          setHistoryActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHistoryActiveIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (combined[historyActiveIndex]) {
                            e.preventDefault();
                            commitHistorySelection(combined[historyActiveIndex].name);
                          } else if (trimmed) {
                            e.preventDefault();
                            commitHistorySelection(trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setHistoryOpen(false);
                        }
                      }}
                      placeholder="Search or type history items..."
                      className="text-sm"
                    />

                    {historyOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {historyOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                const isActive = historyActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    onMouseEnter={() => setHistoryActiveIndex(idx)}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      commitHistorySelection(item.name);
                                    }}
                                  >
                                    <span className="truncate">{item.name}</span>
                                    {item.usageCount !== undefined && (
                                      <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                              {historyOptions.filter(item => item.source === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = historyOptions.filter(item => item.source === 'personal').length;
                                return historyOptions
                                  .filter(item => item.source === 'general')
                                  .map((item, idx) => {
                                    const globalIdx = personalCount + idx;
                                    const isActive = historyActiveIndex === globalIdx;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        onMouseEnter={() => setHistoryActiveIndex(globalIdx)}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          commitHistorySelection(item.name);
                                        }}
                                      >
                                        <span className="truncate">{item.name}</span>
                                        {item.shortDesc && (
                                          <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                        )}
                                      </button>
                                    );
                                  });
                              })()}
                              {historyOptions.filter(item => item.source === 'general').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                  <div className="flex flex-wrap gap-2">
                    {quickPicksBySection.history.map(item => {
                      const isSelected = selectedHistoryItems.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                          onClick={() => addHistoryItem(item.name)}
                        >
                          {item.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleSaveHistory}
                  >
                    Save history
                  </Button>
                </div>
              </div>
            )}

            {/* Comorbidity Section */}
            {renderCollapsibleSection(
              'comorbidity',
              'Comorbidity',
              <div className="space-y-3">
                <div ref={comorbidityRootRef} className="space-y-2">
                  {selectedComorbidities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedComorbidities.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800"
                            onClick={() => removeComorbidityItem(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      ref={comorbidityInputRef}
                      value={comorbidityQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComorbidityQuery(val);
                        const next = val ? filterComorbidityItems(val) : comorbidityLookupData;
                        setComorbidityOptions(next);
                        setComorbidityActiveIndex(0);
                        setComorbidityOpen(true);
                      }}
                      onFocus={() => {
                        setComorbidityOpen(true);
                        setComorbidityOptions(comorbidityLookupData);
                        setComorbidityActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setComorbidityOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = comorbidityOptions.filter(item => item.source === 'personal');
                        const general = comorbidityOptions.filter(item => item.source === 'general');
                        const combined = [...personal, ...general];
                        const trimmed = (comorbidityQuery || '').trim();
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setComorbidityOpen(true);
                          setComorbidityActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setComorbidityActiveIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (combined[comorbidityActiveIndex]) {
                            e.preventDefault();
                            commitComorbiditySelection(combined[comorbidityActiveIndex].name);
                          } else if (trimmed) {
                            e.preventDefault();
                            commitComorbiditySelection(trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setComorbidityOpen(false);
                        }
                      }}
                      placeholder="Search or type comorbidity items..."
                      className="text-sm"
                    />

                    {comorbidityOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {comorbidityOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                const isActive = comorbidityActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    onMouseEnter={() => setComorbidityActiveIndex(idx)}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      commitComorbiditySelection(item.name);
                                    }}
                                  >
                                    <span className="truncate">{item.name}</span>
                                    {item.usageCount !== undefined && (
                                      <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                              {comorbidityOptions.filter(item => item.source === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = comorbidityOptions.filter(item => item.source === 'personal').length;
                                return comorbidityOptions
                                  .filter(item => item.source === 'general')
                                  .map((item, idx) => {
                                    const globalIdx = personalCount + idx;
                                    const isActive = comorbidityActiveIndex === globalIdx;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        onMouseEnter={() => setComorbidityActiveIndex(globalIdx)}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          commitComorbiditySelection(item.name);
                                        }}
                                      >
                                        <span className="truncate">{item.name}</span>
                                        {item.shortDesc && (
                                          <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                        )}
                                      </button>
                                    );
                                  });
                              })()}
                              {comorbidityOptions.filter(item => item.source === 'general').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                  <div className="flex flex-wrap gap-2">
                    {quickPicksBySection.comorbidity.map(item => {
                      const isSelected = selectedComorbidities.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                          onClick={() => addComorbidityItem(item.name)}
                        >
                          {item.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleSaveComorbidity}
                  >
                    Save comorbidity
                  </Button>
                </div>
              </div>
            )}

            {/* Examination Section */}
            {renderCollapsibleSection(
              'examination',
              'Examination',
              <div className="space-y-3">
                <div ref={examinationRootRef} className="space-y-2">
                  {selectedExaminations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedExaminations.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800"
                            onClick={() => removeExaminationItem(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      ref={examinationInputRef}
                      value={examinationQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExaminationQuery(val);
                        const next = val ? filterExaminationItems(val) : examinationLookupData;
                        setExaminationOptions(next);
                        setExaminationActiveIndex(0);
                        setExaminationOpen(true);
                      }}
                      onFocus={() => {
                        setExaminationOpen(true);
                        setExaminationOptions(examinationLookupData);
                        setExaminationActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setExaminationOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = examinationOptions.filter(item => item.source === 'personal');
                        const general = examinationOptions.filter(item => item.source === 'general');
                        const combined = [...personal, ...general];
                        const trimmed = (examinationQuery || '').trim();
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setExaminationOpen(true);
                          setExaminationActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setExaminationActiveIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (combined[examinationActiveIndex]) {
                            e.preventDefault();
                            commitExaminationSelection(combined[examinationActiveIndex].name);
                          } else if (trimmed) {
                            e.preventDefault();
                            commitExaminationSelection(trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setExaminationOpen(false);
                        }
                      }}
                      placeholder="Search or type examination findings..."
                      className="text-sm"
                    />

                    {examinationOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {examinationOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                const isActive = examinationActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    onMouseEnter={() => setExaminationActiveIndex(idx)}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      commitExaminationSelection(item.name);
                                    }}
                                  >
                                    <span className="truncate">{item.name}</span>
                                    {item.usageCount !== undefined && (
                                      <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                              {examinationOptions.filter(item => item.source === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = examinationOptions.filter(item => item.source === 'personal').length;
                                return examinationOptions
                                  .filter(item => item.source === 'general')
                                  .map((item, idx) => {
                                    const globalIdx = personalCount + idx;
                                    const isActive = examinationActiveIndex === globalIdx;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        onMouseEnter={() => setExaminationActiveIndex(globalIdx)}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          commitExaminationSelection(item.name);
                                        }}
                                      >
                                        <span className="truncate">{item.name}</span>
                                        {item.shortDesc && (
                                          <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                        )}
                                      </button>
                                    );
                                  });
                              })()}
                              {examinationOptions.filter(item => item.source === 'general').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                  <div className="flex flex-wrap gap-2">
                    {quickPicksBySection.examination.map(item => {
                      const isSelected = selectedExaminations.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                          onClick={() => addExaminationItem(item.name)}
                        >
                          {item.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleSaveExamination}
                  >
                    Save examination
                  </Button>
                </div>
              </div>
            )}

            {/* Diagnosis Section */}
            {renderCollapsibleSection(
              'diagnosis',
              'Diagnosis',
              <div className="space-y-3">
                <div ref={diagnosisRootRef} className="space-y-2">
                  {selectedDiagnoses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDiagnoses.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800"
                            onClick={() => removeDiagnosisItem(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      ref={diagnosisInputRef}
                      value={diagnosisQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDiagnosisQuery(val);
                        const next = val ? filterDiagnosisItems(val) : diagnosisLookupData;
                        setDiagnosisOptions(next);
                        setDiagnosisActiveIndex(0);
                        setDiagnosisOpen(true);
                      }}
                      onFocus={() => {
                        setDiagnosisOpen(true);
                        setDiagnosisOptions(diagnosisLookupData);
                        setDiagnosisActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setDiagnosisOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = diagnosisOptions.filter(item => item.source === 'personal');
                        const general = diagnosisOptions.filter(item => item.source === 'general');
                        const combined = [...personal, ...general];
                        const trimmed = (diagnosisQuery || '').trim();
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setDiagnosisOpen(true);
                          setDiagnosisActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setDiagnosisActiveIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          if (combined[diagnosisActiveIndex]) {
                            e.preventDefault();
                            commitDiagnosisSelection(combined[diagnosisActiveIndex].name);
                          } else if (trimmed) {
                            e.preventDefault();
                            commitDiagnosisSelection(trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setDiagnosisOpen(false);
                        }
                      }}
                      placeholder="Search or type diagnosis..."
                      className="text-sm"
                    />

                    {diagnosisOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {diagnosisOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                const isActive = diagnosisActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    onMouseEnter={() => setDiagnosisActiveIndex(idx)}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      commitDiagnosisSelection(item.name);
                                    }}
                                  >
                                    <span className="truncate">{item.name}</span>
                                    {item.usageCount !== undefined && (
                                      <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                              {diagnosisOptions.filter(item => item.source === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = diagnosisOptions.filter(item => item.source === 'personal').length;
                                return diagnosisOptions
                                  .filter(item => item.source === 'general')
                                  .map((item, idx) => {
                                    const globalIdx = personalCount + idx;
                                    const isActive = diagnosisActiveIndex === globalIdx;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        onMouseEnter={() => setDiagnosisActiveIndex(globalIdx)}
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          commitDiagnosisSelection(item.name);
                                        }}
                                      >
                                        <span className="truncate">{item.name}</span>
                                        {item.shortDesc && (
                                          <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                        )}
                                      </button>
                                    );
                                  });
                              })()}
                              {diagnosisOptions.filter(item => item.source === 'general').length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                  <div className="flex flex-wrap gap-2">
                    {quickPicksBySection.diagnosis.map(item => {
                      const isSelected = selectedDiagnoses.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                          onClick={() => addDiagnosisItem(item.name)}
                        >
                          {item.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleSaveDiagnosis}
                  >
                    Save diagnosis
                  </Button>
                </div>
              </div>
            )}

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigations / Procedures',
              <div className="space-y-6">
                {/* Investigations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Investigations</Label>
                  </div>

                  <div ref={investigationRootRef} className="space-y-2">
                    {selectedInvestigations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedInvestigations.map(item => (
                          <div
                            key={item}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-800"
                              onClick={() => removeInvestigationItem(item)}
                              aria-label={`Remove ${item}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <Input
                        ref={investigationInputRef}
                        value={investigationQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvestigationQuery(val);
                          const next = val ? filterInvestigationItems(val) : investigationLookupData;
                          setInvestigationOptions(next);
                          setInvestigationActiveIndex(0);
                          setInvestigationOpen(true);
                        }}
                        onFocus={() => {
                          setInvestigationOpen(true);
                          setInvestigationOptions(investigationLookupData);
                          setInvestigationActiveIndex(0);
                        }}
                        onBlur={() => setTimeout(() => setInvestigationOpen(false), 50)}
                        onKeyDown={(e) => {
                          const personal = investigationOptions.filter(item => item.source === 'personal');
                          const general = investigationOptions.filter(item => item.source === 'general');
                          const combined = [...personal, ...general];
                          const trimmed = (investigationQuery || '').trim();
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setInvestigationOpen(true);
                            setInvestigationActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setInvestigationActiveIndex(prev => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            if (combined[investigationActiveIndex]) {
                              e.preventDefault();
                              commitInvestigationSelection(combined[investigationActiveIndex].name);
                            } else if (trimmed) {
                              e.preventDefault();
                              commitInvestigationSelection(trimmed);
                            }
                          } else if (e.key === 'Escape') {
                            setInvestigationOpen(false);
                          }
                        }}
                        placeholder="Search or type investigations..."
                        className="text-sm"
                      />

                      {investigationOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                              <div className="flex flex-col gap-1">
                                {investigationOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                  const isActive = investigationActiveIndex === idx;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                      onMouseEnter={() => setInvestigationActiveIndex(idx)}
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        commitInvestigationSelection(item.name);
                                      }}
                                    >
                                      <span className="truncate">{item.name}</span>
                                      {item.usageCount !== undefined && (
                                        <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                      )}
                                    </button>
                                  );
                                })}
                                {investigationOptions.filter(item => item.source === 'personal').length === 0 && (
                                  <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const personalCount = investigationOptions.filter(item => item.source === 'personal').length;
                                  return investigationOptions
                                    .filter(item => item.source === 'general')
                                    .map((item, idx) => {
                                      const globalIdx = personalCount + idx;
                                      const isActive = investigationActiveIndex === globalIdx;
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                          onMouseEnter={() => setInvestigationActiveIndex(globalIdx)}
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            commitInvestigationSelection(item.name);
                                          }}
                                        >
                                          <span className="truncate">{item.name}</span>
                                          {item.shortDesc && (
                                            <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                          )}
                                        </button>
                                      );
                                    });
                                })()}
                                {investigationOptions.filter(item => item.source === 'general').length === 0 && (
                                  <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                    <div className="flex flex-wrap gap-2">
                      {quickPicksBySection.investigations.map(item => {
                        const isSelected = selectedInvestigations.includes(item.name);
                        return (
                          <Button
                            key={item.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                            onClick={() => addInvestigationItem(item.name)}
                          >
                            {item.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleSaveInvestigations}
                    >
                      Save investigations
                    </Button>
                  </div>
                </div>

                {/* Procedures */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Procedures</Label>
                  </div>

                  <div ref={procedureRootRef} className="space-y-2">
                    {selectedProcedures.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedProcedures.map(item => (
                          <div
                            key={item}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-800"
                              onClick={() => removeProcedureItem(item)}
                              aria-label={`Remove ${item}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <Input
                        ref={procedureInputRef}
                        value={procedureQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProcedureQuery(val);
                          const next = val ? filterProcedureItems(val) : procedureLookupData;
                          setProcedureOptions(next);
                          setProcedureActiveIndex(0);
                          setProcedureOpen(true);
                        }}
                        onFocus={() => {
                          setProcedureOpen(true);
                          setProcedureOptions(procedureLookupData);
                          setProcedureActiveIndex(0);
                        }}
                        onBlur={() => setTimeout(() => setProcedureOpen(false), 50)}
                        onKeyDown={(e) => {
                          const personal = procedureOptions.filter(item => item.source === 'personal');
                          const general = procedureOptions.filter(item => item.source === 'general');
                          const combined = [...personal, ...general];
                          const trimmed = (procedureQuery || '').trim();
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setProcedureOpen(true);
                            setProcedureActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setProcedureActiveIndex(prev => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            if (combined[procedureActiveIndex]) {
                              e.preventDefault();
                              commitProcedureSelection(combined[procedureActiveIndex].name);
                            } else if (trimmed) {
                              e.preventDefault();
                              commitProcedureSelection(trimmed);
                            }
                          } else if (e.key === 'Escape') {
                            setProcedureOpen(false);
                          }
                        }}
                        placeholder="Search or type procedures..."
                        className="text-sm"
                      />

                      {procedureOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                              <div className="flex flex-col gap-1">
                                {procedureOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                  const isActive = procedureActiveIndex === idx;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                      onMouseEnter={() => setProcedureActiveIndex(idx)}
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        commitProcedureSelection(item.name);
                                      }}
                                    >
                                      <span className="truncate">{item.name}</span>
                                      {item.usageCount !== undefined && (
                                        <span className="text-[11px] text-gray-500 ml-2">{item.usageCount}</span>
                                      )}
                                    </button>
                                  );
                                })}
                                {procedureOptions.filter(item => item.source === 'personal').length === 0 && (
                                  <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const personalCount = procedureOptions.filter(item => item.source === 'personal').length;
                                  return procedureOptions
                                    .filter(item => item.source === 'general')
                                    .map((item, idx) => {
                                      const globalIdx = personalCount + idx;
                                      const isActive = procedureActiveIndex === globalIdx;
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                          onMouseEnter={() => setProcedureActiveIndex(globalIdx)}
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            commitProcedureSelection(item.name);
                                          }}
                                        >
                                          <span className="truncate">{item.name}</span>
                                          {item.shortDesc && (
                                            <span className="text-[11px] text-gray-500 ml-2 truncate">{item.shortDesc}</span>
                                          )}
                                        </button>
                                      );
                                    });
                                })()}
                                {procedureOptions.filter(item => item.source === 'general').length === 0 && (
                                  <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Quick picks</div>
                    <div className="flex flex-wrap gap-2">
                      {quickPicksBySection.procedures.map(item => {
                        const isSelected = selectedProcedures.includes(item.name);
                        return (
                          <Button
                            key={item.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto min-h-8 text-xs md:text-sm rounded-full px-3 py-2"
                            onClick={() => addProcedureItem(item.name)}
                          >
                            {item.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleSaveProcedures}
                    >
                      Save procedures
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Medications Section */}
            {renderCollapsibleSection(
              'medications',
              'Medications',
              <div className="space-y-4">
                {(() => {
                  const meds = prescriptionData.medications;
                  const canAdd = meds.length === 0 || isMedicationValid(meds[meds.length - 1]);
                  return (
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg bg-white px-3 py-2">
                      <div className="text-sm font-semibold text-gray-700">Medications ({meds.length})</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addMedication()}
                        disabled={!canAdd}
                        className="h-9 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add medication
                      </Button>
                    </div>
                  );
                })()}

                {prescriptionData.medications.length === 0 && (
                  <div className="border border-dashed border-gray-300 rounded-lg bg-white px-4 py-6 text-center space-y-3">
                    <div className="text-sm text-gray-700 font-medium">No medications yet</div>
                    <div className="text-xs text-gray-500">Add the first medication to start building the plan.</div>
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        onClick={() => addMedication()}
                        className="h-9 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add first medication
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {prescriptionData.medications.map((medication, index) => {
                    const nameMissing = !medication.name.trim();
                    const doseMissing = !medication.dosage.trim();
                    const isActive = activeMedicationId === medication.id || (!activeMedicationId && index === prescriptionData.medications.length - 1);
                    const missingRequired = nameMissing || doseMissing;

                    return (
                      <div
                        key={medication.id}
                        className={`border border-gray-200 rounded-lg bg-white p-3 space-y-3 ${isActive ? 'ring-1 ring-blue-200' : ''}`}
                        onClick={() => setActiveMedicationId(medication.id)}
                      >
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="font-semibold">Medication {index + 1}</span>
                          <div className="flex items-center gap-2">
                            {missingRequired && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold">Missing required</span>}
                            {isActive && <span className="text-blue-600 font-medium">Active</span>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1.8fr,0.8fr,0.8fr,0.8fr,0.9fr,0.9fr] gap-3">
                          <div className="space-y-1 relative">
                            <Label className="text-xs text-gray-600">Name *</Label>
                            <Input
                              placeholder="e.g., Paracetamol"
                              value={medication.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateMedication(medication.id, 'name', val);
                                setMedicationQuery(val);
                                setMedicationOptions(filterMedicationItems(val));
                                setMedicationActiveIndex(0);
                                setMedicationOpenForId(medication.id);
                              }}
                              onFocus={() => {
                                setActiveMedicationId(medication.id);
                                setMedicationOpenForId(medication.id);
                                setMedicationOptions(filterMedicationItems(medication.name));
                                setMedicationQuery(medication.name);
                                setMedicationActiveIndex(0);
                              }}
                              onBlur={() => setTimeout(() => {
                                setMedicationOpenForId(current => current === medication.id ? null : current);
                              }, 50)}
                              onKeyDown={(e) => {
                                const personal = medicationOptions.filter(item => item.source === 'personal');
                                const general = medicationOptions.filter(item => item.source === 'general');
                                const combined = [...personal, ...general];
                                const trimmed = (medicationQuery || '').trim();
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setMedicationOpenForId(medication.id);
                                  setMedicationActiveIndex(prev => Math.min(prev + 1, Math.max(0, combined.length - 1)));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setMedicationActiveIndex(prev => Math.max(prev - 1, 0));
                                } else if (e.key === 'Enter') {
                                  if (combined[medicationActiveIndex]) {
                                    e.preventDefault();
                                    commitMedicationNameSelection(medication.id, combined[medicationActiveIndex].name);
                                  } else if (trimmed) {
                                    e.preventDefault();
                                    commitMedicationNameSelection(medication.id, trimmed);
                                  }
                                } else if (e.key === 'Escape') {
                                  setMedicationOpenForId(null);
                                }
                              }}
                              className="h-9 text-sm"
                            />
                            {nameMissing && <div className="text-[11px] text-red-600">Name is required</div>}
                            {medicationOpenForId === medication.id && (
                              <div className="absolute left-0 z-10 mt-1 w-full md:w-[640px] max-w-[90vw] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                                {(() => {
                                  const personal = medicationOptions.filter(item => item.source === 'personal');
                                  const general = medicationOptions.filter(item => item.source === 'general');
                                  const personalCount = personal.length;
                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
                                        <div className="flex flex-col gap-1">
                                          {personal.map((item, idx) => {
                                            const isActive = medicationActiveIndex === idx;
                                            return (
                                              <button
                                                key={item.id}
                                                type="button"
                                                className={`flex flex-col items-start w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                onMouseEnter={() => setMedicationActiveIndex(idx)}
                                                onMouseDown={(event) => {
                                                  event.preventDefault();
                                                  commitMedicationNameSelection(medication.id, item.name);
                                                }}
                                              >
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                {item.shortDesc && <span className="text-[11px] text-gray-500">{item.shortDesc}</span>}
                                              </button>
                                            );
                                          })}
                                          {personal.length === 0 && (
                                            <div className="text-xs text-gray-500 px-3 py-2">No personal results</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
                                        <div className="flex flex-col gap-1">
                                          {general.map((item, idx) => {
                                            const globalIdx = personalCount + idx;
                                            const isActive = medicationActiveIndex === globalIdx;
                                            return (
                                              <button
                                                key={item.id}
                                                type="button"
                                                className={`flex flex-col items-start w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                onMouseEnter={() => setMedicationActiveIndex(globalIdx)}
                                                onMouseDown={(event) => {
                                                  event.preventDefault();
                                                  commitMedicationNameSelection(medication.id, item.name);
                                                }}
                                              >
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                {item.shortDesc && <span className="text-[11px] text-gray-500">{item.shortDesc}</span>}
                                              </button>
                                            );
                                          })}
                                          {general.length === 0 && (
                                            <div className="text-xs text-gray-500 px-3 py-2">No general results</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {medicationOptions.length === 0 && (
                                  <div className="text-xs text-gray-500 px-3 py-2">No matches</div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Dosage *</Label>
                            <Input
                              placeholder="e.g., 500 mg"
                              value={medication.dosage}
                              onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                            {doseMissing && <div className="text-[11px] text-red-600">Dosage is required</div>}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Route</Label>
                            <Input
                              placeholder="Oral / IV / IM / SC / Topical"
                              value={medication.route}
                              onChange={(e) => updateMedication(medication.id, 'route', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Frequency</Label>
                            <Input
                              placeholder="e.g., BD, TDS"
                              value={medication.frequency}
                              onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Duration</Label>
                            <div className="flex">
                              <Input
                                placeholder="e.g., 5"
                                value={medication.duration}
                                onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                                onFocus={() => setActiveMedicationId(medication.id)}
                                className="h-9 text-sm rounded-r-none focus:z-10"
                              />
                              <select
                                value={medication.durationUnit || 'days'}
                                onChange={(e) => updateMedication(medication.id, 'durationUnit', e.target.value)}
                                onFocus={() => setActiveMedicationId(medication.id)}
                                className="h-9 text-sm border border-gray-200 rounded-l-none rounded-r-md px-2 text-gray-700 bg-white -ml-px focus:z-10"
                              >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Instructions</Label>
                            <Input
                              placeholder="e.g., After food"
                              value={medication.instructions}
                              onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Salt name</Label>
                            <Input
                              placeholder="e.g., Paracetamol + Caffeine"
                              value={medication.saltName}
                              onChange={(e) => updateMedication(medication.id, 'saltName', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="flex items-end justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMedication(medication.id)}
                              className="h-9 px-3 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                <div className="md:w-1/2">
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
                  <p className="text-[11px] text-gray-500 mt-1">Specify the specialist to refer to, and include specialty, urgency, and any key notes.</p>
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {renderCollapsibleSection(
              'attachments',
              'Attachments',
              <AttachmentsSection
                attachments={prescriptionData.attachments}
                onChange={(next) => setPrescriptionData(prev => ({ ...prev, attachments: next }))}
                patientId={resolvedPatientId}
                patientName={resolvedPatientName}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EPrescriptionPad;
