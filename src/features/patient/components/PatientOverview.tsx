import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  Calendar,
  Phone,
  MapPin,
  Edit,
  Save,
  Download,
  Printer,
  Plus,
  Heart,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  Pill,
  Mail,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
  chiefComplaint: string;
  patientHistory: string;
  comorbidity: string;
  advice: string;
  investigation: string;
  observation: string;
  medications: {
    name: string;
    composition: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  instructions: string;
}

interface Appointment {
  id: string;
  date: Date;
  time: string;
  doctor: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: string;
  notes?: string;
  prescription?: Prescription;
}

interface VitalSigns {
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  weight: number;
}

interface PatientOverviewProps {
  patient: PatientData;
  appointments: Appointment[];
  prescriptions: Prescription[];
  labTests: any[];
  vitalSigns: VitalSigns[];
  onNavigateToTimeline: () => void;
}

export const PatientOverview: React.FC<PatientOverviewProps> = ({
  patient,
  appointments,
  prescriptions,
  labTests,
  vitalSigns,
  onNavigateToTimeline
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingAppointmentPrescription, setEditingAppointmentPrescription] = useState<string | null>(null);
  const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
    personalInfo: false,
    quickStats: false,
    currentMedications: false,
    allergies: false,
    medicalHistory: false,
    vitalSigns: false,
    appointments: false
  });

  const toggleCard = (cardId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Patient profile has been successfully updated.",
    });
  };

  const handleSavePrescription = (appointmentId: string) => {
    setEditingAppointmentPrescription(null);
    toast({
      title: "Prescription Saved",
      description: "Prescription has been successfully saved.",
    });
  };

  const getAppointmentStatusBadge = (status: Appointment['status']) => {
    const variants = {
      scheduled: 'default',
      completed: 'default',
      cancelled: 'destructive',
      'no-show': 'secondary'
    };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Patient Header Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          {/* Patient Avatar */}
          <div className="relative">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20 border-4 border-white shadow-lg">
              <AvatarImage src="/api/placeholder/80/80" />
              <AvatarFallback className="text-xl lg:text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-green-500 border-2 border-white rounded-full p-1">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2 lg:space-y-3">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">{patient.name}</h2>
                  <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      Patient ID: {patient.id}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      Active Patient
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 lg:gap-3">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full lg:w-auto text-xs lg:text-sm"
                >
                  {isEditing ? (
                    <>
                      <Save className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => toggleCard('personalInfo')}
            >
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </div>
              {collapsedCards.personalInfo ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
                                {!collapsedCards.personalInfo && (
              <CardContent className="space-y-4">
                {/* Personal Information Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  <div className="flex items-center gap-2 lg:gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg">
                      <User className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-gray-900">{patient.age} years, {patient.gender}</p>
                      <p className="text-xs text-gray-500">Age & Gender</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{patient.phone}</p>
                      <p className="text-xs text-gray-500">Primary Contact</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Heart className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{patient.bloodGroup}</p>
                      <p className="text-xs text-gray-500">Blood Group</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => toggleCard('quickStats')}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Stats
              </div>
              {collapsedCards.quickStats ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
          {!collapsedCards.quickStats && (
            <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                <div className="text-sm text-blue-600">Total Appointments</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{prescriptions.length}</div>
                <div className="text-sm text-green-600">Prescriptions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{labTests.length}</div>
                <div className="text-sm text-purple-600">Lab Tests</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{patient.medicalHistory.length}</div>
                <div className="text-sm text-orange-600">Medical Conditions</div>
              </div>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Current Medications */}
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => toggleCard('currentMedications')}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Current Medications
              </div>
              {collapsedCards.currentMedications ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
          {!collapsedCards.currentMedications && (
            <CardContent>
            <div className="space-y-2">
              {patient.currentMedications.map((medication, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{medication}</span>
                </div>
              ))}
            </div>
            </CardContent>
          )}
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => toggleCard('allergies')}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Allergies
              </div>
              {collapsedCards.allergies ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
          {!collapsedCards.allergies && (
            <CardContent>
            <div className="space-y-2">
              {patient.allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="mr-2 mb-2">
                  {allergy}
                </Badge>
              ))}
            </div>
            </CardContent>
          )}
        </Card>

        {/* Medical History */}
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => toggleCard('medicalHistory')}
            >
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Medical History
              </div>
              {collapsedCards.medicalHistory ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
          {!collapsedCards.medicalHistory && (
            <CardContent>
            <div className="space-y-3">
              {patient.medicalHistory.map((condition, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-orange-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{condition}</div>
                    <div className="text-xs text-gray-500 mt-1">Medical condition</div>
                  </div>
                </div>
              ))}
              {patient.medicalHistory.length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No medical history recorded</p>
                </div>
              )}
            </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Vital Signs Charts */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={() => toggleCard('vitalSigns')}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vital Signs Trends
            </div>
            {collapsedCards.vitalSigns ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            )}
          </CardTitle>
        </CardHeader>
        {!collapsedCards.vitalSigns && (
          <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blood Pressure Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Blood Pressure (mmHg)</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Systolic</span>
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Diastolic</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={vitalSigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value, name) => [value, name === 'systolic' ? 'Systolic' : 'Diastolic']}
                  />
                  <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Heart Rate Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Heart Rate (BPM)</h4>
                <div className="text-xs text-muted-foreground">
                  Normal: 60-100 BPM
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={vitalSigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value) => [`${value} BPM`, 'Heart Rate']}
                  />
                  <Area type="monotone" dataKey="heartRate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Temperature (°F)</h4>
                <div className="text-xs text-muted-foreground">
                  Normal: 97.8-99.0°F
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={vitalSigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value) => [`${value}°F`, 'Temperature']}
                  />
                  <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Oxygen Saturation Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Oxygen Saturation (%)</h4>
                <div className="text-xs text-muted-foreground">
                  Normal: 95-100%
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={vitalSigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value) => [`${value}%`, 'O2 Saturation']}
                  />
                  <Area type="monotone" dataKey="oxygenSaturation" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latest Vital Signs Summary */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-sm mb-4">Latest Vital Signs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {vitalSigns[vitalSigns.length - 1]?.systolic}/{vitalSigns[vitalSigns.length - 1]?.diastolic}
                </div>
                <div className="text-xs text-red-600">Blood Pressure</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {vitalSigns[vitalSigns.length - 1]?.heartRate}
                </div>
                <div className="text-xs text-green-600">Heart Rate (BPM)</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {vitalSigns[vitalSigns.length - 1]?.temperature}°F
                </div>
                <div className="text-xs text-orange-600">Temperature</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {vitalSigns[vitalSigns.length - 1]?.oxygenSaturation}%
                </div>
                <div className="text-xs text-purple-600">O2 Saturation</div>
              </div>
            </div>
          </div>
            </CardContent>
          )}
        </Card>

      {/* Appointments History */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={() => toggleCard('appointments')}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Past Appointments
            </div>
            {collapsedCards.appointments ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            )}
          </CardTitle>
        </CardHeader>
        {!collapsedCards.appointments && (
          <CardContent>
                     <div className="space-y-4">
             {localAppointments
               .filter(appointment => appointment.date < new Date())
               .slice(0, 3)
               .map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold">
                        {appointment.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appointment.date.getFullYear()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{appointment.time}</div>
                      <div className="text-xs text-muted-foreground">{appointment.doctor}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{appointment.type}</div>
                      {appointment.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-32">{appointment.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAppointmentStatusBadge(appointment.status)}
                  </div>
                </div>
                
                {/* Prescription Section for each appointment */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <Pill className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800">Prescription</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {!appointment.prescription && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                          onClick={() => {
                            const newPrescription: Prescription = {
                              id: `RX${Date.now()}`,
                              date: appointment.date,
                              doctor: appointment.doctor,
                              visitType: appointment.type,
                              chiefComplaint: '',
                              patientHistory: '',
                              comorbidity: '',
                              advice: '',
                              investigation: '',
                              observation: '',
                              medications: [],
                              instructions: ''
                            };
                            const updatedAppointments = localAppointments.map(apt => 
                              apt.id === appointment.id 
                                ? { ...apt, prescription: newPrescription }
                                : apt
                            );
                            setLocalAppointments(updatedAppointments);
                            setEditingAppointmentPrescription(appointment.id);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Prescription
                        </Button>
                      )}
                      {appointment.prescription && (
                        <Button
                          variant={editingAppointmentPrescription === appointment.id ? "default" : "outline"}
                          size="sm"
                          className={editingAppointmentPrescription === appointment.id 
                            ? "bg-green-600 hover:bg-green-700" 
                            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                          }
                          onClick={() => {
                            if (editingAppointmentPrescription === appointment.id) {
                              handleSavePrescription(appointment.id);
                            } else {
                              setEditingAppointmentPrescription(appointment.id);
                            }
                          }}
                        >
                          {editingAppointmentPrescription === appointment.id ? (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {appointment.prescription && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                      <div className="space-y-4">
                        {/* Chief Complaint */}
                        <div>
                          <Label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Chief Complaint
                          </Label>
                          {editingAppointmentPrescription === appointment.id ? (
                            <Textarea 
                              value={appointment.prescription.chiefComplaint}
                              onChange={(e) => {
                                const updated = localAppointments.map(apt => 
                                  apt.id === appointment.id && apt.prescription
                                    ? { 
                                        ...apt, 
                                        prescription: { ...apt.prescription, chiefComplaint: e.target.value }
                                      }
                                    : apt
                                );
                                setLocalAppointments(updated);
                              }}
                              placeholder="Enter chief complaint..."
                              className="mt-2 text-sm bg-white border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                              rows={2}
                            />
                          ) : (
                            <div className="mt-2 p-3 bg-white rounded-md border border-gray-200">
                              <p className="text-sm text-gray-700">
                                {appointment.prescription.chiefComplaint || 'No chief complaint recorded'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Medications */}
                        <div>
                          <Label className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Medications ({appointment.prescription.medications.length})
                          </Label>
                          <div className="space-y-3">
                            {appointment.prescription.medications.map((med, index) => (
                              <div key={index} className="relative group">
                                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                  {/* Medication Number */}
                                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    {editingAppointmentPrescription === appointment.id ? (
                                      <div className="space-y-3">
                                        {/* Medication Name */}
                                        <div>
                                          <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                            Medication Name *
                                          </Label>
                                          <Input 
                                            value={med.name}
                                            placeholder="e.g., Amlodipine, Metformin"
                                            onChange={(e) => {
                                              const updated = localAppointments.map(apt => 
                                                apt.id === appointment.id && apt.prescription
                                                  ? { 
                                                      ...apt, 
                                                      prescription: { 
                                                        ...apt.prescription, 
                                                        medications: apt.prescription.medications.map((m, i) => 
                                                          i === index ? { ...m, name: e.target.value } : m
                                                        )
                                                      }
                                                    }
                                                  : apt
                                              );
                                              setLocalAppointments(updated);
                                            }}
                                            className="text-sm h-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                          />
                                        </div>
                                        
                                        {/* Dosage and Frequency Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                              Dosage *
                                            </Label>
                                            <Input 
                                              value={med.dosage}
                                              placeholder="e.g., 5mg, 500mg"
                                              onChange={(e) => {
                                                const updated = localAppointments.map(apt => 
                                                  apt.id === appointment.id && apt.prescription
                                                    ? { 
                                                        ...apt, 
                                                        prescription: { 
                                                          ...apt.prescription, 
                                                          medications: apt.prescription.medications.map((m, i) => 
                                                            i === index ? { ...m, dosage: e.target.value } : m
                                                          )
                                                        }
                                                      }
                                                    : apt
                                                );
                                                setLocalAppointments(updated);
                                              }}
                                              className="text-sm h-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                              Frequency *
                                            </Label>
                                            <Input 
                                              value={med.frequency}
                                              placeholder="e.g., Once daily, Twice daily"
                                              onChange={(e) => {
                                                const updated = localAppointments.map(apt => 
                                                  apt.id === appointment.id && apt.prescription
                                                    ? { 
                                                        ...apt, 
                                                        prescription: { 
                                                          ...apt.prescription, 
                                                          medications: apt.prescription.medications.map((m, i) => 
                                                            i === index ? { ...m, frequency: e.target.value } : m
                                                          )
                                                        }
                                                      }
                                                    : apt
                                                );
                                                setLocalAppointments(updated);
                                              }}
                                              className="text-sm h-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Duration */}
                                        <div>
                                          <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                            Duration
                                          </Label>
                                          <Input 
                                            value={med.duration}
                                            placeholder="e.g., 30 days, 2 weeks"
                                            onChange={(e) => {
                                              const updated = localAppointments.map(apt => 
                                                apt.id === appointment.id && apt.prescription
                                                  ? { 
                                                      ...apt, 
                                                      prescription: { 
                                                        ...apt.prescription, 
                                                        medications: apt.prescription.medications.map((m, i) => 
                                                          i === index ? { ...m, duration: e.target.value } : m
                                                        )
                                                      }
                                                    }
                                                  : apt
                                              );
                                              setLocalAppointments(updated);
                                            }}
                                            className="text-sm h-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                          />
                                        </div>
                                        
                                        {/* Composition */}
                                        <div>
                                          <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                            Composition
                                          </Label>
                                          <Input 
                                            value={med.composition}
                                            placeholder="e.g., Amlodipine Besylate, Metformin HCl"
                                            onChange={(e) => {
                                              const updated = localAppointments.map(apt => 
                                                apt.id === appointment.id && apt.prescription
                                                  ? { 
                                                      ...apt, 
                                                      prescription: { 
                                                        ...apt.prescription, 
                                                        medications: apt.prescription.medications.map((m, i) => 
                                                          i === index ? { ...m, composition: e.target.value } : m
                                                        )
                                                      }
                                                    }
                                                  : apt
                                              );
                                              setLocalAppointments(updated);
                                            }}
                                            className="text-sm h-9 bg-gray-50 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="font-semibold text-gray-800 text-sm">{med.name}</div>
                                          {med.dosage && (
                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                              {med.dosage}
                                            </Badge>
                                          )}
                                          {med.composition && (
                                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                              {med.composition}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                          {med.frequency && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3 text-gray-400" />
                                              <span>{med.frequency}</span>
                                            </div>
                                          )}
                                          {med.duration && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3 text-gray-400" />
                                              <span>{med.duration}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {editingAppointmentPrescription === appointment.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const updated = localAppointments.map(apt => 
                                          apt.id === appointment.id && apt.prescription
                                            ? { 
                                                ...apt, 
                                                prescription: { 
                                                  ...apt.prescription, 
                                                  medications: apt.prescription.medications.filter((_, i) => i !== index)
                                                }
                                              }
                                            : apt
                                        );
                                        setLocalAppointments(updated);
                                      }}
                                      className="flex-shrink-0 h-8 w-8 p-0 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {editingAppointmentPrescription === appointment.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = localAppointments.map(apt => 
                                    apt.id === appointment.id && apt.prescription
                                      ? { 
                                          ...apt, 
                                          prescription: { 
                                            ...apt.prescription, 
                                            medications: [...apt.prescription.medications, { name: '', composition: '', dosage: '', frequency: '', duration: '' }]
                                          }
                                        }
                                      : apt
                                  );
                                  setLocalAppointments(updated);
                                }}
                                className="w-full h-12 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <Plus className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="font-medium">Add New Medication</span>
                                </div>
                              </Button>
                            )}
                            
                            {!editingAppointmentPrescription && appointment.prescription.medications.length === 0 && (
                              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <Pill className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No medications prescribed yet</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <Label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Instructions
                          </Label>
                          {editingAppointmentPrescription === appointment.id ? (
                            <Textarea 
                              value={appointment.prescription.instructions}
                              onChange={(e) => {
                                const updated = localAppointments.map(apt => 
                                  apt.id === appointment.id && apt.prescription
                                    ? { 
                                        ...apt, 
                                        prescription: { ...apt.prescription, instructions: e.target.value }
                                      }
                                    : apt
                                );
                                setLocalAppointments(updated);
                              }}
                              placeholder="Enter medication instructions..."
                              className="mt-2 text-sm bg-white border-gray-200 focus:border-green-300 focus:ring-green-200"
                              rows={2}
                            />
                          ) : (
                            <div className="mt-2 p-3 bg-white rounded-md border border-gray-200">
                              <p className="text-sm text-gray-700">
                                {appointment.prescription.instructions || 'No instructions recorded'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
                         {localAppointments.filter(appointment => appointment.date < new Date()).length > 3 && (
               <div className="text-center pt-2">
                 <Button variant="outline" size="sm" onClick={onNavigateToTimeline}>
                   View All Past Appointments ({localAppointments.filter(appointment => appointment.date < new Date()).length})
                 </Button>
               </div>
             )}
          </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  };
