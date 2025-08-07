import React, { useState } from 'react';
import { 
  X, 
  User, 
  FileText, 
  TestTube, 
  Calendar,
  Phone,
  MapPin,
  Edit,
  Save,
  Download,
  Printer,
  Plus,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from '@/hooks/use-toast';

interface PatientProfileProps {
  patientId: string;
  onClose: () => void;
}

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
}

interface Prescription {
  id: string;
  date: Date;
  doctor: string;
  visitType: string;
  symptoms: string;
  diagnosis: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  instructions: string;
}

interface LabTest {
  id: string;
  date: Date;
  testName: string;
  doctor: string;
  status: 'ordered' | 'collected' | 'completed';
  results?: {
    parameter: string;
    value: string;
    normalRange: string;
    status: 'normal' | 'high' | 'low';
  }[];
}

const samplePatient: PatientData = {
  id: 'P001',
  name: 'John Doe',
  age: 45,
  gender: 'Male',
  phone: '+91-9876543210',
  email: 'john.doe@email.com',
  address: '123 Main Street, City, State - 123456',
  bloodGroup: 'B+',
  emergencyContact: '+91-9876543211',
  medicalHistory: ['Hypertension (2020)', 'Diabetes Type 2 (2018)'],
  allergies: ['Penicillin', 'Shellfish'],
  currentMedications: ['Metformin 500mg', 'Lisinopril 10mg']
};

const samplePrescriptions: Prescription[] = [
  {
    id: 'RX001',
    date: new Date('2024-01-15'),
    doctor: 'Dr. Sarah Johnson',
    visitType: 'Follow-up',
    symptoms: 'Chest pain, shortness of breath',
    diagnosis: 'Hypertensive cardiovascular disease (I11.9)',
    medications: [
      {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days'
      },
      {
        name: 'Atenolol',
        dosage: '25mg',
        frequency: 'Twice daily',
        duration: '30 days'
      }
    ],
    instructions: 'Take medications with food. Monitor blood pressure daily. Return in 4 weeks.'
  }
];

const sampleLabTests: LabTest[] = [
  {
    id: 'LAB001',
    date: new Date('2024-01-15'),
    testName: 'Complete Blood Count',
    doctor: 'Dr. Sarah Johnson',
    status: 'completed',
    results: [
      { parameter: 'Hemoglobin', value: '13.5', normalRange: '13.0-17.0', status: 'normal' },
      { parameter: 'WBC Count', value: '8.2', normalRange: '4.0-11.0', status: 'normal' },
      { parameter: 'Platelet Count', value: '250', normalRange: '150-400', status: 'normal' }
    ]
  },
  {
    id: 'LAB002',
    date: new Date('2024-01-10'),
    testName: 'Lipid Profile',
    doctor: 'Dr. Sarah Johnson',
    status: 'completed',
    results: [
      { parameter: 'Total Cholesterol', value: '220', normalRange: '<200', status: 'high' },
      { parameter: 'HDL Cholesterol', value: '45', normalRange: '>40', status: 'normal' },
      { parameter: 'LDL Cholesterol', value: '140', normalRange: '<100', status: 'high' }
    ]
  }
];

export const PatientProfile: React.FC<PatientProfileProps> = ({ patientId, onClose }) => {
  const [patient, setPatient] = useState<PatientData>(samplePatient);
  const [prescriptions] = useState<Prescription[]>(samplePrescriptions);
  const [labTests] = useState<LabTest[]>(sampleLabTests);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCustomizePrescription, setShowCustomizePrescription] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // Save logic here
  };

  const getStatusBadge = (status: LabTest['status']) => {
    const variants = {
      ordered: 'secondary',
      collected: 'outline',
      completed: 'default'
    };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  const getResultStatus = (status: 'normal' | 'high' | 'low') => {
    const colors = {
      normal: 'text-green-600',
      high: 'text-red-600',
      low: 'text-orange-600'
    };
    return colors[status];
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col shadow-elegant animate-scale-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b space-y-4 sm:space-y-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
              <AvatarImage src="/api/placeholder/64/64" />
              <AvatarFallback className="text-base sm:text-lg">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{patient.name}</h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span>ID: {patient.id}</span>
                <span>Age: {patient.age}</span>
                <span>Gender: {patient.gender}</span>
                <span>Blood Group: {patient.bloodGroup}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setShowCustomizePrescription(true)} 
              size="sm"
              className="bg-gradient-primary text-white"
            >
              <Settings className="h-4 w-4 mr-1" />
              Customize Prescription
            </Button>
            
            {isEditing ? (
              <>
                <Button onClick={handleSave} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Patient History</span>
                <span className="sm:hidden">History</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">E-Prescription</span>
                <span className="sm:hidden">Rx</span>
              </TabsTrigger>
              <TabsTrigger value="treatment" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Treatment Plans</span>
                <span className="sm:hidden">Plans</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Progress Notes</span>
                <span className="sm:hidden">Notes</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="profile" className="mt-0 space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex">
                        <Phone className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={patient.phone}
                          onChange={(e) => setPatient(prev => ({ ...prev, phone: e.target.value }))}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={patient.email}
                        onChange={(e) => setPatient(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <div className="flex">
                        <MapPin className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={patient.address}
                          onChange={(e) => setPatient(prev => ({ ...prev, address: e.target.value }))}
                          disabled={!isEditing}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="emergency">Emergency Contact</Label>
                      <Input
                        id="emergency"
                        value={patient.emergencyContact}
                        onChange={(e) => setPatient(prev => ({ ...prev, emergencyContact: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Medical Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Medical History</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {patient.medicalHistory.map((history, index) => (
                          <Badge key={index} variant="outline">{history}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Allergies</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {patient.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Current Medications</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {patient.currentMedications.map((medication, index) => (
                          <Badge key={index} variant="secondary">{medication}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Prescription History</h3>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Prescription
                  </Button>
                </div>

                {prescriptions.map((prescription) => (
                  <Card key={prescription.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{prescription.id}</CardTitle>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>Date: {prescription.date.toLocaleDateString()}</span>
                            <span>Doctor: {prescription.doctor}</span>
                            <span>Visit: {prescription.visitType}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Symptoms</Label>
                          <p className="text-sm">{prescription.symptoms}</p>
                        </div>
                        <div>
                          <Label>Diagnosis</Label>
                          <p className="text-sm font-medium">{prescription.diagnosis}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label>Medications</Label>
                        <div className="mt-2 space-y-2">
                          {prescription.medications.map((med, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">{med.name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Dosage:</span> {med.dosage}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Frequency:</span> {med.frequency}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration:</span> {med.duration}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Instructions</Label>
                        <p className="text-sm">{prescription.instructions}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="lab" className="mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Lab Test History</h3>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Order Test
                  </Button>
                </div>

                {labTests.map((test) => (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{test.testName}</CardTitle>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>Date: {test.date.toLocaleDateString()}</span>
                            <span>Doctor: {test.doctor}</span>
                            <span>Test ID: {test.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(test.status)}
                          {test.status === 'completed' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {test.results && (
                      <CardContent>
                        <div className="space-y-3">
                          <Label>Test Results</Label>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Parameter</th>
                                  <th className="text-left py-2">Value</th>
                                  <th className="text-left py-2">Normal Range</th>
                                  <th className="text-left py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {test.results.map((result, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="py-2 font-medium">{result.parameter}</td>
                                    <td className="py-2">{result.value}</td>
                                    <td className="py-2 text-muted-foreground">{result.normalRange}</td>
                                    <td className="py-2">
                                      <span className={`font-medium ${getResultStatus(result.status)}`}>
                                        {result.status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="treatment" className="mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Treatment Plans</h3>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Plan
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Treatment Plan - Hypertension Management</CardTitle>
                    <p className="text-sm text-muted-foreground">Started: Jan 1, 2024 | Dr. Sarah Johnson</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Treatment Goals</Label>
                      <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                        <li>Reduce systolic BP to &lt;130 mmHg</li>
                        <li>Maintain diastolic BP &lt;80 mmHg</li>
                        <li>Weight reduction of 10% over 6 months</li>
                      </ul>
                    </div>
                    <div>
                      <Label>Interventions</Label>
                      <div className="space-y-2 mt-2">
                        <Badge variant="secondary">Medication: ACE Inhibitor</Badge>
                        <Badge variant="secondary">Diet: Low sodium (&lt;2g/day)</Badge>
                        <Badge variant="secondary">Exercise: 30 min daily</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Progress Notes</h3>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Follow-up Visit</CardTitle>
                        <p className="text-sm text-muted-foreground">Jan 15, 2024 | Dr. Sarah Johnson</p>
                      </div>
                      <Badge variant="default">Recent</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label>Chief Complaint</Label>
                        <p className="text-sm">Patient reports occasional chest discomfort and shortness of breath during exertion.</p>
                      </div>
                      <Separator />
                      <div>
                        <Label>Assessment</Label>
                        <p className="text-sm">Blood pressure well controlled on current regimen. Patient compliant with medications. Weight reduced by 3kg since last visit.</p>
                      </div>
                      <Separator />
                      <div>
                        <Label>Plan</Label>
                        <p className="text-sm">Continue current medications. Increase exercise duration to 45 minutes daily. Follow-up in 4 weeks.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Prescription Customization Modal */}
        {showCustomizePrescription && (
          <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Customize Prescription Template</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomizePrescription(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clinicName">Clinic/Hospital Name</Label>
                    <Input id="clinicName" placeholder="Enter clinic name" />
                  </div>
                  
                  <div>
                    <Label htmlFor="doctorName">Doctor Name</Label>
                    <Input id="doctorName" placeholder="Dr. Name" defaultValue="Dr. Sarah Johnson" />
                  </div>
                  
                  <div>
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input id="qualification" placeholder="MD, MBBS, etc." />
                  </div>
                  
                  <div>
                    <Label htmlFor="regNumber">Registration Number</Label>
                    <Input id="regNumber" placeholder="Medical registration number" />
                  </div>
                  
                  <div>
                    <Label htmlFor="headerText">Header Text</Label>
                    <Textarea id="headerText" placeholder="Custom header text for prescription" rows={3} />
                  </div>
                  
                  <div>
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Textarea id="footerText" placeholder="Custom footer text for prescription" rows={3} />
                  </div>
                  
                  <div>
                    <Label>Template Style</Label>
                    <Select defaultValue="modern">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern Template</SelectItem>
                        <SelectItem value="classic">Classic Template</SelectItem>
                        <SelectItem value="minimal">Minimal Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-gradient-primary text-white"
                    onClick={() => {
                      setShowCustomizePrescription(false);
                      toast({
                        title: "Template Saved!",
                        description: "Prescription template has been updated successfully."
                      });
                    }}
                  >
                    Save Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowCustomizePrescription(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};