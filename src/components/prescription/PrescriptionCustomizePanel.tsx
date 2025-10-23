import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  name: string;
  code: string;
  shortDesc: string;
  synonyms: string;
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
}

export const PrescriptionCustomizePanel: React.FC<PrescriptionCustomizePanelProps> = ({ 
  showCloseButton = true 
}) => {
  const [customizeTab, setCustomizeTab] = useState<'fields' | 'playground'>('fields');
  const [fields, setFields] = useState<FieldConfig[]>([
    { id: 'vitals', label: 'Vitals', enabled: true },
    { id: 'chiefComplaint', label: 'Chief Complaint', enabled: true },
    { id: 'history', label: 'History', enabled: true },
    { id: 'comorbidity', label: 'Comorbidity', enabled: true },
    { id: 'examination', label: 'Examination', enabled: true },
    { id: 'diagnosis', label: 'Diagnosis', enabled: true },
    { id: 'investigations', label: 'Investigations', enabled: true },
    { id: 'procedures', label: 'Procedures', enabled: true },
    { id: 'medications', label: 'Medications', enabled: true },
    { id: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice', enabled: true },
    { id: 'privateNotes', label: 'Private Notes', enabled: false },
    { id: 'certificatesNotes', label: 'Certificates & Notes', enabled: true },
    { id: 'immunizations', label: 'Immunizations', enabled: true },
    { id: 'followUpReferral', label: 'Follow-up & Referral', enabled: true },
    { id: 'attachments', label: 'Attachments', enabled: true }
  ]);

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // New item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemShortDesc, setNewItemShortDesc] = useState('');
  const [newItemSynonyms, setNewItemSynonyms] = useState('');
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

  const updateFieldConfig = (fieldId: string, enabled: boolean) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, enabled } : field
    ));
  };


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

  const addPersonalizedDataItem = () => {
    const newItem: PersonalizedDataItem = {
      id: Date.now().toString(),
      name: newItemName,
      code: newItemCode,
      shortDesc: newItemShortDesc,
      synonyms: newItemSynonyms,
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

    setPersonalizedData(prev => ({
      ...prev,
      [selectedPersonalizedCategory]: [...prev[selectedPersonalizedCategory as keyof PersonalizedData], newItem]
    }));

    // Reset form
    setNewItemName('');
    setNewItemCode('');
    setNewItemShortDesc('');
    setNewItemSynonyms('');
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
    setIsAddingItem(false);
  };

  const deletePersonalizedDataItem = (itemId: string) => {
    setPersonalizedData(prev => ({
      ...prev,
      [selectedPersonalizedCategory]: prev[selectedPersonalizedCategory as keyof PersonalizedData].filter(item => item.id !== itemId)
    }));
  };

  const editPersonalizedDataItem = (itemId: string) => {
    const item = personalizedData[selectedPersonalizedCategory as keyof PersonalizedData].find(i => i.id === itemId);
    if (item) {
      const updatedItem = {
        ...item,
        name: editItemName,
        code: editItemCode,
        shortDesc: editItemShortDesc,
        synonyms: editItemSynonyms,
        genericName: editItemGenericName,
        brandName: editItemBrandName,
        form: editItemForm,
        strengthValue: editItemStrengthValue,
        strengthUnit: editItemStrengthUnit,
        route: editItemRoute,
        dose: editItemDose,
        indication: editItemIndication,
        notes: editItemNotes,
        medicineId: editItemMedicineId
      };

      setPersonalizedData(prev => ({
        ...prev,
        [selectedPersonalizedCategory]: prev[selectedPersonalizedCategory as keyof PersonalizedData].map(i => 
          i.id === itemId ? updatedItem : i
        )
      }));
    }
    setEditingItem(null);
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
      medications: 'e.g., MED001'
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

    // Load field configuration
    const savedFields = localStorage.getItem('prescription-field-config');
    if (savedFields) {
      try {
        const parsed = JSON.parse(savedFields);
        setFields(parsed);
      } catch (error) {
        console.error('Error loading field configuration:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save personalized data
    localStorage.setItem('prescription-personalized-data', JSON.stringify(personalizedData));
  }, [personalizedData]);

  return (
    <div className="w-full bg-white flex flex-col" style={{ minHeight: '100vh' }}>
      {/* Enhanced Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Medical Prescription Fields</h2>
              <p className="text-sm text-gray-600">Enable or disable medical fields according to your practice needs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Database className="h-3 w-3 mr-1" />
              {Object.values(personalizedData).flat().length} Templates
            </Badge>
          </div>
        </div>
      </div>

      {/* Compact Content - No Scrolling */}
      <div className="flex-1 flex flex-col h-full">
        <Tabs value={customizeTab} onValueChange={(value) => setCustomizeTab(value as 'fields' | 'playground')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="playground">Personalized Data</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">Medical Fields</h3>
                <span className="text-xs text-blue-700">• Green = Active • Click ON/OFF to toggle</span>
              </div>
            </div>

            {/* Compact Field Grid */}
            <div className="flex-1 p-3 overflow-hidden">
              <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-2">
                {fields.map((field) => (
                  <div 
                    key={field.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                      field.enabled 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        field.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {renderFieldIcon(field.id)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{field.label}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateFieldConfig(field.id, !field.enabled)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
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
            
            {/* Save Button for Fields */}
            <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{fields.filter(f => f.enabled).length}</span> of <span className="font-medium">{fields.length}</span> fields enabled
                </div>
                <Button 
                  onClick={() => {
                    // Save field configuration
                    localStorage.setItem('prescription-field-config', JSON.stringify(fields));
                    // Show success message
                    alert('Field configuration saved successfully!');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="playground" className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Medical Templates</h3>
                  <span className="text-xs text-blue-600">• 8 categories available</span>
                </div>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                </Button>
              </div>
            </div>

            {/* Sidebar Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Category Sidebar */}
              <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Medical Categories</h4>
                  <div className="space-y-1">
                    {personalizedDataCategories.map((category) => {
                      const IconComponent = category.icon;
                      const isSelected = selectedPersonalizedCategory === category.id;
                      const itemCount = personalizedData[category.id as keyof PersonalizedData]?.length || 0;
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedPersonalizedCategory(category.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'hover:bg-white text-gray-700'
                          }`}
                        >
                          <IconComponent className={`h-4 w-4 ${category.color}`} />
                          <span className="flex-1 text-left truncate">{category.label}</span>
                          <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">{itemCount}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Content Header */}
                <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {React.createElement(personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.icon || FileText, {
                        className: `h-4 w-4 ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.color}`
                      })}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({personalizedData[selectedPersonalizedCategory as keyof PersonalizedData]?.length || 0} templates)
                      </span>
                    </div>
                    <div className="max-w-sm">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder={`Search ${personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label.toLowerCase()} templates...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Item Form - Removed, now using modal */}
                {false && (
                  <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-blue-50">
                    <div className="max-w-4xl">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">
                        Add New {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
                      </h5>
                      
                      {selectedPersonalizedCategory === 'medications' ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Generic Name</label>
                              <Input
                                value={newItemGenericName}
                                onChange={(e) => setNewItemGenericName(e.target.value)}
                                placeholder="e.g., Atorvastatin"
                                className="w-full"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name</label>
                              <Input
                                value={newItemBrandName}
                                onChange={(e) => setNewItemBrandName(e.target.value)}
                                placeholder="e.g., Lipitor"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Form</label>
                              <Input
                                value={newItemForm}
                                onChange={(e) => setNewItemForm(e.target.value)}
                                placeholder="e.g., Tablet"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Strength Value</label>
                              <Input
                                value={newItemStrengthValue}
                                onChange={(e) => setNewItemStrengthValue(e.target.value)}
                                placeholder="e.g., 10"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Strength Unit</label>
                              <Input
                                value={newItemStrengthUnit}
                                onChange={(e) => setNewItemStrengthUnit(e.target.value)}
                                placeholder="e.g., mg"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Route</label>
                              <Input
                                value={newItemRoute}
                                onChange={(e) => setNewItemRoute(e.target.value)}
                                placeholder="e.g., Oral"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Dose</label>
                              <Input
                                value={newItemDose}
                                onChange={(e) => setNewItemDose(e.target.value)}
                                placeholder="e.g., 1 tab"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Indication</label>
                            <Input
                              value={newItemIndication}
                              onChange={(e) => setNewItemIndication(e.target.value)}
                              placeholder="e.g., Primary hypercholesterolemia"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                            <Input
                              value={newItemNotes}
                              onChange={(e) => setNewItemNotes(e.target.value)}
                              placeholder="e.g., if any"
                              className="w-full"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={addPersonalizedDataItem} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button 
                              onClick={() => {
                                setIsAddingItem(false);
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
                              }} 
                              variant="outline"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                              <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder={getNamePlaceholder(selectedPersonalizedCategory)}
                                className="w-full"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                              <Input
                                value={newItemCode}
                                onChange={(e) => setNewItemCode(e.target.value)}
                                placeholder={getCodePlaceholder(selectedPersonalizedCategory)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
                              <Input
                                value={newItemShortDesc}
                                onChange={(e) => setNewItemShortDesc(e.target.value)}
                                placeholder={getShortDescPlaceholder(selectedPersonalizedCategory)}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Synonyms</label>
                              <Input
                                value={newItemSynonyms}
                                onChange={(e) => setNewItemSynonyms(e.target.value)}
                                placeholder={getSynonymsPlaceholder(selectedPersonalizedCategory)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={addPersonalizedDataItem} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button 
                              onClick={() => {
                                setIsAddingItem(false);
                                setNewItemName('');
                                setNewItemCode('');
                                setNewItemShortDesc('');
                                setNewItemSynonyms('');
                              }} 
                              variant="outline"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabular Data Display */}
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

                    return (
                      <div className="p-3">
                        {filteredItems.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Name</th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Code</th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                                  {selectedPersonalizedCategory === 'medications' && (
                                    <>
                                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Brand</th>
                                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Strength</th>
                                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Form</th>
                                    </>
                                  )}
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredItems.map((item) => (
                                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2 px-3">
                                      <span className="font-medium text-gray-900">
                                        {selectedPersonalizedCategory === 'medications' ? item.genericName || item.name : item.name}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-gray-600">{item.code}</span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-gray-600">
                                        {selectedPersonalizedCategory === 'medications' ? item.brandName || item.shortDesc : item.shortDesc}
                                      </span>
                                    </td>
                                    {selectedPersonalizedCategory === 'medications' && (
                                      <>
                                        <td className="py-2 px-3">
                                          <span className="text-gray-600">{item.brandName}</span>
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="text-gray-600">
                                            {item.strengthValue} {item.strengthUnit}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="text-gray-600">{item.form}</span>
                                        </td>
                                      </>
                                    )}
                                    <td className="py-2 px-3">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          onClick={() => {
                                            setEditingItem(item.id);
                                            if (selectedPersonalizedCategory === 'medications') {
                                              setEditItemGenericName(item.genericName || '');
                                              setEditItemBrandName(item.brandName || '');
                                              setEditItemForm(item.form || '');
                                              setEditItemStrengthValue(item.strengthValue || '');
                                              setEditItemStrengthUnit(item.strengthUnit || '');
                                              setEditItemRoute(item.route || '');
                                              setEditItemDose(item.dose || '');
                                              setEditItemIndication(item.indication || '');
                                              setEditItemNotes(item.notes || '');
                                              setEditItemMedicineId(item.medicineId || '');
                                            } else {
                                              setEditItemName(item.name);
                                              setEditItemCode(item.code);
                                              setEditItemShortDesc(item.shortDesc);
                                              setEditItemSynonyms(item.synonyms);
                                            }
                                          }}
                                          variant="outline"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => deletePersonalizedDataItem(item.id)}
                                          variant="outline"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
          </TabsContent>
        </Tabs>
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            
            <div className="p-4">
              {selectedPersonalizedCategory === 'medications' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Input
                      value={newItemNotes}
                      onChange={(e) => setNewItemNotes(e.target.value)}
                      placeholder="e.g., if any"
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
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Input
                      value={newItemShortDesc}
                      onChange={(e) => setNewItemShortDesc(e.target.value)}
                      placeholder={getShortDescPlaceholder(selectedPersonalizedCategory)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Synonyms</label>
                    <Input
                      value={newItemSynonyms}
                      onChange={(e) => setNewItemSynonyms(e.target.value)}
                      placeholder={getSynonymsPlaceholder(selectedPersonalizedCategory)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Input
                      value={newItemNotes}
                      onChange={(e) => setNewItemNotes(e.target.value)}
                      placeholder="Additional notes (optional)"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  addPersonalizedDataItem();
                  setShowAddModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Add {personalizedDataCategories.find(cat => cat.id === selectedPersonalizedCategory)?.label}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrescriptionCustomizePanel;