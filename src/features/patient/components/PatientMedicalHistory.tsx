import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface PatientMedicalHistoryProps {
  patient: PatientData;
}

export const PatientMedicalHistory: React.FC<PatientMedicalHistoryProps> = ({
  patient
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Medical History</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5" />
                Medical Conditions
              </CardTitle>
              <div className="space-y-2">
                {patient.medicalHistory.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-orange-50 rounded">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">{condition}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
