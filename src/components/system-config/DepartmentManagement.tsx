import React, { useState } from 'react';
import { 
  Building2,
  Plus,
  Edit,
  Trash2,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

export interface Department {
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

export interface DoctorAssignment {
  doctorId: string;
  doctorName: string;
  role: 'Consultant' | 'Assistant' | 'Visiting Doctor' | 'HOD';
  schedule?: string;
}

interface DepartmentManagementProps {
  departments: Department[];
  onDepartmentsChange: (departments: Department[]) => void;
}

const availableDoctors = [
  { id: 'D001', name: 'Dr. Sarah Johnson', specialty: 'Cardiology' },
  { id: 'D002', name: 'Dr. Emily Davis', specialty: 'Pediatrics' },
  { id: 'D003', name: 'Dr. Michael Wilson', specialty: 'Neurology' },
  { id: 'D004', name: 'Dr. Robert Chen', specialty: 'Cardiology' },
  { id: 'D005', name: 'Dr. Lisa Anderson', specialty: 'Dermatology' }
];

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  departments,
  onDepartmentsChange
}) => {
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const { toast } = useToast();

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    shortCode: '',
    description: '',
    doctors: [] as DoctorAssignment[]
  });

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

    const updatedDepartments = [...departments, department];
    onDepartmentsChange(updatedDepartments);
    setNewDepartment({ name: '', shortCode: '', description: '', doctors: [] });
    setShowDepartmentDialog(false);

    toast({
      title: "Department Added",
      description: `${department.name} has been added successfully.`,
    });
  };

  const handleUpdateDepartment = () => {
    if (!editingDepartment) return;

    const updatedDepartments = departments.map(dept => 
      dept.id === editingDepartment.id ? editingDepartment : dept
    );
    onDepartmentsChange(updatedDepartments);

    setEditingDepartment(null);
    toast({
      title: "Department Updated",
      description: "Department has been updated successfully.",
    });
  };

  const handleDeleteDepartment = (departmentId: string) => {
    const updatedDepartments = departments.map(dept => 
      dept.id === departmentId ? { ...dept, isActive: false } : dept
    );
    onDepartmentsChange(updatedDepartments);

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

  const removeDoctorFromDepartment = (doctorId: string) => {
    if (editingDepartment) {
      setEditingDepartment(prev => prev ? {
        ...prev,
        doctors: prev.doctors.filter(doc => doc.doctorId !== doctorId)
      } : null);
    } else {
      setNewDepartment(prev => ({
        ...prev,
        doctors: prev.doctors.filter(doc => doc.doctorId !== doctorId)
      }));
    }
  };

  const currentDepartment = editingDepartment || newDepartment;

  return (
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
          setNewDepartment({ name: '', shortCode: '', description: '', doctors: [] });
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
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name</Label>
                <Input
                  id="deptName"
                  value={currentDepartment.name}
                  onChange={(e) => {
                    if (editingDepartment) {
                      setEditingDepartment(prev => prev ? { ...prev, name: e.target.value } : null);
                    } else {
                      setNewDepartment(prev => ({ ...prev, name: e.target.value }));
                    }
                  }}
                  placeholder="e.g., Cardiology"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deptCode">Short Code</Label>
                <Input
                  id="deptCode"
                  value={currentDepartment.shortCode}
                  onChange={(e) => {
                    if (editingDepartment) {
                      setEditingDepartment(prev => prev ? { ...prev, shortCode: e.target.value } : null);
                    } else {
                      setNewDepartment(prev => ({ ...prev, shortCode: e.target.value }));
                    }
                  }}
                  placeholder="e.g., CARD"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deptDescription">Description</Label>
              <Textarea
                id="deptDescription"
                value={currentDepartment.description}
                onChange={(e) => {
                  if (editingDepartment) {
                    setEditingDepartment(prev => prev ? { ...prev, description: e.target.value } : null);
                  } else {
                    setNewDepartment(prev => ({ ...prev, description: e.target.value }));
                  }
                }}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>

            {/* Doctor Assignment Section */}
            <div className="space-y-4">
              <h4 className="font-medium">Assign Doctors</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Doctor</Label>
                  <Select onValueChange={(doctorId) => {
                    const doctor = availableDoctors.find(d => d.id === doctorId);
                    if (doctor) {
                      addDoctorToDepartment(doctorId, 'Consultant');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDoctors.map(doctor => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select onValueChange={(role) => {
                    // This will be handled when doctor is selected
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                      <SelectItem value="Visiting Doctor">Visiting Doctor</SelectItem>
                      <SelectItem value="HOD">HOD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Doctors List */}
              {currentDepartment.doctors.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Doctors</Label>
                  <div className="space-y-2">
                    {currentDepartment.doctors.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-sm">{doc.doctorName}</div>
                            <Badge variant="outline" className="text-xs">{doc.role}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDoctorFromDepartment(doc.doctorId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDepartmentDialog(false);
                setEditingDepartment(null);
                setNewDepartment({ name: '', shortCode: '', description: '', doctors: [] });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
            >
              {editingDepartment ? 'Update Department' : 'Add Department'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};