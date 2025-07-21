import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  Printer, 
  Send, 
  Eye, 
  Plus, 
  Trash2, 
  Copy, 
  Clock,
  Heart,
  Activity,
  Thermometer,
  AlertTriangle,
  Mic,
  FileText,
  Upload,
  Download
} from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  timing: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  beforeFood?: boolean;
}

interface PatientInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  address: string;
  allergies: string[];
  vitals: {
    bp: string;
    hr: string;
    temp: string;
    weight: string;
  };
  ongoingMedications: string[];
}

interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnoses: string[];
  medicines: Medicine[];
  labTests: string[];
  advice: string;
  followUpDate?: string;
  signature: string;
}

const mockPatient: PatientInfo = {
  id: 'P001',
  name: 'John Doe',
  age: 45,
  gender: 'Male',
  contact: '+1 234-567-8900',
  address: '123 Main St, City, State',
  allergies: ['Penicillin', 'Shellfish'],
  vitals: {
    bp: '120/80',
    hr: '72',
    temp: '98.6°F',
    weight: '75kg'
  },
  ongoingMedications: ['Metformin 500mg', 'Lisinopril 10mg']
};

const frequencyOptions = [
  { value: '1-0-1', label: 'Morning-Evening' },
  { value: '1-1-1', label: 'Three times daily' },
  { value: '0-1-0', label: 'Afternoon only' },
  { value: '1-0-0', label: 'Morning only' },
  { value: '0-0-1', label: 'Night only' },
  { value: 'SOS', label: 'SOS (As needed)' },
  { value: 'PRN', label: 'PRN (When required)' }
];

const commonMedicines = [
  'Paracetamol 500mg',
  'Ibuprofen 400mg',
  'Amoxicillin 250mg',
  'Omeprazole 20mg',
  'Metformin 500mg',
  'Lisinopril 10mg',
  'Atorvastatin 20mg',
  'Aspirin 75mg',
  'Amlodipine 5mg',
  'Cetirizine 10mg',
  'Dextromethorphan 15mg'
];

const commonLabTests = [
  'Complete Blood Count (CBC)',
  'Blood Sugar (Fasting)',
  'Lipid Profile',
  'Liver Function Test',
  'Kidney Function Test',
  'Thyroid Function Test',
  'Chest X-Ray',
  'ECG',
  'Urine Analysis',
  'Stool Examination'
];

export const EPrescription = ({ patientId }: { patientId?: string }) => {
  const [patient] = useState<PatientInfo>(mockPatient);
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<string[]>([]);
  const [advice, setAdvice] = useState('');
  const [currentDiagnosis, setCurrentDiagnosis] = useState('');
  const [currentLabTest, setCurrentLabTest] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState<Partial<Medicine>>({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    timing: { morning: false, afternoon: false, night: false },
    beforeFood: true
  });

  // Auto-save functionality
  useEffect(() => {
    const autosave = setInterval(() => {
      // Simulate autosave
      console.log('Auto-saving prescription...');
    }, 30000);
    return () => clearInterval(autosave);
  }, []);

  const addDiagnosis = () => {
    if (currentDiagnosis.trim()) {
      setDiagnoses([...diagnoses, currentDiagnosis.trim()]);
      setCurrentDiagnosis('');
    }
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const addMedicine = () => {
    if (currentMedicine.name && currentMedicine.frequency && currentMedicine.duration) {
      const newMedicine: Medicine = {
        id: Date.now().toString(),
        name: currentMedicine.name || '',
        dosage: currentMedicine.dosage || '',
        frequency: currentMedicine.frequency || '',
        duration: currentMedicine.duration || '',
        instructions: currentMedicine.instructions || '',
        timing: currentMedicine.timing || { morning: false, afternoon: false, night: false },
        beforeFood: currentMedicine.beforeFood
      };
      setMedicines([...medicines, newMedicine]);
      setCurrentMedicine({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        timing: { morning: false, afternoon: false, night: false },
        beforeFood: true
      });
    }
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(med => med.id !== id));
  };

  const duplicateMedicine = (medicine: Medicine) => {
    const duplicated = { ...medicine, id: Date.now().toString() };
    setMedicines([...medicines, duplicated]);
  };

  const addLabTest = () => {
    if (currentLabTest.trim() && !labTests.includes(currentLabTest.trim())) {
      setLabTests([...labTests, currentLabTest.trim()]);
      setCurrentLabTest('');
    }
  };

  const removeLabTest = (index: number) => {
    setLabTests(labTests.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    // Implement save functionality
    console.log('Saving prescription...');
  };

  const handleSendToPatient = () => {
    // Implement send functionality
    console.log('Sending prescription to patient...');
  };

  const groupMedicinesByTiming = () => {
    const grouped = {
      morning: medicines.filter(med => med.timing.morning),
      afternoon: medicines.filter(med => med.timing.afternoon),
      night: medicines.filter(med => med.timing.night),
      other: medicines.filter(med => !med.timing.morning && !med.timing.afternoon && !med.timing.night)
    };
    return grouped;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Prescription</h1>
          <p className="text-muted-foreground">Patient: {patient.name} (ID: {patient.id})</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={handleSendToPatient}>
            <Send className="h-4 w-4 mr-2" />
            Send to Patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{patient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {patient.age} years, {patient.gender}
                </p>
                <p className="text-sm text-muted-foreground">{patient.contact}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Vitals
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>BP: <span className="font-medium">{patient.vitals.bp}</span></div>
                  <div>HR: <span className="font-medium">{patient.vitals.hr}</span></div>
                  <div>Temp: <span className="font-medium">{patient.vitals.temp}</span></div>
                  <div>Weight: <span className="font-medium">{patient.vitals.weight}</span></div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Allergies
                </h4>
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Ongoing Medications</h4>
                <ul className="text-sm space-y-1">
                  {patient.ongoingMedications.map((medication, index) => (
                    <li key={index} className="text-muted-foreground">• {medication}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Prescription Writing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diagnosis Section */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnosis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter diagnosis (with ICD code if available)"
                  value={currentDiagnosis}
                  onChange={(e) => setCurrentDiagnosis(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDiagnosis()}
                />
                <Button onClick={addDiagnosis}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {diagnoses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {diagnoses.map((diagnosis, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      {diagnosis}
                      <button onClick={() => removeDiagnosis(index)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medicine Entry */}
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Medicine Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="medicine-name">Medicine Name</Label>
                  <Input
                    id="medicine-name"
                    placeholder="Start typing medicine name..."
                    value={currentMedicine.name}
                    onChange={(e) => setCurrentMedicine({...currentMedicine, name: e.target.value})}
                    list="medicine-suggestions"
                  />
                  <datalist id="medicine-suggestions">
                    {commonMedicines.map((med, index) => (
                      <option key={index} value={med} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select onValueChange={(value) => setCurrentMedicine({...currentMedicine, frequency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="7"
                    value={currentMedicine.duration}
                    onChange={(e) => setCurrentMedicine({...currentMedicine, duration: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Select onValueChange={(value) => setCurrentMedicine({...currentMedicine, instructions: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select instruction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Before Food">Before Food</SelectItem>
                      <SelectItem value="After Food">After Food</SelectItem>
                      <SelectItem value="With Food">With Food</SelectItem>
                      <SelectItem value="Empty Stomach">Empty Stomach</SelectItem>
                      <SelectItem value="As Needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Timing</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="morning"
                        checked={currentMedicine.timing?.morning}
                        onCheckedChange={(checked) => setCurrentMedicine({
                          ...currentMedicine,
                          timing: {...currentMedicine.timing, morning: checked}
                        })}
                      />
                      <Label htmlFor="morning">Morning</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="afternoon"
                        checked={currentMedicine.timing?.afternoon}
                        onCheckedChange={(checked) => setCurrentMedicine({
                          ...currentMedicine,
                          timing: {...currentMedicine.timing, afternoon: checked}
                        })}
                      />
                      <Label htmlFor="afternoon">Afternoon</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="night"
                        checked={currentMedicine.timing?.night}
                        onCheckedChange={(checked) => setCurrentMedicine({
                          ...currentMedicine,
                          timing: {...currentMedicine.timing, night: checked}
                        })}
                      />
                      <Label htmlFor="night">Night</Label>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={addMedicine} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medicine
                  </Button>
                </div>
              </div>

              {/* Medicine List */}
              {medicines.length > 0 && (
                <div className="space-y-3">
                  {medicines.map((medicine) => (
                    <div key={medicine.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{medicine.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {medicine.frequency} • {medicine.duration} days • {medicine.instructions}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {medicine.timing.morning && <Badge variant="outline" className="text-xs">Morning</Badge>}
                          {medicine.timing.afternoon && <Badge variant="outline" className="text-xs">Afternoon</Badge>}
                          {medicine.timing.night && <Badge variant="outline" className="text-xs">Night</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => duplicateMedicine(medicine)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeMedicine(medicine.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Tests Section */}
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter lab test name"
                  value={currentLabTest}
                  onChange={(e) => setCurrentLabTest(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLabTest()}
                  list="lab-suggestions"
                />
                <datalist id="lab-suggestions">
                  {commonLabTests.map((test, index) => (
                    <option key={index} value={test} />
                  ))}
                </datalist>
                <Button onClick={addLabTest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {labTests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labTests.map((test, index) => (
                    <Badge key={index} variant="outline" className="gap-2">
                      {test}
                      <button onClick={() => removeLabTest(index)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advice Section */}
          <Card>
            <CardHeader>
              <CardTitle>Medical Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter medical advice, lifestyle recommendations, or special instructions..."
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                rows={6}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Common templates: Drink plenty of fluids • Rest for 2-3 days • Follow up in 1 week
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-6 bg-white text-black" id="prescription-preview">
            {/* Clinic Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold">NexEagle Medical Center</h1>
              <p className="text-sm text-gray-600">123 Healthcare Ave, Medical City, State 12345</p>
              <p className="text-sm text-gray-600">Phone: (555) 123-4567 | Email: info@nexeagle.com</p>
            </div>

            {/* Patient & Doctor Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold">Patient Information</h3>
                <p>Name: {patient.name}</p>
                <p>Age: {patient.age} years</p>
                <p>Gender: {patient.gender}</p>
                <p>Contact: {patient.contact}</p>
              </div>
              <div>
                <h3 className="font-semibold">Prescription Date</h3>
                <p>{new Date().toLocaleDateString()}</p>
                <p>Doctor: Dr. Smith</p>
                <p>License: MD123456</p>
              </div>
            </div>

            {/* Diagnosis */}
            {diagnoses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Diagnosis</h3>
                <ul className="list-disc list-inside">
                  {diagnoses.map((diagnosis, index) => (
                    <li key={index}>{diagnosis}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medications */}
            {medicines.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Medications</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Medicine</th>
                      <th className="border border-gray-300 p-2 text-left">Frequency</th>
                      <th className="border border-gray-300 p-2 text-left">Duration</th>
                      <th className="border border-gray-300 p-2 text-left">Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((medicine, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{medicine.name}</td>
                        <td className="border border-gray-300 p-2">{medicine.frequency}</td>
                        <td className="border border-gray-300 p-2">{medicine.duration} days</td>
                        <td className="border border-gray-300 p-2">{medicine.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lab Tests */}
            {labTests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Laboratory Tests</h3>
                <ul className="list-disc list-inside">
                  {labTests.map((test, index) => (
                    <li key={index}>{test}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advice */}
            {advice && (
              <div>
                <h3 className="font-semibold mb-2">Medical Advice</h3>
                <p className="whitespace-pre-wrap">{advice}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-center">
              <p className="text-sm text-gray-600">This is a computer-generated prescription</p>
              <div className="mt-4">
                <p className="text-sm">Doctor's Signature</p>
                <div className="h-8 border-b border-gray-400 w-48 mx-auto mt-2"></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};