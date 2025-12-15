import React, { useState, useEffect } from 'react';
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
  Settings,
  Maximize2,
  Minimize2,
  PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import EPrescriptionPad from '@/features/patient/components/EPrescriptionPad';



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
  vitals: {
    bp: string;
    pulse: string;
    temp: string;
    weight: string;
    height: string;
    spo2: string;
    respiratoryRate: string;
  };
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
         vitals: {
       bp: '140/90',
       pulse: '72',
       temp: '98.6°F',
       weight: '75kg',
       height: '170cm',
       spo2: '98%',
       respiratoryRate: '16'
     },
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
  const [fullScreenPrescription, setFullScreenPrescription] = useState<Prescription | null>(null);
  const [editingVitals, setEditingVitals] = useState<string | null>(null);
  const [vitalsTimeout, setVitalsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);

  // Handle escape key to exit full screen
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullScreenPrescription) {
        setFullScreenPrescription(null);
      }
    };

    if (fullScreenPrescription) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [fullScreenPrescription]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (vitalsTimeout) {
        clearTimeout(vitalsTimeout);
      }
    };
  }, [vitalsTimeout]);

  const handleSave = () => {
    setIsEditing(false);
    // Save logic here
  };

  // Auto-save vitals after user stops typing
  const handleVitalsChange = (prescriptionId: string, field: keyof Prescription['vitals'], value: string) => {
    // Update the prescription with new vitals value
    const updatedPrescriptions = prescriptions.map(p => 
      p.id === prescriptionId 
        ? { ...p, vitals: { ...p.vitals, [field]: value } }
        : p
    );
    
    // Clear existing timeout
    if (vitalsTimeout) {
      clearTimeout(vitalsTimeout);
    }
    
    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      // Here you would typically make an API call to save the vitals
      console.log(`Auto-saving vitals for prescription ${prescriptionId}:`, field, value);
      // For now, we'll just log it. In a real app, you'd make an API call here
    }, 1000); // 1 second delay
    
    setVitalsTimeout(timeout);
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
            <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
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
              <TabsTrigger value="lab" className="gap-2">
                <TestTube className="h-4 w-4" />
                <span className="hidden sm:inline">Lab Tests</span>
                <span className="sm:hidden">Lab</span>
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
                  <h3 className="text-lg font-semibold">
                    {showNewPrescription ? 'E-Prescription Pad' : 'Prescription History'}
                  </h3>
                  <div className="flex gap-2">
                    {showNewPrescription ? (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowNewPrescription(false)}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View History
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowNewPrescription(true)}
                        className="gap-2"
                      >
                        <PenTool className="h-4 w-4" />
                        New E-Prescription
                      </Button>
                    )}
                  </div>
                </div>

                {showNewPrescription ? (
                  <div className="h-[600px]">
                    <EPrescriptionPad />
                  </div>
                ) : (
                  <>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setFullScreenPrescription(prescription)}
                            title="View in full screen"
                            className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                          >
                            <Maximize2 className="h-3 w-3 mr-1" />
                            <span className="text-xs">Full Screen</span>
                          </Button>
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
                       
                                               {/* Compact Vitals Section - Single Row */}
                        <div>
                          <Label className="text-sm font-medium mb-2">Vitals</Label>
                          <div className="grid grid-cols-7 gap-1 text-xs min-w-0">
                            <div className="flex flex-col items-center p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded border min-w-0">
                              <span className="font-medium text-blue-700 dark:text-blue-300 text-xs">BP</span>
                              <input
                                type="text"
                                value={prescription.vitals.bp}
                                onChange={(e) => handleVitalsChange(prescription.id, 'bp', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-blue-900 dark:text-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-300 text-xs"
                                placeholder="--/--"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-green-50 dark:bg-green-900/20 rounded border min-w-0">
                              <span className="font-medium text-green-700 dark:text-green-300 text-xs">Pulse</span>
                              <input
                                type="text"
                                value={prescription.vitals.pulse}
                                onChange={(e) => handleVitalsChange(prescription.id, 'pulse', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-green-900 dark:text-green-100 focus:outline-none focus:ring-1 focus:ring-green-300 text-xs"
                                placeholder="--"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded border min-w-0">
                              <span className="font-medium text-yellow-700 dark:text-yellow-300 text-xs">Temp</span>
                              <input
                                type="text"
                                value={prescription.vitals.temp}
                                onChange={(e) => handleVitalsChange(prescription.id, 'temp', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-yellow-900 dark:text-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-300 text-xs"
                                placeholder="--°F"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded border min-w-0">
                              <span className="font-medium text-purple-700 dark:text-purple-300 text-xs">Weight</span>
                              <input
                                type="text"
                                value={prescription.vitals.weight}
                                onChange={(e) => handleVitalsChange(prescription.id, 'weight', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-purple-900 dark:text-purple-100 focus:outline-none focus:ring-1 focus:ring-purple-300 text-xs"
                                placeholder="--kg"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border min-w-0">
                              <span className="font-medium text-indigo-700 dark:text-indigo-300 text-xs">Height</span>
                              <input
                                type="text"
                                value={prescription.vitals.height}
                                onChange={(e) => handleVitalsChange(prescription.id, 'height', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-indigo-900 dark:text-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-xs"
                                placeholder="--cm"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-red-50 dark:bg-red-900/20 rounded border min-w-0">
                              <span className="font-medium text-red-700 dark:text-red-300 text-xs">SpO2</span>
                              <input
                                type="text"
                                value={prescription.vitals.spo2}
                                onChange={(e) => handleVitalsChange(prescription.id, 'spo2', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-red-900 dark:text-red-100 focus:outline-none focus:ring-1 focus:ring-red-300 text-xs"
                                placeholder="--%"
                              />
                            </div>
                            <div className="flex flex-col items-center p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border min-w-0">
                              <span className="font-medium text-orange-700 dark:text-orange-300 text-xs">RR</span>
                              <input
                                type="text"
                                value={prescription.vitals.respiratoryRate}
                                onChange={(e) => handleVitalsChange(prescription.id, 'respiratoryRate', e.target.value)}
                                className="w-full text-center bg-transparent border-none text-orange-900 dark:text-orange-100 focus:outline-none focus:ring-1 focus:ring-orange-300 text-xs"
                                placeholder="--"
                              />
                            </div>
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
                  </>
                )}
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

        {/* Full Screen Prescription Modal */}
        {fullScreenPrescription && (
          <div className="fixed inset-0 bg-black/90 z-70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    E-Prescription - {fullScreenPrescription.id}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {fullScreenPrescription.date.toLocaleDateString()} • {fullScreenPrescription.doctor}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setFullScreenPrescription(null)}
                    title="Exit full screen"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Exit Full Screen
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>

              {/* Prescription Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Patient Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patient Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                        <p className="text-gray-900 dark:text-white">{patient.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Age:</span>
                        <p className="text-gray-900 dark:text-white">{patient.age} years</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Gender:</span>
                        <p className="text-gray-900 dark:text-white">{patient.gender}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Blood Group:</span>
                        <p className="text-gray-900 dark:text-white">{patient.bloodGroup}</p>
                      </div>
                    </div>
                  </div>

                                     {/* Visit Details */}
                   <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                     <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visit Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                       <div>
                         <span className="font-medium text-gray-700 dark:text-gray-300">Visit Type:</span>
                         <p className="text-gray-900 dark:text-white">{fullScreenPrescription.visitType}</p>
                       </div>
                       <div>
                         <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>
                         <p className="text-gray-900 dark:text-white">{fullScreenPrescription.date.toLocaleDateString()}</p>
                       </div>
                       <div>
                         <span className="font-medium text-gray-700 dark:text-gray-300">Doctor:</span>
                         <p className="text-gray-900 dark:text-white">{fullScreenPrescription.doctor}</p>
                       </div>
                     </div>
                   </div>

                                       {/* Vitals Section */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vitals</h3>
                      <div className="grid grid-cols-3 md:grid-cols-7 gap-4 text-sm">
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Blood Pressure</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.bp}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Pulse</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.pulse}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Temperature</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.temp}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Weight</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.weight}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Height</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.height}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">SpO2</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.spo2}</p>
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Respiratory Rate</span>
                          <p className="text-gray-900 dark:text-white font-semibold">{fullScreenPrescription.vitals.respiratoryRate}</p>
                        </div>
                      </div>
                    </div>

                   {/* Symptoms and Diagnosis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Symptoms</h3>
                      <p className="text-gray-900 dark:text-white">{fullScreenPrescription.symptoms}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diagnosis</h3>
                      <p className="text-gray-900 dark:text-white font-medium">{fullScreenPrescription.diagnosis}</p>
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prescribed Medications</h3>
                    <div className="space-y-4">
                      {fullScreenPrescription.medications.map((med, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Medication:</span>
                              <p className="text-gray-900 dark:text-white font-semibold">{med.name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Dosage:</span>
                              <p className="text-gray-900 dark:text-white">{med.dosage}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Frequency:</span>
                              <p className="text-gray-900 dark:text-white">{med.frequency}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                              <p className="text-gray-900 dark:text-white">{med.duration}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Instructions</h3>
                    <p className="text-gray-900 dark:text-white">{fullScreenPrescription.instructions}</p>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700 pt-6">
                    <p>This prescription is valid for the specified duration only.</p>
                    <p className="mt-1">Please follow the instructions carefully and consult your doctor if needed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
                 )}
       </div>
     </div>
   );
 };