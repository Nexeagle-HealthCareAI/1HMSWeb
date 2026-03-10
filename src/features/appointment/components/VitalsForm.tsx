import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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

  // Fetch existing vitals on mount
  React.useEffect(() => {
    const fetchVitals = async () => {
      // Import appointmentApi here to avoid circular dependency issues if any, or just use the imported one
      const { appointmentApi } = await import('@/features/appointment/services/appointmentApi');

      try {
        console.log('Fetching vitals for:', { patientId, appointmentId });
        const response = await appointmentApi.getPatientVitals(patientId, appointmentId);
        console.log('Fetched vitals response:', response);

        // API might return { vitals: ... } without success field based on user snippet
        // or { success: true, vitals: ... }
        // We'll check if vitals exists, or if success is true (if present)
        const hasVitals = response && response.vitals;
        const isSuccess = response.success !== false; // Assume success unless explicitly false

        if (hasVitals && isSuccess) {
          const v = response.vitals;

          // Helper to convert to string safely
          const str = (val: any) => (val !== undefined && val !== null && val !== 0 ? String(val) : '');

          setVitalsData(prev => ({
            ...prev,
            systolic: str(v.Bp?.Sys),
            diastolic: str(v.Bp?.Dia),
            heartRate: str(v.Pulse),
            respiratoryRate: str(v.RespiratoryRate), // Assuming PascalCase if present
            temperature: str(v.TempC),
            temperatureUnit: 'C',
            oxygenSaturation: str(v.Spo2),
            height: v.HeightCm ? String(v.HeightCm) : '',
            heightUnit: 'cm',
            weight: v.WeightKg ? String(v.WeightKg) : '',
            weightUnit: 'kg'
          }));
        }
      } catch (error) {
        console.error('Error fetching vitals:', error);
        // Silent fail or toast? decided on silent for now as it's just pre-fill
      }
    };

    if (patientId && appointmentId) {
      fetchVitals();
    }
  }, [patientId, appointmentId]);

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
    if (bmiValue < 18.5) return { category: t('vitalsForm.bmi.category.underweight'), color: 'text-blue-500' };
    if (bmiValue < 25) return { category: t('vitalsForm.bmi.category.normal'), color: 'text-green-500' };
    if (bmiValue < 30) return { category: t('vitalsForm.bmi.category.overweight'), color: 'text-orange-500' };
    return { category: t('vitalsForm.bmi.category.obesity'), color: 'text-red-500' };
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
          : ((parseFloat(vitalsData.temperature) || 0) - 32) * 5 / 9, // Convert F to C
        spo2: parseInt(vitalsData.oxygenSaturation) || 0,
        heightCm: vitalsData.heightUnit === 'cm'
          ? parseFloat(vitalsData.height) || 0
          : parseFloat(vitalsData.height) * 30.48, // Convert ft to cm
        weightKg: vitalsData.weightUnit === 'kg'
          ? parseFloat(vitalsData.weight) || 0
          : parseFloat(vitalsData.weight) * 0.453592, // Convert lbs to kg
        bmi: parseFloat(bmi) || 0,
        respiratoryRate: parseInt(vitalsData.respiratoryRate) || 0
      },
      recordedBy: userId || ''
    };

    console.log('Sending vitals API request with:', apiVitalsData);

    // Call the API to save vitals
    saveVitals(apiVitalsData, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(t('vitalsForm.toast.success'));
          // Call the original onSubmit with the formatted vitals data
          onSubmit({
            ...vitalsData,
            bmi,
            bmiCategory: bmi ? getBMICategory(bmi).category : ''
          });
        } else {
          toast.error(response.message || t('vitalsForm.toast.error'));
        }
      },
      onError: (error) => {
        console.error('Failed to save vitals:', error);
        toast.error(t('vitalsForm.toast.errorTryAgain'));
      }
    });
  };

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-healthcare-primary dark:text-blue-400 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('vitalsForm.title', { patientName })}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('vitalsForm.description')}
              </p>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 self-start shrink-0"
              type="button"
            >
              <span className="sr-only">Close</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="vitals-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Blood Pressure & Heart Rate */}
            <Card className="p-3 dark:bg-gray-800">
              <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                {t('vitalsForm.sections.cardio')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="systolic" className="text-sm font-medium dark:text-gray-300">
                    {t('vitalsForm.fields.systolic')}
                  </Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={vitalsData.systolic}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, systolic: e.target.value }))}
                    placeholder={t('vitalsForm.placeholders.systolic')}
                    className="h-9 placeholder:text-muted-foreground/70"
                  />
                </div>

                <div>
                  <Label htmlFor="diastolic" className="text-sm font-medium">
                    {t('vitalsForm.fields.diastolic')}
                  </Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={vitalsData.diastolic}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, diastolic: e.target.value }))}
                    placeholder={t('vitalsForm.placeholders.diastolic')}
                    className="h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="heartRate" className="text-sm font-medium">
                    {t('vitalsForm.fields.heartRate')}
                  </Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={vitalsData.heartRate}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, heartRate: e.target.value }))}
                    placeholder={t('vitalsForm.placeholders.heartRate')}
                    className="h-9"
                  />
                </div>
              </div>
            </Card>

            {/* Respiratory & Temperature */}
            <Card className="p-3 dark:bg-gray-800">
              <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                {t('vitalsForm.sections.respiratory')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="respiratoryRate" className="text-sm font-medium">
                    {t('vitalsForm.fields.respiratoryRate')}
                  </Label>
                  <Input
                    id="respiratoryRate"
                    type="number"
                    value={vitalsData.respiratoryRate}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                    placeholder={t('vitalsForm.placeholders.respiratoryRate')}
                    className="h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="temperature" className="text-sm font-medium">
                    {t('vitalsForm.fields.temperature')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={vitalsData.temperature}
                      onChange={(e) => setVitalsData(prev => ({ ...prev, temperature: e.target.value }))}
                      placeholder={t('vitalsForm.placeholders.temperature')}
                      className="flex-1 h-9 placeholder:text-muted-foreground/70"
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
                    {t('vitalsForm.fields.oxygenSaturation')}
                  </Label>
                  <Input
                    id="oxygenSaturation"
                    type="number"
                    value={vitalsData.oxygenSaturation}
                    onChange={(e) => setVitalsData(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                    placeholder={t('vitalsForm.placeholders.oxygenSaturation')}
                    className="h-9"
                  />
                </div>
              </div>
            </Card>

            {/* Physical Measurements */}
            <Card className="p-3">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                {t('vitalsForm.sections.physical')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="height" className="text-sm font-medium">
                    {t('vitalsForm.fields.height')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={vitalsData.height}
                      onChange={(e) => setVitalsData(prev => ({ ...prev, height: e.target.value }))}
                      placeholder={t('vitalsForm.placeholders.height')}
                      className="flex-1 h-9 placeholder:text-muted-foreground/70"
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
                    {t('vitalsForm.fields.weight')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={vitalsData.weight}
                      onChange={(e) => setVitalsData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder={t('vitalsForm.placeholders.weight')}
                      className="flex-1 h-9 placeholder:text-muted-foreground/70"
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
                    {t('vitalsForm.fields.bmi')}
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
                        {t('vitalsForm.bmi.prompt')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
          {!hideSkipButton && (
            <div className="flex items-start gap-2 mb-4 px-1 opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-base mt-0.5">💡</span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{t('vitalsForm.optionalStep.title')}</span> {t('vitalsForm.optionalStep.description')}
              </p>
            </div>
          )}

          <div className={`flex gap-3 ${hideSkipButton ? 'justify-end' : ''}`}>
            {!hideSkipButton && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex-1 text-base py-2"
              >
                {t('vitalsForm.actions.skip')}
              </Button>
            )}
            <Button
              type="submit"
              form="vitals-form"
              disabled={isPending}
              className={`${hideSkipButton ? 'px-8' : 'flex-1'} bg-healthcare-primary hover:bg-healthcare-primary/90 text-base py-2`}
            >
              {isPending ? t('vitalsForm.actions.saving') : t('vitalsForm.actions.save')}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};