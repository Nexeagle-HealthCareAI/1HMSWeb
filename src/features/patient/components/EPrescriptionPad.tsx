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
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileImage,
  FileText,
  Heart,
  Pill,
  Plus,
  Shield,
  Stethoscope,
  Trash2,
  User
} from 'lucide-react';

// Fix: Add missing Select import for Immunizations section
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
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
  privateNotes: Array<{
    content: string;
    type?: string; // e.g. Clinical reasoning, DDx, Safety-net, etc.
    sharedWithStaff?: boolean;
    pinned?: boolean;
  }>;
  certificates: Array<{
    type: string;
    content: string;
    issuedDate: string;
    fromDate?: string;
    toDate?: string;
    fitnessStatus?: string;
    remarks?: string;
    category?: string;
  }>;
  immunizations: Array<{
    name: string;
    status: string;
    date: string;
    doseNumber?: string;
    scheduleLabel?: string;
    route?: string;
    site?: string;
    nextDueDate?: string;
    batchNumber?: string;
    manufacturer?: string;
    provider?: string;
    facility?: string;
    givenOutside?: boolean;
    givenOutsideWhere?: string;
    allergyNote?: string;
    aefi?: string[];
    aefiNote?: string;
    expanded?: boolean;
  }>;
  followUp: {
    followUpOn: string;
    followUpTimeSlot?: string;
    reason: string;
    patientInstructions?: string;
    mode?: 'InPerson' | 'Teleconsult' | 'Phone' | 'Video';
    reminderEnabled?: boolean;
    reminderChannels?: string[];
    reminderOffsetDays?: number;
    assignedDoctorId?: string;
    referralEnabled?: boolean;
    referral?: {
      referralType: 'Specialist' | 'Facility' | 'Diagnostic' | 'Emergency';
      referredTo: {
        specialty?: string;
        doctorId?: string;
        doctorName?: string;
        facilityId?: string;
        facilityName?: string;
      };
      reason: string;
      urgency: 'Routine' | 'Urgent' | 'Emergency';
      clinicalSummary?: string;
      requestedAction?: string;
      attachments?: string[];
    };
  };
  nonPharmacologicalAdvice: Array<{
    advice: string;
    category: string;
    frequency?: string;
    targetValue?: string;
    targetUnit?: string;
    durationValue?: string;
    durationUnit?: string;
    untilNextVisit?: boolean;
    notes?: string;
    review?: string;
  }>;
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
    privateNotes: [],
    certificates: [],
    immunizations: [],
    followUp: {
      followUpOn: '',
      followUpTimeSlot: '',
      reason: '',
      patientInstructions: '',
      mode: 'InPerson',
      reminderEnabled: false,
      reminderChannels: [],
      reminderOffsetDays: 1,
      assignedDoctorId: '',
      referralEnabled: false,
      referral: {
        referralType: 'Specialist',
        referredTo: {
          specialty: '',
          doctorId: '',
          doctorName: '',
          facilityId: '',
          facilityName: ''
        },
        reason: '',
        urgency: 'Routine',
        clinicalSummary: '',
        requestedAction: '',
        attachments: []
      }
    },
    nonPharmacologicalAdvice: [],
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
  const [chiefComplaintDurationValue, setChiefComplaintDurationValue] = useState('');
  const [chiefComplaintDurationUnit, setChiefComplaintDurationUnit] = useState<'day' | 'week' | 'month'>('day');
  const [pendingChiefComplaintLabel, setPendingChiefComplaintLabel] = useState<string | null>(null);
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

  const updateChiefComplaintLabel = (original: string, nextLabel: string) => {
    setSelectedChiefComplaints(prev => {
      const updated = prev.map(item => (item === original ? nextLabel : item));
      setPrescriptionData(p => ({ ...p, chiefComplaint: updated.join('; ') }));
      return updated;
    });
  };

  const formatChiefComplaintLabel = (label: string) => {
    const trimmed = label.trim();
    const duration = chiefComplaintDurationValue.trim();
    if (!duration) return trimmed;

    const pluralUnit = duration === '1' ? chiefComplaintDurationUnit : `${chiefComplaintDurationUnit}s`;
    return `${trimmed} since ${duration} ${pluralUnit}`;
  };

  const applyPendingChiefComplaintWithDuration = () => {
    if (!pendingChiefComplaintLabel) return;
    const duration = chiefComplaintDurationValue.trim();
    if (!duration) return;

    const formatted = formatChiefComplaintLabel(pendingChiefComplaintLabel);
    updateChiefComplaintLabel(pendingChiefComplaintLabel, formatted);
    setPendingChiefComplaintLabel(null);
    setChiefComplaintDurationValue('');
  };

  const skipPendingChiefComplaint = () => {
    setPendingChiefComplaintLabel(null);
    setChiefComplaintDurationValue('');
  };

  const commitChiefComplaintSelection = (label: string) => {
    addChiefComplaint(label);
    setChiefComplaintQuery('');
    setChiefComplaintOptions(chiefComplaintMock);
    setChiefComplaintActiveIndex(0);
    setChiefComplaintOpen(false);
    setPendingChiefComplaintLabel(label.trim());
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
    title: React.ReactNode,
    content: React.ReactNode
  ) => {
    const field = finalFieldConfigs.find(f => f.id === fieldId);
    if (!field?.enabled) return null;

    return (
      <Card key={fieldId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
          onClick={() => toggleSection(fieldId)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              {renderFieldIcon(fieldId)}
              <span>{title}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {collapsedSections[fieldId] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
        {!collapsedSections[fieldId] && (
          <CardContent className="bg-white dark:bg-gray-900">
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

  // Load saved configuration on mount
  // Field configurations are now loaded from API, no need for localStorage

  // Show loading state while fetching field preferences
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-6 text-gray-900 dark:text-gray-100">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Loading field preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-6 lg:px-8 gap-4">
        {/* Main Content */}
        <div className="flex-1 overflow-visible">
          <div className="w-full space-y-4 sm:space-y-5">

            {/* Vitals Section */}
            {renderCollapsibleSection(
              'vitals',
              'Vitals',
              <div className="bg-lime-50/60 dark:bg-lime-900/40 border border-lime-200 dark:border-lime-700 rounded-lg p-4 space-y-3">
                {isLoadingVitals && (
                  <div className="text-xs text-muted-foreground text-gray-600 dark:text-gray-300">Loading vitals...</div>
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
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Blood Pressure (BP)</Label>
                    </div>
                    <Input
                      placeholder="120/80"
                      value={prescriptionData.vitals.bloodPressure}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bloodPressure: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* Temperature */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Temperature (°F/°C)</Label>
                    </div>
                    <Input
                      placeholder="98.6°F"
                      value={prescriptionData.vitals.temperature}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, temperature: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-red-400 dark:focus:border-red-300 focus:ring-1 focus:ring-red-100 dark:focus:ring-red-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* Heart Rate */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Heart Rate (bpm)</Label>
                    </div>
                    <Input
                      placeholder="72 bpm"
                      value={prescriptionData.vitals.heartRate}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, heartRate: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-green-400 dark:focus:border-green-300 focus:ring-1 focus:ring-green-100 dark:focus:ring-green-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* O2 Saturation */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Oxygen Saturation (SpO₂)</Label>
                    </div>
                    <Input
                      placeholder="98%"
                      value={prescriptionData.vitals.oxygenSaturation}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, oxygenSaturation: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-purple-400 dark:focus:border-purple-300 focus:ring-1 focus:ring-purple-100 dark:focus:ring-purple-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* Weight */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Weight (kg)</Label>
                    </div>
                    <Input
                      placeholder="70 kg"
                      value={prescriptionData.vitals.weight}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, weight: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-100 dark:focus:ring-gray-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* Height */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Height (cm)</Label>
                    </div>
                    <Input
                      placeholder="170 cm"
                      value={prescriptionData.vitals.height}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, height: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-100 dark:focus:ring-gray-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* BMI */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">BMI (kg/m²)</Label>
                    </div>
                    <Input
                      placeholder="24.2"
                      value={prescriptionData.vitals.bmi}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, bmi: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-300 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                    <div className="text-[11px] mt-1 text-gray-600 dark:text-gray-300">
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
              <div className="space-y-3 bg-teal-50/60 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
                <div ref={chiefComplaintRootRef} className="space-y-2">
                  {selectedChiefComplaints.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedChiefComplaints.map(item => (
                        <div
                          key={item}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                            onClick={() => removeChiefComplaint(item)}
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {pendingChiefComplaintLabel && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                      <span className="font-medium">Add duration for "{pendingChiefComplaintLabel}"</span>
                      <Input
                        type="number"
                        min="0"
                        value={chiefComplaintDurationValue}
                        onChange={(e) => setChiefComplaintDurationValue(e.target.value)}
                        className="h-8 w-20 text-xs border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900/40 dark:bg-gray-900 dark:text-gray-100"
                        placeholder="3"
                      />
                      <select
                        value={chiefComplaintDurationUnit}
                        onChange={(e) => setChiefComplaintDurationUnit(e.target.value as 'day' | 'week' | 'month')}
                        className="h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                      >
                        <option value="day">day</option>
                        <option value="week">week</option>
                        <option value="month">month</option>
                      </select>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={applyPendingChiefComplaintWithDuration}
                        disabled={!chiefComplaintDurationValue.trim()}
                      >
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={skipPendingChiefComplaint}
                      >
                        Skip
                      </Button>
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
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 overflow-y-auto p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Personal</div>
                            <div className="flex flex-col gap-1">
                              {chiefComplaintOptions.filter(item => item.category === 'personal').map((item, idx) => {
                                const isActive = chiefComplaintActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'}`}
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
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase">General</div>
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
                                        className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'}`}
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
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">No general results</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Quick picks</div>
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
                              onClick={() => commitChiefComplaintSelection(item.label)}
                            >
                              {item.label}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                  {/* Save chief complaint button removed */}
                </div>
              </div>
            )}

            {/* History Section */}
            {renderCollapsibleSection(
              'history',
              'History',
              <div className="space-y-3 bg-orange-50/60 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
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

                {/* Save history button removed */}
              </div>
            )}

            {/* Comorbidity Section */}
            {renderCollapsibleSection(
              'comorbidity',
              'Comorbidity',
              <div className="space-y-3 bg-pink-50/60 dark:bg-pink-900/40 border border-pink-200 dark:border-pink-700 rounded-lg p-4">
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

                {/* Save comorbidity button removed */}
              </div>
            )}

            {/* Examination Section */}
            {renderCollapsibleSection(
              'examination',
              'Examination',
              <div className="space-y-3 bg-purple-50/60 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
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

                {/* Save examination button removed */}
              </div>
            )}

            {/* Diagnosis Section */}
            {renderCollapsibleSection(
              'diagnosis',
              'Diagnosis',
              <div className="space-y-3 bg-cyan-50/60 dark:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-700 rounded-lg p-4">
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

                {/* Save diagnosis button removed */}
              </div>
            )}

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigations / Procedures',
              <div className="space-y-6 bg-indigo-50/60 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
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

                  {/* Save investigations button removed */}
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

                  {/* Save procedures button removed */}
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
                    <div className="flex items-center justify-between border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 px-3 py-2">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Medications ({meds.length})</div>
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
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 px-4 py-6 text-center space-y-3">
                    <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">No medications yet</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Add the first medication to start building the plan.</div>
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
                    const summaryParts = [medication.name, medication.dosage, medication.route, medication.frequency]
                      .filter(Boolean)
                      .join(' · ');
                    const quickFrequencies = ['OD', 'BD', 'TDS', 'HS'];
                    const quickInstructions = ['After food', 'Before food', 'With water', 'At bedtime'];

                    return (
                      <div
                        key={medication.id}
                        className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 shadow-sm ${
                          isActive ? 'ring-2 ring-blue-200 dark:ring-blue-800/60 shadow-md' : ''
                        }`}
                        onClick={() => setActiveMedicationId(medication.id)}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 min-w-[32px] items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 px-2 font-semibold">
                                #{index + 1}
                              </span>
                              <span className="font-semibold">Medication</span>
                              {isActive && <span className="text-blue-600 dark:text-blue-300 font-medium">Active</span>}
                              {missingRequired && (
                                <span className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-[11px] font-semibold">
                                  Name + dose required
                                </span>
                              )}
                            </div>
                            {summaryParts && (
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[50%] text-right" title={summaryParts}>
                                {summaryParts}
                              </span>
                            )}
                          </div>
                          <div className="h-1 w-full rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20" />
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

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Quick frequency</span>
                          {quickFrequencies.map(freq => (
                            <Button
                              key={freq}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedication(medication.id, 'frequency', freq);
                                setActiveMedicationId(medication.id);
                              }}
                            >
                              {freq}
                            </Button>
                          ))}
                          <span className="font-semibold ml-2">Quick instructions</span>
                          {quickInstructions.map(instr => (
                            <Button
                              key={instr}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedication(medication.id, 'instructions', instr);
                                setActiveMedicationId(medication.id);
                              }}
                            >
                              {instr}
                            </Button>
                          ))}
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
              <div className="space-y-4">
                {(Array.isArray(prescriptionData.nonPharmacologicalAdvice) ? prescriptionData.nonPharmacologicalAdvice : []).map((entry, idx) => (
                  <Card key={idx} className="bg-green-50/60 dark:bg-green-900/40 border border-green-200 dark:border-green-700 shadow-sm p-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Advice / Instruction *</Label>
                        <Input
                          placeholder="e.g. Low salt diet, Walk 30 min daily"
                          value={entry.advice || ''}
                          onChange={e => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, advice: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Category *</Label>
                        <Select
                          value={entry.category || ''}
                          onValueChange={val => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, category: val };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                          <SelectContent>
                            <SelectItem value="Diet">Diet</SelectItem>
                            <SelectItem value="Exercise">Exercise</SelectItem>
                            <SelectItem value="Weight">Weight</SelectItem>
                            <SelectItem value="Sleep">Sleep</SelectItem>
                            <SelectItem value="Habits">Habits (tobacco/alcohol)</SelectItem>
                            <SelectItem value="Stress">Stress</SelectItem>
                            <SelectItem value="Physio">Physio & ergonomics</SelectItem>
                            <SelectItem value="Precautions">Precautions</SelectItem>
                            <SelectItem value="Disease-specific">Disease-specific</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Frequency / Target</Label>
                        <Input
                          placeholder="e.g. daily, after meals"
                          value={entry.frequency || ''}
                          onChange={e => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, frequency: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="Value"
                            value={entry.targetValue || ''}
                            onChange={e => {
                              const next = [...prescriptionData.nonPharmacologicalAdvice];
                              next[idx] = { ...entry, targetValue: e.target.value };
                              setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                            }}
                            className="h-8 text-xs w-20"
                          />
                          <Input
                            placeholder="Unit (e.g. min/day, L/day)"
                            value={entry.targetUnit || ''}
                            onChange={e => {
                              const next = [...prescriptionData.nonPharmacologicalAdvice];
                              next[idx] = { ...entry, targetUnit: e.target.value };
                              setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                            }}
                            className="h-8 text-xs w-28"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Duration</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Value"
                            value={entry.durationValue || ''}
                            onChange={e => {
                              const next = [...prescriptionData.nonPharmacologicalAdvice];
                              next[idx] = { ...entry, durationValue: e.target.value, untilNextVisit: false };
                              setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                            }}
                            className="h-8 text-xs w-20"
                          />
                          <Input
                            placeholder="Unit (e.g. days, weeks, months)"
                            value={entry.durationUnit || ''}
                            onChange={e => {
                              const next = [...prescriptionData.nonPharmacologicalAdvice];
                              next[idx] = { ...entry, durationUnit: e.target.value, untilNextVisit: false };
                              setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                            }}
                            className="h-8 text-xs w-28"
                          />
                          <label className="flex items-center gap-1 text-xs ml-2">
                            <input
                              type="checkbox"
                              checked={!!entry.untilNextVisit}
                              onChange={e => {
                                const next = [...prescriptionData.nonPharmacologicalAdvice];
                                next[idx] = { ...entry, untilNextVisit: e.target.checked, durationValue: '', durationUnit: '' };
                                setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                              }}
                            />
                            Until next visit
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-gray-600">Notes / Customization</Label>
                        <Input
                          placeholder="e.g. Avoid spicy food at night, Stop if dizziness"
                          value={entry.notes || ''}
                          onChange={e => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, notes: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-gray-600">Review / Next follow-up</Label>
                        <Input
                          placeholder="e.g. Review in 2 weeks"
                          value={entry.review || ''}
                          onChange={e => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, review: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-end justify-end md:col-span-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next.splice(idx, 1);
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 px-3 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-1 flex items-center gap-2"
                  onClick={() => {
                    const next = Array.isArray(prescriptionData.nonPharmacologicalAdvice) ? [...prescriptionData.nonPharmacologicalAdvice] : [];
                    next.push({ advice: '', category: '' });
                    setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Advice
                </Button>
              </div>
            )}

            {/* Private Notes Section */}
            {renderCollapsibleSection(
              'privateNotes',
              <span className="flex items-center gap-2">Private Notes <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold">Not printable</span></span>,
              <div className="space-y-4">
                {/* Quick chips/templates */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Clinical reasoning','DDx','Safety-net','Consent/Refusal','Follow-up plan'].map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const next = Array.isArray(prescriptionData.privateNotes) ? [...prescriptionData.privateNotes] : [];
                        next.push({ content: '', type, sharedWithStaff: false, pinned: false });
                        setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                      }}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                {(Array.isArray(prescriptionData.privateNotes) ? prescriptionData.privateNotes : []).map((note, idx) => (
                  <Card key={idx} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm p-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs text-gray-600">Type</Label>
                        <Select
                          value={note.type || ''}
                          onValueChange={val => {
                            const next = [...prescriptionData.privateNotes];
                            next[idx] = { ...note, type: val };
                            setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                          <SelectContent>
                            <SelectItem value="Clinical reasoning">Clinical reasoning</SelectItem>
                            <SelectItem value="DDx">DDx</SelectItem>
                            <SelectItem value="Safety-net">Safety-net</SelectItem>
                            <SelectItem value="Consent/Refusal">Consent/Refusal</SelectItem>
                            <SelectItem value="Follow-up plan">Follow-up plan</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs text-gray-600">Note (max 500 chars)</Label>
                        <Textarea
                          placeholder="Private note for doctor's reference..."
                          value={note.content || ''}
                          maxLength={500}
                          onChange={e => {
                            const next = [...prescriptionData.privateNotes];
                            next[idx] = { ...note, content: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                          }}
                          className="min-h-[40px] text-xs bg-white dark:bg-slate-900"
                        />
                        <div className="text-[10px] text-gray-500 text-right">{(note.content || '').length}/500</div>
                      </div>
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <Label className="text-xs text-gray-600">Share with staff</Label>
                        <input
                          type="checkbox"
                          checked={!!note.sharedWithStaff}
                          onChange={e => {
                            const next = [...prescriptionData.privateNotes];
                            next[idx] = { ...note, sharedWithStaff: e.target.checked };
                            setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                          }}
                        />
                        <span className="text-[10px] text-gray-500">Doctor-only by default</span>
                      </div>
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <Label className="text-xs text-gray-600">Pin for next visit</Label>
                        <input
                          type="checkbox"
                          checked={!!note.pinned}
                          onChange={e => {
                            const next = [...prescriptionData.privateNotes];
                            next[idx] = { ...note, pinned: e.target.checked };
                            setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                          }}
                        />
                        <span className="text-[10px] text-gray-500">Pinned notes show first next time</span>
                      </div>
                      {/* Timestamp and Author fields removed as requested */}
                      <div className="flex items-end justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = [...prescriptionData.privateNotes];
                            next.splice(idx, 1);
                            setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                          }}
                          className="h-8 px-3 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-1 flex items-center gap-2"
                  onClick={() => {
                    const next = Array.isArray(prescriptionData.privateNotes) ? [...prescriptionData.privateNotes] : [];
                    next.push({ content: '', type: '', sharedWithStaff: false, pinned: false });
                    setPrescriptionData(prev => ({ ...prev, privateNotes: next }));
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Private Note
                </Button>
              </div>
            )}

            {/* Certificates & Notes Section */}
            {renderCollapsibleSection(
              'certificates',
              'Certificates & Notes',
              <div className="space-y-4">
                {(Array.isArray(prescriptionData.certificates) ? prescriptionData.certificates : []).map((entry, idx) => (
                  <Card key={idx} className="bg-yellow-50/60 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-700 shadow-sm p-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                      {/* Must-have */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Type *</Label>
                        <Input
                          placeholder="e.g. Sick Leave, Fitness, Medical"
                          value={entry.type || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, type: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-gray-600">Content *</Label>
                        <Textarea
                          placeholder="Certificate or note content..."
                          value={entry.content || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, content: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="min-h-[40px] text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Issued date *</Label>
                        <Input
                          type="date"
                          value={entry.issuedDate || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, issuedDate: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      {/* Contextual */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">From date</Label>
                        <Input
                          type="date"
                          value={entry.fromDate || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, fromDate: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">To date</Label>
                        <Input
                          type="date"
                          value={entry.toDate || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, toDate: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Fitness status</Label>
                        <Input
                          placeholder="e.g. Fit, Unfit, Restricted"
                          value={entry.fitnessStatus || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, fitnessStatus: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      {/* Optional */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Remarks</Label>
                        <Input
                          placeholder="Remarks..."
                          value={entry.remarks || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, remarks: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Category</Label>
                        <Input
                          placeholder="e.g. Medical, Fitness, Other"
                          value={entry.category || ''}
                          onChange={e => {
                            const next = [...prescriptionData.certificates];
                            next[idx] = { ...entry, category: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 text-sm bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="flex items-end justify-end md:col-span-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = [...prescriptionData.certificates];
                            next.splice(idx, 1);
                            setPrescriptionData(prev => ({ ...prev, certificates: next }));
                          }}
                          className="h-9 px-3 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-1 flex items-center gap-2"
                  onClick={() => {
                    const next = Array.isArray(prescriptionData.certificates) ? [...prescriptionData.certificates] : [];
                    next.push({ type: '', content: '', issuedDate: '' });
                    setPrescriptionData(prev => ({ ...prev, certificates: next }));
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Certificate/Note
                </Button>
              </div>
            )}

            {/* Immunizations Section */}
            {fieldConfigs.find(f => f.id === 'immunizations' && f.enabled) &&
              renderCollapsibleSection(
                'immunizations',
                <span className="flex items-center gap-2">Immunizations</span>,
                <div className="space-y-4">
                  {/* Minimal grid: Vaccine | Status | Date | Dose | Next Due | Expand */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md">
                      <thead className="bg-blue-100 dark:bg-slate-800">
                        <tr>
                          <th className="p-2 font-semibold text-left">Vaccine</th>
                          <th className="p-2 font-semibold text-left">Status</th>
                          <th className="p-2 font-semibold text-left">Date</th>
                          <th className="p-2 font-semibold text-left">Dose</th>
                          <th className="p-2 font-semibold text-left">Next Due</th>
                          <th className="p-2 font-semibold text-left">More</th>
                          <th className="p-2 font-semibold text-left"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(prescriptionData.immunizations) ? prescriptionData.immunizations : []).map((entry, idx) => (
                          <React.Fragment key={idx}>
                            <tr className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800">
                              <td className="p-2">
                                <Input
                                  placeholder="e.g. Hepatitis B"
                                  value={entry.name || ''}
                                  onChange={e => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, name: e.target.value };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 text-xs bg-white dark:bg-slate-900"
                                />
                              </td>
                              <td className="p-2">
                                <Select
                                  value={entry.status || 'given'}
                                  onValueChange={val => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, status: val };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                                  <SelectContent>
                                    <SelectItem value="given">Given</SelectItem>
                                    <SelectItem value="advised">Advised</SelectItem>
                                    <SelectItem value="due">Due</SelectItem>
                                    <SelectItem value="missed">Missed</SelectItem>
                                    <SelectItem value="contraindicated">Contraindicated</SelectItem>
                                    <SelectItem value="refused">Refused</SelectItem>
                                    <SelectItem value="unknown">Unknown</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="date"
                                  value={entry.date || ''}
                                  onChange={e => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, date: e.target.value };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 text-xs bg-white dark:bg-slate-900"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  placeholder="Dose 1 / Booster"
                                  value={entry.doseNumber || ''}
                                  onChange={e => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, doseNumber: e.target.value };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 text-xs bg-white dark:bg-slate-900"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="date"
                                  value={entry.nextDueDate || ''}
                                  onChange={e => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, nextDueDate: e.target.value };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 text-xs bg-white dark:bg-slate-900"
                                />
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx].expanded = !next[idx].expanded;
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  title="Show more details"
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${entry.expanded ? 'rotate-180' : ''}`} />
                                </Button>
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const next = [...prescriptionData.immunizations];
                                    next.splice(idx, 1);
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 w-8 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                  title="Remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                            {entry.expanded && (
                              <tr className="bg-blue-50/40 dark:bg-slate-800/40">
                                <td colSpan={7} className="p-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Schedule label</Label>
                                      <Input
                                        placeholder="Primary / Booster / Catch-up"
                                        value={entry.scheduleLabel || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, scheduleLabel: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Route</Label>
                                      <Input
                                        placeholder="IM / SC / Oral / ID / IN"
                                        value={entry.route || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, route: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Site</Label>
                                      <Input
                                        placeholder="Left deltoid / Right deltoid / Thigh"
                                        value={entry.site || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, site: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Batch/Lot number</Label>
                                      <Input
                                        placeholder="Batch/Lot number"
                                        value={entry.batchNumber || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, batchNumber: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Manufacturer</Label>
                                      <Input
                                        placeholder="Manufacturer"
                                        value={entry.manufacturer || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, manufacturer: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Provider</Label>
                                      <Input
                                        placeholder="Staff/Doctor name"
                                        value={entry.provider || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, provider: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Facility</Label>
                                      <Input
                                        placeholder="Hospital/Clinic"
                                        value={entry.facility || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, facility: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <input
                                        type="checkbox"
                                        checked={!!entry.givenOutside}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, givenOutside: e.target.checked };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                      />
                                      <Label className="text-xs text-gray-600">Given outside</Label>
                                      {entry.givenOutside && (
                                        <Input
                                          placeholder="Where"
                                          value={entry.givenOutsideWhere || ''}
                                          onChange={e => {
                                            const next = [...prescriptionData.immunizations];
                                            next[idx] = { ...entry, givenOutsideWhere: e.target.value };
                                            setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                          }}
                                          className="h-8 text-xs bg-white dark:bg-slate-900 ml-2"
                                        />
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">Allergy/Contraindication note</Label>
                                      <Input
                                        placeholder="Reason or note"
                                        value={entry.allergyNote || ''}
                                        onChange={e => {
                                          const next = [...prescriptionData.immunizations];
                                          next[idx] = { ...entry, allergyNote: e.target.value };
                                          setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                        }}
                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-600">AEFI (Adverse Event)</Label>
                                      <div className="flex flex-wrap gap-2">
                                        {['Fever','Rash','Local swelling','Anaphylaxis','Other'].map(opt => (
                                          <label key={opt} className="flex items-center gap-1 text-xs">
                                            <input
                                              type="checkbox"
                                              checked={Array.isArray(entry.aefi) && entry.aefi.includes(opt)}
                                              onChange={e => {
                                                const next = [...prescriptionData.immunizations];
                                                let aefiArr = Array.isArray(entry.aefi) ? [...entry.aefi] : [];
                                                if (e.target.checked) {
                                                  aefiArr.push(opt);
                                                } else {
                                                  aefiArr = aefiArr.filter(x => x !== opt);
                                                }
                                                next[idx] = { ...entry, aefi: aefiArr };
                                                setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                              }}
                                            />
                                            {opt}
                                          </label>
                                        ))}
                                        <Input
                                          placeholder="AEFI note"
                                          value={entry.aefiNote || ''}
                                          onChange={e => {
                                            const next = [...prescriptionData.immunizations];
                                            next[idx] = { ...entry, aefiNote: e.target.value };
                                            setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                          }}
                                          className="h-8 text-xs bg-white dark:bg-slate-900 ml-2"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-1 flex items-center gap-2"
                    onClick={() => {
                      const next = Array.isArray(prescriptionData.immunizations) ? [...prescriptionData.immunizations] : [];
                      next.push({ name: '', status: 'given', date: '' });
                      setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add Vaccine
                  </Button>
                </div>
              )
            }

            {/* Follow-up & Referral Section */}
            {renderCollapsibleSection(
              'followUp',
              'Follow-up & Referral',
              <div className="space-y-6 bg-blue-50/60 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                {/* Follow-up Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Follow-up Date *</Label>
                    <Input
                      type="date"
                      value={prescriptionData.followUp.followUpOn}
                      onChange={e => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, followUpOn: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Time Slot</Label>
                    <Select
                      value={prescriptionData.followUp.followUpTimeSlot || 'Morning'}
                      onValueChange={val => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, followUpTimeSlot: val }
                      }))}
                    >
                      <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                      <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Mode</Label>
                    <Select
                      value={prescriptionData.followUp.mode || 'InPerson'}
                      onValueChange={val => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, mode: val as any }
                      }))}
                    >
                      <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                      <SelectContent>
                        <SelectItem value="InPerson">In Person</SelectItem>
                        <SelectItem value="Teleconsult">Teleconsult</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Purpose / What to review *</Label>
                    <Input
                      placeholder="e.g. BP check, Lab review, Wound dressing"
                      value={prescriptionData.followUp.reason}
                      onChange={e => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, reason: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Patient Instructions</Label>
                    <Input
                      placeholder="e.g. Bring BP log, Come fasting, Carry reports"
                      value={prescriptionData.followUp.patientInstructions}
                      onChange={e => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, patientInstructions: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Reminder</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        checked={!!prescriptionData.followUp.reminderEnabled}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, reminderEnabled: e.target.checked }
                        }))}
                      />
                      <span className="text-xs">Enable reminder</span>
                    </div>
                    {prescriptionData.followUp.reminderEnabled && (
                      <div className="flex flex-col gap-2 mt-2">
                        <Label className="text-xs text-gray-600">Channels</Label>
                        <div className="flex flex-wrap gap-2">
                          {['WhatsApp','SMS','Call'].map(channel => (
                            <label key={channel} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={Array.isArray(prescriptionData.followUp.reminderChannels) && prescriptionData.followUp.reminderChannels.includes(channel)}
                                onChange={e => {
                                  const next = Array.isArray(prescriptionData.followUp.reminderChannels) ? [...prescriptionData.followUp.reminderChannels] : [];
                                  if (e.target.checked) {
                                    next.push(channel);
                                  } else {
                                    const idx = next.indexOf(channel);
                                    if (idx > -1) next.splice(idx, 1);
                                  }
                                  setPrescriptionData(prev => ({
                                    ...prev,
                                    followUp: { ...prev.followUp, reminderChannels: next }
                                  }));
                                }}
                              />
                              {channel}
                            </label>
                          ))}
                        </div>
                        <Label className="text-xs text-gray-600 mt-2">Remind how many days before?</Label>
                        <Input
                          type="number"
                          min={0}
                          value={prescriptionData.followUp.reminderOffsetDays || 1}
                          onChange={e => setPrescriptionData(prev => ({
                            ...prev,
                            followUp: { ...prev.followUp, reminderOffsetDays: Number(e.target.value) }
                          }))}
                          className="h-8 text-sm w-24"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Assigned Doctor</Label>
                    <Input
                      placeholder="Doctor ID or name"
                      value={prescriptionData.followUp.assignedDoctorId || ''}
                      onChange={e => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, assignedDoctorId: e.target.value }
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {/* Referral Fields with enable radio */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-sm font-semibold">Referral (if any)</div>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="radio"
                        checked={!!prescriptionData.followUp.referralEnabled}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, referralEnabled: e.target.checked }
                        }))}
                      />
                      Enable Referral
                    </label>
                  </div>
                  {!!prescriptionData.followUp.referralEnabled && (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Referral Type *</Label>
                      <Select
                        value={prescriptionData.followUp.referral?.referralType || 'Specialist'}
                        onValueChange={val => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, referral: { ...prev.followUp.referral, referralType: val as any } }
                        }))}
                      >
                        <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                        <SelectContent>
                          <SelectItem value="Specialist">Specialist</SelectItem>
                          <SelectItem value="Facility">Facility</SelectItem>
                          <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Specialty</Label>
                      <Input
                        placeholder="e.g. Cardiology, Ortho"
                        value={prescriptionData.followUp.referral?.referredTo?.specialty || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: {
                            ...prev.followUp,
                            referral: {
                              ...prev.followUp.referral,
                              referredTo: { ...prev.followUp.referral?.referredTo, specialty: e.target.value }
                            }
                          }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Doctor Name</Label>
                      <Input
                        placeholder="Doctor name"
                        value={prescriptionData.followUp.referral?.referredTo?.doctorName || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: {
                            ...prev.followUp,
                            referral: {
                              ...prev.followUp.referral,
                              referredTo: { ...prev.followUp.referral?.referredTo, doctorName: e.target.value }
                            }
                          }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label className="text-xs text-gray-600">Facility Name</Label>
                      <Input
                        placeholder="Facility name"
                        value={prescriptionData.followUp.referral?.referredTo?.facilityName || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: {
                            ...prev.followUp,
                            referral: {
                              ...prev.followUp.referral,
                              referredTo: { ...prev.followUp.referral?.referredTo, facilityName: e.target.value }
                            }
                          }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Reason for Referral *</Label>
                      <Input
                        placeholder="e.g. Persistent chest pain, rule out cardiac cause"
                        value={prescriptionData.followUp.referral?.reason || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: {
                            ...prev.followUp,
                            referral: { ...prev.followUp.referral, reason: e.target.value }
                          }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Urgency *</Label>
                      <Select
                        value={prescriptionData.followUp.referral?.urgency || 'Routine'}
                        onValueChange={val => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, referral: { ...prev.followUp.referral, urgency: val as any } }
                        }))}
                      >
                        <SelectTrigger className="h-8 text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full" />
                        <SelectContent>
                          <SelectItem value="Routine">Routine</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs text-gray-600">Clinical Summary</Label>
                      <Textarea
                        placeholder="Key symptoms, exam, diagnosis, meds, allergies..."
                        value={prescriptionData.followUp.referral?.clinicalSummary || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, referral: { ...prev.followUp.referral, clinicalSummary: e.target.value } }
                        }))}
                        className="min-h-[40px] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Requested Action</Label>
                      <Input
                        placeholder="e.g. Evaluate for angiography, confirm diagnosis"
                        value={prescriptionData.followUp.referral?.requestedAction || ''}
                        onChange={e => setPrescriptionData(prev => ({
                          ...prev,
                          followUp: { ...prev.followUp, referral: { ...prev.followUp.referral, requestedAction: e.target.value } }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-gray-600">Attachments</Label>
                    <Textarea
                      placeholder="Report IDs, URLs, etc. (comma separated)"
                      value={Array.isArray(prescriptionData.followUp.referral?.attachments) ? prescriptionData.followUp.referral.attachments.join(', ') : ''}
                      onChange={e => setPrescriptionData(prev => ({
                        ...prev,
                        followUp: { ...prev.followUp, referral: { ...prev.followUp.referral, attachments: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }
                      }))}
                      className="min-h-[32px] text-sm"
                    />
                  </div>
                  </>
                  )}
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
