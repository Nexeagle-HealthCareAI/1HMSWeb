import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePrescriptionFieldConfig } from '@/features/prescription/hooks/usePrescriptionFieldConfig';
import { PrescriptionFieldLayoutEditor } from '@/features/prescription/components/PrescriptionFieldLayoutEditor';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { personalizedDataApi, PersonalizedLookupType } from '@/features/prescription/services/personalizedDataApi';
import { personalizedMedicineApi } from '@/features/prescription/services/personalizedMedicineApi';
import {
  Settings,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Activity,
  AlertCircle as AlertCircleIcon,
  FileText,
  Heart,
  Stethoscope,
  CheckCircle as CheckCircleIcon,
  ClipboardList,
  Pill,
  Edit3,
  Plus,
  ToggleLeft,
  ToggleRight,
  Shield,
  Calendar,
  User,
  FileImage,
  Search,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Play,
  Database,
  BookOpen,
  Microscope,
  TestTube,
  Syringe,
  Brain,
  Zap,
  Download,
  Upload,
  Phone,
  Clock,
  LogOut
} from 'lucide-react';

interface FieldConfig {
  id: string;
  label: string;
  enabled: boolean;
}

interface PersonalizedDataItem {
  id: string;
  personalId?: string | null;
  name: string;
  code: string;
  shortDesc: string;
  synonyms: string;
  prefferedId?: number | string;
  usageCount?: number;
  createdAt?: string;
  modifiedAt?: string;
  genericName?: string;
  brandName?: string;
  form?: string;
  dose?: string;
  notes?: string;
  usageDescription?: string;
  sideEffects?: string;
  price?: number;
  manufacturer?: string;
  medicineName?: string;
  strength?: string;
  strengthValue?: string;
  strengthUnit?: string;
  route?: string;
  medicineId?: string;
  dosageForm?: string;
  indication?: string;
}

interface PersonalizedData {
  chiefComplaint: PersonalizedDataItem[];
  history: PersonalizedDataItem[];
  comorbidity: PersonalizedDataItem[];
  examination: PersonalizedDataItem[];
  diagnosis: PersonalizedDataItem[];
  investigations: PersonalizedDataItem[];
  procedures: PersonalizedDataItem[];
  medications: PersonalizedDataItem[];
  discharge: PersonalizedDataItem[];
}

interface PrescriptionCustomizePanelProps {
  showCloseButton?: boolean;
  defaultTab?: 'fields' | 'personalized';
  hidePersonalizedHeader?: boolean;
  overrideDoctorId?: string;
  overrideHospitalId?: string;
}

export const PrescriptionCustomizePanel: React.FC<PrescriptionCustomizePanelProps> = ({
  showCloseButton = true,
  defaultTab = 'fields',
  hidePersonalizedHeader = false,
  overrideDoctorId,
  overrideHospitalId
}) => {
  const [customizeTab, setCustomizeTab] = useState<'fields' | 'playground'>(defaultTab === 'personalized' ? 'playground' : 'fields');
  const { hospitalId: storedHospitalId, doctorId: storedDoctorId } = useAuthStore();
  const hospitalId = overrideHospitalId || storedHospitalId;
  const doctorId = overrideDoctorId || storedDoctorId;
  const { toast } = useToast();

  // Use API hook for field configuration
  const {
    fields,
    updateFieldConfig,
    saveFieldConfiguration,
    isLoadingPreferences,
    isSaving,
    preferencesError
  } = usePrescriptionFieldConfig(overrideDoctorId, overrideHospitalId);

  const [personalizedData, setPersonalizedData] = useState<PersonalizedData>({
    chiefComplaint: [],
    history: [],
    comorbidity: [],
    examination: [],
    diagnosis: [],
    investigations: [],
    procedures: [],
    medications: [],
    discharge: []
  });

  const [selectedPersonalizedCategory, setSelectedPersonalizedCategory] = useState<string>('chiefComplaint');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PersonalizedDataItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const PAGE_SIZE = 8;

  // New item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemShortDesc, setNewItemShortDesc] = useState('');
  const [newItemSynonyms, setNewItemSynonyms] = useState('');
  const [newItemPersonalId, setNewItemPersonalId] = useState<string | null>(null);
  const [newItemGenericName, setNewItemGenericName] = useState('');
  const [newItemBrandName, setNewItemBrandName] = useState('');
  const [newItemForm, setNewItemForm] = useState('');
  const [newItemStrengthValue, setNewItemStrengthValue] = useState('');
  const [newItemStrengthUnit, setNewItemStrengthUnit] = useState('');
  const [newItemRoute, setNewItemRoute] = useState('');
  const [newItemDose, setNewItemDose] = useState('');
  const [newItemIndication, setNewItemIndication] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemMedicineId, setNewItemMedicineId] = useState('');
  const [newItemUsageDescription, setNewItemUsageDescription] = useState('');

  const [newItemSideEffects, setNewItemSideEffects] = useState('');

  const [newItemMedicineName, setNewItemMedicineName] = useState('');
  const [newItemManufacturer, setNewItemManufacturer] = useState('');
  const [newItemStrength, setNewItemStrength] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Edit item states
  const [editItemName, setEditItemName] = useState('');
  const [editItemCode, setEditItemCode] = useState('');
  const [editItemShortDesc, setEditItemShortDesc] = useState('');
  const [editItemSynonyms, setEditItemSynonyms] = useState('');
  const [editItemGenericName, setEditItemGenericName] = useState('');
  const [editItemBrandName, setEditItemBrandName] = useState('');
  const [editItemForm, setEditItemForm] = useState('');
  const [editItemStrengthValue, setEditItemStrengthValue] = useState('');
  const [editItemStrengthUnit, setEditItemStrengthUnit] = useState('');
  const [editItemRoute, setEditItemRoute] = useState('');
  const [editItemDose, setEditItemDose] = useState('');
  const [editItemIndication, setEditItemIndication] = useState('');
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editItemMedicineId, setEditItemMedicineId] = useState('');

  const isMedicationCategory = selectedPersonalizedCategory === 'medications';

  const personalizedDataCategories = [
    { id: 'chiefComplaint', label: 'Chief Complaint', icon: AlertCircleIcon, color: 'text-red-600' },
    { id: 'history', label: 'History', icon: BookOpen, color: 'text-brand-600' },
    { id: 'comorbidity', label: 'Comorbidity', icon: Heart, color: 'text-pink-600' },
    { id: 'examination', label: 'Examination', icon: Stethoscope, color: 'text-purple-600' },
    { id: 'diagnosis', label: 'Diagnosis', icon: Microscope, color: 'text-brand-600' },
    { id: 'investigations', label: 'Investigations', icon: TestTube, color: 'text-cyan-600' },
    { id: 'procedures', label: 'Procedures', icon: Syringe, color: 'text-orange-600' },
    { id: 'medications', label: 'Medications', icon: Pill, color: 'text-green-600' },
    { id: 'discharge', label: 'Discharge Advice', icon: LogOut, color: 'text-rose-600' }
  ];

  // Field configuration is now handled by the API hook


  const renderFieldIcon = (fieldId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      vitals: <Activity className="h-4 w-4" />,
      chiefComplaint: <AlertCircle className="h-4 w-4" />,
      history: <BookOpen className="h-4 w-4" />,
      comorbidity: <Heart className="h-4 w-4" />,
      examination: <Stethoscope className="h-4 w-4" />,
      diagnosis: <Microscope className="h-4 w-4" />,
      investigations: <TestTube className="h-4 w-4" />,
      procedures: <Syringe className="h-4 w-4" />,
      medications: <Pill className="h-4 w-4" />,
      discharge: <LogOut className="h-4 w-4" />,
      nonPharmacologicalAdvice: <ClipboardList className="h-4 w-4" />,
      privateNotes: <FileText className="h-4 w-4" />,
      certificatesNotes: <Shield className="h-4 w-4" />,
      immunizations: <Zap className="h-4 w-4" />,
      followUpReferral: <Calendar className="h-4 w-4" />,
      attachments: <FileImage className="h-4 w-4" />
    };
    return iconMap[fieldId] || <FileText className="h-4 w-4" />;
  };

  const getFilteredPersonalizedDataItems = () => {
    const items = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData] || [];
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query) ||
      item.shortDesc.toLowerCase().includes(query) ||
      item.synonyms.toLowerCase().includes(query) ||
      (item.medicineName && item.medicineName.toLowerCase().includes(query)) ||
      (item.genericName && item.genericName.toLowerCase().includes(query)) ||
      (item.brandName && item.brandName.toLowerCase().includes(query))
    );
  };

  const addPersonalizedDataItem = async (): Promise<boolean> => {
    const lookupTypeMap: Record<string, PersonalizedLookupType> = {
      chiefComplaint: 'CHIEF_COMPLAINT',
      history: 'HISTORY',
      comorbidity: 'COMORBIDITY',
      examination: 'EXAMINATION',
      diagnosis: 'DIAGNOSIS',
      investigations: 'INVESTIGATION',
      procedures: 'PROCEDURE',
      medications: 'MEDICATION',
      discharge: 'DISCHARGE',
    };

    const isMedication = selectedPersonalizedCategory === 'medications';

    if (isMedication) {
      if (!newItemMedicineName.trim()) {
        toast({
          title: 'Medicine Name required',
          description: 'Please enter the Medicine Name.',
          variant: 'destructive',
        });
        return false;
      }
    } else if (!newItemName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name before saving.',
        variant: 'destructive',
      });
      return false;
    }

    setIsAddingItem(true);

    const nowIso = new Date().toISOString();

    const resolvedName = isMedication
      ? (newItemMedicineName.trim() || newItemGenericName.trim() || newItemBrandName.trim() || 'Medication')
      : newItemName;

    const resolvedCode = isMedication ? (newItemMedicineId || newItemCode) : newItemCode;

    const newItem: PersonalizedDataItem = {
      id: editingItem || Date.now().toString(),
      personalId: newItemPersonalId ?? (editingItem || null),
      name: resolvedName,
      code: resolvedCode,
      shortDesc: newItemShortDesc,
      synonyms: newItemSynonyms,
      usageCount: 0,
      createdAt: nowIso,

      modifiedAt: nowIso,
      genericName: newItemGenericName,
      brandName: newItemBrandName,
      form: newItemForm,
      strengthValue: newItemStrengthValue,
      strengthUnit: newItemStrengthUnit,
      route: newItemRoute,
      notes: newItemNotes,
      medicineId: newItemMedicineId,
      usageDescription: newItemUsageDescription,
      sideEffects: newItemSideEffects,
      price: newItemPrice ? Number(newItemPrice) : 0,
      manufacturer: newItemManufacturer,
      medicineName: newItemMedicineName,
      strength: newItemStrength,
      dosageForm: newItemForm, // Mapped to form field
    };

    const resetForm = () => {
      setNewItemName('');
      setNewItemCode('');
      setNewItemShortDesc('');
      setNewItemSynonyms('');
      setNewItemPersonalId(null);
      setNewItemGenericName('');
      setNewItemBrandName('');
      setNewItemForm('');
      setNewItemStrengthValue('');
      setNewItemStrengthUnit('');
      setNewItemRoute('');
      setNewItemDose('');
      setNewItemIndication('');
      setNewItemNotes('');
      setNewItemMedicineId('');
      setNewItemUsageDescription('');

      setNewItemSideEffects('');
      setNewItemPrice('');
      setNewItemManufacturer('');
      setNewItemMedicineName('');
      setNewItemStrength('');
      setEditingItem(null);
      setIsAddingItem(false);
    };

    if (isMedication) {
      if (!doctorId || !hospitalId) {
        setPersonalizedData(prev => {
          const items = prev[selectedPersonalizedCategory as keyof PersonalizedData];
          const next = editingItem
            ? items.map(i => (i.id === editingItem ? newItem : i))
            : [...items, newItem];
          return {
            ...prev,
            [selectedPersonalizedCategory]: next
          };
        });
        setCurrentPage(1);
        setShowAddModal(false);
        resetForm();
        toast({
          title: 'Saved locally',
          description: 'Missing doctor/hospital context. Saved only in this session.',
        });
        return true;
      }

      let success = false;
      try {
        const existingMed = personalizedData.medications.find(m => m.id === editingItem);
        const prefferedId = existingMed?.prefferedId ?? null;

        await personalizedMedicineApi.upsert(doctorId, hospitalId, {
          genericName: newItemGenericName,
          brandName: newItemBrandName,
          form: newItemForm,
          strengthValue: newItemStrengthValue,
          strengthUnit: newItemStrengthUnit,
          route: newItemRoute,
          dose: newItemDose,
          indication: newItemIndication,
          notes: newItemNotes,
          medicineId: newItemMedicineId,
          usageDescription: newItemUsageDescription,

          manufacturer: newItemManufacturer,
          medicineName: newItemMedicineName,
          strength: newItemStrength,
          sideEffects: newItemSideEffects,
          price: newItemPrice,
        }, prefferedId);

        const refreshedMeds = await personalizedMedicineApi.list(doctorId, hospitalId);
        const normalizedMeds = (refreshedMeds || []).map((item, idx) => ({
          id: `${item.prefferedId ?? item.medicineId ?? idx}`,
          prefferedId: item.prefferedId,
          name: item.genericName || item.brandName || '',
          genericName: item.genericName || '',
          brandName: item.brandName || '',
          form: item.form || '',
          notes: item.notes || '',
          usageDescription: item.usageDescription || '',
          manufacturer: item.manufacturer || '',
          medicineName: item.medicineName || '',
          strength: item.strength || '',
          dosageForm: item.dosageForm || '',

          sideEffects: item.sideEffects || '',
          price: item.price || 0,
          code: item.medicineId || '',
          shortDesc: item.brandName || item.genericName || '',
          synonyms: '',
          usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
          modifiedAt: item.lastModifiedAt || '',
        }));

        setPersonalizedData(prev => ({
          ...prev,
          medications: normalizedMeds,
        }));

        setCurrentPage(1);
        success = true;
        toast({
          title: 'Saved',
          description: 'Medication saved successfully.',
        });
      } catch (error) {
        console.error('Failed to save medication', error);
        toast({
          title: 'Save failed',
          description: 'Could not sync medication. Please try again.',
          variant: 'destructive',
        });
      } finally {
        resetForm();
      }

      if (success) {
        setShowAddModal(false);
      }

      return success;
    }

    const lookupType = lookupTypeMap[selectedPersonalizedCategory];
    if (!lookupType || !hospitalId || !doctorId) {
      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: [...prev[selectedPersonalizedCategory as keyof PersonalizedData], newItem]
      }));
      setCurrentPage(1);
      setShowAddModal(false);
      resetForm();
      toast({
        title: 'Saved locally',
        description: 'Missing doctor/hospital context. Saved only in this session.',
        variant: 'default'
      });
      return true;
    }

    let success = false;

    try {
      await personalizedDataApi.upsert(doctorId, hospitalId, lookupType, {
        personalId: newItemPersonalId ?? editingItem ?? null,
        name: newItemName,
        code: newItemCode,
        shortDesc: newItemShortDesc,
        synonyms: newItemSynonyms,
      });

      const refreshed = await personalizedDataApi.list(doctorId, hospitalId, lookupType);
      const normalized = (refreshed || []).map((item, idx) => ({
        id: item.id ?? item.personalId ?? item.code ?? item.name ?? `${lookupType}-${idx}`,
        personalId: item.personalId ?? null,
        name: item.name ?? '',
        code: item.code ?? '',
        shortDesc: item.shortDesc ?? '',
        synonyms: item.synonyms ?? '',
        usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
        createdAt: item.createdAt ?? '',
        modifiedAt: item.modifiedAt ?? '',
      }));

      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: normalized,
      }));

      toast({
        title: 'Saved',
        description: 'Personalized data updated successfully.',
      });
      success = true;
    } catch (error) {
      console.error('Failed to save personalized data', error);
      toast({
        title: 'Save failed',
        description: 'Could not sync to server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      resetForm();
    }

    if (success) {
      setCurrentPage(1);
      setShowAddModal(false);
    }

    return success;
  };

  const deletePersonalizedDataItem = async (itemId: string) => {
    const items = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData] || [];
    const target = items.find(i => i.id === itemId);
    const lookupTypeMap: Record<string, PersonalizedLookupType> = {
      chiefComplaint: 'CHIEF_COMPLAINT',
      history: 'HISTORY',
      comorbidity: 'COMORBIDITY',
      examination: 'EXAMINATION',
      diagnosis: 'DIAGNOSIS',
      investigations: 'INVESTIGATION',
      procedures: 'PROCEDURE',
      medications: 'MEDICATION',
      discharge: 'DISCHARGE',
    };

    const isMedication = selectedPersonalizedCategory === 'medications';

    if (isMedication) {
      // For medications, call the new DELETE endpoint when context is available
      if (!doctorId || !hospitalId) {
        setPersonalizedData(prev => ({
          ...prev,
          [selectedPersonalizedCategory]: prev[selectedPersonalizedCategory as keyof PersonalizedData].filter(item => item.id !== itemId)
        }));
        return;
      }

      try {
        setIsLoadingPersonalized(true);
        if (target?.prefferedId) {
          await personalizedMedicineApi.remove(doctorId, hospitalId, target.prefferedId);
        }
        const refreshedMeds = await personalizedMedicineApi.list(doctorId, hospitalId);
        const normalizedMeds = (refreshedMeds || []).map((item, idx) => ({
          id: `${item.prefferedId ?? item.medicineId ?? idx}`,
          prefferedId: item.prefferedId,
          name: item.genericName || item.brandName || '',
          genericName: item.genericName || '',
          brandName: item.brandName || '',
          form: item.form || '',
          notes: item.notes || '',
          usageDescription: item.usageDescription || '',
          sideEffects: item.sideEffects || '',
          code: item.medicineId || '',
          shortDesc: item.brandName || item.genericName || '',
          synonyms: '',
          usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
          manufacturer: item.manufacturer || '',
          medicineName: item.medicineName || '',
          strength: item.strength || '',
          dosageForm: item.dosageForm || '',

          modifiedAt: item.lastModifiedAt || '',
          price: item.price || 0,
        }));

        setPersonalizedData(prev => ({
          ...prev,
          medications: normalizedMeds,
        }));

        toast({
          title: 'Deleted',
          description: 'Medication removed successfully.',
        });
      } catch (error) {
        console.error('Failed to delete personalized medication', error);
        toast({
          title: 'Delete failed',
          description: 'Could not delete medication. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPersonalized(false);
      }

      return;
    }

    if (!target || !doctorId || !hospitalId || !target.personalId) {
      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: prev[selectedPersonalizedCategory as keyof PersonalizedData].filter(item => item.id !== itemId)
      }));
      return;
    }

    const lookupType = lookupTypeMap[selectedPersonalizedCategory];
    if (!lookupType) {
      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: prev[selectedPersonalizedCategory as keyof PersonalizedData].filter(item => item.id !== itemId)
      }));
      return;
    }

    try {
      setIsLoadingPersonalized(true);
      await personalizedDataApi.remove(doctorId, hospitalId, target.personalId);
      const refreshed = await personalizedDataApi.list(doctorId, hospitalId, lookupType);
      const normalized = (refreshed || []).map((item, idx) => ({
        id: item.id ?? item.personalId ?? item.code ?? item.name ?? `${lookupType}-${idx}`,
        personalId: item.personalId ?? null,
        name: item.name ?? '',
        code: item.code ?? '',
        shortDesc: item.shortDesc ?? '',
        synonyms: item.synonyms ?? '',
        usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
        createdAt: item.createdAt ?? '',
        modifiedAt: item.modifiedAt ?? '',
      }));

      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: normalized,
      }));

      toast({
        title: 'Deleted',
        description: 'Personalized data removed successfully.',
      });
    } catch (error) {
      console.error('Failed to delete personalized data', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete on server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPersonalized(false);
    }
  };

  const editPersonalizedDataItem = (itemId: string) => {
    const item = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData].find(i => i.id === itemId);
    if (item) {
      setEditingItem(item.id);
      setShowAddModal(true);
      setNewItemPersonalId(item.personalId ?? item.id ?? null);
      setNewItemName(item.name);
      setNewItemCode(item.code);
      setNewItemShortDesc(item.shortDesc);
      setNewItemSynonyms(item.synonyms);
      setNewItemGenericName(item.genericName || '');
      setNewItemBrandName(item.brandName || '');
      setNewItemForm(item.form || '');
      setNewItemDose(item.dose || '');
      setNewItemNotes(item.notes || '');
      setNewItemUsageDescription(item.usageDescription || '');
      setNewItemSideEffects(item.sideEffects || '');
      setNewItemPrice(item.price ? String(item.price) : '');
      setNewItemManufacturer(item.manufacturer || '');
      setNewItemMedicineName(item.medicineName || '');
      setNewItemStrength(item.strength || '');
    }
  };

  const getNamePlaceholder = (category: string) => {
    const placeholders: { [key: string]: string } = {
      chiefComplaint: 'e.g., Chest pain',
      history: 'e.g., Diabetes mellitus',
      comorbidity: 'e.g., Hypertension',
      examination: 'e.g., Physical examination findings',
      diagnosis: 'e.g., Myocardial infarction',
      investigations: 'e.g., ECG, Blood tests',
      procedures: 'e.g., Angioplasty',
      medications: 'e.g., Atorvastatin',
      discharge: 'e.g., Complete bed rest for 1 week'
    };
    return placeholders[category] || 'Enter name';
  };

  const getCodePlaceholder = (category: string) => {
    const placeholders: { [key: string]: string } = {
      chiefComplaint: 'e.g., CC001',
      history: 'e.g., H001',
      comorbidity: 'e.g., C001',
      examination: 'e.g., EX001',
      diagnosis: 'e.g., DX001',
      investigations: 'e.g., INV001',
      procedures: 'e.g., PROC001',
      discharge: 'e.g., DA001',
    };
    return placeholders[category] || 'Enter code';
  };

  const getShortDescPlaceholder = (category: string) => {
    const placeholders: { [key: string]: string } = {
      chiefComplaint: 'e.g., Acute chest pain',
      history: 'e.g., Type 2 diabetes',
      comorbidity: 'e.g., Essential hypertension',
      examination: 'e.g., Cardiovascular examination',
      diagnosis: 'e.g., Acute coronary syndrome',
      investigations: 'e.g., Cardiac enzymes',
      procedures: 'e.g., Percutaneous intervention',
      medications: 'e.g., Lipid-lowering agent',
      discharge: 'e.g., Restrict activity, avoid exertion'
    };
    return placeholders[category] || 'Enter description';
  };

  const getSynonymsPlaceholder = (category: string) => {
    const placeholders: { [key: string]: string } = {
      chiefComplaint: 'e.g., Chest discomfort, Angina',
      history: 'e.g., DM, Diabetes',
      comorbidity: 'e.g., HTN, High BP',
      examination: 'e.g., Physical exam, Clinical findings',
      diagnosis: 'e.g., MI, Heart attack',
      investigations: 'e.g., Lab tests, Diagnostic tests',
      procedures: 'e.g., PCI, Stent placement',
      medications: 'e.g., Statin, Lipid drug',
      discharge: 'e.g., Rest, Activity restriction'
    };
    return placeholders[category] || 'Enter synonyms';
  };

  const handleSort = (key: string) => {
    setSortBy(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIndicator = (key: string) => {
    if (sortBy.key !== key) return null;
    return <span className="ml-1">{sortBy.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  const getSortValue = (item: PersonalizedDataItem, key: string): string | number => {
    const value = (item as any)?.[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value.toLowerCase();
    return '';
  };

  const formatDisplayDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  useEffect(() => {
    // Load personalized data
    const saved = localStorage.getItem('prescription-personalized-data');
    if (saved) {
      try {
        setPersonalizedData(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading personalized data:', error);
      }
    }

    // Field configuration is now loaded via API
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPersonalizedCategory, searchQuery]);

  useEffect(() => {
    const lookupTypeMap: Record<string, PersonalizedLookupType> = {
      chiefComplaint: 'CHIEF_COMPLAINT',
      history: 'HISTORY',
      comorbidity: 'COMORBIDITY',
      examination: 'EXAMINATION',
      diagnosis: 'DIAGNOSIS',
      investigations: 'INVESTIGATION',
      procedures: 'PROCEDURE',
      medications: 'MEDICATION',
      discharge: 'DISCHARGE',
    };

    const fetchCategory = async () => {
      if (!doctorId || !hospitalId) return;

      const lookupType = lookupTypeMap[selectedPersonalizedCategory];
      setIsLoadingPersonalized(true);

      try {
        if (selectedPersonalizedCategory === 'medications') {
          const meds = await personalizedMedicineApi.list(doctorId, hospitalId);
          const normalized = (meds || []).map((item, idx) => ({
            id: `${item.prefferedId ?? item.medicineId ?? idx}`,
            prefferedId: item.prefferedId,
            name: item.genericName || item.brandName || '',
            genericName: item.genericName || '',
            brandName: item.brandName || '',
            form: item.form || '',
            strengthValue: item.strengthValue || '',
            strengthUnit: item.strengthUnit || '',
            route: item.route || '',
            dose: item.dose || '',
            indication: item.indication || '',
            notes: item.notes || '',
            medicineId: item.medicineId || '',
            usageDescription: item.usageDescription || '',
            sideEffects: item.sideEffects || '',
            code: item.medicineId || '',
            shortDesc: item.brandName || item.genericName || '',
            synonyms: '',
            usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,

            modifiedAt: item.lastModifiedAt || '',
            price: item.price || 0,
            manufacturer: item.manufacturer || '',
            medicineName: item.medicineName || '',
            strength: item.strength || item.strengthValue || '',
            dosageForm: item.dosageForm || '',
          }));

          setPersonalizedData(prev => ({
            ...prev,
            medications: normalized,
          }));
        } else if (lookupType) {
          const refreshed = await personalizedDataApi.list(doctorId, hospitalId, lookupType);
          const normalized = (refreshed || []).map((item, idx) => ({
            id: item.id ?? item.personalId ?? item.code ?? item.name ?? `${lookupType}-${idx}`,
            personalId: item.personalId ?? null,
            name: item.name ?? '',
            code: item.code ?? '',
            shortDesc: item.shortDesc ?? '',
            synonyms: item.synonyms ?? '',
            usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
            createdAt: item.createdAt ?? '',
            modifiedAt: item.modifiedAt ?? '',
          }));

          setPersonalizedData(prev => ({
            ...prev,
            [selectedPersonalizedCategory]: normalized,
          }));
        }
      } catch (error) {
        console.error('Failed to load personalized data', error);
        toast({
          title: 'Load failed',
          description: 'Could not fetch personalized data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPersonalized(false);
      }
    };

    fetchCategory();
  }, [selectedPersonalizedCategory, doctorId, hospitalId]);

  useEffect(() => {
    const filtered = getFilteredPersonalizedDataItems();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [personalizedData, selectedPersonalizedCategory, searchQuery, currentPage]);

  useEffect(() => {
    // Save personalized data
    localStorage.setItem('prescription-personalized-data', JSON.stringify(personalizedData));
  }, [personalizedData]);

  return (
    <div className="h-full w-full flex flex-col text-gray-900 dark:text-gray-100">

      {/* Direct Content - No Internal Navigation */}
      <div className={`flex-1 flex flex-col h-full w-full gap-3 sm:gap-4 ${showCloseButton ? 'max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4' : 'p-2 sm:p-4'}`}>
        {customizeTab === 'fields' ? (
          <PrescriptionFieldLayoutEditor overrideDoctorId={overrideDoctorId} />
        ) : (
          <div className="h-full flex flex-col">
            {/* Sidebar Layout - Mobile Responsive */}
            <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-visible">
              {/* Enhanced Category Sidebar - Mobile Responsive: Horizontal Scroll on Mobile, Vertical on Desktop */}
              <div className="w-full sm:w-64 flex-shrink-0 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 flex-shrink-0 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                      <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Medical Categories</h4>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-auto sm:overflow-x-hidden p-3 no-scrollbar min-h-0 bg-white dark:bg-gray-900">
                  <div className="flex flex-row sm:flex-col gap-1.5 w-full">
                    {personalizedDataCategories.map((category) => {
                      const IconComponent = category.icon;
                      const isSelected = selectedPersonalizedCategory === category.id;

                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedPersonalizedCategory(category.id)}
                          className={`group flex-shrink-0 sm:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden ${isSelected
                            ? 'bg-brand-50/80 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-brand-500 rounded-r-full" />
                          )}
                          <div className={`p-1.5 rounded-md flex-shrink-0 transition-colors ${isSelected 
                            ? 'bg-brand-100/50 dark:bg-brand-400/20 text-brand-600 dark:text-brand-400' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                          }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className="whitespace-nowrap sm:whitespace-normal truncate">{category.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main Content Area - Mobile Responsive */}
              <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden">
                {/* Content Header - Mobile Responsive */}
                <div className="flex-shrink-0 p-3 sm:p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      {React.createElement(personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.icon || FileText, {
                        className: `h-3 w-3 sm:h-4 sm:w-4 ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.color}`
                      })}
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                        ({personalizedData[selectedPersonalizedCategory as keyof PersonalizedData]?.length || 0} templates)
                      </span>
                    </div>
                    <div className="w-full sm:max-w-md flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                          <Input
                            placeholder={`Search ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label.toLowerCase()} templates...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-6 sm:pl-8 h-7 sm:h-8 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowAddModal(true)}
                        className="bg-green-600 hover:bg-green-700 h-8 sm:h-8 px-3 sm:px-4 text-xs sm:text-sm shadow-lg"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Add {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* legacy inline add form removed */}

                {/* Tabular Data Display - Mobile Responsive */}
                <div className="flex-1 overflow-visible bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  {(() => {
                    const filteredItems = getFilteredPersonalizedDataItems();

                    const sortedItems = [...filteredItems].sort((a, b) => {
                      const aVal = getSortValue(a, sortBy.key);
                      const bVal = getSortValue(b, sortBy.key);
                      if (aVal === bVal) return 0;
                      if (aVal > bVal) return sortBy.direction === 'asc' ? 1 : -1;
                      return sortBy.direction === 'asc' ? -1 : 1;
                    });

                    const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
                    const page = Math.min(currentPage, totalPages);
                    const startIndex = (page - 1) * PAGE_SIZE;
                    const paginatedItems = sortedItems.slice(startIndex, startIndex + PAGE_SIZE);

                    return (
                      <div className="p-2 sm:p-3">
                        {isLoadingPersonalized ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 min-h-[200px]">
                            <Activity className="h-6 w-6 mb-2 animate-spin" />
                            <p className="text-sm">Loading templates...</p>
                          </div>
                        ) : filteredItems.length > 0 ? (
                          <div className="space-y-3">
                            {/* Mobile cards */}
                            <motion.div
                              className="sm:hidden space-y-3"
                              initial="hidden"
                              animate="visible"
                              variants={{
                                visible: { transition: { staggerChildren: 0.05 } },
                                hidden: {}
                              }}
                            >
                              <AnimatePresence mode="popLayout">
                                {paginatedItems.map((item) => (
                                  <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className={`relative overflow-hidden border rounded-xl p-3 shadow-sm bg-white dark:bg-gray-800 transition-colors ${(item.usageCount ?? 0) >= 10
                                      ? 'border-yellow-300 dark:border-yellow-600/50'
                                      : (item.usageCount ?? 0) >= 5
                                        ? 'border-slate-300 dark:border-slate-600/50'
                                        : 'border-gray-200 dark:border-gray-800'
                                      }`}
                                  >
                                    {/* Gamification Indicator Background for high usage */}
                                    {(item.usageCount ?? 0) >= 10 && (
                                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
                                    )}
                                    <div className="relative flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                          {selectedPersonalizedCategory === 'medications' ? item.genericName || item.name : item.name}
                                        </p>
                                        {selectedPersonalizedCategory === 'medications' && item.brandName && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Brand: {item.brandName}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          onClick={() => editPersonalizedDataItem(item.id)}
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 bg-white/50 backdrop-blur-sm"
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          onClick={() => setPendingDeleteItem(item)}
                                          variant="destructive"
                                          size="sm"
                                          className="h-7 px-2"
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="relative mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                                      {selectedPersonalizedCategory === 'medications' ? (
                                        <>
                                          <p><span className="font-semibold">Strength:</span> {item.strengthValue} {item.strengthUnit}</p>
                                          <p><span className="font-semibold">Form:</span> {item.form}</p>
                                          <p><span className="font-semibold">Route:</span> {item.route}</p>
                                          <p><span className="font-semibold">Dose:</span> {item.dose}</p>
                                          {item.indication && <p><span className="font-semibold">Indication:</span> {item.indication}</p>}
                                          {item.notes && <p><span className="font-semibold">Notes:</span> {item.notes}</p>}
                                          {item.medicineId && <p><span className="font-semibold">Medicine ID:</span> {item.medicineId}</p>}
                                        </>
                                      ) : (
                                        <>
                                          {item.code && <p><span className="font-semibold">Code:</span> {item.code}</p>}
                                          {item.shortDesc && <p><span className="font-semibold">Description:</span> {item.shortDesc}</p>}
                                        </>
                                      )}

                                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                          Usage:
                                          <motion.span
                                            whileHover={{ scale: 1.1, rotate: [-2, 2, -2, 0] }}
                                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm border ${(item.usageCount ?? 0) >= 10
                                              ? 'bg-gradient-to-r from-yellow-200 to-amber-300 text-amber-900 border-yellow-400'
                                              : (item.usageCount ?? 0) >= 5
                                                ? 'bg-gradient-to-r from-gray-200 to-slate-200 text-slate-800 border-gray-400'
                                                : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                                              }`}
                                          >
                                            {(item.usageCount ?? 0) >= 10 && <Zap className="w-2.5 h-2.5 mr-0.5 text-amber-600 fill-amber-500" />}
                                            {(item.usageCount ?? 0) >= 5 && (item.usageCount ?? 0) < 10 && <Zap className="w-2.5 h-2.5 mr-0.5 text-slate-500 fill-slate-400" />}
                                            {item.usageCount ?? 0}
                                          </motion.span>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400">Modified: {formatDisplayDate(item.modifiedAt)}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </motion.div>

                            {/* Desktop / tablet table */}
                            <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                              <table className="w-full text-xs sm:text-sm text-gray-800 dark:text-gray-100">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <th
                                      className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm cursor-pointer select-none"
                                      onClick={() => handleSort('name')}
                                    >
                                      {selectedPersonalizedCategory === 'medications' ? 'Medicine Name' : 'Name'} {renderSortIndicator('name')}
                                    </th>
                                    {selectedPersonalizedCategory !== 'medications' && (
                                      <th
                                        className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden sm:table-cell cursor-pointer select-none"
                                        onClick={() => handleSort('code')}
                                      >
                                        Code {renderSortIndicator('code')}
                                      </th>
                                    )}
                                    <th
                                      className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden lg:table-cell cursor-pointer select-none"
                                      onClick={() => handleSort('usageCount')}
                                    >
                                      UsageCount {renderSortIndicator('usageCount')}
                                    </th>
                                    {selectedPersonalizedCategory === 'medications' && (
                                      <>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('genericName')}>
                                          Generic {renderSortIndicator('genericName')}
                                        </th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('dosageForm')}>
                                          Form / Strength {renderSortIndicator('dosageForm')}
                                        </th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden xl:table-cell cursor-pointer select-none" onClick={() => handleSort('usageDescription')}>
                                          Description {renderSortIndicator('usageDescription')}
                                        </th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden xl:table-cell cursor-pointer select-none" onClick={() => handleSort('sideEffects')}>
                                          Side Effects {renderSortIndicator('sideEffects')}
                                        </th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('price')}>
                                          Price {renderSortIndicator('price')}
                                        </th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden 2xl:table-cell cursor-pointer select-none" onClick={() => handleSort('notes')}>
                                          Notes {renderSortIndicator('notes')}
                                        </th>
                                      </>
                                    )}
                                    {selectedPersonalizedCategory !== 'medications' && (
                                      <th
                                        className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden md:table-cell cursor-pointer select-none"
                                        onClick={() => handleSort('shortDesc')}
                                      >
                                        Description {renderSortIndicator('shortDesc')}
                                      </th>
                                    )}
                                    <th
                                      className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm hidden xl:table-cell cursor-pointer select-none"
                                      onClick={() => handleSort('modifiedAt')}
                                    >
                                      Last Modified {renderSortIndicator('modifiedAt')}
                                    </th>
                                    <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm">Actions</th>
                                  </tr>
                                </thead>
                                <motion.tbody
                                  className="divide-y divide-gray-100 dark:divide-gray-800"
                                  initial="hidden"
                                  animate="visible"
                                  variants={{
                                    visible: { transition: { staggerChildren: 0.03 } },
                                    hidden: {}
                                  }}
                                >
                                  <AnimatePresence mode="popLayout">
                                    {paginatedItems.map((item) => (
                                      <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        whileHover={{ x: 2, scale: 1.002, backgroundColor: 'var(--tw-colors-gray-50)' }}
                                        transition={{ duration: 0.2 }}
                                        className={`group relative hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors ${(item.usageCount ?? 0) >= 10
                                          ? 'bg-yellow-50/20 dark:bg-yellow-900/10'
                                          : ''
                                          }`}
                                      >
                                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 align-top">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                                              {selectedPersonalizedCategory === 'medications' ? item.medicineName || item.genericName || item.name : item.name}
                                            </span>
                                            {selectedPersonalizedCategory === 'medications' && (
                                              <>
                                                {item.brandName && <span className="text-[11px] text-gray-500 dark:text-gray-400">Brand: {item.brandName}</span>}
                                                {item.manufacturer && <span className="text-[11px] text-gray-400 dark:text-gray-500">Mfr: {item.manufacturer}</span>}
                                              </>
                                            )}
                                          </div>
                                        </td>

                                        {selectedPersonalizedCategory !== 'medications' && (
                                          <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden sm:table-cell align-top">
                                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 text-[11px] font-medium">{item.code || '-'}</span>
                                          </td>
                                        )}

                                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell align-top">
                                          <motion.span
                                            whileHover={{ scale: 1.1, rotate: [-2, 2, -2, 0] }}
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm border cursor-default ${(item.usageCount ?? 0) >= 10
                                              ? 'bg-gradient-to-r from-yellow-200 to-amber-300 text-amber-900 border-yellow-400'
                                              : (item.usageCount ?? 0) >= 5
                                                ? 'bg-gradient-to-r from-gray-200 to-slate-200 text-slate-800 border-gray-400'
                                                : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                                              }`}
                                          >
                                            {(item.usageCount ?? 0) >= 10 && <Zap className="w-3 h-3 mr-1 text-amber-600 fill-amber-500" />}
                                            {(item.usageCount ?? 0) >= 5 && (item.usageCount ?? 0) < 10 && <Zap className="w-3 h-3 mr-1 text-slate-500 fill-slate-400" />}
                                            {item.usageCount ?? 0} used
                                          </motion.span>
                                        </td>

                                        {selectedPersonalizedCategory === 'medications' ? (
                                          <>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden lg:table-cell">
                                              <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{item.genericName || '-'}</span>
                                            </td>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden lg:table-cell">
                                              <div className="flex flex-col">
                                                <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{item.dosageForm || item.form || '-'}</span>
                                                {(item.strength || item.strengthValue) && <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.strength || item.strengthValue}</span>}
                                              </div>
                                            </td>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden xl:table-cell">
                                              <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm truncate max-w-[150px] inline-block" title={item.usageDescription}>{item.usageDescription || '-'}</span>
                                            </td>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden xl:table-cell">
                                              <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm truncate max-w-[150px] inline-block" title={item.sideEffects}>{item.sideEffects || '-'}</span>
                                            </td>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden lg:table-cell">
                                              <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{item.price ? `₹${item.price}` : '-'}</span>
                                            </td>
                                            <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden 2xl:table-cell">
                                              <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm truncate max-w-[150px] inline-block" title={item.notes}>{item.notes || '-'}</span>
                                            </td>
                                          </>
                                        ) : (
                                          <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell align-top">
                                            <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                                              {item.shortDesc}
                                            </span>
                                          </td>
                                        )}

                                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell align-top">
                                          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                                            {formatDisplayDate(item.modifiedAt)}
                                          </span>
                                        </td>

                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3">
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              onClick={() => editPersonalizedDataItem(item.id)}
                                              variant="outline"
                                              size="sm"
                                              className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                            >
                                              <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            </Button>
                                            <Button
                                              onClick={() => setPendingDeleteItem(item)}
                                              variant="outline"
                                              size="sm"
                                              className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </AnimatePresence>
                                </motion.tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="text-gray-600 dark:text-gray-300">
                                Showing {filteredItems.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={page <= 1}
                                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                  className="h-7 px-2"
                                >
                                  Prev
                                </Button>
                                <span className="text-gray-700 dark:text-gray-200">
                                  Page {page} / {totalPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={page >= totalPages}
                                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                  className="h-7 px-2"
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 min-h-[200px]">
                            <Database className="h-8 w-8 mb-2" />
                            <p className="text-sm">No {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label.toLowerCase()} templates found</p>
                            <p className="text-xs">Add your first {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label.toLowerCase()} template to get started</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer - Only show when not in settings context */}
      {showCloseButton && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            </div>
            <Button
              onClick={() => console.log('Save configuration')}
              className="px-4 text-xs bg-brand-600 hover:bg-brand-700"
              size="sm"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Drawer */}
      <AnimatePresence>
        {!!pendingDeleteItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingDeleteItem(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Delete {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label || 'item'}
                  </h3>
                  <Button
                    onClick={() => setPendingDeleteItem(null)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center rounded-full mb-2">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Are you sure?</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {`Do you really want to delete ${pendingDeleteItem?.name ? '"' + pendingDeleteItem.name + '"' : 'this item'}? This action cannot be undone.`}
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setPendingDeleteItem(null)}
                  className="h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="h-10 px-4 min-w-[100px]"
                  disabled={isLoadingPersonalized || !pendingDeleteItem}
                  onClick={async () => {
                    if (!pendingDeleteItem) return;
                    await deletePersonalizedDataItem(pendingDeleteItem.id);
                    setPendingDeleteItem(null);
                  }}
                >
                  {isLoadingPersonalized ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Item Drawer */}
      <AnimatePresence>
        {showAddModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingItem(null);
                setNewItemPersonalId(null);
              }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {editingItem ? <Edit3 className="h-5 w-5 text-brand-600" /> : <Plus className="h-5 w-5 text-green-600" />}
                    {editingItem ? 'Edit' : 'Add'} {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                  </h3>
                  <Button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      setNewItemPersonalId(null);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-5">
                  {isMedicationCategory ? (
                    <>
                      {/* 1. Medicine Name & 2. Brand Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Medicine Name <span className="text-red-500">*</span></label>
                          <Input
                            value={newItemMedicineName}
                            onChange={(e) => setNewItemMedicineName(e.target.value)}
                            placeholder="e.g., Crocin Advance"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Brand Name</label>
                          <Input
                            value={newItemBrandName}
                            onChange={(e) => setNewItemBrandName(e.target.value)}
                            placeholder="e.g., Crocin"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                      </div>

                      {/* 3. Generic Name & 4. Manufacturer Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Generic Name</label>
                          <Input
                            value={newItemGenericName}
                            onChange={(e) => setNewItemGenericName(e.target.value)}
                            placeholder="e.g., Acetaminophen"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Manufacturer Name</label>
                          <Input
                            value={newItemManufacturer}
                            onChange={(e) => setNewItemManufacturer(e.target.value)}
                            placeholder="e.g., GSK"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                      </div>

                      {/* 5. Dosage Form, 6. Strength & 9. Price */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Dosage Form</label>
                          <Input
                            value={newItemForm}
                            onChange={(e) => setNewItemForm(e.target.value)}
                            placeholder="e.g., Tablet"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Strength</label>
                          <Input
                            value={newItemStrength}
                            onChange={(e) => setNewItemStrength(e.target.value)}
                            placeholder="e.g., 500 mg"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Price</label>
                          <Input
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            placeholder="e.g., 12.50"
                            className="bg-gray-50 dark:bg-gray-900 h-10"
                          />
                        </div>
                      </div>

                      {/* 7. Usage Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Usage Description</label>
                        <Input
                          value={newItemUsageDescription}
                          onChange={(e) => setNewItemUsageDescription(e.target.value)}
                          placeholder="e.g., For Fever"
                          className="bg-gray-50 dark:bg-gray-900 h-10"
                        />
                      </div>

                      {/* 8. Side Effects */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Side Effects</label>
                        <Input
                          value={newItemSideEffects}
                          onChange={(e) => setNewItemSideEffects(e.target.value)}
                          placeholder="e.g., Drowsiness"
                          className="bg-gray-50 dark:bg-gray-900 h-10"
                        />
                      </div>

                      {/* 10. Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Notes</label>
                        <Input
                          value={newItemNotes}
                          onChange={(e) => setNewItemNotes(e.target.value)}
                          placeholder="Any special instructions"
                          className="bg-gray-50 dark:bg-gray-900 h-10"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={getNamePlaceholder(selectedPersonalizedCategory)}
                            className="bg-gray-50 dark:bg-gray-900 h-10 border-gray-300 dark:border-gray-700 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Code</label>
                          <Input
                            value={newItemCode}
                            onChange={(e) => setNewItemCode(e.target.value)}
                            placeholder={getCodePlaceholder(selectedPersonalizedCategory)}
                            className="bg-gray-50 dark:bg-gray-900 h-10 border-gray-300 dark:border-gray-700 shadow-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Description</label>
                        <Input
                          value={newItemShortDesc}
                          onChange={(e) => setNewItemShortDesc(e.target.value)}
                          placeholder={getShortDescPlaceholder(selectedPersonalizedCategory)}
                          className="bg-gray-50 dark:bg-gray-900 h-10 border-gray-300 dark:border-gray-700 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Synonyms</label>
                        <Input
                          value={newItemSynonyms}
                          onChange={(e) => setNewItemSynonyms(e.target.value)}
                          placeholder={getSynonymsPlaceholder(selectedPersonalizedCategory)}
                          className="bg-gray-50 dark:bg-gray-900 h-10 border-gray-300 dark:border-gray-700 shadow-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Comma adjusted (e.g., "fast pulse, tachycardia")</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setNewItemPersonalId(null);
                  }}
                  variant="outline"
                  className="h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await addPersonalizedDataItem();
                  }}
                  disabled={
                    isAddingItem ||
                    (!isMedicationCategory && !newItemName.trim()) ||
                    (isMedicationCategory && !newItemGenericName.trim() && !newItemBrandName.trim() && !newItemMedicineName.trim())
                  }
                  className="bg-brand-600 hover:bg-brand-700 h-10 px-6 shadow-md"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isAddingItem
                    ? 'Saving...'
                    : editingItem
                      ? `Update ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}`
                      : `Add ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
export default PrescriptionCustomizePanel;