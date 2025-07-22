import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Filter, 
  Download,
  Eye,
  Edit2,
  UserPlus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  email?: string;
  address?: string;
  lastVisit: string;
  department: string;
  doctor: string;
  registrationDate: string;
  visits: number;
  bloodGroup?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  medicalConditions?: string[];
}

const patientsData: Patient[] = [
  {
    id: 'P001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    contact: '+1 (555) 123-4567',
    email: 'john.doe@email.com',
    address: '123 Main St, City, State 12345',
    lastVisit: '2024-01-15',
    department: 'Cardiology',
    doctor: 'Dr. Sarah Johnson',
    registrationDate: '2023-06-15',
    visits: 12,
    bloodGroup: 'O+',
    emergencyContact: '+1 (555) 987-6543',
    insuranceProvider: 'Health Plus',
    medicalConditions: ['Hypertension', 'Diabetes Type 2']
  },
  {
    id: 'P002',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    contact: '+1 (555) 234-5678',
    email: 'jane.smith@email.com',
    lastVisit: '2024-01-12',
    department: 'Dermatology',
    doctor: 'Dr. Michael Brown',
    registrationDate: '2023-08-20',
    visits: 6,
    bloodGroup: 'A+',
    emergencyContact: '+1 (555) 876-5432',
    insuranceProvider: 'MediCare Pro'
  },
  {
    id: 'P003',
    name: 'Robert Wilson',
    age: 58,
    gender: 'Male',
    contact: '+1 (555) 345-6789',
    lastVisit: '2024-01-10',
    department: 'Orthopedics',
    doctor: 'Dr. Lisa Wang',
    registrationDate: '2023-03-10',
    visits: 18,
    bloodGroup: 'B+',
    medicalConditions: ['Arthritis']
  },
  {
    id: 'P004',
    name: 'Emily Davis',
    age: 28,
    gender: 'Female',
    contact: '+1 (555) 456-7890',
    email: 'emily.davis@email.com',
    lastVisit: '2024-01-08',
    department: 'Pediatrics',
    doctor: 'Dr. James Miller',
    registrationDate: '2023-11-05',
    visits: 4,
    bloodGroup: 'AB+',
    emergencyContact: '+1 (555) 765-4321'
  },
  {
    id: 'P005',
    name: 'Michael Johnson',
    age: 35,
    gender: 'Male',
    contact: '+1 (555) 567-8901',
    lastVisit: '2024-01-05',
    department: 'Neurology',
    doctor: 'Dr. Amanda White',
    registrationDate: '2023-09-12',
    visits: 8,
    bloodGroup: 'O-',
    insuranceProvider: 'Unity Health'
  }
];

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(patientsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  const departments = Array.from(new Set(patients.map(p => p.department)));

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.contact.includes(searchTerm) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || patient.department === departmentFilter;
    
    const today = new Date();
    const lastVisit = new Date(patient.lastVisit);
    const daysDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24));
    
    let matchesDate = true;
    if (dateFilter === 'recent') matchesDate = daysDiff <= 7;
    else if (dateFilter === 'month') matchesDate = daysDiff <= 30;
    else if (dateFilter === 'old') matchesDate = daysDiff > 90;
    
    return matchesSearch && matchesDepartment && matchesDate;
  });

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetail(true);
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Name', 'Age', 'Gender', 'Contact', 'Department', 'Doctor', 'Last Visit', 'Visits'],
      ...filteredPatients.map(p => [
        p.id, p.name, p.age.toString(), p.gender, p.contact, p.department, p.doctor, p.lastVisit, p.visits.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    console.log('Exporting CSV:', csvContent);
    // In a real app, this would trigger a download
  };

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Patient Management</h2>
          <p className="text-muted-foreground">Manage patient records and information</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search patients by name, ID, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by last visit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="recent">Recent (7 days)</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="old">Inactive (90+ days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Visits</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => {
                    const daysDiff = Math.floor((new Date().getTime() - new Date(p.lastVisit).getTime()) / (1000 * 3600 * 24));
                    return daysDiff <= 7;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Patients</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => {
                    const daysDiff = Math.floor((new Date().getTime() - new Date(p.lastVisit).getTime()) / (1000 * 3600 * 24));
                    return daysDiff <= 90;
                  }).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
              <Filter className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table/List */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patients found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Patient</th>
                      <th className="text-left py-3 px-4 font-medium">Contact</th>
                      <th className="text-left py-3 px-4 font-medium">Department</th>
                      <th className="text-left py-3 px-4 font-medium">Doctor</th>
                      <th className="text-left py-3 px-4 font-medium">Last Visit</th>
                      <th className="text-left py-3 px-4 font-medium">Visits</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(patient => (
                      <tr key={patient.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient.age} years • {patient.gender} • {patient.id}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p>{patient.contact}</p>
                            {patient.email && (
                              <p className="text-muted-foreground">{patient.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{patient.department}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">{patient.doctor}</td>
                        <td className="py-3 px-4 text-sm">{patient.lastVisit}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-100 text-blue-800">{patient.visits}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePatientClick(patient)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredPatients.map(patient => (
                  <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePatientClick(patient)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {patient.age} years • {patient.gender} • {patient.id}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">{patient.visits} visits</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{patient.contact}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{patient.department}</Badge>
                          <span className="text-muted-foreground">•</span>
                          <span>{patient.doctor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Last visit: {patient.lastVisit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog open={showPatientDetail} onOpenChange={setShowPatientDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                  <p className="text-muted-foreground">Patient ID: {selectedPatient.id}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedPatient.visits} Visits
                  </Badge>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Age</p>
                  <p>{selectedPatient.age} years</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p>{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                  <p>{selectedPatient.bloodGroup || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                  <p>{selectedPatient.registrationDate}</p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedPatient.contact}</span>
                  </div>
                  {selectedPatient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPatient.email}</span>
                    </div>
                  )}
                  {selectedPatient.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPatient.address}</span>
                    </div>
                  )}
                  {selectedPatient.emergencyContact && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-red-500" />
                      <span>Emergency: {selectedPatient.emergencyContact}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h4 className="font-medium mb-3">Medical Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Department</p>
                    <Badge variant="outline">{selectedPatient.department}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attending Doctor</p>
                    <p>{selectedPatient.doctor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Visit</p>
                    <p>{selectedPatient.lastVisit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Insurance Provider</p>
                    <p>{selectedPatient.insuranceProvider || 'None'}</p>
                  </div>
                </div>
                
                {selectedPatient.medicalConditions && selectedPatient.medicalConditions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Medical Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.medicalConditions.map((condition, index) => (
                        <Badge key={index} className="bg-orange-100 text-orange-800">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Patient
                </Button>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};