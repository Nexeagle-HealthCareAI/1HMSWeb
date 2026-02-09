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
  Cloud,
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
import { patientProfileApi, PatientProfileData } from '../services/patientProfileApi';

import { LookupItem } from './LookupMultiSelect';

import { personalizedDataApi, PersonalizedLookupType } from '@/features/prescription/services/personalizedDataApi';
import { eprescriptionApi, LookupData, EPrescriptionDraftReq, MedicineSearchItem } from '../services/eprescriptionApi';
import { buildPreviewFromRequest } from '@/components/shared/prescription-preview/services/prescriptionPreviewService';
import AttachmentsSection from './AttachmentsSection';
import { SelectValue } from '@radix-ui/react-select';
// @ts-ignore
import certificationTemplates from '../mockCertificationTemplates.json';


interface EPrescriptionData {
  vitals: {
    bloodPressure: string;
    temperature: string;
    heartRate: string;
    weight: string;
    height: string;
    bmi: string;
    oxygenSaturation: string;
    respiratoryRate: string;
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
    reason: string;
    patientInstructions?: string;
    referralEnabled?: boolean;
    referral?: {
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
    attachments: string[];
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
    isBold?: boolean;
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
    { id: 'orders', label: 'Orders: Investigation/Procedures & Treatment Plan' },
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
      const val = preferences.certificates !== undefined ? preferences.certificates : preferences.certificatesAndNotes;
      return {
        ...field,
        enabled: val !== undefined ? Boolean(val) : true
      };
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

// Mock data to fix "Cannot find name 'medicationLookupData'" error
const medicationLookupData: any[] = [];

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
    respiratoryRate: base.respiratoryRate ?? base.RespiratoryRate ?? base.rr ?? undefined,
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
  if (!bmiValue) return { label: 'Not available', color: 'text-gray-500', bg: 'bg-gray-100' };
  if (bmiValue < 16.0) return { label: 'Severe thinness', color: 'text-red-700', bg: 'bg-red-100' };
  if (bmiValue < 17.0) return { label: 'Moderate thinness', color: 'text-orange-600', bg: 'bg-orange-100' };
  if (bmiValue < 18.5) return { label: 'Mild thinness', color: 'text-amber-600', bg: 'bg-amber-100' };
  if (bmiValue < 25.0) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
  if (bmiValue < 30.0) return { label: 'Overweight', color: 'text-amber-700', bg: 'bg-amber-100' };
  if (bmiValue < 35.0) return { label: 'Obesity Class I', color: 'text-orange-700', bg: 'bg-orange-100' };
  if (bmiValue < 40.0) return { label: 'Obesity Class II', color: 'text-red-600', bg: 'bg-red-100' };
  return { label: 'Obesity Class III', color: 'text-red-800', bg: 'bg-red-200' };
};

const getBpIndicator = (sys: number, dia: number) => {
  if (!sys || !dia) return null;

  // Prioritize typical hypertension grades (Highest severity first)
  if (sys >= 180 || dia >= 120) return { label: 'Very high (Crisis)', color: 'text-red-700', bg: 'bg-red-100' };
  if (sys >= 140 || dia >= 90) return { label: 'High (Hypertension)', color: 'text-red-600', bg: 'bg-red-100' };
  if (sys >= 130 || dia >= 85) return { label: 'High-normal', color: 'text-orange-600', bg: 'bg-orange-100' };

  // "Normal" range: 120-129 / 80-84
  if ((sys >= 120 && sys <= 129) || (dia >= 80 && dia <= 84)) return { label: 'Normal', color: 'text-yellow-600', bg: 'bg-yellow-100' };

  // Explicit Low check (Hypotension) - checked before Optimal to catch low values
  if (sys < 90 || dia < 60) return { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-100' };

  // Optimal: < 120 AND < 80 (and not low)
  if (sys < 120 && dia < 80) return { label: 'Optimal', color: 'text-green-600', bg: 'bg-green-100' };

  return { label: 'Variable', color: 'text-gray-500', bg: 'bg-gray-100' };
};

const AutoSaveHandler: React.FC<{
  prescriptionData: EPrescriptionData;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  hospitalId: string;
  userId: string;
  onSaveSuccess?: () => void;
  draftPrescriptionId: string | null;
  onSectionStatusChange?: (section: string, status: 'saving' | 'saved' | 'error') => void;
}> = ({ prescriptionData, patientId, appointmentId, doctorId, hospitalId, userId, draftPrescriptionId, onSaveSuccess, onSectionStatusChange }) => {
  // Store the last saved JSON strings for each section
  const lastSavedRefs = useRef<{ [key: string]: string }>({});
  const initialized = useRef(false);

  useEffect(() => {
    // Initialize default reference with CURRENT prescriptionData on first run
    if (!initialized.current) {
      lastSavedRefs.current = {
        vitalsJson: JSON.stringify({
          bp: (() => {
            const [sys, dia] = (prescriptionData.vitals.bloodPressure || '').split('/').map(Number);
            return { sys: sys || 0, dia: dia || 0 };
          })(),
          pulse: Number(prescriptionData.vitals.heartRate) || 0,
          tempC: Number(prescriptionData.vitals.temperature) || 0,
          spo2: Number(prescriptionData.vitals.oxygenSaturation) || 0,
          heightCm: Number(prescriptionData.vitals.height) || 0,
          weightKg: Number(prescriptionData.vitals.weight) || 0,
          bmi: Number(prescriptionData.vitals.bmi) || 0,
          respiratoryRate: Number(prescriptionData.vitals.respiratoryRate) || 0,
        }),
        chiefComplaint: JSON.stringify(prescriptionData.chiefComplaint),
        history: JSON.stringify(prescriptionData.history),
        comorbidity: JSON.stringify(prescriptionData.comorbidity),
        examination: JSON.stringify(prescriptionData.examination),
        diagnosis: JSON.stringify(prescriptionData.diagnosis),
        orders: JSON.stringify({
          investigations: prescriptionData.orders.investigations,
          procedures: prescriptionData.orders.procedures
        }),
        medications: JSON.stringify(prescriptionData.medications.map(m => ({
          drugName: m.name,
          dose: m.dosage,
          route: m.route,
          frequency: m.frequency,
          duration: m.duration ? `${m.duration} ${m.durationUnit || ''}`.trim() : '',
          instructions: m.instructions,
          saltName: m.saltName,
        }))),
        nonPharmacologicalAdvice: JSON.stringify(prescriptionData.nonPharmacologicalAdvice.map(a => ({
          advice: a.advice,
          duration: a.durationValue ? `${a.durationValue} ${a.durationUnit || ''}`.trim() : '',
          notes: a.notes || '',
        }))),
        privateNotes: JSON.stringify((prescriptionData.privateNotes || []).map(n => n.content).join('\n')),
        certificates: JSON.stringify((prescriptionData.certificates && prescriptionData.certificates.length > 0) ? prescriptionData.certificates[0] : { type: "", content: "", issuedDate: "" }),
        followUp: JSON.stringify({
          followUpOn: prescriptionData.followUp.followUpOn,
          reason: {
            reason: prescriptionData.followUp.reason,
            patientInstructions: prescriptionData.followUp.patientInstructions || ''
          },
          referral: {
            referredTo: {
              specialty: prescriptionData.followUp.referral?.referredTo?.specialty || '',
              doctorName: prescriptionData.followUp.referral?.referredTo?.doctorName || '',
              referralEnabled: prescriptionData.followUp.referralEnabled || false
            },
            clinicalSummary: prescriptionData.followUp.referral?.clinicalSummary || ''
          }
        }),
        immunizations: JSON.stringify((prescriptionData.immunizations || []).map(i => ({
          name: i.name,
          status: i.status,
          date: i.date,
          nextDueDate: i.nextDueDate || '',
          doseNumber: Number(i.doseNumber) || 0,
          remarks: '',
        }))),
      };
      initialized.current = true;
    }

    if (!patientId || !appointmentId) return;

    const timeoutId = setTimeout(async () => {
      try {
        const payload: Partial<EPrescriptionDraftReq> = {
          // Use draftPrescriptionId if available, otherwise null (server will create new)
          prescriptionId: draftPrescriptionId || null,
          appointmentId,
          patientId,
          doctorId,
          hospitalId,
          loggedInUserName: userId || 'System',
        };

        const currentSections: { [key: string]: any } = {
          vitalsJson: {
            bp: (() => {
              const [sys, dia] = (prescriptionData.vitals.bloodPressure || '').split('/').map(Number);
              return { sys: sys || 0, dia: dia || 0 };
            })(),
            pulse: Number(prescriptionData.vitals.heartRate) || 0,
            tempC: Number(prescriptionData.vitals.temperature) || 0,
            spo2: Number(prescriptionData.vitals.oxygenSaturation) || 0,
            heightCm: Number(prescriptionData.vitals.height) || 0,
            weightKg: Number(prescriptionData.vitals.weight) || 0,
            bmi: Number(prescriptionData.vitals.bmi) || 0,
            respiratoryRate: Number(prescriptionData.vitals.respiratoryRate) || 0,
          },
          chiefComplaint: prescriptionData.chiefComplaint,
          history: prescriptionData.history,
          comorbidity: prescriptionData.comorbidity,
          examination: prescriptionData.examination,
          diagnosis: prescriptionData.diagnosis,
          orders: {
            investigations: prescriptionData.orders.investigations,
            procedures: prescriptionData.orders.procedures,
          },
          medications: prescriptionData.medications.map(m => ({
            drugName: m.name,
            dose: m.dosage,
            route: m.route,
            frequency: m.frequency,
            duration: m.duration ? `${m.duration} ${m.durationUnit || ''}`.trim() : '',
            instructions: m.instructions,
            saltName: m.saltName,
          })),
          nonPharmacologicalAdvice: prescriptionData.nonPharmacologicalAdvice.map(a => ({
            advice: a.advice,
            duration: a.durationValue ? `${a.durationValue} ${a.durationUnit || ''}`.trim() : '',
            notes: a.notes || '',
          })),
          privateNotes: (prescriptionData.privateNotes || []).map(n => n.content).join('\n'),
          certificates: (prescriptionData.certificates && prescriptionData.certificates.length > 0) ? prescriptionData.certificates[0] : { type: "", content: "", issuedDate: "" },
          followUp: {
            followUpOn: prescriptionData.followUp.followUpOn,
            reason: {
              reason: prescriptionData.followUp.reason,
              patientInstructions: prescriptionData.followUp.patientInstructions || '',
            },
            referral: {
              referredTo: {
                specialty: prescriptionData.followUp.referral?.referredTo?.specialty || '',
                doctorName: prescriptionData.followUp.referral?.referredTo?.doctorName || '',
                referralEnabled: prescriptionData.followUp.referralEnabled || false,
              },
              clinicalSummary: prescriptionData.followUp.referral?.clinicalSummary || ''
            }
          },
          immunizations: (prescriptionData.immunizations || []).map(i => ({
            name: i.name,
            status: i.status,
            date: i.date,
            nextDueDate: i.nextDueDate || '',
            doseNumber: Number(i.doseNumber) || 0,
            remarks: '',
          })),
        };

        const changedSections: Partial<EPrescriptionDraftReq> = {};
        let hasChanges = false;

        Object.keys(currentSections).forEach(key => {
          const currentJson = JSON.stringify(currentSections[key]);
          if (currentJson !== lastSavedRefs.current[key]) {
            // @ts-ignore
            changedSections[key] = currentSections[key];
            hasChanges = true;
          }
        });

        if (hasChanges) {
          if (onSectionStatusChange) {
            Object.keys(changedSections).forEach(key => onSectionStatusChange(key, 'saving'));
          }

          const finalPayload = { ...payload, ...changedSections };
          await eprescriptionApi.saveDraft(finalPayload as EPrescriptionDraftReq);

          if (onSectionStatusChange) {
            Object.keys(changedSections).forEach(key => onSectionStatusChange(key, 'saved'));
          }

          // Update last saved refs only for successfully sent sections
          Object.keys(changedSections).forEach(key => {
            lastSavedRefs.current[key] = JSON.stringify(currentSections[key]);
          });
          // Trigger success callback to refresh draft
          if (onSaveSuccess) {
            onSaveSuccess();
          }
        }

      } catch (err) {
        console.error('Failed to auto-save draft', err);
      }
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [prescriptionData, patientId, appointmentId, doctorId, hospitalId, userId]);

  return null;
};

import { forwardRef, useImperativeHandle } from 'react';

export interface EPrescriptionPadRef {
  submitPrescription: () => Promise<boolean>;
  saveDraft: () => Promise<boolean>;
}

interface EPrescriptionPadProps {
  prescriptionFieldPreferences?: any;
  appointmentId?: string;
}

const EPrescriptionPad = forwardRef<EPrescriptionPadRef, EPrescriptionPadProps>(({ prescriptionFieldPreferences, appointmentId: propAppointmentId }, ref) => {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();

  const safeDecode = (value: string | null) => {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const resolvedPatientId = safeDecode(searchParams.get('patientId')) || patientId || '';
  const resolvedAppointmentId = propAppointmentId || safeDecode(searchParams.get('appointmentId'));
  const resolvedPatientName = safeDecode(searchParams.get('patientName')) || '';

  const { getDoctorId, getHospitalId, getUserId } = useAuthStore();
  const { toast } = useToast();
  const [apiPreferences, setApiPreferences] = useState<any>(null);
  const [isLoadingApiPreferences, setIsLoadingApiPreferences] = useState(false);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientProfileData | null>(null);
  const [hasFetchedVitals, setHasFetchedVitals] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<EPrescriptionData>({
    vitals: {
      bloodPressure: '',
      temperature: '',
      heartRate: '',
      weight: '',
      height: '',
      bmi: '',
      oxygenSaturation: '',
      respiratoryRate: ''
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
      reason: '',
      patientInstructions: '',
      referralEnabled: false,
      referral: {
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
      },
      attachments: []
    },
    nonPharmacologicalAdvice: [],
    attachments: []
  });

  // Fetch Patient Profile
  useEffect(() => {
    const fetchProfile = async () => {
      // Use resolvedPatientId from search params or route params
      const pid = searchParams.get('patientId') || patientId;
      if (pid) {
        try {
          const hid = getHospitalId?.() || searchParams.get('hospitalId') || '4de8ea65-71aa-4800-8167-60147d78ea58';
          const data = await patientProfileApi.getPatientProfile(hid, pid);
          setPatientProfile(data);
        } catch (error) {
          console.error('Failed to fetch patient profile', error);
        }
      }
    };
    fetchProfile();
  }, [patientId, searchParams, getHospitalId]);

  const saveMedicineToDrPreference = async (medicineName: string, brandName?: string, dose?: string) => {
    try {
      const hid = getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58';
      const did = getDoctorId() || '';
      if (!did) return;

      await eprescriptionApi.saveDoctorPreference({
        preferrredId: null,
        doctorId: did,
        hospitalId: hid,
        source: 'Medicine',
        medicine: {
          medicineName: medicineName,
          manufacturer: '',
          genericName: '',
          brandName: brandName || '',
          dosageForm: '',
          strength: dose || ''
        }
      });
    } catch (error) {
      console.error('Failed to save medicine preference', error);
      // Suppress UI error for background preference save
    }
  };


  /* Submit Logic exposed via ref */
  useImperativeHandle(ref, () => ({
    submitPrescription: async () => {
      if (!resolvedPatientId || !resolvedAppointmentId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Missing patient or appointment details for submission.',
        });
        return false;
      }

      try {
        const hid = getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58';
        const did = getDoctorId() || '';

        const payload: EPrescriptionDraftReq = {
          prescriptionId: draftPrescriptionId || null,
          appointmentId: resolvedAppointmentId,
          patientId: resolvedPatientId,
          doctorId: did,
          hospitalId: hid,
          loggedInUserName: getUserId?.() || 'System',
          vitalsJson: {
            bp: (() => {
              const [sys, dia] = (prescriptionData.vitals.bloodPressure || '').split('/').map(Number);
              return { sys: sys || 0, dia: dia || 0 };
            })(),
            pulse: Number(prescriptionData.vitals.heartRate) || 0,
            tempC: Number(prescriptionData.vitals.temperature) || 0,
            spo2: Number(prescriptionData.vitals.oxygenSaturation) || 0,
            heightCm: Number(prescriptionData.vitals.height) || 0,
            weightKg: Number(prescriptionData.vitals.weight) || 0,
            bmi: Number(prescriptionData.vitals.bmi) || 0,
            respiratoryRate: Number(prescriptionData.vitals.respiratoryRate) || 0,
          },
          chiefComplaint: prescriptionData.chiefComplaint,
          history: prescriptionData.history,
          comorbidity: prescriptionData.comorbidity,
          examination: prescriptionData.examination,
          diagnosis: prescriptionData.diagnosis,
          orders: {
            investigations: prescriptionData.orders.investigations,
            procedures: prescriptionData.orders.procedures,
          },
          medications: prescriptionData.medications.map(m => ({
            drugName: m.name,
            dose: m.dosage,
            route: m.route,
            frequency: m.frequency,
            duration: m.duration ? `${m.duration} ${m.durationUnit || ''}`.trim() : '',
            instructions: m.instructions,
            saltName: m.saltName,
          })),
          nonPharmacologicalAdvice: prescriptionData.nonPharmacologicalAdvice.map(a => ({
            advice: a.advice,
            duration: a.durationValue ? `${a.durationValue} ${a.durationUnit || ''}`.trim() : '',
            notes: a.notes || '',
          })),
          privateNotes: (prescriptionData.privateNotes || []).map(n => n.content).join('\n'),
          certificates: (prescriptionData.certificates && prescriptionData.certificates.length > 0) ? {
            ...prescriptionData.certificates[0],
            fromDate: prescriptionData.certificates[0].fromDate || '',
            toDate: prescriptionData.certificates[0].toDate || '',
            fitnessStatus: prescriptionData.certificates[0].fitnessStatus || '',
            remarks: prescriptionData.certificates[0].remarks || '',
            category: prescriptionData.certificates[0].category || ''
          } : undefined,
          followUp: {
            followUpOn: prescriptionData.followUp.followUpOn,
            reason: {
              reason: prescriptionData.followUp.reason,
              patientInstructions: prescriptionData.followUp.patientInstructions || '',
            },
            referral: {
              referredTo: {
                specialty: prescriptionData.followUp.referral?.referredTo?.specialty || '',
                doctorName: prescriptionData.followUp.referral?.referredTo?.doctorName || '',
                referralEnabled: prescriptionData.followUp.referralEnabled || false,
              },
              clinicalSummary: prescriptionData.followUp.referral?.clinicalSummary || ''
            }
          },
          immunizations: (prescriptionData.immunizations || []).map(i => ({
            name: i.name,
            status: i.status,
            date: i.date,
            nextDueDate: i.nextDueDate || '',
            doseNumber: Number(i.doseNumber) || 0,
            remarks: '',
          })),
        };

        const response = await eprescriptionApi.saveSubmit(payload);
        if (response.success) {
          try {
            // Generate PDF using static import and named export function
            const { blob } = await buildPreviewFromRequest({
              appointmentId: resolvedAppointmentId,
              patientId: resolvedPatientId,
              hospitalId: hid,
              doctorId: did
            });

            // Create validated file object
            const file = new File([blob], `Prescription-${resolvedAppointmentId}.pdf`, { type: 'application/pdf' });

            // Upload
            await eprescriptionApi.uploadVisitSummary(resolvedAppointmentId, file);

          } catch (pdfError: any) {
            console.error('Failed to generate/upload prescription PDF', pdfError);
            toast({
              variant: 'destructive',
              title: 'PDF Generation Failed',
              description: `Prescription saved, but PDF failed: ${pdfError.message || 'Unknown error'}. Check console for CORS details.`
            });
          }

          toast({
            title: 'Submitted',
            description: 'Prescription has been successfully submitted.',
            variant: 'default',
          });

          // Save medicine preferences in background
          if (prescriptionData.medications && prescriptionData.medications.length > 0) {
            prescriptionData.medications.forEach(med => {
              if (med.name && med.name.trim()) {
                saveMedicineToDrPreference(med.name.trim(), undefined, med.dosage);
              }
            });
          }

          return true;
        } else {
          toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: response.message || 'Unknown error occurred.',
          });
          return false;
        }
      } catch (error) {
        console.error('Submission error', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to submit prescription.',
        });
        return false;
      }
    },
    saveDraft: async () => {
      if (!resolvedPatientId || !resolvedAppointmentId) {
        return false;
      }

      try {
        const hid = getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58';
        const did = getDoctorId() || '';

        const payload: EPrescriptionDraftReq = {
          prescriptionId: draftPrescriptionId || null,
          appointmentId: resolvedAppointmentId,
          patientId: resolvedPatientId,
          doctorId: did,
          hospitalId: hid,
          loggedInUserName: getUserId?.() || 'System',
          vitalsJson: {
            bp: (() => {
              const [sys, dia] = (prescriptionData.vitals.bloodPressure || '').split('/').map(Number);
              return { sys: sys || 0, dia: dia || 0 };
            })(),
            pulse: Number(prescriptionData.vitals.heartRate) || 0,
            tempC: Number(prescriptionData.vitals.temperature) || 0,
            spo2: Number(prescriptionData.vitals.oxygenSaturation) || 0,
            heightCm: Number(prescriptionData.vitals.height) || 0,
            weightKg: Number(prescriptionData.vitals.weight) || 0,
            bmi: Number(prescriptionData.vitals.bmi) || 0,
            respiratoryRate: Number(prescriptionData.vitals.respiratoryRate) || 0,
          },
          chiefComplaint: prescriptionData.chiefComplaint,
          history: prescriptionData.history,
          comorbidity: prescriptionData.comorbidity,
          examination: prescriptionData.examination,
          diagnosis: prescriptionData.diagnosis,
          orders: {
            investigations: prescriptionData.orders.investigations,
            procedures: prescriptionData.orders.procedures,
          },
          medications: prescriptionData.medications.map(m => ({
            drugName: m.name,
            dose: m.dosage,
            route: m.route,
            frequency: m.frequency,
            duration: m.duration ? `${m.duration} ${m.durationUnit || ''}`.trim() : '',
            instructions: m.instructions,
            saltName: m.saltName,
          })),
          nonPharmacologicalAdvice: prescriptionData.nonPharmacologicalAdvice.map(a => ({
            advice: a.advice,
            duration: a.durationValue ? `${a.durationValue} ${a.durationUnit || ''}`.trim() : '',
            notes: a.notes || '',
          })),
          privateNotes: (prescriptionData.privateNotes || []).map(n => n.content).join('\n'),
          certificates: (prescriptionData.certificates && prescriptionData.certificates.length > 0) ? {
            ...prescriptionData.certificates[0],
            fromDate: prescriptionData.certificates[0].fromDate || '',
            toDate: prescriptionData.certificates[0].toDate || '',
            fitnessStatus: prescriptionData.certificates[0].fitnessStatus || '',
            remarks: prescriptionData.certificates[0].remarks || '',
            category: prescriptionData.certificates[0].category || ''
          } : undefined,
          followUp: {
            followUpOn: prescriptionData.followUp.followUpOn,
            reason: {
              reason: prescriptionData.followUp.reason,
              patientInstructions: prescriptionData.followUp.patientInstructions || '',
            },
            referral: {
              referredTo: {
                specialty: prescriptionData.followUp.referral?.referredTo?.specialty || '',
                doctorName: prescriptionData.followUp.referral?.referredTo?.doctorName || '',
                referralEnabled: prescriptionData.followUp.referralEnabled || false,
              },
              clinicalSummary: prescriptionData.followUp.referral?.clinicalSummary || ''
            }
          },
          immunizations: (prescriptionData.immunizations || []).map(i => ({
            name: i.name,
            status: i.status,
            date: i.date,
            nextDueDate: i.nextDueDate || '',
            doseNumber: Number(i.doseNumber) || 0,
            remarks: '',
          })),
        };

        const response = await eprescriptionApi.saveDraft(payload);
        if (response.success) {
          toast({
            title: 'Saved',
            description: 'Prescription draft saved successfully.',
            variant: 'default',
            className: 'border-l-4 border-green-500', // Add a visual cue
          });
          return true;
        } else {
          toast({
            title: 'Save Failed',
            description: response.message,
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Save draft error', error);
        toast({
          title: 'Error',
          description: 'Failed to save draft.',
          variant: 'destructive',
        });
        return false;
      }
    }
  }));

  const resolveTemplateContent = (template: string, entry: any, profile: PatientProfileData | null, presData: EPrescriptionData) => {
    if (!template) return '';
    let text = template;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Profile Data
    text = text.replace(/{{patientName}}/g, profile?.fullName || '_______');
    text = text.replace(/{{age}}/g, profile?.ageYears?.toString() || '__');
    text = text.replace(/{{gender}}/g, profile?.sex || '__');
    text = text.replace(/{{patientId}}/g, profile?.patientId || '__');
    text = text.replace(/{{uhid}}/g, profile?.registrationId || '__');

    // Clinic/Doctor Data 
    // Ideally this should come from a doctor/clinic profile store
    text = text.replace(/{{doctorName}}/g, 'Dr. [Doctor Name]');
    text = text.replace(/{{doctorQualification}}/g, '[Qualification]');
    text = text.replace(/{{doctorRegNo}}/g, '[RegNo]');
    text = text.replace(/{{clinicName}}/g, 'EasyHMS Clinic');
    text = text.replace(/{{clinicAddress}}/g, 'Kolkata, India');
    text = text.replace(/{{clinicPhone}}/g, '+91-XXXXXXXXXX');

    // Prescription Context
    text = text.replace(/{{diagnosis}}/g, presData.diagnosis || '________');
    text = text.replace(/{{complaints}}/g, presData.chiefComplaint || '________');
    text = text.replace(/{{findings}}/g, presData.examination || '________');
    text = text.replace(/{{treatment}}/g, 'As per prescription');

    const medSummary = presData.medications.map(m => m.name).join(', ') || '________';
    text = text.replace(/{{medications}}/g, medSummary);
    const invSummary = presData.orders.investigations.join(', ') || '________';
    text = text.replace(/{{investigations}}/g, invSummary);

    // Certificate Specific Fields
    text = text.replace(/{{issuedDate}}/g, entry.issuedDate || todayStr);
    text = text.replace(/{{appointmentDate}}/g, todayStr);
    text = text.replace(/{{fromDate}}/g, entry.fromDate || '________');
    text = text.replace(/{{toDate}}/g, entry.toDate || '________');
    text = text.replace(/{{fitnessStatus}}/g, entry.fitnessStatus || '________');
    text = text.replace(/{{remarks}}/g, entry.remarks || '________');
    text = text.replace(/{{restrictions}}/g, entry.remarks || '________');
    text = text.replace(/{{followUpDate}}/g, presData.followUp?.followUpOn || '________');
    text = text.replace(/{{procedure}}/g, presData.orders.procedures.join(', ') || '________');

    return text;
  };



  console.log('[EPrescriptionPad Debug]', {
    resolvedPatientId,
    resolvedAppointmentId,
    propAppointmentId,
    paramsAppId: searchParams.get('appointmentId'),
    paramsPatientId: searchParams.get('patientId'),
    useParamsPatientId: patientId
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
            respiratoryRate: vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null ? String(vitals.respiratoryRate) : '',
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
        respiratoryRate: Number(prescriptionData.vitals.respiratoryRate) || 0,
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
  const [chiefComplaintOptions, setChiefComplaintOptions] = useState<LookupItem[]>([]);
  const [selectedChiefComplaints, setSelectedChiefComplaints] = useState<string[]>([]);
  const [chiefComplaintOpen, setChiefComplaintOpen] = useState(false);
  const [chiefComplaintQuery, setChiefComplaintQuery] = useState('');
  const [chiefComplaintActiveIndex, setChiefComplaintActiveIndex] = useState(0);
  const [chiefComplaintDurationValue, setChiefComplaintDurationValue] = useState('');
  const [chiefComplaintDurationUnit, setChiefComplaintDurationUnit] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [pendingChiefComplaintLabel, setPendingChiefComplaintLabel] = useState<string | null>(null);
  const chiefComplaintInputRef = useRef<HTMLInputElement | null>(null);
  const chiefComplaintRootRef = useRef<HTMLDivElement | null>(null);

  const [historyOptions, setHistoryOptions] = useState<LookupItem[]>([]);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyActiveIndex, setHistoryActiveIndex] = useState(0);
  const historyInputRef = useRef<HTMLInputElement | null>(null);
  const historyRootRef = useRef<HTMLDivElement | null>(null);
  const [comorbidityOptions, setComorbidityOptions] = useState<LookupItem[]>([]);
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [comorbidityOpen, setComorbidityOpen] = useState(false);
  const [comorbidityQuery, setComorbidityQuery] = useState('');
  const [comorbidityActiveIndex, setComorbidityActiveIndex] = useState(0);
  const comorbidityInputRef = useRef<HTMLInputElement | null>(null);
  const comorbidityRootRef = useRef<HTMLDivElement | null>(null);


  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Personalized Data Handler
  const handlePersonalizedDataUpdate = useCallback(async (
    lookupType: PersonalizedLookupType,
    items: any[]
  ) => {
    const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
    const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';

    if (!hid || !did) return;

    try {
      const payload = items.map((item, index) => ({
        personalId: item.personalId || null,
        name: item.name || item.text || item,
        code: item.code || item.id || `CODE-${index}`,
        shortDesc: item.shortDesc || '',
        synonyms: item.synonyms || '',
      }));

      await personalizedDataApi.updatePersonalizedConfiguration(
        did,
        hid,
        lookupType,
        payload
      );
    } catch (error) {
      console.error(`Failed to update personalized configuration for ${lookupType}`, error);
    }
  }, [getHospitalId, getDoctorId]);





  const handleChiefComplaintChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      chiefComplaint: items.map((i) => i.name).join(', '),
    }));
    handlePersonalizedDataUpdate('CHIEF_COMPLAINT', items);
  };

  const handleHistoryChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      history: items.map((i) => i.name).join(', '),
    }));
    handlePersonalizedDataUpdate('HISTORY', items);
  };

  const handleComorbidityChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      comorbidity: items.map((i) => i.name).join(', '),
    }));
    handlePersonalizedDataUpdate('COMORBIDITY', items);
  };

  const handleExaminationChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      examination: items.map((i) => i.name).join(', '),
    }));
    handlePersonalizedDataUpdate('EXAMINATION', items);
  };

  const handleDiagnosisChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      diagnosis: items.map((i) => i.name).join(', '),
    }));
    handlePersonalizedDataUpdate('DIAGNOSIS', items);
  };

  const handleInvestigationsChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      orders: {
        ...prev.orders,
        investigations: items.map((i) => i.name),
      },
    }));
    handlePersonalizedDataUpdate('INVESTIGATION', items);
  };

  const handleProceduresChange = (items: any[]) => {
    setPrescriptionData((prev) => ({
      ...prev,
      orders: {
        ...prev.orders,
        procedures: items.map((i) => i.name),
      },
    }));
    handlePersonalizedDataUpdate('PROCEDURE', items);
  };
  const [examinationOptions, setExaminationOptions] = useState<LookupItem[]>([]);
  const [selectedExaminations, setSelectedExaminations] = useState<string[]>([]);
  const [examinationOpen, setExaminationOpen] = useState(false);
  const [examinationQuery, setExaminationQuery] = useState('');
  const [examinationActiveIndex, setExaminationActiveIndex] = useState(0);
  const examinationInputRef = useRef<HTMLInputElement | null>(null);
  const examinationRootRef = useRef<HTMLDivElement | null>(null);
  const [diagnosisOptions, setDiagnosisOptions] = useState<LookupItem[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [diagnosisActiveIndex, setDiagnosisActiveIndex] = useState(0);
  const diagnosisInputRef = useRef<HTMLInputElement | null>(null);
  const diagnosisRootRef = useRef<HTMLDivElement | null>(null);
  const [investigationOptions, setInvestigationOptions] = useState<LookupItem[]>([]);
  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([]);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [investigationQuery, setInvestigationQuery] = useState('');
  const [investigationActiveIndex, setInvestigationActiveIndex] = useState(0);
  const investigationInputRef = useRef<HTMLInputElement | null>(null);
  const investigationRootRef = useRef<HTMLDivElement | null>(null);
  const [draftPrescriptionId, setDraftPrescriptionId] = useState<string | null>(null);
  const [sectionSaveStatus, setSectionSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const handleSectionStatusChange = useCallback((section: string, status: 'saving' | 'saved' | 'error') => {
    setSectionSaveStatus(prev => ({ ...prev, [section]: status }));
  }, []);
  const [procedureOptions, setProcedureOptions] = useState<LookupItem[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [procedureActiveIndex, setProcedureActiveIndex] = useState(0);
  const procedureInputRef = useRef<HTMLInputElement | null>(null);
  const procedureRootRef = useRef<HTMLDivElement | null>(null);

  // Fetch Draft Data
  /* Fetch Draft Data */
  const fetchDraft = useCallback(async (silent = false, onlyUpdateId = false) => {
    const hid = getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58';
    const did = getDoctorId() || '';

    console.log('fetchDraft called', { silent, onlyUpdateId, resolvedPatientId, resolvedAppointmentId, hid, did });

    if (!resolvedPatientId || !resolvedAppointmentId) {
      console.warn('fetchDraft aborted: missing IDs');
      return;
    }

    try {
      if (!silent) setIsLoadingDraft(true);
      const response = await eprescriptionApi.getDraft(resolvedAppointmentId, resolvedPatientId, did, hid);

      if (response.success && response.data) {
        const draft = response.data;
        console.log('Draft loaded:', draft);
        // Store the prescription ID from the draft
        setDraftPrescriptionId(draft.prescriptionId || null);

        if (onlyUpdateId) return;

        setPrescriptionData(prev => ({
          ...prev,
          chiefComplaint: draft.chiefComplaint || '',
          history: draft.history || '',
          comorbidity: draft.comorbidity || '',
          examination: draft.examination || '',
          diagnosis: draft.diagnosis || '',
          privateNotes: draft.privateNotes ? [{ content: draft.privateNotes }] : [],
          vitals: draft.vitalsJson ? {
            bloodPressure: `${draft.vitalsJson.bp?.sys || ''}/${draft.vitalsJson.bp?.dia || ''}`,
            heartRate: String(draft.vitalsJson.pulse || ''),
            temperature: String(draft.vitalsJson.tempC || ''),
            oxygenSaturation: String(draft.vitalsJson.spo2 || ''),
            height: String(draft.vitalsJson.heightCm || ''),
            weight: String(draft.vitalsJson.weightKg || ''),
            bmi: String(draft.vitalsJson.bmi || ''),
            respiratoryRate: String(draft.vitalsJson.respiratoryRate || ''),
          } : prev.vitals,
          orders: {
            investigations: draft.orders?.investigations || [],
            procedures: draft.orders?.procedures || []
          },
          medications: (draft.medications || []).map((m, idx) => ({
            id: `draft-med-${idx}-${Date.now()}`,
            name: m.drugName,
            dosage: m.dose,
            route: m.route,
            frequency: m.frequency,
            timing: '', // Not in draft
            duration: m.duration ? m.duration.split(' ')[0] : '',
            durationUnit: m.duration ? m.duration.split(' ')[1] || 'days' : 'days',
            saltName: m.saltName,
            instructions: m.instructions
          })),
          nonPharmacologicalAdvice: (draft.nonPharmacologicalAdvice || []).map(a => ({
            advice: a.advice,
            category: '',
            durationValue: a.duration ? a.duration.split(' ')[0] : '',
            durationUnit: a.duration ? a.duration.split(' ')[1] || 'days' : 'days',
            notes: a.notes
          })),
          followUp: draft.followUp ? {
            followUpOn: draft.followUp.followUpOn ? draft.followUp.followUpOn.split('T')[0] : '',
            reason: draft.followUp.reason?.reason || '',
            patientInstructions: draft.followUp.reason?.patientInstructions || '',
            referralEnabled: draft.followUp.referral?.referredTo?.referralEnabled || false,
            referral: {
              referredTo: {
                specialty: draft.followUp.referral?.referredTo?.specialty || '',
                doctorName: draft.followUp.referral?.referredTo?.doctorName || '',
                facilityId: '', facilityName: ''
              },
              clinicalSummary: draft.followUp.referral?.clinicalSummary || '',
              reason: '', urgency: 'Routine', requestedAction: '', attachments: []
            },
            attachments: []
          } : prev.followUp,
          immunizations: (draft.immunizations || []).map(i => ({
            name: i.name,
            status: i.status,
            date: i.date ? i.date.split('T')[0] : '',
            nextDueDate: i.nextDueDate ? i.nextDueDate.split('T')[0] : '',
            doseNumber: String(i.doseNumber || ''),
            expanded: false
          })),
          certificates: draft.certificates ? [{
            type: draft.certificates.type,
            content: draft.certificates.content,
            issuedDate: draft.certificates.issuedDate ? draft.certificates.issuedDate.split('T')[0] : '',
            fromDate: draft.certificates.fromDate ? draft.certificates.fromDate.split('T')[0] : '',
            toDate: draft.certificates.toDate ? draft.certificates.toDate.split('T')[0] : '',
            fitnessStatus: draft.certificates.fitnessStatus,
            remarks: draft.certificates.remarks,
            category: draft.certificates.category
          }] : []
        }));

        // Sync UI states for multi-select fields
        if (draft.chiefComplaint) {
          setSelectedChiefComplaints(draft.chiefComplaint.split('; ').filter(Boolean));
        }
        if (draft.history) {
          setSelectedHistoryItems(draft.history.split('; ').filter(Boolean));
        }
        if (draft.comorbidity) {
          setSelectedComorbidities(draft.comorbidity.split('; ').filter(Boolean));
        }
        if (draft.examination) {
          setSelectedExaminations(draft.examination.split('; ').filter(Boolean));
        }
        if (draft.diagnosis) {
          setSelectedDiagnoses(draft.diagnosis.split('; ').filter(Boolean));
        }
        if (draft.orders?.investigations) {
          setSelectedInvestigations(draft.orders.investigations);
        }
        if (draft.orders?.procedures) {
          setSelectedProcedures(draft.orders.procedures);
        }
      }
    } catch (error) {
      console.error('Failed to fetch draft', error);
    } finally {
      if (!silent) setIsLoadingDraft(false);
    }
  }, [resolvedPatientId, resolvedAppointmentId, getDoctorId, getHospitalId]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);
  const [medicationOptions, setMedicationOptions] = useState<(LookupItem & { original?: MedicineSearchItem })[]>([]);
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

  // State for Quick Picks (fetched from API)
  const [quickPicks, setQuickPicks] = useState<Record<string, LookupItem[]>>({
    chiefComplaint: [],
    history: [],
    comorbidity: [],
    examination: [],
    diagnosis: [],
    investigations: [],
    procedures: []
  });

  // Fetch Lookup Details for Quick Picks
  useEffect(() => {
    const fetchQuickPicks = async () => {
      try {
        const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
        const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
        const response = await eprescriptionApi.getLookupDetails(hid, did);

        if (response.success && response.items) {
          const newQuickPicks: Record<string, LookupItem[]> = {
            chiefComplaint: [],
            history: [],
            comorbidity: [],
            examination: [],
            diagnosis: [],
            investigations: [],
            procedures: []
          };

          response.items.forEach(group => {
            const mappedItems: LookupItem[] = group.personalData.map(pd => ({
              id: pd.personalId || pd.code,
              name: pd.name,
              source: 'personal',
              shortDesc: pd.shortDesc,
              usageCount: pd.usageCount
            }));

            switch (group.lookupType) {
              case 'CHIEF_COMPLAINT':
                newQuickPicks.chiefComplaint = mappedItems;
                break;
              case 'HISTORY':
                newQuickPicks.history = mappedItems;
                break;
              case 'COMORBIDITY':
                newQuickPicks.comorbidity = mappedItems;
                break;
              case 'EXAMINATION':
                newQuickPicks.examination = mappedItems;
                break;
              case 'DIAGNOSIS':
                newQuickPicks.diagnosis = mappedItems;
                break;
              case 'INVESTIGATION':
                newQuickPicks.investigations = mappedItems;
                break;
              case 'PROCEDURE':
                newQuickPicks.procedures = mappedItems;
                break;
            }
          });
          setQuickPicks(newQuickPicks);
        }
      } catch (err) {
        console.error('Failed to fetch lookup details for quick picks', err);
      }
    };

    fetchQuickPicks();
  }, []);

  // Custom Personalized Item Saver
  const saveCustomPersonalizedItem = useCallback(async (lookupType: PersonalizedLookupType, text: string) => {
    const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
    const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';

    if (!hid || !did || !text) return;

    // Split by comma or colon
    const parts = text.split(/[,:]+/).map(p => p.trim()).filter(Boolean);

    // Map lookupType to quickPicks key for duplicate check
    let quickPickKey = '';
    switch (lookupType) {
      case 'CHIEF_COMPLAINT': quickPickKey = 'chiefComplaint'; break;
      case 'HISTORY': quickPickKey = 'history'; break;
      case 'COMORBIDITY': quickPickKey = 'comorbidity'; break;
      case 'EXAMINATION': quickPickKey = 'examination'; break;
      case 'DIAGNOSIS': quickPickKey = 'diagnosis'; break;
      case 'INVESTIGATION': quickPickKey = 'investigations'; break;
      case 'PROCEDURE': quickPickKey = 'procedures'; break;
    }

    const existingItems = quickPickKey ? quickPicks[quickPickKey] || [] : [];

    for (const part of parts) {
      // Clean the part to remove duration (e.g. "Fever since 2 days" -> "Fever")
      // Split by " since " (case insensitive) and take the first part
      const cleanName = part.split(/\s+since\s+/i)[0].trim();

      if (!cleanName) continue;

      // Always upsert to personalized data, even if it exists (to update usage / ensure tracking)
      // const exists = existingItems.some(i => i.name.toLowerCase() === cleanName.toLowerCase());
      // if (!exists) {
      try {
        await personalizedDataApi.upsert(did, hid, lookupType, {
          personalId: null,
          name: cleanName,
          code: "", // Keep as requested
          shortDesc: "",
          synonyms: ""
        }, 'prescription');
        console.log(`Saved new personalised item [${lookupType}]: ${cleanName}`);

        // Optimistically update quickPicks to prevent immediate re-save if user types it again?
        // For now, relying on swr/react-query would be better, but we just want to ensure the PUT fires.
      } catch (error) {
        console.error(`Failed to save custom personalised item [${lookupType}]: ${cleanName}`, error);
      }

    }
  }, [getHospitalId, getDoctorId, quickPicks]);

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
    setExaminationOptions(quickPicks.examination);
    setExaminationActiveIndex(0);
    setExaminationOpen(false);
    examinationInputRef.current?.focus();
    saveCustomPersonalizedItem('EXAMINATION', label);
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
    setDiagnosisOptions(quickPicks.diagnosis);
    setDiagnosisActiveIndex(0);
    setDiagnosisOpen(false);
    diagnosisInputRef.current?.focus();

    // API Update
    const next = [...selectedDiagnoses];
    if (!next.includes(label)) next.push(label);
    // handlePersonalizedDataUpdate('DIAGNOSIS', next.map(name => ({ name, code: name })));
    saveCustomPersonalizedItem('DIAGNOSIS', label);
  };

  const removeDiagnosisItem = (label: string) => {
    setSelectedDiagnoses(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, diagnosis: next.join('; ') }));
      handlePersonalizedDataUpdate('DIAGNOSIS', next.map(name => ({ name, code: name })));
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
    setComorbidityOptions(quickPicks.comorbidity);
    setComorbidityActiveIndex(0);
    setComorbidityOpen(false);
    comorbidityInputRef.current?.focus();

    // API Update
    const next = [...selectedComorbidities];
    if (!next.includes(label)) next.push(label);
    // handlePersonalizedDataUpdate('COMORBIDITY', next.map(name => ({ name, code: name })));
    saveCustomPersonalizedItem('COMORBIDITY', label);
  };

  const removeComorbidityItem = (label: string) => {
    setSelectedComorbidities(prev => {
      const next = prev.filter(item => item !== label);
      setPrescriptionData(p => ({ ...p, comorbidity: next.join('; ') }));
      handlePersonalizedDataUpdate('COMORBIDITY', next.map(name => ({ name, code: name })));
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
    setHistoryOptions(quickPicks.history);
    setHistoryActiveIndex(0);
    setHistoryOpen(false);
    historyInputRef.current?.focus();
    saveCustomPersonalizedItem('HISTORY', label);
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
    setChiefComplaintOptions(quickPicks.chiefComplaint);
    setChiefComplaintActiveIndex(0);
    setChiefComplaintOpen(false);
    setPendingChiefComplaintLabel(label.trim());
    saveCustomPersonalizedItem('CHIEF_COMPLAINT', label);
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

    const saveStatusKey = fieldId === 'vitals' ? 'vitalsJson' : fieldId;
    const saveStatus = sectionSaveStatus[saveStatusKey];

    return (
      <Card key={fieldId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-200">
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
          onClick={() => toggleSection(fieldId)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              {renderFieldIcon(fieldId)}
              <span>{title}</span>
              {saveStatus === 'saving' && (
                <span className="ml-2 flex items-center gap-1 text-[10px] font-normal text-blue-600 animate-pulse">
                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="ml-2 flex items-center gap-1 text-[10px] font-normal text-green-600 animate-in fade-in duration-500">
                  <CheckCircle className="h-3 w-3" />
                  Saved
                </span>
              )}
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
    return Boolean(med.name.trim());
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
    // console.log(`[updateMedication] id=${id} field=${field} value=${value}`);
    setActiveMedicationId(id);
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const commitMedicationNameSelection = (id: string, name: string, itemData?: MedicineSearchItem) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateMedication(id, 'name', trimmed);

    if (itemData) {
      if (itemData.strength) {
        updateMedication(id, 'dosage', itemData.strength);
      }
      // Map dosage form to route if possible or leave empty
      // if (itemData.dosageForm) updateMedication(id, 'route', itemData.dosageForm);
    }

    // saveMedicineToDrPreference(trimmed, itemData);

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
    setInvestigationOptions(quickPicks.investigations);
    setInvestigationActiveIndex(0);
    setInvestigationOpen(false);
    investigationInputRef.current?.focus();

    // API Update
    const next = [...selectedInvestigations];
    if (!next.includes(label)) next.push(label);
    // handlePersonalizedDataUpdate('INVESTIGATION', next.map(name => ({ name, code: name })));
    saveCustomPersonalizedItem('INVESTIGATION', label);
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
      handlePersonalizedDataUpdate('INVESTIGATION', next.map(name => ({ name, code: name })));
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
    setProcedureOptions(quickPicks.procedures);
    setProcedureActiveIndex(0);
    setProcedureOpen(false); // Fix: use setProcedureOpen
    procedureInputRef.current?.focus();

    // API Update
    const next = [...selectedProcedures];
    if (!next.includes(label)) next.push(label);
    // handlePersonalizedDataUpdate('PROCEDURE', next.map(name => ({ name, code: name })));
    saveCustomPersonalizedItem('PROCEDURE', label);
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
      handlePersonalizedDataUpdate('PROCEDURE', next.map(name => ({ name, code: name })));
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

      <div className="flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-6 lg:px-8 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Blood Pressure */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Blood Pressure (BP)</Label>
                    </div>
                    <div className="relative">
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
                    <div className="h-4 mt-1">
                      {(() => {
                        const bpStr = prescriptionData.vitals.bloodPressure || '';
                        const [sysStr, diaStr] = bpStr.split('/');
                        const sys = parseInt(sysStr);
                        const dia = parseInt(diaStr);

                        const indicator = getBpIndicator(sys, dia);
                        if (!indicator) return null;

                        return (
                          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center ${indicator.bg} ${indicator.color}`}>
                            {indicator.label}
                          </div>
                        );
                      })()}
                    </div>
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

                  {/* Respiratory Rate */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">Respiratory Rate (breaths/min)</Label>
                    </div>
                    <Input
                      placeholder="16"
                      value={prescriptionData.vitals.respiratoryRate}
                      onChange={(e) => setPrescriptionData(prev => ({
                        ...prev,
                        vitals: { ...prev.vitals, respiratoryRate: e.target.value }
                      }))}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-teal-400 dark:focus:border-teal-300 focus:ring-1 focus:ring-teal-100 dark:focus:ring-teal-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
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
                      onChange={(e) => {
                        const newWeight = e.target.value;
                        setPrescriptionData(prev => {
                          const weightVal = parseFloat(newWeight) || 0;
                          const heightVal = parseFloat(prev.vitals.height) || 0;
                          const newBmi = calculateBmi(weightVal, heightVal);
                          return {
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              weight: newWeight,
                              bmi: newBmi > 0 ? newBmi.toString() : prev.vitals.bmi
                            }
                          };
                        });
                      }}
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
                      onChange={(e) => {
                        const newHeight = e.target.value;
                        setPrescriptionData(prev => {
                          const weightVal = parseFloat(prev.vitals.weight) || 0;
                          const heightVal = parseFloat(newHeight) || 0;
                          const newBmi = calculateBmi(weightVal, heightVal);
                          return {
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              height: newHeight,
                              bmi: newBmi > 0 ? newBmi.toString() : prev.vitals.bmi
                            }
                          };
                        });
                      }}
                      className="h-8 text-sm border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-100 dark:focus:ring-gray-900/40 placeholder:text-gray-400 placeholder:opacity-70 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>

                  {/* BMI */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-200">BMI (kg/m²)</Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="24.2"
                        value={prescriptionData.vitals.bmi}
                        readOnly
                        className="h-8 text-sm border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="h-4 mt-1">
                      {(() => {
                        const bmiNum = Number(prescriptionData.vitals.bmi);
                        if (!bmiNum) return null;
                        const indicator = getBmiIndicator(bmiNum);
                        return (
                          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center ${indicator.bg} ${indicator.color}`}>
                            {indicator.label}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {/* Save vitals button removed */}
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
                        onChange={(e) => setChiefComplaintDurationUnit(e.target.value as 'day' | 'week' | 'month' | 'year')}
                        className="h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                      >
                        <option value="day">day</option>
                        <option value="week">week</option>
                        <option value="month">month</option>
                        <option value="year">year</option>
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
                      onChange={async (e) => {
                        const val = e.target.value;
                        setChiefComplaintQuery(val);

                        // New dynamic search logic
                        if (val && val.length > 1) { // Min 2 chars to search
                          try {
                            const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                            const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529'; // Dynamic later
                            const response = await eprescriptionApi.searchLookupParams('CHIEF_COMPLAINT', hid, did, val);

                            if (response.success) {
                              const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                id: item.personalId || item.code,
                                name: item.name,
                                source: 'personal',
                              }));

                              const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                id: item.lookupId || item.code,
                                name: item.name,
                                source: 'general',
                              }));

                              setChiefComplaintOptions([...personalItems, ...masterItems]);
                            }
                          } catch (err) {
                            console.error('Failed to search lookups', err);
                            // Fallback to empty if API fails
                            setChiefComplaintOptions([]);
                          }
                        } else {
                          // If empty or short, show empty
                          setChiefComplaintOptions([]);
                        }

                        setChiefComplaintActiveIndex(0);
                        setChiefComplaintOpen(true);
                      }}
                      onFocus={() => {
                        setChiefComplaintOpen(true);
                        setChiefComplaintOptions([]);
                        setChiefComplaintActiveIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setChiefComplaintOpen(false), 50)}
                      onKeyDown={(e) => {
                        const personal = chiefComplaintOptions.filter(item => item.source === 'personal');
                        const general = chiefComplaintOptions.filter(item => item.source === 'general');
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
                            commitChiefComplaintSelection(combined[chiefComplaintActiveIndex].name);
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
                              {chiefComplaintOptions.filter(item => item.source === 'personal').map((item, idx) => {
                                const isActive = chiefComplaintActiveIndex === idx;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-left text-sm border ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'}`}
                                    onMouseEnter={() => setChiefComplaintActiveIndex(idx)}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      commitChiefComplaintSelection(item.name);
                                    }}
                                  >
                                    <span>{item.name}</span>
                                  </button>
                                );
                              })}
                              {chiefComplaintOptions.filter(item => item.source === 'personal').length === 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">No personal results</div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase">General</div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const personalCount = chiefComplaintOptions.filter(item => item.source === 'personal').length;
                                return chiefComplaintOptions
                                  .filter(item => item.source === 'general')
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
                                          commitChiefComplaintSelection(item.name);
                                        }}
                                      >
                                        <span>{item.name}</span>
                                      </button>
                                    );
                                  });
                              })()}
                              {chiefComplaintOptions.filter(item => item.source === 'general').length === 0 && (
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
                      {quickPicks.chiefComplaint.map(item => {
                        const isSelected = selectedChiefComplaints.includes(item.name);
                        return (
                          <Button
                            key={item.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
                            onClick={() => commitChiefComplaintSelection(item.name)}
                          >
                            {item.name}
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
                      onChange={async (e) => {
                        const val = e.target.value;
                        setHistoryQuery(val);

                        if (val && val.length > 1) {
                          try {
                            const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                            const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
                            const response = await eprescriptionApi.searchLookupParams('HISTORY', hid, did, val);

                            if (response.success) {
                              const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                id: item.personalId || item.code,
                                name: item.name,
                                source: 'personal',
                                shortDesc: item.shortDesc
                              }));
                              const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                id: item.lookupId || item.code,
                                name: item.name,
                                source: 'general',
                                shortDesc: item.shortDesc
                              }));
                              setHistoryOptions([...personalItems, ...masterItems]);
                            }
                          } catch (err) {
                            console.error('Failed to search history', err);
                            setHistoryOptions([]);
                          }
                        } else {
                          setHistoryOptions([]);
                        }
                        setHistoryActiveIndex(0);
                        setHistoryOpen(true);
                      }}
                      onFocus={() => {
                        setHistoryOpen(true);
                        setHistoryOptions([]);
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
                    {quickPicks.history.map(item => {
                      const isSelected = selectedHistoryItems.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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
                      onChange={async (e) => {
                        const val = e.target.value;
                        setComorbidityQuery(val);

                        if (val && val.length > 1) {
                          try {
                            const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                            const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
                            const response = await eprescriptionApi.searchLookupParams('COMORBIDITY', hid, did, val);

                            if (response.success) {
                              const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                id: item.personalId || item.code,
                                name: item.name,
                                source: 'personal',
                                shortDesc: item.shortDesc
                              }));
                              const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                id: item.lookupId || item.code,
                                name: item.name,
                                source: 'general',
                                shortDesc: item.shortDesc
                              }));
                              setComorbidityOptions([...personalItems, ...masterItems]);
                            }
                          } catch (err) {
                            console.error('Failed to search comorbidity', err);
                            setComorbidityOptions([]);
                          }
                        } else {
                          setComorbidityOptions([]);
                        }
                        setComorbidityActiveIndex(0);
                        setComorbidityOpen(true);
                      }}
                      onFocus={() => {
                        setComorbidityOpen(true);
                        setComorbidityOptions([]);
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
                    {quickPicks.comorbidity.map(item => {
                      const isSelected = selectedComorbidities.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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
                      onChange={async (e) => {
                        const val = e.target.value;
                        setExaminationQuery(val);

                        if (val && val.length > 1) {
                          try {
                            const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                            const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
                            const response = await eprescriptionApi.searchLookupParams('EXAMINATION', hid, did, val);

                            if (response.success) {
                              const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                id: item.personalId || item.code,
                                name: item.name,
                                source: 'personal',
                                shortDesc: item.shortDesc
                              }));
                              const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                id: item.lookupId || item.code,
                                name: item.name,
                                source: 'general',
                                shortDesc: item.shortDesc
                              }));
                              setExaminationOptions([...personalItems, ...masterItems]);
                            }
                          } catch (err) {
                            console.error('Failed to search examination', err);
                            setExaminationOptions([]);
                          }
                        } else {
                          setExaminationOptions([]);
                        }
                        setExaminationActiveIndex(0);
                        setExaminationOpen(true);
                      }}
                      onFocus={() => {
                        setExaminationOpen(true);
                        setExaminationOptions([]);
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
                    {quickPicks.examination.map(item => {
                      const isSelected = selectedExaminations.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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

            {/* Orders Section */}
            {renderCollapsibleSection(
              'orders',
              'Orders: Investigation/Procedures & Treatment Plan',
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
                        onChange={async (e) => {
                          const val = e.target.value;
                          setInvestigationQuery(val);

                          if (val && val.length > 1) {
                            try {
                              const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                              const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
                              // Note: The lookup type is traditionally singular in uppercase, so using 'INVESTIGATION'.
                              const response = await eprescriptionApi.searchLookupParams('INVESTIGATION', hid, did, val);

                              if (response.success) {
                                const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                  id: item.personalId || item.code,
                                  name: item.name,
                                  source: 'personal',
                                  shortDesc: item.shortDesc
                                }));
                                const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                  id: item.lookupId || item.code,
                                  name: item.name,
                                  source: 'general',
                                  shortDesc: item.shortDesc
                                }));
                                setInvestigationOptions([...personalItems, ...masterItems]);
                              }
                            } catch (err) {
                              console.error('Failed to search investigation', err);
                              setInvestigationOptions([]);
                            }
                          } else {
                            setInvestigationOptions([]);
                          }
                          setInvestigationActiveIndex(0);
                          setInvestigationOpen(true);
                        }}
                        onFocus={() => {
                          setInvestigationOpen(true);
                          setInvestigationOptions([]);
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
                      {quickPicks.investigations.map(item => {
                        const isSelected = selectedInvestigations.includes(item.name);
                        return (
                          <Button
                            key={item.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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
                    <Label className="text-sm font-medium text-gray-700">Procedures & Treatment Plan</Label>
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
                        onChange={async (e) => {
                          const val = e.target.value;
                          setProcedureQuery(val);

                          if (val && val.length > 1) {
                            try {
                              const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                              const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';

                              const response = await eprescriptionApi.searchLookupParams('PROCEDURE', hid, did, val);

                              if (response.success) {
                                const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                  id: item.personalId || item.code,
                                  name: item.name,
                                  source: 'personal',
                                  shortDesc: item.shortDesc
                                }));
                                const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                  id: item.lookupId || item.code,
                                  name: item.name,
                                  source: 'general',
                                  shortDesc: item.shortDesc
                                }));
                                setProcedureOptions([...personalItems, ...masterItems]);
                              }
                            } catch (err) {
                              console.error('Failed to search procedures', err);
                              setProcedureOptions([]);
                            }
                          } else {
                            setProcedureOptions([]);
                          }
                          setProcedureActiveIndex(0);
                          setProcedureOpen(true);
                        }}
                        onFocus={() => {
                          setProcedureOpen(true);
                          setProcedureOptions([]);
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
                      {quickPicks.procedures.map(item => {
                        const isSelected = selectedProcedures.includes(item.name);
                        return (
                          <Button
                            key={item.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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
                      onChange={async (e) => {
                        const val = e.target.value;
                        setDiagnosisQuery(val);

                        if (val && val.length > 1) {
                          try {
                            const hid = getHospitalId() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                            const did = getDoctorId() || '9de6031b-7195-43f7-85b4-bba824585529';
                            const response = await eprescriptionApi.searchLookupParams('DIAGNOSIS', hid, did, val);

                            if (response.success) {
                              const personalItems: LookupItem[] = response.personalLookupData.map(item => ({
                                id: item.personalId || item.code,
                                name: item.name,
                                source: 'personal',
                                shortDesc: item.shortDesc
                              }));
                              const masterItems: LookupItem[] = response.masterLookupData.map(item => ({
                                id: item.lookupId || item.code,
                                name: item.name,
                                source: 'general',
                                shortDesc: item.shortDesc
                              }));
                              setDiagnosisOptions([...personalItems, ...masterItems]);
                            }
                          } catch (err) {
                            console.error('Failed to search diagnosis', err);
                            setDiagnosisOptions([]);
                          }
                        } else {
                          setDiagnosisOptions([]);
                        }
                        setDiagnosisActiveIndex(0);
                        setDiagnosisOpen(true);
                      }}
                      onFocus={() => {
                        setDiagnosisOpen(true);
                        setDiagnosisOptions([]);
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
                    {quickPicks.diagnosis.map(item => {
                      const isSelected = selectedDiagnoses.includes(item.name);
                      return (
                        <Button
                          key={item.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-auto min-h-5 text-[10px] md:text-[11px] rounded-full px-1.5 py-0.5"
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

            {/* Non-pharmacological Advice Section */}
            {renderCollapsibleSection(
              'nonPharmacologicalAdvice',
              'Non-pharmacological Advice',
              <div className="space-y-4">
                <div className="space-y-2">
                  {(Array.isArray(prescriptionData.nonPharmacologicalAdvice) ? prescriptionData.nonPharmacologicalAdvice : []).map((entry, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2 bg-green-50/60 dark:bg-green-900/40 border border-green-200 dark:border-green-700 rounded p-2">
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-gray-600">Advice / Instruction *</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${entry.isBold ? 'bg-gray-200 text-black font-bold' : 'text-gray-400'}`}
                              title="Bold"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent losing focus/selection
                                const inputId = `advice-input-${idx}`;
                                const el = document.getElementById(inputId) as HTMLInputElement;
                                if (el) {
                                  const start = el.selectionStart;
                                  const end = el.selectionEnd;
                                  if (start !== null && end !== null && start !== end) {
                                    // Wrap selection
                                    const text = entry.advice || '';
                                    const before = text.substring(0, start);
                                    const selected = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = `${before}*${selected}*${after}`;

                                    const next = [...prescriptionData.nonPharmacologicalAdvice];
                                    next[idx] = { ...entry, advice: newText };
                                    setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                                    return;
                                  }
                                }

                                // Fallback: Global toggle
                                const next = [...prescriptionData.nonPharmacologicalAdvice];
                                next[idx] = { ...entry, isBold: !entry.isBold };
                                setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                              }}
                            >
                              B
                            </Button>
                          </div>
                        </div>
                        <Input
                          placeholder="e.g. Low salt diet, Walk 30 min daily"
                          value={entry.advice || ''}
                          onChange={e => {
                            const next = [...prescriptionData.nonPharmacologicalAdvice];
                            next[idx] = { ...entry, advice: e.target.value };
                            setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                          id={`advice-input-${idx}`}
                          style={{
                            fontWeight: entry.isBold ? 'bold' : 'normal'
                          }}
                        />
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 items-center">
                        <div>
                          <Label className="text-xs text-gray-600">Duration</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Value"
                              value={entry.durationValue || ''}
                              onChange={e => {
                                const next = [...prescriptionData.nonPharmacologicalAdvice];
                                next[idx] = { ...entry, durationValue: e.target.value };
                                setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                              }}
                              className="h-8 text-xs w-20"
                            />
                            <Select
                              value={entry.durationUnit || ''}
                              onValueChange={val => {
                                const next = [...prescriptionData.nonPharmacologicalAdvice];
                                next[idx] = { ...entry, durationUnit: val };
                                setPrescriptionData(prev => ({ ...prev, nonPharmacologicalAdvice: next }));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="days">days</SelectItem>
                                <SelectItem value="weeks">weeks</SelectItem>
                                <SelectItem value="months">months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
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
                      <div className="flex items-end justify-end">
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <Plus className="h-4 w-4" />
                  Add advice
                </Button>
              </div>
            )}

            {/* Medications Section */}
            {renderCollapsibleSection(
              'medications',
              'Medications',
              <div className="space-y-4">
                {/* Header removed */}

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
                    const isActive = activeMedicationId === medication.id || (!activeMedicationId && index === prescriptionData.medications.length - 1);
                    const missingRequired = nameMissing;
                    const summaryParts = [medication.name, medication.dosage, medication.route, medication.frequency]
                      .filter(Boolean)
                      .join(' · ');
                    const quickFrequencies = ['OD', 'BD', 'TDS', 'HS'];
                    const quickInstructions = ['After food', 'Before food', 'With water', 'At bedtime'];

                    return (
                      <div
                        key={medication.id}
                        className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 shadow-sm ${isActive ? 'ring-2 ring-blue-200 dark:ring-blue-800/60 shadow-md' : ''
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
                                  Name is required
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

                        <div className="grid grid-cols-1 md:grid-cols-[1.5fr,0.7fr,0.7fr,0.7fr,1.4fr,1fr] gap-3">
                          <div className="space-y-1 relative">
                            <Label className="text-xs text-gray-600">Name *</Label>
                            <Input
                              placeholder="e.g., Paracetamol"
                              value={medication.name}
                              onChange={async (e) => {
                                const val = e.target.value;
                                updateMedication(medication.id, 'name', val);
                                setMedicationQuery(val);

                                if (val && val.length > 2) {
                                  try {
                                    const hid = getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58';
                                    const did = getDoctorId() || '';
                                    const results = await eprescriptionApi.searchMedicines(hid, did, val);

                                    const personalItems = (results.personalMedicine || []).map(item => ({
                                      id: item.id || `temp-${Math.random()}`,
                                      name: item.medicineName || item.brandName || item.genericName,
                                      source: 'personal' as const,
                                      shortDesc: `${item.manufacturer || ''} ${item.strength || ''}`.trim(),
                                      original: item
                                    }));

                                    const masterItems = (results.masterMedicine || []).map(item => ({
                                      id: item.id || `temp-${Math.random()}`,
                                      name: item.medicineName || item.brandName || item.genericName,
                                      source: 'general' as const,
                                      shortDesc: `${item.manufacturer || ''} ${item.strength || ''}`.trim(),
                                      original: item
                                    }));

                                    setMedicationOptions([...personalItems, ...masterItems]);
                                  } catch (error) {
                                    console.error('Error searching medicines', error);
                                    setMedicationOptions([]);
                                  }
                                } else {
                                  setMedicationOptions([]);
                                }

                                setMedicationActiveIndex(0);
                                setMedicationOpenForId(medication.id);
                              }}
                              onFocus={() => {
                                setActiveMedicationId(medication.id);
                                setMedicationOpenForId(medication.id);
                                if (medication.name && medication.name.length > 2) {
                                  // Trigger search if already has value
                                  const val = medication.name;
                                  setMedicationQuery(val);
                                  // Re-run search logic (duplicated for now, or extract to function)
                                  eprescriptionApi.searchMedicines(getHospitalId?.() || '4de8ea65-71aa-4800-8167-60147d78ea58', getDoctorId() || '', val)
                                    .then(results => {
                                      const personalItems = (results.personalMedicine || []).map(item => ({
                                        id: item.id || `temp-${Math.random()}`,
                                        name: item.medicineName || item.brandName || item.genericName,
                                        source: 'personal' as const,
                                        shortDesc: `${item.manufacturer || ''} ${item.strength || ''}`.trim(),
                                        original: item
                                      }));

                                      const masterItems = (results.masterMedicine || []).map(item => ({
                                        id: item.id || `temp-${Math.random()}`,
                                        name: item.medicineName || item.brandName || item.genericName,
                                        source: 'general' as const,
                                        shortDesc: `${item.manufacturer || ''} ${item.strength || ''}`.trim(),
                                        original: item
                                      }));

                                      setMedicationOptions([...personalItems, ...masterItems]);
                                    })
                                    .catch(() => setMedicationOptions([]));
                                } else {
                                  setMedicationOptions([]);
                                }
                                setMedicationActiveIndex(0);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setMedicationOpenForId(current => current === medication.id ? null : current);
                                }, 50);
                              }}
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
                                    commitMedicationNameSelection(medication.id, combined[medicationActiveIndex].name, combined[medicationActiveIndex].original);
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
                                                  commitMedicationNameSelection(medication.id, item.name, item.original);
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
                                                  commitMedicationNameSelection(medication.id, item.name, item.original);
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
                            <Label className="text-xs text-gray-600">Dosage</Label>
                            <Input
                              placeholder="e.g., 500 mg"
                              value={medication.dosage}
                              onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                              onFocus={() => setActiveMedicationId(medication.id)}
                              className="h-9 text-sm"
                            />
                            {/* Dosage is optional */}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Route</Label>
                            <Input
                              placeholder="e.g. Oral, IV, IM"
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
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g. 5"
                                value={medication.duration}
                                onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                                onFocus={() => setActiveMedicationId(medication.id)}
                                className="h-9 text-sm flex-1 min-w-0 border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-300 dark:bg-gray-900 dark:text-gray-100"
                              />
                              <select
                                value={medication.durationUnit || 'days'}
                                onChange={(e) => updateMedication(medication.id, 'durationUnit', e.target.value)}
                                onFocus={() => setActiveMedicationId(medication.id)}
                                className="h-9 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                              >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Instructions</Label>
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
                              className="h-6 px-1.5 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = medication.frequency || '';
                                const newVal = current ? `${current}, ${freq}` : freq;
                                updateMedication(medication.id, 'frequency', newVal);
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
                              className="h-6 px-1.5 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = medication.instructions || '';
                                const newVal = current ? `${current}, ${instr}` : instr;
                                updateMedication(medication.id, 'instructions', newVal);
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
                {/* Add Button at Bottom */}
                {prescriptionData.medications.length > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addMedication()}
                      disabled={!prescriptionData.medications.length || (prescriptionData.medications.length > 0 && !isMedicationValid(prescriptionData.medications[prescriptionData.medications.length - 1]))}
                      className="w-full md:w-auto min-w-[200px]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add another medication
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Auto Save Logic - Only active when not loading draft */}
            {!isLoadingDraft && (
              <AutoSaveHandler
                prescriptionData={prescriptionData}
                patientId={resolvedPatientId}
                appointmentId={resolvedAppointmentId || ''}
                doctorId={getDoctorId() || ''}
                hospitalId={getHospitalId?.() || ''}
                userId={getUserId?.() || ''}
                draftPrescriptionId={draftPrescriptionId}
                onSaveSuccess={() => {
                  if (!draftPrescriptionId) {
                    fetchDraft(true, true);
                  }
                }}
                onSectionStatusChange={handleSectionStatusChange}
              />
            )}

            {/* Private Notes Section */}
            {renderCollapsibleSection(
              'privateNotes',
              <span className="flex items-center gap-2">Private Notes <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold">Not printable</span></span>,
              <div className="space-y-4">
                {/* Quick chips/templates removed */}
                {(Array.isArray(prescriptionData.privateNotes) ? prescriptionData.privateNotes : []).map((note, idx) => (
                  <Card key={idx} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm p-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      {/* Type field removed from private notes */}
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
                      {/* Share with staff, Doctor-only by default, Pin for next visit, and Pinned notes show first next time removed */}
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
                {(Array.isArray(prescriptionData.certificates) ? prescriptionData.certificates : []).map((entry, idx) => {
                  const templateOptions = certificationTemplates.types;
                  const selectedTemplate = templateOptions.find(t => t.typeCode === entry.type);
                  return (
                    <Card key={idx} className="bg-yellow-50/60 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-700 shadow-sm p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column: Inputs */}
                        <div className="space-y-4">
                          {/* Type Dropdown */}
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Type *</Label>
                            <Select
                              value={entry.type || ''}
                              onValueChange={typeCode => {
                                const template = templateOptions.find(t => t.typeCode === typeCode);
                                const next = [...prescriptionData.certificates];
                                next[idx] = {
                                  ...entry,
                                  type: typeCode,
                                  category: template?.category || '',
                                  issuedDate: entry.issuedDate || new Date().toISOString().slice(0, 10),
                                  fromDate: template?.showFields.fromDate ? entry.fromDate || '' : undefined,
                                  toDate: template?.showFields.toDate ? entry.toDate || '' : undefined,
                                  fitnessStatus: template?.showFields.fitnessStatus ? entry.fitnessStatus || '' : undefined,
                                  remarks: template?.showFields.remarks ? entry.remarks || '' : undefined,
                                  content: template?.template || '',
                                };
                                setPrescriptionData(prev => ({ ...prev, certificates: next }));
                              }}
                            >
                              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-900 border rounded w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {templateOptions.map(opt => (
                                  <SelectItem key={opt.typeCode} value={opt.typeCode}>{opt.displayName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Issued Date */}
                            {selectedTemplate && (
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
                            )}
                            {/* Category (read-only) */}
                            {selectedTemplate && (
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Category</Label>
                                <Input
                                  value={entry.category || ''}
                                  readOnly
                                  className="h-9 text-sm bg-white dark:bg-slate-900"
                                />
                              </div>
                            )}
                          </div>

                          {/* From/To Date Row */}
                          {selectedTemplate && (selectedTemplate.showFields.fromDate || selectedTemplate.showFields.toDate) && (
                            <div className="grid grid-cols-2 gap-2">
                              {selectedTemplate.showFields.fromDate && (
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
                              )}
                              {selectedTemplate.showFields.toDate && (
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
                              )}
                            </div>
                          )}

                          {/* Fitness Status */}
                          {selectedTemplate && selectedTemplate.showFields.fitnessStatus && (
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
                          )}

                          {/* Remarks */}
                          {selectedTemplate && selectedTemplate.showFields.remarks && (
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Remarks/Restriction</Label>
                              <Input
                                placeholder={selectedTemplate.defaultRemarksHint || "Remarks..."}
                                value={entry.remarks || ''}
                                onChange={e => {
                                  const next = [...prescriptionData.certificates];
                                  next[idx] = { ...entry, remarks: e.target.value };
                                  setPrescriptionData(prev => ({ ...prev, certificates: next }));
                                }}
                                className="h-9 text-sm bg-white dark:bg-slate-900"
                              />
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const next = [...prescriptionData.certificates];
                                next.splice(idx, 1);
                                setPrescriptionData(prev => ({ ...prev, certificates: next }));
                              }}
                              className="h-8 px-3 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>

                        </div>

                        {/* Right Column: Content */}
                        {selectedTemplate && (
                          <div className="flex flex-col h-full space-y-1">
                            <Label className="text-xs text-gray-600">Content *</Label>
                            <Textarea
                              placeholder="Certificate or note content..."
                              value={entry.content || ''}
                              onChange={e => {
                                const next = [...prescriptionData.certificates];
                                next[idx] = { ...entry, content: e.target.value };
                                setPrescriptionData(prev => ({ ...prev, certificates: next }));
                              }}
                              className="flex-1 text-sm bg-white dark:bg-slate-900 min-h-[250px] font-mono resize-none p-4 leading-relaxed"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {(!prescriptionData.certificates || prescriptionData.certificates.length === 0) && (
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
                )}
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
                          <th className="p-2 font-semibold text-left w-40 md:w-56">Status</th>
                          <th className="p-2 font-semibold text-left">Date</th>
                          <th className="p-2 font-semibold text-left w-16 md:w-20">Dose</th>
                          <th className="p-2 font-semibold text-left">Next Due</th>

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
                              <td className="p-2 w-40 md:w-56">
                                <Select
                                  value={entry.status || 'given'}
                                  onValueChange={val => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, status: val };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md px-2 w-full">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
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
                              <td className="p-2 w-16 md:w-20">
                                <Input
                                  placeholder="Dose 1 / Booster"
                                  value={entry.doseNumber || ''}
                                  onChange={e => {
                                    const next = [...prescriptionData.immunizations];
                                    next[idx] = { ...entry, doseNumber: e.target.value };
                                    setPrescriptionData(prev => ({ ...prev, immunizations: next }));
                                  }}
                                  className="h-8 text-xs bg-white dark:bg-slate-900 w-14 md:w-16"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-1 gap-4">
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

                {/* Referral Fields with enable radio */}
                < div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4" >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-sm font-semibold">Referral (if any)</div>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
});

export default EPrescriptionPad;

