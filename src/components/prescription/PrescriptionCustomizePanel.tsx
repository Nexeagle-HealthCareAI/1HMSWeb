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
  Shield,
  Calendar,
  User,
  FileImage,
  Search,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Play,
  Database,
  BookOpen,
  Microscope,
  TestTube,
  Syringe,
  Brain,
  Zap
} from 'lucide-react';

interface FieldConfig {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
  category: 'basic' | 'clinical' | 'administrative';
}

interface PlaygroundItem {
  id: string;
  text: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaygroundData {
  chiefComplaint: PlaygroundItem[];
  history: PlaygroundItem[];
  comorbidity: PlaygroundItem[];
  examination: PlaygroundItem[];
  diagnosis: PlaygroundItem[];
  investigations: PlaygroundItem[];
  procedures: PlaygroundItem[];
  medications: PlaygroundItem[];
}

const defaultFieldConfigs: FieldConfig[] = [
  { id: 'vitals', label: 'Vitals', enabled: true, required: true, category: 'basic' },
  { id: 'chiefComplaint', label: 'Chief Complaint', enabled: true, required: true, category: 'basic' },
  { id: 'history', label: 'History', enabled: true, required: false, category: 'clinical' },
  { id: 'comorbidity', label: 'Comorbidity', enabled: true, required: false, category: 'clinical' },
  { id: 'examination', label: 'Examination', enabled: true, required: false, category: 'clinical' },
  { id: 'diagnosis', label: 'Diagnosis', enabled: true, required: true, category: 'clinical' },
  { id: 'investigations', label: 'Investigations', enabled: true, required: false, category: 'clinical' },
  { id: 'procedures', label: 'Procedures', enabled: true, required: false, category: 'clinical' },
  { id: 'medications', label: 'Medications', enabled: true, required: false, category: 'clinical' },
  { id: 'privateNotes', label: 'Private Notes', enabled: true, required: false, category: 'administrative' },
  { id: 'certificates', label: 'Certificates & Notes', enabled: true, required: false, category: 'administrative' },
  { id: 'immunizations', label: 'Immunizations', enabled: true, required: false, category: 'administrative' },
  { id: 'followUp', label: 'Follow-up & Referral', enabled: true, required: false, category: 'administrative' },
  { id: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice', enabled: true, required: false, category: 'clinical' },
  { id: 'attachments', label: 'Attachments', enabled: true, required: false, category: 'administrative' }
];

interface PrescriptionCustomizePanelProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const PrescriptionCustomizePanel: React.FC<PrescriptionCustomizePanelProps> = ({ 
  onClose, 
  showCloseButton = true 
}) => {
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(defaultFieldConfigs);
  const [customizeTab, setCustomizeTab] = useState('fields');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveConfigStatus, setSaveConfigStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  
  // Playground state
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
    chiefComplaint: [],
    history: [],
    comorbidity: [],
    examination: [],
    diagnosis: [],
    investigations: [],
    procedures: [],
    medications: []
  });
  const [selectedPlaygroundCategory, setSelectedPlaygroundCategory] = useState<string>('chiefComplaint');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');
  

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

  // Filter fields based on search and enabled status
  const filteredFields = fieldConfigs.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnabledFilter = showOnlyEnabled ? field.enabled : true;
    return matchesSearch && matchesEnabledFilter;
  });

  // Group fields by category for better organization
  const groupedFields = filteredFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldConfig[]>);

  const categoryLabels = {
    basic: 'Essential Fields',
    clinical: 'Clinical Information',
    administrative: 'Administrative'
  };

  // Playground functions
  const addPlaygroundItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem: PlaygroundItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      category: selectedPlaygroundCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPlaygroundData(prev => ({
      ...prev,
      [selectedPlaygroundCategory]: [...prev[selectedPlaygroundCategory as keyof PlaygroundData], newItem]
    }));

    setNewItemText('');
    setIsAddingItem(false);
    savePlaygroundData();
  };

  const editPlaygroundItem = (itemId: string) => {
    if (!editItemText.trim()) return;
    
    setPlaygroundData(prev => ({
      ...prev,
      [selectedPlaygroundCategory]: prev[selectedPlaygroundCategory as keyof PlaygroundData].map(item =>
        item.id === itemId 
          ? { ...item, text: editItemText.trim(), updatedAt: new Date().toISOString() }
          : item
      )
    }));

    setEditingItem(null);
    setEditItemText('');
    savePlaygroundData();
  };

  const deletePlaygroundItem = (itemId: string) => {
    setPlaygroundData(prev => ({
      ...prev,
      [selectedPlaygroundCategory]: prev[selectedPlaygroundCategory as keyof PlaygroundData].filter(item => item.id !== itemId)
    }));
    savePlaygroundData();
  };

  const savePlaygroundData = () => {
    localStorage.setItem('prescription-playground-data', JSON.stringify(playgroundData));
  };

  const loadPlaygroundData = () => {
    const saved = localStorage.getItem('prescription-playground-data');
    if (saved) {
      try {
        setPlaygroundData(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading playground data:', error);
      }
    }
  };

  const playgroundCategories = [
    { id: 'chiefComplaint', label: 'Chief Complaint', icon: AlertCircleIcon, color: 'text-red-600' },
    { id: 'history', label: 'History', icon: BookOpen, color: 'text-blue-600' },
    { id: 'comorbidity', label: 'Comorbidity', icon: Heart, color: 'text-pink-600' },
    { id: 'examination', label: 'Examination', icon: Stethoscope, color: 'text-green-600' },
    { id: 'diagnosis', label: 'Diagnosis', icon: CheckCircleIcon, color: 'text-emerald-600' },
    { id: 'investigations', label: 'Investigations', icon: Microscope, color: 'text-purple-600' },
    { id: 'procedures', label: 'Procedures', icon: TestTube, color: 'text-orange-600' },
    { id: 'medications', label: 'Medications', icon: Pill, color: 'text-indigo-600' }
  ];

  const getFilteredPlaygroundItems = () => {
    return playgroundData[selectedPlaygroundCategory as keyof PlaygroundData] || [];
  };

  const renderFieldIcon = (fieldId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'vitals': <Activity className="h-4 w-4" />,
      'chiefComplaint': <AlertCircleIcon className="h-4 w-4" />,
      'history': <FileText className="h-4 w-4" />,
      'comorbidity': <Heart className="h-4 w-4" />,
      'examination': <Stethoscope className="h-4 w-4" />,
      'diagnosis': <CheckCircleIcon className="h-4 w-4" />,
      'investigations': <Microscope className="h-4 w-4" />,
      'procedures': <TestTube className="h-4 w-4" />,
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

    // Load playground data
    loadPlaygroundData();
  }, []);

  return (
    <div className="w-full bg-white border border-gray-200 flex flex-col h-full rounded-lg shadow-sm">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customize Prescription</h2>
              <p className="text-xs text-gray-600">Configure fields and manage your data</p>
            </div>
          </div>
          {showCloseButton && onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Customize Tabs */}
      <div className="p-3 border-b border-gray-200">
        <Tabs value={customizeTab} onValueChange={setCustomizeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fields" className="text-xs">
              <span>Fields</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="text-xs">
              <Play className="h-4 w-4 mr-1" />
              <span>Playground</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and Filter Controls */}
      {customizeTab === 'fields' && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyEnabled}
                  onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                  className="rounded border-gray-300 h-3 w-3 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">Show only enabled fields</span>
              </label>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{filteredFields.length} of {fieldConfigs.length} fields</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Enhanced Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <Tabs value={customizeTab} onValueChange={setCustomizeTab}>
          <TabsContent value="fields" className="space-y-2">
            <div className="grid gap-2">
              {filteredFields.map((field) => (
                <div 
                  key={field.id} 
                  className={`group flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${
                    field.enabled 
                      ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 p-1.5 rounded-md ${
                      field.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {renderFieldIcon(field.id)}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${
                        field.enabled ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {field.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {field.enabled ? (
                      <ToggleRight 
                        className="h-6 w-6 text-green-600 cursor-pointer hover:text-green-700 transition-colors" 
                        onClick={() => updateFieldConfig(field.id, false)}
                      />
                    ) : (
                      <ToggleLeft 
                        className="h-6 w-6 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        onClick={() => updateFieldConfig(field.id, true)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {filteredFields.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No fields found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </TabsContent>

          {/* Playground Tab */}
          <TabsContent value="playground" className="flex gap-4 h-full">
            {/* Side Navigation */}
            <div className="w-48 flex-shrink-0">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide px-2">Categories</h4>
                <div className="space-y-1">
                  {playgroundCategories.map((category) => {
                    const IconComponent = category.icon;
                    const isSelected = selectedPlaygroundCategory === category.id;
                    const itemCount = playgroundData[category.id as keyof PlaygroundData]?.length || 0;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedPlaygroundCategory(category.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`h-4 w-4 ${category.color}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-xs font-medium ${
                            isSelected ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {category.label}
                          </p>
                          <p className={`text-xs ${
                            isSelected ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {itemCount} items
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Add New Item */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                    {playgroundCategories.find(cat => cat.id === selectedPlaygroundCategory)?.label} Items
                  </h4>
                  <Button
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>

                {/* Add Item Form */}
                {isAddingItem && (
                  <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">
                        Add new {playgroundCategories.find(cat => cat.id === selectedPlaygroundCategory)?.label.toLowerCase()}:
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          placeholder="Enter item text..."
                          className="flex-1 h-8"
                          onKeyPress={(e) => e.key === 'Enter' && addPlaygroundItem()}
                          autoFocus
                        />
                        <Button onClick={addPlaygroundItem} size="sm" className="bg-green-600 hover:bg-green-700 h-8 px-2">
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button 
                          onClick={() => {
                            setIsAddingItem(false);
                            setNewItemText('');
                          }} 
                          variant="outline" 
                          size="sm"
                          className="h-8 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-1">
                  {getFilteredPlaygroundItems().map((item) => (
                    <div key={item.id} className="group flex items-center justify-between p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-1 bg-gray-100 rounded-md">
                          {React.createElement(playgroundCategories.find(cat => cat.id === selectedPlaygroundCategory)?.icon || FileText, {
                            className: `h-3 w-3 ${playgroundCategories.find(cat => cat.id === selectedPlaygroundCategory)?.color}`
                          })}
                        </div>
                        <div className="flex-1">
                          {editingItem === item.id ? (
                            <div className="flex gap-1">
                              <Input
                                value={editItemText}
                                onChange={(e) => setEditItemText(e.target.value)}
                                className="flex-1 h-6 text-xs"
                                onKeyPress={(e) => e.key === 'Enter' && editPlaygroundItem(item.id)}
                                autoFocus
                              />
                              <Button onClick={() => editPlaygroundItem(item.id)} size="sm" className="bg-green-600 hover:bg-green-700 h-6 px-1">
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button 
                                onClick={() => {
                                  setEditingItem(null);
                                  setEditItemText('');
                                }} 
                                variant="outline" 
                                size="sm"
                                className="h-6 px-1"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-900">{item.text}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => {
                            setEditingItem(item.id);
                            setEditItemText(item.text);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deletePlaygroundItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {getFilteredPlaygroundItems().length === 0 && (
                    <div className="text-center py-6">
                      <div className="p-2 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                        <Database className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No items found</h3>
                      <p className="text-xs text-gray-500">
                        Use the "Add" button above to create your first item
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex items-center gap-1 text-xs"
              size="sm"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
          <Button
            onClick={handleSaveConfiguration}
            disabled={isSavingConfig}
            className={`px-4 text-xs ${
              saveConfigStatus === 'saved' 
                ? 'bg-green-600 hover:bg-green-700' 
                : saveConfigStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            size="sm"
          >
            {isSavingConfig ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                Saving...
              </>
            ) : saveConfigStatus === 'saved' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Saved
              </>
            ) : saveConfigStatus === 'error' ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCustomizePanel;
