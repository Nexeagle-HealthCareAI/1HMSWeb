import React, { useState } from 'react';
import { 
  Building2,
  FileText,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Palette,
  Image,
  BarChart3,
  Calendar,
  Stethoscope,
  X,
  Check,
  Download,
  Printer
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  shortCode: string;
  description: string;
  doctors: DoctorAssignment[];
  stats: {
    totalPatients: number;
    todayAppointments: number;
    monthlyRevenue: number;
  };
  isActive: boolean;
}

interface DoctorAssignment {
  doctorId: string;
  doctorName: string;
  role: 'Consultant' | 'Assistant' | 'Visiting Doctor' | 'HOD';
  schedule?: string;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  header: {
    showLogo: boolean;
    hospitalName: string;
    contactInfo: boolean;
    customText?: string;
  };
  sections: {
    vitals: boolean;
    diagnosis: boolean;
    advice: boolean;
    medicines: boolean;
    nextAppointment: boolean;
  };
  footer: {
    signature: boolean;
    qrCode: boolean;
    customNotes?: string;
  };
  doctorSpecific?: string;
}

interface HospitalBranding {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

const sampleDepartments: Department[] = [
  {
    id: 'CARD',
    name: 'Cardiology',
    shortCode: 'CARD',
    description: 'Heart and cardiovascular diseases treatment',
    doctors: [
      { doctorId: 'D001', doctorName: 'Dr. Sarah Johnson', role: 'HOD', schedule: 'Mon-Fri 9AM-5PM' },
      { doctorId: 'D005', doctorName: 'Dr. Robert Chen', role: 'Consultant', schedule: 'Mon-Wed-Fri 10AM-3PM' }
    ],
    stats: { totalPatients: 1250, todayAppointments: 18, monthlyRevenue: 125000 },
    isActive: true
  },
  {
    id: 'PEDI',
    name: 'Pediatrics',
    shortCode: 'PEDI',
    description: 'Children healthcare and treatment',
    doctors: [
      { doctorId: 'D002', doctorName: 'Dr. Emily Davis', role: 'HOD', schedule: 'Mon-Sat 8AM-6PM' }
    ],
    stats: { totalPatients: 890, todayAppointments: 12, monthlyRevenue: 78000 },
    isActive: true
  },
  {
    id: 'NEURO',
    name: 'Neurology',
    shortCode: 'NEURO',
    description: 'Neurological disorders and brain health',
    doctors: [
      { doctorId: 'D003', doctorName: 'Dr. Michael Wilson', role: 'Consultant', schedule: 'Tue-Thu-Sat 11AM-4PM' }
    ],
    stats: { totalPatients: 654, todayAppointments: 8, monthlyRevenue: 95000 },
    isActive: true
  }
];

const defaultTemplate: PrescriptionTemplate = {
  id: 'default',
  name: 'Default Template',
  isDefault: true,
  header: {
    showLogo: true,
    hospitalName: 'NexEagle Hospital',
    contactInfo: true,
    customText: ''
  },
  sections: {
    vitals: true,
    diagnosis: true,
    advice: true,
    medicines: true,
    nextAppointment: true
  },
  footer: {
    signature: true,
    qrCode: false,
    customNotes: 'Get tests from NABL-certified labs only'
  }
};

const defaultBranding: HospitalBranding = {
  name: 'NexEagle Hospital',
  tagline: 'Your Health, Our Priority',
  phone: '+91-9876543210',
  email: 'info@nexeagle.com',
  website: 'https://www.nexeagle.com',
  address: '123 Medical Complex, Healthcare District, City - 123456',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b'
};

export const SystemConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState<Department[]>(sampleDepartments);
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionTemplate>(defaultTemplate);
  const [hospitalBranding, setHospitalBranding] = useState<HospitalBranding>(defaultBranding);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const { toast } = useToast();

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    shortCode: '',
    description: '',
    doctors: [] as DoctorAssignment[]
  });

  const availableDoctors = [
    { id: 'D001', name: 'Dr. Sarah Johnson', specialty: 'Cardiology' },
    { id: 'D002', name: 'Dr. Emily Davis', specialty: 'Pediatrics' },
    { id: 'D003', name: 'Dr. Michael Wilson', specialty: 'Neurology' },
    { id: 'D004', name: 'Dr. Robert Chen', specialty: 'Cardiology' },
    { id: 'D005', name: 'Dr. Lisa Anderson', specialty: 'Dermatology' }
  ];

  const handleAddDepartment = () => {
    if (!newDepartment.name || !newDepartment.shortCode) {
      toast({
        title: "Missing Information",
        description: "Please provide department name and short code.",
        variant: "destructive"
      });
      return;
    }

    const department: Department = {
      id: newDepartment.shortCode.toUpperCase(),
      name: newDepartment.name,
      shortCode: newDepartment.shortCode.toUpperCase(),
      description: newDepartment.description,
      doctors: newDepartment.doctors,
      stats: { totalPatients: 0, todayAppointments: 0, monthlyRevenue: 0 },
      isActive: true
    };

    setDepartments(prev => [...prev, department]);
    setNewDepartment({ name: '', shortCode: '', description: '', doctors: [] });
    setShowDepartmentDialog(false);

    toast({
      title: "Department Added",
      description: `${department.name} has been added successfully.`,
    });
  };

  const handleUpdateDepartment = () => {
    if (!editingDepartment) return;

    setDepartments(prev => prev.map(dept => 
      dept.id === editingDepartment.id ? editingDepartment : dept
    ));

    setEditingDepartment(null);
    toast({
      title: "Department Updated",
      description: "Department has been updated successfully.",
    });
  };

  const handleDeleteDepartment = (departmentId: string) => {
    setDepartments(prev => prev.map(dept => 
      dept.id === departmentId ? { ...dept, isActive: false } : dept
    ));

    toast({
      title: "Department Deactivated",
      description: "Department has been deactivated.",
    });
  };

  const addDoctorToDepartment = (doctorId: string, role: DoctorAssignment['role']) => {
    const doctor = availableDoctors.find(d => d.id === doctorId);
    if (!doctor) return;

    const newAssignment: DoctorAssignment = {
      doctorId: doctor.id,
      doctorName: doctor.name,
      role,
      schedule: ''
    };

    if (editingDepartment) {
      setEditingDepartment(prev => prev ? {
        ...prev,
        doctors: [...prev.doctors, newAssignment]
      } : null);
    } else {
      setNewDepartment(prev => ({
        ...prev,
        doctors: [...prev.doctors, newAssignment]
      }));
    }
  };

  const handleSaveTemplate = () => {
    toast({
      title: "Template Saved",
      description: "Prescription template has been saved successfully.",
    });
  };

  const handleResetTemplate = () => {
    setPrescriptionTemplate(defaultTemplate);
    toast({
      title: "Template Reset",
      description: "Template has been reset to default settings.",
    });
  };

  const handleSaveBranding = () => {
    toast({
      title: "Branding Updated",
      description: "Hospital branding settings have been saved.",
    });
  };

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Configuration</h2>
          <p className="text-muted-foreground">Configure departments, prescriptions, and hospital branding</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prescription</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-semibold">Manage Departments</h3>
              <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {departments.map(dept => (
                <Card key={dept.id} className={!dept.isActive ? 'opacity-50' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        <Badge variant="outline">{dept.shortCode}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDepartment(dept)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDepartment(dept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{dept.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{dept.stats.totalPatients}</div>
                        <div className="text-xs text-muted-foreground">Total Patients</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{dept.stats.todayAppointments}</div>
                        <div className="text-xs text-muted-foreground">Today's Appointments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">₹{dept.stats.monthlyRevenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                      </div>
                    </div>

                    {dept.doctors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Assigned Doctors</h4>
                        <div className="space-y-2">
                          {dept.doctors.map((doc, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                              <div>
                                <div className="font-medium text-sm">{doc.doctorName}</div>
                                <Badge variant="outline" className="text-xs">{doc.role}</Badge>
                              </div>
                              {doc.schedule && (
                                <div className="text-xs text-muted-foreground">{doc.schedule}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add/Edit Department Dialog */}
            <Dialog open={showDepartmentDialog || !!editingDepartment} onOpenChange={(open) => {
              if (!open) {
                setShowDepartmentDialog(false);
                setEditingDepartment(null);
              }
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingDepartment ? 'Edit Department' : 'Add New Department'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deptName">Department Name</Label>
                      <Input
                        id="deptName"
                        value={editingDepartment ? editingDepartment.name : newDepartment.name}
                        onChange={(e) => {
                          if (editingDepartment) {
                            setEditingDepartment({ ...editingDepartment, name: e.target.value });
                          } else {
                            setNewDepartment({ ...newDepartment, name: e.target.value });
                          }
                        }}
                        placeholder="Enter department name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deptCode">Short Code</Label>
                      <Input
                        id="deptCode"
                        value={editingDepartment ? editingDepartment.shortCode : newDepartment.shortCode}
                        onChange={(e) => {
                          if (editingDepartment) {
                            setEditingDepartment({ ...editingDepartment, shortCode: e.target.value });
                          } else {
                            setNewDepartment({ ...newDepartment, shortCode: e.target.value });
                          }
                        }}
                        placeholder="e.g., CARD"
                        className="uppercase"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="deptDesc">Description</Label>
                    <Textarea
                      id="deptDesc"
                      value={editingDepartment ? editingDepartment.description : newDepartment.description}
                      onChange={(e) => {
                        if (editingDepartment) {
                          setEditingDepartment({ ...editingDepartment, description: e.target.value });
                        } else {
                          setNewDepartment({ ...newDepartment, description: e.target.value });
                        }
                      }}
                      placeholder="Enter department description"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowDepartmentDialog(false);
                      setEditingDepartment(null);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}>
                      {editingDepartment ? 'Update' : 'Add'} Department
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Prescription Tab */}
        <TabsContent value="prescription">
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">Prescription Template Configuration</h3>
                <p className="text-sm text-muted-foreground">Customize the prescription format and layout</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowTemplatePreview(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" onClick={handleResetTemplate}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleSaveTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Header Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Header Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLogo">Show Hospital Logo</Label>
                    <Switch
                      id="showLogo"
                      checked={prescriptionTemplate.header.showLogo}
                      onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        header: { ...prev.header, showLogo: checked }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input
                      id="hospitalName"
                      value={prescriptionTemplate.header.hospitalName}
                      onChange={(e) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        header: { ...prev.header, hospitalName: e.target.value }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="contactInfo">Show Contact Information</Label>
                    <Switch
                      id="contactInfo"
                      checked={prescriptionTemplate.header.contactInfo}
                      onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        header: { ...prev.header, contactInfo: checked }
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customText">Custom Header Text</Label>
                    <Textarea
                      id="customText"
                      value={prescriptionTemplate.header.customText || ''}
                      onChange={(e) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        header: { ...prev.header, customText: e.target.value }
                      }))}
                      placeholder="Add custom text to header"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Content Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries({
                    vitals: 'Patient Vitals',
                    diagnosis: 'Diagnosis',
                    advice: "Doctor's Advice",
                    medicines: 'Medications',
                    nextAppointment: 'Next Appointment'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Switch
                        checked={prescriptionTemplate.sections[key as keyof typeof prescriptionTemplate.sections]}
                        onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                          ...prev,
                          sections: { ...prev.sections, [key]: checked }
                        }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Footer Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Footer Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signature">Digital Signature</Label>
                    <Switch
                      id="signature"
                      checked={prescriptionTemplate.footer.signature}
                      onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        footer: { ...prev.footer, signature: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="qrCode">QR Code</Label>
                    <Switch
                      id="qrCode"
                      checked={prescriptionTemplate.footer.qrCode}
                      onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        footer: { ...prev.footer, qrCode: checked }
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customNotes">Custom Footer Notes</Label>
                    <Textarea
                      id="customNotes"
                      value={prescriptionTemplate.footer.customNotes || ''}
                      onChange={(e) => setPrescriptionTemplate(prev => ({
                        ...prev,
                        footer: { ...prev.footer, customNotes: e.target.value }
                      }))}
                      placeholder="Add custom footer text"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">Hospital Branding</h3>
                <p className="text-sm text-muted-foreground">Customize hospital information and visual identity</p>
              </div>
              <Button onClick={handleSaveBranding}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input
                      id="hospitalName"
                      value={hospitalBranding.name}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={hospitalBranding.tagline}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="e.g., Your Health, Our Priority"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={hospitalBranding.address}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={hospitalBranding.phone}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={hospitalBranding.email}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={hospitalBranding.website}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="Website URL"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Visual Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Visual Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={hospitalBranding.primaryColor}
                        onChange={(e) => setHospitalBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-12 h-8 p-0 border-0"
                      />
                      <Input
                        value={hospitalBranding.primaryColor}
                        onChange={(e) => setHospitalBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={hospitalBranding.secondaryColor}
                        onChange={(e) => setHospitalBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-12 h-8 p-0 border-0"
                      />
                      <Input
                        value={hospitalBranding.secondaryColor}
                        onChange={(e) => setHospitalBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logo">Hospital Logo</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        // Handle file upload logic here
                        console.log('Logo file:', e.target.files?.[0]);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a logo image (PNG, JPG, or SVG recommended)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Prescription Preview Dialog */}
      <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Prescription Template Preview</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="bg-white text-black p-8 rounded-lg border shadow-lg print:shadow-none">
            {/* Header */}
            {(prescriptionTemplate.header.showLogo || prescriptionTemplate.header.hospitalName || prescriptionTemplate.header.contactInfo) && (
              <div className="border-b pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {prescriptionTemplate.header.showLogo && (
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Stethoscope className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-primary">{prescriptionTemplate.header.hospitalName}</h1>
                      {prescriptionTemplate.header.contactInfo && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <div>{hospitalBranding.phone} | {hospitalBranding.email}</div>
                          <div>{hospitalBranding.address}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">Prescription #12345</div>
                    <div className="text-muted-foreground">Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                {prescriptionTemplate.header.customText && (
                  <div className="mt-3 text-sm text-center font-medium">
                    {prescriptionTemplate.header.customText}
                  </div>
                )}
              </div>
            )}

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Patient Information</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> John Doe</div>
                  <div><strong>Age:</strong> 45 years</div>
                  <div><strong>Gender:</strong> Male</div>
                  <div><strong>Contact:</strong> +91-9876543210</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Doctor Information</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Dr. Sarah Johnson</strong></div>
                  <div>Consultant Cardiologist</div>
                  <div>Reg. No: 12345</div>
                </div>
              </div>
            </div>

            {/* Vitals */}
            {prescriptionTemplate.sections.vitals && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Vitals
                </h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><strong>BP:</strong> 120/80 mmHg</div>
                  <div><strong>Pulse:</strong> 72 bpm</div>
                  <div><strong>Weight:</strong> 70 kg</div>
                  <div><strong>Temperature:</strong> 98.6°F</div>
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {prescriptionTemplate.sections.diagnosis && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Diagnosis</h3>
                <div className="text-sm">
                  1. Hypertension (Essential)<br/>
                  2. Type 2 Diabetes Mellitus
                </div>
              </div>
            )}

            {/* Medicines */}
            {prescriptionTemplate.sections.medicines && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Medications</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>1. Amlodipine 5mg</span>
                    <span>1-0-0 x 30 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. Metformin 500mg</span>
                    <span>1-0-1 x 30 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3. Aspirin 75mg</span>
                    <span>0-0-1 x 30 days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Advice */}
            {prescriptionTemplate.sections.advice && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Doctor's Advice</h3>
                <div className="text-sm">
                  • Regular exercise for 30 minutes daily<br/>
                  • Low salt and sugar diet<br/>
                  • Monitor blood pressure daily<br/>
                  • Take medications as prescribed
                </div>
              </div>
            )}

            {/* Next Appointment */}
            {prescriptionTemplate.sections.nextAppointment && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Next Appointment</h3>
                <div className="text-sm">
                  <strong>Date:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br/>
                  <strong>Time:</strong> 10:00 AM<br/>
                  <strong>Department:</strong> Cardiology
                </div>
              </div>
            )}

            {/* Footer */}
            {(prescriptionTemplate.footer.signature || prescriptionTemplate.footer.qrCode || prescriptionTemplate.footer.customNotes) && (
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-end">
                  <div>
                    {prescriptionTemplate.footer.customNotes && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {prescriptionTemplate.footer.customNotes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {prescriptionTemplate.footer.signature && (
                      <div className="text-sm">
                        <div className="border-t border-gray-300 w-48 mb-1"></div>
                        <div>Doctor's Signature</div>
                      </div>
                    )}
                  </div>
                </div>
                {prescriptionTemplate.footer.qrCode && (
                  <div className="flex justify-center mt-4">
                    <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs">
                      QR Code
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};