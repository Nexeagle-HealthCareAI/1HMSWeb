import React, { useState, useEffect } from 'react';
import { 
  FileText,
  Edit,
  Save,
  Plus,
  Pill,
  Clock,
  Calendar,
  X,
  History,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Ruler,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface VitalSigns {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  weight: number;
  height?: number;
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
  vitals?: VitalSigns;
  medications: {
    name: string;
    composition: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  instructions: string;
}

interface PatientPrescriptionsProps {
  prescriptions: Prescription[];
  onPrescriptionsChange: (prescriptions: Prescription[]) => void;
  patientVitals?: VitalSigns;
}

export const PatientPrescriptions: React.FC<PatientPrescriptionsProps> = ({
  prescriptions,
  onPrescriptionsChange,
  patientVitals
}) => {
  const [editingPrescription, setEditingPrescription] = useState<string | null>(null);
  const [currentVitals, setCurrentVitals] = useState<VitalSigns | null>(null);
  const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});

  // Sample vitals data - in real app, this would come from props or API
  const sampleVitals: VitalSigns = {
    systolic: 120,
    diastolic: 80,
    heartRate: 72,
    temperature: 98.6,
    oxygenSaturation: 98,
    respiratoryRate: 16,
    weight: 70,
    height: 170
  };

  // Initialize vitals with patient data or sample data
  useEffect(() => {
    if (patientVitals) {
      setCurrentVitals(patientVitals);
    } else {
      setCurrentVitals(sampleVitals);
    }
  }, [patientVitals]);

  // Automatically put the first prescription in edit mode when component mounts
  useEffect(() => {
    if (prescriptions.length > 0 && !editingPrescription) {
      setEditingPrescription(prescriptions[0].id);
    }
  }, [prescriptions, editingPrescription]);

  const handleSavePrescription = (prescriptionId: string) => {
    setEditingPrescription(null);
    toast({
      title: "Prescription Saved",
      description: "Prescription has been successfully saved.",
    });
  };

  // Auto-save function that triggers when any field changes
  const handleFieldChange = (prescriptionId: string, field: string, value: string) => {
    const updated = prescriptions.map(p => 
      p.id === prescriptionId 
        ? { ...p, [field]: value }
        : p
    );
    onPrescriptionsChange(updated);
    
    // Show a subtle auto-save notification
    toast({
      title: "Auto-saved",
      description: "Changes have been automatically saved.",
      duration: 2000,
    });
  };

  const handleVitalsChange = (field: keyof VitalSigns, value: string) => {
    if (!currentVitals) return;
    
    const numValue = parseFloat(value) || 0;
    setCurrentVitals({
      ...currentVitals,
      [field]: numValue
    });

    // Clear error for this field
    if (vitalsErrors[field]) {
      setVitalsErrors({
        ...vitalsErrors,
        [field]: ''
      });
    }

    // Update prescription with new vitals
    if (editingPrescription) {
      const updated = prescriptions.map(p => 
        p.id === editingPrescription 
          ? { ...p, vitals: { ...currentVitals, [field]: numValue } }
          : p
      );
      onPrescriptionsChange(updated);
    }
  };

  const validateVitals = () => {
    const errors: Record<string, string> = {};

    if (!currentVitals) return errors;

    // Blood Pressure validation
    if (currentVitals.systolic < 70 || currentVitals.systolic > 250) {
      errors.systolic = 'Systolic pressure should be between 70-250 mmHg';
    }
    if (currentVitals.diastolic < 40 || currentVitals.diastolic > 150) {
      errors.diastolic = 'Diastolic pressure should be between 40-150 mmHg';
    }

    // Heart Rate validation
    if (currentVitals.heartRate < 30 || currentVitals.heartRate > 220) {
      errors.heartRate = 'Heart rate should be between 30-220 bpm';
    }

    // Temperature validation
    if (currentVitals.temperature < 30 || currentVitals.temperature > 45) {
      errors.temperature = 'Temperature should be between 30-45°C';
    }

    // Oxygen Saturation validation
    if (currentVitals.oxygenSaturation < 50 || currentVitals.oxygenSaturation > 100) {
      errors.oxygenSaturation = 'Oxygen saturation should be between 50-100%';
    }

    // Respiratory Rate validation
    if (currentVitals.respiratoryRate < 8 || currentVitals.respiratoryRate > 40) {
      errors.respiratoryRate = 'Respiratory rate should be between 8-40 breaths/min';
    }

    return errors;
  };

  const calculateBMI = () => {
    if (!currentVitals?.height || !currentVitals?.weight) return '';
    const heightInMeters = currentVitals.height / 100;
    const bmi = currentVitals.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: string) => {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { category: 'Underweight', color: 'text-blue-500' };
    if (bmiValue < 25) return { category: 'Normal weight', color: 'text-green-500' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'text-orange-500' };
    return { category: 'Obesity', color: 'text-red-500' };
  };

  return (
    <div className="space-y-6">

      <div className="space-y-6">
        {prescriptions.map((prescription) => (
          <Card key={prescription.id} className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Prescription #{prescription.id}</h3>
                  <p className="text-purple-100">
                    {prescription.date.toLocaleDateString()} - {prescription.doctor}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {prescription.visitType}
                  </Badge>
                  <Button
                    variant={editingPrescription === prescription.id ? "default" : "outline"}
                    size="sm"
                    className={editingPrescription === prescription.id 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                    }
                    onClick={() => {
                      if (editingPrescription === prescription.id) {
                        handleSavePrescription(prescription.id);
                      } else {
                        setEditingPrescription(editingPrescription === prescription.id ? null : prescription.id);
                      }
                    }}
                  >
                    {editingPrescription === prescription.id ? (
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Vitals Section - Part of the prescription */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 text-lg">Patient Vitals</h4>
                  </div>
                  
                  {editingPrescription === prescription.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Blood Pressure */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Blood Pressure (mmHg)</Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="Systolic"
                              value={currentVitals?.systolic || ''}
                              onChange={(e) => handleVitalsChange('systolic', e.target.value)}
                              className={vitalsErrors.systolic ? 'border-red-500' : ''}
                            />
                            {vitalsErrors.systolic && (
                              <p className="text-xs text-red-500 mt-1">{vitalsErrors.systolic}</p>
                            )}
                          </div>
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="Diastolic"
                              value={currentVitals?.diastolic || ''}
                              onChange={(e) => handleVitalsChange('diastolic', e.target.value)}
                              className={vitalsErrors.diastolic ? 'border-red-500' : ''}
                            />
                            {vitalsErrors.diastolic && (
                              <p className="text-xs text-red-500 mt-1">{vitalsErrors.diastolic}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Heart Rate */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Heart Rate (bpm)</Label>
                        <Input
                          type="number"
                          placeholder="Heart Rate"
                          value={currentVitals?.heartRate || ''}
                          onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                          className={vitalsErrors.heartRate ? 'border-red-500' : ''}
                        />
                        {vitalsErrors.heartRate && (
                          <p className="text-xs text-red-500 mt-1">{vitalsErrors.heartRate}</p>
                        )}
                      </div>

                      {/* Temperature */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Temperature (°C)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Temperature"
                          value={currentVitals?.temperature || ''}
                          onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                          className={vitalsErrors.temperature ? 'border-red-500' : ''}
                        />
                        {vitalsErrors.temperature && (
                          <p className="text-xs text-red-500 mt-1">{vitalsErrors.temperature}</p>
                        )}
                      </div>

                      {/* Oxygen Saturation */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Oxygen Saturation (%)</Label>
                        <Input
                          type="number"
                          placeholder="O2 Sat"
                          value={currentVitals?.oxygenSaturation || ''}
                          onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
                          className={vitalsErrors.oxygenSaturation ? 'border-red-500' : ''}
                        />
                        {vitalsErrors.oxygenSaturation && (
                          <p className="text-xs text-red-500 mt-1">{vitalsErrors.oxygenSaturation}</p>
                        )}
                      </div>

                      {/* Respiratory Rate */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Respiratory Rate (breaths/min)</Label>
                        <Input
                          type="number"
                          placeholder="Resp Rate"
                          value={currentVitals?.respiratoryRate || ''}
                          onChange={(e) => handleVitalsChange('respiratoryRate', e.target.value)}
                          className={vitalsErrors.respiratoryRate ? 'border-red-500' : ''}
                        />
                        {vitalsErrors.respiratoryRate && (
                          <p className="text-xs text-red-500 mt-1">{vitalsErrors.respiratoryRate}</p>
                        )}
                      </div>

                      {/* Weight */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Weight (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Weight"
                          value={currentVitals?.weight || ''}
                          onChange={(e) => handleVitalsChange('weight', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">BP:</span>
                        <span className="font-medium ml-1">{prescription.vitals?.systolic || currentVitals?.systolic}/{prescription.vitals?.diastolic || currentVitals?.diastolic} mmHg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">HR:</span>
                        <span className="font-medium ml-1">{prescription.vitals?.heartRate || currentVitals?.heartRate} bpm</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Temp:</span>
                        <span className="font-medium ml-1">{prescription.vitals?.temperature || currentVitals?.temperature}°C</span>
                      </div>
                      <div>
                        <span className="text-gray-600">O2:</span>
                        <span className="font-medium ml-1">{prescription.vitals?.oxygenSaturation || currentVitals?.oxygenSaturation}%</span>
                      </div>
                    </div>
                  )}

                  {/* BMI Calculation */}
                  {currentVitals?.height && currentVitals?.weight && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-blue-600" />
                        <Label className="font-semibold text-gray-700">BMI Calculation</Label>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-900">
                          BMI: {calculateBMI()}
                        </span>
                        {calculateBMI() && (
                          <Badge className={getBMICategory(calculateBMI()).color}>
                            {getBMICategory(calculateBMI()).category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chief Complaint */}
                <div>
                  <Label className="font-semibold">Chief Complaint</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.chiefComplaint}
                      onChange={(e) => handleFieldChange(prescription.id, 'chiefComplaint', e.target.value)}
                      placeholder="Enter chief complaint..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.chiefComplaint || 'No chief complaint recorded'}</p>
                  )}
                </div>

                {/* Patient History */}
                <div>
                  <Label className="font-semibold">Patient History</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.patientHistory}
                      onChange={(e) => handleFieldChange(prescription.id, 'patientHistory', e.target.value)}
                      placeholder="Enter patient history..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.patientHistory || 'No patient history recorded'}</p>
                  )}
                </div>

                {/* Comorbidity */}
                <div>
                  <Label className="font-semibold">Comorbidity</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.comorbidity}
                      onChange={(e) => handleFieldChange(prescription.id, 'comorbidity', e.target.value)}
                      placeholder="Enter comorbidities..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.comorbidity || 'No comorbidities recorded'}</p>
                  )}
                </div>

                {/* Observation */}
                <div>
                  <Label className="font-semibold">Observation</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.observation}
                      onChange={(e) => handleFieldChange(prescription.id, 'observation', e.target.value)}
                      placeholder="Enter clinical observations..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.observation || 'No observations recorded'}</p>
                  )}
                </div>

                {/* Investigation */}
                <div>
                  <Label className="font-semibold">Investigation</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.investigation}
                      onChange={(e) => handleFieldChange(prescription.id, 'investigation', e.target.value)}
                      placeholder="Enter recommended investigations..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.investigation || 'No investigations recommended'}</p>
                  )}
                </div>

                {/* Medications */}
                <div>
                  <Label className="font-semibold flex items-center gap-2 mb-3">
                    <Pill className="h-4 w-4 text-blue-600" />
                    Medications ({prescription.medications.length})
                  </Label>
                  <div className="space-y-3">
                    {prescription.medications.map((med, index) => (
                      <div key={index} className="relative group">
                        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                          {/* Medication Number */}
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {editingPrescription === prescription.id ? (
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
                                       const updated = prescriptions.map(p => 
                                         p.id === prescription.id 
                                           ? { 
                                               ...p, 
                                               medications: p.medications.map((m, i) => 
                                                 i === index ? { ...m, name: e.target.value } : m
                                               )
                                             }
                                           : p
                                       );
                                       onPrescriptionsChange(updated);
                                       toast({
                                         title: "Auto-saved",
                                         description: "Medication name has been automatically saved.",
                                         duration: 2000,
                                       });
                                     }}
                                     className="text-sm h-9 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
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
                                         const updated = prescriptions.map(p => 
                                           p.id === prescription.id 
                                             ? { 
                                                 ...p, 
                                                 medications: p.medications.map((m, i) => 
                                                   i === index ? { ...m, dosage: e.target.value } : m
                                                 )
                                               }
                                             : p
                                         );
                                         onPrescriptionsChange(updated);
                                         toast({
                                           title: "Auto-saved",
                                           description: "Dosage has been automatically saved.",
                                           duration: 2000,
                                         });
                                       }}
                                       className="text-sm h-9 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                     />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                      Frequency *
                                    </Label>
                                    <Input 
                                      value={med.frequency}
                                      onChange={(e) => {
                                        const updated = prescriptions.map(p => 
                                          p.id === prescription.id 
                                            ? { 
                                                ...p, 
                                                medications: p.medications.map((m, i) => 
                                                  i === index ? { ...m, frequency: e.target.value } : m
                                                )
                                              }
                                            : p
                                        );
                                        onPrescriptionsChange(updated);
                                      }}
                                      className="text-sm h-9 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
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
                                    onChange={(e) => {
                                      const updated = prescriptions.map(p => 
                                        p.id === prescription.id 
                                          ? { 
                                              ...p, 
                                              medications: p.medications.map((m, i) => 
                                                i === index ? { ...m, duration: e.target.value } : m
                                              )
                                            }
                                          : p
                                      );
                                      onPrescriptionsChange(updated);
                                    }}
                                    className="text-sm h-9 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                                  />
                                </div>
                                
                                {/* Composition */}
                                <div>
                                  <Label className="text-xs font-medium text-gray-600 mb-1 block">
                                    Composition
                                  </Label>
                                  <Input 
                                    value={med.composition}
                                    onChange={(e) => {
                                      const updated = prescriptions.map(p => 
                                        p.id === prescription.id 
                                          ? { 
                                              ...p, 
                                              medications: p.medications.map((m, i) => 
                                                i === index ? { ...m, composition: e.target.value } : m
                                              )
                                            }
                                          : p
                                      );
                                      onPrescriptionsChange(updated);
                                    }}
                                    className="text-sm h-9 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
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
                          
                          {editingPrescription === prescription.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = prescriptions.map(p => 
                                  p.id === prescription.id 
                                    ? { ...p, medications: p.medications.filter((_, i) => i !== index) }
                                    : p
                                );
                                onPrescriptionsChange(updated);
                              }}
                              className="flex-shrink-0 h-8 w-8 p-0 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {editingPrescription === prescription.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = prescriptions.map(p => 
                            p.id === prescription.id 
                              ? { 
                                  ...p, 
                                  medications: [...p.medications, { name: '', composition: '', dosage: '', frequency: '', duration: '' }]
                                }
                              : p
                          );
                          onPrescriptionsChange(updated);
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
                    
                    {!editingPrescription && prescription.medications.length === 0 && (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Pill className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No medications prescribed yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advice */}
                <div>
                  <Label className="font-semibold">Advice</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.advice}
                      onChange={(e) => handleFieldChange(prescription.id, 'advice', e.target.value)}
                      placeholder="Enter advice for patient..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.advice || 'No advice recorded'}</p>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <Label className="font-semibold">Instructions</Label>
                  {editingPrescription === prescription.id ? (
                    <Textarea 
                      value={prescription.instructions}
                      onChange={(e) => handleFieldChange(prescription.id, 'instructions', e.target.value)}
                      placeholder="Enter medication instructions..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm mt-2">{prescription.instructions || 'No instructions recorded'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
