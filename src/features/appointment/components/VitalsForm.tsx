import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Scale, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSaveVitals } from '../hooks/useSaveVitals';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface VitalsFormProps {
  patientName: string;
  appointmentId: string;
  patientId: string;
  onSubmit: (vitalsData: any) => void;
  onCancel: () => void;
  hideSkipButton?: boolean;
}

export const VitalsForm: React.FC<VitalsFormProps> = ({
  patientName,
  appointmentId,
  patientId,
  onSubmit,
  onCancel,
  hideSkipButton = false
}) => {
  console.log('VitalsForm received props:', { patientName, appointmentId, patientId });
  const { mutate: saveVitals, isPending } = useSaveVitals();
  const { userId } = useAuthStore();
  
  const [vitalsData, setVitalsData] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    respiratoryRate: '',
    temperature: '',
    temperatureUnit: 'C',
    oxygenSaturation: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg'
  });

  const calculateBMI = () => {
    const height = parseFloat(vitalsData.height);
    const weight = parseFloat(vitalsData.weight);
    
    if (!height || !weight) return '';
    
    let heightInMeters = height;
    if (vitalsData.heightUnit === 'cm') {
      heightInMeters = height / 100;
    } else if (vitalsData.heightUnit === 'ft') {
      heightInMeters = height * 0.3048;
    }
    
    let weightInKg = weight;
    if (vitalsData.weightUnit === 'lbs') {
      weightInKg = weight * 0.453592;
    }
    
    const bmi = weightInKg / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: string) => {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { category: 'Underweight', color: 'text-blue-500' };
    if (bmiValue < 25) return { category: 'Normal weight', color: 'text-green-500' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'text-orange-500' };
    return { category: 'Obesity', color: 'text-red-500' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bmi = calculateBMI();

    // Prepare vitals data for API
    const apiVitalsData = {
      appointmentId,
      patientId,
      vitalsJson: {
        bp: {
          sys: parseInt(vitalsData.systolic) || 0,
          dia: parseInt(vitalsData.diastolic) || 0
        },
        pulse: parseInt(vitalsData.heartRate) || 0,
        tempC: vitalsData.temperatureUnit === 'C' 
          ? parseFloat(vitalsData.temperature) || 0
          : ((parseFloat(vitalsData.temperature) || 0) - 32) * 5/9, // Convert F to C
        spo2: parseInt(vitalsData.oxygenSaturation) || 0,
        heightCm: vitalsData.heightUnit === 'cm' 
          ? parseFloat(vitalsData.height) || 0
          : parseFloat(vitalsData.height) * 30.48, // Convert ft to cm
        weightKg: vitalsData.weightUnit === 'kg' 
          ? parseFloat(vitalsData.weight) || 0
          : parseFloat(vitalsData.weight) * 0.453592, // Convert lbs to kg
        bmi: parseFloat(bmi) || 0
      },
      recordedBy: userId || ''
    };
    
    console.log('Sending vitals API request with:', apiVitalsData);

    // Call the API to save vitals
    saveVitals(apiVitalsData, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success('Vitals saved successfully!');
          // Call the original onSubmit with the formatted vitals data
          onSubmit({
            ...vitalsData,
            bmi,
            bmiCategory: bmi ? getBMICategory(bmi).category : ''
          });
        } else {
          toast.error(response.message || 'Failed to save vitals');
        }
      },
      onError: (error) => {
        console.error('Failed to save vitals:', error);
        toast.error('Failed to save vitals. Please try again.');
      }
    });
  };

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-healthcare-primary dark:text-blue-400 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Update Vitals - {patientName}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Recording vital signs is optional but helps provide better care. You can skip this step if needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Blood Pressure & Heart Rate */}
          <Card className="p-3 dark:bg-gray-800">
            <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Cardiovascular Vitals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="systolic" className="text-sm font-medium dark:text-gray-300">
                  Systolic BP (mmHg)
                </Label>
                <Input
                  id="systolic"
                  type="number"
                  value={vitalsData.systolic}
                  onChange={(e) => setVitalsData(prev => ({ ...prev, systolic: e.target.value }))}
                  placeholder="120"
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="diastolic" className="text-sm font-medium">
                  Diastolic BP (mmHg)
                </Label>
                <Input
                  id="diastolic"
                  type="number"
                  value={vitalsData.diastolic}
                  onChange={(e) => setVitalsData(prev => ({ ...prev, diastolic: e.target.value }))}
                  placeholder="80"
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="heartRate" className="text-sm font-medium">
                  Heart Rate (bpm)
                </Label>
                <Input
                  id="heartRate"
                  type="number"
                  value={vitalsData.heartRate}
                  onChange={(e) => setVitalsData(prev => ({ ...prev, heartRate: e.target.value }))}
                  placeholder="72"
                  className="h-9"
                />
              </div>
            </div>
          </Card>

          {/* Respiratory & Temperature */}
          <Card className="p-3 dark:bg-gray-800">
            <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              Respiratory & Temperature
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="respiratoryRate" className="text-sm font-medium">
                  Respiratory Rate (breaths/min)
                </Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  value={vitalsData.respiratoryRate}
                  onChange={(e) => setVitalsData(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                  placeholder="16"
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="temperature" className="text-sm font-medium">
                  Body Temperature
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={vitalsData.temperature}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, temperature: e.target.value }))}
                    placeholder="37.0"
                    className="flex-1 h-9"
                  />
                  <select
                    value={vitalsData.temperatureUnit}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, temperatureUnit: e.target.value }))}
                    className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm"
                  >
                    <option value="C">°C</option>
                    <option value="F">°F</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="oxygenSaturation" className="text-sm font-medium">
                  Oxygen Saturation (%)
                </Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  value={vitalsData.oxygenSaturation}
                  onChange={(e) => setVitalsData(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                  placeholder="98"
                  className="h-9"
                />
              </div>
            </div>
          </Card>

          {/* Physical Measurements */}
          <Card className="p-3">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" />
              Physical Measurements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="height" className="text-sm font-medium">
                  Height
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={vitalsData.height}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="170"
                    className="flex-1 h-9"
                  />
                  <select
                    value={vitalsData.heightUnit}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, heightUnit: e.target.value }))}
                    className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="weight" className="text-sm font-medium">
                  Weight
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={vitalsData.weight}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="70"
                    className="flex-1 h-9"
                  />
                  <select
                    value={vitalsData.weightUnit}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, weightUnit: e.target.value }))}
                    className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  BMI (Body Mass Index)
                </Label>
                <div className="mt-1 p-2 bg-muted rounded-md border h-9 flex items-center">
                  {bmi ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-bold text-foreground">{bmi}</span>
                      {bmiInfo && (
                        <span className={`text-xs font-medium ${bmiInfo.color}`}>
                          {bmiInfo.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs">
                      Enter height & weight
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {!hideSkipButton && (
            <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-healthcare-primary/50 mb-3">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Optional Step:</strong> Vital signs help us provide better care, but you can proceed without entering them if you prefer.
              </p>
            </div>
          )}

          <div className={`flex gap-3 pt-3 ${hideSkipButton ? 'justify-end' : ''}`}>
            {!hideSkipButton && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex-1 text-base py-2"
              >
                Skip This Step
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className={`${hideSkipButton ? 'px-8' : 'flex-1'} bg-healthcare-primary hover:bg-healthcare-primary/90 text-base py-2`}
            >
              {isPending ? 'Saving...' : 'Save Vitals'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};