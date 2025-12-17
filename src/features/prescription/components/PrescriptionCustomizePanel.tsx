import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePrescriptionFieldConfig } from '@/features/prescription/hooks/usePrescriptionFieldConfig';
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
  Clock
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
  strengthValue?: string;
  strengthUnit?: string;
  route?: string;
  dose?: string;
  indication?: string;
  notes?: string;
  medicineId?: string;
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
}

interface PrescriptionCustomizePanelProps {
  showCloseButton?: boolean;
  defaultTab?: 'fields' | 'personalized';
  hidePersonalizedHeader?: boolean;
}

export const PrescriptionCustomizePanel: React.FC<PrescriptionCustomizePanelProps> = ({ 
  showCloseButton = true,
  defaultTab = 'fields',
  hidePersonalizedHeader = false
}) => {
  const [customizeTab, setCustomizeTab] = useState<'fields' | 'playground'>(defaultTab === 'personalized' ? 'playground' : 'fields');
  const { hospitalId, doctorId } = useAuthStore();
  const { toast } = useToast();
  
  // Use API hook for field configuration
  const {
    fields,
    updateFieldConfig,
    saveFieldConfiguration,
    isLoadingPreferences,
    isSaving,
    preferencesError
  } = usePrescriptionFieldConfig();

  const [personalizedData, setPersonalizedData] = useState<PersonalizedData>({
    chiefComplaint: [],
    history: [],
    comorbidity: [],
    examination: [],
    diagnosis: [],
    investigations: [],
    procedures: [],
    medications: []
  });

  const [selectedPersonalizedCategory, setSelectedPersonalizedCategory] = useState<string>('chiefComplaint');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PersonalizedDataItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    { id: 'history', label: 'History', icon: BookOpen, color: 'text-blue-600' },
    { id: 'comorbidity', label: 'Comorbidity', icon: Heart, color: 'text-pink-600' },
    { id: 'examination', label: 'Examination', icon: Stethoscope, color: 'text-purple-600' },
    { id: 'diagnosis', label: 'Diagnosis', icon: Microscope, color: 'text-indigo-600' },
    { id: 'investigations', label: 'Investigations', icon: TestTube, color: 'text-cyan-600' },
    { id: 'procedures', label: 'Procedures', icon: Syringe, color: 'text-orange-600' },
    { id: 'medications', label: 'Medications', icon: Pill, color: 'text-green-600' }
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
      item.synonyms.toLowerCase().includes(query)
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
    };

    const isMedication = selectedPersonalizedCategory === 'medications';

    if (isMedication) {
      if (!newItemGenericName.trim() && !newItemBrandName.trim()) {
        toast({
          title: 'Generic or brand required',
          description: 'Please enter a generic name (preferred) or brand name.',
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
      ? (newItemGenericName.trim() || newItemBrandName.trim() || newItemMedicineId.trim() || 'Medication')
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
      dose: newItemDose,
      indication: newItemIndication,
      notes: newItemNotes,
      medicineId: newItemMedicineId
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
        }, prefferedId);

        const refreshedMeds = await personalizedMedicineApi.list(doctorId, hospitalId);
        const normalizedMeds = (refreshedMeds || []).map((item, idx) => ({
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
          code: item.medicineId || '',
          shortDesc: item.brandName || item.genericName || '',
          synonyms: '',
          usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
          modifiedAt: item.modifiedAt || item.lastModifiedAt || '',
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
    };

    const isMedication = selectedPersonalizedCategory === 'medications';

    if (!target || isMedication || !doctorId || !hospitalId || !target.personalId) {
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
      setNewItemStrengthValue(item.strengthValue || '');
      setNewItemStrengthUnit(item.strengthUnit || '');
      setNewItemRoute(item.route || '');
      setNewItemDose(item.dose || '');
      setNewItemIndication(item.indication || '');
      setNewItemNotes(item.notes || '');
      setNewItemMedicineId(item.medicineId || '');
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
      medications: 'e.g., Atorvastatin'
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
      medications: 'e.g., Lipid-lowering agent'
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
      medications: 'e.g., Statin, Lipid drug'
    };
    return placeholders[category] || 'Enter synonyms';
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
            code: item.medicineId || '',
            shortDesc: item.brandName || item.genericName || '',
            synonyms: '',
            usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
            modifiedAt: item.modifiedAt || item.lastModifiedAt || '',
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
    const items = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData] || [];
    const filtered = searchQuery.trim()
      ? items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items;
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
    <div className="w-full bg-white flex flex-col" style={{ minHeight: '100vh' }}>

      {/* Direct Content - No Internal Navigation */}
      <div className="flex-1 flex flex-col h-full">
        {customizeTab === 'fields' ? (
          <div className="h-full flex flex-col">
            {/* Enhanced Fields Header - Mobile Responsive */}
            <div className="flex-shrink-0 p-2 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-200">Prescription Fields</h3>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 hidden sm:block">• Green = Active • Click ON/OFF to toggle</p>
                    {isLoadingPreferences && (
                      <p className="text-xs text-blue-600">Loading preferences...</p>
                    )}
                    {preferencesError && (
                      <p className="text-xs text-red-600">Failed to load preferences. Using defaults.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:ml-auto items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 bg-white/70 dark:bg-blue-900/30 rounded-md px-2.5 py-1 border border-blue-200/70 dark:border-blue-800/60">
                    <span className="font-semibold">{fields.filter(f => f.enabled).length}</span> of <span className="font-semibold">{fields.length}</span> fields enabled
                  </div>
                  <Button 
                    onClick={saveFieldConfiguration}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 text-xs sm:text-sm transition-colors w-full sm:w-auto disabled:opacity-50"
                  >
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Compact Field Grid - Mobile Responsive */}
            <div className="flex-1 p-2 sm:p-3 overflow-hidden">
              <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3">
                {fields.map((field) => (
                <div 
                  key={field.id} 
                    className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
                    field.enabled 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <div className={`p-1 sm:p-1.5 rounded-md flex-shrink-0 ${
                        field.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {renderFieldIcon(field.id)}
                    </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate block">{field.label}</span>
                    </div>
                  </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateFieldConfig(field.id, !field.enabled)}
                        className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          field.enabled
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {field.enabled ? 'ON' : 'OFF'}
                      </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
            
          </div>
        ) : (
            <div className="h-full flex flex-col">
            {/* Sidebar Layout - Mobile Responsive */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Enhanced Category Sidebar - Mobile Responsive */}
              <div className="w-full sm:w-64 flex-shrink-0 border-r-0 sm:border-r border-b sm:border-b-0 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">Medical Categories</h4>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                      {personalizedDataCategories.map((category) => {
                        const IconComponent = category.icon;
                        const isSelected = selectedPersonalizedCategory === category.id;
                        
                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedPersonalizedCategory(category.id)}
                          className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg text-xs sm:text-sm transition-all duration-300 ${
                              isSelected
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 border-2 border-green-300 dark:border-green-600 shadow-lg scale-105'
                              : 'hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:scale-102'
                          }`}
                        >
                          <div className={`p-1 rounded-md flex-shrink-0 ${isSelected ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-600'}`}>
                            <IconComponent className={`h-3 w-3 sm:h-4 sm:w-4 ${category.color}`} />
                            </div>
                          <span className="flex-1 text-left truncate font-medium">{category.label}</span>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full animate-pulse"></div>
                          )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              {/* Main Content Area - Mobile Responsive */}
                <div className="flex-1 flex flex-col">
                {/* Content Header - Mobile Responsive */}
                <div className="flex-shrink-0 p-2 sm:p-3 border-b border-gray-200 bg-white">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      {React.createElement(personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.icon || FileText, {
                      className: `h-3 w-3 sm:h-4 sm:w-4 ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.color}`
                      })}
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                          {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                      </h3>
                      <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
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
                <div className="flex-1 overflow-y-auto bg-white">
                  {(() => {
                    const items = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData] || [];
                    const filteredItems = searchQuery.trim() 
                      ? items.filter(item => 
                          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : items;

                    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
                    const page = Math.min(currentPage, totalPages);
                    const startIndex = (page - 1) * PAGE_SIZE;
                    const paginatedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

                    return (
                      <div className="p-2 sm:p-3">
                        {isLoadingPersonalized ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[200px]">
                            <Activity className="h-6 w-6 mb-2 animate-spin" />
                            <p className="text-sm">Loading templates...</p>
                          </div>
                        ) : filteredItems.length > 0 ? (
                          <div className="space-y-3">
                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-2">
                              {paginatedItems.map((item) => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-3 shadow-sm bg-white">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {selectedPersonalizedCategory === 'medications' ? item.genericName || item.name : item.name}
                                      </p>
                                      {selectedPersonalizedCategory === 'medications' && item.brandName && (
                                        <p className="text-xs text-gray-500 truncate">Brand: {item.brandName}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        onClick={() => editPersonalizedDataItem(item.id)}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2"
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

                                  <div className="mt-2 space-y-1 text-xs text-gray-700">
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
                                    <p className="text-gray-500">Usage: {item.usageCount ?? 0}</p>
                                    <p className="text-gray-500">Last Modified: {item.modifiedAt ? new Date(item.modifiedAt).toLocaleDateString() : '—'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Desktop / tablet table */}
                            <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                              <table className="w-full text-xs sm:text-sm text-gray-800">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm">Name</th>
                                  {selectedPersonalizedCategory !== 'medications' && (
                                    <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Code</th>
                                  )}
                                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">Usage</th>
                                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden xl:table-cell">Last Modified</th>
                                  {selectedPersonalizedCategory === 'medications' && (
                                    <>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">Strength</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">Form</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden xl:table-cell">Route</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden xl:table-cell">Dose</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden 2xl:table-cell">Indication</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden 2xl:table-cell">Notes</th>
                                      <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Medicine ID</th>
                                    </>
                                  )}
                                  {selectedPersonalizedCategory !== 'medications' && (
                                    <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">Description</th>
                                  )}
                                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {paginatedItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 align-top">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                          {selectedPersonalizedCategory === 'medications' ? item.genericName || item.name : item.name}
                                        </span>
                                        {selectedPersonalizedCategory === 'medications' && item.brandName && (
                                          <span className="text-[11px] text-gray-500">Brand: {item.brandName}</span>
                                        )}
                                      </div>
                                    </td>

                                    {selectedPersonalizedCategory !== 'medications' && (
                                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden sm:table-cell align-top">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px] font-medium">{item.code || '-'}</span>
                                      </td>
                                    )}

                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell align-top">
                                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                                        {item.usageCount ?? 0} used
                                      </span>
                                    </td>

                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell align-top">
                                      <span className="text-gray-500 text-[11px]">
                                        {item.modifiedAt ? new Date(item.modifiedAt).toLocaleDateString() : '—'}
                                      </span>
                                    </td>

                                    {selectedPersonalizedCategory === 'medications' ? (
                                      <>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden lg:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">
                                            {item.strengthValue} {item.strengthUnit}
                                          </span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden lg:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.form}</span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden xl:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.route}</span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden xl:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.dose}</span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden 2xl:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.indication}</span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden 2xl:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.notes}</span>
                                        </td>
                                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 hidden sm:table-cell">
                                          <span className="text-gray-600 text-xs sm:text-sm">{item.medicineId}</span>
                                        </td>
                                      </>
                                    ) : (
                                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell align-top">
                                        <span className="text-gray-600 text-xs sm:text-sm">
                                          {item.shortDesc}
                                        </span>
                                      </td>
                                    )}

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
                                  </tr>
                                ))}
                              </tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="text-gray-600">
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
                                <span className="text-gray-700">
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
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[200px]">
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
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            </div>
            <Button
              onClick={() => console.log('Save configuration')}
              className="px-4 text-xs bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!pendingDeleteItem}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label || 'item'}</DialogTitle>
            <DialogDescription>
              {`Are you sure you want to delete ${pendingDeleteItem?.name ? '"' + pendingDeleteItem.name + '"' : 'this item'}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoadingPersonalized || !pendingDeleteItem}
              onClick={async () => {
                if (!pendingDeleteItem) return;
                await deletePersonalizedDataItem(pendingDeleteItem.id);
                setPendingDeleteItem(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-10 sm:pt-16">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                </h3>
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto">
              {selectedPersonalizedCategory === 'medications' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name <span className="text-red-600">*</span></label>
                                            <Input
                        value={newItemGenericName}
                        onChange={(e) => setNewItemGenericName(e.target.value)}
                                              placeholder="e.g., Atorvastatin"
                        className="w-full"
                                              autoFocus
                                            />
                                          </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                                            <Input
                        value={newItemBrandName}
                        onChange={(e) => setNewItemBrandName(e.target.value)}
                        placeholder="e.g., Lipitor"
                        className="w-full"
                                            />
                                          </div>
                                        </div>
                  <div className="grid grid-cols-3 gap-4">
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                                            <Input
                        value={newItemForm}
                        onChange={(e) => setNewItemForm(e.target.value)}
                                              placeholder="e.g., Tablet"
                        className="w-full"
                                            />
                                          </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Strength Value</label>
                                            <Input
                        value={newItemStrengthValue}
                        onChange={(e) => setNewItemStrengthValue(e.target.value)}
                                              placeholder="e.g., 10"
                        className="w-full"
                                            />
                                          </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Strength Unit</label>
                                            <Input
                        value={newItemStrengthUnit}
                        onChange={(e) => setNewItemStrengthUnit(e.target.value)}
                                              placeholder="e.g., mg"
                        className="w-full"
                                            />
                                          </div>
                                        </div>
                  <div className="grid grid-cols-2 gap-4">
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                                            <Input
                        value={newItemRoute}
                        onChange={(e) => setNewItemRoute(e.target.value)}
                        placeholder="e.g., Oral"
                        className="w-full"
                                            />
                                          </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dose</label>
                                            <Input
                        value={newItemDose}
                        onChange={(e) => setNewItemDose(e.target.value)}
                                              placeholder="e.g., 1 tab"
                        className="w-full"
                                            />
                                          </div>
                                        </div>
                                        <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indication</label>
                                          <Input
                      value={newItemIndication}
                      onChange={(e) => setNewItemIndication(e.target.value)}
                                            placeholder="e.g., Primary hypercholesterolemia"
                      className="w-full"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <Input
                          value={newItemNotes}
                          onChange={(e) => setNewItemNotes(e.target.value)}
                          placeholder="Any special instructions"
                          className="w-full"
                                            />
                                          </div>
                                          <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medicine ID</label>
                                            <Input
                          value={newItemMedicineId}
                          onChange={(e) => setNewItemMedicineId(e.target.value)}
                          placeholder="e.g., MED001"
                          className="w-full"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                <div className="space-y-4">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-600">*</span></label>
                                              <Input
                                                value={newItemName}
                                                onChange={(e) => setNewItemName(e.target.value)}
                                                placeholder={getNamePlaceholder(selectedPersonalizedCategory)}
                                                className="w-full"
                                                autoFocus
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                              <Input
                                                value={newItemCode}
                                                onChange={(e) => setNewItemCode(e.target.value)}
                                                placeholder={getCodePlaceholder(selectedPersonalizedCategory)}
                                                className="w-full"
                                              />
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <Input
                                              value={newItemShortDesc}
                                              onChange={(e) => setNewItemShortDesc(e.target.value)}
                                              placeholder={getShortDescPlaceholder(selectedPersonalizedCategory)}
                                              className="w-full"
                                            />
                                          </div>

                                          <div className="grid grid-cols-1 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Synonyms</label>
                                              <Input
                                                value={newItemSynonyms}
                                                onChange={(e) => setNewItemSynonyms(e.target.value)}
                                                placeholder={getSynonymsPlaceholder(selectedPersonalizedCategory)}
                                                className="w-full"
                                              />
                                            </div>
                                          </div>
                                    </div>
                                  )}
                                </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                                    <Button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  setNewItemPersonalId(null);
                }}
                                      variant="outline"
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
                  (isMedicationCategory && !newItemGenericName.trim() && !newItemBrandName.trim())
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isAddingItem 
                  ? 'Saving...'
                  : editingItem 
                    ? `Update ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}`
                    : `Add ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}`}
                                    </Button>
                                  </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrescriptionCustomizePanel;