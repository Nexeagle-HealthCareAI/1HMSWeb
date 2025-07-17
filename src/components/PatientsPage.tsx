import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Calendar, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  lastVisit: string;
  department: string;
  doctor: string;
  registrationDate: string;
  visits: number;
}

const patientsData: Patient[] = [
  {
    id: "P001",
    name: "John Doe",
    age: 35,
    gender: "Male",
    contact: "+91-9876543210",
    lastVisit: "2024-07-15",
    department: "Cardiology",
    doctor: "Dr. Sarah Johnson",
    registrationDate: "2024-01-15",
    visits: 5
  },
  {
    id: "P002",
    name: "Jane Smith", 
    age: 28,
    gender: "Female",
    contact: "+91-9876543211",
    lastVisit: "2024-07-14",
    department: "Neurology",
    doctor: "Dr. Emily Davis",
    registrationDate: "2024-02-20",
    visits: 3
  },
  {
    id: "P003",
    name: "Robert Wilson",
    age: 42,
    gender: "Male", 
    contact: "+91-9876543212",
    lastVisit: "2024-07-10",
    department: "General Medicine",
    doctor: "Dr. Lisa Anderson",
    registrationDate: "2024-03-10",
    visits: 8
  },
  {
    id: "P004",
    name: "Maria Garcia",
    age: 31,
    gender: "Female",
    contact: "+91-9876543213",
    lastVisit: "2024-07-12",
    department: "Cardiology", 
    doctor: "Dr. Michael Chen",
    registrationDate: "2024-01-25",
    visits: 4
  },
  {
    id: "P005",
    name: "David Brown",
    age: 55,
    gender: "Male",
    contact: "+91-9876543214", 
    lastVisit: "2024-07-08",
    department: "General Medicine",
    doctor: "Dr. James Brown",
    registrationDate: "2024-04-05",
    visits: 6
  }
];

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(patientsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  // Filter patients based on search and filters
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.contact.includes(searchTerm);
    
    const matchesDepartment = departmentFilter === 'all' || patient.department === departmentFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const today = new Date();
      const registrationDate = new Date(patient.registrationDate);
      
      switch (dateFilter) {
        case 'today':
          return registrationDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return registrationDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return registrationDate >= monthAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDepartment && matchesDate;
  });

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetail(true);
  };

  const exportData = () => {
    // Simulate CSV export
    const csvContent = [
      ['ID', 'Name', 'Age', 'Gender', 'Contact', 'Department', 'Doctor', 'Last Visit', 'Total Visits'],
      ...filteredPatients.map(p => [
        p.id, p.name, p.age, p.gender, p.contact, p.department, p.doctor, p.lastVisit, p.visits
      ])
    ];
    
    console.log('Exporting CSV:', csvContent);
    // In real implementation, this would trigger a download
  };

  const departments = [...new Set(patients.map(p => p.department))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-muted-foreground">
            Manage registered patients ({filteredPatients.length} total)
          </p>
        </div>
        <Button onClick={exportData} className="bg-healthcare-primary hover:bg-healthcare-primary/90">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Department Filter */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Registration Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Registered Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Patient ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Age</th>
                  <th className="text-left py-3 px-4 font-semibold">Gender</th>
                  <th className="text-left py-3 px-4 font-semibold">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold">Department</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Visit</th>
                  <th className="text-left py-3 px-4 font-semibold">Visits</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-medium text-healthcare-primary"
                        onClick={() => handlePatientClick(patient)}
                      >
                        {patient.id}
                      </Button>
                    </td>
                    <td className="py-3 px-4 font-medium">{patient.name}</td>
                    <td className="py-3 px-4">{patient.age}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{patient.gender}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {patient.contact}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{patient.department}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(patient.lastVisit).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{patient.visits}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePatientClick(patient)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPatients.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No patients found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Detail Modal */}
      <Dialog open={showPatientDetail} onOpenChange={setShowPatientDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-healthcare-primary" />
              Patient Profile
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Patient ID</label>
                    <p className="font-semibold">{selectedPatient.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="font-semibold">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Age</label>
                    <p className="font-semibold">{selectedPatient.age} years</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="font-semibold">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact</label>
                    <p className="font-semibold">{selectedPatient.contact}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Visits</label>
                    <p className="font-semibold">{selectedPatient.visits}</p>
                  </div>
                </div>
              </div>

              {/* Medical Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Medical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Department</label>
                    <p className="font-semibold">{selectedPatient.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Consulting Doctor</label>
                    <p className="font-semibold">{selectedPatient.doctor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Visit</label>
                    <p className="font-semibold">{new Date(selectedPatient.lastVisit).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                    <p className="font-semibold">{new Date(selectedPatient.registrationDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1 bg-healthcare-primary">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
                <Button variant="outline" className="flex-1">
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};