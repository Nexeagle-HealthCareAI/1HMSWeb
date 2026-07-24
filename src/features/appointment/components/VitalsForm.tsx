import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Activity, Heart, Thermometer, Scale, Ruler, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSaveVitals } from '../hooks/useSaveVitals';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { patientProfileApi } from '@/features/patient/services/patientProfileApi';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

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

  const getHospitalId = useAuthStore(state => state.getHospitalId);
  const hospitalId = getHospitalId() || '';

  // Query for getting patient profile to show sleek info banner
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile', hospitalId, patientId],
    queryFn: () => patientProfileApi.getPatientProfile(hospitalId, patientId),
    enabled: !!hospitalId && !!patientId,
  });

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
      const { appointmentApi } = await import('@/features/appointment/services/appointmentApi');

      try {
        console.log('Fetching vitals for:', { patientId, appointmentId });
        const response = await appointmentApi.getPatientVitals(patientId, appointmentId);
        console.log('Fetched vitals response:', response);

        const hasVitals = response && response.vitals;
        const isSuccess = response.success !== false;

        if (hasVitals && isSuccess) {
          const v = response.vitals;
          const str = (val: any) => (val !== undefined && val !== null && val !== 0 ? String(val) : '');

          setVitalsData(prev => ({
            ...prev,
            systolic: str(v.Bp?.Sys),
            diastolic: str(v.Bp?.Dia),
            heartRate: str(v.Pulse),
            respiratoryRate: str(v.RespiratoryRate),
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
    if (bmiValue < 18.5) return { category: t('vitalsForm.bmi.category.underweight'), color: 'text-brand-500' };
    if (bmiValue < 25) return { category: t('vitalsForm.bmi.category.normal'), color: 'text-green-500' };
    if (bmiValue < 30) return { category: t('vitalsForm.bmi.category.overweight'), color: 'text-orange-500' };
    return { category: t('vitalsForm.bmi.category.obesity'), color: 'text-red-500' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bmi = calculateBMI();

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
          : ((parseFloat(vitalsData.temperature) || 0) - 32) * 5 / 9,
        spo2: parseInt(vitalsData.oxygenSaturation) || 0,
        heightCm: vitalsData.heightUnit === 'cm'
          ? parseFloat(vitalsData.height) || 0
          : parseFloat(vitalsData.height) * 30.48,
        weightKg: vitalsData.weightUnit === 'kg'
          ? parseFloat(vitalsData.weight) || 0
          : parseFloat(vitalsData.weight) * 0.453592,
        bmi: parseFloat(bmi) || 0,
        respiratoryRate: parseInt(vitalsData.respiratoryRate) || 0
      },
      recordedBy: userId || ''
    };

    console.log('Sending vitals API request with:', apiVitalsData);

    saveVitals(apiVitalsData, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(t('vitalsForm.toast.success'));
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

  const drawerContent = (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[70]"
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
      >
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-brand-50/50 dark:bg-brand-900/10 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-healthcare-primary dark:text-brand-400 flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                {t('vitalsForm.title', { patientName }).split('-')[0].trim()}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('vitalsForm.description')}
              </p>

              {/* Sleek Patient Info Banner */}
              <div className="mt-3 flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 border border-brand-100 dark:border-zinc-700/55 rounded-xl shadow-sm">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold text-base shadow-inner shrink-0">
                  {patientName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{patientName}</h4>
                    {patientProfile?.bloodGroup && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 font-bold">
                        {patientProfile.bloodGroup}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                      ID: {patientId}
                    </span>
                    {patientProfile && (
                      <>
                        <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:inline" />
                        <span>{patientProfile.ageYears} Y / {patientProfile.sex}</span>
                      </>
                    )}
                    {patientProfile?.mobile && (
                      <>
                        <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:inline" />
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 opacity-70" /> {patientProfile.mobile}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 self-start shrink-0 ml-2"
              type="button"
            >
              <span className="sr-only">Close</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-zinc-50/50 dark:bg-zinc-950/20">
          <form id="vitals-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Blood Pressure & Heart Rate */}
            <Card className="overflow-hidden border border-red-100 dark:border-red-950/30 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl">
              <div className="bg-red-50/50 dark:bg-red-950/10 px-3.5 py-2.5 border-b border-red-100/50 dark:border-red-950/20 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-300">
                  {t('vitalsForm.sections.cardio')}
                </span>
              </div>
              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <Label htmlFor="systolic" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                  <Label htmlFor="diastolic" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                  <Label htmlFor="heartRate" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
            <Card className="overflow-hidden border border-orange-100 dark:border-orange-950/30 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl">
              <div className="bg-orange-50/50 dark:bg-orange-950/10 px-3.5 py-2.5 border-b border-orange-100/50 dark:border-orange-950/20 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-xs uppercase tracking-wider text-orange-800 dark:text-orange-300">
                  {t('vitalsForm.sections.respiratory')}
                </span>
              </div>
              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <Label htmlFor="respiratoryRate" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                  <Label htmlFor="temperature" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                      className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    >
                      <option value="C">°C</option>
                      <option value="F">°F</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="oxygenSaturation" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
            <Card className="overflow-hidden border border-brand-100 dark:border-brand-950/30 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl">
              <div className="bg-brand-50/50 dark:bg-brand-950/10 px-3.5 py-2.5 border-b border-brand-100/50 dark:border-brand-950/20 flex items-center gap-2">
                <Scale className="h-4 w-4 text-brand-500" />
                <span className="font-bold text-xs uppercase tracking-wider text-brand-800 dark:text-brand-300">
                  {t('vitalsForm.sections.physical')}
                </span>
              </div>
              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <Label htmlFor="height" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                      className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    >
                      <option value="cm">cm</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
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
                      className="px-2 py-1 border border-input rounded-md bg-background h-9 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    {t('vitalsForm.fields.bmi')}
                  </Label>
                  <div className="p-2 bg-slate-50 dark:bg-zinc-800/80 rounded-md border border-slate-200 dark:border-zinc-700 h-9 flex items-center shadow-inner">
                    {bmi ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-black text-slate-900 dark:text-zinc-100">{bmi}</span>
                        {bmiInfo && (
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${bmiInfo.color}`}>
                            {bmiInfo.category}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 dark:text-zinc-500 text-xs">
                        {t('vitalsForm.bmi.prompt')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </form>
        </div>

        <div className="p-4 pb-6 sm:p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
          {!hideSkipButton && (
            <div className="flex items-start gap-2 mb-4 px-1 opacity-85 hover:opacity-100 transition-opacity">
              <span className="text-base mt-0.5">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{t('vitalsForm.optionalStep.title')}</span> {t('vitalsForm.optionalStep.description')}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 text-sm font-semibold py-2 h-11 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="vitals-form"
              disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 h-11 shadow-md shadow-brand-600/10 transition-colors"
            >
              {isPending ? t('vitalsForm.actions.saving') : 'Save'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerContent, document.body)
    : drawerContent;
};