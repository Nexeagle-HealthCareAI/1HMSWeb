import React, { useState, useMemo } from 'react';
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
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Stethoscope,
  Shield,
  Zap,
  Target,
  BarChart3,
  Eye,
  MessageSquare,
  Bell,
  Star,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

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

  // Calculate key metrics
  const metrics = useMemo(() => {
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const upcomingAppointments = appointments.filter(apt => apt.status === 'scheduled' && apt.date > new Date()).length;
    const totalPrescriptions = prescriptions.length;
    const activeMedications = patient.currentMedications.length;
    const criticalAllergies = patient.allergies.length;
    const medicalConditions = patient.medicalHistory.length;
    
    // Calculate vital signs trends
    const latestVitals = vitalSigns[vitalSigns.length - 1];
    const previousVitals = vitalSigns[vitalSigns.length - 2];
    
    const getVitalTrend = (current: number, previous: number) => {
      if (!previous) return 'stable';
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return 'up';
      if (change < -5) return 'down';
      return 'stable';
    };

    const bloodPressureTrend = latestVitals && previousVitals ? 
      getVitalTrend(latestVitals.systolic, previousVitals.systolic) : 'stable';
    const heartRateTrend = latestVitals && previousVitals ? 
      getVitalTrend(latestVitals.heartRate, previousVitals.heartRate) : 'stable';

    return {
      completedAppointments,
      upcomingAppointments,
      totalPrescriptions,
      activeMedications,
      criticalAllergies,
      medicalConditions,
      latestVitals,
      bloodPressureTrend,
      heartRateTrend
    };
  }, [appointments, prescriptions, patient, vitalSigns]);

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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVitalStatus = (value: number, normalRange: [number, number], type: string) => {
    if (value < normalRange[0]) return { status: 'low', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (value > normalRange[1]) return { status: 'high', color: 'text-red-600', bg: 'bg-red-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const getRiskLevel = () => {
    let riskScore = 0;
    
    // Allergies increase risk
    if (metrics.criticalAllergies > 0) riskScore += 2;
    
    // Medical conditions increase risk
    if (metrics.medicalConditions > 3) riskScore += 2;
    else if (metrics.medicalConditions > 0) riskScore += 1;
    
    // Abnormal vitals increase risk
    if (metrics.latestVitals) {
      const bpStatus = getVitalStatus(metrics.latestVitals.systolic, [90, 140], 'bp');
      const hrStatus = getVitalStatus(metrics.latestVitals.heartRate, [60, 100], 'hr');
      
      if (bpStatus.status !== 'normal') riskScore += 1;
      if (hrStatus.status !== 'normal') riskScore += 1;
    }
    
    if (riskScore >= 4) return { level: 'High', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    if (riskScore >= 2) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="space-y-6">
      {/* Enhanced Patient Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Patient Avatar & Status */}
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
              <AvatarImage src="/api/placeholder/80/80" />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-2 -right-2 border-2 border-white rounded-full p-1 ${riskLevel.bg}`}>
              <riskLevel.icon className={`h-4 w-4 ${riskLevel.color}`} />
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{patient.name}</h1>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      ID: {patient.id}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {patient.age} years, {patient.gender}
                    </Badge>
                    <Badge className={`${riskLevel.bg} ${riskLevel.color} border-0`}>
                      Risk: {riskLevel.level}
                    </Badge>
                  </div>
                </div>
                
                {/* Quick Contact Info */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span>{patient.bloodGroup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{patient.email}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Summary
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Appointments */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Appointments</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.completedAppointments}</p>
                <p className="text-xs text-gray-500">+{metrics.upcomingAppointments} upcoming</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prescriptions</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalPrescriptions}</p>
                <p className="text-xs text-gray-500">{metrics.activeMedications} active meds</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Pill className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Conditions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conditions</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.medicalConditions}</p>
                <p className="text-xs text-gray-500">{metrics.criticalAllergies} allergies</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <History className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lab Tests */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lab Tests</p>
                <p className="text-2xl font-bold text-green-600">{labTests.length}</p>
                <p className="text-xs text-gray-500">Recent results</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vital Signs Overview */}
      {metrics.latestVitals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Latest Vital Signs
              <Badge variant="outline" className="ml-auto">
                {new Date(metrics.latestVitals.date).toLocaleDateString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Blood Pressure */}
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  {getTrendIcon(metrics.bloodPressureTrend)}
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.latestVitals.systolic}/{metrics.latestVitals.diastolic}
                </div>
                <div className="text-sm text-red-600">Blood Pressure</div>
                <div className="text-xs text-gray-500">mmHg</div>
              </div>

              {/* Heart Rate */}
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  {getTrendIcon(metrics.heartRateTrend)}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.latestVitals.heartRate}
                </div>
                <div className="text-sm text-green-600">Heart Rate</div>
                <div className="text-xs text-gray-500">BPM</div>
              </div>

              {/* Temperature */}
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <Minus className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.latestVitals.temperature}°F
                </div>
                <div className="text-sm text-orange-600">Temperature</div>
                <div className="text-xs text-gray-500">Fahrenheit</div>
              </div>

              {/* Oxygen Saturation */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <Minus className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.latestVitals.oxygenSaturation}%
                </div>
                <div className="text-sm text-blue-600">O2 Saturation</div>
                <div className="text-xs text-gray-500">Percentage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Information Alerts */}
      {(metrics.criticalAllergies > 0 || metrics.medicalConditions > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Allergies */}
              {metrics.criticalAllergies > 0 && (
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Allergies</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Conditions */}
              {metrics.medicalConditions > 0 && (
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Medical Conditions</h4>
                  </div>
                  <div className="space-y-2">
                    {patient.medicalHistory.slice(0, 3).map((condition, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-100 rounded px-2 py-1">
                        {condition}
                      </div>
                    ))}
                    {patient.medicalHistory.length > 3 && (
                      <div className="text-xs text-red-600">
                        +{patient.medicalHistory.length - 3} more conditions
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Current Medications
              <Badge variant="outline" className="ml-auto">
                {metrics.activeMedications}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patient.currentMedications.slice(0, 3).map((medication, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{medication}</p>
                    <p className="text-xs text-gray-500">Active medication</p>
                  </div>
                </div>
              ))}
              {patient.currentMedications.length > 3 && (
                <div className="text-center">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All ({patient.currentMedications.length})
                  </Button>
                </div>
              )}
              {patient.currentMedications.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Pill className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No current medications</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Appointments
              <Badge variant="outline" className="ml-auto">
                {appointments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{appointment.type}</p>
                    <p className="text-xs text-gray-500">
                      {appointment.date.toLocaleDateString()} - {appointment.doctor}
                    </p>
                  </div>
                  {getAppointmentStatusBadge(appointment.status)}
                </div>
              ))}
              {appointments.length > 3 && (
                <div className="text-center">
                  <Button variant="outline" size="sm" className="text-xs" onClick={onNavigateToTimeline}>
                    View All ({appointments.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                New Prescription
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <Calendar className="h-4 w-4" />
                Schedule Appointment
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <Activity className="h-4 w-4" />
                Record Vitals
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <FileText className="h-4 w-4" />
                Add Lab Test
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <MessageSquare className="h-4 w-4" />
                Send Message
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <Download className="h-4 w-4" />
                Export Records
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
