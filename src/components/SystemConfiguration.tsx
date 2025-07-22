import React, { useState } from 'react';
import { 
  Building2,
  Users,
  FileText,
  Settings,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Eye,
  Save,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Palette,
  Image,
  UserPlus,
  BarChart3,
  Calendar,
  Stethoscope,
  X,
  Check
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

  const renderDepartmentManagement = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Department Management</h2>
          <p className="text-sm text-muted-foreground">Manage hospital departments and doctor assignments</p>
        </div>
        <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deptName">Department Name</Label>
                  <Input
                    id="deptName"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Cardiology"
                  />
                </div>
                <div>
                  <Label htmlFor="shortCode">Short Code</Label>
                  <Input
                    id="shortCode"
                    value={newDepartment.shortCode}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, shortCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g., CARD"
                    maxLength={6}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the department"
                  rows={3}
                />
              </div>

              <div>
                <Label>Assign Doctors</Label>
                <div className="space-y-2">
                  {newDepartment.doctors.map((assignment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <span className="flex-1 font-medium">{assignment.doctorName}</span>
                      <Badge variant="outline">{assignment.role}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNewDepartment(prev => ({
                          ...prev,
                          doctors: prev.doctors.filter((_, i) => i !== index)
                        }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Select onValueChange={(doctorId) => addDoctorToDepartment(doctorId, 'Consultant')}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDoctors
                          .filter(doctor => !newDepartment.doctors.some(d => d.doctorId === doctor.id))
                          .map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.name} - {doctor.specialty}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddDepartment} className="flex-1">
                  Add Department
                </Button>
                <Button variant="outline" onClick={() => setShowDepartmentDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.filter(dept => dept.isActive).map((department) => (
          <Card key={department.id} className="shadow-card hover:shadow-hover transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{department.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{department.shortCode}</Badge>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingDepartment(department)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDepartment(department.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{department.description}</p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-semibold text-sm">{department.stats.totalPatients}</div>
                  <div className="text-xs text-muted-foreground">Patients</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-semibold text-sm">{department.stats.todayAppointments}</div>
                  <div className="text-xs text-muted-foreground">Today</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-semibold text-sm">₹{department.stats.monthlyRevenue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                </div>
              </div>

              {/* Doctors */}
              <div>
                <Label className="text-sm font-medium">Assigned Doctors</Label>
                <div className="space-y-1 mt-1">
                  {department.doctors.map((assignment, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{assignment.doctorName}</span>
                      <Badge variant="secondary" className="text-xs">{assignment.role}</Badge>
                    </div>
                  ))}
                  {department.doctors.length === 0 && (
                    <p className="text-sm text-muted-foreground">No doctors assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Department Dialog */}
      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Department Name</Label>
                  <Input
                    value={editingDepartment.name}
                    onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Short Code</Label>
                  <Input
                    value={editingDepartment.shortCode}
                    onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, shortCode: e.target.value } : null)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingDepartment.description}
                  onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Assigned Doctors</Label>
                <div className="space-y-2">
                  {editingDepartment.doctors.map((assignment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <span className="flex-1 font-medium">{assignment.doctorName}</span>
                      <Select 
                        value={assignment.role} 
                        onValueChange={(role: DoctorAssignment['role']) => 
                          setEditingDepartment(prev => prev ? {
                            ...prev,
                            doctors: prev.doctors.map((d, i) => i === index ? { ...d, role } : d)
                          } : null)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOD">HOD</SelectItem>
                          <SelectItem value="Consultant">Consultant</SelectItem>
                          <SelectItem value="Assistant">Assistant</SelectItem>
                          <SelectItem value="Visiting Doctor">Visiting</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDepartment(prev => prev ? {
                          ...prev,
                          doctors: prev.doctors.filter((_, i) => i !== index)
                        } : null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateDepartment} className="flex-1">
                  Update Department
                </Button>
                <Button variant="outline" onClick={() => setEditingDepartment(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderPrescriptionTemplate = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Prescription Template</h2>
          <p className="text-sm text-muted-foreground">Customize prescription layout and content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplatePreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
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
        {/* Template Configuration */}
        <div className="space-y-6">
          {/* Header Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Header Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Hospital Logo</Label>
                <Switch
                  checked={prescriptionTemplate.header.showLogo}
                  onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    header: { ...prev.header, showLogo: checked }
                  }))}
                />
              </div>
              
              <div>
                <Label>Hospital Name</Label>
                <Input
                  value={prescriptionTemplate.header.hospitalName}
                  onChange={(e) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    header: { ...prev.header, hospitalName: e.target.value }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Contact Information</Label>
                <Switch
                  checked={prescriptionTemplate.header.contactInfo}
                  onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    header: { ...prev.header, contactInfo: checked }
                  }))}
                />
              </div>

              <div>
                <Label>Custom Header Text</Label>
                <Textarea
                  value={prescriptionTemplate.header.customText || ''}
                  onChange={(e) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    header: { ...prev.header, customText: e.target.value }
                  }))}
                  placeholder="Additional header information"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prescription Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(prescriptionTemplate.sections).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <Switch
                    checked={value}
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
              <CardTitle className="text-lg">Footer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Doctor Signature</Label>
                <Switch
                  checked={prescriptionTemplate.footer.signature}
                  onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    footer: { ...prev.footer, signature: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>QR Code for E-Prescription</Label>
                <Switch
                  checked={prescriptionTemplate.footer.qrCode}
                  onCheckedChange={(checked) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    footer: { ...prev.footer, qrCode: checked }
                  }))}
                />
              </div>

              <div>
                <Label>Custom Footer Notes</Label>
                <Textarea
                  value={prescriptionTemplate.footer.customNotes || ''}
                  onChange={(e) => setPrescriptionTemplate(prev => ({
                    ...prev,
                    footer: { ...prev.footer, customNotes: e.target.value }
                  }))}
                  placeholder="e.g., Get tests from NABL-certified labs only"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border p-6 rounded-lg min-h-[600px] text-black">
                {/* Header */}
                {prescriptionTemplate.header.showLogo && (
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-gray-200 mx-auto rounded mb-2 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">{prescriptionTemplate.header.hospitalName}</h1>
                  {prescriptionTemplate.header.contactInfo && (
                    <p className="text-sm text-gray-600 mt-1">
                      Phone: +91-9876543210 | Email: info@hospital.com
                    </p>
                  )}
                  {prescriptionTemplate.header.customText && (
                    <p className="text-sm text-gray-600 mt-1">{prescriptionTemplate.header.customText}</p>
                  )}
                </div>

                <div className="border-t border-b py-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Patient:</strong> John Doe<br />
                      <strong>Age/Gender:</strong> 45/M<br />
                      <strong>Date:</strong> {new Date().toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Doctor:</strong> Dr. Smith<br />
                      <strong>Reg. No:</strong> 12345<br />
                      <strong>Department:</strong> Cardiology
                    </div>
                  </div>
                </div>

                {/* Sections */}
                {prescriptionTemplate.sections.vitals && (
                  <div className="mb-4">
                    <h3 className="font-semibold border-b pb-1 mb-2">Vitals</h3>
                    <p className="text-sm">BP: 120/80 | Pulse: 72 bpm | Temp: 98.6°F</p>
                  </div>
                )}

                {prescriptionTemplate.sections.diagnosis && (
                  <div className="mb-4">
                    <h3 className="font-semibold border-b pb-1 mb-2">Diagnosis</h3>
                    <p className="text-sm">Hypertension, controlled</p>
                  </div>
                )}

                {prescriptionTemplate.sections.medicines && (
                  <div className="mb-4">
                    <h3 className="font-semibold border-b pb-1 mb-2">Medicines</h3>
                    <div className="text-sm space-y-1">
                      <p>1. Amlodipine 5mg - 1-0-0 (After breakfast)</p>
                      <p>2. Aspirin 75mg - 0-0-1 (After dinner)</p>
                    </div>
                  </div>
                )}

                {prescriptionTemplate.sections.advice && (
                  <div className="mb-4">
                    <h3 className="font-semibold border-b pb-1 mb-2">Advice</h3>
                    <p className="text-sm">Low salt diet, regular exercise, monitor BP</p>
                  </div>
                )}

                {prescriptionTemplate.sections.nextAppointment && (
                  <div className="mb-6">
                    <h3 className="font-semibold border-b pb-1 mb-2">Next Appointment</h3>
                    <p className="text-sm">Follow up after 2 weeks</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t pt-4 mt-6">
                  {prescriptionTemplate.footer.signature && (
                    <div className="text-right mb-4">
                      <div className="w-32 h-16 border-b ml-auto"></div>
                      <p className="text-sm mt-1">Doctor Signature</p>
                    </div>
                  )}

                  {prescriptionTemplate.footer.customNotes && (
                    <p className="text-xs text-gray-600 text-center">
                      {prescriptionTemplate.footer.customNotes}
                    </p>
                  )}

                  {prescriptionTemplate.footer.qrCode && (
                    <div className="flex justify-center mt-4">
                      <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                        <span className="text-xs">QR Code</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderHospitalBranding = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Hospital Branding</h2>
          <p className="text-sm text-muted-foreground">Configure global branding and identity settings</p>
        </div>
        <Button onClick={handleSaveBranding}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
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
                  placeholder="Short mission statement"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={hospitalBranding.phone}
                  onChange={(e) => setHospitalBranding(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={hospitalBranding.email}
                  onChange={(e) => setHospitalBranding(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={hospitalBranding.website}
                  onChange={(e) => setHospitalBranding(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.hospital.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visual Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hospital Logo</Label>
                <div className="mt-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload logo (PNG, JPG, SVG)</p>
                    <p className="text-xs text-gray-500">Recommended: 150x150px</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={hospitalBranding.primaryColor}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={hospitalBranding.primaryColor}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={hospitalBranding.secondaryColor}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={hospitalBranding.secondaryColor}
                      onChange={(e) => setHospitalBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      placeholder="#64748b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Branding Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Header Preview */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 mx-auto rounded-lg mb-3 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: hospitalBranding.primaryColor }}>
                      {hospitalBranding.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{hospitalBranding.tagline}</p>
                  </div>
                </div>

                {/* Contact Card Preview */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{hospitalBranding.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{hospitalBranding.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span>{hospitalBranding.website}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>{hospitalBranding.address}</span>
                    </div>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Color Palette</h4>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg border mb-2"
                        style={{ backgroundColor: hospitalBranding.primaryColor }}
                      ></div>
                      <p className="text-xs">Primary</p>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg border mb-2"
                        style={{ backgroundColor: hospitalBranding.secondaryColor }}
                      ></div>
                      <p className="text-xs">Secondary</p>
                    </div>
                  </div>
                </div>

                {/* Usage Examples */}
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">This branding will be applied to:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Prescription headers and footers</li>
                    <li>Patient portal interface</li>
                    <li>Email templates</li>
                    <li>Bill and report headers</li>
                    <li>System interface colors</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Configuration</h1>
          <p className="text-muted-foreground">Manage departments, templates, and hospital settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prescription</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          {renderDepartmentManagement()}
        </TabsContent>

        <TabsContent value="prescription">
          {renderPrescriptionTemplate()}
        </TabsContent>

        <TabsContent value="branding">
          {renderHospitalBranding()}
        </TabsContent>
      </Tabs>
    </div>
  );
};