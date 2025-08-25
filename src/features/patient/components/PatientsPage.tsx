import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Phone,
  Mail,
  Calendar,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { patientApi, Patient, PatientFilters } from '../services/patientApi';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [bloodTypeFilter, setBloodTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const filters: PatientFilters = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        blood_type: bloodTypeFilter !== 'all' ? bloodTypeFilter : undefined,
      };
      
      const response = await patientApi.getAll(filters);
      setPatients(response.data || []);
      setTotalPatients(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Fallback to mock data for demonstration
      setPatients([
        {
          id: 'P001',
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '+1234567890',
          date_of_birth: '1990-05-15',
          gender: 'male',
          blood_type: 'O+',
          address: '123 Main St, City, State',
          emergency_contact: {
            name: 'Jane Doe',
            relationship: 'Spouse',
            phone: '+1234567891'
          },
          insurance_info: {
            provider: 'Blue Cross',
            policy_number: 'BC123456789',
            group_number: 'GRP001'
          },
          medical_history: 'Hypertension, Diabetes',
          allergies: ['Penicillin'],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'P002',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1234567892',
          date_of_birth: '1985-08-22',
          gender: 'female',
          blood_type: 'A+',
          address: '456 Oak Ave, City, State',
          emergency_contact: {
            name: 'Mike Johnson',
            relationship: 'Husband',
            phone: '+1234567893'
          },
          insurance_info: {
            provider: 'Aetna',
            policy_number: 'AE987654321',
            group_number: 'GRP002'
          },
          medical_history: 'Asthma',
          allergies: ['Dairy'],
          created_at: '2024-01-10T14:30:00Z',
          updated_at: '2024-01-10T14:30:00Z'
        }
      ]);
      setTotalPatients(2);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchTerm, genderFilter, bloodTypeFilter, currentPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'gender') {
      setGenderFilter(value);
    } else if (filterType === 'bloodType') {
      setBloodTypeFilter(value);
    }
    setCurrentPage(1);
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/patient/${patientId}`);
  };

  const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getGenderColor = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'female': return 'bg-pink-100 text-pink-800 border-pink-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBloodTypeColor = (bloodType: string) => {
    switch (bloodType) {
      case 'O+': return 'bg-red-100 text-red-800 border-red-300';
      case 'O-': return 'bg-red-50 text-red-700 border-red-200';
      case 'A+': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'A-': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'B+': return 'bg-green-100 text-green-800 border-green-300';
      case 'B-': return 'bg-green-50 text-green-700 border-green-200';
      case 'AB+': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'AB-': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-healthcare-primary" />
          <h1 className="text-2xl font-bold">Patients Management</h1>
        </div>
        <Button 
          onClick={() => navigate('/patient/new')}
          className="bg-healthcare-primary hover:bg-healthcare-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Patients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={genderFilter} onValueChange={(value) => handleFilterChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bloodTypeFilter} onValueChange={(value) => handleFilterChange('bloodType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by blood type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Types</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Patients ({totalPatients})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-healthcare-primary"></div>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No patients found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePatientClick(patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-healthcare-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-healthcare-primary font-semibold">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {patient.name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            ID: {patient.id}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getAge(patient.date_of_birth)} years
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getGenderColor(patient.gender)}>
                        {patient.gender}
                      </Badge>
                      <Badge className={getBloodTypeColor(patient.blood_type || '')}>
                        {patient.blood_type}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePatientClick(patient.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/patient/${patient.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};