import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  Stethoscope,
  CheckCircle,
  Clock,
  FlaskConical,
  AlertCircle,
  Edit,
  Save,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Patient {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  appointmentDate: string;
  tokenNo: number;
  vitalsUpdated: boolean;
  status: 'vitals-required' | 'ready-consultation' | 'under-consultation' | 'lab-test-required' | 'awaiting-reconsultation' | 'completed';
  phone: string;
  age?: number;
  gender?: string;
  bloodPressure?: string;
  temperature?: string;
  pulse?: string;
  weight?: string;
}

interface PatientDetailsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (patientId: string, status: Patient['status']) => void;
  onVitalsUpdate: (patientId: string, vitals: any) => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  patient,
  isOpen,
  onClose,
  onStatusUpdate,
  onVitalsUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [vitals, setVitals] = useState({
    bloodPressure: patient?.bloodPressure || '120/80',
    temperature: patient?.temperature || '36.8',
    pulse: patient?.pulse || '72',
    weight: patient?.weight || '65'
  });

  const [clinicalNotes, setClinicalNotes] = useState('Patient presents with mild symptoms. Blood pressure is within normal range. Temperature is normal. Pulse rate is regular. Weight is stable.');

  const handleSaveVitals = () => {
    if (patient) {
      onVitalsUpdate(patient.id, vitals);
      setIsEditing(false);
    }
  };

  const handleStatusChange = (newStatus: Patient['status']) => {
    if (patient) {
      onStatusUpdate(patient.id, newStatus);
    }
  };

  const getStatusBadge = (status: Patient['status']) => {
    switch (status) {
      case 'vitals-required':
        return <Badge className="bg-red-100 text-red-800 border-red-300">❤️ Vitals Required</Badge>;
      case 'ready-consultation':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Ready for Consultation</Badge>;
      case 'under-consultation':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">👨‍⚕️ Under Consultation</Badge>;
      case 'lab-test-required':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">🧪 Lab Test Required</Badge>;
      case 'awaiting-reconsultation':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ Awaiting Reconsultation</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">🏁 Completed</Badge>;
      default:
        return null;
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Patient Details</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Patient ID</Label>
                <p className="font-mono text-blue-600">{patient.patientId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Name</Label>
                <p className="font-semibold">{patient.patientName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <p>{patient.phone}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Appointment Time</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <p>{patient.appointmentTime}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Token Number</Label>
                <Badge variant="outline">#{patient.tokenNo}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Current Status</Label>
                {getStatusBadge(patient.status)}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vitals" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Vitals
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Clinical Notes
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Vital Signs
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bloodPressure">Blood Pressure</Label>
                      {isEditing ? (
                        <Input
                          id="bloodPressure"
                          value={vitals.bloodPressure}
                          onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                          placeholder="e.g., 120/80"
                        />
                      ) : (
                        <p className="text-lg font-medium">{vitals.bloodPressure || 'Not recorded'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="temperature">Temperature (°C)</Label>
                      {isEditing ? (
                        <Input
                          id="temperature"
                          value={vitals.temperature}
                          onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                          placeholder="e.g., 36.8"
                        />
                      ) : (
                        <p className="text-lg font-medium">{vitals.temperature || 'Not recorded'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="pulse">Pulse Rate (bpm)</Label>
                      {isEditing ? (
                        <Input
                          id="pulse"
                          value={vitals.pulse}
                          onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                          placeholder="e.g., 72"
                        />
                      ) : (
                        <p className="text-lg font-medium">{vitals.pulse || 'Not recorded'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      {isEditing ? (
                        <Input
                          id="weight"
                          value={vitals.weight}
                          onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                          placeholder="e.g., 65"
                        />
                      ) : (
                        <p className="text-lg font-medium">{vitals.weight || 'Not recorded'}</p>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleSaveVitals}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Vitals
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clinical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Clinical Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="clinicalNotes">Notes</Label>
                    <Textarea
                      id="clinicalNotes"
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Enter clinical notes, observations, or recommendations..."
                      rows={6}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Status Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleStatusChange('ready-consultation')}
                      disabled={patient.status === 'ready-consultation'}
                    >
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <span>Mark Ready</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleStatusChange('under-consultation')}
                      disabled={patient.status === 'under-consultation'}
                    >
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                      <span>Start Consultation</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleStatusChange('lab-test-required')}
                      disabled={patient.status === 'lab-test-required'}
                    >
                      <FlaskConical className="h-6 w-6 text-purple-600" />
                      <span>Request Lab Test</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleStatusChange('awaiting-reconsultation')}
                      disabled={patient.status === 'awaiting-reconsultation'}
                    >
                      <Clock className="h-6 w-6 text-yellow-600" />
                      <span>Schedule Follow-up</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-2 md:col-span-2"
                      onClick={() => handleStatusChange('completed')}
                      disabled={patient.status === 'completed'}
                    >
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <span>Complete Consultation</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
